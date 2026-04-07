import { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'admin' | 'viewer';

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isAdmin: boolean;
}

const RoleContext = createContext<RoleContextType>({
  role: 'viewer',
  setRole: () => {},
  isAdmin: false,
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('viewer');
  return (
    <RoleContext.Provider value={{ role, setRole, isAdmin: role === 'admin' }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
