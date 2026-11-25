import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import { SEED_INGREDIENTS, SEED_RECIPES } from './seed';
import { optimizeWeeklyMealPlan } from '../src/shared/optimizer';
import type {
  Currency,
  IngredientWithPrice,
  MealNotificationSettings,
  MealPlanItem,
  Recipe,
  ShoppingListItem,
  UserPreferences,
} from '../src/shared/types';

const DB_PATH = path.resolve(process.cwd(), 'nutribudget.db');

export const db = new DatabaseSync(DB_PATH);

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function initDatabase(): void {
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'admin')) DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS UserPreferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      weekly_budget REAL NOT NULL DEFAULT 6500,
      currency TEXT NOT NULL CHECK(currency IN ('PKR', 'USD')) DEFAULT 'PKR',
      city TEXT NOT NULL DEFAULT 'Lahore',
      daily_calories INTEGER NOT NULL DEFAULT 2000,
      protein_g INTEGER NOT NULL DEFAULT 90,
      carbs_g INTEGER NOT NULL DEFAULT 240,
      fat_g INTEGER NOT NULL DEFAULT 60,
      dietary_preference TEXT NOT NULL CHECK(dietary_preference IN ('vegetarian', 'non-vegetarian', 'high-protein')) DEFAULT 'non-vegetarian',
      allergies_json TEXT NOT NULL DEFAULT '[]',
      excluded_ingredients_json TEXT NOT NULL DEFAULT '[]',
      max_cooking_time_min INTEGER NOT NULL DEFAULT 45,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      package_size_g REAL NOT NULL,
      measurement_unit TEXT NOT NULL DEFAULT 'g',
      calories_per_100g REAL NOT NULL,
      protein_per_100g REAL NOT NULL,
      carbs_per_100g REAL NOT NULL,
      fat_per_100g REAL NOT NULL,
      allergen_tag TEXT,
      is_vegetarian INTEGER NOT NULL DEFAULT 1,
      is_halal INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS GroceryPrices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER NOT NULL,
      user_id INTEGER,
      city TEXT NOT NULL DEFAULT 'Lahore',
      package_price REAL NOT NULL,
      currency TEXT NOT NULL CHECK(currency IN ('PKR', 'USD')) DEFAULT 'PKR',
      price_status TEXT NOT NULL CHECK(price_status IN ('estimated', 'verified')) DEFAULT 'estimated',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ingredient_id) REFERENCES Ingredients(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      meal_slot TEXT NOT NULL CHECK(meal_slot IN ('breakfast', 'lunch', 'dinner')),
      dietary_tag TEXT NOT NULL CHECK(dietary_tag IN ('vegetarian', 'non-vegetarian', 'high-protein')),
      prep_time_min INTEGER NOT NULL DEFAULT 10,
      cook_time_min INTEGER NOT NULL DEFAULT 20,
      servings INTEGER NOT NULL DEFAULT 1,
      image_url TEXT NOT NULL DEFAULT '',
      instructions_json TEXT NOT NULL DEFAULT '[]',
      alternatives_json TEXT NOT NULL DEFAULT '[]',
      is_ai_enhanced INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER,
      FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS RecipeIngredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      quantity_g REAL NOT NULL,
      FOREIGN KEY (recipe_id) REFERENCES Recipes(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES Ingredients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS MealPlans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      city TEXT NOT NULL,
      currency TEXT NOT NULL CHECK(currency IN ('PKR', 'USD')) DEFAULT 'PKR',
      weekly_budget REAL NOT NULL,
      total_cost REAL NOT NULL,
      remaining_budget REAL NOT NULL,
      avg_daily_calories INTEGER NOT NULL,
      avg_daily_protein REAL NOT NULL,
      avg_daily_carbs REAL NOT NULL,
      avg_daily_fat REAL NOT NULL,
      estimated_waste_g REAL NOT NULL DEFAULT 0,
      dietary_preference TEXT NOT NULL,
      target_calories INTEGER NOT NULL DEFAULT 2000,
      target_protein INTEGER NOT NULL DEFAULT 90,
      target_carbs INTEGER NOT NULL DEFAULT 240,
      target_fat INTEGER NOT NULL DEFAULT 60,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS MealPlanItems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_plan_id INTEGER NOT NULL,
      day_index INTEGER NOT NULL,
      day_name TEXT NOT NULL,
      meal_slot TEXT NOT NULL CHECK(meal_slot IN ('breakfast', 'lunch', 'dinner')),
      recipe_id INTEGER NOT NULL,
      meal_cost REAL NOT NULL,
      calories INTEGER NOT NULL,
      protein_g REAL NOT NULL,
      carbs_g REAL NOT NULL,
      fat_g REAL NOT NULL,
      FOREIGN KEY (meal_plan_id) REFERENCES MealPlans(id) ON DELETE CASCADE,
      FOREIGN KEY (recipe_id) REFERENCES Recipes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ShoppingLists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_plan_id INTEGER NOT NULL UNIQUE,
      total_cost REAL NOT NULL,
      remaining_budget REAL NOT NULL,
      currency TEXT NOT NULL CHECK(currency IN ('PKR', 'USD')) DEFAULT 'PKR',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (meal_plan_id) REFERENCES MealPlans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ShoppingListItems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shopping_list_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      total_required_g REAL NOT NULL,
      packages_to_buy INTEGER NOT NULL,
      package_size_g REAL NOT NULL,
      price_per_package REAL NOT NULL,
      total_ingredient_cost REAL NOT NULL,
      leftover_g REAL NOT NULL,
      is_checked INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (shopping_list_id) REFERENCES ShoppingLists(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES Ingredients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS MealNotificationSettings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 0,
      breakfast_enabled INTEGER NOT NULL DEFAULT 1,
      breakfast_time TEXT NOT NULL DEFAULT '08:00',
      lunch_enabled INTEGER NOT NULL DEFAULT 1,
      lunch_time TEXT NOT NULL DEFAULT '13:00',
      dinner_enabled INTEGER NOT NULL DEFAULT 1,
      dinner_time TEXT NOT NULL DEFAULT '19:00',
      lead_minutes INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );
  `);

  seedInitialData();
}

function seedInitialData(): void {
  const ingCount = (db.prepare('SELECT COUNT(*) as cnt FROM Ingredients').get() as { cnt: number }).cnt;
  if (ingCount === 0) {
    const insertIng = db.prepare(`
      INSERT INTO Ingredients (name, category, package_size_g, measurement_unit, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, allergen_tag, is_vegetarian, is_halal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    const insertPrice = db.prepare(`
      INSERT INTO GroceryPrices (ingredient_id, user_id, city, package_price, currency, price_status, updated_at)
      VALUES (?, NULL, 'Lahore', ?, 'PKR', ?, date('now'))
    `);

    for (const item of SEED_INGREDIENTS) {
      const res = insertIng.run(
        item.name,
        item.category,
        item.package_size_g,
        item.measurement_unit,
        item.calories_per_100g,
        item.protein_per_100g,
        item.carbs_per_100g,
        item.fat_per_100g,
        item.allergen_tag,
        item.is_vegetarian
      );
      insertPrice.run(Number(res.lastInsertRowid), item.pkr_price, item.price_status);
    }
  }

  const recCount = (db.prepare('SELECT COUNT(*) as cnt FROM Recipes').get() as { cnt: number }).cnt;
  if (recCount === 0) {
    const ingRows = db.prepare('SELECT id, name FROM Ingredients').all() as { id: number; name: string }[];
    const ingIdByName = new Map(ingRows.map((r) => [r.name, r.id]));

    const insertRec = db.prepare(`
      INSERT INTO Recipes (title, description, meal_slot, dietary_tag, prep_time_min, cook_time_min, servings, image_url, instructions_json, alternatives_json, is_ai_enhanced)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);
    const insertRecIng = db.prepare(`
      INSERT INTO RecipeIngredients (recipe_id, ingredient_id, quantity_g)
      VALUES (?, ?, ?)
    `);

    for (const r of SEED_RECIPES) {
      const res = insertRec.run(
        r.title,
        r.description,
        r.meal_slot,
        r.dietary_tag,
        r.prep_time_min,
        r.cook_time_min,
        r.servings,
        r.image_url,
        JSON.stringify(r.instructions),
        JSON.stringify(r.alternatives)
      );
      const recId = Number(res.lastInsertRowid);
      for (const ri of r.ingredients) {
        const ingId = ingIdByName.get(ri.name);
        if (ingId) {
          insertRecIng.run(recId, ingId, ri.quantity_g);
        }
      }
    }
  } else {
    const updateImg = db.prepare('UPDATE Recipes SET image_url = ? WHERE title = ?');
    for (const r of SEED_RECIPES) {
      updateImg.run(r.image_url, r.title);
    }
  }

  db.prepare("UPDATE MealPlans SET title = LTRIM(SUBSTR(title, 7)) WHERE title LIKE 'Lahore %'").run();

  // Seed a demo regular student user (with preferences + 1 sample saved meal plan) if no users exist
  const userCount = (db.prepare('SELECT COUNT(*) as cnt FROM Users').get() as { cnt: number }).cnt;
  if (userCount === 0) {
    const demoPassHash = hashPassword('StudentDemo#2026');
    const uRes = db
      .prepare("INSERT INTO Users (name, email, password_hash, role) VALUES (?, ?, ?, 'user')")
      .run('Ayesha Khan', 'student@nutribudget.pk', demoPassHash);
    const demoUserId = Number(uRes.lastInsertRowid);

    const prefs: UserPreferences = {
      weekly_budget: 7500,
      currency: 'PKR',
      city: 'Lahore',
      daily_calories: 1950,
      protein_g: 95,
      carbs_g: 230,
      fat_g: 55,
      dietary_preference: 'non-vegetarian',
      allergies: [],
      excluded_ingredients: [],
      max_cooking_time_min: 45,
    };

    db.prepare(`
      INSERT INTO UserPreferences (user_id, weekly_budget, currency, city, daily_calories, protein_g, carbs_g, fat_g, dietary_preference, allergies_json, excluded_ingredients_json, max_cooking_time_min)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      demoUserId,
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

    const ingredients = getIngredientsWithPrices(demoUserId, 'Lahore');
    const recipes = getAllRecipesWithIngredients(ingredients, 'PKR');
    const opt = optimizeWeeklyMealPlan(recipes, ingredients, prefs, {
      title: 'Balanced Student Week (PKR 7,500)',
    });
    if (opt.feasible && opt.plan) {
      saveMealPlanRecord(demoUserId, opt.plan);
    }
  }
}

export function getIngredientsWithPrices(_userId: number | null = null, city = 'Lahore'): IngredientWithPrice[] {
  const rows = db
    .prepare(
      `
    SELECT
      i.*,
      gp.id as price_id,
      COALESCE(gp.city, ?) as city,
      gp.package_price as package_price,
      COALESCE(gp.currency, 'PKR') as currency,
      COALESCE(gp.price_status, 'estimated') as price_status,
      gp.updated_at as updated_at
    FROM Ingredients i
    LEFT JOIN GroceryPrices gp
      ON gp.ingredient_id = i.id AND gp.user_id IS NULL
    ORDER BY i.category ASC, i.name ASC
  `
    )
    .all(city) as unknown as IngredientWithPrice[];

  return rows;
}

export function getAllRecipesWithIngredients(
  ingredientsWithPrices: IngredientWithPrice[],
  currency: Currency
): Recipe[] {
  const recRows = db.prepare('SELECT * FROM Recipes ORDER BY id ASC').all() as Array<{
    id: number;
    title: string;
    description: string;
    meal_slot: 'breakfast' | 'lunch' | 'dinner';
    dietary_tag: 'vegetarian' | 'non-vegetarian' | 'high-protein';
    prep_time_min: number;
    cook_time_min: number;
    servings: number;
    image_url: string;
    instructions_json: string;
    alternatives_json: string;
    is_ai_enhanced: number;
  }>;

  const riRows = db
    .prepare(
      `
    SELECT ri.recipe_id, ri.ingredient_id, ri.quantity_g, i.name as ingredient_name, i.category, i.allergen_tag, i.is_vegetarian
    FROM RecipeIngredients ri
    JOIN Ingredients i ON i.id = ri.ingredient_id
  `
    )
    .all() as Array<{
    recipe_id: number;
    ingredient_id: number;
    quantity_g: number;
    ingredient_name: string;
    category: string;
    allergen_tag: string | null;
    is_vegetarian: number;
  }>;

  const ingMap = new Map(ingredientsWithPrices.map((i) => [i.id, i]));
  const riByRecipe = new Map<number, typeof riRows>();
  for (const ri of riRows) {
    const arr = riByRecipe.get(ri.recipe_id) ?? [];
    arr.push(ri);
    riByRecipe.set(ri.recipe_id, arr);
  }

  return recRows.map((r) => {
    const ings = (riByRecipe.get(r.id) ?? []).map((x) => ({
      ingredient_id: x.ingredient_id,
      ingredient_name: x.ingredient_name,
      quantity_g: x.quantity_g,
      category: x.category,
      allergen_tag: x.allergen_tag,
      is_vegetarian: x.is_vegetarian,
    }));

    let calories = 0;
    let protein_g = 0;
    let carbs_g = 0;
    let fat_g = 0;
    let estimated_cost = 0;

    for (const item of ings) {
      const ing = ingMap.get(item.ingredient_id);
      if (!ing) continue;
      const f = item.quantity_g / 100;
      calories += ing.calories_per_100g * f;
      protein_g += ing.protein_per_100g * f;
      carbs_g += ing.carbs_per_100g * f;
      fat_g += ing.fat_per_100g * f;

      const pkgPrice = ing.package_price;
      estimated_cost += (pkgPrice / Math.max(1, ing.package_size_g)) * item.quantity_g;
    }

    return {
      id: r.id,
      title: r.title,
      description: r.description,
      meal_slot: r.meal_slot,
      dietary_tag: r.dietary_tag,
      prep_time_min: r.prep_time_min,
      cook_time_min: r.cook_time_min,
      servings: r.servings,
      image_url: r.image_url,
      instructions: JSON.parse(r.instructions_json || '[]'),
      alternatives: JSON.parse(r.alternatives_json || '[]'),
      is_ai_enhanced: r.is_ai_enhanced === 1,
      ingredients: ings,
      calories: Math.round(calories),
      protein_g: Math.round(protein_g * 100) / 100,
      carbs_g: Math.round(carbs_g * 100) / 100,
      fat_g: Math.round(fat_g * 100) / 100,
      estimated_cost: Math.round(estimated_cost * 100) / 100,
    };
  });
}

export function saveMealPlanRecord(
  userId: number,
  plan: NonNullable<ReturnType<typeof optimizeWeeklyMealPlan>['plan']>
): number {
  const planRes = db
    .prepare(
      `
    INSERT INTO MealPlans (
      user_id, title, city, currency, weekly_budget, total_cost, remaining_budget,
      avg_daily_calories, avg_daily_protein, avg_daily_carbs, avg_daily_fat,
      estimated_waste_g, dietary_preference, target_calories, target_protein, target_carbs, target_fat
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
    )
    .run(
      userId,
      plan.title,
      plan.city,
      plan.currency,
      plan.weekly_budget,
      plan.total_cost,
      plan.remaining_budget,
      plan.avg_daily_calories,
      plan.avg_daily_protein,
      plan.avg_daily_carbs,
      plan.avg_daily_fat,
      plan.estimated_waste_g,
      plan.dietary_preference,
      plan.target_calories,
      plan.target_protein,
      plan.target_carbs,
      plan.target_fat
    );
  const mealPlanId = Number(planRes.lastInsertRowid);

  const insertItem = db.prepare(`
    INSERT INTO MealPlanItems (meal_plan_id, day_index, day_name, meal_slot, recipe_id, meal_cost, calories, protein_g, carbs_g, fat_g)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const item of plan.items) {
    insertItem.run(
      mealPlanId,
      item.day_index,
      item.day_name,
      item.meal_slot,
      item.recipe_id,
      item.meal_cost,
      item.calories,
      item.protein_g,
      item.carbs_g,
      item.fat_g
    );
  }

  const slRes = db
    .prepare(
      `
    INSERT INTO ShoppingLists (meal_plan_id, total_cost, remaining_budget, currency)
    VALUES (?, ?, ?, ?)
  `
    )
    .run(mealPlanId, plan.total_cost, plan.remaining_budget, plan.currency);
  const shoppingListId = Number(slRes.lastInsertRowid);

  const insertSLItem = db.prepare(`
    INSERT INTO ShoppingListItems (
      shopping_list_id, ingredient_id, total_required_g, packages_to_buy,
      package_size_g, price_per_package, total_ingredient_cost, leftover_g, is_checked
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  for (const slItem of plan.shopping_list) {
    insertSLItem.run(
      shoppingListId,
      slItem.ingredient_id,
      slItem.total_required_g,
      slItem.packages_to_buy,
      slItem.package_size_g,
      slItem.price_per_package,
      slItem.total_ingredient_cost,
      slItem.leftover_g
    );
  }

  return mealPlanId;
}

export function updateMealPlanItemsAndShoppingList(
  mealPlanId: number,
  updated: {
    items: MealPlanItem[];
    total_cost: number;
    remaining_budget: number;
    avg_daily_calories: number;
    avg_daily_protein: number;
    avg_daily_carbs: number;
    avg_daily_fat: number;
    estimated_waste_g: number;
    shopping_list: ShoppingListItem[];
  }
): void {
  db.exec('BEGIN');
  try {
    db.prepare(
      `
      UPDATE MealPlans
      SET total_cost = ?,
          remaining_budget = ?,
          avg_daily_calories = ?,
          avg_daily_protein = ?,
          avg_daily_carbs = ?,
          avg_daily_fat = ?,
          estimated_waste_g = ?
      WHERE id = ?
    `
    ).run(
      updated.total_cost,
      updated.remaining_budget,
      updated.avg_daily_calories,
      updated.avg_daily_protein,
      updated.avg_daily_carbs,
      updated.avg_daily_fat,
      updated.estimated_waste_g,
      mealPlanId
    );

    db.prepare('DELETE FROM MealPlanItems WHERE meal_plan_id = ?').run(mealPlanId);
    const insertItem = db.prepare(`
      INSERT INTO MealPlanItems (meal_plan_id, day_index, day_name, meal_slot, recipe_id, meal_cost, calories, protein_g, carbs_g, fat_g)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of updated.items) {
      insertItem.run(
        mealPlanId,
        item.day_index,
        item.day_name,
        item.meal_slot,
        item.recipe_id,
        item.meal_cost,
        item.calories,
        item.protein_g,
        item.carbs_g,
        item.fat_g
      );
    }

    const slRow = db
      .prepare('SELECT id FROM ShoppingLists WHERE meal_plan_id = ?')
      .get(mealPlanId) as { id: number } | undefined;

    if (slRow) {
      const existingCheckedRows = db
        .prepare('SELECT ingredient_id, is_checked FROM ShoppingListItems WHERE shopping_list_id = ?')
        .all(slRow.id) as Array<{ ingredient_id: number; is_checked: number }>;
      const checkedByIng = new Map(existingCheckedRows.map((r) => [r.ingredient_id, r.is_checked]));

      db.prepare('UPDATE ShoppingLists SET total_cost = ?, remaining_budget = ? WHERE id = ?').run(
        updated.total_cost,
        updated.remaining_budget,
        slRow.id
      );

      db.prepare('DELETE FROM ShoppingListItems WHERE shopping_list_id = ?').run(slRow.id);
      const insertSLItem = db.prepare(`
        INSERT INTO ShoppingListItems (
          shopping_list_id, ingredient_id, total_required_g, packages_to_buy,
          package_size_g, price_per_package, total_ingredient_cost, leftover_g, is_checked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const slItem of updated.shopping_list) {
        insertSLItem.run(
          slRow.id,
          slItem.ingredient_id,
          slItem.total_required_g,
          slItem.packages_to_buy,
          slItem.package_size_g,
          slItem.price_per_package,
          slItem.total_ingredient_cost,
          slItem.leftover_g,
          checkedByIng.get(slItem.ingredient_id) ?? 0
        );
      }
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export const DEFAULT_NOTIFICATION_SETTINGS: MealNotificationSettings = {
  enabled: false,
  breakfast_enabled: true,
  breakfast_time: '08:00',
  lunch_enabled: true,
  lunch_time: '13:00',
  dinner_enabled: true,
  dinner_time: '19:00',
  lead_minutes: 0,
};

export function getUserNotificationSettings(userId: number): MealNotificationSettings {
  const row = db
    .prepare('SELECT * FROM MealNotificationSettings WHERE user_id = ?')
    .get(userId) as
    | {
        enabled: number;
        breakfast_enabled: number;
        breakfast_time: string;
        lunch_enabled: number;
        lunch_time: string;
        dinner_enabled: number;
        dinner_time: string;
        lead_minutes: number;
        updated_at: string;
      }
    | undefined;

  if (!row) {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }

  return {
    enabled: row.enabled === 1,
    breakfast_enabled: row.breakfast_enabled === 1,
    breakfast_time: row.breakfast_time,
    lunch_enabled: row.lunch_enabled === 1,
    lunch_time: row.lunch_time,
    dinner_enabled: row.dinner_enabled === 1,
    dinner_time: row.dinner_time,
    lead_minutes: row.lead_minutes,
    updated_at: row.updated_at,
  };
}

export function upsertUserNotificationSettings(
  userId: number,
  settings: MealNotificationSettings
): MealNotificationSettings {
  db.prepare(
    `
    INSERT INTO MealNotificationSettings (
      user_id, enabled, breakfast_enabled, breakfast_time,
      lunch_enabled, lunch_time, dinner_enabled, dinner_time,
      lead_minutes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      enabled = excluded.enabled,
      breakfast_enabled = excluded.breakfast_enabled,
      breakfast_time = excluded.breakfast_time,
      lunch_enabled = excluded.lunch_enabled,
      lunch_time = excluded.lunch_time,
      dinner_enabled = excluded.dinner_enabled,
      dinner_time = excluded.dinner_time,
      lead_minutes = excluded.lead_minutes,
      updated_at = datetime('now')
    `
  ).run(
    userId,
    settings.enabled ? 1 : 0,
    settings.breakfast_enabled ? 1 : 0,
    settings.breakfast_time,
    settings.lunch_enabled ? 1 : 0,
    settings.lunch_time,
    settings.dinner_enabled ? 1 : 0,
    settings.dinner_time,
    settings.lead_minutes
  );

  return getUserNotificationSettings(userId);
}


