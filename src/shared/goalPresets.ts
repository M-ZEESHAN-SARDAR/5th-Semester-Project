import type { UserPreferences } from './types';

export type GoalCategoryId = 'normal' | 'weight-gain' | 'weight-loss' | 'gym-plan';

export interface GoalPreset {
  id: GoalCategoryId;
  label: string;
  subtitle: string;
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export const GOAL_PRESETS: GoalPreset[] = [
  {
    id: 'normal',
    label: 'Normal',
    subtitle: '2,000 kcal · 90g P',
    daily_calories: 2000,
    protein_g: 90,
    carbs_g: 240,
    fat_g: 60,
  },
  {
    id: 'weight-gain',
    label: 'Weight Gain',
    subtitle: '2,550 kcal · 120g P',
    daily_calories: 2550,
    protein_g: 120,
    carbs_g: 340,
    fat_g: 80,
  },
  {
    id: 'weight-loss',
    label: 'Weight Loss',
    subtitle: '1,650 kcal · 90g P',
    daily_calories: 1650,
    protein_g: 90,
    carbs_g: 170,
    fat_g: 50,
  },
  {
    id: 'gym-plan',
    label: 'Gym Plan',
    subtitle: '2,400 kcal · 145g P',
    daily_calories: 2400,
    protein_g: 145,
    carbs_g: 260,
    fat_g: 70,
  },
];

export function matchGoalPreset(
  prefs: Pick<UserPreferences, 'daily_calories' | 'protein_g' | 'carbs_g' | 'fat_g'>
): GoalCategoryId | null {
  const matching = GOAL_PRESETS.find(
    (g) =>
      g.daily_calories === prefs.daily_calories &&
      g.protein_g === prefs.protein_g &&
      g.carbs_g === prefs.carbs_g &&
      g.fat_g === prefs.fat_g
  );
  return matching ? matching.id : null;
}
