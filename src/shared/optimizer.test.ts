import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeShoppingList,
  evaluateRecipeNutritionAndCost,
  optimizeWeeklyMealPlan,
  replaceSingleDayInPlan,
  replaceSingleDishInPlan,
  revalidateSubstitution,
  validatePreferencesInput,
} from './optimizer';
import type { IngredientWithPrice, Recipe, UserPreferences } from './types';

function makeIngredient(overrides: Partial<IngredientWithPrice> & { id: number; name: string }): IngredientWithPrice {
  return {
    category: 'Grains',
    package_size_g: 1000,
    measurement_unit: 'g',
    calories_per_100g: 350,
    protein_per_100g: 8,
    carbs_per_100g: 75,
    fat_per_100g: 1,
    allergen_tag: null,
    is_vegetarian: 1,
    is_halal: 1,
    price_id: overrides.id,
    city: 'Lahore',
    package_price: 300,
    currency: 'PKR',
    price_status: 'verified',
    updated_at: '2026-11-01',
    ...overrides,
  };
}

const sampleIngredients: IngredientWithPrice[] = [
  makeIngredient({ id: 1, name: 'Basmati Rice', category: 'Grains', package_size_g: 1000, package_price: 340, calories_per_100g: 356, protein_per_100g: 7, carbs_per_100g: 79, fat_per_100g: 0.7 }),
  makeIngredient({ id: 2, name: 'Whole Wheat Atta', category: 'Grains', package_size_g: 2000, package_price: 320, calories_per_100g: 340, protein_per_100g: 12, carbs_per_100g: 72, fat_per_100g: 1.8, allergen_tag: 'gluten' }),
  makeIngredient({ id: 3, name: 'Whole Eggs', category: 'Protein', package_size_g: 660, package_price: 360, calories_per_100g: 143, protein_per_100g: 12.6, carbs_per_100g: 0.7, fat_per_100g: 9.5, allergen_tag: 'eggs' }),
  makeIngredient({ id: 4, name: 'Chicken Breast', category: 'Protein', package_size_g: 1000, package_price: 850, calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fat_per_100g: 3.6, is_vegetarian: 0 }),
  makeIngredient({ id: 5, name: 'Masoor Dal', category: 'Legumes', package_size_g: 1000, package_price: 310, calories_per_100g: 343, protein_per_100g: 24, carbs_per_100g: 60, fat_per_100g: 1.1 }),
  makeIngredient({ id: 6, name: 'Milk', category: 'Dairy', package_size_g: 1000, package_price: 220, calories_per_100g: 62, protein_per_100g: 3.3, carbs_per_100g: 4.8, fat_per_100g: 3.4, allergen_tag: 'dairy' }),
  makeIngredient({ id: 7, name: 'Rolled Oats', category: 'Grains', package_size_g: 500, package_price: 380, calories_per_100g: 379, protein_per_100g: 13.2, carbs_per_100g: 67, fat_per_100g: 6.5 }),
  makeIngredient({ id: 8, name: 'Tomatoes', category: 'Vegetables', package_size_g: 1000, package_price: 160, calories_per_100g: 18, protein_per_100g: 0.9, carbs_per_100g: 3.9, fat_per_100g: 0.2 }),
];

