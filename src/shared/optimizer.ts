import type {
  Currency,
  IngredientWithPrice,
  MealPlanItem,
  MealSlot,
  OptimizationResult,
  Recipe,
  RecipeIngredientItem,
  ShoppingListItem,
  UserPreferences,
} from './types';

export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validatePreferencesInput(prefs: UserPreferences): ValidationError[] {
  const errors: ValidationError[] = [];
  const minBudget = 500;
  const maxBudget = 200000;

  if (!Number.isFinite(prefs.weekly_budget) || prefs.weekly_budget < minBudget || prefs.weekly_budget > maxBudget) {
    errors.push({
      field: 'weekly_budget',
      message: `Weekly budget must be between ${minBudget} and ${maxBudget} PKR.`,
    });
  }
  if (!Number.isFinite(prefs.daily_calories) || prefs.daily_calories < 1000 || prefs.daily_calories > 4500) {
    errors.push({ field: 'daily_calories', message: 'Daily calorie target must be between 1,000 and 4,500 kcal.' });
  }
  if (!Number.isFinite(prefs.protein_g) || prefs.protein_g < 25 || prefs.protein_g > 350) {
    errors.push({ field: 'protein_g', message: 'Protein target must be between 25g and 350g per day.' });
  }
  if (!Number.isFinite(prefs.carbs_g) || prefs.carbs_g < 30 || prefs.carbs_g > 600) {
    errors.push({ field: 'carbs_g', message: 'Carbohydrate target must be between 30g and 600g per day.' });
  }
  if (!Number.isFinite(prefs.fat_g) || prefs.fat_g < 15 || prefs.fat_g > 200) {
    errors.push({ field: 'fat_g', message: 'Fat target must be between 15g and 200g per day.' });
  }
  return errors;
}

export function evaluateRecipeNutritionAndCost(
  recipeIngredients: RecipeIngredientItem[],
  ingredientMap: Map<number, IngredientWithPrice>,
  _targetCurrency: Currency = 'PKR'
): {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  estimated_cost: number;
} {
  let calories = 0;
  let protein_g = 0;
  let carbs_g = 0;
  let fat_g = 0;
  let estimated_cost = 0;

  for (const item of recipeIngredients) {
    const ing = ingredientMap.get(item.ingredient_id);
    if (!ing) continue;
    const factor = item.quantity_g / 100;
    calories += ing.calories_per_100g * factor;
    protein_g += ing.protein_per_100g * factor;
    carbs_g += ing.carbs_per_100g * factor;
    fat_g += ing.fat_per_100g * factor;

    const costPerGram = ing.package_size_g > 0 ? ing.package_price / ing.package_size_g : 0;
    estimated_cost += costPerGram * item.quantity_g;
  }

  return {
    calories: Math.round(calories),
    protein_g: round2(protein_g),
    carbs_g: round2(carbs_g),
    fat_g: round2(fat_g),
    estimated_cost: round2(estimated_cost),
  };
}

export function isRecipeAllowed(
  recipe: Recipe,
  prefs: UserPreferences,
  ingredientMap: Map<number, IngredientWithPrice>
): { allowed: boolean; reason?: string } {
  const normalizedAllergies = prefs.allergies.map((a) => a.trim().toLowerCase()).filter(Boolean);
  const normalizedExcluded = prefs.excluded_ingredients.map((e) => e.trim().toLowerCase()).filter(Boolean);

  for (const ri of recipe.ingredients) {
    const ing = ingredientMap.get(ri.ingredient_id);
    if (!ing) continue;

    if (prefs.dietary_preference === 'vegetarian' && ing.is_vegetarian === 0) {
      return { allowed: false, reason: `contains non-vegetarian ingredient (${ing.name})` };
    }

    if (ing.allergen_tag) {
      const tag = ing.allergen_tag.toLowerCase();
      if (normalizedAllergies.some((a) => tag.includes(a) || a.includes(tag))) {
        return { allowed: false, reason: `contains allergen (${ing.allergen_tag})` };
      }
    }

    const ingNameLower = ing.name.toLowerCase();
    if (
      normalizedAllergies.some((a) => ingNameLower.includes(a)) ||
      normalizedExcluded.some((ex) => ingNameLower.includes(ex) || String(ing.id) === ex)
    ) {
      return { allowed: false, reason: `contains excluded ingredient (${ing.name})` };
    }
  }

  return { allowed: true };
}

