import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Lock, UserPlus, LogIn, Eye, EyeOff, KeyRound, Copy, Sparkles } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { createUser, detectRoleFromCode, generateInviteCode, ROLE_LABEL, type AppRole } from '@/lib/authDb';
import { toast } from 'sonner';

type Mode = 'login' | 'signup';

export function AuthGate() {
  const { loginWith, refresh, user } = useRole();
  const [mode, setMode] = useState<Mode>('login');

  if (user) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl gradient-orange flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Control de Gestión GYC</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? 'Ingresa con tu código y contraseña' : 'Regístrate con un código de invitación'}
          </p>
        </div>

        <div className="flex gap-1 bg-secondary/60 rounded-lg p-1">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'login' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground'
            }`}
          ><LogIn className="w-4 h-4" /> Ingresar</button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'signup' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground'
            }`}
          ><UserPlus className="w-4 h-4" /> Registrarme</button>
        </div>

        {mode === 'login' ? <LoginForm onSuccess={refresh} loginWith={loginWith} /> : <SignupForm onSwitch={() => setMode('login')} />}
      </div>
    </div>
  );
}

function LoginForm({ onSuccess, loginWith }: { onSuccess: () => void; loginWith: ReturnType<typeof useRole>['loginWith'] }) {
  const [code, setCode] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedRole, setDetectedRole] = useState<AppRole | null>(null);

  useEffect(() => {
    if (code.trim().length >= 6) {
      setDetectedRole(detectRoleFromCode(code));
    } else setDetectedRole(null);
  }, [code]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = loginWith(code, pass);
    if (res.ok) { onSuccess(); return; }
    const reason = res.reason;
    if (reason === 'NOT_FOUND') setError('Código de invitación incorrecto');
    else if (reason === 'DISABLED') setError('Acceso bloqueado por admin');
    else setError('Contraseña incorrecta');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Código de invitación</label>
        <Input value={code} onChange={e => { setCode(e.target.value); setError(null); }} placeholder="10 dígitos" className="bg-secondary border-border tracking-widest" autoFocus />
        {detectedRole && (
          <p className="text-[11px] mt-1 text-primary">Rol detectado: <span className="font-semibold">{ROLE_LABEL[detectedRole]}</span></p>
        )}
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Contraseña</label>
        <div className="relative">
          <Input type={show ? 'text' : 'password'} value={pass} onChange={e => { setPass(e.target.value); setError(null); }} placeholder="••••••" className="bg-secondary border-border pr-9" />
          <button type="button" onClick={() => setShow(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full gradient-orange text-primary-foreground hover:opacity-90">
        <ShieldCheck className="w-4 h-4 mr-2" /> Ingresar
      </Button>
    </form>
  );
}

function SignupForm({ onSwitch }: { onSwitch: () => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [detectedRole, setDetectedRole] = useState<AppRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code.trim().length >= 6) setDetectedRole(detectRoleFromCode(code));
    else setDetectedRole(null);
  }, [code]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Ingresa tu nombre');
    if (!/^\d{10}$/.test(code.trim())) return setError('El código debe tener 10 dígitos');
    if (pass.length < 4) return setError('La contraseña debe tener al menos 4 caracteres');
    if (pass !== pass2) return setError('Las contraseñas no coinciden');
    // If code already exists in DB, it means a user is already registered there
    if (detectedRole) return setError('Ese código ya fue usado. Pide otro al administrador.');
    try {
      // Self-signup defaults to viewer; admin must promote to supervisor/admin via panel
      createUser({ name: name.trim(), inviteCode: code.trim(), password: pass, role: 'viewer' });
      toast.success('Usuario creado. Ya puedes iniciar sesión.');
      onSwitch();
    } catch (err: any) {
      setError(err.message || 'Error al registrar');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Nombre completo</label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Juan Pérez" className="bg-secondary border-border" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Código de invitación (10 dígitos)</label>
        <Input value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(null); }} placeholder="0000000000" className="bg-secondary border-border tracking-widest" />
        {detectedRole && (
          <p className="text-[11px] mt-1 text-destructive">⚠ Ese código ya está registrado como {ROLE_LABEL[detectedRole]}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Contraseña</label>
          <Input type="password" value={pass} onChange={e => setPass(e.target.value)} className="bg-secondary border-border" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Repetir</label>
          <Input type="password" value={pass2} onChange={e => setPass2(e.target.value)} className="bg-secondary border-border" />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full gradient-orange text-primary-foreground hover:opacity-90">
        <UserPlus className="w-4 h-4 mr-2" /> Crear cuenta
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">
        Las cuentas auto-registradas inician como <span className="text-foreground font-semibold">Visitante</span> hasta que un admin las promueva.
      </p>
    </form>
  );
}
