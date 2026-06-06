import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Lock, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { createUser, detectRoleFromCode, ROLE_LABEL, type AppRole } from '@/lib/authDb';
import { redeemInvitationCode } from '@/lib/invitationCodes';
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
          <h1 className="text-2xl font-bold text-foreground">PegoFlex</h1>
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
    const reason = (res as { reason: string }).reason;
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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Ingresa tu nombre');
    if (!/^\d{10}$/.test(code.trim())) return setError('El código debe tener 10 dígitos');
    if (pass.length < 4) return setError('La contraseña debe tener al menos 4 caracteres');
    if (pass !== pass2) return setError('Las contraseñas no coinciden');
    if (detectRoleFromCode(code)) return setError('Ese código ya fue usado en este dispositivo.');

    setSubmitting(true);
    try {
      // Strict validation: must exist, be enabled, not used, not expired.
      // The role is decided by the admin who issued the code — NOT by the user.
      const result = await redeemInvitationCode(code.trim(), name.trim());
      if (!result.ok) {
        const reason = result.reason;
        if (reason === 'NOT_FOUND') return setError('Código de invitación inválido');
        if (reason === 'USED') return setError('Código de invitación ya utilizado');
        if (reason === 'DISABLED') return setError('Código deshabilitado por el administrador');
        if (reason === 'EXPIRED') return setError('Código de invitación expirado');
        return setError('Código inválido');
      }
      createUser({ name: name.trim(), inviteCode: code.trim(), password: pass, role: result.role });
      toast.success(`Cuenta creada como ${ROLE_LABEL[result.role]}. Ya puedes iniciar sesión.`);
      onSwitch();
    } catch (err: any) {
      setError(err.message || 'Error al registrar');
    } finally {
      setSubmitting(false);
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
        <p className="text-[11px] mt-1 text-muted-foreground">El rol será asignado automáticamente según el código emitido por el administrador.</p>
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
      <Button type="submit" disabled={submitting} className="w-full gradient-orange text-primary-foreground hover:opacity-90">
        <UserPlus className="w-4 h-4 mr-2" /> {submitting ? 'Validando…' : 'Crear cuenta'}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">
        Solo se aceptan códigos emitidos por un administrador. Cada código es de un solo uso.
      </p>
    </form>
  );
}
