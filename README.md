# NutriBudget — Meal Planner & Recipe Generator from Local Grocery Prices

NutriBudget helps students and budget-conscious individuals meet their daily nutritional goals without exceeding their weekly grocery budget using mathematical optimization, local Pakistani grocery prices, SQLite persistence, and Google Gemini recipe enhancement.

## Project Structure

```text
├── backend/                     # Python FastAPI + PuLP + SQLite backend
│   ├── main.py                  # FastAPI REST endpoints & OpenAPI docs (/docs)
│   ├── database.py              # 10-table SQLite relational schema & queries
│   ├── optimizer.py             # PuLP MILP solver (package-rounded weekly optimization)
│   ├── auth.py                  # bcrypt password hashing & JWT RBAC
│   ├── gemini_service.py        # Google GenAI recipe enhancement + fallback
│   ├── requirements.txt
│   └── tests/test_optimizer.py  # Pytest suite for PuLP optimization
├── server/                      # Node.js/Express runtime mirror for live AI Studio preview
│   ├── db.ts                    # SQLite (node:sqlite) 10-table schema + 48-ingredient seed
│   ├── seed.ts                  # 48 Pakistani grocery items & 24 recipe templates
│   ├── auth.ts                  # scrypt password hashing & HMAC session tokens
│   └── gemini.ts                # @google/genai server-side integration + fallback
├── src/
│   ├── shared/optimizer.ts      # TypeScript MILP solver & package-cost calculator
│   ├── shared/optimizer.test.ts # node:test unit tests
│   ├── pages/                   # All 11 application pages
│   └── components/              # Reusable UI shell & resilient FoodImage
├── server.ts                    # Express + Vite server (port 3000)
└── .env.example                 # Environment variable template
```

## Database Schema (SQLite)

1. `Users` — Registered users and administrators (`role`: `user` | `admin`)
2. `UserPreferences` — Weekly budget, currency (`PKR` | `USD`), city, calorie/macro targets, allergies, cooking time cap
3. `Ingredients` — 48+ local staples with package sizes and per-100g nutritional data
4. `GroceryPrices` — Global baseline prices (`estimated` | `verified`) and user-specific city/market overrides
5. `Recipes` — Meal templates across `breakfast`, `lunch`, and `dinner`
6. `RecipeIngredients` — Exact gram quantities linking recipes to ingredients
7. `MealPlans` — Saved 7-day plan summaries
8. `MealPlanItems` — Individual 21-slot meal assignments (`day_index`, `meal_slot`, `recipe_id`)
9. `ShoppingLists` — Consolidated weekly shopping summaries
10. `ShoppingListItems` — Required grams, integer packages to buy, leftover grams, and checkoff states

## Running Locally

### Option A: Live Full-Stack Preview (Node.js + Express + SQLite + React)

1. Copy `.env.example` to `.env` and optionally set `GEMINI_API_KEY`.
2. Install dependencies and run tests:
   ```bash
   npm install
   npx tsx --test src/shared/optimizer.test.ts
   npm run dev
   ```
3. Open `http://localhost:3000`.

### Option B: Python FastAPI + PuLP Backend

1. Create a virtual environment and install Python packages:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Run the FastAPI server (auto-generates interactive Swagger docs at `http://localhost:8000/docs`):
   ```bash
   uvicorn main:app --reload --port 8000
   ```
3. Run the Python PuLP optimizer tests:
   ```bash
   pytest tests/test_optimizer.py
   ```

## Key REST API Endpoints

- `POST /api/auth/register` & `POST /api/auth/login` — User registration & authentication
- `GET /api/preferences` & `PUT /api/preferences` — Budget, nutrition, and dietary preferences
- `GET /api/ingredients` & `PUT /api/ingredients/:id/price` — Local grocery prices & personal market overrides
- `POST /api/meal-plans/generate` — Runs MILP optimization and returns either a feasible 7-day plan or constraint diagnostics
- `GET /api/meal-plans`, `POST /api/meal-plans/:id/regenerate`, `DELETE /api/meal-plans/:id` — Saved meal plan history
- `PATCH /api/shopping-list-items/:id` — Persist shopping list item checkboxes
- `POST /api/recipes/:id/enhance` & `POST /api/recipes/:id/validate-substitution` — Gemini recipe enhancement (with database fallback) and substitution constraint validation
- `GET /api/admin/stats`, `POST /api/admin/ingredients`, `POST /api/admin/recipes` — Administrator management
