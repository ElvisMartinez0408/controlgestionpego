import { useMemo } from 'react';
import { RECIPES } from '@/lib/recipes';
import { useMaterialStock } from '@/hooks/useMaterialStock';

export interface CapacityResult {
  product: string;
  maxSacks: number;
  limitingMaterial: string | null;
}

/**
 * For each product, compute how many sacks can be produced before the
 * first material runs out, given current `material_stock` levels.
 */
export function useCapacityProjection() {
  const { stocks, loading, getStock } = useMaterialStock();

  const projections = useMemo<CapacityResult[]>(() => {
    return Object.entries(RECIPES).map(([product, recipe]) => {
      let min = Infinity;
      let limiting: string | null = null;
      for (const r of recipe) {
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
    // re-run when stocks change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stocks]);

  return { projections, loading };
}