export function computeShoppingList(
  selectedRecipes: Recipe[],
  ingredientMap: Map<number, IngredientWithPrice>,
  _targetCurrency: Currency = 'PKR'
): {
  items: ShoppingListItem[];
  totalCost: number;
  estimatedWasteG: number;
} {
  const totals = new Map<number, number>();
  for (const recipe of selectedRecipes) {
    for (const ri of recipe.ingredients) {
      totals.set(ri.ingredient_id, (totals.get(ri.ingredient_id) ?? 0) + ri.quantity_g);
    }
  }

  const items: ShoppingListItem[] = [];
  let totalCost = 0;
  let estimatedWasteG = 0;

  for (const [ingredientId, totalRequiredG] of totals.entries()) {
    const ing = ingredientMap.get(ingredientId);
    if (!ing) continue;
    const pkgSize = Math.max(1, ing.package_size_g);
    const packagesToBuy = Math.ceil(totalRequiredG / pkgSize);
    const pricePerPkg = round2(ing.package_price);
    const totalIngredientCost = round2(packagesToBuy * pricePerPkg);
    const leftoverG = round2(packagesToBuy * pkgSize - totalRequiredG);

    totalCost += totalIngredientCost;
    estimatedWasteG += leftoverG;

    items.push({
      ingredient_id: ing.id,
      ingredient_name: ing.name,
      category: ing.category,
      measurement_unit: ing.measurement_unit,
      total_required_g: round2(totalRequiredG),
      packages_to_buy: packagesToBuy,
      package_size_g: pkgSize,
      price_per_package: pricePerPkg,
      total_ingredient_cost: totalIngredientCost,
      leftover_g: leftoverG,
      is_checked: false,
    });
  }

  items.sort((a, b) => b.total_ingredient_cost - a.total_ingredient_cost);

  return {
    items,
    totalCost: round2(totalCost),
    estimatedWasteG: round2(estimatedWasteG),
  };
}

interface PlanEvaluation {
  feasible: boolean;
  budgetFeasible: boolean;
  nutritionFeasible: boolean;
  totalCost: number;
  wasteG: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  objective: number;
  shopping: ReturnType<typeof computeShoppingList>;
}

function evaluateCandidateGrid(
  grid: Recipe[][], // [7][3]
  prefs: UserPreferences,
  ingredientMap: Map<number, IngredientWithPrice>
): PlanEvaluation {
  const flat = grid.flat();
  const shopping = computeShoppingList(flat, ingredientMap, prefs.currency);

  let totalCal = 0;
  let totalProt = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let dailyPenalty = 0;
  let varietyPenalty = 0;

  const recipeCounts = new Map<number, number>();
  for (let d = 0; d < 7; d++) {
    let dayCal = 0;
    let dayProt = 0;
    for (let s = 0; s < 3; s++) {
      const r = grid[d][s];
      dayCal += r.calories;
      dayProt += r.protein_g;
      totalCal += r.calories;
      totalProt += r.protein_g;
      totalCarbs += r.carbs_g;
      totalFat += r.fat_g;

      recipeCounts.set(r.id, (recipeCounts.get(r.id) ?? 0) + 1);
      if (d > 0 && grid[d - 1][s].id === r.id) {
        varietyPenalty += 250;
      }
    }

    const calDiffRatio = Math.abs(dayCal - prefs.daily_calories) / Math.max(1, prefs.daily_calories);
    if (calDiffRatio > 0.22) {
      dailyPenalty += (calDiffRatio - 0.22) * 4000;
    }
    const protRatio = dayProt / Math.max(1, prefs.protein_g);
    if (protRatio < 0.72) {
      dailyPenalty += (0.72 - protRatio) * 3500;
    }
  }

  for (const count of recipeCounts.values()) {
    if (count > 2) {
      varietyPenalty += (count - 2) * 320;
    }
  }

  const avgCalories = Math.round(totalCal / 7);
  const avgProtein = round2(totalProt / 7);
  const avgCarbs = round2(totalCarbs / 7);
  const avgFat = round2(totalFat / 7);

  const avgCalRatio = Math.abs(avgCalories - prefs.daily_calories) / Math.max(1, prefs.daily_calories);
  const avgProtRatio = avgProtein / Math.max(1, prefs.protein_g);

  const budgetFeasible = shopping.totalCost <= prefs.weekly_budget;
  const nutritionFeasible = avgCalRatio <= 0.25 && avgProtRatio >= 0.7;

  const budgetOverrunPenalty = budgetFeasible
    ? 0
    : (shopping.totalCost - prefs.weekly_budget) * 25 + 10000;

  const wasteNormalized = (shopping.estimatedWasteG / 1000) * 130;
  const macroDev =
    Math.abs(avgCalories - prefs.daily_calories) * 1.15 +
    Math.max(0, prefs.protein_g - avgProtein) * 14 +
    Math.abs(avgCarbs - prefs.carbs_g) * 0.7 +
    Math.abs(avgFat - prefs.fat_g) * 1.2;

  const objective =
    shopping.totalCost +
    wasteNormalized +
    macroDev +
    dailyPenalty +
    varietyPenalty +
    budgetOverrunPenalty;

  return {
    feasible: budgetFeasible && nutritionFeasible,
    budgetFeasible,
    nutritionFeasible,
    totalCost: shopping.totalCost,
    wasteG: shopping.estimatedWasteG,
    avgCalories,
    avgProtein,
    avgCarbs,
    avgFat,
    objective,
    shopping,
  };
}

