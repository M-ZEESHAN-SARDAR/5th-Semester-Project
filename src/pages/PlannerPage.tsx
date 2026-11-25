import { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  Bell,
  BellOff,
  BellRing,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  ShoppingCart,
  X,
} from 'lucide-react';
import { api, formatMoney } from '../lib/api';
import { FoodImage } from '../components/FoodImage';
import { isRecipeAllowed } from '../shared/optimizer';
import type {
  IngredientWithPrice,
  MealNotificationSettings,
  MealPlan,
  MealPlanItem,
  MealSlot,
  Recipe,
  UserPreferences,
} from '../shared/types';
import type { AppRoute } from '../components/AppShell';

interface PlannerPageProps {
  activePlan: MealPlan | null;
  preferences: UserPreferences;
  notificationSettings: MealNotificationSettings;
  generatedBannerTitle?: string | null;
  onDismissGeneratedBanner?: () => void;
  onSaveNotificationSettings: (
    next: Partial<MealNotificationSettings>
  ) => Promise<MealNotificationSettings>;
  onTestNotification: (slot: MealSlot) => Promise<void>;
  onSelectRecipe: (recipeId: number) => void;
  onPlanUpdated: (plan: MealPlan) => void;
  onNavigate: (route: AppRoute) => void;
}

function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = (hhmm || '08:00').split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function getBrowserPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function PlannerPage({
  activePlan,
  preferences,
  notificationSettings,
  generatedBannerTitle,
  onDismissGeneratedBanner,
  onSaveNotificationSettings,
  onTestNotification,
  onSelectRecipe,
  onPlanUpdated,
  onNavigate,
}: PlannerPageProps) {
  const [regenerating, setRegenerating] = useState(false);
  const [changingDay, setChangingDay] = useState<number | null>(null);
  const [daySeeds, setDaySeeds] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');

  // Meal notification controls state
  const [showNotifConfig, setShowNotifConfig] = useState(false);
  const [notifDraft, setNotifDraft] = useState<MealNotificationSettings>(notificationSettings);
  const [savingNotif, setSavingNotif] = useState(false);
  const [testingSlot, setTestingSlot] = useState<MealSlot | null>(null);
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getBrowserPermissionState()
  );

  // Change-dish modal state
  const [swapTarget, setSwapTarget] = useState<MealPlanItem | null>(null);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [ingMap, setIngMap] = useState<Map<number, IngredientWithPrice>>(new Map());
  const [loadingChoices, setLoadingChoices] = useState(false);
  const [swappingRecipeId, setSwappingRecipeId] = useState<number | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  useEffect(() => {
    setNotifDraft(notificationSettings);
  }, [notificationSettings]);

  useEffect(() => {
    if (!swapTarget) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSwapTarget(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [swapTarget]);

  if (!activePlan) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-10 text-center max-w-xl mx-auto mt-8">
        <h2 className="text-lg font-bold text-slate-900">No active weekly meal plan</h2>
        <p className="text-sm text-slate-600 mt-2">
          Generate a 7-day meal plan or open one from Saved Plans to inspect your weekly schedule.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('generator')}
          className="mt-5 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
        >
          Go to Generator
        </button>
      </div>
    );
  }

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const res = await api.regenerateMealPlan(activePlan.id, Math.floor(Math.random() * 6) + 1);
      if (res.feasible && res.plan) {
        onPlanUpdated(res.plan);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate plan.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleChangeDay = async (dayIndex: number) => {
    setChangingDay(dayIndex);
    setError(null);
    const nextSeed = (daySeeds[dayIndex] ?? 0) + 1;
    try {
      const res = await api.replacePlanDay(activePlan.id, {
        day_index: dayIndex,
        seedOffset: nextSeed,
      });
      if (res.feasible && res.plan) {
        setDaySeeds((prev) => ({ ...prev, [dayIndex]: nextSeed }));
        onPlanUpdated(res.plan);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not replace day plan.');
    } finally {
      setChangingDay(null);
    }
  };

  const handleOpenSwapModal = async (meal: MealPlanItem) => {
    setSwapTarget(meal);
    setSwapError(null);
    setSwappingRecipeId(null);

    if (allRecipes.length === 0) {
      setLoadingChoices(true);
      try {
        const [recipesList, ingredientsList] = await Promise.all([
          api.getRecipes(activePlan.currency),
          api.getIngredients(),
        ]);
        setAllRecipes(recipesList);
        setIngMap(new Map(ingredientsList.map((ing) => [ing.id, ing])));
      } catch (err) {
        setSwapError(err instanceof Error ? err.message : 'Could not load dish options.');
      } finally {
        setLoadingChoices(false);
      }
    }
  };

  const handleSelectDish = async (newRecipeId: number) => {
    if (!swapTarget) return;
    setSwappingRecipeId(newRecipeId);
    setSwapError(null);
    try {
      const res = await api.replacePlanDish(activePlan.id, {
        day_index: swapTarget.day_index,
        meal_slot: swapTarget.meal_slot,
        recipe_id: newRecipeId,
      });
      if (res.feasible && res.plan) {
        onPlanUpdated(res.plan);
        setSwapTarget(null);
      }
    } catch (err) {
      setSwapError(err instanceof Error ? err.message : 'Could not change dish.');
    } finally {
      setSwappingRecipeId(null);
    }
  };

  const effectivePrefs: UserPreferences = {
    ...preferences,
    weekly_budget: activePlan.weekly_budget,
    currency: activePlan.currency,
    dietary_preference: activePlan.dietary_preference,
  };

  const slotCandidates = swapTarget
    ? allRecipes.filter((r) => {
        if (r.meal_slot !== swapTarget.meal_slot) return false;
        if (ingMap.size === 0) return true;
        return isRecipeAllowed(r, effectivePrefs, ingMap).allowed;
      })
    : [];

  // Group items by day_index (0..6)
  const days = Array.from({ length: 7 }, (_, dayIdx) => {
    const meals = activePlan.items.filter((i) => i.day_index === dayIdx);
    const dayCalories = meals.reduce((acc, m) => acc + m.calories, 0);
    const dayProtein = Math.round(meals.reduce((acc, m) => acc + m.protein_g, 0));
    const dayCost = meals.reduce((acc, m) => acc + m.meal_cost, 0);
    return {
      dayIndex: dayIdx,
      dayName: meals[0]?.day_name || `Day ${dayIdx + 1}`,
      meals,
      dayCalories,
      dayProtein,
      dayCost,
    };
  });

  const visibleDays = selectedDay === 'all' ? days : days.filter((d) => d.dayIndex === selectedDay);

  const mealTimes: Record<MealSlot, string> = {
    breakfast: formatTime12h(notificationSettings.breakfast_time),
    lunch: formatTime12h(notificationSettings.lunch_time),
    dinner: formatTime12h(notificationSettings.dinner_time),
  };

  const handleToggleNotifications = async () => {
    setSavingNotif(true);
    setNotifFeedback(null);
    setError(null);
    const nextEnabled = !notificationSettings.enabled;

    try {
      let perm: NotificationPermission | 'unsupported' = getBrowserPermissionState();
      if (nextEnabled && perm === 'default' && typeof window !== 'undefined' && 'Notification' in window) {
        try {
          perm = await Notification.requestPermission();
        } catch {
          perm = getBrowserPermissionState();
        }
        setBrowserPermission(perm);
      }

      const saved = await onSaveNotificationSettings({
        ...notifDraft,
        enabled: nextEnabled,
      });
      setNotifDraft(saved);

      if (nextEnabled) {
        setNotifFeedback(
          perm === 'granted'
            ? 'Meal reminders enabled — browser & in-app notifications will alert you at scheduled meal times.'
            : 'Meal reminders enabled — in-app notifications will alert you while NutriBudget is open.'
        );
      } else {
        setNotifFeedback('Meal reminders paused.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notification settings.');
    } finally {
      setSavingNotif(false);
    }
  };

  const handleRequestBrowserPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserPermission('unsupported');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
      if (perm === 'granted') {
        setNotifFeedback('Browser notification permission granted.');
      }
    } catch {
      setBrowserPermission(getBrowserPermissionState());
    }
  };

  const handleSaveSchedule = async () => {
    setSavingNotif(true);
    setNotifFeedback(null);
    setError(null);
    try {
      const saved = await onSaveNotificationSettings(notifDraft);
      setNotifDraft(saved);
      setNotifFeedback('Meal reminder schedule saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reminder schedule.');
    } finally {
      setSavingNotif(false);
    }
  };

  const handleTestSlot = async (slot: MealSlot) => {
    setTestingSlot(slot);
    setError(null);
    try {
      if (browserPermission === 'default' && typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const perm = await Notification.requestPermission();
          setBrowserPermission(perm);
        } catch {
          // ignore
        }
      }
      await onTestNotification(slot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send test notification.');
    } finally {
      setTestingSlot(null);
    }
  };

  const getNextReminderSlot = (): MealSlot => {
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const parseMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    if (nowMin <= parseMin(notificationSettings.breakfast_time)) return 'breakfast';
    if (nowMin <= parseMin(notificationSettings.lunch_time)) return 'lunch';
    return 'dinner';
  };

  return (
    <div className="space-y-6">
      {/* Summary & Actions Header */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 capitalize">
            {activePlan.dietary_preference} · 21 Meals
          </p>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">{activePlan.title}</h2>
          <p className="text-sm text-slate-600 mt-1 tabular-nums">
            Weekly Purchase Cost:{' '}
            <strong className="text-emerald-800">
              {formatMoney(activePlan.total_cost, activePlan.currency)}
            </strong>{' '}
            / {formatMoney(activePlan.weekly_budget, activePlan.currency)} budget · Avg{' '}
            {activePlan.avg_daily_calories} kcal &amp; {activePlan.avg_daily_protein}g protein/day
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-stone-100 hover:bg-stone-200 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{regenerating ? 'Recalculating...' : 'Regenerate Week'}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('shopping-list')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap"
          >
            <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Open Shopping List</span>
          </button>
        </div>
      </div>

      {generatedBannerTitle && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-sm text-emerald-950"
        >
          <p>
            <strong>{generatedBannerTitle}</strong> is ready. Use <strong>Change Day</strong> or{' '}
            <strong>Change Dish</strong> on any meal below to customize your schedule.
          </p>
          {onDismissGeneratedBanner && (
            <button
              type="button"
              onClick={onDismissGeneratedBanner}
              aria-label="Dismiss banner"
              className="p-1 rounded-lg text-emerald-800 hover:bg-emerald-100 shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Meal Time Notifications Card */}
      <section
        aria-label="Meal time notifications"
        className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                notificationSettings.enabled
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-stone-100 text-slate-600'
              }`}
            >
              {notificationSettings.enabled ? (
                <BellRing className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Bell className="w-4 h-4" aria-hidden="true" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Meal Time Notifications</h3>
                <span
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-md ${
                    notificationSettings.enabled
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-stone-100 text-slate-600 border border-stone-200'
                  }`}
                >
                  {notificationSettings.enabled ? 'Active' : 'Paused'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                {notificationSettings.breakfast_enabled ? `Breakfast ${mealTimes.breakfast}` : 'Breakfast off'}
                {' · '}
                {notificationSettings.lunch_enabled ? `Lunch ${mealTimes.lunch}` : 'Lunch off'}
                {' · '}
                {notificationSettings.dinner_enabled ? `Dinner ${mealTimes.dinner}` : 'Dinner off'}
                {notificationSettings.lead_minutes > 0
                  ? ` · ${notificationSettings.lead_minutes} min early`
                  : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {browserPermission === 'default' && notificationSettings.enabled && (
              <button
                type="button"
                onClick={handleRequestBrowserPermission}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors whitespace-nowrap"
              >
                <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Allow Browser Alerts</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleNotifications}
              disabled={savingNotif}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap disabled:opacity-60 ${
                notificationSettings.enabled
                  ? 'bg-stone-100 hover:bg-stone-200 text-slate-800'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              {savingNotif ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : notificationSettings.enabled ? (
                <BellOff className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <BellRing className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>
                {notificationSettings.enabled ? 'Turn Off Reminders' : 'Enable Notifications'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTestSlot(getNextReminderSlot())}
              disabled={testingSlot !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
            >
              {testingSlot !== null ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <BellRing className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>Test Notification</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNotifConfig((v) => !v)}
              aria-expanded={showNotifConfig}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <span>Schedule</span>
              {showNotifConfig ? (
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {notifFeedback && (
          <p className="mt-2.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            {notifFeedback}
          </p>
        )}

        {browserPermission === 'denied' && notificationSettings.enabled && (
          <p className="mt-2.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Browser popup permission is blocked in this view—in-app meal alerts and sound chimes will still notify you while NutriBudget is open.
          </p>
        )}

        {showNotifConfig && (
          <div className="mt-4 pt-4 border-t border-stone-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(
                [
                  {
                    slot: 'breakfast' as const,
                    label: 'Breakfast',
                    enabledKey: 'breakfast_enabled' as const,
                    timeKey: 'breakfast_time' as const,
                  },
                  {
                    slot: 'lunch' as const,
                    label: 'Lunch',
                    enabledKey: 'lunch_enabled' as const,
                    timeKey: 'lunch_time' as const,
                  },
                  {
                    slot: 'dinner' as const,
                    label: 'Dinner',
                    enabledKey: 'dinner_enabled' as const,
                    timeKey: 'dinner_time' as const,
                  },
                ] as const
              ).map((cfg) => (
                <div
                  key={cfg.slot}
                  className="p-3 rounded-lg border border-stone-200 bg-[#FAF9F5] flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifDraft[cfg.enabledKey]}
                        onChange={(e) =>
                          setNotifDraft((prev) => ({
                            ...prev,
                            [cfg.enabledKey]: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
                      />
                      <span>{cfg.label}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleTestSlot(cfg.slot)}
                      disabled={testingSlot !== null}
                      className="px-2 py-1 text-[11px] font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-stone-200 rounded-md transition-colors disabled:opacity-60"
                    >
                      {testingSlot === cfg.slot ? 'Sending...' : 'Test'}
                    </button>
                  </div>
                  <input
                    type="time"
                    value={notifDraft[cfg.timeKey]}
                    disabled={!notifDraft[cfg.enabledKey]}
                    aria-label={`${cfg.label} notification time`}
                    onChange={(e) =>
                      setNotifDraft((prev) => ({
                        ...prev,
                        [cfg.timeKey]: e.target.value,
                      }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-stone-200 rounded-lg text-slate-900 disabled:opacity-50"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 text-xs text-slate-700">
                <span className="font-semibold">Notify me:</span>
                <select
                  value={notifDraft.lead_minutes}
                  onChange={(e) =>
                    setNotifDraft((prev) => ({
                      ...prev,
                      lead_minutes: Number(e.target.value),
                    }))
                  }
                  className="px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-slate-900"
                >
                  <option value={0}>Right at meal time</option>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={45}>45 minutes before</option>
                </select>
              </label>

              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={savingNotif}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
              >
                {savingNotif && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                <span>{savingNotif ? 'Saving...' : 'Save Schedule'}</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Day Filter Bar */}
      <div className="flex items-center gap-1 p-1 bg-stone-200/60 rounded-lg overflow-x-auto">
        <button
          type="button"
          onClick={() => setSelectedDay('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            selectedDay === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All 7 Days
        </button>
        {days.map((d) => (
          <button
            key={d.dayIndex}
            type="button"
            onClick={() => setSelectedDay(d.dayIndex)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              selectedDay === d.dayIndex
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {d.dayName.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* 7-Day Calendar Grid */}
      <div className="space-y-6">
        {visibleDays.map((day) => {
          const isUpdatingDay = changingDay === day.dayIndex;
          return (
            <section key={day.dayIndex} className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-stone-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{day.dayName}</h3>
                  <p className="text-xs text-slate-600 tabular-nums font-mono mt-0.5">
                    {day.dayCalories} kcal · {day.dayProtein}g protein · Est. meal value{' '}
                    {formatMoney(day.dayCost, activePlan.currency)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleChangeDay(day.dayIndex)}
                  disabled={isUpdatingDay || changingDay !== null}
                  aria-label={`Change ${day.dayName} plan`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-stone-100 hover:bg-stone-200 disabled:opacity-60 rounded-lg transition-colors self-start sm:self-auto whitespace-nowrap"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isUpdatingDay ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  <span>{isUpdatingDay ? 'Updating Day...' : 'Change Day'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {day.meals.map((meal: MealPlanItem) => (
                  <article
                    key={`${day.dayIndex}-${meal.meal_slot}`}
                    className="group rounded-xl border border-stone-200 overflow-hidden bg-[#FAF9F5] hover:border-emerald-500 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() => onSelectRecipe(meal.recipe_id)}
                        aria-label={`View ${meal.recipe_title}`}
                        className="block w-full h-36 overflow-hidden bg-stone-100"
                      >
                        <FoodImage
                          src={meal.image_url}
                          alt={meal.recipe_title || 'Meal photo'}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                        />
                      </button>

                      <div className="px-4 pt-3.5 flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-emerald-800 capitalize inline-flex items-center gap-1">
                          <span>
                            {meal.meal_slot} · {mealTimes[meal.meal_slot]}
                          </span>
                          {notificationSettings.enabled &&
                            notificationSettings[`${meal.meal_slot}_enabled`] && (
                              <Bell
                                className="w-3 h-3 text-emerald-700"
                                aria-label="Reminder enabled"
                              />
                            )}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOpenSwapModal(meal)}
                          aria-label={`Change ${day.dayName} ${meal.meal_slot} dish`}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors whitespace-nowrap shrink-0"
                        >
                          <ArrowLeftRight className="w-3 h-3" aria-hidden="true" />
                          <span>Change Dish</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectRecipe(meal.recipe_id)}
                        className="w-full text-left px-4 pt-1.5 pb-3"
                      >
                        <h4 className="text-sm font-semibold text-slate-900 line-clamp-2 hover:text-emerald-800 transition-colors">
                          {meal.recipe_title}
                        </h4>
                      </button>
                    </div>

                    <div className="px-4 py-2.5 border-t border-stone-200/70">
                      <p className="text-xs text-slate-600 tabular-nums font-mono">
                        {meal.calories} kcal · {meal.protein_g}g P ·{' '}
                        {formatMoney(meal.meal_cost, activePlan.currency)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Change Single Dish Modal */}
      {swapTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="swap-dish-title"
        >
          <div className="bg-white rounded-xl border border-stone-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-emerald-800 capitalize">
                  {swapTarget.day_name} · {swapTarget.meal_slot} · {mealTimes[swapTarget.meal_slot]}
                </p>
                <h3 id="swap-dish-title" className="text-lg font-bold text-slate-900">
                  Choose a Different Dish
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSwapTarget(null)}
                aria-label="Close dish selector"
                className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-stone-100"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {swapError && (
              <div
                role="alert"
                className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
              >
                {swapError}
              </div>
            )}

            <div className="p-6 overflow-y-auto space-y-3">
              {loadingChoices ? (
                <div className="py-12 flex items-center justify-center gap-2 text-sm text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Loading eligible dishes...</span>
                </div>
              ) : slotCandidates.length === 0 ? (
                <p className="text-sm text-slate-600 py-8 text-center">
                  No alternative dishes match your current dietary and allergy filters for this slot.
                </p>
              ) : (
                slotCandidates.map((recipe) => {
                  const isCurrent = recipe.id === swapTarget.recipe_id;
                  const isBusy = swappingRecipeId === recipe.id;
                  return (
                    <div
                      key={recipe.id}
                      className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${
                        isCurrent
                          ? 'bg-emerald-50/70 border-emerald-400'
                          : 'bg-[#FAF9F5] border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="w-20 h-16 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                        <FoodImage
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">
                          {recipe.title}
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 tabular-nums font-mono">
                          {recipe.calories} kcal · {recipe.protein_g}g P ·{' '}
                          {formatMoney(recipe.estimated_cost, activePlan.currency)}
                        </p>
                      </div>
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 rounded-lg shrink-0">
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Current</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectDish(recipe.id)}
                          disabled={swappingRecipeId !== null}
                          aria-label={`Select ${recipe.title}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors shrink-0 whitespace-nowrap"
                        >
                          {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                          <span>{isBusy ? 'Saving...' : 'Select'}</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
