import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  db,
  getAllRecipesWithIngredients,
  getIngredientsWithPrices,
  getUserNotificationSettings,
  hashPassword,
  initDatabase,
  saveMealPlanRecord,
  updateMealPlanItemsAndShoppingList,
  upsertUserNotificationSettings,
  verifyPassword,
} from './server/db';
import {
  clearSessionCookie,
  requireAdmin,
  requireAuth,
  setSessionCookie,
  signToken,
  type AuthRequest,
} from './server/auth';
import { enhanceRecipeWithGemini } from './server/gemini';
import {
  optimizeWeeklyMealPlan,
  replaceSingleDayInPlan,
  replaceSingleDishInPlan,
  revalidateSubstitution,
  validatePreferencesInput,
} from './src/shared/optimizer';
import type {
  Currency,
  DietaryPreference,
  MealNotificationPayload,
  MealNotificationSettings,
  MealPlan,
  MealPlanItem,
  MealSlot,
  ShoppingListItem,
  User,
  UserPreferences,
} from './src/shared/types';

initDatabase();

const app = express();
app.use(express.json({ limit: '1mb' }));

function getUserPreferencesRow(userId: number): UserPreferences {
  const row = db
    .prepare('SELECT * FROM UserPreferences WHERE user_id = ?')
    .get(userId) as
    | {
        id: number;
        user_id: number;
        weekly_budget: number;
        currency: Currency;
        city: string;
        daily_calories: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
        dietary_preference: DietaryPreference;
        allergies_json: string;
        excluded_ingredients_json: string;
        max_cooking_time_min: number;
        updated_at: string;
      }
    | undefined;

  if (!row) {
    return {
      weekly_budget: 7500,
      currency: 'PKR',
      city: 'Lahore',
      daily_calories: 2000,
      protein_g: 90,
      carbs_g: 240,
      fat_g: 60,
      dietary_preference: 'non-vegetarian',
      allergies: [],
      excluded_ingredients: [],
      max_cooking_time_min: 45,
    };
  }

  return {
    id: row.id,
    user_id: row.user_id,
    weekly_budget: row.weekly_budget,
    currency: row.currency,
    city: row.city,
    daily_calories: row.daily_calories,
    protein_g: row.protein_g,
    carbs_g: row.carbs_g,
    fat_g: row.fat_g,
    dietary_preference: row.dietary_preference,
    allergies: JSON.parse(row.allergies_json || '[]'),
    excluded_ingredients: JSON.parse(row.excluded_ingredients_json || '[]'),
    max_cooking_time_min: row.max_cooking_time_min,
    updated_at: row.updated_at,
  };
}

function hydrateMealPlan(planRow: Record<string, unknown>): MealPlan {
  const planId = Number(planRow.id);
  const items = db
    .prepare(
      `
    SELECT mpi.*, r.title as recipe_title, r.image_url, r.prep_time_min, r.cook_time_min
    FROM MealPlanItems mpi
    JOIN Recipes r ON r.id = mpi.recipe_id
    WHERE mpi.meal_plan_id = ?
    ORDER BY mpi.day_index ASC,
      CASE mpi.meal_slot WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 ELSE 3 END ASC
  `
    )
    .all(planId) as unknown as MealPlanItem[];

  const shoppingRow = db
    .prepare('SELECT id FROM ShoppingLists WHERE meal_plan_id = ?')
    .get(planId) as { id: number } | undefined;

  let shoppingList: ShoppingListItem[] = [];
  if (shoppingRow) {
    const rawItems = db
      .prepare(
        `
      SELECT sli.*, i.name as ingredient_name, i.category, i.measurement_unit
      FROM ShoppingListItems sli
      JOIN Ingredients i ON i.id = sli.ingredient_id
      WHERE sli.shopping_list_id = ?
      ORDER BY sli.total_ingredient_cost DESC
    `
      )
      .all(shoppingRow.id) as Array<Omit<ShoppingListItem, 'is_checked'> & { is_checked: number }>;

    shoppingList = rawItems.map((s) => ({
      ...s,
      is_checked: s.is_checked === 1,
    }));
  }

  return {
    id: planId,
    user_id: Number(planRow.user_id),
    title: String(planRow.title),
    city: String(planRow.city),
    currency: planRow.currency as Currency,
    weekly_budget: Number(planRow.weekly_budget),
    total_cost: Number(planRow.total_cost),
    remaining_budget: Number(planRow.remaining_budget),
    avg_daily_calories: Number(planRow.avg_daily_calories),
    avg_daily_protein: Number(planRow.avg_daily_protein),
    avg_daily_carbs: Number(planRow.avg_daily_carbs),
    avg_daily_fat: Number(planRow.avg_daily_fat),
    estimated_waste_g: Number(planRow.estimated_waste_g),
    dietary_preference: planRow.dietary_preference as DietaryPreference,
    target_calories: Number(planRow.target_calories),
    target_protein: Number(planRow.target_protein),
    target_carbs: Number(planRow.target_carbs),
    target_fat: Number(planRow.target_fat),
    created_at: String(planRow.created_at),
    items,
    shopping_list: shoppingList,
  };
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'nutribudget-api' });
});

// Auth routes
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (typeof name !== 'string' || name.trim().length < 2) {
    res.status(400).json({ error: 'Name must be at least 2 characters.' });
    return;
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    res.status(400).json({ error: 'Please provide a valid email address.' });
    return;
  }
  if (typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM Users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const passwordHash = hashPassword(password);
  const result = db
    .prepare("INSERT INTO Users (name, email, password_hash, role) VALUES (?, ?, ?, 'user')")
    .run(name.trim(), normalizedEmail, passwordHash);

  const userId = Number(result.lastInsertRowid);
  db.prepare(
    `INSERT INTO UserPreferences (user_id, weekly_budget, currency, city, daily_calories, protein_g, carbs_g, fat_g, dietary_preference, allergies_json, excluded_ingredients_json, max_cooking_time_min)
     VALUES (?, 7500, 'PKR', 'Lahore', 2000, 90, 240, 60, 'non-vegetarian', '[]', '[]', 45)`
  ).run(userId);

  const user = db
    .prepare('SELECT id, name, email, role, created_at FROM Users WHERE id = ?')
    .get(userId) as unknown as User;
  const token = signToken(user.id, user.role);
  setSessionCookie(req, res, token);

  res.status(201).json({
    user,
    token,
    preferences: getUserPreferencesRow(user.id),
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const row = db
    .prepare('SELECT id, name, email, password_hash, role, created_at FROM Users WHERE email = ?')
    .get(email.trim().toLowerCase()) as (User & { password_hash: string }) | undefined;

  if (!row || !verifyPassword(password, row.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const user: User = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
  };
  const token = signToken(user.id, user.role);
  setSessionCookie(req, res, token);

  res.json({
    user,
    token,
    preferences: getUserPreferencesRow(user.id),
  });
});

app.post('/api/auth/demo-student', (req, res) => {
  const row = db
    .prepare("SELECT id, name, email, role, created_at FROM Users WHERE email = 'student@nutribudget.pk'")
    .get() as User | undefined;

  if (!row) {
    res.status(404).json({ error: 'Demo student profile not found.' });
    return;
  }

  const token = signToken(row.id, row.role);
  setSessionCookie(req, res, token);
  res.json({
    user: row,
    token,
    preferences: getUserPreferencesRow(row.id),
  });
});

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookie(req, res);
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  res.json({
    user,
    preferences: getUserPreferencesRow(user.id),
  });
});

