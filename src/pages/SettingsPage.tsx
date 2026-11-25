import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { validatePreferencesInput } from '../shared/optimizer';
import {
  GOAL_PRESETS,
  matchGoalPreset,
  type GoalCategoryId,
  type GoalPreset,
} from '../shared/goalPresets';
import type { DietaryPreference, User, UserPreferences } from '../shared/types';

interface SettingsPageProps {
  user: User;
  preferences: UserPreferences;
  onPreferencesSaved: (prefs: UserPreferences) => void;
}

export function SettingsPage({ user, preferences, onPreferencesSaved }: SettingsPageProps) {
  const [form, setForm] = useState<UserPreferences>(preferences);
  const [selectedGoal, setSelectedGoal] = useState<GoalCategoryId | null>(() =>
    matchGoalPreset(preferences)
  );
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(preferences);
    setSelectedGoal(matchGoalPreset(preferences));
  }, [preferences]);

  const handleSelectGoal = (preset: GoalPreset) => {
    setSelectedGoal(preset.id);
    setSavedNotice(false);
    setForm((prev) => ({
      ...prev,
      daily_calories: preset.daily_calories,
      protein_g: preset.protein_g,
      carbs_g: preset.carbs_g,
      fat_g: preset.fat_g,
    }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSavedNotice(false);
    setError(null);
    const errors = validatePreferencesInput(form);
    if (errors.length > 0) {
      setError(errors[0].message);
      return;
    }

    setSaving(true);
    try {
      const updated = await api.updatePreferences(form);
      onPreferencesSaved(updated);
      setSavedNotice(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white border border-stone-200 rounded-xl p-6">
        <h2 className="text-base font-bold text-slate-900">Account Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-sm">
          <div>
            <p className="text-xs text-slate-500">Full Name</p>
            <p className="font-semibold text-slate-900 mt-0.5">{user.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Email Address</p>
            <p className="font-medium text-slate-800 mt-0.5">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Account Role</p>
            <p className="font-medium text-emerald-800 capitalize mt-0.5">{user.role}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-stone-200 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900">Default Optimization Preferences</h2>
          <p className="text-xs text-slate-500 mt-1">
            These defaults prefill the Meal Plan Generator and set your weekly PKR budget.
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            {error}
          </div>
        )}
        {savedNotice && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            <span>Preferences saved to database.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="set-budget" className="block text-xs font-medium text-slate-700 mb-1">
              Default Weekly Budget
            </label>
            <input
              id="set-budget"
              type="number"
              value={form.weekly_budget}
              onChange={(e) => setForm({ ...form, weekly_budget: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-stone-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="set-currency" className="block text-xs font-medium text-slate-700 mb-1">
              Currency
            </label>
            <select
              id="set-currency"
              value="PKR"
              onChange={() => setForm({ ...form, currency: 'PKR' })}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
            >
              <option value="PKR">PKR (Pakistani Rupee)</option>
            </select>
          </div>
        </div>

        {/* Fitness & Nutrition Goal Category */}
        <div className="pt-4 border-t border-stone-100">
          <span className="block text-sm font-semibold text-slate-900 mb-1">
            Fitness &amp; Nutrition Goal Category
          </span>
          <p className="text-xs text-slate-500 mb-3">
            Select a plan category to automatically set your default daily calorie and macronutrient targets.
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

        <div className="pt-4 border-t border-stone-100">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Daily Nutritional Targets</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label htmlFor="set-cal" className="block text-xs font-medium text-slate-700 mb-1">
                Daily Calories
              </label>
              <input
                id="set-cal"
                type="number"
                value={form.daily_calories}
                onChange={(e) => {
                  const next = { ...form, daily_calories: Number(e.target.value) };
                  setForm(next);
                  setSelectedGoal(matchGoalPreset(next));
                }}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="set-prot" className="block text-xs font-medium text-slate-700 mb-1">
                Protein (g)
              </label>
              <input
                id="set-prot"
                type="number"
                value={form.protein_g}
                onChange={(e) => {
                  const next = { ...form, protein_g: Number(e.target.value) };
                  setForm(next);
                  setSelectedGoal(matchGoalPreset(next));
                }}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="set-carb" className="block text-xs font-medium text-slate-700 mb-1">
                Carbs (g)
              </label>
              <input
                id="set-carb"
                type="number"
                value={form.carbs_g}
                onChange={(e) => {
                  const next = { ...form, carbs_g: Number(e.target.value) };
                  setForm(next);
                  setSelectedGoal(matchGoalPreset(next));
                }}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="set-fat" className="block text-xs font-medium text-slate-700 mb-1">
                Fat (g)
              </label>
              <input
                id="set-fat"
                type="number"
                value={form.fat_g}
                onChange={(e) => {
                  const next = { ...form, fat_g: Number(e.target.value) };
                  setForm(next);
                  setSelectedGoal(matchGoalPreset(next));
                }}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-stone-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="set-diet" className="block text-xs font-medium text-slate-700 mb-1">
            Dietary Preference
          </label>
          <select
            id="set-diet"
            value={form.dietary_preference}
            onChange={(e) => setForm({ ...form, dietary_preference: e.target.value as DietaryPreference })}
            className="w-full sm:max-w-sm px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
          >
            <option value="non-vegetarian">Non-Vegetarian (Balanced)</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="high-protein">High-Protein</option>
          </select>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
