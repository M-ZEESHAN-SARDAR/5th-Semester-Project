import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  BellRing,
  Check,
  Download,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import {
  api,
  formatMoney,
  type AdminMealPlanRow,
  type AdminStats,
  type AdminUserRow,
} from '../lib/api';
import type { DietaryPreference, IngredientWithPrice, MealSlot, Recipe } from '../shared/types';

interface AdminPageProps {
  currentUserId: number;
}

type AdminTab = 'overview' | 'users' | 'ingredients' | 'recipes' | 'plans';

const INGREDIENT_CATEGORIES = [
  'Grains',
  'Protein',
  'Legumes',
  'Dairy',
  'Vegetables',
  'Fruits',
  'Nuts',
  'Oils',
  'Pantry',
];

function escapeCsv(val: string | number | boolean | null | undefined): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>): void {
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((r) => r.map(escapeCsv).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminPage({ currentUserId }: AdminPageProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [ingredients, setIngredients] = useState<IngredientWithPrice[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlans, setMealPlans] = useState<AdminMealPlanRow[]>([]);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // User filters & confirm delete
  const [userQuery, setUserQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<number | null>(null);

  // Ingredient filters, add form, and inline edit
  const [ingQuery, setIngQuery] = useState('');
  const [ingCatFilter, setIngCatFilter] = useState('All');
  const [ingStatusFilter, setIngStatusFilter] = useState<'all' | 'verified' | 'estimated'>('all');
  const [newIngName, setNewIngName] = useState('');
  const [newIngCategory, setNewIngCategory] = useState('Vegetables');
  const [newIngPack, setNewIngPack] = useState('');
  const [newIngPrice, setNewIngPrice] = useState('');
  const [newIngCal, setNewIngCal] = useState('');
  const [newIngProt, setNewIngProt] = useState('');
  const [newIngCarb, setNewIngCarb] = useState('');
  const [newIngFat, setNewIngFat] = useState('');
  const [newIngAllergen, setNewIngAllergen] = useState('');
  const [newIngStatus, setNewIngStatus] = useState<'verified' | 'estimated'>('verified');
  const [newIngVeg, setNewIngVeg] = useState(true);

  const [editingIngId, setEditingIngId] = useState<number | null>(null);
  const [editIngDraft, setEditIngDraft] = useState<{
    package_price: number;
    package_size_g: number;
    category: string;
    price_status: 'verified' | 'estimated';
  }>({ package_price: 0, package_size_g: 0, category: 'Vegetables', price_status: 'verified' });

  // Recipe filters & multi-ingredient builder/editor
  const [recQuery, setRecQuery] = useState('');
  const [recSlotFilter, setRecSlotFilter] = useState<'all' | MealSlot>('all');
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);
  const [newRecTitle, setNewRecTitle] = useState('');
  const [newRecDesc, setNewRecDesc] = useState('');
  const [newRecSlot, setNewRecSlot] = useState<MealSlot>('lunch');
  const [newRecDiet, setNewRecDiet] = useState<DietaryPreference>('vegetarian');
  const [newRecIngredients, setNewRecIngredients] = useState<Array<{ ingredient_id: number; quantity_g: number }>>([]);
  const [newRecInstructionsText, setNewRecInstructionsText] = useState(
    'Prepare and rinse fresh ingredients cleanly.\nCook on medium heat until tender and serve hot.'
  );

  // Plans search
  const [planQuery, setPlanQuery] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [s, uList, ings, recs, plansList] = await Promise.all([
        api.getAdminStats(),
        api.adminGetUsers(),
        api.getIngredients(),
        api.getRecipes('PKR'),
        api.adminGetMealPlans(),
      ]);
      setStats(s);
      setUsers(uList);
      setIngredients(ings);
      setRecipes(recs);
      setMealPlans(plansList);
      setNewRecIngredients((prev) => {
        if (prev.length > 0 || ings.length === 0) return prev;
        return [{ ingredient_id: ings[0].id, quantity_g: 120 }];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin console.');
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const ingMap = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);

  const recipeDraftStats = useMemo(() => {
    let calories = 0;
    let protein = 0;
    let cost = 0;
    for (const item of newRecIngredients) {
      const ing = ingMap.get(item.ingredient_id);
      if (!ing) continue;
      const factor = item.quantity_g / 100;
      calories += ing.calories_per_100g * factor;
      protein += ing.protein_per_100g * factor;
      cost += (ing.package_price / Math.max(1, ing.package_size_g)) * item.quantity_g;
    }
    return {
      calories: Math.round(calories),
      protein: Math.round(protein),
      cost: Math.round(cost),
    };
  }, [newRecIngredients, ingMap]);

  const resetRecipeForm = () => {
    setEditingRecipeId(null);
    setNewRecTitle('');
    setNewRecDesc('');
    setNewRecSlot('lunch');
    setNewRecDiet('vegetarian');
    setNewRecIngredients(
      ingredients.length > 0 ? [{ ingredient_id: ingredients[0].id, quantity_g: 120 }] : []
    );
    setNewRecInstructionsText(
      'Prepare and rinse fresh ingredients cleanly.\nCook on medium heat until tender and serve hot.'
    );
  };

  const handleToggleUserRole = async (u: AdminUserRow) => {
    setError(null);
    setNotice(null);
    const nextRole = u.role === 'admin' ? 'user' : 'admin';
    try {
      await api.adminUpdateUserRole(u.id, nextRole);
      setNotice(`Updated ${u.name}'s role to ${nextRole}.`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update user role.');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    setError(null);
    setNotice(null);
    try {
      await api.adminDeleteUser(userId);
      setConfirmDeleteUserId(null);
      setNotice('User account removed.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete user.');
    }
  };

  const handleAddIngredient = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const packSize = Number(newIngPack);
    const price = Number(newIngPrice);
    if (!Number.isFinite(packSize) || packSize < 10) {
      setError('Enter a valid pack size in grams (at least 10g).');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError('Enter a valid package price in PKR.');
      return;
    }
    try {
      await api.adminCreateIngredient({
        name: newIngName,
        category: newIngCategory,
        package_size_g: packSize,
        measurement_unit: 'g',
        calories_per_100g: newIngCal === '' ? 0 : Number(newIngCal),
        protein_per_100g: newIngProt === '' ? 0 : Number(newIngProt),
        carbs_per_100g: newIngCarb === '' ? 0 : Number(newIngCarb),
        fat_per_100g: newIngFat === '' ? 0 : Number(newIngFat),
        allergen_tag: newIngAllergen.trim() || null,
        is_vegetarian: newIngVeg,
        package_price: price,
        price_status: newIngStatus,
      });
      setNotice(`Added ingredient "${newIngName.trim()}".`);
      setNewIngName('');
      setNewIngPack('');
      setNewIngPrice('');
      setNewIngCal('');
      setNewIngProt('');
      setNewIngCarb('');
      setNewIngFat('');
      setNewIngAllergen('');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add ingredient.');
    }
  };

  const startEditIngredient = (ing: IngredientWithPrice) => {
    setEditingIngId(ing.id);
    setEditIngDraft({
      package_price: ing.package_price,
      package_size_g: ing.package_size_g,
      category: ing.category,
      price_status: ing.price_status,
    });
  };

  const handleSaveIngredient = async (ingId: number) => {
    setError(null);
    setNotice(null);
    try {
      await api.adminUpdateIngredient(ingId, editIngDraft);
      setEditingIngId(null);
      setNotice('Ingredient catalog updated.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ingredient.');
    }
  };

  const handleDeleteIngredient = async (id: number) => {
    setError(null);
    setNotice(null);
    try {
      await api.adminDeleteIngredient(id);
      setNotice('Ingredient deleted from catalog.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete ingredient.');
    }
  };

  const handleStartEditRecipe = (r: Recipe) => {
    setEditingRecipeId(r.id);
    setNewRecTitle(r.title);
    setNewRecDesc(r.description);
    setNewRecSlot(r.meal_slot);
    setNewRecDiet(r.dietary_tag);
    setNewRecIngredients(
      r.ingredients.map((ri) => ({
        ingredient_id: ri.ingredient_id,
        quantity_g: ri.quantity_g,
      }))
    );
    setNewRecInstructionsText(r.instructions.join('\n'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveRecipe = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const steps = newRecInstructionsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      title: newRecTitle,
      description: newRecDesc,
      meal_slot: newRecSlot,
      dietary_tag: newRecDiet,
      instructions: steps,
      ingredients: newRecIngredients,
    };

    try {
      if (editingRecipeId) {
        await api.adminUpdateRecipe(editingRecipeId, payload);
        setNotice(`Updated recipe "${newRecTitle.trim()}".`);
      } else {
        await api.adminCreateRecipe(payload);
        setNotice(`Created recipe "${newRecTitle.trim()}".`);
      }
      resetRecipeForm();
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save recipe.');
    }
  };

  const handleDeleteRecipe = async (id: number) => {
    setError(null);
    setNotice(null);
    try {
      await api.adminDeleteRecipe(id);
      if (editingRecipeId === id) resetRecipeForm();
      setNotice('Recipe template removed.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete recipe.');
    }
  };

  const handleDeleteMealPlan = async (planId: number) => {
    setError(null);
    setNotice(null);
    try {
      await api.adminDeleteMealPlan(planId);
      setNotice('Meal plan removed.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete meal plan.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const q = userQuery.trim().toLowerCase();
    const matchesQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    return matchesRole && matchesQ;
  });

  const filteredIngredients = ingredients.filter((i) => {
    const matchesCat = ingCatFilter === 'All' || i.category === ingCatFilter;
    const matchesStatus = ingStatusFilter === 'all' || i.price_status === ingStatusFilter;
    const q = ingQuery.trim().toLowerCase();
    const matchesQ = !q || i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q);
    return matchesCat && matchesStatus && matchesQ;
  });

  const filteredRecipes = recipes.filter((r) => {
    const matchesSlot = recSlotFilter === 'all' || r.meal_slot === recSlotFilter;
    const q = recQuery.trim().toLowerCase();
    const matchesQ =
      !q ||
      r.title.toLowerCase().includes(q) ||
      r.ingredients.some((ing) => ing.ingredient_name.toLowerCase().includes(q));
    return matchesSlot && matchesQ;
  });

  const filteredPlans = mealPlans.filter((p) => {
    const q = planQuery.trim().toLowerCase();
    return (
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.user_name.toLowerCase().includes(q) ||
      p.user_email.toLowerCase().includes(q)
    );
  });

  const verifiedPct =
    stats && stats.ingredientsCount > 0
      ? Math.round((stats.verifiedPricesCount / stats.ingredientsCount) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-200/60 rounded-lg w-fit">
        {(
          [
            { id: 'overview', label: 'System Overview' },
            { id: 'users', label: `Manage Users (${users.length})` },
            { id: 'ingredients', label: `Ingredients & Prices (${ingredients.length})` },
            { id: 'recipes', label: `Manage Recipes (${recipes.length})` },
            { id: 'plans', label: `Meal Plans (${mealPlans.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setError(null);
              setNotice(null);
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              tab === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          {error}
        </div>
      )}

      {notice && (
        <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
          {notice}
        </div>
      )}

      {/* TAB 1: SYSTEM OVERVIEW */}
      {tab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Registered Users</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">{stats.usersCount}</p>
              <p className="text-[11px] text-slate-500 mt-1 inline-flex items-center gap-1">
                <BellRing className="w-3 h-3 text-emerald-700" aria-hidden="true" />
                <span>{stats.activeRemindersCount} reminders active</span>
              </p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Ingredients</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {stats.ingredientsCount}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">{verifiedPct}% verified pricing</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Verified Prices</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-emerald-800 mt-1">
                {stats.verifiedPricesCount}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Global PKR catalog</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Recipe Templates</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">{stats.recipesCount}</p>
              <p className="text-[11px] text-slate-500 mt-1">Breakfast, lunch &amp; dinner</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Saved Meal Plans</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">{stats.plansCount}</p>
              <p className="text-[11px] text-slate-500 mt-1">Generated weeks</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Avg Plan Cost / Budget</p>
              <p className="text-lg font-bold font-mono tabular-nums text-emerald-800 mt-1">
                {formatMoney(stats.avgCost, 'PKR')}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                Cap avg {formatMoney(stats.avgBudget, 'PKR')}
              </p>
            </div>
          </div>

          {/* Analytics Row: Top Recipes & Dietary Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-stone-200 rounded-xl p-6">
              <h3 className="text-base font-bold text-slate-900 mb-3">Most Scheduled Recipes</h3>
              {stats.topRecipes.length === 0 ? (
                <p className="text-xs text-slate-500">No meal plan data recorded yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {stats.topRecipes.map((r, idx) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[#FAF9F5] border border-stone-200/80"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {idx + 1}. {r.title}
                        </p>
                        <p className="text-xs text-slate-500 capitalize">{r.meal_slot}</p>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md shrink-0">
                        {r.usage_count} meals
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-6">
              <h3 className="text-base font-bold text-slate-900 mb-3">Meal Plan Dietary Breakdown</h3>
              {stats.dietBreakdown.length === 0 ? (
                <p className="text-xs text-slate-500">No saved meal plans yet.</p>
              ) : (
                <div className="space-y-3">
                  {stats.dietBreakdown.map((d) => {
                    const share =
                      stats.plansCount > 0 ? Math.round((d.count / stats.plansCount) * 100) : 0;
                    return (
                      <div key={d.dietary_preference} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 capitalize">
                            {d.dietary_preference}
                          </span>
                          <span className="font-mono text-slate-600 tabular-nums">
                            {d.count} plans ({share}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-700 rounded-full"
                            style={{ width: `${Math.max(4, share)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Recent Accounts</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-[#FAF9F5] border-b border-stone-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Name</th>
                    <th className="py-2.5 px-4 font-semibold">Email</th>
                    <th className="py-2.5 px-4 font-semibold">Role</th>
                    <th className="py-2.5 px-4 font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {stats.recentUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{u.name}</td>
                      <td className="py-2.5 px-4 text-slate-600">{u.email}</td>
                      <td className="py-2.5 px-4 capitalize text-emerald-800 font-medium">{u.role}</td>
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-500">{u.created_at.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MANAGE USERS */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>

            <div className="flex items-center gap-2">
              {(['all', 'user', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setUserRoleFilter(r)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border capitalize ${
                    userRoleFilter === r
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {r === 'all' ? 'All Roles' : r}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-[#FAF9F5] border-b border-stone-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">User</th>
                    <th className="py-2.5 px-4 font-semibold">Role</th>
                    <th className="py-2.5 px-4 font-semibold">Preference</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Budget</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Plans</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Reminders</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === currentUserId;
                    return (
                      <tr key={u.id}>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">
                            {u.name}{' '}
                            {isSelf && (
                              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md capitalize ${
                              u.role === 'admin'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-stone-100 text-slate-700'
                            }`}
                          >
                            {u.role === 'admin' && <Shield className="w-3 h-3" aria-hidden="true" />}
                            <span>{u.role}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs capitalize text-slate-700">{u.dietary_preference}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                          {formatMoney(u.weekly_budget, 'PKR')}
                        </td>
                        <td className="py-3 px-4 text-center font-mono tabular-nums">{u.plans_count}</td>
                        <td className="py-3 px-4 text-center text-xs">
                          <span
                            className={`px-2 py-0.5 rounded-md font-medium ${
                              u.reminders_enabled
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-stone-100 text-slate-500'
                            }`}
                          >
                            {u.reminders_enabled ? 'Active' : 'Off'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isSelf ? (
                            <span className="text-xs text-slate-400">Protected</span>
                          ) : (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleUserRole(u)}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors whitespace-nowrap"
                              >
                                {u.role === 'admin' ? 'Set User' : 'Make Admin'}
                              </button>
                              {confirmDeleteUserId === u.id ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteUserId(null)}
                                    className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteUserId(u.id)}
                                  aria-label={`Delete ${u.name}`}
                                  className="px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 rounded-md"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MANAGE INGREDIENTS & GLOBAL PRICES */}
      {tab === 'ingredients' && (
        <div className="space-y-6">
          <form onSubmit={handleAddIngredient} className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Add Global Ingredient &amp; Nutritional Data</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter package pricing and nutrition values per 100 grams for the global catalog.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="new-ing-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Ingredient Name
                </label>
                <input
                  id="new-ing-name"
                  type="text"
                  required
                  placeholder="Enter ingredient name (e.g. Red Lentils)"
                  value={newIngName}
                  onChange={(e) => setNewIngName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="new-ing-cat" className="block text-xs font-medium text-slate-700 mb-1">
                  Category
                </label>
                <select
                  id="new-ing-cat"
                  value={newIngCategory}
                  onChange={(e) => setNewIngCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
                >
                  {INGREDIENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="new-ing-pack" className="block text-xs font-medium text-slate-700 mb-1">
                  Pack Size (grams)
                </label>
                <input
                  id="new-ing-pack"
                  type="number"
                  required
                  min={10}
                  placeholder="Weight in g (e.g. 1000)"
                  value={newIngPack}
                  onChange={(e) => setNewIngPack(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="new-ing-price" className="block text-xs font-medium text-slate-700 mb-1">
                  Package Price (PKR)
                </label>
                <input
                  id="new-ing-price"
                  type="number"
                  required
                  min={1}
                  placeholder="Price in PKR (e.g. 320)"
                  value={newIngPrice}
                  onChange={(e) => setNewIngPrice(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
              <div>
                <label htmlFor="new-ing-cal" className="block text-xs font-medium text-slate-700 mb-1">
                  Calories (kcal / 100g)
                </label>
                <input
                  id="new-ing-cal"
                  type="number"
                  min={0}
                  step="0.1"
                  required
                  placeholder="kcal/100g (e.g. 350)"
                  value={newIngCal}
                  onChange={(e) => setNewIngCal(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="new-ing-prot" className="block text-xs font-medium text-slate-700 mb-1">
                  Protein (g / 100g)
                </label>
                <input
                  id="new-ing-prot"
                  type="number"
                  min={0}
                  step="0.1"
                  required
                  placeholder="Protein g (e.g. 24)"
                  value={newIngProt}
                  onChange={(e) => setNewIngProt(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="new-ing-carb" className="block text-xs font-medium text-slate-700 mb-1">
                  Carbs (g / 100g)
                </label>
                <input
                  id="new-ing-carb"
                  type="number"
                  min={0}
                  step="0.1"
                  required
                  placeholder="Carbs g (e.g. 60)"
                  value={newIngCarb}
                  onChange={(e) => setNewIngCarb(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="new-ing-fat" className="block text-xs font-medium text-slate-700 mb-1">
                  Fat (g / 100g)
                </label>
                <input
                  id="new-ing-fat"
                  type="number"
                  min={0}
                  step="0.1"
                  required
                  placeholder="Fat g (e.g. 1.5)"
                  value={newIngFat}
                  onChange={(e) => setNewIngFat(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="new-ing-allergen" className="block text-xs font-medium text-slate-700 mb-1">
                  Allergen (optional)
                </label>
                <input
                  id="new-ing-allergen"
                  type="text"
                  placeholder="e.g. dairy, nuts, gluten"
                  value={newIngAllergen}
                  onChange={(e) => setNewIngAllergen(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="new-ing-status" className="block text-xs font-medium text-slate-700 mb-1">
                  Price Status
                </label>
                <select
                  id="new-ing-status"
                  value={newIngStatus}
                  onChange={(e) => setNewIngStatus(e.target.value as 'verified' | 'estimated')}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
                >
                  <option value="verified">Verified</option>
                  <option value="estimated">Estimated</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={newIngVeg}
                  onChange={(e) => setNewIngVeg(e.target.checked)}
                  className="accent-emerald-700"
                />
                <span>Vegetarian-safe ingredient</span>
              </label>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Add Ingredient</span>
              </button>
            </div>
          </form>

          {/* Search & Export Bar */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="search"
                  value={ingQuery}
                  onChange={(e) => setIngQuery(e.target.value)}
                  placeholder="Search ingredients..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg"
                />
              </div>
              <select
                value={ingCatFilter}
                onChange={(e) => setIngCatFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
              >
                <option value="All">All Categories</option>
                {INGREDIENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={ingStatusFilter}
                onChange={(e) => setIngStatusFilter(e.target.value as 'all' | 'verified' | 'estimated')}
                className="px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="verified">Verified Only</option>
                <option value="estimated">Estimated Only</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  'nutribudget-ingredients.csv',
                  ['ID', 'Name', 'Category', 'Pack (g)', 'Price (PKR)', 'Status', 'Calories/100g', 'Protein/100g'],
                  filteredIngredients.map((i) => [
                    i.id,
                    i.name,
                    i.category,
                    i.package_size_g,
                    i.package_price,
                    i.price_status,
                    i.calories_per_100g,
                    i.protein_per_100g,
                  ])
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-stone-100 hover:bg-stone-200 rounded-lg whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-[#FAF9F5] border-b border-stone-200 text-slate-600 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Ingredient</th>
                    <th className="py-2.5 px-4 font-semibold">Category</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Pack (g)</th>
                    <th className="py-2.5 px-4 font-semibold text-right">PKR Price</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredIngredients.map((i) => {
                    const isEditing = editingIngId === i.id;
                    return (
                      <tr key={i.id}>
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          {i.name}
                          {i.allergen_tag && (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-amber-50 text-amber-800 border border-amber-200 rounded capitalize">
                              {i.allergen_tag}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {isEditing ? (
                            <select
                              value={editIngDraft.category}
                              onChange={(e) =>
                                setEditIngDraft((d) => ({ ...d, category: e.target.value }))
                              }
                              className="px-2 py-1 text-xs border border-stone-300 rounded bg-white"
                            >
                              {INGREDIENT_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          ) : (
                            i.category
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                          {isEditing ? (
                            <input
                              type="number"
                              min={10}
                              aria-label="Pack size in grams"
                              placeholder="Grams"
                              value={editIngDraft.package_size_g}
                              onChange={(e) =>
                                setEditIngDraft((d) => ({
                                  ...d,
                                  package_size_g: Number(e.target.value),
                                }))
                              }
                              className="w-20 px-2 py-1 text-xs font-mono text-right border border-stone-300 rounded"
                            />
                          ) : (
                            `${i.package_size_g}g`
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                          {isEditing ? (
                            <input
                              type="number"
                              min={1}
                              aria-label="Package price in PKR"
                              placeholder="PKR"
                              value={editIngDraft.package_price}
                              onChange={(e) =>
                                setEditIngDraft((d) => ({
                                  ...d,
                                  package_price: Number(e.target.value),
                                }))
                              }
                              className="w-24 px-2 py-1 text-xs font-mono text-right border border-stone-300 rounded"
                            />
                          ) : (
                            `PKR ${i.package_price}`
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {isEditing ? (
                            <select
                              value={editIngDraft.price_status}
                              onChange={(e) =>
                                setEditIngDraft((d) => ({
                                  ...d,
                                  price_status: e.target.value as 'verified' | 'estimated',
                                }))
                              }
                              className="px-2 py-1 text-xs border border-stone-300 rounded bg-white"
                            >
                              <option value="verified">verified</option>
                              <option value="estimated">estimated</option>
                            </select>
                          ) : (
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-md capitalize ${
                                i.price_status === 'verified'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {i.price_status}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveIngredient(i.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded"
                              >
                                <Check className="w-3 h-3" aria-hidden="true" />
                                <span>Save</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingIngId(null)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-slate-900"
                              >
                                <X className="w-3 h-3" aria-hidden="true" />
                                <span>Cancel</span>
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => startEditIngredient(i)}
                                aria-label={`Edit ${i.name}`}
                                className="text-xs font-semibold text-emerald-800 hover:underline inline-flex items-center gap-1"
                              >
                                <Pencil className="w-3 h-3" aria-hidden="true" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteIngredient(i.id)}
                                aria-label={`Delete ${i.name}`}
                                className="text-xs text-red-700 hover:underline inline-flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Remove</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MANAGE RECIPES */}
      {tab === 'recipes' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveRecipe} className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingRecipeId ? 'Edit Recipe Template' : 'Create Multi-Ingredient Recipe Template'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums font-mono">
                  Live preview: {recipeDraftStats.calories} kcal · {recipeDraftStats.protein}g protein · Est.{' '}
                  {formatMoney(recipeDraftStats.cost, 'PKR')}
                </p>
              </div>
              {editingRecipeId && (
                <button
                  type="button"
                  onClick={resetRecipeForm}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
                >
                  Cancel Editing
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder="Recipe title"
                value={newRecTitle}
                onChange={(e) => setNewRecTitle(e.target.value)}
                className="px-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
              <select
                value={newRecSlot}
                onChange={(e) => setNewRecSlot(e.target.value as MealSlot)}
                className="px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
              </select>
              <select
                value={newRecDiet}
                onChange={(e) => setNewRecDiet(e.target.value as DietaryPreference)}
                className="px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
              >
                <option value="vegetarian">Vegetarian</option>
                <option value="non-vegetarian">Non-Vegetarian</option>
                <option value="high-protein">High-Protein</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Short appetizing description"
              value={newRecDesc}
              onChange={(e) => setNewRecDesc(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />

            {/* Multi-ingredient rows */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Ingredients &amp; Weights (g)</span>
                <button
                  type="button"
                  onClick={() => {
                    if (ingredients.length === 0) return;
                    setNewRecIngredients((prev) => [
                      ...prev,
                      { ingredient_id: ingredients[0].id, quantity_g: 100 },
                    ]);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Add Ingredient</span>
                </button>
              </div>
              <div className="space-y-2">
                {newRecIngredients.map((row, idx) => (
                  <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <select
                      value={row.ingredient_id}
                      onChange={(e) => {
                        const nextId = Number(e.target.value);
                        setNewRecIngredients((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, ingredient_id: nextId } : item))
                        );
                      }}
                      className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
                    >
                      {ingredients.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.category})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={row.quantity_g}
                      onChange={(e) => {
                        const qty = Number(e.target.value);
                        setNewRecIngredients((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, quantity_g: qty } : item))
                        );
                      }}
                      className="w-28 px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg"
                    />
                    {newRecIngredients.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setNewRecIngredients((prev) => prev.filter((_, i) => i !== idx))
                        }
                        aria-label="Remove ingredient row"
                        className="p-2 text-red-700 hover:bg-red-50 rounded-lg"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="rec-steps" className="block text-xs font-semibold text-slate-700 mb-1">
                Cooking Instructions (one step per line)
              </label>
              <textarea
                id="rec-steps"
                rows={3}
                value={newRecInstructionsText}
                onChange={(e) => setNewRecInstructionsText(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
            >
              {editingRecipeId ? (
                <Check className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Plus className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{editingRecipeId ? 'Save Recipe Changes' : 'Add Recipe Template'}</span>
            </button>
          </form>

          {/* Recipe Filter Bar */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={recQuery}
                onChange={(e) => setRecQuery(e.target.value)}
                placeholder="Search recipes or ingredients..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              {(['all', 'breakfast', 'lunch', 'dinner'] as const).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setRecSlotFilter(slot)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border capitalize ${
                    recSlotFilter === slot
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {slot === 'all' ? 'All Slots' : slot}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-[#FAF9F5] border-b border-stone-200 text-slate-600 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Recipe</th>
                    <th className="py-2.5 px-4 font-semibold">Slot</th>
                    <th className="py-2.5 px-4 font-semibold">Diet</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Calories</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Est. Cost</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredRecipes.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 px-4">
                        <p className="font-medium text-slate-900">{r.title}</p>
                        <p className="text-xs text-slate-500">
                          {r.ingredients.length} ingredients · {r.protein_g}g protein
                        </p>
                      </td>
                      <td className="py-2.5 px-4 capitalize text-slate-600">{r.meal_slot}</td>
                      <td className="py-2.5 px-4 capitalize text-slate-600">{r.dietary_tag}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{r.calories} kcal</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">PKR {r.estimated_cost}</td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleStartEditRecipe(r)}
                            className="text-xs font-semibold text-emerald-800 hover:underline inline-flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" aria-hidden="true" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecipe(r.id)}
                            className="text-xs text-red-700 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MEAL PLANS & ACTIVITY */}
      {tab === 'plans' && (
        <div className="space-y-4">
          <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={planQuery}
                onChange={(e) => setPlanQuery(e.target.value)}
                placeholder="Search plans by title or user..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  'nutribudget-meal-plans.csv',
                  ['ID', 'Title', 'User', 'Email', 'Diet', 'Total Cost (PKR)', 'Budget Cap (PKR)', 'Avg Calories', 'Avg Protein', 'Created'],
                  filteredPlans.map((p) => [
                    p.id,
                    p.title,
                    p.user_name,
                    p.user_email,
                    p.dietary_preference,
                    p.total_cost,
                    p.weekly_budget,
                    p.avg_daily_calories,
                    p.avg_daily_protein,
                    p.created_at,
                  ])
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-stone-100 hover:bg-stone-200 rounded-lg whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-[#FAF9F5] border-b border-stone-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Plan</th>
                    <th className="py-2.5 px-4 font-semibold">User</th>
                    <th className="py-2.5 px-4 font-semibold">Diet</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Cost / Cap</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Daily Avg</th>
                    <th className="py-2.5 px-4 font-semibold">Created</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredPlans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                        No meal plans match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredPlans.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{p.title}</td>
                        <td className="py-2.5 px-4">
                          <p className="text-xs font-semibold text-slate-800">{p.user_name}</p>
                          <p className="text-[11px] text-slate-500">{p.user_email}</p>
                        </td>
                        <td className="py-2.5 px-4 capitalize text-xs text-slate-600">
                          {p.dietary_preference}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs">
                          <span className="font-semibold text-emerald-800">
                            {formatMoney(p.total_cost, 'PKR')}
                          </span>
                          {' / '}
                          {formatMoney(p.weekly_budget, 'PKR')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                          {p.avg_daily_calories} kcal · {Math.round(p.avg_daily_protein)}g P
                        </td>
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-500">
                          {p.created_at.slice(0, 10)}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteMealPlan(p.id)}
                            className="text-xs text-red-700 hover:underline inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Remove</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
