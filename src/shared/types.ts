export type Currency = 'PKR';
export type UserRole = 'user' | 'admin';
export type DietaryPreference = 'vegetarian' | 'non-vegetarian' | 'high-protein';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner';
export type PriceStatus = 'estimated' | 'verified';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface UserPreferences {
  id?: number;
  user_id?: number;
  weekly_budget: number;
  currency: Currency;
  city: string;
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  dietary_preference: DietaryPreference;
  allergies: string[];
  excluded_ingredients: string[];
  max_cooking_time_min: number;
  updated_at?: string;
}

export interface Ingredient {
  id: number;
  name: string;
  category: string;
  package_size_g: number;
  measurement_unit: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  allergen_tag: string | null;
  is_vegetarian: number;
  is_halal: number;
}

export interface IngredientWithPrice extends Ingredient {
  price_id: number;
  city: string;
  package_price: number;
  currency: Currency;
  price_status: PriceStatus;
  updated_at: string;
  is_user_override?: boolean;
}

export interface RecipeIngredientItem {
  ingredient_id: number;
  ingredient_name: string;
  quantity_g: number;
  category?: string;
  allergen_tag?: string | null;
  is_vegetarian?: number;
}

export interface RecipeAlternative {
  original_ingredient: string;
  substitute_ingredient: string;
  reason: string;
  nutrition_note?: string;
}

export interface Recipe {
  id: number;
  title: string;
  description: string;
  meal_slot: MealSlot;
  dietary_tag: DietaryPreference;
  prep_time_min: number;
  cook_time_min: number;
  servings: number;
  image_url: string;
  instructions: string[];
  alternatives: RecipeAlternative[];
  is_ai_enhanced: boolean;
  ingredients: RecipeIngredientItem[];
  // Calculated deterministically from Ingredient + GroceryPrices DB:
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  estimated_cost: number;
}

export interface MealPlanItem {
  id?: number;
  meal_plan_id?: number;
  day_index: number;
  day_name: string;
  meal_slot: MealSlot;
  recipe_id: number;
  recipe_title?: string;
  image_url?: string;
  prep_time_min?: number;
  cook_time_min?: number;
  meal_cost: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface ShoppingListItem {
  id?: number;
  shopping_list_id?: number;
  ingredient_id: number;
  ingredient_name: string;
  category: string;
  measurement_unit: string;
  total_required_g: number;
  packages_to_buy: number;
  package_size_g: number;
  price_per_package: number;
  total_ingredient_cost: number;
  leftover_g: number;
  is_checked: boolean;
}

export interface MealPlan {
  id: number;
  user_id: number;
  title: string;
  city: string;
  currency: Currency;
  weekly_budget: number;
  total_cost: number;
  remaining_budget: number;
  avg_daily_calories: number;
  avg_daily_protein: number;
  avg_daily_carbs: number;
  avg_daily_fat: number;
  estimated_waste_g: number;
  dietary_preference: DietaryPreference;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  created_at: string;
  items: MealPlanItem[];
  shopping_list: ShoppingListItem[];
}

export interface OptimizationDiagnostics {
  unmet_constraints: string[];
  min_feasible_cost: number | null;
  budget_shortfall: number | null;
  achievable_daily_calories: { min: number; max: number } | null;
  achievable_daily_protein: { min: number; max: number } | null;
  suggestions: string[];
}

export interface OptimizationResult {
  feasible: boolean;
  plan?: Omit<MealPlan, 'id' | 'user_id' | 'created_at'>;
  diagnostics?: OptimizationDiagnostics;
}

export interface MealNotificationSettings {
  enabled: boolean;
  breakfast_enabled: boolean;
  breakfast_time: string;
  lunch_enabled: boolean;
  lunch_time: string;
  dinner_enabled: boolean;
  dinner_time: string;
  lead_minutes: number;
  updated_at?: string;
}

export interface MealNotificationPayload {
  id: string;
  meal_slot: MealSlot;
  day_index: number;
  day_name: string;
  scheduled_time: string;
  recipe_id: number | null;
  recipe_title: string;
  calories?: number;
  protein_g?: number;
  title: string;
  message: string;
  is_test?: boolean;
}

