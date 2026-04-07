import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Lock } from 'lucide-react';
import type { UserRole } from '@/contexts/RoleContext';

const PINS: Record<string, UserRole> = {
  '8799396': 'admin',
  '3456789': 'viewer',
};

const AUTH_KEY = 'device_authorized';
const ROLE_KEY = 'device_role';

export function useDeviceAuth() {
  const [authorized, setAuthorized] = useState(() => localStorage.getItem(AUTH_KEY) === 'true');
  const [storedRole, setStoredRole] = useState<UserRole>(() => (localStorage.getItem(ROLE_KEY) as UserRole) || 'viewer');

  const authorize = (role: UserRole) => {
    localStorage.setItem(AUTH_KEY, 'true');
    localStorage.setItem(ROLE_KEY, role);
    setAuthorized(true);
    setStoredRole(role);
  };

  const revoke = () => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(ROLE_KEY);
    setAuthorized(false);
    setStoredRole('viewer');
  };

  return { authorized, storedRole, authorize, revoke };
}

interface PinGateProps {
  onAuthorized: (role: UserRole) => void;
}

export function PinGate({ onAuthorized }: PinGateProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const role = PINS[pin];
    if (role) {
      onAuthorized(role);
      setError(false);
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-sm w-full space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl gradient-orange flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Acceso Restringido</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ingresa la clave de acceso para autorizar este dispositivo
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            value={pin}
            onChange={e => { setPin(e.target.value); setError(false); }}
            placeholder="••••••••"
            className="bg-secondary border-border text-center text-lg tracking-widest"
            autoFocus
          />
          {error && (
            <p className="text-sm text-destructive">Clave incorrecta. Intenta de nuevo.</p>
          )}
          <Button type="submit" className="w-full gradient-orange text-primary-foreground hover:opacity-90">
            <ShieldCheck className="w-4 h-4 mr-2" /> Autorizar Dispositivo
          </Button>
        </form>
      </div>
    </div>
  );
}