app.get('/api/auth/session', (req, res) => {
  let user: User | null = null;
  const fakeRes = { status: () => ({ json: () => {} }) } as unknown as express.Response;
  requireAuth(req as AuthRequest, fakeRes, () => {
    user = (req as AuthRequest).user ?? null;
  });
  if (!user) {
    res.json({ authenticated: false, user: null, preferences: null });
    return;
  }
  const authed = user as User;
  res.json({
    authenticated: true,
    user: authed,
    preferences: getUserPreferencesRow(authed.id),
  });
});

// Admin claim / setup flow (secure first-run bootstrap or env ADMIN_PASSCODE)
app.get('/api/admin/claim-status', (_req, res) => {
  const adminRow = db.prepare("SELECT id FROM Users WHERE role = 'admin' LIMIT 1").get();
  const envPasscodeConfigured = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0);
  res.json({
    adminExists: Boolean(adminRow),
    envPasscodeConfigured,
  });
});

app.post('/api/admin/claim', (req, res) => {
  const { name, email, password, passcode } = req.body ?? {};
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  const existingAdmin = db.prepare("SELECT id FROM Users WHERE role = 'admin' LIMIT 1").get();

  if (envPasscode) {
    if (typeof passcode !== 'string' || passcode !== envPasscode) {
      res.status(403).json({ error: 'Invalid admin setup passcode.' });
      return;
    }
  } else if (existingAdmin) {
    res.status(403).json({
      error: 'Administrator account has already been claimed. Please sign in with your admin credentials.',
    });
    return;
  }

  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    res.status(400).json({ error: 'Valid admin email is required.' });
    return;
  }
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Admin password must be at least 8 characters.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = hashPassword(password);
  const existingUser = db.prepare('SELECT id FROM Users WHERE email = ?').get(normalizedEmail) as
    | { id: number }
    | undefined;

  let adminId: number;
  if (existingUser) {
    db.prepare("UPDATE Users SET role = 'admin', password_hash = ?, name = COALESCE(NULLIF(?, ''), name) WHERE id = ?").run(
      passwordHash,
      typeof name === 'string' ? name.trim() : '',
      existingUser.id
    );
    adminId = existingUser.id;
  } else {
    const adminName = typeof name === 'string' && name.trim().length >= 2 ? name.trim() : 'NutriBudget Admin';
    const r = db
      .prepare("INSERT INTO Users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')")
      .run(adminName, normalizedEmail, passwordHash);
    adminId = Number(r.lastInsertRowid);
    db.prepare(
      `INSERT INTO UserPreferences (user_id, weekly_budget, currency, city, daily_calories, protein_g, carbs_g, fat_g, dietary_preference)
       VALUES (?, 8000, 'PKR', 'Lahore', 2000, 95, 240, 60, 'non-vegetarian')`
    ).run(adminId);
  }

  const user = db
    .prepare('SELECT id, name, email, role, created_at FROM Users WHERE id = ?')
    .get(adminId) as unknown as User;
  const token = signToken(user.id, user.role);
  setSessionCookie(req, res, token);

  res.status(201).json({
    user,
    token,
    preferences: getUserPreferencesRow(user.id),
  });
});

// Preferences routes
app.get('/api/preferences', requireAuth, (req: AuthRequest, res) => {
  res.json(getUserPreferencesRow(req.user!.id));
});

app.put('/api/preferences', requireAuth, (req: AuthRequest, res) => {
  const input = req.body as UserPreferences;
  const prefs: UserPreferences = {
    weekly_budget: Number(input.weekly_budget),
    currency: 'PKR',
    city: String(input.city || 'Lahore').trim(),
    daily_calories: Number(input.daily_calories),
    protein_g: Number(input.protein_g),
    carbs_g: Number(input.carbs_g),
    fat_g: Number(input.fat_g),
    dietary_preference:
      input.dietary_preference === 'vegetarian' || input.dietary_preference === 'high-protein'
        ? input.dietary_preference
        : 'non-vegetarian',
    allergies: Array.isArray(input.allergies) ? input.allergies.map(String) : [],
    excluded_ingredients: Array.isArray(input.excluded_ingredients)
      ? input.excluded_ingredients.map(String)
      : [],
    max_cooking_time_min: Number(input.max_cooking_time_min),
  };

  const errors = validatePreferencesInput(prefs);
  if (errors.length > 0) {
    res.status(400).json({ error: errors[0].message, errors });
    return;
  }

  db.prepare(
    `
    INSERT INTO UserPreferences (
      user_id, weekly_budget, currency, city, daily_calories, protein_g, carbs_g, fat_g,
      dietary_preference, allergies_json, excluded_ingredients_json, max_cooking_time_min, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      weekly_budget = excluded.weekly_budget,
      currency = excluded.currency,
      city = excluded.city,
      daily_calories = excluded.daily_calories,
      protein_g = excluded.protein_g,
      carbs_g = excluded.carbs_g,
      fat_g = excluded.fat_g,
      dietary_preference = excluded.dietary_preference,
      allergies_json = excluded.allergies_json,
      excluded_ingredients_json = excluded.excluded_ingredients_json,
      max_cooking_time_min = excluded.max_cooking_time_min,
      updated_at = datetime('now')
  `
  ).run(
    req.user!.id,
    prefs.weekly_budget,
    prefs.currency,
    prefs.city,
    prefs.daily_calories,
    prefs.protein_g,
    prefs.carbs_g,
    prefs.fat_g,
    prefs.dietary_preference,
    JSON.stringify(prefs.allergies),
    JSON.stringify(prefs.excluded_ingredients),
    prefs.max_cooking_time_min
  );

  res.json(getUserPreferencesRow(req.user!.id));
});

