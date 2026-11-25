import { useState, type ReactNode } from 'react';
import {
  BookmarkCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { User } from '../shared/types';

export type AppRoute =
  | 'landing'
  | 'auth'
  | 'dashboard'
  | 'generator'
  | 'planner'
  | 'recipe-detail'
  | 'shopping-list'
  | 'saved-plans'
  | 'settings'
  | 'admin';

interface AppShellProps {
  user: User;
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  onLogout: () => void;
  pageTitle: string;
  pageSubtitle?: string;
  headerAction?: ReactNode;
  children: ReactNode;
}

export function AppShell({
  user,
  currentRoute,
  onNavigate,
  onLogout,
  pageTitle,
  pageSubtitle,
  headerAction,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: Array<{ id: AppRoute; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'generator', label: 'Meal Generator', icon: SlidersHorizontal },
    { id: 'planner', label: 'Weekly Planner', icon: CalendarDays },
    { id: 'shopping-list', label: 'Shopping List', icon: ShoppingCart },
    { id: 'saved-plans', label: 'Saved Plans', icon: BookmarkCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
    ...(user.role === 'admin' ? [{ id: 'admin' as AppRoute, label: 'Admin Console', icon: ShieldCheck, adminOnly: true }] : []),
  ];

  const handleNav = (route: AppRoute) => {
    onNavigate(route);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-[#FAF9F5] text-slate-900">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`no-print fixed lg:sticky top-0 left-0 z-50 h-screen bg-white border-r border-stone-200 flex flex-col transition-all duration-200 ${
          collapsed ? 'lg:w-[76px]' : 'lg:w-[248px]'
        } ${mobileOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full lg:translate-x-0'}`}
        aria-label="Primary sidebar"
      >
        <div className="h-16 px-4 border-b border-stone-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => handleNav('landing')}
            className="text-lg font-bold tracking-tight text-emerald-900 whitespace-nowrap overflow-hidden text-ellipsis focus-visible:outline-2 focus-visible:outline-emerald-600 rounded"
          >
            {collapsed ? 'NB' : 'NutriBudget'}
          </button>

          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-stone-100 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              currentRoute === item.id || (currentRoute === 'recipe-detail' && item.id === 'planner');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                title={collapsed ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-700 hover:bg-stone-100 hover:text-slate-900'
                } ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-stone-200 space-y-2">
          {!collapsed && (
            <div className="px-3 py-2 bg-[#FAF9F5] rounded-lg border border-stone-200/80">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">
                {user.role === 'admin' ? 'Administrator' : 'Student Member'} · {user.email}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors whitespace-nowrap ${
              collapsed ? 'lg:justify-center lg:px-0' : ''
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="no-print h-16 bg-white/95 backdrop-blur border-b border-stone-200 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-stone-200 text-slate-700 hover:bg-stone-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">{pageTitle}</h1>
              {pageSubtitle && (
                <p className="hidden sm:block text-xs text-slate-500 truncate">{pageSubtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {headerAction}
            <button
              type="button"
              onClick={() => onNavigate('generator')}
              className="hidden sm:inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              New Meal Plan
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
