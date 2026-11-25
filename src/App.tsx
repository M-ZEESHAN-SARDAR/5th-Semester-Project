import { useCallback, useEffect, useRef, useState } from 'react';
import { BellRing, Clock, UtensilsCrossed, X } from 'lucide-react';
import { api, setAuthToken } from './lib/api';
import { AppShell, type AppRoute } from './components/AppShell';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { GeneratorPage } from './pages/GeneratorPage';
import { PlannerPage } from './pages/PlannerPage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { ShoppingListPage } from './pages/ShoppingListPage';
import { SavedPlansPage } from './pages/SavedPlansPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';
import type {
  MealNotificationPayload,
  MealNotificationSettings,
  MealPlan,
  MealSlot,
  User,
  UserPreferences,
} from './shared/types';

const DEFAULT_NOTIFICATION_SETTINGS: MealNotificationSettings = {
  enabled: false,
  breakfast_enabled: true,
  breakfast_time: '08:00',
  lunch_enabled: true,
  lunch_time: '13:00',
  dinner_enabled: true,
  dinner_time: '19:00',
  lead_minutes: 0,
};

function playReminderChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [587.33, 880]; // D5 -> A5 gentle chime
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      gain.gain.setValueAtTime(0.001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.3);
    });
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 900);
  } catch {
    // Ignore audio context restrictions
  }
}

const DEFAULT_PREFERENCES: UserPreferences = {
  weekly_budget: 7500,
  currency: 'PKR',
  city: 'Lahore',
  daily_calories: 2000,
  protein_g: 90,
  carbs_g: 240,
  fat_g: 60,
  dietary_preference: 'non-vegetarian',
  allergies: [],
  excluded_ingredients: [],
  max_cooking_time_min: 45,
};