// Meal Notification Settings & Check Routes
const TIME_24H_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function time24ToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function format12HourTime(hhmm: string): string {
  if (!TIME_24H_RE.test(hhmm)) return hhmm;
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

app.get('/api/notifications/settings', requireAuth, (req: AuthRequest, res) => {
  res.json(getUserNotificationSettings(req.user!.id));
});

app.put('/api/notifications/settings', requireAuth, (req: AuthRequest, res) => {
  const body = req.body ?? {};
  const current = getUserNotificationSettings(req.user!.id);

  const breakfastTime =
    typeof body.breakfast_time === 'string' ? body.breakfast_time.trim() : current.breakfast_time;
  const lunchTime =
    typeof body.lunch_time === 'string' ? body.lunch_time.trim() : current.lunch_time;
  const dinnerTime =
    typeof body.dinner_time === 'string' ? body.dinner_time.trim() : current.dinner_time;

  if (!TIME_24H_RE.test(breakfastTime) || !TIME_24H_RE.test(lunchTime) || !TIME_24H_RE.test(dinnerTime)) {
    res.status(400).json({ error: 'Meal reminder times must use HH:MM (24-hour) format.' });
    return;
  }

  const leadMinutes =
    body.lead_minutes !== undefined ? Number(body.lead_minutes) : current.lead_minutes;
  if (!Number.isInteger(leadMinutes) || leadMinutes < 0 || leadMinutes > 60) {
    res.status(400).json({ error: 'Reminder lead time must be between 0 and 60 minutes.' });
    return;
  }

  const nextSettings: MealNotificationSettings = {
    enabled: body.enabled !== undefined ? Boolean(body.enabled) : current.enabled,
    breakfast_enabled:
      body.breakfast_enabled !== undefined ? Boolean(body.breakfast_enabled) : current.breakfast_enabled,
    breakfast_time: breakfastTime,
    lunch_enabled:
      body.lunch_enabled !== undefined ? Boolean(body.lunch_enabled) : current.lunch_enabled,
    lunch_time: lunchTime,
    dinner_enabled:
      body.dinner_enabled !== undefined ? Boolean(body.dinner_enabled) : current.dinner_enabled,
    dinner_time: dinnerTime,
    lead_minutes: leadMinutes,
  };

  const saved = upsertUserNotificationSettings(req.user!.id, nextSettings);
  res.json(saved);
});

app.post('/api/notifications/check', requireAuth, (req: AuthRequest, res) => {
  const body = req.body ?? {};
  const settings = getUserNotificationSettings(req.user!.id);
  const forceSlot: MealSlot | null =
    body.force_slot === 'breakfast' || body.force_slot === 'lunch' || body.force_slot === 'dinner'
      ? body.force_slot
      : null;

  if (!settings.enabled && !forceSlot) {
    res.json({ due: null });
    return;
  }

  const now = new Date();
  const rawDayIndex = Number(body.day_index);
  const dayIndex =
    Number.isInteger(rawDayIndex) && rawDayIndex >= 0 && rawDayIndex <= 6
      ? rawDayIndex
      : (now.getDay() + 6) % 7;

  const fallbackTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const currentTime =
    typeof body.current_time === 'string' && TIME_24H_RE.test(body.current_time.trim())
      ? body.current_time.trim()
      : fallbackTime;
  const currentMin = time24ToMinutes(currentTime);

  const slots: Array<{ slot: MealSlot; label: string; enabled: boolean; time: string }> = [
    { slot: 'breakfast', label: 'Breakfast', enabled: settings.breakfast_enabled, time: settings.breakfast_time },
    { slot: 'lunch', label: 'Lunch', enabled: settings.lunch_enabled, time: settings.lunch_time },
    { slot: 'dinner', label: 'Dinner', enabled: settings.dinner_enabled, time: settings.dinner_time },
  ];

  const matched = forceSlot
    ? slots.find((s) => s.slot === forceSlot)
    : slots.find((s) => {
        if (!s.enabled) return false;
        const triggerMin = (time24ToMinutes(s.time) - settings.lead_minutes + 1440) % 1440;
        return triggerMin === currentMin;
      });

  if (!matched) {
    res.json({ due: null });
    return;
  }

  const requestedPlanId = Number(body.plan_id);
  const planRow =
    Number.isInteger(requestedPlanId) && requestedPlanId > 0
      ? (db
          .prepare('SELECT id FROM MealPlans WHERE id = ? AND user_id = ?')
          .get(requestedPlanId, req.user!.id) as { id: number } | undefined)
      : (db
          .prepare('SELECT id FROM MealPlans WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 1')
          .get(req.user!.id) as { id: number } | undefined);

  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  let dayName = DAY_NAMES[dayIndex] || 'Today';
  let recipeId: number | null = null;
  let recipeTitle = `Your scheduled ${matched.label.toLowerCase()} meal`;
  let calories: number | undefined;
  let proteinG: number | undefined;

  if (planRow) {
    const mealRow = db
      .prepare(
        `
        SELECT mpi.recipe_id, mpi.day_name, mpi.calories, mpi.protein_g, r.title as recipe_title
        FROM MealPlanItems mpi
        JOIN Recipes r ON r.id = mpi.recipe_id
        WHERE mpi.meal_plan_id = ? AND mpi.day_index = ? AND mpi.meal_slot = ?
        LIMIT 1
      `
      )
      .get(planRow.id, dayIndex, matched.slot) as
      | {
          recipe_id: number;
          day_name: string;
          calories: number;
          protein_g: number;
          recipe_title: string;
        }
      | undefined;

    if (mealRow) {
      dayName = mealRow.day_name;
      recipeId = mealRow.recipe_id;
      recipeTitle = mealRow.recipe_title;
      calories = mealRow.calories;
      proteinG = Math.round(mealRow.protein_g);
    }
  }

  const formattedTime = format12HourTime(matched.time);
  const leadNote =
    !forceSlot && settings.lead_minutes > 0 ? ` (in ${settings.lead_minutes} min)` : '';

  const payload: MealNotificationPayload = {
    id: `${dayIndex}-${matched.slot}-${Date.now()}`,
    meal_slot: matched.slot,
    day_index: dayIndex,
    day_name: dayName,
    scheduled_time: formattedTime,
    recipe_id: recipeId,
    recipe_title: recipeTitle,
    calories,
    protein_g: proteinG,
    title: `${matched.label} Reminder · ${formattedTime}${leadNote}`,
    message: recipeId
      ? `${dayName}: Time for ${recipeTitle} (${calories ?? 0} kcal, ${proteinG ?? 0}g protein).`
      : `${dayName}: Time for ${matched.label.toLowerCase()} at ${formattedTime}.`,
    is_test: Boolean(forceSlot),
  };

  res.json({ due: payload });
});

// Ingredients & Global Grocery Prices
app.get('/api/ingredients', (req, res) => {
  const city = typeof req.query.city === 'string' && req.query.city.trim() ? req.query.city.trim() : 'Lahore';
  const list = getIngredientsWithPrices(null, city);
  res.json(list);
});

// Recipes & Gemini AI Enhancement
app.get('/api/recipes', (req, res) => {
  const currency: Currency = 'PKR';
  let userId: number | null = null;
  if (req.headers.authorization || req.headers.cookie) {
    const fakeRes = { status: () => ({ json: () => {} }) } as unknown as express.Response;
    requireAuth(req as AuthRequest, fakeRes, () => {
      userId = (req as AuthRequest).user?.id ?? null;
    });
  }
  const ingredients = getIngredientsWithPrices(userId);
  const recipes = getAllRecipesWithIngredients(ingredients, currency);
  res.json(recipes);
});

app.get('/api/recipes/:id', (req, res) => {
  const recipeId = Number(req.params.id);
  const currency: Currency = 'PKR';
  let userId: number | null = null;
  if (req.headers.authorization || req.headers.cookie) {
    const fakeRes = { status: () => ({ json: () => {} }) } as unknown as express.Response;
    requireAuth(req as AuthRequest, fakeRes, () => {
      userId = (req as AuthRequest).user?.id ?? null;
    });
  }
  const ingredients = getIngredientsWithPrices(userId);
  const recipe = getAllRecipesWithIngredients(ingredients, currency).find((r) => r.id === recipeId);
  if (!recipe) {
    res.status(404).json({ error: 'Recipe not found.' });
    return;
  }
  res.json(recipe);
});

app.post('/api/recipes/:id/enhance', requireAuth, async (req: AuthRequest, res) => {
  const recipeId = Number(req.params.id);
  const prefs = getUserPreferencesRow(req.user!.id);
  const ingredients = getIngredientsWithPrices(req.user!.id, prefs.city);
  const recipe = getAllRecipesWithIngredients(ingredients, prefs.currency).find((r) => r.id === recipeId);
  if (!recipe) {
    res.status(404).json({ error: 'Recipe not found.' });
    return;
  }

  const enhanced = await enhanceRecipeWithGemini(
    recipe,
    ingredients.map((i) => i.name)
  );

  if (enhanced.source === 'gemini') {
    db.prepare(
      `UPDATE Recipes SET description = ?, instructions_json = ?, alternatives_json = ?, is_ai_enhanced = 1 WHERE id = ?`
    ).run(
      enhanced.description,
      JSON.stringify(enhanced.instructions),
      JSON.stringify(enhanced.alternatives),
      recipeId
    );
  }

  const refreshed = getAllRecipesWithIngredients(ingredients, prefs.currency).find((r) => r.id === recipeId)!;
  res.json({
    recipe: refreshed,
    source: enhanced.source,
    note: enhanced.note,
  });
});

app.post('/api/recipes/:id/validate-substitution', requireAuth, (req: AuthRequest, res) => {
  const recipeId = Number(req.params.id);
  const { original_ingredient_id, substitute_ingredient_id, remaining_budget } = req.body ?? {};
  const prefs = getUserPreferencesRow(req.user!.id);
  const ingredients = getIngredientsWithPrices(req.user!.id, prefs.city);
  const ingMap = new Map(ingredients.map((i) => [i.id, i]));
  const recipe = getAllRecipesWithIngredients(ingredients, prefs.currency).find((r) => r.id === recipeId);

  if (!recipe) {
    res.status(404).json({ error: 'Recipe not found.' });
    return;
  }
  const sub = ingMap.get(Number(substitute_ingredient_id));
  if (!sub) {
    res.status(404).json({ error: 'Substitute ingredient not found.' });
    return;
  }

  const validation = revalidateSubstitution(
    recipe,
    Number(original_ingredient_id),
    sub,
    prefs,
    ingMap,
    Number.isFinite(Number(remaining_budget)) ? Number(remaining_budget) : prefs.weekly_budget
  );
  res.json(validation);
});

// Meal Plan Generation & Persistence
app.post('/api/meal-plans/generate', requireAuth, (req: AuthRequest, res) => {
  const body = req.body ?? {};
  const savedPrefs = getUserPreferencesRow(req.user!.id);

  const prefs: UserPreferences = {
    weekly_budget: body.weekly_budget !== undefined ? Number(body.weekly_budget) : savedPrefs.weekly_budget,
    currency: 'PKR',
    city: typeof body.city === 'string' && body.city.trim() ? body.city.trim() : savedPrefs.city,
    daily_calories: body.daily_calories !== undefined ? Number(body.daily_calories) : savedPrefs.daily_calories,
    protein_g: body.protein_g !== undefined ? Number(body.protein_g) : savedPrefs.protein_g,
    carbs_g: body.carbs_g !== undefined ? Number(body.carbs_g) : savedPrefs.carbs_g,
    fat_g: body.fat_g !== undefined ? Number(body.fat_g) : savedPrefs.fat_g,
    dietary_preference:
      body.dietary_preference === 'vegetarian' ||
      body.dietary_preference === 'non-vegetarian' ||
      body.dietary_preference === 'high-protein'
        ? body.dietary_preference
        : savedPrefs.dietary_preference,
    allergies: Array.isArray(body.allergies) ? body.allergies.map(String) : savedPrefs.allergies,
    excluded_ingredients: Array.isArray(body.excluded_ingredients)
      ? body.excluded_ingredients.map(String)
      : savedPrefs.excluded_ingredients,
    max_cooking_time_min:
      body.max_cooking_time_min !== undefined
        ? Number(body.max_cooking_time_min)
        : savedPrefs.max_cooking_time_min,
  };

  const errors = validatePreferencesInput(prefs);
  if (errors.length > 0) {
    res.status(400).json({ error: errors[0].message, errors });
    return;
  }

  // Persist latest preferences on generate
  db.prepare(
    `
    INSERT INTO UserPreferences (
      user_id, weekly_budget, currency, city, daily_calories, protein_g, carbs_g, fat_g,
      dietary_preference, allergies_json, excluded_ingredients_json, max_cooking_time_min, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      weekly_budget = excluded.weekly_budget,
      currency = excluded.currency,
      city = excluded.city,
      daily_calories = excluded.daily_calories,
      protein_g = excluded.protein_g,
      carbs_g = excluded.carbs_g,
      fat_g = excluded.fat_g,
      dietary_preference = excluded.dietary_preference,
      allergies_json = excluded.allergies_json,
      excluded_ingredients_json = excluded.excluded_ingredients_json,
      max_cooking_time_min = excluded.max_cooking_time_min,
      updated_at = datetime('now')
  `
  ).run(
    req.user!.id,
    prefs.weekly_budget,
    prefs.currency,
    prefs.city,
    prefs.daily_calories,
    prefs.protein_g,
    prefs.carbs_g,
    prefs.fat_g,
    prefs.dietary_preference,
    JSON.stringify(prefs.allergies),
    JSON.stringify(prefs.excluded_ingredients),
    prefs.max_cooking_time_min
  );

  const ingredients = getIngredientsWithPrices(req.user!.id, prefs.city);
  const recipes = getAllRecipesWithIngredients(ingredients, prefs.currency);
  const opt = optimizeWeeklyMealPlan(recipes, ingredients, prefs, {
    title: typeof body.title === 'string' ? body.title : undefined,
    seedOffset: Number.isFinite(Number(body.seedOffset)) ? Number(body.seedOffset) : 0,
  });

  if (!opt.feasible || !opt.plan) {
    res.status(422).json({
      feasible: false,
      diagnostics: opt.diagnostics,
    });
    return;
  }

  const shouldSave = body.save !== false;
  if (shouldSave) {
    const newId = saveMealPlanRecord(req.user!.id, opt.plan);
    const planRow = db.prepare('SELECT * FROM MealPlans WHERE id = ?').get(newId) as Record<string, unknown>;
    res.status(201).json({
      feasible: true,
      plan: hydrateMealPlan(planRow),
    });
    return;
  }

  res.json({
    feasible: true,
    plan: {
      id: 0,
      user_id: req.user!.id,
      created_at: new Date().toISOString(),
      ...opt.plan,
    },
  });
});

app.get('/api/meal-plans', requireAuth, (req: AuthRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM MealPlans WHERE user_id = ? ORDER BY created_at DESC, id DESC')
    .all(req.user!.id) as Record<string, unknown>[];

  res.json(rows.map(hydrateMealPlan));
});

app.get('/api/meal-plans/:id', requireAuth, (req: AuthRequest, res) => {
  const planId = Number(req.params.id);
  const row = db
    .prepare('SELECT * FROM MealPlans WHERE id = ? AND user_id = ?')
    .get(planId, req.user!.id) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Meal plan not found.' });
    return;
  }
  res.json(hydrateMealPlan(row));
});