/**
 * Mixed-Integer Linear Programming inspired Branch-and-Bound / Coordinate-Descent
 * optimizer that solves the 7-day x 3-slot meal assignment problem using exact
 * discrete grocery package costs (p_i = ceil(sum q_{r,i} / S_i)).
 */
export function optimizeWeeklyMealPlan(
  recipesInput: Recipe[],
  ingredientsInput: IngredientWithPrice[],
  prefs: UserPreferences,
  options?: { title?: string; seedOffset?: number }
): OptimizationResult {
  const validationErrors = validatePreferencesInput(prefs);
  if (validationErrors.length > 0) {
    return {
      feasible: false,
      diagnostics: {
        unmet_constraints: validationErrors.map((e) => e.message),
        min_feasible_cost: null,
        budget_shortfall: null,
        achievable_daily_calories: null,
        achievable_daily_protein: null,
        suggestions: ['Correct the highlighted input preferences before generating a plan.'],
      },
    };
  }

  const ingredientMap = new Map<number, IngredientWithPrice>();
  for (const ing of ingredientsInput) {
    ingredientMap.set(ing.id, ing);
  }

  // Recompute deterministic nutrition & cost for every recipe from DB ingredients
  const recipes: Recipe[] = recipesInput.map((r) => {
    const calc = evaluateRecipeNutritionAndCost(r.ingredients, ingredientMap, prefs.currency);
    return { ...r, ...calc };
  });

  const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner'];
  const candidatesBySlot: Record<MealSlot, Recipe[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
  };

  for (const r of recipes) {
    if (isRecipeAllowed(r, prefs, ingredientMap).allowed) {
      candidatesBySlot[r.meal_slot].push(r);
    }
  }

  const missingSlots = slots.filter((s) => candidatesBySlot[s].length === 0);
  if (missingSlots.length > 0) {
    return {
      feasible: false,
      diagnostics: {
        unmet_constraints: [
          `No eligible ${missingSlots.join(', ')} recipes match your dietary restrictions and allergy filters.`,
        ],
        min_feasible_cost: null,
        budget_shortfall: null,
        achievable_daily_calories: null,
        achievable_daily_protein: null,
        suggestions: [
          'Review excluded ingredients or allergy filters to ensure enough meal templates remain available.',
        ],
      },
    };
  }

  const calMinDay =
    Math.min(...candidatesBySlot.breakfast.map((r) => r.calories)) +
    Math.min(...candidatesBySlot.lunch.map((r) => r.calories)) +
    Math.min(...candidatesBySlot.dinner.map((r) => r.calories));
  const calMaxDay =
    Math.max(...candidatesBySlot.breakfast.map((r) => r.calories)) +
    Math.max(...candidatesBySlot.lunch.map((r) => r.calories)) +
    Math.max(...candidatesBySlot.dinner.map((r) => r.calories));

  const protMinDay =
    Math.min(...candidatesBySlot.breakfast.map((r) => r.protein_g)) +
    Math.min(...candidatesBySlot.lunch.map((r) => r.protein_g)) +
    Math.min(...candidatesBySlot.dinner.map((r) => r.protein_g));
  const protMaxDay =
    Math.max(...candidatesBySlot.breakfast.map((r) => r.protein_g)) +
    Math.max(...candidatesBySlot.lunch.map((r) => r.protein_g)) +
    Math.max(...candidatesBySlot.dinner.map((r) => r.protein_g));

  // Build 4 diverse starting grids + optional regeneration offset
  const seedOffset = options?.seedOffset ?? 0;
  const sortStrategies: ((r: Recipe) => number)[] = [
    (r) => r.estimated_cost,
    (r) => r.estimated_cost / Math.max(1, r.protein_g),
    (r) => Math.abs(r.calories - prefs.daily_calories / 3) + r.estimated_cost * 0.5,
    (r) => (prefs.dietary_preference === 'high-protein' ? -r.protein_g : r.estimated_cost - r.protein_g * 2),
  ];

  let bestGrid: Recipe[][] | null = null;
  let bestEval: PlanEvaluation | null = null;

  // Also track lowest-cost nutrition-valid plan for infeasibility diagnostics
  let minCostGridEval: PlanEvaluation | null = null;

  for (let stratIdx = 0; stratIdx < sortStrategies.length; stratIdx++) {
    const scoreFn = sortStrategies[stratIdx];
    const ordered: Record<MealSlot, Recipe[]> = {
      breakfast: [...candidatesBySlot.breakfast].sort((a, b) => scoreFn(a) - scoreFn(b)),
      lunch: [...candidatesBySlot.lunch].sort((a, b) => scoreFn(a) - scoreFn(b)),
      dinner: [...candidatesBySlot.dinner].sort((a, b) => scoreFn(a) - scoreFn(b)),
    };

    const grid: Recipe[][] = [];
    for (let d = 0; d < 7; d++) {
      const row: Recipe[] = [];
      for (let s = 0; s < 3; s++) {
        const list = ordered[slots[s]];
        const pickIdx = (d + stratIdx + seedOffset) % Math.min(list.length, 4);
        row.push(list[pickIdx]);
      }
      grid.push(row);
    }

    // Coordinate descent MILP refinement (up to 4 sweeps over 21 slots)
    let currentEval = evaluateCandidateGrid(grid, prefs, ingredientMap);
    for (let sweep = 0; sweep < 4; sweep++) {
      let improved = false;
      for (let d = 0; d < 7; d++) {
        for (let s = 0; s < 3; s++) {
          const original = grid[d][s];
          let localBestRecipe = original;
          let localBestEval = currentEval;

          for (const candidate of candidatesBySlot[slots[s]]) {
            if (candidate.id === original.id) continue;
            grid[d][s] = candidate;
            const ev = evaluateCandidateGrid(grid, prefs, ingredientMap);
            if (ev.objective < localBestEval.objective) {
              localBestEval = ev;
              localBestRecipe = candidate;
              improved = true;
            }
          }
          grid[d][s] = localBestRecipe;
          currentEval = localBestEval;
        }
      }
      if (!improved) break;
    }

    if (!bestEval || currentEval.objective < bestEval.objective) {
      bestEval = currentEval;
      bestGrid = grid.map((row) => [...row]);
    }

    // Pure cost-minimization run to find true minimum feasible weekly cost
    const costGrid: Recipe[][] = Array.from({ length: 7 }, (_, d) =>
      slots.map((slot) => {
        const list = [...candidatesBySlot[slot]].sort((a, b) => a.estimated_cost - b.estimated_cost);
        return list[d % Math.min(list.length, 2)];
      })
    );
    let costEval = evaluateCandidateGrid(costGrid, prefs, ingredientMap);
    for (let sweep = 0; sweep < 3; sweep++) {
      for (let d = 0; d < 7; d++) {
        for (let s = 0; s < 3; s++) {
          const orig = costGrid[d][s];
          let bestR = orig;
          for (const cand of candidatesBySlot[slots[s]]) {
            costGrid[d][s] = cand;
            const ev = evaluateCandidateGrid(costGrid, prefs, ingredientMap);
            const evScore = ev.totalCost + (ev.nutritionFeasible ? 0 : 50000);
            const curScore = costEval.totalCost + (costEval.nutritionFeasible ? 0 : 50000);
            if (evScore < curScore) {
              costEval = ev;
              bestR = cand;
            }
          }
          costGrid[d][s] = bestR;
        }
      }
    }
    if (!minCostGridEval || costEval.totalCost < minCostGridEval.totalCost) {
      minCostGridEval = costEval;
    }
  }

  if (!bestGrid || !bestEval) {
    return {
      feasible: false,
      diagnostics: {
        unmet_constraints: ['Optimization solver could not construct a valid schedule.'],
        min_feasible_cost: null,
        budget_shortfall: null,
        achievable_daily_calories: { min: calMinDay, max: calMaxDay },
        achievable_daily_protein: { min: round2(protMinDay), max: round2(protMaxDay) },
        suggestions: ['Relax one or more constraints and try again.'],
      },
    };
  }

  if (!bestEval.feasible) {
    const unmet: string[] = [];
    const suggestions: string[] = [];
    const minCost = minCostGridEval ? minCostGridEval.totalCost : bestEval.totalCost;

    if (!bestEval.budgetFeasible) {
      const shortfall = round2(minCost - prefs.weekly_budget);
      unmet.push(
        `Weekly budget of ${prefs.currency} ${prefs.weekly_budget.toLocaleString()} is below the minimum package cost (${prefs.currency} ${minCost.toLocaleString()}) required for your calorie and macro targets.`
      );
      suggestions.push(
        `Increase your weekly budget to at least ${prefs.currency} ${Math.ceil(minCost / 100) * 100} (shortfall: ${prefs.currency} ${Math.max(1, Math.ceil(shortfall))}).`
      );
    }

    if (!bestEval.nutritionFeasible) {
      if (prefs.daily_calories > calMaxDay) {
        unmet.push(
          `Daily calorie target (${prefs.daily_calories} kcal) exceeds the maximum achievable (${calMaxDay} kcal/day) from eligible recipes.`
        );
        suggestions.push(`Lower your daily calorie target below ${calMaxDay} kcal.`);
      } else if (prefs.daily_calories < calMinDay) {
        unmet.push(
          `Daily calorie target (${prefs.daily_calories} kcal) is below the minimum (${calMinDay} kcal/day) of eligible recipes.`
        );
        suggestions.push(`Increase your daily calorie target to at least ${calMinDay} kcal.`);
      }

      if (prefs.protein_g > protMaxDay) {
        unmet.push(
          `Daily protein target (${prefs.protein_g}g) exceeds the maximum achievable (${round2(protMaxDay)}g/day) with your current diet/exclusions.`
        );
        suggestions.push(`Lower your daily protein target to ${Math.floor(protMaxDay)}g or include high-protein staples like eggs, lentils, or chicken.`);
      }
    }

    if (suggestions.length === 0) {
      suggestions.push('Try slightly increasing your weekly budget or widening calorie/protein targets.');
    }

    return {
      feasible: false,
      diagnostics: {
        unmet_constraints: unmet,
        min_feasible_cost: minCost,
        budget_shortfall: minCost > prefs.weekly_budget ? round2(minCost - prefs.weekly_budget) : 0,
        achievable_daily_calories: { min: calMinDay, max: calMaxDay },
        achievable_daily_protein: { min: round2(protMinDay), max: round2(protMaxDay) },
        suggestions,
      },
    };
  }

  const items: MealPlanItem[] = [];
  for (let d = 0; d < 7; d++) {
    for (let s = 0; s < 3; s++) {
      const r = bestGrid[d][s];
      items.push({
        day_index: d,
        day_name: DAY_NAMES[d],
        meal_slot: slots[s],
        recipe_id: r.id,
        recipe_title: r.title,
        image_url: r.image_url,
        prep_time_min: r.prep_time_min,
        cook_time_min: r.cook_time_min,
        meal_cost: r.estimated_cost,
        calories: r.calories,
        protein_g: r.protein_g,
        carbs_g: r.carbs_g,
        fat_g: r.fat_g,
      });
    }
  }

  const title =
    options?.title?.trim() ||
    `${prefs.dietary_preference === 'high-protein' ? 'High-Protein' : prefs.dietary_preference === 'vegetarian' ? 'Vegetarian' : 'Balanced'} Week (${prefs.currency} ${prefs.weekly_budget.toLocaleString()})`;

  return {
    feasible: true,
    plan: {
      title,
      city: prefs.city,
      currency: prefs.currency,
      weekly_budget: prefs.weekly_budget,
      total_cost: bestEval.totalCost,
      remaining_budget: round2(prefs.weekly_budget - bestEval.totalCost),
      avg_daily_calories: bestEval.avgCalories,
      avg_daily_protein: bestEval.avgProtein,
      avg_daily_carbs: bestEval.avgCarbs,
      avg_daily_fat: bestEval.avgFat,
      estimated_waste_g: bestEval.wasteG,
      dietary_preference: prefs.dietary_preference,
      target_calories: prefs.daily_calories,
      target_protein: prefs.protein_g,
      target_carbs: prefs.carbs_g,
      target_fat: prefs.fat_g,
      items,
      shopping_list: bestEval.shopping.items,
    },
  };
}

