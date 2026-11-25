export interface SeedIngredient {
  name: string;
  category: string;
  package_size_g: number;
  measurement_unit: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  allergen_tag: string | null;
  is_vegetarian: number;
  pkr_price: number;
  price_status: 'estimated' | 'verified';
}

export const SEED_INGREDIENTS: SeedIngredient[] = [
  // Grains & Staples (8)
  { name: 'Basmati Rice', category: 'Grains', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 356, protein_per_100g: 7.1, carbs_per_100g: 78.2, fat_per_100g: 0.7, allergen_tag: null, is_vegetarian: 1, pkr_price: 340, price_status: 'verified' },
  { name: 'Brown Rice', category: 'Grains', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 362, protein_per_100g: 7.5, carbs_per_100g: 76.2, fat_per_100g: 2.7, allergen_tag: null, is_vegetarian: 1, pkr_price: 390, price_status: 'estimated' },
  { name: 'Whole Wheat Atta', category: 'Grains', package_size_g: 5000, measurement_unit: 'g', calories_per_100g: 340, protein_per_100g: 12.1, carbs_per_100g: 71.2, fat_per_100g: 1.7, allergen_tag: 'gluten', is_vegetarian: 1, pkr_price: 680, price_status: 'verified' },
  { name: 'Rolled Oats', category: 'Grains', package_size_g: 500, measurement_unit: 'g', calories_per_100g: 379, protein_per_100g: 13.2, carbs_per_100g: 67.7, fat_per_100g: 6.5, allergen_tag: 'gluten', is_vegetarian: 1, pkr_price: 360, price_status: 'verified' },
  { name: 'Whole Wheat Bread', category: 'Grains', package_size_g: 700, measurement_unit: 'g', calories_per_100g: 247, protein_per_100g: 10.5, carbs_per_100g: 43.1, fat_per_100g: 3.4, allergen_tag: 'gluten', is_vegetarian: 1, pkr_price: 220, price_status: 'verified' },
  { name: 'Semolina (Suji)', category: 'Grains', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 360, protein_per_100g: 12.7, carbs_per_100g: 72.8, fat_per_100g: 1.1, allergen_tag: 'gluten', is_vegetarian: 1, pkr_price: 240, price_status: 'estimated' },
  { name: 'Chickpea Flour (Besan)', category: 'Grains', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 387, protein_per_100g: 22.4, carbs_per_100g: 57.8, fat_per_100g: 6.7, allergen_tag: null, is_vegetarian: 1, pkr_price: 310, price_status: 'verified' },
  { name: 'Cornflakes', category: 'Grains', package_size_g: 500, measurement_unit: 'g', calories_per_100g: 357, protein_per_100g: 7.5, carbs_per_100g: 84.0, fat_per_100g: 0.4, allergen_tag: 'gluten', is_vegetarian: 1, pkr_price: 420, price_status: 'estimated' },

  // Proteins: Meat, Poultry, Fish & Eggs (6)
  { name: 'Chicken Breast (Boneless)', category: 'Protein', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 165, protein_per_100g: 31.0, carbs_per_100g: 0.0, fat_per_100g: 3.6, allergen_tag: null, is_vegetarian: 0, pkr_price: 880, price_status: 'verified' },
  { name: 'Chicken Drumsticks', category: 'Protein', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 172, protein_per_100g: 24.2, carbs_per_100g: 0.0, fat_per_100g: 7.5, allergen_tag: null, is_vegetarian: 0, pkr_price: 640, price_status: 'verified' },
  { name: 'Lean Beef Mince', category: 'Protein', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 215, protein_per_100g: 26.1, carbs_per_100g: 0.0, fat_per_100g: 11.8, allergen_tag: null, is_vegetarian: 0, pkr_price: 1150, price_status: 'verified' },
  { name: 'Mutton Boneless', category: 'Protein', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 234, protein_per_100g: 25.0, carbs_per_100g: 0.0, fat_per_100g: 14.5, allergen_tag: null, is_vegetarian: 0, pkr_price: 1950, price_status: 'estimated' },
  { name: 'Rohu Fish Fillet', category: 'Protein', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 120, protein_per_100g: 19.5, carbs_per_100g: 0.0, fat_per_100g: 4.2, allergen_tag: 'fish', is_vegetarian: 0, pkr_price: 920, price_status: 'estimated' },
  { name: 'Whole Farm Eggs (Dozen)', category: 'Protein', package_size_g: 660, measurement_unit: 'g', calories_per_100g: 143, protein_per_100g: 12.6, carbs_per_100g: 0.7, fat_per_100g: 9.5, allergen_tag: 'eggs', is_vegetarian: 1, pkr_price: 360, price_status: 'verified' },

  // Lentils & Legumes (6)
  { name: 'Masoor Dal (Red Lentils)', category: 'Legumes', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 343, protein_per_100g: 24.6, carbs_per_100g: 60.1, fat_per_100g: 1.1, allergen_tag: null, is_vegetarian: 1, pkr_price: 310, price_status: 'verified' },
  { name: 'Moong Dal (Yellow Lentils)', category: 'Legumes', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 347, protein_per_100g: 23.9, carbs_per_100g: 62.6, fat_per_100g: 1.2, allergen_tag: null, is_vegetarian: 1, pkr_price: 330, price_status: 'verified' },
  { name: 'Chana Dal (Split Chickpeas)', category: 'Legumes', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 360, protein_per_100g: 20.8, carbs_per_100g: 59.8, fat_per_100g: 5.3, allergen_tag: null, is_vegetarian: 1, pkr_price: 290, price_status: 'verified' },
  { name: 'Kabuli Chana (White Chickpeas)', category: 'Legumes', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 364, protein_per_100g: 19.3, carbs_per_100g: 60.6, fat_per_100g: 6.0, allergen_tag: null, is_vegetarian: 1, pkr_price: 370, price_status: 'verified' },
  { name: 'Kala Chana (Black Chickpeas)', category: 'Legumes', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 355, protein_per_100g: 20.5, carbs_per_100g: 58.2, fat_per_100g: 4.9, allergen_tag: null, is_vegetarian: 1, pkr_price: 320, price_status: 'estimated' },
  { name: 'Red Kidney Beans (Rajma)', category: 'Legumes', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 333, protein_per_100g: 23.6, carbs_per_100g: 60.0, fat_per_100g: 0.8, allergen_tag: null, is_vegetarian: 1, pkr_price: 410, price_status: 'verified' },

  // Dairy & Cooking Fats (6)
  { name: 'Fresh Full-Cream Milk', category: 'Dairy', package_size_g: 1000, measurement_unit: 'ml', calories_per_100g: 62, protein_per_100g: 3.3, carbs_per_100g: 4.8, fat_per_100g: 3.4, allergen_tag: 'dairy', is_vegetarian: 1, pkr_price: 220, price_status: 'verified' },
  { name: 'Plain Yogurt (Dahi)', category: 'Dairy', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 61, protein_per_100g: 3.5, carbs_per_100g: 4.7, fat_per_100g: 3.3, allergen_tag: 'dairy', is_vegetarian: 1, pkr_price: 240, price_status: 'verified' },
  { name: 'Fresh Paneer (Cottage Cheese)', category: 'Dairy', package_size_g: 500, measurement_unit: 'g', calories_per_100g: 265, protein_per_100g: 18.3, carbs_per_100g: 3.6, fat_per_100g: 20.8, allergen_tag: 'dairy', is_vegetarian: 1, pkr_price: 620, price_status: 'estimated' },
  { name: 'Cheddar Cheese', category: 'Dairy', package_size_g: 200, measurement_unit: 'g', calories_per_100g: 403, protein_per_100g: 24.9, carbs_per_100g: 1.3, fat_per_100g: 33.1, allergen_tag: 'dairy', is_vegetarian: 1, pkr_price: 540, price_status: 'estimated' },
  { name: 'Canola Cooking Oil', category: 'Oils', package_size_g: 1000, measurement_unit: 'ml', calories_per_100g: 884, protein_per_100g: 0.0, carbs_per_100g: 0.0, fat_per_100g: 100.0, allergen_tag: null, is_vegetarian: 1, pkr_price: 510, price_status: 'verified' },
  { name: 'Desi Butter', category: 'Dairy', package_size_g: 200, measurement_unit: 'g', calories_per_100g: 717, protein_per_100g: 0.9, carbs_per_100g: 0.1, fat_per_100g: 81.1, allergen_tag: 'dairy', is_vegetarian: 1, pkr_price: 420, price_status: 'estimated' },

  // Vegetables & Aromatics (15)
  { name: 'Red Onions', category: 'Vegetables', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 40, protein_per_100g: 1.1, carbs_per_100g: 9.3, fat_per_100g: 0.1, allergen_tag: null, is_vegetarian: 1, pkr_price: 150, price_status: 'verified' },
  { name: 'Fresh Tomatoes', category: 'Vegetables', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 18, protein_per_100g: 0.9, carbs_per_100g: 3.9, fat_per_100g: 0.2, allergen_tag: null, is_vegetarian: 1, pkr_price: 160, price_status: 'verified' },
  { name: 'Potatoes', category: 'Vegetables', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 77, protein_per_100g: 2.0, carbs_per_100g: 17.5, fat_per_100g: 0.1, allergen_tag: null, is_vegetarian: 1, pkr_price: 110, price_status: 'verified' },
  { name: 'Spinach (Palak)', category: 'Vegetables', package_size_g: 500, measurement_unit: 'g', calories_per_100g: 23, protein_per_100g: 2.9, carbs_per_100g: 3.6, fat_per_100g: 0.4, allergen_tag: null, is_vegetarian: 1, pkr_price: 80, price_status: 'verified' },
  { name: 'Cauliflower (Gobi)', category: 'Vegetables', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 25, protein_per_100g: 1.9, carbs_per_100g: 5.0, fat_per_100g: 0.3, allergen_tag: null, is_vegetarian: 1, pkr_price: 140, price_status: 'verified' },
  { name: 'Carrots', category: 'Vegetables', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 41, protein_per_100g: 0.9, carbs_per_100g: 9.6, fat_per_100g: 0.2, allergen_tag: null, is_vegetarian: 1, pkr_price: 130, price_status: 'estimated' },
  { name: 'Cucumbers', category: 'Vegetables', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 15, protein_per_100g: 0.7, carbs_per_100g: 3.6, fat_per_100g: 0.1, allergen_tag: null, is_vegetarian: 1, pkr_price: 120, price_status: 'verified' },
  { name: 'Bell Peppers (Capsicum)', category: 'Vegetables', package_size_g: 500, measurement_unit: 'g', calories_per_100g: 26, protein_per_100g: 1.0, carbs_per_100g: 6.0, fat_per_100g: 0.3, allergen_tag: null, is_vegetarian: 1, pkr_price: 160, price_status: 'estimated' },
  { name: 'Green Peas (Matar)', category: 'Vegetables', package_size_g: 500, measurement_unit: 'g', calories_per_100g: 81, protein_per_100g: 5.4, carbs_per_100g: 14.5, fat_per_100g: 0.4, allergen_tag: null, is_vegetarian: 1, pkr_price: 170, price_status: 'verified' },
  { name: 'Okra (Bhindi)', category: 'Vegetables', package_size_g: 500, measurement_unit: 'g', calories_per_100g: 33, protein_per_100g: 1.9, carbs_per_100g: 7.5, fat_per_100g: 0.2, allergen_tag: null, is_vegetarian: 1, pkr_price: 150, price_status: 'estimated' },
  { name: 'Garlic', category: 'Vegetables', package_size_g: 250, measurement_unit: 'g', calories_per_100g: 149, protein_per_100g: 6.4, carbs_per_100g: 33.1, fat_per_100g: 0.5, allergen_tag: null, is_vegetarian: 1, pkr_price: 175, price_status: 'verified' },
  { name: 'Ginger', category: 'Vegetables', package_size_g: 250, measurement_unit: 'g', calories_per_100g: 80, protein_per_100g: 1.8, carbs_per_100g: 17.8, fat_per_100g: 0.8, allergen_tag: null, is_vegetarian: 1, pkr_price: 190, price_status: 'verified' },
  { name: 'Green Chilies', category: 'Vegetables', package_size_g: 200, measurement_unit: 'g', calories_per_100g: 40, protein_per_100g: 1.9, carbs_per_100g: 9.0, fat_per_100g: 0.2, allergen_tag: null, is_vegetarian: 1, pkr_price: 70, price_status: 'verified' },
  { name: 'Lemons', category: 'Vegetables', package_size_g: 250, measurement_unit: 'g', calories_per_100g: 29, protein_per_100g: 1.1, carbs_per_100g: 9.3, fat_per_100g: 0.3, allergen_tag: null, is_vegetarian: 1, pkr_price: 90, price_status: 'verified' },
  { name: 'Fresh Coriander', category: 'Vegetables', package_size_g: 100, measurement_unit: 'g', calories_per_100g: 23, protein_per_100g: 2.1, carbs_per_100g: 3.7, fat_per_100g: 0.5, allergen_tag: null, is_vegetarian: 1, pkr_price: 40, price_status: 'verified' },

  // Fruits, Nuts & Pantry (7)
  { name: 'Bananas', category: 'Fruits', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 89, protein_per_100g: 1.1, carbs_per_100g: 22.8, fat_per_100g: 0.3, allergen_tag: null, is_vegetarian: 1, pkr_price: 180, price_status: 'verified' },
  { name: 'Apples', category: 'Fruits', package_size_g: 1000, measurement_unit: 'g', calories_per_100g: 52, protein_per_100g: 0.3, carbs_per_100g: 13.8, fat_per_100g: 0.2, allergen_tag: null, is_vegetarian: 1, pkr_price: 290, price_status: 'verified' },
  { name: 'Dates (Khajoor)', category: 'Fruits', package_size_g: 500, measurement_unit: 'g', calories_per_100g: 282, protein_per_100g: 2.5, carbs_per_100g: 75.0, fat_per_100g: 0.4, allergen_tag: null, is_vegetarian: 1, pkr_price: 380, price_status: 'estimated' },
  { name: 'Roasted Peanuts', category: 'Nuts', package_size_g: 250, measurement_unit: 'g', calories_per_100g: 585, protein_per_100g: 24.4, carbs_per_100g: 21.3, fat_per_100g: 49.7, allergen_tag: 'nuts', is_vegetarian: 1, pkr_price: 260, price_status: 'verified' },
  { name: 'Almonds', category: 'Nuts', package_size_g: 250, measurement_unit: 'g', calories_per_100g: 579, protein_per_100g: 21.2, carbs_per_100g: 21.6, fat_per_100g: 49.9, allergen_tag: 'nuts', is_vegetarian: 1, pkr_price: 720, price_status: 'estimated' },
  { name: 'Natural Honey', category: 'Pantry', package_size_g: 250, measurement_unit: 'g', calories_per_100g: 304, protein_per_100g: 0.3, carbs_per_100g: 82.4, fat_per_100g: 0.0, allergen_tag: null, is_vegetarian: 1, pkr_price: 490, price_status: 'estimated' },
  { name: 'Sweet Corn Kernels', category: 'Vegetables', package_size_g: 400, measurement_unit: 'g', calories_per_100g: 86, protein_per_100g: 3.3, carbs_per_100g: 18.7, fat_per_100g: 1.4, allergen_tag: null, is_vegetarian: 1, pkr_price: 230, price_status: 'estimated' },
];