const sampleRecipes: Recipe[] = [
  {
    id: 1,
    title: 'Oats & Milk Bowl',
    description: 'Warm oats',
    meal_slot: 'breakfast',
    dietary_tag: 'vegetarian',
    prep_time_min: 5,
    cook_time_min: 10,
    servings: 1,
    image_url: '',
    instructions: ['Cook oats with milk.'],
    alternatives: [],
    is_ai_enhanced: false,
    ingredients: [
      { ingredient_id: 7, ingredient_name: 'Rolled Oats', quantity_g: 90 },
      { ingredient_id: 6, ingredient_name: 'Milk', quantity_g: 250 },
    ],
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    estimated_cost: 0,
  },
  {
    id: 2,
    title: 'Egg Roti Breakfast',
    description: 'Eggs with roti',
    meal_slot: 'breakfast',
    dietary_tag: 'high-protein',
    prep_time_min: 5,
    cook_time_min: 10,
    servings: 1,
    image_url: '',
    instructions: ['Cook eggs and roti.'],
    alternatives: [],
    is_ai_enhanced: false,
    ingredients: [
      { ingredient_id: 3, ingredient_name: 'Whole Eggs', quantity_g: 165 },
      { ingredient_id: 2, ingredient_name: 'Whole Wheat Atta', quantity_g: 100 },
    ],
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    estimated_cost: 0,
  },
  {
    id: 3,
    title: 'Masoor Dal & Rice',
    description: 'Classic dal chawal',
    meal_slot: 'lunch',
    dietary_tag: 'vegetarian',
    prep_time_min: 10,
    cook_time_min: 25,
    servings: 1,
    image_url: '',
    instructions: ['Simmer dal and serve with rice.'],
    alternatives: [],
    is_ai_enhanced: false,
    ingredients: [
      { ingredient_id: 5, ingredient_name: 'Masoor Dal', quantity_g: 110 },
      { ingredient_id: 1, ingredient_name: 'Basmati Rice', quantity_g: 130 },
      { ingredient_id: 8, ingredient_name: 'Tomatoes', quantity_g: 80 },
    ],
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    estimated_cost: 0,
  },
  {
    id: 4,
    title: 'Chicken Rice Bowl',
    description: 'Grilled chicken with rice',
    meal_slot: 'dinner',
    dietary_tag: 'high-protein',
    prep_time_min: 10,
    cook_time_min: 20,
    servings: 1,
    image_url: '',
    instructions: ['Grill chicken and steam rice.'],
    alternatives: [],
    is_ai_enhanced: false,
    ingredients: [
      { ingredient_id: 4, ingredient_name: 'Chicken Breast', quantity_g: 180 },
      { ingredient_id: 1, ingredient_name: 'Basmati Rice', quantity_g: 120 },
      { ingredient_id: 8, ingredient_name: 'Tomatoes', quantity_g: 100 },
    ],
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    estimated_cost: 0,
  },
  {
    id: 5,
    title: 'Lentil Roti Dinner',
    description: 'Veg lentil dinner',
    meal_slot: 'dinner',
    dietary_tag: 'vegetarian',
    prep_time_min: 10,
    cook_time_min: 25,
    servings: 1,
    image_url: '',
    instructions: ['Cook dal and whole wheat roti.'],
    alternatives: [],
    is_ai_enhanced: false,
    ingredients: [
      { ingredient_id: 5, ingredient_name: 'Masoor Dal', quantity_g: 120 },
      { ingredient_id: 2, ingredient_name: 'Whole Wheat Atta', quantity_g: 120 },
    ],
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    estimated_cost: 0,
  },
];

const basePrefs: UserPreferences = {
  weekly_budget: 6500,
  currency: 'PKR',
  city: 'Lahore',
  daily_calories: 1950,
  protein_g: 85,
  carbs_g: 240,
  fat_g: 50,
  dietary_preference: 'non-vegetarian',
  allergies: [],
  excluded_ingredients: [],
  max_cooking_time_min: 45,
};

test('validates invalid preferences', () => {
  const errors = validatePreferencesInput({ ...basePrefs, weekly_budget: 100, daily_calories: 400 });
  assert.ok(errors.length >= 2);
});

test('generates feasible 7-day meal plan within budget and matches shopping list totals', () => {
  const res = optimizeWeeklyMealPlan(sampleRecipes, sampleIngredients, basePrefs);
  assert.equal(res.feasible, true);
  assert.ok(res.plan);
  assert.equal(res.plan.items.length, 21);
  assert.ok(res.plan.total_cost <= basePrefs.weekly_budget);

  // Verify shopping list quantities exactly match sum of 21 meal ingredients
  const ingMap = new Map(sampleIngredients.map((i) => [i.id, i]));
  const selectedRecipes = res.plan.items.map((item) => sampleRecipes.find((r) => r.id === item.recipe_id)!);
  const recomputed = computeShoppingList(selectedRecipes, ingMap, 'PKR');
  assert.equal(res.plan.total_cost, recomputed.totalCost);
  for (const sItem of res.plan.shopping_list) {
    assert.ok(sItem.packages_to_buy * sItem.package_size_g >= sItem.total_required_g);
    assert.equal(
      Math.round((sItem.packages_to_buy * sItem.package_size_g - sItem.total_required_g) * 100) / 100,
      sItem.leftover_g
    );
  }
});

test('respects vegetarian preference and allergies strictly', () => {
  const vegPrefs: UserPreferences = {
    ...basePrefs,
    dietary_preference: 'vegetarian',
    allergies: ['dairy'],
  };
  const res = optimizeWeeklyMealPlan(sampleRecipes, sampleIngredients, vegPrefs);
  assert.equal(res.feasible, true);
  assert.ok(res.plan);
  for (const item of res.plan.items) {
    assert.notEqual(item.recipe_id, 4, 'Chicken recipe must not be selected for vegetarian');
    assert.notEqual(item.recipe_id, 1, 'Dairy milk recipe must not be selected with dairy allergy');
  }
});