const PAGE_TITLES: Record<AppRoute, { title: string; subtitle: string }> = {
  landing: { title: 'NutriBudget', subtitle: 'Meal Planner & Local Grocery Optimizer' },
  auth: { title: 'Sign In', subtitle: 'Access your account' },
  dashboard: { title: 'Nutrition & Budget Dashboard', subtitle: 'Weekly spending, macro progress, and waste overview' },
  generator: { title: 'Meal Plan Generator', subtitle: 'Optimize a 7-day plan against local grocery prices' },
  planner: { title: 'Weekly Meal Planner', subtitle: '21-meal schedule across Monday to Sunday' },
  'recipe-detail': { title: 'Recipe Details', subtitle: 'Database-verified nutrition, instructions, and substitutions' },
  'shopping-list': { title: 'Grocery Shopping List', subtitle: 'Package-rounded ingredients and remaining budget' },
  'saved-plans': { title: 'Saved Meal Plans', subtitle: 'Manage, regenerate, and compare past plans' },
  settings: { title: 'User Settings', subtitle: 'Account profile and default nutritional targets' },
  admin: { title: 'Admin Console', subtitle: 'Manage global ingredients, recipe templates, and system stats' },
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [notificationSettings, setNotificationSettings] = useState<MealNotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [activeReminder, setActiveReminder] = useState<MealNotificationPayload | null>(null);
  const firedRemindersRef = useRef<Set<string>>(new Set());
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [route, setRoute] = useState<AppRoute>('landing');
  const [planGeneratedBanner, setPlanGeneratedBanner] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  const loadNotificationSettings = useCallback(async () => {
    try {
      const settings = await api.getNotificationSettings();
      setNotificationSettings(settings);
    } catch {
      setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
    }
  }, []);

  const loadUserPlans = useCallback(async (preferredPlanId?: number) => {
    try {
      const list = await api.getMealPlans();
      setPlans(list);
      if (preferredPlanId && list.some((p) => p.id === preferredPlanId)) {
        setActivePlanId(preferredPlanId);
      } else if (list.length > 0) {
        setActivePlanId((prev) => (prev && list.some((p) => p.id === prev) ? prev : list[0].id));
      } else {
        setActivePlanId(null);
      }
    } catch {
      setPlans([]);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';

    api
      .session()
      .then(async (res) => {
        if (res.authenticated && res.user && res.preferences) {
          setUser(res.user);
          setPreferences(res.preferences);
          await Promise.all([loadUserPlans(), loadNotificationSettings()]);
          setRoute('dashboard');
          return;
        }
        if (autostart) {
          const demo = await api.demoStudent();
          setAuthToken(demo.token);
          setUser(demo.user);
          setPreferences(demo.preferences);
          await Promise.all([loadUserPlans(), loadNotificationSettings()]);
          setRoute('dashboard');
        }
      })
      .catch(() => setRoute('landing'))
      .finally(() => setInitializing(false));
  }, [loadUserPlans, loadNotificationSettings]);

  const handleAuthSuccess = async (loggedInUser: User, prefs: UserPreferences) => {
    setUser(loggedInUser);
    setPreferences(prefs);
    await Promise.all([loadUserPlans(), loadNotificationSettings()]);
    setRoute(loggedInUser.role === 'admin' ? 'admin' : 'dashboard');
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    setAuthToken(null);
    setUser(null);
    setPlans([]);
    setActivePlanId(null);
    setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
    setActiveReminder(null);
    setRoute('landing');
  };

  const handleNavigate = (nextRoute: AppRoute) => {
    if (!user && nextRoute !== 'landing' && nextRoute !== 'auth') {
      setRoute('auth');
      return;
    }
    if (nextRoute === 'admin' && user?.role !== 'admin') {
      setRoute('dashboard');
      return;
    }
    if (nextRoute !== 'planner') {
      setPlanGeneratedBanner(null);
    }
    setRoute(nextRoute);
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  const activePlan = plans.find((p) => p.id === activePlanId) ?? plans[0] ?? null;

  const dispatchMealNotification = useCallback((payload: MealNotificationPayload) => {
    setActiveReminder(payload);
    playReminderChime();

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const browserNotif = new Notification(payload.title, {
          body: payload.message,
          tag: `nutribudget-${payload.day_index}-${payload.meal_slot}`,
        });
        browserNotif.onclick = () => {
          window.focus();
          if (payload.recipe_id) {
            setSelectedRecipeId(payload.recipe_id);
            setRoute('recipe-detail');
          } else {
            setRoute('planner');
          }
          browserNotif.close();
        };
      } catch {
        // Ignore if browser environment blocks Notification constructor
      }
    }
  }, []);

  const handleSaveNotificationSettings = useCallback(
    async (next: Partial<MealNotificationSettings>) => {
      const saved = await api.updateNotificationSettings(next);
      setNotificationSettings(saved);
      return saved;
    },
    []
  );

  const handleTestNotification = useCallback(
    async (slot: MealSlot) => {
      const now = new Date();
      const dayIndex = (now.getDay() + 6) % 7;
      const res = await api.checkMealNotification({
        plan_id: activePlan?.id,
        day_index: dayIndex,
        force_slot: slot,
      });
      if (res.due) {
        dispatchMealNotification(res.due);
      }
    },
    [activePlan?.id, dispatchMealNotification]
  );

  useEffect(() => {
    if (!user || !notificationSettings.enabled) return;

    const checkSchedule = async () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${hh}:${mm}`;
      const dayIndex = (now.getDay() + 6) % 7;
      const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${currentTime}`;

      if (firedRemindersRef.current.has(dateKey)) return;

      const slotTimes: Array<{ slot: MealSlot; enabled: boolean; time: string }> = [
        {
          slot: 'breakfast',
          enabled: notificationSettings.breakfast_enabled,
          time: notificationSettings.breakfast_time,
        },
        {
          slot: 'lunch',
          enabled: notificationSettings.lunch_enabled,
          time: notificationSettings.lunch_time,
        },
        {
          slot: 'dinner',
          enabled: notificationSettings.dinner_enabled,
          time: notificationSettings.dinner_time,
        },
      ];

      const currentMin = now.getHours() * 60 + now.getMinutes();
      const isDueMinute = slotTimes.some((s) => {
        if (!s.enabled) return false;
        const [sh, sm] = s.time.split(':').map(Number);
        const triggerMin = (sh * 60 + sm - notificationSettings.lead_minutes + 1440) % 1440;
        return triggerMin === currentMin;
      });

      if (!isDueMinute) return;
      firedRemindersRef.current.add(dateKey);

      try {
        const res = await api.checkMealNotification({
          plan_id: activePlan?.id,
          day_index: dayIndex,
          current_time: currentTime,
        });
        if (res.due) {
          dispatchMealNotification(res.due);
        }
      } catch {
        // Ignore transient network errors during background poll
      }
    };

    void checkSchedule();
    const timer = window.setInterval(() => {
      void checkSchedule();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [user, notificationSettings, activePlan?.id, dispatchMealNotification]);

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center text-sm text-slate-600">
        Loading NutriBudget...
      </div>
    );
  }

  if (route === 'landing') {
    return <LandingPage user={user} onNavigate={handleNavigate} />;
  }

  if (route === 'auth' || !user) {
    return <AuthPage onSuccess={handleAuthSuccess} onNavigate={handleNavigate} />;
  }

  const meta = PAGE_TITLES[route];

  return (
    <AppShell
      user={user}
      currentRoute={route}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      pageTitle={meta.title}
      pageSubtitle={meta.subtitle}
    >
      {route === 'dashboard' && (
        <DashboardPage
          activePlan={activePlan}
          preferences={preferences}
          onNavigate={handleNavigate}
          onSelectRecipe={(recId) => {
            setSelectedRecipeId(recId);
            handleNavigate('recipe-detail');
          }}
        />
      )}

      {route === 'generator' && (
        <GeneratorPage
          preferences={preferences}
          onPlanGenerated={(newPlan, updatedPrefs) => {
            setPreferences(updatedPrefs);
            setPlans((prev) => [newPlan, ...prev.filter((p) => p.id !== newPlan.id)]);
            setActivePlanId(newPlan.id);
            setPlanGeneratedBanner(newPlan.title);
            setRoute('planner');
            try {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch {
              window.scrollTo(0, 0);
            }
          }}
        />
      )}

      {route === 'planner' && (
        <PlannerPage
          activePlan={activePlan}
          preferences={preferences}
          notificationSettings={notificationSettings}
          generatedBannerTitle={planGeneratedBanner}
          onDismissGeneratedBanner={() => setPlanGeneratedBanner(null)}
          onSaveNotificationSettings={handleSaveNotificationSettings}
          onTestNotification={handleTestNotification}
          onSelectRecipe={(recId) => {
            setSelectedRecipeId(recId);
            handleNavigate('recipe-detail');
          }}
          onPlanUpdated={(updatedPlan) => {
            setPlans((prev) => [updatedPlan, ...prev.filter((p) => p.id !== updatedPlan.id)]);
            setActivePlanId(updatedPlan.id);
          }}
          onNavigate={handleNavigate}
        />
      )}

      {route === 'recipe-detail' && (
        <RecipeDetailPage
          recipeId={selectedRecipeId}
          currency={activePlan?.currency ?? preferences.currency}
          activePlan={activePlan}
          onNavigate={handleNavigate}
        />
      )}

      {route === 'shopping-list' && (
        <ShoppingListPage
          activePlan={activePlan}
          onPlanUpdated={(updated) => {
            setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          }}
          onNavigate={handleNavigate}
        />
      )}

      {route === 'saved-plans' && (
        <SavedPlansPage
          plans={plans}
          activePlanId={activePlan?.id ?? null}
          onSelectPlan={(plan, target = 'planner') => {
            setPlans((prev) => [plan, ...prev.filter((p) => p.id !== plan.id)]);
            setActivePlanId(plan.id);
            if (target === 'planner') {
              setPlanGeneratedBanner(plan.title);
            }
            handleNavigate(target);
          }}
          onPlansChanged={(preferredId) => loadUserPlans(preferredId)}
          onNavigate={handleNavigate}
        />
      )}

      {route === 'settings' && (
        <SettingsPage
          user={user}
          preferences={preferences}
          onPreferencesSaved={setPreferences}
        />
      )}

      {route === 'admin' && user.role === 'admin' && <AdminPage currentUserId={user.id} />}

      {/* Active Meal Reminder Toast */}
      {activeReminder && (
        <aside
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] bg-white border border-emerald-300 rounded-xl shadow-xl p-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  <span>{activeReminder.title}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setActiveReminder(null)}
                  aria-label="Dismiss meal notification"
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-stone-100"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                {activeReminder.recipe_title}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">{activeReminder.message}</p>
              <div className="mt-3 flex items-center gap-2">
                {activeReminder.recipe_id && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = activeReminder.recipe_id!;
                      setActiveReminder(null);
                      setSelectedRecipeId(id);
                      handleNavigate('recipe-detail');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>View Recipe</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveReminder(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}
    </AppShell>
  );
}