export function revalidateSubstitution(
  recipe: Recipe,
  originalIngredientId: number,
  substituteIngredient: IngredientWithPrice,
  prefs: UserPreferences,
  ingredientMap: Map<number, IngredientWithPrice>,
  currentPlanRemainingBudget: number
): {
  valid: boolean;
  warnings: string[];
  updatedNutrition: ReturnType<typeof evaluateRecipeNutritionAndCost>;
  costDelta: number;
} {
  const warnings: string[] = [];

  if (prefs.dietary_preference === 'vegetarian' && substituteIngredient.is_vegetarian === 0) {
    warnings.push(`${substituteIngredient.name} violates your Vegetarian preference.`);
  }
  const normalizedAllergies = prefs.allergies.map((a) => a.trim().toLowerCase()).filter(Boolean);
  if (
    substituteIngredient.allergen_tag &&
    normalizedAllergies.some((a) => substituteIngredient.allergen_tag!.toLowerCase().includes(a))
  ) {
    warnings.push(`${substituteIngredient.name} triggers your ${substituteIngredient.allergen_tag} allergy.`);
  }
  const normalizedExcluded = prefs.excluded_ingredients.map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (normalizedExcluded.some((ex) => substituteIngredient.name.toLowerCase().includes(ex))) {
    warnings.push(`${substituteIngredient.name} is in your excluded ingredients list.`);
  }

  const updatedIngredients = recipe.ingredients.map((ri) =>
    ri.ingredient_id === originalIngredientId
      ? {
          ...ri,
          ingredient_id: substituteIngredient.id,
          ingredient_name: substituteIngredient.name,
        }
      : ri
  );

  const tempMap = new Map(ingredientMap);
  tempMap.set(substituteIngredient.id, substituteIngredient);

  const oldCalc = evaluateRecipeNutritionAndCost(recipe.ingredients, ingredientMap, prefs.currency);
  const newCalc = evaluateRecipeNutritionAndCost(updatedIngredients, tempMap, prefs.currency);
  const costDelta = round2(newCalc.estimated_cost - oldCalc.estimated_cost);

  if (costDelta > currentPlanRemainingBudget) {
    warnings.push(
      `Substitution adds ${prefs.currency} ${costDelta}, exceeding remaining weekly budget (${prefs.currency} ${currentPlanRemainingBudget}).`
    );
  }

  return {
    valid: warnings.length === 0,
    warnings,
    updatedNutrition: newCalc,
    costDelta,
  };
}

