/**
 * Recetas unitarias por saco producido.
 * Las cantidades de materiales se expresan en KILOS, las bolsas en UNIDADES.
 * Estas claves DEBEN coincidir con `material_name` en la tabla material_stock.
 */
export interface RecipeConsumption {
  material: string;
  qty: number; // por 1 saco
}

export const RECIPES: Record<string, RecipeConsumption[]> = {
  'Pego Gris': [
    { material: 'Arena', qty: 9.8 },
    { material: 'Cemento Gris', qty: 4.2 },
    { material: 'Celulosa', qty: 0.0155 },
    { material: 'Bobina de Envoplast', qty: 0.004 },
    { material: 'Bolsa Gris', qty: 1 },
  ],
  'Pego Blanco': [
    { material: 'Arena', qty: 9.705 },
    { material: 'Cemento Blanco', qty: 4.411 },
    { material: 'Celulosa', qty: 0.0182 },
    { material: 'Bobina de Envoplast', qty: 0.004 },
    { material: 'Bolsa Blanco', qty: 1 },
  ],
  'Pego Premium': [
    { material: 'Arena', qty: 17.333 },
    { material: 'Cemento Blanco', qty: 8.333 },
    { material: 'Celulosa', qty: 0.040 },
    { material: 'Silicón', qty: 0.040 },
    { material: 'Redispersable', qty: 0.080 },
    { material: 'Bobina de Envoplast', qty: 0.004 },
    { material: 'Bolsa Premium', qty: 1 },
  ],
};

export const SHIFT_STATUSES = [
  'Normal',
  'Falla Eléctrica',
  'Falla Mecánica',
  'Falta de Personal',
  'Falta de Insumo',
] as const;

export type ShiftStatus = typeof SHIFT_STATUSES[number];

/** Returns total consumption for `sacks` units of `product`. */
export function computeConsumption(product: string, sacks: number): RecipeConsumption[] {
  const recipe = RECIPES[product];
  if (!recipe) return [];
  return recipe.map(r => ({ material: r.material, qty: r.qty * sacks }));
}