export interface SeedRecipe {
  title: string;
  description: string;
  meal_slot: 'breakfast' | 'lunch' | 'dinner';
  dietary_tag: 'vegetarian' | 'non-vegetarian' | 'high-protein';
  prep_time_min: number;
  cook_time_min: number;
  servings: number;
  image_url: string;
  instructions: string[];
  alternatives: { original_ingredient: string; substitute_ingredient: string; reason: string }[];
  ingredients: { name: string; quantity_g: number }[];
}

const IMG_OMELETTE_ROTI = '/src/assets/images/omelette_roti_1795611739522.jpg';
const IMG_OATS_PORRIDGE = '/src/assets/images/banana_date_oats_1795612501848.jpg';
const IMG_BESAN_CHILLA = '/src/assets/images/besan_chilla_yogurt_1795611739454.jpg';
const IMG_SCRAMBLED_TOAST = '/src/assets/images/scrambled_eggs_toast_1795611741597.jpg';
const IMG_PEANUT_BANANA = '/src/assets/images/peanut_banana_toast_1795611739493.jpg';
const IMG_SUJI_EGGS = '/src/assets/images/suji_halwa_eggs_1795611740466.jpg';
const IMG_ALOO_BHUJIA = '/src/assets/images/aloo_bhujia_eggs_1795611742611.jpg';
const IMG_FRUIT_CORNFLAKES = '/src/assets/images/fruit_cornflakes_bowl_1795611741007.jpg';