app.post('/api/meal-plans/:id/regenerate', requireAuth, (req: AuthRequest, res) => {
  const planId = Number(req.params.id);
  const row = db
    .prepare('SELECT * FROM MealPlans WHERE id = ? AND user_id = ?')
    .get(planId, req.user!.id) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Meal plan not found.' });
    return;
  }

  const userPrefs = getUserPreferencesRow(req.user!.id);
  const prefs: UserPreferences = {
    ...userPrefs,
    weekly_budget: Number(row.weekly_budget),
    currency: row.currency as Currency,
    city: String(row.city),
    daily_calories: Number(row.target_calories),
    protein_g: Number(row.target_protein),
    carbs_g: Number(row.target_carbs),
    fat_g: Number(row.target_fat),
    dietary_preference: row.dietary_preference as DietaryPreference,
  };

  const ingredients = getIngredientsWithPrices(req.user!.id, prefs.city);
  const recipes = getAllRecipesWithIngredients(ingredients, prefs.currency);
  const seedOffset = Number.isFinite(Number(req.body?.seedOffset)) ? Number(req.body.seedOffset) : (planId % 5) + 1;
  const opt = optimizeWeeklyMealPlan(recipes, ingredients, prefs, {
    title: `${String(row.title)} (Updated)`,
    seedOffset,
  });

  if (!opt.feasible || !opt.plan) {
    res.status(422).json({
      feasible: false,
      diagnostics: opt.diagnostics,
    });
    return;
  }

  const newId = saveMealPlanRecord(req.user!.id, opt.plan);
  const newRow = db.prepare('SELECT * FROM MealPlans WHERE id = ?').get(newId) as Record<string, unknown>;
  res.status(201).json({
    feasible: true,
    plan: hydrateMealPlan(newRow),
  });
});

