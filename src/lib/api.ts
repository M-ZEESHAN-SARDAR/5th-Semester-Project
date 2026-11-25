import type {
  Currency,
  IngredientWithPrice,
  MealNotificationPayload,
  MealNotificationSettings,
  MealPlan,
  MealSlot,
  OptimizationDiagnostics,
  Recipe,
  User,
  UserPreferences,
} from '../shared/types';

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('X-Requested-With', 'NutriBudget');
  if (inMemoryToken) {
    headers.set('Authorization', `Bearer ${inMemoryToken}`);
  }

  const res = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`) as Error & {
      status?: number;
      diagnostics?: OptimizationDiagnostics;
      errors?: Array<{ field: string; message: string }>;
    };
    err.status = res.status;
    err.diagnostics = data.diagnostics;
    err.errors = data.errors;
    throw err;
  }
  return data as T;
}

export function formatMoney(amount: number, _currency: Currency = 'PKR'): string {
  const formatted = Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `PKR ${formatted}`;
}

export interface AuthResponse {
  user: User;
  token: string;
  preferences: UserPreferences;
}

export interface AdminStats {
  usersCount: number;
  ingredientsCount: number;
  verifiedPricesCount: number;
  recipesCount: number;
  plansCount: number;
  activeRemindersCount: number;
  avgBudget: number;
  avgCost: number;
  recentUsers: User[];
  dietBreakdown: Array<{ dietary_preference: string; count: number }>;
  topRecipes: Array<{ id: number; title: string; meal_slot: string; usage_count: number }>;
}

export interface AdminUserRow extends User {
  weekly_budget: number;
  dietary_preference: string;
  reminders_enabled: boolean;
  plans_count: number;
}

export interface AdminMealPlanRow {
  id: number;
  title: string;
  dietary_preference: string;
  weekly_budget: number;
  total_cost: number;
  avg_daily_calories: number;
  avg_daily_protein: number;
  estimated_waste_g: number;
  created_at: string;
  user_name: string;
  user_email: string;
}

export const api = {
  me: () => apiFetch<{ user: User; preferences: UserPreferences }>('/api/auth/me'),
  session: () =>
    apiFetch<{ authenticated: boolean; user: User | null; preferences: UserPreferences | null }>(
      '/api/auth/session'
    ),
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  demoStudent: () =>
    apiFetch<AuthResponse>('/api/auth/demo-student', {
      method: 'POST',
    }),
  logout: () => apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  adminClaimStatus: () =>
    apiFetch<{ adminExists: boolean; envPasscodeConfigured: boolean }>('/api/admin/claim-status'),
  adminClaim: (payload: { name: string; email: string; password: string; passcode?: string }) =>
    apiFetch<AuthResponse>('/api/admin/claim', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getPreferences: () => apiFetch<UserPreferences>('/api/preferences'),
  updatePreferences: (prefs: UserPreferences) =>
    apiFetch<UserPreferences>('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    }),
  getNotificationSettings: () =>
    apiFetch<MealNotificationSettings>('/api/notifications/settings'),
  updateNotificationSettings: (settings: Partial<MealNotificationSettings>) =>
    apiFetch<MealNotificationSettings>('/api/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
  checkMealNotification: (payload: {
    plan_id?: number;
    day_index?: number;
    current_time?: string;
    force_slot?: MealSlot;
  }) =>
    apiFetch<{ due: MealNotificationPayload | null }>('/api/notifications/check', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getIngredients: (city = 'Lahore') =>
    apiFetch<IngredientWithPrice[]>(`/api/ingredients?city=${encodeURIComponent(city)}`),
  getRecipes: (currency: Currency = 'PKR') =>
    apiFetch<Recipe[]>(`/api/recipes?currency=${currency}`),
  getRecipe: (id: number, currency: Currency = 'PKR') =>
    apiFetch<Recipe>(`/api/recipes/${id}?currency=${currency}`),
  enhanceRecipe: (id: number) =>
    apiFetch<{ recipe: Recipe; source: 'gemini' | 'fallback'; note?: string }>(
      `/api/recipes/${id}/enhance`,
      { method: 'POST' }
    ),
  validateSubstitution: (
    recipeId: number,
    payload: {
      original_ingredient_id: number;
      substitute_ingredient_id: number;
      remaining_budget: number;
    }
  ) =>
    apiFetch<{
      valid: boolean;
      warnings: string[];
      updatedNutrition: {
        calories: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
        estimated_cost: number;
      };
      costDelta: number;
    }>(`/api/recipes/${recipeId}/validate-substitution`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  generateMealPlan: (payload: UserPreferences & { title?: string; save?: boolean; seedOffset?: number }) =>
    apiFetch<{ feasible: boolean; plan?: MealPlan; diagnostics?: OptimizationDiagnostics }>(
      '/api/meal-plans/generate',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
  getMealPlans: () => apiFetch<MealPlan[]>('/api/meal-plans'),
  getMealPlan: (id: number) => apiFetch<MealPlan>(`/api/meal-plans/${id}`),
  regenerateMealPlan: (id: number, seedOffset?: number) =>
    apiFetch<{ feasible: boolean; plan: MealPlan }>(`/api/meal-plans/${id}/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ seedOffset }),
    }),
  replacePlanDish: (
    id: number,
    payload: { day_index: number; meal_slot: MealSlot; recipe_id: number }
  ) =>
    apiFetch<{ feasible: boolean; plan: MealPlan }>(`/api/meal-plans/${id}/items`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  replacePlanDay: (id: number, payload: { day_index: number; seedOffset?: number }) =>
    apiFetch<{ feasible: boolean; plan: MealPlan }>(`/api/meal-plans/${id}/replace-day`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteMealPlan: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/meal-plans/${id}`, { method: 'DELETE' }),
  toggleShoppingItem: (itemId: number, isChecked: boolean) =>
    apiFetch<{ id: number; is_checked: boolean }>(`/api/shopping-list-items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_checked: isChecked }),
    }),
  getAdminStats: () => apiFetch<AdminStats>('/api/admin/stats'),
  adminGetUsers: () => apiFetch<AdminUserRow[]>('/api/admin/users'),
  adminUpdateUserRole: (id: number, role: 'user' | 'admin') =>
    apiFetch<User>(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  adminDeleteUser: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/admin/users/${id}`, { method: 'DELETE' }),
  adminCreateIngredient: (payload: Record<string, unknown>) =>
    apiFetch<IngredientWithPrice>('/api/admin/ingredients', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminUpdateIngredient: (id: number, payload: Record<string, unknown>) =>
    apiFetch<IngredientWithPrice>(`/api/admin/ingredients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  adminDeleteIngredient: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/admin/ingredients/${id}`, { method: 'DELETE' }),
  adminCreateRecipe: (payload: Record<string, unknown>) =>
    apiFetch<Recipe>('/api/admin/recipes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminUpdateRecipe: (id: number, payload: Record<string, unknown>) =>
    apiFetch<Recipe>(`/api/admin/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  adminDeleteRecipe: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/admin/recipes/${id}`, { method: 'DELETE' }),
  adminGetMealPlans: () => apiFetch<AdminMealPlanRow[]>('/api/admin/meal-plans'),
  adminDeleteMealPlan: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/admin/meal-plans/${id}`, { method: 'DELETE' }),
};
