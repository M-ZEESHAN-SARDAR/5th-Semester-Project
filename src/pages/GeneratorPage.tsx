import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { api, formatMoney } from '../lib/api';
import { validatePreferencesInput } from '../shared/optimizer';
import {
  GOAL_PRESETS,
  matchGoalPreset,
  type GoalCategoryId,
  type GoalPreset,
} from '../shared/goalPresets';
import type {
  DietaryPreference,
  IngredientWithPrice,
  MealPlan,
  OptimizationDiagnostics,
  UserPreferences,
} from '../shared/types';

interface GeneratorPageProps {
  preferences: UserPreferences;
  onPlanGenerated: (plan: MealPlan, updatedPrefs: UserPreferences) => void;
}

const COMMON_ALLERGIES = ['dairy', 'eggs', 'gluten', 'fish', 'nuts'];

export function GeneratorPage({ preferences, onPlanGenerated }: GeneratorPageProps) {
  const [form, setForm] = useState<UserPreferences>(preferences);
  const [selectedGoal, setSelectedGoal] = useState<GoalCategoryId | null>(() =>
    matchGoalPreset(preferences)
  );
  const [planTitle, setPlanTitle] = useState('');
  const [allergyInput, setAllergyInput] = useState('');
  const [ingredients, setIngredients] = useState<IngredientWithPrice[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [diagnostics, setDiagnostics] = useState<OptimizationDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const diagnosticsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setForm(preferences);
    setSelectedGoal(matchGoalPreset(preferences));
  }, [preferences]);

  useEffect(() => {
    if (diagnostics && diagnosticsRef.current) {
      diagnosticsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [diagnostics]);

  useEffect(() => {
    api
      .getIngredients()
      .then(setIngredients)
      .catch(() => {});
  }, []);

  const handleSelectGoal = (preset: GoalPreset) => {
    setSelectedGoal(preset.id);
    setForm((prev) => ({
      ...prev,
      daily_calories: preset.daily_calories,
      protein_g: preset.protein_g,
      carbs_g: preset.carbs_g,
      fat_g: preset.fat_g,
    }));
  };

  const toggleAllergy = (tag: string) => {
    setForm((prev) => {
      const exists = prev.allergies.includes(tag);
      return {
        ...prev,
        allergies: exists ? prev.allergies.filter((a) => a !== tag) : [...prev.allergies, tag],
      };
    });
  };

  const addIngredientAllergy = (rawName: string) => {
    const trimmed = rawName.trim();
    if (!trimmed) return;
    setForm((prev) => {
      const exists = prev.excluded_ingredients.some(
        (item) => item.toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) return prev;
      return {
        ...prev,
        excluded_ingredients: [...prev.excluded_ingredients, trimmed],
      };
    });
    setAllergyInput('');
  };

  const removeIngredientAllergy = (name: string) => {
    setForm((prev) => ({
      ...prev,
      excluded_ingredients: prev.excluded_ingredients.filter((item) => item !== name),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setDiagnostics(null);

    const payload: UserPreferences = {
      ...form,
      currency: 'PKR',
      city: form.city?.trim() || 'Lahore',
      max_cooking_time_min: Math.max(45, form.max_cooking_time_min || 45),
    };

    const errors = validatePreferencesInput(payload);
    if (errors.length > 0) {
      const map: Record<string, string> = {};
      for (const err of errors) map[err.field] = err.message;
      setFieldErrors(map);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await api.generateMealPlan({
        ...payload,
        title: planTitle.trim() || undefined,
        save: true,
      });
      if (res.feasible && res.plan) {
        onPlanGenerated(res.plan, payload);
      } else if (res.diagnostics) {
        setDiagnostics(res.diagnostics);
      } else {
        setErrorMsg('Meal plan could not be loaded. Please try again.');
      }
    } catch (err) {
      const typed = err as Error & { diagnostics?: OptimizationDiagnostics };
      if (typed.diagnostics) {
        setDiagnostics(typed.diagnostics);
      } else {
        setErrorMsg(typed.message || 'Could not generate meal plan.');
      }
    } finally {
      setLoading(false);
    }
  };

  const applySuggestedBudget = () => {
    if (!diagnostics?.min_feasible_cost) return;
    const bumped = Math.ceil(diagnostics.min_feasible_cost / 100) * 100;
    setForm((prev) => ({ ...prev, weekly_budget: bumped }));
    setDiagnostics(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Configure Weekly Optimization Parameters</h2>
          <p className="text-sm text-slate-600 mt-1">
            All inputs are validated before running integer package optimization against local grocery prices.
          </p>
        </div>

        {errorMsg && (
          <div role="alert" className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Weekly Budget */}
          <div>
            <label htmlFor="gen-budget" className="block text-sm font-medium text-slate-700 mb-1">
              Weekly Grocery Budget (PKR)
            </label>
            <input
              id="gen-budget"
              type="number"
              min={500}
              step={100}
              value={form.weekly_budget}
              onChange={(e) => setForm({ ...form, weekly_budget: Number(e.target.value), currency: 'PKR' })}
              className="w-full sm:max-w-sm px-3.5 py-2.5 text-sm font-mono tabular-nums border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            {fieldErrors.weekly_budget && (
              <p className="text-xs text-red-700 mt-1">{fieldErrors.weekly_budget}</p>
            )}
          </div>

          {/* 4 Goal Categories */}
          <div className="pt-4 border-t border-stone-100">
            <span className="block text-sm font-semibold text-slate-900 mb-2">
              Fitness &amp; Nutrition Goal Category
            </span>
            <p className="text-xs text-slate-500 mb-3">
              Select a plan category to automatically set your daily calorie and macronutrient targets.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {GOAL_PRESETS.map((preset) => {
                const active = selectedGoal === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectGoal(preset)}
                    aria-pressed={active}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      active
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-950'
                        : 'bg-[#FAF9F5] border-stone-200 text-slate-800 hover:border-stone-300'
                    }`}
                  >
                    <p className="text-sm font-semibold">{preset.label}</p>
                    <p className="text-xs text-slate-600 mt-0.5 tabular-nums font-mono">
                      {preset.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Daily Nutritional Targets */}
          <div className="pt-4 border-t border-stone-100">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Daily Nutritional Targets</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label htmlFor="gen-calories" className="block text-xs font-medium text-slate-600 mb-1">
                  Calories (kcal)
                </label>
                <input
                  id="gen-calories"
                  type="number"
                  min={1000}
                  max={4500}
                  step={50}
                  value={form.daily_calories}
                  onChange={(e) => {
                    setSelectedGoal(null);
                    setForm({ ...form, daily_calories: Number(e.target.value) });
                  }}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {fieldErrors.daily_calories && (
                  <p className="text-xs text-red-700 mt-1">{fieldErrors.daily_calories}</p>
                )}
              </div>

              <div>
                <label htmlFor="gen-protein" className="block text-xs font-medium text-slate-600 mb-1">
                  Protein (g)
                </label>
                <input
                  id="gen-protein"
                  type="number"
                  min={25}
                  max={350}
                  value={form.protein_g}
                  onChange={(e) => {
                    setSelectedGoal(null);
                    setForm({ ...form, protein_g: Number(e.target.value) });
                  }}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {fieldErrors.protein_g && (
                  <p className="text-xs text-red-700 mt-1">{fieldErrors.protein_g}</p>
                )}
              </div>

              <div>
                <label htmlFor="gen-carbs" className="block text-xs font-medium text-slate-600 mb-1">
                  Carbs (g)
                </label>
                <input
                  id="gen-carbs"
                  type="number"
                  min={30}
                  max={600}
                  value={form.carbs_g}
                  onChange={(e) => {
                    setSelectedGoal(null);
                    setForm({ ...form, carbs_g: Number(e.target.value) });
                  }}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {fieldErrors.carbs_g && (
                  <p className="text-xs text-red-700 mt-1">{fieldErrors.carbs_g}</p>
                )}
              </div>

              <div>
                <label htmlFor="gen-fat" className="block text-xs font-medium text-slate-600 mb-1">
                  Fats (g)
                </label>
                <input
                  id="gen-fat"
                  type="number"
                  min={15}
                  max={200}
                  value={form.fat_g}
                  onChange={(e) => {
                    setSelectedGoal(null);
                    setForm({ ...form, fat_g: Number(e.target.value) });
                  }}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {fieldErrors.fat_g && <p className="text-xs text-red-700 mt-1">{fieldErrors.fat_g}</p>}
              </div>
            </div>
          </div>

          {/* Dietary Preference — Whole Line */}
          <div className="pt-4 border-t border-stone-100">
            <span className="block text-sm font-medium text-slate-700 mb-2">Dietary Preference</span>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-lg w-full">
              {(
                [
                  { id: 'non-vegetarian', label: 'Non-Vegetarian' },
                  { id: 'vegetarian', label: 'Vegetarian' },
                  { id: 'high-protein', label: 'High-Protein' },
                ] as Array<{ id: DietaryPreference; label: string }>
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setForm({ ...form, dietary_preference: d.id })}
                  className={`py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${
                    form.dietary_preference === d.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Food Allergies (Common Categories + Ingredient List Selector) */}
          <div className="pt-4 border-t border-stone-100 space-y-3">
            <div>
              <span className="block text-sm font-medium text-slate-700 mb-2">Food Allergies</span>
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGIES.map((allergy) => {
                  const checked = form.allergies.includes(allergy);
                  return (
                    <label
                      key={allergy}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors capitalize ${
                        checked
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                          : 'bg-white border-stone-300 text-slate-700 hover:bg-stone-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAllergy(allergy)}
                        className="accent-emerald-700"
                      />
                      <span>{allergy}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="gen-allergy-ingredient"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                Allergic to Specific Ingredients
              </label>
              <div className="flex gap-2">
                <input
                  id="gen-allergy-ingredient"
                  type="text"
                  list="allergy-ingredient-list"
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addIngredientAllergy(allergyInput);
                    }
                  }}
                  placeholder="Select or type an ingredient allergy (e.g. Chicken Breast, Milk)..."
                  className="flex-1 px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <datalist id="allergy-ingredient-list">
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.name} />
                  ))}
                </datalist>
                <button
                  type="button"
                  onClick={() => addIngredientAllergy(allergyInput)}
                  className="px-4 py-2 text-xs font-semibold border border-stone-300 rounded-lg text-slate-700 hover:bg-stone-50"
                >
                  Add
                </button>
              </div>
              {form.excluded_ingredients.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.excluded_ingredients.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => removeIngredientAllergy(item)}
                      aria-label={`Remove allergy ${item}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 border border-stone-200 text-xs text-slate-700 hover:bg-stone-200"
                    >
                      <span>{item}</span>
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex-1 max-w-md">
              <label htmlFor="gen-title" className="block text-xs font-medium text-slate-600 mb-1">
                Plan Label (Optional)
              </label>
              <input
                id="gen-title"
                type="text"
                value={planTitle}
                onChange={(e) => setPlanTitle(e.target.value)}
                placeholder="e.g. Exam Week High-Protein Plan"
                className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{loading ? 'Optimizing 21 Meals...' : 'Generate 7-Day Meal Plan'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Infeasibility Diagnostic Alert */}
      {diagnostics && (
        <div
          ref={diagnosticsRef}
          role="alert"
          className="bg-amber-50 border border-amber-300 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <h3 className="text-base font-bold text-amber-950">
                No Feasible Meal Plan Within Current Constraints
              </h3>
              <p className="text-sm text-amber-900 mt-1">
                To protect your budget and dietary safety, NutriBudget will not silently exceed your
                limit or bypass exclusions.
              </p>
            </div>
          </div>

          <div className="bg-white border border-amber-200 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-700">Unmet Constraints</p>
            <ul className="list-disc pl-5 text-sm text-slate-800 space-y-1">
              {diagnostics.unmet_constraints.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-amber-200 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-700">Recommended Adjustments</p>
            <ul className="space-y-1.5 text-sm text-slate-800">
              {diagnostics.suggestions.map((sug, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{sug}</span>
                </li>
              ))}
            </ul>

            {diagnostics.min_feasible_cost !== null &&
              diagnostics.min_feasible_cost > form.weekly_budget && (
                <button
                  type="button"
                  onClick={applySuggestedBudget}
                  className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                >
                  Apply Minimum Budget (
                  {formatMoney(Math.ceil(diagnostics.min_feasible_cost / 100) * 100, 'PKR')}
                  )
                </button>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
