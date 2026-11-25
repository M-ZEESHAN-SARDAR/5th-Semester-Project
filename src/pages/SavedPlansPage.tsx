import { useState } from 'react';
import { CalendarDays, RefreshCw, ShoppingCart, Trash2 } from 'lucide-react';
import { api, formatMoney } from '../lib/api';
import type { MealPlan } from '../shared/types';
import type { AppRoute } from '../components/AppShell';

interface SavedPlansPageProps {
  plans: MealPlan[];
  activePlanId: number | null;
  onSelectPlan: (plan: MealPlan, targetRoute?: AppRoute) => void;
  onPlansChanged: (preferredPlanId?: number) => Promise<void> | void;
  onNavigate: (route: AppRoute) => void;
}

export function SavedPlansPage({
  plans,
  activePlanId,
  onSelectPlan,
  onPlansChanged,
  onNavigate,
}: SavedPlansPageProps) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerate = async (planId: number) => {
    setBusyId(planId);
    setError(null);
    try {
      const res = await api.regenerateMealPlan(planId);
      if (res.plan) {
        onSelectPlan(res.plan, 'planner');
        await onPlansChanged(res.plan.id);
      } else {
        await onPlansChanged();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regeneration failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (planId: number) => {
    setBusyId(planId);
    setError(null);
    try {
      await api.deleteMealPlan(planId);
      onPlansChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete meal plan.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Saved Weekly Meal Plans</h2>
          <p className="text-xs text-slate-600 mt-1">
            All generated plans and shopping lists are persisted in SQLite across sessions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('generator')}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg self-start sm:self-auto"
        >
          Generate New Plan
        </button>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          {error}
        </div>
      )}

      {plans.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-10 text-center">
          <h3 className="text-base font-semibold text-slate-900">No saved meal plans yet</h3>
          <p className="text-sm text-slate-600 mt-1">
            Generate your first optimized 7-day plan to save it here.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('generator')}
            className="mt-4 px-5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg"
          >
            Create Meal Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => {
            const isActive = plan.id === activePlanId;
            return (
              <div
                key={plan.id}
                className={`bg-white border rounded-xl p-5 flex flex-col justify-between gap-4 ${
                  isActive ? 'border-emerald-500' : 'border-stone-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="capitalize">
                      {plan.dietary_preference} · {plan.created_at.slice(0, 10)}
                    </span>
                    {isActive && <span className="font-semibold text-emerald-700">Active Plan</span>}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{plan.title}</h3>
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-stone-100 text-xs">
                    <div>
                      <p className="text-slate-500">Grocery Cost</p>
                      <p className="font-bold font-mono tabular-nums text-emerald-800 mt-0.5">
                        {formatMoney(plan.total_cost, plan.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Budget Cap</p>
                      <p className="font-semibold font-mono tabular-nums text-slate-900 mt-0.5">
                        {formatMoney(plan.weekly_budget, plan.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Avg Daily</p>
                      <p className="font-semibold font-mono tabular-nums text-slate-900 mt-0.5">
                        {plan.avg_daily_calories} kcal · {plan.avg_daily_protein}g P
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => onSelectPlan(plan, 'planner')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                  >
                    <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>View Planner</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectPlan(plan, 'shopping-list')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Shopping List</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyId === plan.id}
                    onClick={() => handleRegenerate(plan.id)}
                    aria-label={`Regenerate ${plan.title}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-stone-200 hover:bg-stone-50 rounded-lg"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${busyId === plan.id ? 'animate-spin' : ''}`} aria-hidden="true" />
                    <span>Regenerate</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyId === plan.id}
                    onClick={() => handleDelete(plan.id)}
                    aria-label={`Delete ${plan.title}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
