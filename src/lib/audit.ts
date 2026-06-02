import Dexie, { Table } from 'dexie';

export type AuditTable = 'sales' | 'production' | 'attendance' | 'raw_materials' | 'guides';

export interface AuditEntry {
  key: string; // `${table}:${recordId}` (PK)
  table: AuditTable;
  recordId: string;
  userId: string | null;
  userName: string;
  role: string;
  at: number; // unix ms
}

class AuditDatabase extends Dexie {
  audits!: Table<AuditEntry, string>;
  constructor() {
    super('gyc_audit');
    this.version(1).stores({ audits: '&key, table, recordId, at' });
  }
}

export const auditDb = new AuditDatabase();

function getCurrentSnapshot() {
  try {
    const raw = localStorage.getItem('db_gyc_config');
    if (!raw) return { id: null, name: 'Sistema', role: 'admin' };
    const db = JSON.parse(raw);
    const u = db.users?.find((x: any) => x.id === db.currentUserId);
    if (!u) return { id: null, name: 'Sistema', role: 'admin' };
    return { id: u.id, name: u.name, role: u.role };
  } catch { return { id: null, name: 'Sistema', role: 'admin' }; }
}

export async function recordAudit(table: AuditTable, recordId: string) {
  const u = getCurrentSnapshot();
  const entry: AuditEntry = {
    key: `${table}:${recordId}`,
    table,
    recordId,
    userId: u.id,
    userName: u.name,
    role: u.role,
    at: Date.now(),
  };
  await auditDb.audits.put(entry);
  window.dispatchEvent(new CustomEvent('audit-updated', { detail: { table, recordId } }));
}

export async function listAuditsFor(table: AuditTable): Promise<Record<string, AuditEntry>> {
  const rows = await auditDb.audits.where('table').equals(table).toArray();
  const map: Record<string, AuditEntry> = {};
  rows.forEach(r => { map[r.recordId] = r; });
  return map;
}

export async function deleteAudit(table: AuditTable, recordId: string) {
  await auditDb.audits.delete(`${table}:${recordId}`);
}

export async function clearAuditsFor(table: AuditTable) {
  const rows = await auditDb.audits.where('table').equals(table).toArray();
  for (const r of rows) await auditDb.audits.delete(r.key);
}

export async function clearAllAudits() {
  await auditDb.audits.clear();
}

/** React hook to subscribe to audits for a specific table */
import { useEffect, useState } from 'react';
export function useAudits(table: AuditTable) {
  const [map, setMap] = useState<Record<string, AuditEntry>>({});
  useEffect(() => {
    let alive = true;
    const load = () => listAuditsFor(table).then(m => alive && setMap(m));
    load();
    const handler = () => load();
    window.addEventListener('audit-updated', handler);
    return () => { alive = false; window.removeEventListener('audit-updated', handler); };
  }, [table]);
  return map;
}

export function formatAuditStamp(entry?: AuditEntry): string {
  if (!entry) return '—';
  const d = new Date(entry.at);
  const date = d.toLocaleDateString('es-VE');
  const time = d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  return `${entry.userName} · ${date} ${time}`;
}
