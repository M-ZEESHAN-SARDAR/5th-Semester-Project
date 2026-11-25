import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChefHat,
  Clock,
  Mail,
  MapPin,
  Send,
  ShoppingBag,
} from 'lucide-react';
import { FoodImage } from '../components/FoodImage';
import type { User } from '../shared/types';
import type { AppRoute } from '../components/AppShell';

interface LandingPageProps {
  user: User | null;
  onNavigate: (route: AppRoute) => void;
}

function AstcLogoMark() {
  return (
    <svg
      viewBox="0 0 80 80"
      className="w-16 h-16 shrink-0"
      role="img"
      aria-label="ASTC Academic Support and Training Center logo"
    >
      <rect x="4" y="4" width="72" height="72" rx="14" fill="#0B3B2E" />
      <rect x="9" y="9" width="62" height="62" rx="10" fill="none" stroke="#34D399" strokeWidth="1.5" strokeOpacity="0.45" />
      <path d="M40 16 L60 28 L40 40 L20 28 Z" fill="#10B981" />
      <path d="M24 33 V46 C24 51 31 55 40 55 C49 55 56 51 56 46 V33 L40 43 Z" fill="#ECFDF5" />
      <text
        x="40"
        y="68"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="11"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        letterSpacing="1.2"
      >
        ASTC
      </text>
    </svg>
  );
}