app.patch('/api/meal-plans/:id/items', requireAuth, (req: AuthRequest, res) => {
  const planId = Number(req.params.id);
  const dayIndex = Number(req.body?.day_index);
  const mealSlot = req.body?.meal_slot as MealSlot;
  const recipeId = Number(req.body?.recipe_id);

  if (
    !Number.isInteger(dayIndex) ||
    dayIndex < 0 ||
    dayIndex > 6 ||
    (mealSlot !== 'breakfast' && mealSlot !== 'lunch' && mealSlot !== 'dinner') ||
    !Number.isInteger(recipeId) ||
    recipeId <= 0
  ) {
    res.status(400).json({ error: 'Valid day_index, meal_slot, and recipe_id are required.' });
    return;
  }

  const row = db
    .prepare('SELECT * FROM MealPlans WHERE id = ? AND user_id = ?')
    .get(planId, req.user!.id) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Meal plan not found.' });
    return;
  }

  const hydrated = hydrateMealPlan(row);
  const userPrefs = getUserPreferencesRow(req.user!.id);
  const prefs: UserPreferences = {
    ...userPrefs,
    weekly_budget: hydrated.weekly_budget,
    currency: hydrated.currency,
    city: hydrated.city,
    daily_calories: hydrated.target_calories,
    protein_g: hydrated.target_protein,
    carbs_g: hydrated.target_carbs,
    fat_g: hydrated.target_fat,
    dietary_preference: hydrated.dietary_preference,
    max_cooking_time_min: Math.max(45, userPrefs.max_cooking_time_min),
  };

  const ingredients = getIngredientsWithPrices(req.user!.id, prefs.city);
  const recipes = getAllRecipesWithIngredients(ingredients, prefs.currency);
  const result = replaceSingleDishInPlan(
    hydrated.items,
    dayIndex,
    mealSlot,
    recipeId,
    recipes,
    ingredients,
    prefs
  );

  if (!result.feasible || !result.items || !result.shopping_list) {
    res.status(422).json({ error: result.error || 'Could not replace dish within constraints.' });
    return;
  }

  updateMealPlanItemsAndShoppingList(planId, {
    items: result.items,
    total_cost: result.total_cost!,
    remaining_budget: result.remaining_budget!,
    avg_daily_calories: result.avg_daily_calories!,
    avg_daily_protein: result.avg_daily_protein!,
    avg_daily_carbs: result.avg_daily_carbs!,
    avg_daily_fat: result.avg_daily_fat!,
    estimated_waste_g: result.estimated_waste_g!,
    shopping_list: result.shopping_list,
  });

  const updatedRow = db.prepare('SELECT * FROM MealPlans WHERE id = ?').get(planId) as Record<string, unknown>;
  res.json({ feasible: true, plan: hydrateMealPlan(updatedRow) });
});

app.post('/api/meal-plans/:id/replace-day', requireAuth, (req: AuthRequest, res) => {
  const planId = Number(req.params.id);
  const dayIndex = Number(req.body?.day_index);
  const seedOffset = Number.isFinite(Number(req.body?.seedOffset)) ? Number(req.body.seedOffset) : 0;

  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6) {
    res.status(400).json({ error: 'Valid day_index (0-6) is required.' });
    return;
  }

  const row = db
    .prepare('SELECT * FROM MealPlans WHERE id = ? AND user_id = ?')
    .get(planId, req.user!.id) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Meal plan not found.' });
    return;
  }

  const hydrated = hydrateMealPlan(row);
  const userPrefs = getUserPreferencesRow(req.user!.id);
  const prefs: UserPreferences = {
    ...userPrefs,
    weekly_budget: hydrated.weekly_budget,
    currency: hydrated.currency,
    city: hydrated.city,
    daily_calories: hydrated.target_calories,
    protein_g: hydrated.target_protein,
    carbs_g: hydrated.target_carbs,
    fat_g: hydrated.target_fat,
    dietary_preference: hydrated.dietary_preference,
    max_cooking_time_min: Math.max(45, userPrefs.max_cooking_time_min),
  };

  const ingredients = getIngredientsWithPrices(req.user!.id, prefs.city);
  const recipes = getAllRecipesWithIngredients(ingredients, prefs.currency);
  const result = replaceSingleDayInPlan(
    hydrated.items,
    dayIndex,
    recipes,
    ingredients,
    prefs,
    seedOffset
  );

  if (!result.feasible || !result.items || !result.shopping_list) {
    res.status(422).json({ error: result.error || 'Could not replace day plan within constraints.' });
    return;
  }

  updateMealPlanItemsAndShoppingList(planId, {
    items: result.items,
    total_cost: result.total_cost!,
    remaining_budget: result.remaining_budget!,
    avg_daily_calories: result.avg_daily_calories!,
    avg_daily_protein: result.avg_daily_protein!,
    avg_daily_carbs: result.avg_daily_carbs!,
    avg_daily_fat: result.avg_daily_fat!,
    estimated_waste_g: result.estimated_waste_g!,
    shopping_list: result.shopping_list,
  });

  const updatedRow = db.prepare('SELECT * FROM MealPlans WHERE id = ?').get(planId) as Record<string, unknown>;
  res.json({ feasible: true, plan: hydrateMealPlan(updatedRow) });
});

