// Local persistence for RBAC. Single JSON blob in localStorage under db_gyc_config.
// Mirrors the spec "db_gyc_config.json" requirement on the web platform.

export type AppRole = 'admin' | 'supervisor' | 'viewer';

export interface UserProfile {
  id: string;
  name: string;
  inviteCode: string; // 10-digit code
  password: string;
  role: AppRole;
  enabled: boolean;
  createdAt: number;
  isMaster?: boolean;
}

interface AuthDb {
  users: UserProfile[];
  currentUserId?: string | null;
  version: number;
}

const STORAGE_KEY = 'db_gyc_config';
const CURRENT_VERSION = 1;

const MASTER_CODE = '3010285904';
const MASTER_PASS = '8799396';

function defaultDb(): AuthDb {
  return {
    users: [
      {
        id: 'master',
        name: 'Administrador Maestro',
        inviteCode: MASTER_CODE,
        password: MASTER_PASS,
        role: 'admin',
        enabled: true,
        createdAt: Date.now(),
        isMaster: true,
      },
    ],
    currentUserId: null,
    version: CURRENT_VERSION,
  };
}

function load(): AuthDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const def = defaultDb();
      save(def);
      return def;
    }
    const parsed = JSON.parse(raw) as AuthDb;
    // ensure master always exists & is admin/enabled
    const master = parsed.users.find(u => u.isMaster || u.inviteCode === MASTER_CODE);
    if (!master) {
      parsed.users.unshift(defaultDb().users[0]);
      save(parsed);
    } else {
      // keep master immutable on critical fields
      master.role = 'admin';
      master.enabled = true;
      master.inviteCode = MASTER_CODE;
      master.password = MASTER_PASS;
      master.isMaster = true;
    }
    return parsed;
  } catch {
    const def = defaultDb();
    save(def);
    return def;
  }
}

function save(db: AuthDb) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('auth-db-updated'));
}

export function listUsers(): UserProfile[] {
  return load().users;
}

export function getUserByCode(code: string): UserProfile | undefined {
  return load().users.find(u => u.inviteCode === code.trim());
}

export function getCurrentUser(): UserProfile | null {
  const db = load();
  if (!db.currentUserId) return null;
  return db.users.find(u => u.id === db.currentUserId) || null;
}

export function setCurrentUser(userId: string | null) {
  const db = load();
  db.currentUserId = userId;
  save(db);
}

export function login(code: string, password: string):
  | { ok: true; user: UserProfile }
  | { ok: false; reason: 'NOT_FOUND' | 'DISABLED' | 'BAD_PASSWORD' } {
  const user = getUserByCode(code);
  if (!user) return { ok: false, reason: 'NOT_FOUND' };
  if (!user.enabled) return { ok: false, reason: 'DISABLED' };
  if (user.password !== password) return { ok: false, reason: 'BAD_PASSWORD' };
  setCurrentUser(user.id);
  return { ok: true, user };
}

export function logout() { setCurrentUser(null); }

export function detectRoleFromCode(code: string): AppRole | null {
  const u = getUserByCode(code);
  return u ? u.role : null;
}

export function createUser(input: { name: string; inviteCode: string; password: string; role: AppRole }): UserProfile {
  const db = load();
  if (db.users.some(u => u.inviteCode === input.inviteCode)) {
    throw new Error('Ya existe un usuario con ese código de invitación');
  }
  const u: UserProfile = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    inviteCode: input.inviteCode.trim(),
    password: input.password,
    role: input.role,
    enabled: true,
    createdAt: Date.now(),
  };
  db.users.push(u);
  save(db);
  return u;
}

export function updateUser(id: string, patch: Partial<Omit<UserProfile, 'id' | 'isMaster'>>) {
  const db = load();
  const u = db.users.find(x => x.id === id);
  if (!u) return;
  if (u.isMaster) {
    // protect critical fields on master
    delete patch.inviteCode;
    delete patch.role;
    delete patch.enabled;
  }
  Object.assign(u, patch);
  save(db);
}

export function deleteUser(id: string) {
  const db = load();
  const u = db.users.find(x => x.id === id);
  if (!u || u.isMaster) return;
  db.users = db.users.filter(x => x.id !== id);
  if (db.currentUserId === id) db.currentUserId = null;
  save(db);
}

/** Validate against any currently enabled admin password. Master pass always valid. */
export function isValidActiveAdminPassword(password: string): boolean {
  if (password === MASTER_PASS) return true;
  return load().users.some(u => u.role === 'admin' && u.enabled && u.password === password);
}

export function generateInviteCode(): string {
  // 10 random digits, leading digit non-zero
  let s = String(Math.floor(Math.random() * 9) + 1);
  for (let i = 1; i < 10; i++) s += Math.floor(Math.random() * 10);
  return s;
}

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  viewer: 'Visitante',
};

export function roleRank(r: AppRole): number {
  return r === 'admin' ? 3 : r === 'supervisor' ? 2 : 1;
}
