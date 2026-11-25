import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Sparkles, Users } from 'lucide-react';
import { api, formatMoney } from '../lib/api';
import { FoodImage } from '../components/FoodImage';
import type { Currency, IngredientWithPrice, MealPlan, Recipe } from '../shared/types';
import type { AppRoute } from '../components/AppShell';

interface RecipeDetailPageProps {
  recipeId: number | null;
  currency: Currency;
  activePlan: MealPlan | null;
  onNavigate: (route: AppRoute) => void;
}

export function RecipeDetailPage({
  recipeId,
  currency,
  activePlan,
  onNavigate,
}: RecipeDetailPageProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [allIngredients, setAllIngredients] = useState<IngredientWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceNotice, setEnhanceNotice] = useState<string | null>(null);
  const [origIngId, setOrigIngId] = useState<number>(0);
  const [subIngId, setSubIngId] = useState<number>(0);
  const [subResult, setSubResult] = useState<{
    valid: boolean;
    warnings: string[];
    updatedNutrition: { calories: number; protein_g: number; carbs_g: number; fat_g: number; estimated_cost: number };
    costDelta: number;
  } | null>(null);

  useEffect(() => {
    if (!recipeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setSubResult(null);
    setEnhanceNotice(null);
    Promise.all([api.getRecipe(recipeId, currency), api.getIngredients()])
      .then(([rec, ings]) => {
        setRecipe(rec);
        setAllIngredients(ings);
        if (rec.ingredients.length > 0) setOrigIngId(rec.ingredients[0].ingredient_id);
        if (ings.length > 0) setSubIngId(ings[0].id);
      })
      .catch(() => setRecipe(null))
      .finally(() => setLoading(false));
  }, [recipeId, currency]);

  const handleEnhance = async () => {
    if (!recipe) return;
    setEnhancing(true);
    setEnhanceNotice(null);
    try {
      const res = await api.enhanceRecipe(recipe.id);
      setRecipe(res.recipe);
      setEnhanceNotice(
        res.source === 'gemini'
          ? 'Instructions enhanced via Gemini AI. Nutrition and cost remain calculated from your SQLite ingredient database.'
          : res.note || 'Displayed verified fallback recipe instructions.'
      );
    } catch (err) {
      setEnhanceNotice(err instanceof Error ? err.message : 'Unable to enhance recipe.');
    } finally {
      setEnhancing(false);
    }
  };

  const handleValidateSubstitution = async () => {
    if (!recipe || !origIngId || !subIngId) return;
    try {
      const res = await api.validateSubstitution(recipe.id, {
        original_ingredient_id: origIngId,
        substitute_ingredient_id: subIngId,
        remaining_budget: activePlan ? activePlan.remaining_budget : 500,
      });
      setSubResult(res);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-10 text-center text-sm text-slate-600">
        Loading recipe details...
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-10 text-center max-w-lg mx-auto">
        <p className="text-base font-semibold text-slate-900">Select a meal from your Weekly Planner</p>
        <button
          type="button"
          onClick={() => onNavigate('planner')}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg"
        >
          Back to Weekly Planner
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => onNavigate('planner')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Back to Weekly Planner</span>
      </button>

      {/* Hero Card */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-5 h-64 lg:h-auto min-h-[260px]">
          <FoodImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
        </div>
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-5">
          <div>
            <p className="text-xs font-medium text-emerald-800 capitalize">
              {recipe.meal_slot} · {recipe.dietary_tag}
              {recipe.is_ai_enhanced ? ' · AI-Enhanced Steps' : ''}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{recipe.title}</h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">{recipe.description}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-stone-100">
            <div>
              <p className="text-xs text-slate-500">Calories</p>
              <p className="text-base font-bold text-slate-900 tabular-nums font-mono">{recipe.calories} kcal</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Macros (P / C / F)</p>
              <p className="text-sm font-bold text-slate-900 tabular-nums font-mono whitespace-nowrap">
                {Math.round(recipe.protein_g)}g / {Math.round(recipe.carbs_g)}g / {Math.round(recipe.fat_g)}g
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Ingredient Cost</p>
              <p className="text-base font-bold text-emerald-800 tabular-nums font-mono">
                {formatMoney(recipe.estimated_cost, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Servings</p>
              <p className="text-sm font-semibold text-slate-800 tabular-nums inline-flex items-center gap-1.5 mt-0.5">
                <Users className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleEnhance}
              disabled={enhancing}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{enhancing ? 'Enhancing with Gemini...' : 'Enhance Instructions with Gemini AI'}</span>
            </button>
            {enhanceNotice && <p className="text-xs text-slate-600">{enhanceNotice}</p>}
          </div>
        </div>
      </div>

      {/* Ingredients & Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xl p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">
            Measured Ingredients (Database Verified)
          </h3>
          <ul className="divide-y divide-stone-100 text-sm">
            {recipe.ingredients.map((item) => (
              <li key={item.ingredient_id} className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-slate-800 font-medium">{item.ingredient_name}</span>
                <span className="tabular-nums font-mono text-slate-600">{item.quantity_g} g</span>
              </li>
            ))}
          </ul>

          {recipe.alternatives.length > 0 && (
            <div className="mt-6 pt-5 border-t border-stone-100">
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Suggested Alternatives</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                {recipe.alternatives.map((alt, idx) => (
                  <li key={idx} className="p-2.5 rounded-lg bg-[#FAF9F5] border border-stone-200/70">
                    <strong className="text-slate-800">{alt.original_ingredient}</strong> →{' '}
                    <strong className="text-emerald-800">{alt.substitute_ingredient}</strong>
                    <p className="mt-0.5">{alt.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-stone-200 rounded-xl p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Step-by-Step Cooking Instructions</h3>
            <ol className="space-y-3 text-sm text-slate-700">
              {recipe.instructions.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Interactive Substitution Revalidator */}
          <div className="bg-white border border-stone-200 rounded-xl p-6">
            <h3 className="text-base font-semibold text-slate-900">
              Validate Ingredient Substitution
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Test swapping an ingredient; NutriBudget checks allergies, diet, nutrition, and remaining budget.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="sub-orig" className="block text-xs font-medium text-slate-600 mb-1">
                  Replace Ingredient
                </label>
                <select
                  id="sub-orig"
                  value={origIngId}
                  onChange={(e) => setOrigIngId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
                >
                  {recipe.ingredients.map((i) => (
                    <option key={i.ingredient_id} value={i.ingredient_id}>
                      {i.ingredient_name} ({i.quantity_g}g)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="sub-new" className="block text-xs font-medium text-slate-600 mb-1">
                  With Pantry Ingredient
                </label>
                <select
                  id="sub-new"
                  value={subIngId}
                  onChange={(e) => setSubIngId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
                >
                  {allIngredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleValidateSubstitution}
              className="mt-3 px-4 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors"
            >
              Check Constraints & Nutrition
            </button>

            {subResult && (
              <div
                className={`mt-4 p-4 rounded-lg border text-sm ${
                  subResult.valid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {subResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-700" aria-hidden="true" />
                  )}
                  <span>
                    {subResult.valid
                      ? 'Substitution satisfies all dietary, allergy, and budget rules.'
                      : 'Substitution violates one or more constraints:'}
                  </span>
                </div>
                {subResult.warnings.length > 0 && (
                  <ul className="list-disc pl-5 mt-2 text-xs space-y-1">
                    {subResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
                <p className="text-xs mt-2 tabular-nums font-mono">
                  New Meal Nutrition: {subResult.updatedNutrition.calories} kcal ·{' '}
                  {subResult.updatedNutrition.protein_g}g P · Cost Delta:{' '}
                  {subResult.costDelta >= 0 ? '+' : ''}
                  {formatMoney(subResult.costDelta, currency)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