app.delete('/api/meal-plans/:id', requireAuth, (req: AuthRequest, res) => {
  const planId = Number(req.params.id);
  const result = db
    .prepare('DELETE FROM MealPlans WHERE id = ? AND user_id = ?')
    .run(planId, req.user!.id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Meal plan not found.' });
    return;
  }
  res.json({ ok: true });
});

app.patch('/api/shopping-list-items/:id', requireAuth, (req: AuthRequest, res) => {
  const itemId = Number(req.params.id);
  const isChecked = req.body?.is_checked ? 1 : 0;

  const ownerRow = db
    .prepare(
      `
    SELECT sli.id
    FROM ShoppingListItems sli
    JOIN ShoppingLists sl ON sl.id = sli.shopping_list_id
    JOIN MealPlans mp ON mp.id = sl.meal_plan_id
    WHERE sli.id = ? AND mp.user_id = ?
  `
    )
    .get(itemId, req.user!.id) as { id: number } | undefined;

  if (!ownerRow) {
    res.status(404).json({ error: 'Shopping list item not found.' });
    return;
  }

  db.prepare('UPDATE ShoppingListItems SET is_checked = ? WHERE id = ?').run(isChecked, itemId);
  res.json({ id: itemId, is_checked: isChecked === 1 });
});

// Admin routes
app.get('/api/admin/stats', requireAdmin, (_req, res) => {
  const usersCount = (db.prepare('SELECT COUNT(*) as c FROM Users').get() as { c: number }).c;
  const ingredientsCount = (db.prepare('SELECT COUNT(*) as c FROM Ingredients').get() as { c: number }).c;
  const verifiedPricesCount = (
    db.prepare("SELECT COUNT(*) as c FROM GroceryPrices WHERE user_id IS NULL AND price_status = 'verified'").get() as {
      c: number;
    }
  ).c;
  const recipesCount = (db.prepare('SELECT COUNT(*) as c FROM Recipes').get() as { c: number }).c;
  const plansCount = (db.prepare('SELECT COUNT(*) as c FROM MealPlans').get() as { c: number }).c;
  const activeRemindersCount = (
    db.prepare('SELECT COUNT(*) as c FROM MealNotificationSettings WHERE enabled = 1').get() as { c: number }
  ).c;
  const avgStats = db
    .prepare('SELECT COALESCE(AVG(weekly_budget), 0) as avg_budget, COALESCE(AVG(total_cost), 0) as avg_cost FROM MealPlans')
    .get() as { avg_budget: number; avg_cost: number };

  const recentUsers = db
    .prepare('SELECT id, name, email, role, created_at FROM Users ORDER BY id DESC LIMIT 10')
    .all();

  const dietBreakdown = db
    .prepare('SELECT dietary_preference, COUNT(*) as count FROM MealPlans GROUP BY dietary_preference')
    .all() as Array<{ dietary_preference: string; count: number }>;

  const topRecipes = db
    .prepare(
      `
      SELECT r.id, r.title, r.meal_slot, COUNT(mpi.id) as usage_count
      FROM MealPlanItems mpi
      JOIN Recipes r ON r.id = mpi.recipe_id
      GROUP BY r.id, r.title, r.meal_slot
      ORDER BY usage_count DESC, r.id ASC
      LIMIT 5
    `
    )
    .all() as Array<{ id: number; title: string; meal_slot: string; usage_count: number }>;

  res.json({
    usersCount,
    ingredientsCount,
    verifiedPricesCount,
    recipesCount,
    plansCount,
    activeRemindersCount,
    avgBudget: Math.round(avgStats.avg_budget),
    avgCost: Math.round(avgStats.avg_cost),
    recentUsers,
    dietBreakdown,
    topRecipes,
  });
});

app.get('/api/admin/users', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        COALESCE(up.weekly_budget, 7500) as weekly_budget,
        COALESCE(up.dietary_preference, 'non-vegetarian') as dietary_preference,
        COALESCE(mns.enabled, 0) as reminders_enabled,
        (SELECT COUNT(*) FROM MealPlans mp WHERE mp.user_id = u.id) as plans_count
      FROM Users u
      LEFT JOIN UserPreferences up ON up.user_id = u.id
      LEFT JOIN MealNotificationSettings mns ON mns.user_id = u.id
      ORDER BY u.id DESC
    `
    )
    .all() as Array<{
    id: number;
    name: string;
    email: string;
    role: 'user' | 'admin';
    created_at: string;
    weekly_budget: number;
    dietary_preference: string;
    reminders_enabled: number;
    plans_count: number;
  }>;

  res.json(
    rows.map((r) => ({
      ...r,
      reminders_enabled: r.reminders_enabled === 1,
    }))
  );
});

app.patch('/api/admin/users/:id/role', requireAdmin, (req: AuthRequest, res) => {
  const targetId = Number(req.params.id);
  const nextRole = req.body?.role;

  if (!Number.isInteger(targetId) || targetId <= 0) {
    res.status(400).json({ error: 'Invalid user ID.' });
    return;
  }
  if (nextRole !== 'user' && nextRole !== 'admin') {
    res.status(400).json({ error: "Role must be 'user' or 'admin'." });
    return;
  }
  if (targetId === req.user!.id) {
    res.status(400).json({ error: 'You cannot change your own administrator role.' });
    return;
  }

  const target = db.prepare('SELECT id, role FROM Users WHERE id = ?').get(targetId) as
    | { id: number; role: string }
    | undefined;
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  if (target.role === 'admin' && nextRole === 'user') {
    const adminCount = (db.prepare("SELECT COUNT(*) as c FROM Users WHERE role = 'admin'").get() as { c: number }).c;
    if (adminCount <= 1) {
      res.status(400).json({ error: 'At least one administrator account must remain.' });
      return;
    }
  }

  db.prepare('UPDATE Users SET role = ? WHERE id = ?').run(nextRole, targetId);
  const updated = db
    .prepare('SELECT id, name, email, role, created_at FROM Users WHERE id = ?')
    .get(targetId);
  res.json(updated);
});

app.delete('/api/admin/users/:id', requireAdmin, (req: AuthRequest, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    res.status(400).json({ error: 'Invalid user ID.' });
    return;
  }
  if (targetId === req.user!.id) {
    res.status(400).json({ error: 'You cannot delete your currently signed-in account.' });
    return;
  }

  const target = db.prepare('SELECT id, role FROM Users WHERE id = ?').get(targetId) as
    | { id: number; role: string }
    | undefined;
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  if (target.role === 'admin') {
    const adminCount = (db.prepare("SELECT COUNT(*) as c FROM Users WHERE role = 'admin'").get() as { c: number }).c;
    if (adminCount <= 1) {
      res.status(400).json({ error: 'Cannot delete the only administrator account.' });
      return;
    }
  }

  db.prepare('DELETE FROM Users WHERE id = ?').run(targetId);
  res.json({ ok: true });
});

app.post('/api/admin/ingredients', requireAdmin, (req, res) => {
  const {
    name,
    category,
    package_size_g,
    measurement_unit,
    calories_per_100g,
    protein_per_100g,
    carbs_per_100g,
    fat_per_100g,
    allergen_tag,
    is_vegetarian,
    package_price,
    price_status,
  } = req.body ?? {};

  if (typeof name !== 'string' || name.trim().length < 2) {
    res.status(400).json({ error: 'Ingredient name is required.' });
    return;
  }
  if (!Number.isFinite(Number(package_size_g)) || Number(package_size_g) <= 0) {
    res.status(400).json({ error: 'Package size must be positive.' });
    return;
  }
  if (!Number.isFinite(Number(package_price)) || Number(package_price) <= 0) {
    res.status(400).json({ error: 'Package price must be positive.' });
    return;
  }

  try {
    const ingRes = db
      .prepare(
        `INSERT INTO Ingredients (name, category, package_size_g, measurement_unit, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, allergen_tag, is_vegetarian, is_halal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      )
      .run(
        name.trim(),
        String(category || 'Pantry'),
        Number(package_size_g),
        String(measurement_unit || 'g'),
        Math.max(0, Number(calories_per_100g) || 0),
        Math.max(0, Number(protein_per_100g) || 0),
        Math.max(0, Number(carbs_per_100g) || 0),
        Math.max(0, Number(fat_per_100g) || 0),
        allergen_tag && String(allergen_tag).trim() ? String(allergen_tag).trim().toLowerCase() : null,
        is_vegetarian === false || is_vegetarian === 0 ? 0 : 1
      );
    const ingId = Number(ingRes.lastInsertRowid);
    db.prepare(
      `INSERT INTO GroceryPrices (ingredient_id, user_id, city, package_price, currency, price_status, updated_at)
       VALUES (?, NULL, 'Lahore', ?, 'PKR', ?, date('now'))`
    ).run(
      ingId,
      Number(package_price),
      price_status === 'verified' ? 'verified' : 'estimated'
    );

    const created = getIngredientsWithPrices(null).find((i) => i.id === ingId);
    res.status(201).json(created);
  } catch (err) {
    res.status(409).json({
      error: err instanceof Error && err.message.includes('UNIQUE') ? 'Ingredient already exists.' : 'Failed to create ingredient.',
    });
  }
});