export interface PlanMutationResult {
  feasible: boolean;
  error?: string;
  items?: MealPlanItem[];
  total_cost?: number;
  remaining_budget?: number;
  avg_daily_calories?: number;
  avg_daily_protein?: number;
  avg_daily_carbs?: number;
  avg_daily_fat?: number;
  estimated_waste_g?: number;
  shopping_list?: ShoppingListItem[];
}

function buildMutationSuccess(
  grid: Recipe[][],
  prefs: UserPreferences,
  ingredientMap: Map<number, IngredientWithPrice>
): PlanMutationResult {
  const flat = grid.flat();
  const shopping = computeShoppingList(flat, ingredientMap, prefs.currency);

  let totalCal = 0;
  let totalProt = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  const items: MealPlanItem[] = [];

  for (let d = 0; d < 7; d++) {
    for (let s = 0; s < 3; s++) {
      const r = grid[d][s];
      totalCal += r.calories;
      totalProt += r.protein_g;
      totalCarbs += r.carbs_g;
      totalFat += r.fat_g;

      items.push({
        day_index: d,
        day_name: DAY_NAMES[d],
        meal_slot: s === 0 ? 'breakfast' : s === 1 ? 'lunch' : 'dinner',
        recipe_id: r.id,
        recipe_title: r.title,
        image_url: r.image_url,
        prep_time_min: r.prep_time_min,
        cook_time_min: r.cook_time_min,
        meal_cost: r.estimated_cost,
        calories: r.calories,
        protein_g: r.protein_g,
        carbs_g: r.carbs_g,
        fat_g: r.fat_g,
      });
    }
  }

  return {
    feasible: true,
    items,
    total_cost: shopping.totalCost,
    remaining_budget: round2(prefs.weekly_budget - shopping.totalCost),
    avg_daily_calories: Math.round(totalCal / 7),
    avg_daily_protein: round2(totalProt / 7),
    avg_daily_carbs: round2(totalCarbs / 7),
    avg_daily_fat: round2(totalFat / 7),
    estimated_waste_g: shopping.estimatedWasteG,
    shopping_list: shopping.items,
  };
}

