import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { getCurrentUser, logout as authLogout, login as authLogin, type UserProfile, type AppRole, ROLE_LABEL } from '@/lib/authDb';

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

  const refresh = useCallback(() => setUser(getCurrentUser()), []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('auth-db-updated', handler);
    return () => window.removeEventListener('auth-db-updated', handler);
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
    logout: () => { authLogout(); refresh(); },
    setRole: () => {},
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() { return useContext(RoleContext); }