const IMG_MASOOR_DAL = '/src/assets/images/meal_lunch_dal_rice_1795603501760.jpg';
const IMG_CHANA_MASALA = '/src/assets/images/chana_masala_roti_1795611741083.jpg';
const IMG_CHICKEN_TIKKA = '/src/assets/images/chicken_tikka_bowl_1795611741521.jpg';
const IMG_MOONG_KHICHDI = '/src/assets/images/moong_dal_khichdi_1795611742080.jpg';
const IMG_KALA_CHANA = '/src/assets/images/meal_chana_bowl_1795603503145.jpg';
const IMG_RAJMA_RICE = '/src/assets/images/rajma_brown_rice_1795611742023.jpg';
const IMG_CHICKEN_PULAO = '/src/assets/images/chicken_pulao_salad_1795611743704.jpg';
const IMG_PALAK_PANEER = '/src/assets/images/palak_paneer_roti_1795611788687.jpg';

const IMG_CHICKEN_KARAHI = '/src/assets/images/meal_dinner_chicken_karahi_1795603502419.jpg';
const IMG_CHANA_BHINDI = '/src/assets/images/chana_dal_bhindi_1795611863025.jpg';
const IMG_KEEMA_MATAR = '/src/assets/images/keema_matar_roti_1795611744747.jpg';
const IMG_SPICED_FISH = '/src/assets/images/spiced_fish_rice_1795611863025.jpg';
const IMG_ALOO_MATAR_GOBI = '/src/assets/images/aloo_matar_gobi_1795611847720.jpg';
const IMG_ANDA_MASALA = '/src/assets/images/anda_masala_rice_1795611863803.jpg';
const IMG_VEG_STIRFRY = '/src/assets/images/veg_chickpea_stirfry_1795611863720.jpg';
const IMG_CHICKEN_SKILLET = '/src/assets/images/chicken_potato_skillet_1795611864205.jpg';