export function LandingPage({ user, onNavigate }: LandingPageProps) {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const handleContactSubmit = (e: FormEvent) => {
    e.preventDefault();
    setContactError(null);
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      setContactError('Please enter your name, email address, and message before sending.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      setContactError('Please enter a valid email address.');
      return;
    }
    setContactSubmitted(true);
    setContactName('');
    setContactEmail('');
    setContactMessage('');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-stone-200">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="text-xl font-bold tracking-tight text-emerald-900 whitespace-nowrap shrink-0"
          >
            NutriBudget
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#how-it-works" className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0">
              How It Works
            </a>
            <a href="#capabilities" className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0">
              Capabilities
            </a>
            <a href="#about" className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0">
              About
            </a>
            <a href="#contact" className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0">
              Contact Us
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate(user ? 'dashboard' : 'auth')}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {user ? 'Open Dashboard' : 'Get Started'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Split */}
      <section id="top" className="max-w-[1280px] mx-auto px-6 pt-10 pb-12 lg:pt-14 lg:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <p className="text-sm font-medium text-emerald-800">
              Local Market Nutrition &amp; Budget Meal Planner
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.1] [text-wrap:balance]">
              Hit your daily protein and calorie goals without overspending at the market.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              NutriBudget builds mathematically optimized 7-day meal plans from real Pakistani grocery
              package prices, consolidates your 21 meals into one waste-minimized shopping list, and
              creates step-by-step recipes verified against your budget.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => onNavigate(user ? 'generator' : 'auth')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap"
              >
                <span>{user ? 'Generate 7-Day Plan' : 'Start Planning Free'}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('auth')}
                className="inline-flex items-center px-5 py-3 text-sm font-semibold text-slate-800 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg transition-colors whitespace-nowrap"
              >
                Sign In / Demo Student
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-[320px] sm:h-[380px] lg:h-full min-h-[380px] rounded-xl overflow-hidden border border-stone-200 bg-white">
              <FoodImage
                src="/src/assets/images/hero_meal_prep_1795603501084.jpg"
                alt="Prepared Pakistani weekly meal prep featuring spiced grilled chicken, basmati rice, masoor dal, boiled eggs, and fresh kachumber salad"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* 4-Column Proof Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10 pt-8 border-t border-stone-200">
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-900 tabular-nums font-mono">48+</p>
            <p className="text-sm text-slate-600 mt-1">Local grocery staples with verified & estimated prices</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-900 tabular-nums font-mono">21</p>
            <p className="text-sm text-slate-600 mt-1">Weekly breakfast, lunch & dinner slots optimized together</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-900 tabular-nums font-mono">100%</p>
            <p className="text-sm text-slate-600 mt-1">Allergy & dietary constraints enforced before selection</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-900 tabular-nums font-mono">PKR</p>
            <p className="text-sm text-slate-600 mt-1">Exact package-rounded cost &amp; leftover tracking</p>
          </div>
        </div>
      </section>

      {/* Mechanism Section */}
      <section id="how-it-works" className="bg-white border-y border-stone-200 py-14">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              How NutriBudget turns local prices into a feasible week
            </h2>
            <p className="text-slate-600 mt-2">
              Instead of guessing meal prices, the solver optimizes whole grocery packages across all 7 days.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-stone-200 bg-[#FAF9F5]">
              <p className="text-xs font-mono font-semibold text-emerald-800 mb-3">01. SET TARGETS & BUDGET</p>
              <Calculator className="w-6 h-6 text-emerald-700 mb-3" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-slate-900">Nutritional & Cost Bounds</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Enter your weekly PKR grocery cap, daily calories, protein/carb/fat goals,
                and dietary allergies.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-stone-200 bg-[#FAF9F5]">
              <p className="text-xs font-mono font-semibold text-emerald-800 mb-3">02. INTEGER OPTIMIZATION</p>
              <ShoppingBag className="w-6 h-6 text-emerald-700 mb-3" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-slate-900">Package-Accurate Solver</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Purchases are rounded to real market pack sizes (e.g., 1 kg rice, 12-egg tray),
                reusing staples across meals to reduce leftover waste and stay strictly under budget.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-stone-200 bg-[#FAF9F5]">
              <p className="text-xs font-mono font-semibold text-emerald-800 mb-3">03. COOK & TRACK</p>
              <ChefHat className="w-6 h-6 text-emerald-700 mb-3" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-slate-900">Verified Recipes & Lists</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Every recipe cost and macro count comes from SQLite ingredient nutrition data, with
                optional Gemini step enhancement and automatic fallback recipes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Asymmetric Capabilities Bento */}
      <section id="capabilities" className="max-w-[1280px] mx-auto px-6 py-14">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-8">
          Built for student budgets and nutritional rigor
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 sm:p-8 rounded-xl bg-white border border-stone-200 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">
                Transparent Infeasibility Diagnostics
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed max-w-2xl">
                When a budget is too tight for a high-protein or high-calorie target, NutriBudget
                never silently breaks your budget or drops allergies. It calculates the minimum
                feasible weekly grocery cost and shows exact adjustments to make your plan work.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-stone-100">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" aria-hidden="true" />
                <span className="text-sm text-slate-700">Deterministic database nutrition & cost math</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" aria-hidden="true" />
                <span className="text-sm text-slate-700">Substitution checks against allergies & budget</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-stone-200 overflow-hidden flex flex-col">
            <div className="h-44">
              <FoodImage
                src="/src/assets/images/meal_lunch_dal_rice_1795603501760.jpg"
                alt="Masoor Dal Tadka and steamed basmati rice"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-5 flex-1">
              <p className="text-xs text-slate-500">Sample Lunch · Vegetarian · 35 min</p>
              <h3 className="text-base font-semibold text-slate-900 mt-1">
                Masoor Dal Tadka & Basmati Rice
              </h3>
              <p className="text-xs text-slate-600 mt-1 tabular-nums">
                835 kcal · 35g protein · ~PKR 95 per serving
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Working & Contact Us Section */}
      <section id="about" className="bg-white border-y border-stone-200 py-14">
        <div className="max-w-[1280px] mx-auto px-6 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* About the Working */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <p className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-800">
                  About NutriBudget
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1.5">
                  How the Platform Works Behind the Scenes
                </h2>
                <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
                  NutriBudget combines relational grocery pricing, mathematical integer programming,
                  and verified recipe synthesis so university students and households can plan an
                  affordable, macro-balanced week without manual spreadsheet guesswork.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-stone-200 bg-[#FAF9F5]">
                  <p className="text-xs font-mono font-semibold text-emerald-800">STEP 1 · DATABASE</p>
                  <h3 className="text-sm font-semibold text-slate-900 mt-1">Regional Market Pricing</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Stores package sizes, verified vs. estimated PKR prices, and per-100g macros
                    for 48+ Pakistani grocery staples across your weekly meal plan.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 bg-[#FAF9F5]">
                  <p className="text-xs font-mono font-semibold text-emerald-800">STEP 2 · SOLVER</p>
                  <h3 className="text-sm font-semibold text-slate-900 mt-1">Package MILP Engine</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Optimizes all 21 weekly meal slots simultaneously using discrete retail pack
                    quantities, minimizing leftover waste and guaranteeing strict budget compliance.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 bg-[#FAF9F5]">
                  <p className="text-xs font-mono font-semibold text-emerald-800">STEP 3 · RECIPES & LIST</p>
                  <h3 className="text-sm font-semibold text-slate-900 mt-1">AI Steps & Consolidation</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Enhances cooking instructions with Gemini AI (with built-in fallback), validates
                    substitutions against allergies, and outputs a printable checklist.
                  </p>
                </div>
              </div>

              {/* PTUT & ASTC Institutional Logos */}
              <div className="pt-4 border-t border-stone-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
                  Academic & Training Affiliation
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-stone-200 bg-[#FAF9F5]">
                    <div className="w-16 h-16 rounded-lg bg-white border border-stone-200 p-1.5 flex items-center justify-center shrink-0">
                      <img
                        src="/assets/aistudio/image_9176bcb2.png"
                        alt="Punjab Tianjin University of Technology (PTUT) Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">PTUT</p>
                      <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                        Punjab Tianjin University of Technology
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl border border-stone-200 bg-[#FAF9F5]">
                    <AstcLogoMark />
                    <div>
                      <p className="text-sm font-bold text-slate-900">ASTC</p>
                      <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                        Academic Support &amp; Training Center · PTUT
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Us */}
            <div id="contact" className="lg:col-span-5 rounded-xl border border-stone-200 bg-[#FAF9F5] p-6 sm:p-7 space-y-5">
              <div>
                <p className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-800">
                  Contact Us
                </p>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  Get in Touch with the NutriBudget Team
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Questions about local price datasets, academic collaboration, or technical support?
                  Reach out directly or send us a message below.
                </p>
              </div>

              <div className="space-y-3 text-xs text-slate-700 pt-1">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    ASTC, Technology Block, Punjab Tianjin University of Technology (PTUT)
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <a href="mailto:contact@nutribudget.pk" className="font-medium text-emerald-800 hover:underline">
                    contact@nutribudget.pk
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>Monday – Friday · 9:00 AM – 5:00 PM PKT</span>
                </div>
              </div>

              <form onSubmit={handleContactSubmit} className="space-y-3 pt-3 border-t border-stone-200" noValidate>
                {contactError && (
                  <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {contactError}
                  </p>
                )}
                {contactSubmitted && (
                  <div
                    role="status"
                    className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                    <span>Thank you! Your inquiry has been recorded for our PTUT ASTC project team.</span>
                  </div>
                )}

                <div>
                  <label htmlFor="contact-name" className="block text-xs font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Ayesha Khan"
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-xs font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-medium text-slate-700 mb-1">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={3}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Share feedback, market price updates, or questions..."
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  <span>Send Message</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="max-w-[1280px] mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-slate-500">
        <div>
          <span className="font-semibold text-slate-900">NutriBudget</span>
          <span className="mx-2" aria-hidden="true">·</span>
          <span>Built at PTUT &amp; ASTC · Budget-Optimized Meal Planning &amp; Local Grocery Analytics</span>
        </div>
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => onNavigate('auth')}
            className="hover:text-slate-900 transition-colors"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => onNavigate(user ? 'dashboard' : 'auth')}
            className="hover:text-slate-900 transition-colors"
          >
            Planner Workspace
          </button>
        </div>
      </footer>
    </div>
  );
}

