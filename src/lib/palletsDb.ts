// Pallet (estiba) loan & return ledger. 100% localStorage-persisted so it
// rides along inside db backups. Storage key is included in backup.ts.

const KEY = 'gyc_pallets_v1';
const EVENT = 'pallets-updated';

export interface PalletMovement {
  id: string;
  saleId?: string;             // link to a sale_records row when applicable
  client: string;              // client / ferretería
  delivered: number;           // pallets handed over (+)
  received: number;            // pallets returned (-)
  date: string;                // YYYY-MM-DD (local)
  createdAt: number;           // ms
  userId: string | null;       // author stamp
  userName: string;
  userRole: string;
  note?: string;
}

export interface PalletsState {
  warehouse: number;           // physical inventory at the warehouse
  movements: PalletMovement[];
  updatedAt: number;
}

function emptyState(): PalletsState {
  return { warehouse: 0, movements: [], updatedAt: Date.now() };
}

function read(): PalletsState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as PalletsState;
    return { warehouse: Number(parsed.warehouse) || 0, movements: Array.isArray(parsed.movements) ? parsed.movements : [], updatedAt: parsed.updatedAt || Date.now() };
  } catch { return emptyState(); }
}

function write(state: PalletsState) {
  state.updatedAt = Date.now();
  localStorage.setItem(KEY, JSON.stringify(state));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT));
}

function currentUserSnapshot() {
  try {
    const raw = localStorage.getItem('db_gyc_config');
    if (!raw) return { id: null, name: 'Sistema', role: 'admin' };
    const db = JSON.parse(raw);
    const u = db.users?.find((x: any) => x.id === db.currentUserId);
    if (!u) return { id: null, name: 'Sistema', role: 'admin' };
    return { id: u.id, name: u.name, role: u.role };
  } catch { return { id: null, name: 'Sistema', role: 'admin' }; }
}

export function getPalletsState(): PalletsState { return read(); }

export function setWarehouseCount(n: number) {
  const s = read();
  s.warehouse = Math.max(0, Math.round(Number(n) || 0));
  write(s);
}

export interface ClientBalance {
  client: string;
  delivered: number;
  received: number;
  balance: number; // delivered - received
  movements: number;
}

export function getClientBalances(): ClientBalance[] {
  const s = read();
  const map = new Map<string, ClientBalance>();
  for (const m of s.movements) {
    const key = (m.client || 'Sin cliente').trim();
    const row = map.get(key) || { client: key, delivered: 0, received: 0, balance: 0, movements: 0 };
    row.delivered += Number(m.delivered) || 0;
    row.received += Number(m.received) || 0;
    row.movements += 1;
    map.set(key, row);
  }
  return Array.from(map.values())
    .map(r => ({ ...r, balance: r.delivered - r.received }))
    .sort((a, b) => b.balance - a.balance || a.client.localeCompare(b.client));
}

export function totalsInCirculation(): number {
  return getClientBalances().reduce((s, r) => s + Math.max(0, r.balance), 0);
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Adds a movement and adjusts warehouse inventory: -delivered + received. */
export function addMovement(input: {
  client: string;
  delivered: number;
  received: number;
  saleId?: string;
  note?: string;
}): PalletMovement | null {
  const delivered = Math.max(0, Math.round(Number(input.delivered) || 0));
  const received = Math.max(0, Math.round(Number(input.received) || 0));
  if (delivered === 0 && received === 0) return null; // bulk dispatch, nothing to log

  const u = currentUserSnapshot();
  const mv: PalletMovement = {
    id: crypto.randomUUID(),
    saleId: input.saleId,
    client: (input.client || 'Sin cliente').trim() || 'Sin cliente',
    delivered,
    received,
    date: todayLocal(),
    createdAt: Date.now(),
    userId: u.id,
    userName: u.name,
    userRole: u.role,
    note: input.note,
  };
  const s = read();
  s.movements.unshift(mv);
  s.warehouse = Math.max(0, s.warehouse - delivered + received);
  write(s);
  return mv;
}

export function removeMovement(id: string) {
  const s = read();
  const mv = s.movements.find(m => m.id === id);
  if (!mv) return;
  // reverse warehouse delta
  s.warehouse = Math.max(0, s.warehouse + mv.delivered - mv.received);
  s.movements = s.movements.filter(m => m.id !== id);
  write(s);
}

export function removeMovementsBySale(saleId: string) {
  const s = read();
  const affected = s.movements.filter(m => m.saleId === saleId);
  if (!affected.length) return;
  for (const mv of affected) {
    s.warehouse = Math.max(0, s.warehouse + mv.delivered - mv.received);
  }
  s.movements = s.movements.filter(m => m.saleId !== saleId);
  write(s);
}

export function clearAllMovements() {
  const s = read();
  s.movements = [];
  write(s);
}

export const PALLETS_EVENT = EVENT;
export const PALLETS_STORAGE_KEY = KEY;