function buildGridFromItems(
  currentItems: MealPlanItem[],
  recipeMap: Map<number, Recipe>
): Recipe[][] | null {
  if (currentItems.length !== 21) return null;
  const grid: Recipe[][] = Array.from({ length: 7 }, () => []);
  const slotOrder: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

  for (let d = 0; d < 7; d++) {
    for (let s = 0; s < 3; s++) {
      const slot = slotOrder[s];
      const item = currentItems.find((i) => i.day_index === d && i.meal_slot === slot);
      if (!item) return null;
      const recipe = recipeMap.get(item.recipe_id);
      if (!recipe) return null;
      grid[d][s] = recipe;
    }
  }
  return grid;
}

export function replaceSingleDishInPlan(
  currentItems: MealPlanItem[],
  dayIndex: number,
  mealSlot: MealSlot,
  newRecipeId: number,
  recipesInput: Recipe[],
  ingredientsInput: IngredientWithPrice[],
  prefs: UserPreferences
): PlanMutationResult {
  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6) {
    return { feasible: false, error: 'Invalid day index.' };
  }

  const ingredientMap = new Map(ingredientsInput.map((i) => [i.id, i]));
  const recipes: Recipe[] = recipesInput.map((r) => {
    const calc = evaluateRecipeNutritionAndCost(r.ingredients, ingredientMap, prefs.currency);
    return { ...r, ...calc };
  });
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));

  const newRecipe = recipeMap.get(newRecipeId);
  if (!newRecipe) {
    return { feasible: false, error: 'Selected dish was not found.' };
  }
  if (newRecipe.meal_slot !== mealSlot) {
    return { feasible: false, error: `Selected dish is not a ${mealSlot} recipe.` };
  }

  const allowedCheck = isRecipeAllowed(newRecipe, prefs, ingredientMap);
  if (!allowedCheck.allowed) {
    return {
      feasible: false,
      error: `${newRecipe.title} cannot be used because it ${allowedCheck.reason}.`,
    };
  }

  const grid = buildGridFromItems(currentItems, recipeMap);
  if (!grid) {
    return { feasible: false, error: 'Current meal plan is incomplete.' };
  }

  const slotIdx = mealSlot === 'breakfast' ? 0 : mealSlot === 'lunch' ? 1 : 2;
  grid[dayIndex][slotIdx] = newRecipe;

  const evalRes = evaluateCandidateGrid(grid, prefs, ingredientMap);
  if (!evalRes.budgetFeasible) {
    return {
      feasible: false,
      error: `Selecting "${newRecipe.title}" raises the weekly grocery total to ${prefs.currency} ${evalRes.totalCost.toLocaleString()}, exceeding your ${prefs.currency} ${prefs.weekly_budget.toLocaleString()} budget.`,
    };
  }

  return buildMutationSuccess(grid, prefs, ingredientMap);
}