test('rejects impossible budget and explains shortfall without exceeding budget', () => {
  const impossiblePrefs: UserPreferences = {
    ...basePrefs,
    weekly_budget: 700,
  };
  const res = optimizeWeeklyMealPlan(sampleRecipes, sampleIngredients, impossiblePrefs);
  assert.equal(res.feasible, false);
  assert.ok(res.diagnostics);
  assert.ok(res.diagnostics.min_feasible_cost !== null && res.diagnostics.min_feasible_cost > 700);
  assert.ok(res.diagnostics.unmet_constraints.length > 0);
  assert.ok(res.diagnostics.suggestions.length > 0);
});

test('price increase changes total cost and triggers budget boundary', () => {
  const inflated = sampleIngredients.map((i) =>
    i.id === 4 ? { ...i, package_price: 2500 } : i
  );
  const resCheap = optimizeWeeklyMealPlan(sampleRecipes, sampleIngredients, basePrefs);
  const resExpensive = optimizeWeeklyMealPlan(sampleRecipes, inflated, {
    ...basePrefs,
    dietary_preference: 'high-protein',
    protein_g: 110,
  });
  assert.ok(resCheap.plan && resExpensive.plan);
  assert.notEqual(resCheap.plan.total_cost, resExpensive.plan.total_cost);
});

test('revalidates ingredient substitution against allergies and budget', () => {
  const ingMap = new Map(sampleIngredients.map((i) => [i.id, i]));
  const calc = evaluateRecipeNutritionAndCost(sampleRecipes[2].ingredients, ingMap, 'PKR');
  const recipeWithCalc = { ...sampleRecipes[2], ...calc };

  const chicken = sampleIngredients.find((i) => i.id === 4)!;
  const check = revalidateSubstitution(
    recipeWithCalc,
    5,
    chicken,
    { ...basePrefs, dietary_preference: 'vegetarian' },
    ingMap,
    200
  );
  assert.equal(check.valid, false);
  assert.ok(check.warnings.some((w) => w.includes('Vegetarian')));
});

test('replaces a single dish within budget and recalculates shopping list', () => {
  const gen = optimizeWeeklyMealPlan(sampleRecipes, sampleIngredients, basePrefs);
  assert.ok(gen.feasible && gen.plan);

  const day0Breakfast = gen.plan.items.find((i) => i.day_index === 0 && i.meal_slot === 'breakfast')!;
  const altBreakfastId = day0Breakfast.recipe_id === 1 ? 2 : 1;

  const swapped = replaceSingleDishInPlan(
    gen.plan.items,
    0,
    'breakfast',
    altBreakfastId,
    sampleRecipes,
    sampleIngredients,
    basePrefs
  );
  assert.equal(swapped.feasible, true);
  assert.ok(swapped.items && swapped.shopping_list);
  assert.equal(
    swapped.items.find((i) => i.day_index === 0 && i.meal_slot === 'breakfast')!.recipe_id,
    altBreakfastId
  );
  assert.ok((swapped.total_cost ?? 0) <= basePrefs.weekly_budget);

  // Rejects dish violating vegetarian constraint
  const vegViolation = replaceSingleDishInPlan(
    gen.plan.items,
    0,
    'dinner',
    4,
    sampleRecipes,
    sampleIngredients,
    { ...basePrefs, dietary_preference: 'vegetarian' }
  );
  assert.equal(vegViolation.feasible, false);
  assert.ok(vegViolation.error);
});

test('replaces a single day plan while keeping other 6 days unchanged', () => {
  const gen = optimizeWeeklyMealPlan(sampleRecipes, sampleIngredients, basePrefs);
  assert.ok(gen.feasible && gen.plan);

  const day2Before = gen.plan.items
    .filter((i) => i.day_index === 2)
    .map((i) => i.recipe_id);
  const otherDaysBefore = gen.plan.items
    .filter((i) => i.day_index !== 2)
    .map((i) => `${i.day_index}-${i.meal_slot}-${i.recipe_id}`);

  const replaced = replaceSingleDayInPlan(
    gen.plan.items,
    2,
    sampleRecipes,
    sampleIngredients,
    basePrefs,
    1
  );
  assert.equal(replaced.feasible, true);
  assert.ok(replaced.items && replaced.shopping_list);

  const day2After = replaced.items
    .filter((i) => i.day_index === 2)
    .map((i) => i.recipe_id);
  const otherDaysAfter = replaced.items
    .filter((i) => i.day_index !== 2)
    .map((i) => `${i.day_index}-${i.meal_slot}-${i.recipe_id}`);

  assert.notDeepEqual(day2After, day2Before);
  assert.deepEqual(otherDaysAfter, otherDaysBefore);
  assert.ok((replaced.total_cost ?? 0) <= basePrefs.weekly_budget);
});

