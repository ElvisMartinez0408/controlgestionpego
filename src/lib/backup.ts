import { supabase } from '@/integrations/supabase/client';
import { recipesDb } from '@/lib/recipesDb';
import { guidesDb } from '@/lib/guidesDb';
import { auditDb } from '@/lib/audit';

const SUPA_TABLES = [
  'employees',
  'attendance_records',
  'production_records',
  'sale_records',
  'raw_materials',
  'material_stock',
  'finished_product_stock',
  'custom_supplies',
] as const;

const LS_KEYS = ['db_gyc_config', 'gyc_company_info_v1', 'gyc_pallets_v1'];
const ANY_ID = '00000000-0000-0000-0000-000000000000';

export interface BackupPayload {
  app: 'GYC';
  version: 1;
  exportedAt: string;
  supabase: Record<string, any[]>;
  dexie: {
    recipes: any[];
    snapshots: any[];
    defectiveBags: any[];
    guides: any[];
    audits: any[];
  };
  localStorage: Record<string, string | null>;
}

function todayFileName(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `Respaldo_GYC_${dd}_${mm}_${yyyy}.json`;
}

export async function exportBackup(): Promise<void> {
  const supa: Record<string, any[]> = {};
  for (const t of SUPA_TABLES) {
    const { data, error } = await (supabase as any).from(t).select('*');
    if (error) console.warn(`[backup] ${t}:`, error.message);
    supa[t] = data || [];
  }

  const [recipes, snapshots, defectiveBags, guides, audits] = await Promise.all([
    recipesDb.recipes.toArray(),
    recipesDb.snapshots.toArray(),
    recipesDb.defectiveBags.toArray(),
    guidesDb.guides.toArray(),
    auditDb.audits.toArray(),
  ]);

  const ls: Record<string, string | null> = {};
  for (const k of LS_KEYS) ls[k] = localStorage.getItem(k);

  const payload: BackupPayload = {
    app: 'GYC',
    version: 1,
    exportedAt: new Date().toISOString(),
    supabase: supa,
    dexie: { recipes, snapshots, defectiveBags, guides, audits },
    localStorage: ls,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = todayFileName();
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function chunk<T>(arr: T[], size = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function importBackup(payload: BackupPayload): Promise<void> {
  if (!payload || payload.app !== 'GYC') throw new Error('Archivo de respaldo no válido');

  // 1. Wipe Supabase tables (children-style order best-effort)
  for (const t of SUPA_TABLES) {
    const { error } = await (supabase as any).from(t).delete().neq('id', ANY_ID);
    if (error) console.warn(`[restore wipe ${t}]`, error.message);
  }

  // 2. Insert restored rows
  for (const t of SUPA_TABLES) {
    const rows = payload.supabase?.[t] || [];
    if (!rows.length) continue;
    for (const batch of chunk(rows)) {
      const { error } = await (supabase as any).from(t).insert(batch);
      if (error) console.warn(`[restore insert ${t}]`, error.message);
    }
  }

  // 3. Dexie: clear & repopulate
  await Promise.all([
    recipesDb.recipes.clear(),
    recipesDb.snapshots.clear(),
    recipesDb.defectiveBags.clear(),
    guidesDb.guides.clear(),
    auditDb.audits.clear(),
  ]);
  if (payload.dexie?.recipes?.length) await recipesDb.recipes.bulkPut(payload.dexie.recipes);
  if (payload.dexie?.snapshots?.length) await recipesDb.snapshots.bulkPut(payload.dexie.snapshots);
  if (payload.dexie?.defectiveBags?.length) await recipesDb.defectiveBags.bulkPut(payload.dexie.defectiveBags);
  if (payload.dexie?.guides?.length) await guidesDb.guides.bulkPut(payload.dexie.guides);
  if (payload.dexie?.audits?.length) await auditDb.audits.bulkPut(payload.dexie.audits);

  // 4. localStorage (users / company)
  if (payload.localStorage) {
    for (const [k, v] of Object.entries(payload.localStorage)) {
      if (v === null || v === undefined) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    }
  }
}

export async function readBackupFile(file: File): Promise<BackupPayload> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  return parsed as BackupPayload;
}

export const BACKUP_FILENAME = todayFileName;