app.put('/api/admin/ingredients/:id', requireAdmin, (req, res) => {
  const ingId = Number(req.params.id);
  if (!Number.isInteger(ingId) || ingId <= 0) {
    res.status(400).json({ error: 'Invalid ingredient ID.' });
    return;
  }

  const {
    name,
    category,
    package_size_g,
    calories_per_100g,
    protein_per_100g,
    carbs_per_100g,
    fat_per_100g,
    allergen_tag,
    is_vegetarian,
    package_price,
    price_status,
  } = req.body ?? {};

  const existing = db.prepare('SELECT id FROM Ingredients WHERE id = ?').get(ingId);
  if (!existing) {
    res.status(404).json({ error: 'Ingredient not found.' });
    return;
  }

  if (package_size_g !== undefined && (!Number.isFinite(Number(package_size_g)) || Number(package_size_g) <= 0)) {
    res.status(400).json({ error: 'Package size must be a positive number.' });
    return;
  }
  if (package_price !== undefined && (!Number.isFinite(Number(package_price)) || Number(package_price) <= 0)) {
    res.status(400).json({ error: 'Package price must be a positive number.' });
    return;
  }
  if (price_status !== undefined && price_status !== 'verified' && price_status !== 'estimated') {
    res.status(400).json({ error: "Price status must be 'verified' or 'estimated'." });
    return;
  }

  for (const [label, val] of [
    ['Calories', calories_per_100g],
    ['Protein', protein_per_100g],
    ['Carbs', carbs_per_100g],
    ['Fat', fat_per_100g],
  ] as const) {
    if (val !== undefined && (!Number.isFinite(Number(val)) || Number(val) < 0)) {
      res.status(400).json({ error: `${label} must be a non-negative number.` });
      return;
    }
  }

  db.prepare(
    `UPDATE Ingredients SET
      name = COALESCE(?, name),
      category = COALESCE(?, category),
      package_size_g = COALESCE(?, package_size_g),
      calories_per_100g = COALESCE(?, calories_per_100g),
      protein_per_100g = COALESCE(?, protein_per_100g),
      carbs_per_100g = COALESCE(?, carbs_per_100g),
      fat_per_100g = COALESCE(?, fat_per_100g),
      allergen_tag = CASE WHEN ? THEN ? ELSE allergen_tag END,
      is_vegetarian = COALESCE(?, is_vegetarian)
    WHERE id = ?`
  ).run(
    typeof name === 'string' && name.trim().length >= 2 ? name.trim() : null,
    typeof category === 'string' && category.trim() ? category.trim() : null,
    package_size_g !== undefined ? Number(package_size_g) : null,
    calories_per_100g !== undefined ? Number(calories_per_100g) : null,
    protein_per_100g !== undefined ? Number(protein_per_100g) : null,
    carbs_per_100g !== undefined ? Number(carbs_per_100g) : null,
    fat_per_100g !== undefined ? Number(fat_per_100g) : null,
    allergen_tag !== undefined ? 1 : 0,
    allergen_tag && String(allergen_tag).trim() ? String(allergen_tag).trim().toLowerCase() : null,
    is_vegetarian !== undefined ? (is_vegetarian ? 1 : 0) : null,
    ingId
  );

  if (package_price !== undefined || price_status !== undefined) {
    db.prepare(
      `UPDATE GroceryPrices SET
        package_price = COALESCE(?, package_price),
        price_status = COALESCE(?, price_status),
        updated_at = date('now')
       WHERE ingredient_id = ? AND user_id IS NULL`
    ).run(
      package_price !== undefined ? Number(package_price) : null,
      price_status ?? null,
      ingId
    );
  }

  res.json(getIngredientsWithPrices(null).find((i) => i.id === ingId));
});

app.delete('/api/admin/ingredients/:id', requireAdmin, (req, res) => {
  const ingId = Number(req.params.id);
  if (!Number.isInteger(ingId) || ingId <= 0) {
    res.status(400).json({ error: 'Invalid ingredient ID.' });
    return;
  }
  const r = db.prepare('DELETE FROM Ingredients WHERE id = ?').run(ingId);
  if (r.changes === 0) {
    res.status(404).json({ error: 'Ingredient not found.' });
    return;
  }
  res.json({ ok: true });
});