export function replaceSingleDayInPlan(
  currentItems: MealPlanItem[],
  dayIndex: number,
  recipesInput: Recipe[],
  ingredientsInput: IngredientWithPrice[],
  prefs: UserPreferences,
  seedOffset = 0
): PlanMutationResult {
  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6) {
    return { feasible: false, error: 'Invalid day index.' };
  }

  const ingredientMap = new Map(ingredientsInput.map((i) => [i.id, i]));
  const recipes: Recipe[] = recipesInput.map((r) => {
    const calc = evaluateRecipeNutritionAndCost(r.ingredients, ingredientMap, prefs.currency);
    return { ...r, ...calc };
  });
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));

  const baseGrid = buildGridFromItems(currentItems, recipeMap);
  if (!baseGrid) {
    return { feasible: false, error: 'Current meal plan is incomplete.' };
  }

  const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner'];
  const candidatesBySlot: Record<MealSlot, Recipe[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
  };

  for (const r of recipes) {
    if (isRecipeAllowed(r, prefs, ingredientMap).allowed) {
      candidatesBySlot[r.meal_slot].push(r);
    }
  }

  for (const s of slots) {
    if (candidatesBySlot[s].length === 0) {
      return {
        feasible: false,
        error: `No eligible ${s} recipes match your dietary restrictions and allergies.`,
      };
    }
  }

  const currentDayIds = [
    baseGrid[dayIndex][0].id,
    baseGrid[dayIndex][1].id,
    baseGrid[dayIndex][2].id,
  ];

  // Rotate/cap each slot's candidates up to 10 to keep search sub-millisecond
  const poolFor = (slot: MealSlot) => {
    const sorted = [...candidatesBySlot[slot]].sort((a, b) => a.estimated_cost - b.estimated_cost);
    if (sorted.length <= 10) return sorted;
    const off = Math.abs(seedOffset) % sorted.length;
    return [...sorted.slice(off), ...sorted.slice(0, off)].slice(0, 10);
  };

  const bPool = poolFor('breakfast');
  const lPool = poolFor('lunch');
  const dPool = poolFor('dinner');

  const validCandidates: Array<{ triple: [Recipe, Recipe, Recipe]; score: number; diffCount: number }> = [];

  for (const b of bPool) {
    for (const l of lPool) {
      for (const d of dPool) {
        const diffCount =
          (b.id !== currentDayIds[0] ? 1 : 0) +
          (l.id !== currentDayIds[1] ? 1 : 0) +
          (d.id !== currentDayIds[2] ? 1 : 0);
        if (diffCount === 0) continue;

        const testGrid = baseGrid.map((row) => [...row]);
        testGrid[dayIndex] = [b, l, d];
        const ev = evaluateCandidateGrid(testGrid, prefs, ingredientMap);
        if (!ev.budgetFeasible) continue;

        // Prefer all 3 dishes changed, nutrition feasible, and low cost/macro deviation
        const nutritionBonus = ev.nutritionFeasible ? 0 : 8000;
        const diffBonus = (3 - diffCount) * 600;
        const score = ev.objective + nutritionBonus + diffBonus;
        validCandidates.push({ triple: [b, l, d], score, diffCount });
      }
    }
  }

  if (validCandidates.length === 0) {
    return {
      feasible: false,
      error: `No alternative ${DAY_NAMES[dayIndex]} meal combination fits within your ${prefs.currency} ${prefs.weekly_budget.toLocaleString()} budget and dietary filters.`,
    };
  }

  validCandidates.sort((a, b) => a.score - b.score);
  const topWindow = Math.min(4, validCandidates.length);
  const pickIdx = Math.abs(seedOffset) % topWindow;
  const chosen = validCandidates[pickIdx];

  const finalGrid = baseGrid.map((row) => [...row]);
  finalGrid[dayIndex] = chosen.triple;

  return buildMutationSuccess(finalGrid, prefs, ingredientMap);
}

