import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { getCurrentUser, logout as authLogout, login as authLogin, type UserProfile, type AppRole, ROLE_LABEL } from '@/lib/authDb';
import { toast } from 'sonner';

export type UserRole = AppRole;

interface RoleContextType {
  user: UserProfile | null;
  role: UserRole;
  roleLabel: string;
  userName: string;
  isAdmin: boolean;
  isSupervisor: boolean;
  isViewer: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canDownload: boolean;
  canConfig: boolean;
  refresh: () => void;
  loginWith: typeof authLogin;
  logout: () => void;
  // legacy setter (no-op kept for backward compat with old callers)
  setRole: (_role: UserRole) => void;
}

const RoleContext = createContext<RoleContextType>({} as any);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => getCurrentUser());
  const prevRef = useRef<UserProfile | null>(user);

  const refresh = useCallback(() => {
    const next = getCurrentUser();
    const prev = prevRef.current;

    // If we had a session and the user is now gone/disabled → force logout
    if (prev && (!next || !next.enabled)) {
      authLogout();
      prevRef.current = null;
      setUser(null);
      toast.error('Tu acceso fue revocado por un administrador. Vuelve a iniciar sesión.');
      return;
    }
    // If the role changed under us → force re-login so user sees new role with refreshed permissions
    if (prev && next && prev.role !== next.role) {
      authLogout();
      prevRef.current = null;
      setUser(null);
      toast.info(`Tu rango fue actualizado a "${ROLE_LABEL[next.role]}". Inicia sesión nuevamente.`);
      return;
    }
    prevRef.current = next;
    setUser(next);
  }, []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('auth-db-updated', handler);
    // cross-tab sync
    const storageHandler = (e: StorageEvent) => {
      if (e.key === 'db_gyc_config' || e.key === null) refresh();
    };
    window.addEventListener('storage', storageHandler);
    // periodic safety net (e.g. external admin change in same tab from settings)
    const interval = window.setInterval(refresh, 2000);
    return () => {
      window.removeEventListener('auth-db-updated', handler);
      window.removeEventListener('storage', storageHandler);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const role: UserRole = user?.role ?? 'viewer';
  const isAdmin = role === 'admin';
  const isSupervisor = role === 'supervisor';
  const isViewer = role === 'viewer';

  const value: RoleContextType = {
    user,
    role,
    roleLabel: ROLE_LABEL[role],
    userName: user?.name ?? 'Invitado',
    isAdmin,
    isSupervisor,
    isViewer,
    canCreate: isAdmin || isSupervisor,
    canDelete: isAdmin,
    canDownload: isAdmin || isSupervisor,
    canConfig: isAdmin,
    refresh,
    loginWith: authLogin,
    logout: () => { authLogout(); prevRef.current = null; setUser(null); },
    setRole: () => {},
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() { return useContext(RoleContext); }