app.post('/api/admin/recipes', requireAdmin, (req: AuthRequest, res) => {
  const { title, description, meal_slot, dietary_tag, instructions, ingredients } = req.body ?? {};

  if (typeof title !== 'string' || title.trim().length < 3) {
    res.status(400).json({ error: 'Recipe title is required.' });
    return;
  }
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    res.status(400).json({ error: 'At least one ingredient is required.' });
    return;
  }

  const normalizedIngredients: Array<{ ingredient_id: number; quantity_g: number }> = [];
  for (const ri of ingredients) {
    const ingId = Number(ri?.ingredient_id);
    const qty = Number(ri?.quantity_g);
    if (!Number.isInteger(ingId) || ingId <= 0 || !Number.isFinite(qty) || qty <= 0) {
      res.status(400).json({ error: 'Each recipe ingredient requires a valid ingredient ID and positive quantity.' });
      return;
    }
    normalizedIngredients.push({ ingredient_id: ingId, quantity_g: Math.round(qty) });
  }

  const slot = meal_slot === 'breakfast' || meal_slot === 'lunch' || meal_slot === 'dinner' ? meal_slot : 'lunch';
  const diet =
    dietary_tag === 'vegetarian' || dietary_tag === 'high-protein' ? dietary_tag : 'non-vegetarian';
  const defaultImg =
    slot === 'breakfast'
      ? '/src/assets/images/meal_breakfast_bowl_1795603501224.jpg'
      : slot === 'lunch'
      ? '/src/assets/images/meal_lunch_dal_rice_1795603501760.jpg'
      : '/src/assets/images/meal_dinner_chicken_karahi_1795603502419.jpg';

  const normalizedInstructions = Array.isArray(instructions)
    ? instructions.map((s) => String(s).trim()).filter(Boolean)
    : [];

  db.exec('BEGIN TRANSACTION');
  try {
    const rRes = db
      .prepare(
        `INSERT INTO Recipes (title, description, meal_slot, dietary_tag, prep_time_min, cook_time_min, servings, image_url, instructions_json, alternatives_json, created_by)
         VALUES (?, ?, ?, ?, 10, 20, 1, ?, ?, '[]', ?)`
      )
      .run(
        title.trim(),
        String(description || 'Custom nutritional recipe template.'),
        slot,
        diet,
        defaultImg,
        JSON.stringify(
          normalizedInstructions.length > 0
            ? normalizedInstructions
            : ['Combine ingredients and cook until done.']
        ),
        req.user!.id
      );

    const recId = Number(rRes.lastInsertRowid);
    const insRI = db.prepare('INSERT INTO RecipeIngredients (recipe_id, ingredient_id, quantity_g) VALUES (?, ?, ?)');
    for (const ri of normalizedIngredients) {
      insRI.run(recId, ri.ingredient_id, ri.quantity_g);
    }

    db.exec('COMMIT');
    const ings = getIngredientsWithPrices(null);
    const created = getAllRecipesWithIngredients(ings, 'PKR').find((r) => r.id === recId);
    res.status(201).json(created);
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(409).json({
      error: err instanceof Error && err.message.includes('UNIQUE') ? 'Recipe title already exists.' : 'Failed to create recipe.',
    });
  }
});

app.put('/api/admin/recipes/:id', requireAdmin, (req, res) => {
  const recId = Number(req.params.id);
  if (!Number.isInteger(recId) || recId <= 0) {
    res.status(400).json({ error: 'Invalid recipe ID.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM Recipes WHERE id = ?').get(recId);
  if (!existing) {
    res.status(404).json({ error: 'Recipe not found.' });
    return;
  }

  const { title, description, meal_slot, dietary_tag, instructions, ingredients } = req.body ?? {};
  if (typeof title !== 'string' || title.trim().length < 3) {
    res.status(400).json({ error: 'Recipe title must be at least 3 characters.' });
    return;
  }
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    res.status(400).json({ error: 'At least one ingredient is required.' });
    return;
  }

  const normalizedIngredients: Array<{ ingredient_id: number; quantity_g: number }> = [];
  for (const ri of ingredients) {
    const ingId = Number(ri?.ingredient_id);
    const qty = Number(ri?.quantity_g);
    if (!Number.isInteger(ingId) || ingId <= 0 || !Number.isFinite(qty) || qty <= 0) {
      res.status(400).json({ error: 'Each recipe ingredient requires a valid ingredient ID and positive quantity.' });
      return;
    }
    normalizedIngredients.push({ ingredient_id: ingId, quantity_g: Math.round(qty) });
  }

  const slot = meal_slot === 'breakfast' || meal_slot === 'lunch' || meal_slot === 'dinner' ? meal_slot : 'lunch';
  const diet =
    dietary_tag === 'vegetarian' || dietary_tag === 'high-protein' ? dietary_tag : 'non-vegetarian';
  const normalizedInstructions = Array.isArray(instructions)
    ? instructions.map((s) => String(s).trim()).filter(Boolean)
    : [];

  db.exec('BEGIN TRANSACTION');
  try {
    db.prepare(
      `UPDATE Recipes SET
        title = ?,
        description = ?,
        meal_slot = ?,
        dietary_tag = ?,
        instructions_json = ?
       WHERE id = ?`
    ).run(
      title.trim(),
      String(description || 'Custom nutritional recipe template.'),
      slot,
      diet,
      JSON.stringify(
        normalizedInstructions.length > 0
          ? normalizedInstructions
          : ['Combine ingredients and cook until done.']
      ),
      recId
    );

    db.prepare('DELETE FROM RecipeIngredients WHERE recipe_id = ?').run(recId);
    const insRI = db.prepare('INSERT INTO RecipeIngredients (recipe_id, ingredient_id, quantity_g) VALUES (?, ?, ?)');
    for (const ri of normalizedIngredients) {
      insRI.run(recId, ri.ingredient_id, ri.quantity_g);
    }

    db.exec('COMMIT');
    const ings = getIngredientsWithPrices(null);
    const updated = getAllRecipesWithIngredients(ings, 'PKR').find((r) => r.id === recId);
    res.json(updated);
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(409).json({
      error: err instanceof Error && err.message.includes('UNIQUE') ? 'Recipe title already exists.' : 'Failed to update recipe.',
    });
  }
});

app.delete('/api/admin/recipes/:id', requireAdmin, (req, res) => {
  const recId = Number(req.params.id);
  if (!Number.isInteger(recId) || recId <= 0) {
    res.status(400).json({ error: 'Invalid recipe ID.' });
    return;
  }
  const r = db.prepare('DELETE FROM Recipes WHERE id = ?').run(recId);
  if (r.changes === 0) {
    res.status(404).json({ error: 'Recipe not found.' });
    return;
  }
  res.json({ ok: true });
});

app.get('/api/admin/meal-plans', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `
      SELECT
        mp.id,
        mp.title,
        mp.dietary_preference,
        mp.weekly_budget,
        mp.total_cost,
        mp.avg_daily_calories,
        mp.avg_daily_protein,
        mp.estimated_waste_g,
        mp.created_at,
        u.name as user_name,
        u.email as user_email
      FROM MealPlans mp
      JOIN Users u ON u.id = mp.user_id
      ORDER BY mp.created_at DESC, mp.id DESC
      LIMIT 50
    `
    )
    .all();

  res.json(rows);
});

app.delete('/api/admin/meal-plans/:id', requireAdmin, (req, res) => {
  const planId = Number(req.params.id);
  if (!Number.isInteger(planId) || planId <= 0) {
    res.status(400).json({ error: 'Invalid meal plan ID.' });
    return;
  }
  const r = db.prepare('DELETE FROM MealPlans WHERE id = ?').run(planId);
  if (r.changes === 0) {
    res.status(404).json({ error: 'Meal plan not found.' });
    return;
  }
  res.json({ ok: true });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(process.cwd(), 'dist');

  if (!isProd || !fs.existsSync(distPath)) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NutriBudget server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start NutriBudget server:', err);
  process.exit(1);
});