export const SEED_RECIPES: SeedRecipe[] = [
  // BREAKFAST (8)
  {
    title: 'Masala Egg Omelette & Whole Wheat Roti',
    description: 'High-protein Pakistani spiced omelette folded with onions, tomatoes, and fresh coriander alongside two soft whole wheat rotis.',
    meal_slot: 'breakfast',
    dietary_tag: 'high-protein',
    prep_time_min: 8,
    cook_time_min: 12,
    servings: 1,
    image_url: IMG_OMELETTE_ROTI,
    instructions: [
      'Knead whole wheat atta with warm water and rest 5 minutes; roll into two thin rotis and cook on a hot tawa.',
      'Whisk 3 whole eggs with finely chopped red onions, tomatoes, green chilies, and fresh coriander.',
      'Heat canola oil in a non-stick skillet over medium heat and pour in the egg mixture.',
      'Cook 2–3 minutes per side until fluffy and golden, then serve hot with the rotis.',
    ],
    alternatives: [
      { original_ingredient: 'Whole Wheat Atta', substitute_ingredient: 'Whole Wheat Bread', reason: 'Zero kneading time on busy mornings' },
    ],
    ingredients: [
      { name: 'Whole Farm Eggs (Dozen)', quantity_g: 165 },
      { name: 'Whole Wheat Atta', quantity_g: 100 },
      { name: 'Red Onions', quantity_g: 40 },
      { name: 'Fresh Tomatoes', quantity_g: 50 },
      { name: 'Canola Cooking Oil', quantity_g: 10 },
      { name: 'Fresh Coriander', quantity_g: 10 },
    ],
  },
  {
    title: 'Banana Date Oats Porridge',
    description: 'Creamy rolled oats simmered in fresh milk, naturally sweetened with sliced bananas and chopped dates.',
    meal_slot: 'breakfast',
    dietary_tag: 'vegetarian',
    prep_time_min: 5,
    cook_time_min: 10,
    servings: 1,
    image_url: IMG_OATS_PORRIDGE,
    instructions: [
      'Bring milk and 100ml water to a gentle simmer in a saucepan.',
      'Stir in rolled oats and cook for 6–7 minutes until thick and creamy.',
      'Top with sliced bananas, chopped dates, and a drizzle of honey before serving.',
    ],
    alternatives: [
      { original_ingredient: 'Fresh Full-Cream Milk', substitute_ingredient: 'Plain Yogurt (Dahi)', reason: 'Use chilled yogurt for overnight oats without cooking' },
    ],
    ingredients: [
      { name: 'Rolled Oats', quantity_g: 85 },
      { name: 'Fresh Full-Cream Milk', quantity_g: 250 },
      { name: 'Bananas', quantity_g: 120 },
      { name: 'Dates (Khajoor)', quantity_g: 30 },
    ],
  },
  {
    title: 'Besan Chilla & Mint Yogurt',
    description: 'Savory chickpea flour pancakes studded with spinach, onions, and tomatoes, paired with cool probiotic yogurt.',
    meal_slot: 'breakfast',
    dietary_tag: 'vegetarian',
    prep_time_min: 8,
    cook_time_min: 12,
    servings: 1,
    image_url: IMG_BESAN_CHILLA,
    instructions: [
      'Whisk chickpea flour (besan) with water into a smooth pourable batter.',
      'Fold in finely chopped spinach, onions, tomatoes, green chilies, and coriander.',
      'Ladle onto an oiled skillet and cook 3 minutes per side until crisp at the edges.',
      'Serve warm alongside plain yogurt.',
    ],
    alternatives: [
      { original_ingredient: 'Spinach (Palak)', substitute_ingredient: 'Bell Peppers (Capsicum)', reason: 'Crisper vegetable bite if spinach is unavailable' },
    ],
    ingredients: [
      { name: 'Chickpea Flour (Besan)', quantity_g: 95 },
      { name: 'Plain Yogurt (Dahi)', quantity_g: 120 },
      { name: 'Spinach (Palak)', quantity_g: 60 },
      { name: 'Red Onions', quantity_g: 40 },
      { name: 'Fresh Tomatoes', quantity_g: 50 },
      { name: 'Canola Cooking Oil', quantity_g: 10 },
    ],
  },
  {
    title: 'Scrambled Eggs on Whole Wheat Toast',
    description: 'Fast 15-minute student breakfast with soft scrambled eggs, whole wheat toast, and sliced cucumber-tomato side.',
    meal_slot: 'breakfast',
    dietary_tag: 'high-protein',
    prep_time_min: 5,
    cook_time_min: 8,
    servings: 1,
    image_url: IMG_SCRAMBLED_TOAST,
    instructions: [
      'Toast slices of whole wheat bread until crisp.',
      'Beat 3 farm eggs with a pinch of salt and black pepper.',
      'Scramble gently in butter over low heat until soft curds form.',
      'Serve with fresh cucumber and tomato slices.',
    ],
    alternatives: [
      { original_ingredient: 'Desi Butter', substitute_ingredient: 'Canola Cooking Oil', reason: 'Lower saturated fat alternative' },
    ],
    ingredients: [
      { name: 'Whole Farm Eggs (Dozen)', quantity_g: 165 },
      { name: 'Whole Wheat Bread', quantity_g: 110 },
      { name: 'Desi Butter', quantity_g: 10 },
      { name: 'Cucumbers', quantity_g: 80 },
      { name: 'Fresh Tomatoes', quantity_g: 60 },
    ],
  },
  {
    title: 'Peanut Banana Protein Toast',
    description: 'Dairy-free, egg-free energy breakfast featuring whole wheat toast layered with crushed roasted peanuts, banana, and honey.',
    meal_slot: 'breakfast',
    dietary_tag: 'vegetarian',
    prep_time_min: 5,
    cook_time_min: 5,
    servings: 1,
    image_url: IMG_PEANUT_BANANA,
    instructions: [
      'Toast whole wheat bread slices until golden.',
      'Crush roasted peanuts coarsely or blend into quick peanut spread.',
      'Top toast with peanut spread, sliced bananas, and honey.',
    ],
    alternatives: [
      { original_ingredient: 'Roasted Peanuts', substitute_ingredient: 'Almonds', reason: 'Tree-nut swap if preferred' },
    ],
    ingredients: [
      { name: 'Whole Wheat Bread', quantity_g: 120 },
      { name: 'Roasted Peanuts', quantity_g: 40 },
      { name: 'Bananas', quantity_g: 140 },
      { name: 'Natural Honey', quantity_g: 15 },
    ],
  },
  {
    title: 'Suji Halwa & Boiled Eggs',
    description: 'Traditional warm semolina porridge lightly cooked with carrots and paired with protein-rich boiled eggs.',
    meal_slot: 'breakfast',
    dietary_tag: 'vegetarian',
    prep_time_min: 5,
    cook_time_min: 15,
    servings: 1,
    image_url: IMG_SUJI_EGGS,
    instructions: [
      'Boil 2 eggs for 9 minutes, peel and slice.',
      'Lightly toast semolina (suji) in oil for 3 minutes until fragrant.',
      'Add warm water and grated carrots, simmering until thick and fluffy.',
    ],
    alternatives: [
      { original_ingredient: 'Whole Farm Eggs (Dozen)', substitute_ingredient: 'Plain Yogurt (Dahi)', reason: 'Egg-free dairy protein pairing' },
    ],
    ingredients: [
      { name: 'Semolina (Suji)', quantity_g: 80 },
      { name: 'Whole Farm Eggs (Dozen)', quantity_g: 110 },
      { name: 'Carrots', quantity_g: 60 },
      { name: 'Canola Cooking Oil', quantity_g: 12 },
      { name: 'Natural Honey', quantity_g: 15 },
    ],
  },
  {
    title: 'Boiled Eggs, Aloo Bhujia & Roti',
    description: 'Budget-friendly hostel favorite combining spiced skillet potatoes, two boiled eggs, and whole wheat roti.',
    meal_slot: 'breakfast',
    dietary_tag: 'vegetarian',
    prep_time_min: 8,
    cook_time_min: 17,
    servings: 1,
    image_url: IMG_ALOO_BHUJIA,
    instructions: [
      'Dice potatoes small and saute with onions, green chilies, and turmeric until tender.',
      'Boil 2 eggs for 8–9 minutes.',
      'Serve warm with whole wheat rotis.',
    ],
    alternatives: [
      { original_ingredient: 'Potatoes', substitute_ingredient: 'Cauliflower (Gobi)', reason: 'Lower-carb vegetable swap' },
    ],
    ingredients: [
      { name: 'Whole Farm Eggs (Dozen)', quantity_g: 110 },
      { name: 'Potatoes', quantity_g: 160 },
      { name: 'Whole Wheat Atta', quantity_g: 95 },
      { name: 'Red Onions', quantity_g: 40 },
      { name: 'Canola Cooking Oil', quantity_g: 10 },
    ],
  },
  {
    title: 'Fruit & Yogurt Cornflakes Bowl',
    description: 'Crisp cornflakes tossed with chilled milk, yogurt, diced apple, and sliced banana for zero-cook mornings.',
    meal_slot: 'breakfast',
    dietary_tag: 'vegetarian',
    prep_time_min: 6,
    cook_time_min: 0,
    servings: 1,
    image_url: IMG_FRUIT_CORNFLAKES,
    instructions: [
      'Pour cornflakes into a deep bowl.',
      'Add fresh milk and a spoonful of yogurt.',
      'Top with diced apples, bananas, and chopped dates.',
    ],
    alternatives: [
      { original_ingredient: 'Cornflakes', substitute_ingredient: 'Rolled Oats', reason: 'Higher fiber whole grain option' },
    ],
    ingredients: [
      { name: 'Cornflakes', quantity_g: 75 },
      { name: 'Fresh Full-Cream Milk', quantity_g: 220 },
      { name: 'Plain Yogurt (Dahi)', quantity_g: 80 },
      { name: 'Apples', quantity_g: 100 },
      { name: 'Bananas', quantity_g: 90 },
    ],
  },

  // LUNCH (8)
  {
    title: 'Masoor Dal Tadka & Steamed Basmati Rice',
    description: 'Comforting Pakistani red lentil curry finished with a garlic-cumin tadka over fluffy long-grain basmati rice.',
    meal_slot: 'lunch',
    dietary_tag: 'vegetarian',
    prep_time_min: 10,
    cook_time_min: 25,
    servings: 1,
    image_url: IMG_MASOOR_DAL,
    instructions: [
      'Rinse masoor dal and simmer with diced tomatoes, garlic, and turmeric for 18 minutes.',
      'Steam basmati rice separately until tender and fluffy.',
      'Prepare tadka by sizzling sliced garlic and onions in canola oil; pour over dal.',
      'Garnish with fresh coriander and lemon juice.',
    ],
    alternatives: [
      { original_ingredient: 'Basmati Rice', substitute_ingredient: 'Brown Rice', reason: 'Higher fiber whole grain swap' },
    ],
    ingredients: [
      { name: 'Masoor Dal (Red Lentils)', quantity_g: 105 },
      { name: 'Basmati Rice', quantity_g: 120 },
      { name: 'Fresh Tomatoes', quantity_g: 80 },
      { name: 'Red Onions', quantity_g: 50 },
      { name: 'Garlic', quantity_g: 10 },
      { name: 'Canola Cooking Oil', quantity_g: 10 },
      { name: 'Fresh Coriander', quantity_g: 10 },
    ],
  },
  {
    title: 'Lahori Chana Masala & Whole Wheat Roti',
    description: 'Protein-dense white chickpeas simmered in spiced tomato-onion gravy, served with two warm rotis.',
    meal_slot: 'lunch',
    dietary_tag: 'vegetarian',
    prep_time_min: 10,
    cook_time_min: 25,
    servings: 1,
    image_url: IMG_CHANA_MASALA,
    instructions: [
      'Saute onions, ginger, garlic, and tomatoes in oil until softened.',
      'Add pre-soaked boiled white chickpeas, spices, and simmer 15 minutes.',
      'Serve alongside two fresh whole wheat rotis and lemon wedges.',
    ],
    alternatives: [
      { original_ingredient: 'Kabuli Chana (White Chickpeas)', substitute_ingredient: 'Kala Chana (Black Chickpeas)', reason: 'Higher iron and fiber traditional swap' },
    ],
    ingredients: [
      { name: 'Kabuli Chana (White Chickpeas)', quantity_g: 110 },
      { name: 'Whole Wheat Atta', quantity_g: 110 },
      { name: 'Red Onions', quantity_g: 60 },
      { name: 'Fresh Tomatoes', quantity_g: 80 },
      { name: 'Ginger', quantity_g: 8 },
      { name: 'Canola Cooking Oil', quantity_g: 10 },
      { name: 'Lemons', quantity_g: 20 },
    ],
  },
  {
    title: 'Grilled Chicken Tikka & Kachumber Rice Bowl',
    description: 'Lean spiced chicken breast paired with basmati rice and a crisp cucumber-tomato-onion kachumber salad.',
    meal_slot: 'lunch',
    dietary_tag: 'high-protein',
    prep_time_min: 12,
    cook_time_min: 18,
    servings: 1,
    image_url: IMG_CHICKEN_TIKKA,
    instructions: [
      'Marinate chicken breast strips in yogurt, lemon, garlic, and ginger.',
      'Sear in a hot skillet 5–6 minutes per side until cooked through.',
      'Toss diced cucumber, tomato, and red onion with lemon and coriander.',
      'Serve over steamed basmati rice.',
    ],
    alternatives: [
      { original_ingredient: 'Chicken Breast (Boneless)', substitute_ingredient: 'Chicken Drumsticks', reason: 'More economical poultry cut' },
    ],
    ingredients: [
      { name: 'Chicken Breast (Boneless)', quantity_g: 175 },
      { name: 'Basmati Rice', quantity_g: 115 },
      { name: 'Plain Yogurt (Dahi)', quantity_g: 50 },
      { name: 'Cucumbers', quantity_g: 70 },
      { name: 'Fresh Tomatoes', quantity_g: 60 },
      { name: 'Lemons', quantity_g: 20 },
      { name: 'Canola Cooking Oil', quantity_g: 8 },
    ],
  },
  {
    title: 'Moong Dal Khichdi & Yogurt Raita',
    description: 'Light, digestible one-pot yellow lentil and basmati rice khichdi served with cool cucumber raita.',
    meal_slot: 'lunch',
    dietary_tag: 'vegetarian',
    prep_time_min: 8,
    cook_time_min: 22,
    servings: 1,
    image_url: IMG_MOONG_KHICHDI,
    instructions: [
      'Wash moong dal and basmati rice together.',
      'Saute onions and ginger in oil, add rice, dal, water, and simmer 20 minutes.',
      'Mix yogurt with grated cucumber and serve alongside.',
    ],
    alternatives: [
      { original_ingredient: 'Moong Dal (Yellow Lentils)', substitute_ingredient: 'Masoor Dal (Red Lentils)', reason: 'Cooks slightly faster with richer color' },
    ],
    ingredients: [
      { name: 'Moong Dal (Yellow Lentils)', quantity_g: 95 },
      { name: 'Basmati Rice', quantity_g: 110 },
      { name: 'Plain Yogurt (Dahi)', quantity_g: 120 },
      { name: 'Cucumbers', quantity_g: 60 },
      { name: 'Red Onions', quantity_g: 40 },
      { name: 'Canola Cooking Oil', quantity_g: 8 },
    ],
  },
  {
    title: 'Kala Chana & Sweet Corn Power Bowl',
    description: 'Zesty cold or warm protein bowl mixing black chickpeas, sweet corn, spinach, cucumber, and fresh lemon dressing.',
    meal_slot: 'lunch',
    dietary_tag: 'high-protein',
    prep_time_min: 12,
    cook_time_min: 15,
    servings: 1,
    image_url: IMG_KALA_CHANA,
    instructions: [
      'Simmer pre-soaked kala chana until tender and drain.',
      'Char sweet corn kernels lightly in a dry pan.',
      'Toss chickpeas, corn, baby spinach, cucumber, and onion with lemon juice and oil.',
    ],
    alternatives: [
      { original_ingredient: 'Kala Chana (Black Chickpeas)', substitute_ingredient: 'Red Kidney Beans (Rajma)', reason: 'Creamier legume texture' },
    ],
    ingredients: [
      { name: 'Kala Chana (Black Chickpeas)', quantity_g: 115 },
      { name: 'Sweet Corn Kernels', quantity_g: 90 },
      { name: 'Spinach (Palak)', quantity_g: 75 },
      { name: 'Cucumbers', quantity_g: 80 },
      { name: 'Red Onions', quantity_g: 40 },
      { name: 'Lemons', quantity_g: 25 },
      { name: 'Canola Cooking Oil', quantity_g: 10 },
    ],
  },
  {
    title: 'Rajma Masala & Brown Rice',
    description: 'Hearty red kidney bean curry simmered with ginger, garlic, and tomatoes over nutty brown rice.',
    meal_slot: 'lunch',
    dietary_tag: 'vegetarian',
    prep_time_min: 10,
    cook_time_min: 30,
    servings: 1,
    image_url: IMG_RAJMA_RICE,
    instructions: [
      'Cook brown rice in water for 25–30 minutes.',
      'Prepare tomato-onion-ginger masala and simmer cooked kidney beans until thick.',
      'Serve topped with coriander.',
    ],
    alternatives: [
      { original_ingredient: 'Brown Rice', substitute_ingredient: 'Basmati Rice', reason: 'Faster 15-minute cooking time' },
    ],
    ingredients: [
      { name: 'Red Kidney Beans (Rajma)', quantity_g: 105 },
      { name: 'Brown Rice', quantity_g: 115 },
      { name: 'Fresh Tomatoes', quantity_g: 90 },
      { name: 'Red Onions', quantity_g: 55 },
      { name: 'Garlic', quantity_g: 8 },
      { name: 'Canola Cooking Oil', quantity_g: 10 },
    ],
  },
  {
    title: 'Chicken Drumstick Pulao & Salad',
    description: 'Fragrant one-pot spiced chicken yakhni pulao cooked with basmati rice, carrots, and peas.',
    meal_slot: 'lunch',
    dietary_tag: 'non-vegetarian',
    prep_time_min: 12,
    cook_time_min: 28,
    servings: 1,
    image_url: IMG_CHICKEN_PULAO,
    instructions: [
      'Brown chicken drumsticks with onions, ginger, and garlic.',
      'Add carrots, green peas, and water; simmer 15 minutes.',
      'Stir in soaked basmati rice and steam covered until fluffy.',
    ],
    alternatives: [
      { original_ingredient: 'Chicken Drumsticks', substitute_ingredient: 'Chicken Breast (Boneless)', reason: 'Leaner protein option' },
    ],
    ingredients: [
      { name: 'Chicken Drumsticks', quantity_g: 190 },
      { name: 'Basmati Rice', quantity_g: 120 },
      { name: 'Green Peas (Matar)', quantity_g: 50 },
      { name: 'Carrots', quantity_g: 50 },
      { name: 'Red Onions', quantity_g: 50 },
      { name: 'Canola Cooking Oil', quantity_g: 10 },
    ],
  },
  {
    title: 'Palak Paneer & Whole Wheat Roti',
    description: 'Iron-rich pureed spinach curry folded with fresh cottage cheese cubes and served with soft rotis.',
    meal_slot: 'lunch',
    dietary_tag: 'vegetarian',
    prep_time_min: 10,
    cook_time_min: 20,
    servings: 1,
    image_url: IMG_PALAK_PANEER,
    instructions: [
      'Blanch spinach and blend with garlic, ginger, and green chilies.',
      'Saute onions and tomatoes, stir in spinach puree, and fold in paneer cubes.',
      'Serve hot with whole wheat rotis.',
    ],
    alternatives: [
      { original_ingredient: 'Fresh Paneer (Cottage Cheese)', substitute_ingredient: 'Kabuli Chana (White Chickpeas)', reason: 'Lower-cost dairy-free protein alternative' },
    ],
    ingredients: [
      { name: 'Spinach (Palak)', quantity_g: 180 },
      { name: 'Fresh Paneer (Cottage Cheese)', quantity_g: 120 },
      { name: 'Whole Wheat Atta', quantity_g: 105 },
      { name: 'Fresh Tomatoes', quantity_g: 60 },
      { name: 'Red Onions', quantity_g: 45 },
      { name: 'Canola Cooking Oil', quantity_g: 10 },
    ],
  },

  // DINNER (8)
  {
    title: 'Chicken Karahi & Roasted Cauliflower Plate',
    description: 'Wok-seared chicken breast in tangy tomato-ginger karahi masala served with spiced roasted cauliflower and mint yogurt.',
    meal_slot: 'dinner',
    dietary_tag: 'high-protein',
    prep_time_min: 10,
    cook_time_min: 22,
    servings: 1,
    image_url: IMG_CHICKEN_KARAHI,
    instructions: [
      'Roast cauliflower florets and bell pepper strips in a hot skillet with minimal oil.',
      'Sear chicken breast cubes with tomatoes, garlic, ginger, and green chilies for 14 minutes.',
      'Serve together with a side of chilled yogurt and coriander.',
    ],
    alternatives: [
      { original_ingredient: 'Cauliflower (Gobi)', substitute_ingredient: 'Okra (Bhindi)', reason: 'Seasonal vegetable swap' },
    ],
    ingredients: [
      { name: 'Chicken Breast (Boneless)', quantity_g: 190 },
      { name: 'Cauliflower (Gobi)', quantity_g: 140 },
      { name: 'Fresh Tomatoes', quantity_g: 100 },
      { name: 'Bell Peppers (Capsicum)', quantity_g: 70 },
      { name: 'Plain Yogurt (Dahi)', quantity_g: 60 },
      { name: 'Whole Wheat Atta', quantity_g: 80 },
      { name: 'Canola Cooking Oil', quantity_g: 10 },
    ],
  },
  {
    title: 'Chana Dal & Bhindi Masala with Roti',
    description: 'Protein-packed split chickpea lentils cooked alongside crisp stir-fried okra and whole wheat roti.',
    meal_slot: 'dinner',
    dietary_tag: 'vegetarian',
    prep_time_min: 12,
    cook_time_min: 25,
    servings: 1,
    image_url: IMG_CHANA_BHINDI,
    instructions: [
      'Simmer soaked chana dal with tomatoes and turmeric until tender.',
      'Stir-fry chopped okra with onions and green chilies until crisp.',
      'Serve with warm whole wheat rotis.',
    ],
    alternatives: [
      { original_ingredient: 'Okra (Bhindi)', substitute_ingredient: 'Cauliflower (Gobi)', reason: 'Winter vegetable substitute' },
    ],
    ingredients: [
      { name: 'Chana Dal (Split Chickpeas)', quantity_g: 105 },
      { name: 'Okra (Bhindi)', quantity_g: 120 },
      { name: 'Whole Wheat Atta', quantity_g: 100 },
      { name: 'Red Onions', quantity_g: 50 },
      { name: 'Fresh Tomatoes', quantity_g: 60 },
      { name: 'Canola Cooking Oil', quantity_g: 10 },
    ],
  },
  {
    title: 'Keema Matar (Lean Beef Mince & Peas)',
    description: 'Savory Pakistani lean beef mince cooked with sweet green peas, ginger, and tomatoes, served with roti.',
    meal_slot: 'dinner',
    dietary_tag: 'high-protein',
    prep_time_min: 10,
    cook_time_min: 25,
    servings: 1,
    image_url: IMG_KEEMA_MATAR,
    instructions: [
      'Brown lean beef mince with onions, garlic, and ginger.',
      'Add chopped tomatoes and cook covered 12 minutes.',
      'Fold in green peas and simmer 6 minutes; serve with whole wheat roti.',
    ],
    alternatives: [
      { original_ingredient: 'Lean Beef Mince', substitute_ingredient: 'Chicken Breast (Boneless)', reason: 'Lower-fat poultry swap' },
    ],
    ingredients: [
      { name: 'Lean Beef Mince', quantity_g: 165 },
      { name: 'Green Peas (Matar)', quantity_g: 80 },
      { name: 'Whole Wheat Atta', quantity_g: 100 },
      { name: 'Fresh Tomatoes', quantity_g: 75 },
      { name: 'Red Onions', quantity_g: 50 },
      { name: 'Canola Cooking Oil', quantity_g: 8 },
    ],
  },
  {
    title: 'Pan-Seared Spiced Rohu Fish & Basmati',
    description: 'Crispy turmeric-lemon spiced rohu fish fillet served over steamed rice with sautéed greens.',
    meal_slot: 'dinner',
    dietary_tag: 'high-protein',
    prep_time_min: 10,
    cook_time_min: 15,
    servings: 1,
    image_url: IMG_SPICED_FISH,
    instructions: [
      'Rub fish fillet with lemon juice, garlic paste, turmeric, and besan.',
      'Pan-sear in canola oil 4 minutes per side until crisp.',
      'Serve alongside steamed basmati rice and sautéed spinach.',
    ],
    alternatives: [
      { original_ingredient: 'Rohu Fish Fillet', substitute_ingredient: 'Chicken Breast (Boneless)', reason: 'Fish-allergy safe protein swap' },
    ],
    ingredients: [
      { name: 'Rohu Fish Fillet', quantity_g: 185 },
      { name: 'Basmati Rice', quantity_g: 115 },
      { name: 'Spinach (Palak)', quantity_g: 90 },
      { name: 'Chickpea Flour (Besan)', quantity_g: 15 },
      { name: 'Lemons', quantity_g: 25 },
      { name: 'Canola Cooking Oil', quantity_g: 12 },
    ],
  },
  {
    title: 'Aloo Matar Gobi & Yogurt Bowl',
    description: 'Budget-friendly homestyle cauliflower, potato, and green pea curry served with whole wheat roti and dahi.',
    meal_slot: 'dinner',
    dietary_tag: 'vegetarian',
    prep_time_min: 10,
    cook_time_min: 24,
    servings: 1,
    image_url: IMG_ALOO_MATAR_GOBI,
    instructions: [
      'Saute onions, tomatoes, and ginger in oil.',
      'Add diced potatoes, cauliflower florets, and green peas; cover and cook 18 minutes.',
      'Serve warm with whole wheat roti and plain yogurt.',
    ],
    alternatives: [
      { original_ingredient: 'Potatoes', substitute_ingredient: 'Kabuli Chana (White Chickpeas)', reason: 'Boost protein content' },
    ],
    ingredients: [
      { name: 'Cauliflower (Gobi)', quantity_g: 150 },
      { name: 'Potatoes', quantity_g: 130 },
      { name: 'Green Peas (Matar)', quantity_g: 75 },
      { name: 'Whole Wheat Atta', quantity_g: 105 },
      { name: 'Plain Yogurt (Dahi)', quantity_g: 100 },
      { name: 'Fresh Tomatoes', quantity_g: 60 },
      { name: 'Canola Cooking Oil', quantity_g: 10 },
    ],
  },
  {
    title: 'Egg Curry (Anda Masala) & Rice',
    description: 'Protein-rich boiled eggs simmered in spiced onion-tomato gravy over fragrant steamed basmati rice.',
    meal_slot: 'dinner',
    dietary_tag: 'vegetarian',
    prep_time_min: 8,
    cook_time_min: 20,
    servings: 1,
    image_url: IMG_ANDA_MASALA,
    instructions: [
      'Boil 3 eggs, peel, and lightly sear in oil.',
      'Simmer onions, tomatoes, garlic, and ginger into a rich gravy.',
      'Add eggs for 5 minutes and serve over steamed basmati rice.',
    ],
    alternatives: [
      { original_ingredient: 'Whole Farm Eggs (Dozen)', substitute_ingredient: 'Fresh Paneer (Cottage Cheese)', reason: 'Egg-free vegetarian curry' },
    ],
    ingredients: [
      { name: 'Whole Farm Eggs (Dozen)', quantity_g: 165 },
      { name: 'Basmati Rice', quantity_g: 120 },
      { name: 'Fresh Tomatoes', quantity_g: 90 },
      { name: 'Red Onions', quantity_g: 60 },
      { name: 'Canola Cooking Oil', quantity_g: 10 },
      { name: 'Fresh Coriander', quantity_g: 10 },
    ],
  },
  {
    title: 'Vegetable & Chickpea Stir-Fry Bowl',
    description: 'Vibrant skillet bowl combining roasted chickpeas, bell peppers, carrots, and spinach over rice.',
    meal_slot: 'dinner',
    dietary_tag: 'vegetarian',
    prep_time_min: 10,
    cook_time_min: 15,
    servings: 1,
    image_url: IMG_VEG_STIRFRY,
    instructions: [
      'Stir-fry bell peppers, carrots, and onions over high heat.',
      'Toss in cooked chickpeas and spinach with garlic and lemon.',
      'Serve over warm basmati or brown rice.',
    ],
    alternatives: [
      { original_ingredient: 'Kabuli Chana (White Chickpeas)', substitute_ingredient: 'Chicken Breast (Boneless)', reason: 'Higher-protein non-veg variation' },
    ],
    ingredients: [
      { name: 'Kabuli Chana (White Chickpeas)', quantity_g: 100 },
      { name: 'Basmati Rice', quantity_g: 110 },
      { name: 'Bell Peppers (Capsicum)', quantity_g: 80 },
      { name: 'Carrots', quantity_g: 70 },
      { name: 'Spinach (Palak)', quantity_g: 70 },
      { name: 'Canola Cooking Oil', quantity_g: 10 },
    ],
  },
  {
    title: 'Grilled Chicken & Potato Skillet',
    description: 'Herb-marinated chicken breast pan-roasted with crispy potato cubes, carrots, and cheddar sprinkle.',
    meal_slot: 'dinner',
    dietary_tag: 'high-protein',
    prep_time_min: 10,
    cook_time_min: 25,
    servings: 1,
    image_url: IMG_CHICKEN_SKILLET,
    instructions: [
      'Roast diced potatoes and carrots in canola oil until golden.',
      'Pan-grill seasoned chicken breast fillets until juicy and cooked through.',
      'Finish with grated cheddar and fresh coriander.',
    ],
    alternatives: [
      { original_ingredient: 'Cheddar Cheese', substitute_ingredient: 'Plain Yogurt (Dahi)', reason: 'Lighter dairy dip instead of cheese' },
    ],
    ingredients: [
      { name: 'Chicken Breast (Boneless)', quantity_g: 185 },
      { name: 'Potatoes', quantity_g: 170 },
      { name: 'Carrots', quantity_g: 80 },
      { name: 'Cheddar Cheese', quantity_g: 25 },
      { name: 'Canola Cooking Oil', quantity_g: 10 },
    ],
  },
];
