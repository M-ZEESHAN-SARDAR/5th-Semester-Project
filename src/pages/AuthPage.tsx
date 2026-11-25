import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ShieldCheck, UserCheck } from 'lucide-react';
import { api, setAuthToken } from '../lib/api';
import type { User, UserPreferences } from '../shared/types';
import type { AppRoute } from '../components/AppShell';

interface AuthPageProps {
  onSuccess: (user: User, prefs: UserPreferences) => void;
  onNavigate: (route: AppRoute) => void;
}

export function AuthPage({ onSuccess, onNavigate }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'admin-claim'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimStatus, setClaimStatus] = useState<{ adminExists: boolean; envPasscodeConfigured: boolean }>({
    adminExists: false,
    envPasscodeConfigured: false,
  });

  useEffect(() => {
    api
      .adminClaimStatus()
      .then(setClaimStatus)
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login(email, password);
        setAuthToken(res.token);
        onSuccess(res.user, res.preferences);
      } else if (mode === 'register') {
        const res = await api.register(name, email, password);
        setAuthToken(res.token);
        onSuccess(res.user, res.preferences);
      } else {
        const res = await api.adminClaim({ name, email, password, passcode: passcode || undefined });
        setAuthToken(res.token);
        onSuccess(res.user, res.preferences);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoStudent = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.demoStudent();
      setAuthToken(res.token);
      onSuccess(res.user, res.preferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign into demo student profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Home</span>
          </button>
          <span className="text-lg font-bold text-emerald-900">NutriBudget</span>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg mb-6" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                mode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
            {(!claimStatus.adminExists || claimStatus.envPasscodeConfigured) && (
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'admin-claim'}
                onClick={() => {
                  setMode('admin-claim');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  mode === 'admin-claim' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin Setup
              </button>
            )}
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            {mode === 'login'
              ? 'Sign in to your planner'
              : mode === 'register'
              ? 'Create a student account'
              : 'Initialize Administrator Account'}
          </h1>
          <p className="text-sm text-slate-600 mt-1 mb-6">
            {mode === 'login'
              ? 'Access your saved 7-day meal plans, meal reminders, and shopping lists.'
              : mode === 'register'
              ? 'Start optimizing weekly nutrition within your local grocery budget.'
              : 'One-time setup to claim administrator privileges for managing ingredients and recipe templates.'}
          </p>

          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {(mode === 'register' || mode === 'admin-claim') && (
              <div>
                <label htmlFor="auth-name" className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bilal Ahmed"
                  className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu.pk"
                className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={mode === 'admin-claim' ? 8 : 6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'admin-claim' ? 'At least 8 characters' : 'At least 6 characters'}
                className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {mode === 'admin-claim' && claimStatus.envPasscodeConfigured && (
              <div>
                <label htmlFor="auth-passcode" className="block text-sm font-medium text-slate-700 mb-1">
                  Admin Setup Passcode
                </label>
                <input
                  id="auth-passcode"
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter configured ADMIN_PASSCODE"
                  className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {mode === 'admin-claim' && <ShieldCheck className="w-4 h-4" aria-hidden="true" />}
              <span>
                {loading
                  ? 'Processing...'
                  : mode === 'login'
                  ? 'Sign In'
                  : mode === 'register'
                  ? 'Create Account'
                  : 'Claim Admin Access'}
              </span>
            </button>
          </form>

          {mode !== 'admin-claim' && (
            <div className="mt-6 pt-6 border-t border-stone-200">
              <p className="text-xs text-slate-500 mb-3">
                Want to explore immediately with pre-seeded grocery data and a sample 7-day plan?
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={handleDemoStudent}
                className="w-full py-2.5 px-4 text-sm font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" aria-hidden="true" />
                <span>Continue as Demo Student</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
