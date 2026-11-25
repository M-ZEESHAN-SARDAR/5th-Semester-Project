import { Printer } from 'lucide-react';
import { api, formatMoney } from '../lib/api';
import type { MealPlan, ShoppingListItem } from '../shared/types';
import type { AppRoute } from '../components/AppShell';

interface ShoppingListPageProps {
  activePlan: MealPlan | null;
  onPlanUpdated: (plan: MealPlan) => void;
  onNavigate: (route: AppRoute) => void;
}

export function ShoppingListPage({ activePlan, onPlanUpdated, onNavigate }: ShoppingListPageProps) {
  if (!activePlan) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-10 text-center max-w-xl mx-auto mt-8">
        <h2 className="text-lg font-bold text-slate-900">No shopping list available</h2>
        <p className="text-sm text-slate-600 mt-2">
          Generate a 7-day meal plan first to consolidate all 21 meals into a package-optimized grocery list.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('generator')}
          className="mt-5 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
        >
          Generate Meal Plan
        </button>
      </div>
    );
  }

  const handleToggleItem = async (item: ShoppingListItem) => {
    if (!item.id) return;
    const nextChecked = !item.is_checked;
    // Optimistic update
    onPlanUpdated({
      ...activePlan,
      shopping_list: activePlan.shopping_list.map((s) =>
        s.id === item.id ? { ...s, is_checked: nextChecked } : s
      ),
    });
    try {
      await api.toggleShoppingItem(item.id, nextChecked);
    } catch {
      // Revert on failure
      onPlanUpdated(activePlan);
    }
  };

  const checkedCount = activePlan.shopping_list.filter((i) => i.is_checked).length;

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">
            Consolidated 21-Meal Grocery List
          </p>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">{activePlan.title}</h2>
          <p className="text-xs text-slate-600 mt-1 tabular-nums">
            {checkedCount} of {activePlan.shopping_list.length} items checked off
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="no-print inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" aria-hidden="true" />
          <span>Print Shopping List</span>
        </button>
      </div>

      {/* Budget KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Weekly Grocery Cost</p>
          <p className="text-xl font-bold text-emerald-800 mt-1 tabular-nums font-mono">
            {formatMoney(activePlan.total_cost, activePlan.currency)}
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Weekly Budget Cap</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums font-mono">
            {formatMoney(activePlan.weekly_budget, activePlan.currency)}
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Remaining Budget</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums font-mono">
            {formatMoney(activePlan.remaining_budget, activePlan.currency)}
          </p>
        </div>
      </div>

      {/* Shopping Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-[#FAF9F5] border-b border-stone-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 w-12">Got It</th>
                <th className="py-3 px-4 font-semibold">Ingredient</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold text-right">Required Qty</th>
                <th className="py-3 px-4 font-semibold text-right">Packages to Buy</th>
                <th className="py-3 px-4 font-semibold text-right">Price / Pack</th>
                <th className="py-3 px-4 font-semibold text-right">Total Cost</th>
                <th className="py-3 px-4 font-semibold text-right">Est. Leftover</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {activePlan.shopping_list.map((item) => (
                <tr
                  key={item.ingredient_id}
                  className={item.is_checked ? 'bg-stone-50/70 text-slate-400' : 'hover:bg-stone-50/60'}
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      aria-label={`Mark ${item.ingredient_name} as purchased`}
                      checked={item.is_checked}
                      onChange={() => handleToggleItem(item)}
                      className="w-4 h-4 accent-emerald-700 cursor-pointer"
                    />
                  </td>
                  <td className={`py-3 px-4 font-medium ${item.is_checked ? 'line-through' : 'text-slate-900'}`}>
                    {item.ingredient_name}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{item.category}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-mono">
                    {item.total_required_g} {item.measurement_unit}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-mono font-semibold text-slate-900">
                    {item.packages_to_buy} × {item.package_size_g}
                    {item.measurement_unit}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-mono">
                    {formatMoney(item.price_per_package, activePlan.currency)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-mono font-semibold text-emerald-800">
                    {formatMoney(item.total_ingredient_cost, activePlan.currency)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-mono text-slate-500">
                    {item.leftover_g} {item.measurement_unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
