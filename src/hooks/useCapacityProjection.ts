import { useEffect, useState } from 'react';
import { listRecipes } from '@/lib/recipesDb';
import type { RecipeRow } from '@/lib/recipesDb';
import { useMaterialStock } from '@/hooks/useMaterialStock';

export interface CapacityResult {
  product: string;
  maxSacks: number;
  limitingMaterial: string | null;
}

const PRODUCT_ORDER = ['Pego Gris', 'Pego Blanco', 'Pego Premium'];

/**
 * For each product, compute how many sacks can be produced before the
 * first material runs out, given current `material_stock` levels.
 */
export function useCapacityProjection() {
  const { stocks, loading, getStock } = useMaterialStock();
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);

  useEffect(() => {
    const load = () => listRecipes().then(setRecipes);
    load();
    window.addEventListener('recipes-updated', load);
    return () => window.removeEventListener('recipes-updated', load);
  }, []);

  const orderedRecipes = [...recipes].sort((a, b) => {
    const ai = PRODUCT_ORDER.indexOf(a.product);
    const bi = PRODUCT_ORDER.indexOf(b.product);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const projections: CapacityResult[] = orderedRecipes.map(({ product, ingredients }) => {
    let min = Infinity;
    let limiting: string | null = null;
    for (const r of ingredients) {
        if (r.qty <= 0) continue;
        const available = getStock(r.material);
        const possible = Math.floor(available / r.qty);
        if (possible < min) {
          min = possible;
          limiting = r.material;
        }
    }
    return {
      product,
      maxSacks: Number.isFinite(min) ? min : 0,
      limitingMaterial: limiting,
    };
  });
  // touch stocks so eslint/dep tracker is happy
  void stocks;

  return { projections, loading };
}