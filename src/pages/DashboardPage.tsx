import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarDays, ShoppingCart, SlidersHorizontal, Sparkles, TrendingDown } from 'lucide-react';
import { formatMoney } from '../lib/api';
import type { MealPlan, UserPreferences } from '../shared/types';
import type { AppRoute } from '../components/AppShell';

interface DashboardPageProps {
  activePlan: MealPlan | null;
  preferences: UserPreferences;
  onNavigate: (route: AppRoute) => void;
  onSelectRecipe: (recipeId: number) => void;
}

const MEAL_TIMES = {
  breakfast: '8:00 AM',
  lunch: '1:00 PM',
  dinner: '7:00 PM',
} as const;

export function DashboardPage({
  activePlan,
  preferences,
  onNavigate,
  onSelectRecipe,
}: DashboardPageProps) {
  if (!activePlan) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-10 text-center max-w-2xl mx-auto mt-8">
        <SlidersHorizontal className="w-10 h-10 text-emerald-700 mx-auto mb-4" aria-hidden="true" />
        <h2 className="text-xl font-bold text-slate-900">No meal plan generated yet</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
          Configure your weekly budget ({formatMoney(preferences.weekly_budget, preferences.currency)}),
          daily calorie target, and dietary preferences to generate your first optimized 7-day plan.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('generator')}
          className="mt-6 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
        >
          Generate Plan
        </button>
      </div>
    );
  }

  const budgetPct = Math.min(100, Math.round((activePlan.total_cost / activePlan.weekly_budget) * 100));

  // Single weekly graph data: Daily calories across 7 days
  const dailyMap = new Map<number, { day: string; calories: number; protein: number }>();
  for (const item of activePlan.items) {
    const cur = dailyMap.get(item.day_index) ?? {
      day: item.day_name.slice(0, 3),
      calories: 0,
      protein: 0,
    };
    cur.calories += item.calories;
    cur.protein += item.protein_g;
    dailyMap.set(item.day_index, cur);
  }
  const dailyChartData = Array.from(dailyMap.values()).map((d) => ({
    ...d,
    protein: Math.round(d.protein),
  }));

  // Today's / Monday preview meals
  const day0Meals = activePlan.items.filter((i) => i.day_index === 0);

  return (
    <div className="space-y-6">
      {/* Plan Banner */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 capitalize">
            Active Weekly Plan · {activePlan.dietary_preference}
          </p>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">{activePlan.title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('planner')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <CalendarDays className="w-4 h-4" aria-hidden="true" />
            <span>Weekly Schedule</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('shopping-list')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap"
          >
            <ShoppingCart className="w-4 h-4" aria-hidden="true" />
            <span>Shopping List ({activePlan.shopping_list.length} items)</span>
          </button>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Weekly Grocery Budget</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums font-mono">
            {formatMoney(activePlan.weekly_budget, activePlan.currency)}
          </p>
          <p className="text-xs text-slate-500 mt-2 tabular-nums">
            {budgetPct}% allocated to optimized packages
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Estimated Grocery Expense</p>
          <p className="text-2xl font-bold text-emerald-800 mt-1 tabular-nums font-mono">
            {formatMoney(activePlan.total_cost, activePlan.currency)}
          </p>
          <p className="text-xs text-emerald-700 mt-2 tabular-nums">
            Remaining: {formatMoney(activePlan.remaining_budget, activePlan.currency)} saved
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Avg Daily Calories & Protein</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums font-mono">
            {activePlan.avg_daily_calories} kcal
          </p>
          <p className="text-xs text-slate-600 mt-2 tabular-nums">
            {activePlan.avg_daily_protein}g protein / day (Target {activePlan.target_protein}g)
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Estimated Ingredient Leftover</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums font-mono">
            {activePlan.estimated_waste_g >= 1000
              ? `${(activePlan.estimated_waste_g / 1000).toFixed(2)} kg`
              : `${Math.round(activePlan.estimated_waste_g)} g`}
          </p>
          <p className="text-xs text-slate-500 mt-2 inline-flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
            <span>Minimized via cross-meal staple reuse</span>
          </p>
        </div>
      </div>

      {/* Single Graph: Daily Calories Across 7 Days */}
      <div className="bg-white border border-stone-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Daily Calories Across 7 Days
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Target: {activePlan.target_calories} kcal · Avg Macros: {activePlan.avg_daily_protein}g Protein / {activePlan.avg_daily_carbs}g Carbs / {activePlan.avg_daily_fat}g Fat
            </p>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 12, fill: '#475569' }} width={48} />
              <Tooltip />
              <Bar
                dataKey="calories"
                name="Calories (kcal)"
                fill="#059669"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monday Sample Schedule Preview */}
      <div className="bg-white border border-stone-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">Monday Meal Preview</h3>
          <button
            type="button"
            onClick={() => onNavigate('planner')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
          >
            View all 7 days →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {day0Meals.map((meal) => (
            <button
              key={`${meal.day_index}-${meal.meal_slot}`}
              type="button"
              onClick={() => onSelectRecipe(meal.recipe_id)}
              className="text-left p-4 rounded-lg border border-stone-200 hover:border-emerald-400 transition-colors bg-[#FAF9F5]"
            >
              <p className="text-xs font-medium text-emerald-800 capitalize">
                {meal.meal_slot} · {MEAL_TIMES[meal.meal_slot]}
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-1 line-clamp-1">{meal.recipe_title}</p>
              <p className="text-xs text-slate-600 mt-1 tabular-nums">
                {meal.calories} kcal · {meal.protein_g}g protein · {formatMoney(meal.meal_cost, activePlan.currency)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom CTA to Meal Generator */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Want to adjust your budget or macro goals?</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Create a fresh 7-day meal plan tailored to your latest local grocery prices and preferences.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('generator')}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          <span>Generate Plan</span>
        </button>
      </div>
    </div>
  );
}
