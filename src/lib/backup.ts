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

export interface RestoreLogEntry {
  scope: 'validation' | 'wipe' | 'insert' | 'dexie' | 'localStorage';
  target: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  detail?: string;
}

export interface RestoreResult {
  ok: boolean;
  totals: { inserted: number; failed: number };
  log: RestoreLogEntry[];
}

/** Deep structural validation. Throws on missing/invalid required shape. */
export function validateBackupPayload(p: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!p || typeof p !== 'object') { errors.push('El archivo está vacío o no es un objeto JSON'); return { ok: false, errors }; }
  if (p.app !== 'GYC') errors.push(`Campo "app" inválido (esperado "GYC", recibido "${p.app}")`);
  if (typeof p.version !== 'number') errors.push('Campo "version" faltante o inválido');
  if (!p.supabase || typeof p.supabase !== 'object') errors.push('Sección "supabase" faltante');
  else {
    for (const t of SUPA_TABLES) {
      if (p.supabase[t] !== undefined && !Array.isArray(p.supabase[t])) errors.push(`Tabla "${t}" debe ser un arreglo`);
    }
  }
  if (!p.dexie || typeof p.dexie !== 'object') errors.push('Sección "dexie" faltante');
  else {
    for (const k of ['recipes', 'snapshots', 'defectiveBags', 'guides', 'audits']) {
      if (p.dexie[k] !== undefined && !Array.isArray(p.dexie[k])) errors.push(`Dexie.${k} debe ser un arreglo`);
    }
  }
  return { ok: errors.length === 0, errors };
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

/**
 * Robust restore:
 *  - Validates the payload structure first (no partial writes if invalid).
 *  - For each table, attempts a full batch first. On failure, drops down to
 *    per-row inserts so ONE bad row cannot corrupt an entire table.
 *  - Returns a structured log of every warning/error to surface in the UI.
 */
export async function importBackup(payload: BackupPayload): Promise<RestoreResult> {
  const log: RestoreLogEntry[] = [];
  let inserted = 0;
  let failed = 0;

  // 0. Validation
  const v = validateBackupPayload(payload);
  if (!v.ok) {
    v.errors.forEach(e => log.push({ scope: 'validation', target: 'payload', level: 'error', message: e }));
    return { ok: false, totals: { inserted: 0, failed: 0 }, log };
  }
  log.push({ scope: 'validation', target: 'payload', level: 'info', message: 'Estructura del respaldo válida' });

  // 1. Wipe Supabase tables
  for (const t of SUPA_TABLES) {
    const { error } = await (supabase as any).from(t).delete().neq('id', ANY_ID);
    if (error) {
      log.push({ scope: 'wipe', target: t, level: 'warn', message: `No se pudo vaciar completamente`, detail: error.message });
    }
  }

  // 2. Insert with batch-then-row fallback
  for (const t of SUPA_TABLES) {
    const rows = payload.supabase?.[t] || [];
    if (!rows.length) continue;
    for (const batch of chunk(rows)) {
      const { error } = await (supabase as any).from(t).insert(batch);
      if (!error) { inserted += batch.length; continue; }
      // Fallback: row-by-row so we know exactly which record failed
      log.push({ scope: 'insert', target: t, level: 'warn', message: `Lote falló, reintentando fila por fila (${batch.length} registros)`, detail: error.message });
      for (const row of batch) {
        const { error: e2 } = await (supabase as any).from(t).insert(row);
        if (e2) {
          failed++;
          log.push({ scope: 'insert', target: t, level: 'error', message: `Fila rechazada · id=${row.id ?? '?'}`, detail: e2.message });
        } else { inserted++; }
      }
    }
  }

  // 3. Dexie
  try {
    await Promise.all([
      recipesDb.recipes.clear(),
      recipesDb.snapshots.clear(),
      recipesDb.defectiveBags.clear(),
      guidesDb.guides.clear(),
      auditDb.audits.clear(),
    ]);
  } catch (e: any) {
    log.push({ scope: 'dexie', target: 'clear', level: 'error', message: 'No se pudo vaciar el almacén local', detail: e?.message });
  }

  const safePut = async (name: string, table: any, rows?: any[]) => {
    if (!rows?.length) return;
    try { await table.bulkPut(rows); inserted += rows.length; }
    catch (e: any) {
      log.push({ scope: 'dexie', target: name, level: 'error', message: `Fallo al importar ${rows.length} registros`, detail: e?.message });
      failed += rows.length;
    }
  };
  await safePut('recipes', recipesDb.recipes, payload.dexie?.recipes);
  await safePut('snapshots', recipesDb.snapshots, payload.dexie?.snapshots);
  await safePut('defectiveBags', recipesDb.defectiveBags, payload.dexie?.defectiveBags);
  await safePut('guides', guidesDb.guides, payload.dexie?.guides);
  await safePut('audits', auditDb.audits, payload.dexie?.audits);

  // 4. localStorage
  if (payload.localStorage) {
    for (const [k, v] of Object.entries(payload.localStorage)) {
      try {
        if (v === null || v === undefined) localStorage.removeItem(k);
        else localStorage.setItem(k, v);
      } catch (e: any) {
        log.push({ scope: 'localStorage', target: k, level: 'error', message: 'No se pudo escribir la clave', detail: e?.message });
        failed++;
      }
    }
  }

  const ok = log.every(l => l.level !== 'error');
  log.push({ scope: 'validation', target: 'summary', level: ok ? 'info' : 'warn', message: `Restauración finalizada · ${inserted} registros importados · ${failed} con error` });
  return { ok, totals: { inserted, failed }, log };
}

export async function readBackupFile(file: File): Promise<BackupPayload> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  return parsed as BackupPayload;
}

export const BACKUP_FILENAME = todayFileName;