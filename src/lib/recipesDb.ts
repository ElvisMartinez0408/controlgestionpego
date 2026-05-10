import Dexie, { Table } from 'dexie';
import { RECIPES as DEFAULT_RECIPES, type RecipeConsumption } from './recipes';

export interface RecipeRow {
  product: string; // PK
  ingredients: RecipeConsumption[];
  updatedAt: number;
}

export interface ProductionSnapshot {
  productionId: string; // PK
  product: string;
  sacks: number;
  consumption: RecipeConsumption[]; // total consumed (already multiplied by sacks)
  createdAt: number;
}

export type DefectiveOrigin = 'Fábrica' | 'Obrero';
export interface DefectiveBagRow {
  id: string; // PK
  productionId?: string; // optional link to a production batch
  bagType: 'Bolsa Gris' | 'Bolsa Blanco' | 'Bolsa Premium';
  product: 'Pego Gris' | 'Pego Blanco' | 'Pego Premium';
  qty: number;
  origin: DefectiveOrigin;
  date: string; // YYYY-MM-DD
  createdAt: number;
}

class RecipesDatabase extends Dexie {
  recipes!: Table<RecipeRow, string>;
  snapshots!: Table<ProductionSnapshot, string>;
  defectiveBags!: Table<DefectiveBagRow, string>;
  constructor() {
    super('gyc_recipes');
    this.version(1).stores({
      recipes: '&product',
      snapshots: '&productionId, product',
    });
    this.version(2).stores({
      recipes: '&product',
      snapshots: '&productionId, product',
      defectiveBags: '&id, productionId, date, product',
    });
  }
}

export const recipesDb = new RecipesDatabase();

/** Ensure all default products exist in Dexie. Never overwrite user edits. */
export async function seedRecipesIfMissing() {
  const now = Date.now();
  for (const [product, ingredients] of Object.entries(DEFAULT_RECIPES)) {
    const existing = await recipesDb.recipes.get(product);
    if (!existing) {
      await recipesDb.recipes.put({ product, ingredients: [...ingredients], updatedAt: now });
    }
  }
}

export async function listRecipes(): Promise<RecipeRow[]> {
  await seedRecipesIfMissing();
  return recipesDb.recipes.toArray();
}

export async function getRecipe(product: string): Promise<RecipeConsumption[]> {
  const row = await recipesDb.recipes.get(product);
  if (row) return row.ingredients;
  return DEFAULT_RECIPES[product] ? [...DEFAULT_RECIPES[product]] : [];
}

export async function saveRecipe(product: string, ingredients: RecipeConsumption[]) {
  await recipesDb.recipes.put({ product, ingredients, updatedAt: Date.now() });
  window.dispatchEvent(new CustomEvent('recipes-updated'));
}

export async function resetRecipeToDefault(product: string) {
  if (DEFAULT_RECIPES[product]) {
    await saveRecipe(product, [...DEFAULT_RECIPES[product]]);
  }
}

export async function saveProductionSnapshot(snap: ProductionSnapshot) {
  await recipesDb.snapshots.put(snap);
}

export async function getProductionSnapshot(productionId: string) {
  return recipesDb.snapshots.get(productionId);
}

export async function deleteProductionSnapshot(productionId: string) {
  await recipesDb.snapshots.delete(productionId);
}

export async function addDefectiveBags(row: DefectiveBagRow) {
  await recipesDb.defectiveBags.put(row);
  window.dispatchEvent(new CustomEvent('defective-bags-updated'));
}

export async function listDefectiveBags(): Promise<DefectiveBagRow[]> {
  return recipesDb.defectiveBags.toArray();
}

export async function deleteDefectiveBagsByProduction(productionId: string) {
  const rows = await recipesDb.defectiveBags.where('productionId').equals(productionId).toArray();
  for (const r of rows) await recipesDb.defectiveBags.delete(r.id);
  window.dispatchEvent(new CustomEvent('defective-bags-updated'));
}

/** Compute consumption based on the CURRENT (vigente) recipe in Dexie. */
export async function computeConsumptionLive(product: string, sacks: number): Promise<RecipeConsumption[]> {
  const recipe = await getRecipe(product);
  return recipe.map(r => ({ material: r.material, qty: r.qty * sacks }));
}