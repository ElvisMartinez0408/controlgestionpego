import { useEffect, useState, useCallback } from 'react';
import { listRecipes, saveRecipe, type RecipeRow } from '@/lib/recipesDb';
import type { RecipeConsumption } from '@/lib/recipes';

export function useRecipes() {
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const r = await listRecipes();
    setRecipes(r);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const h = () => refresh();
    window.addEventListener('recipes-updated', h);
    return () => window.removeEventListener('recipes-updated', h);
  }, [refresh]);

  const update = async (product: string, ingredients: RecipeConsumption[]) => {
    await saveRecipe(product, ingredients);
    await refresh();
  };

  return { recipes, loading, update, refresh };
}