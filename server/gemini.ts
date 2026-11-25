import { GoogleGenAI, Type } from '@google/genai';
import type { Recipe, RecipeAlternative } from '../src/shared/types';

export interface EnhancedRecipeContent {
  description: string;
  instructions: string[];
  alternatives: RecipeAlternative[];
  source: 'gemini' | 'fallback';
  note?: string;
}

export async function enhanceRecipeWithGemini(
  recipe: Recipe,
  availableIngredientNames: string[]
): Promise<EnhancedRecipeContent> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return {
      description: recipe.description,
      instructions: recipe.instructions,
      alternatives: recipe.alternatives,
      source: 'fallback',
      note: 'Using curated database recipe steps (Gemini API key not configured).',
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const ingredientList = recipe.ingredients
      .map((i) => `${i.ingredient_name}: ${i.quantity_g}g`)
      .join(', ');

    const prompt = `You are a practical culinary nutrition assistant helping budget-conscious students cook affordable South Asian and everyday meals.
Enhance the cooking guide for this exact recipe WITHOUT changing ingredient weights or inventing nutrition numbers:

Recipe Title: ${recipe.title}
Meal Slot: ${recipe.meal_slot}
Exact Ingredients: ${ingredientList}
Available Local Pantry Substitutes (pick only from this exact list if suggesting alternatives): ${availableIngredientNames.slice(0, 45).join(', ')}

Provide:
1. A concise, appetizing 1-2 sentence description.
2. 4-6 clear, beginner-friendly step-by-step cooking instructions referencing the exact ingredients.
3. Up to 2 budget-friendly ingredient substitution suggestions using ONLY ingredient names from the available local pantry list.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'Return valid JSON matching the schema. Do not invent calorie or cost numbers. Suggest substitutes strictly from the provided ingredient list.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            instructions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            alternatives: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original_ingredient: { type: Type.STRING },
                  substitute_ingredient: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ['original_ingredient', 'substitute_ingredient', 'reason'],
              },
            },
          },
          required: ['description', 'instructions', 'alternatives'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      description?: string;
      instructions?: string[];
      alternatives?: RecipeAlternative[];
    };

    if (parsed.instructions && parsed.instructions.length >= 2) {
      return {
        description: parsed.description || recipe.description,
        instructions: parsed.instructions,
        alternatives: Array.isArray(parsed.alternatives) && parsed.alternatives.length > 0
          ? parsed.alternatives
          : recipe.alternatives,
        source: 'gemini',
      };
    }

    return {
      description: recipe.description,
      instructions: recipe.instructions,
      alternatives: recipe.alternatives,
      source: 'fallback',
      note: 'Returned database fallback instructions.',
    };
  } catch (err) {
    console.warn('Gemini enhancement fallback triggered:', err instanceof Error ? err.message : String(err));
    return {
      description: recipe.description,
      instructions: recipe.instructions,
      alternatives: recipe.alternatives,
      source: 'fallback',
      note: 'Gemini service temporarily unavailable; showing verified database recipe.',
    };
  }
}
