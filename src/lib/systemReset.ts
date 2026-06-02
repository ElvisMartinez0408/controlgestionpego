import { supabase } from '@/integrations/supabase/client';
import { recipesDb } from '@/lib/recipesDb';
import { clearAllGuideMetadata } from '@/lib/guidesDb';
import { clearAllAudits } from '@/lib/audit';

const ANY_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Full system reset: wipes all operational history (attendance, production,
 * sales, guides, inventory) while preserving recipes and company settings.
 */
export async function fullSystemReset() {
  // History tables in Supabase
  await Promise.all([
    supabase.from('attendance_records').delete().neq('id', ANY_ID),
    supabase.from('production_records').delete().neq('id', ANY_ID),
    supabase.from('sale_records').delete().neq('id', ANY_ID),
    supabase.from('raw_materials').delete().neq('id', ANY_ID),
    (supabase as any).from('material_stock').delete().neq('id', ANY_ID),
    (supabase as any).from('finished_product_stock').delete().neq('id', ANY_ID),
    (supabase as any).from('custom_supplies').delete().neq('id', ANY_ID),
  ]);

  // Local stores (Dexie) — keep recipes, wipe snapshots, defective bags & guide metadata
  await recipesDb.snapshots.clear();
  await recipesDb.defectiveBags.clear();
  await clearAllGuideMetadata();
  await clearAllAudits();

  // Notify any listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('material-stock-updated'));
    window.dispatchEvent(new CustomEvent('defective-bags-updated'));
  }
}