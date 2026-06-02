import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Plus, Eye, EyeOff, Copy, Sparkles, Trash2, Shield, KeyRound, Save } from 'lucide-react';
import { listUsers, createUser, updateUser, deleteUser, generateInviteCode, ROLE_LABEL, type UserProfile, type AppRole } from '@/lib/authDb';
import { toast } from 'sonner';

export function UsersAdminPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('viewer');

  const refresh = () => setUsers(listUsers());
  useEffect(() => { refresh(); }, []);

  const handleGenerate = () => setNewCode(generateInviteCode());
  const handleCopy = (code: string) => { navigator.clipboard.writeText(code); toast.success('Código copiado'); };

  const handleCreate = () => {
    if (!newName.trim()) return toast.error('Ingresa el nombre');
    if (!/^\d{10}$/.test(newCode.trim())) return toast.error('El código debe tener 10 dígitos');
    if (newPass.length < 4) return toast.error('La contraseña debe tener al menos 4 caracteres');
    try {
      createUser({ name: newName.trim(), inviteCode: newCode.trim(), password: newPass, role: newRole });
      toast.success(`Usuario "${newName}" creado como ${ROLE_LABEL[newRole]}`);
      setNewName(''); setNewCode(''); setNewPass(''); setNewRole('viewer');
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleToggle = (u: UserProfile, val: boolean) => {
    if (u.isMaster) return toast.error('No se puede desactivar al Administrador Maestro');
    updateUser(u.id, { enabled: val });
    refresh();
    toast.success(val ? `${u.name} activado` : `${u.name} bloqueado`);
  };

  const handleRole = (u: UserProfile, role: AppRole) => {
    if (u.isMaster) return;
    updateUser(u.id, { role });
    refresh();
  };

  const handleDelete = (u: UserProfile) => {
    if (u.isMaster) return toast.error('No se puede eliminar al Administrador Maestro');
    if (!confirm(`¿Eliminar al usuario "${u.name}"?`)) return;
    deleteUser(u.id);
    refresh();
    toast.success('Usuario eliminado');
  };

  const handleEditPassword = (u: UserProfile) => {
    const np = prompt(`Nueva contraseña para ${u.name}:`);
    if (!np || np.length < 4) return;
    updateUser(u.id, { password: np });
    refresh();
    toast.success('Contraseña actualizada');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Gestión de Usuarios y Accesos</h3>
          <p className="text-sm text-muted-foreground">Crea códigos de invitación, asigna roles y bloquea cuentas en cualquier momento.</p>
        </div>
      </div>

      {/* New user form */}
      <div className="glass-card p-4 space-y-3">
        <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4 text-primary" /> Crear nuevo perfil
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre" className="bg-secondary border-border" />
          <div className="flex gap-1">
            <Input value={newCode} onChange={e => setNewCode(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Código 10 díg." className="bg-secondary border-border tracking-widest" />
            <Button type="button" size="icon" variant="outline" onClick={handleGenerate} title="Generar aleatorio">
              <Sparkles className="w-4 h-4" />
            </Button>
            {newCode && (
              <Button type="button" size="icon" variant="outline" onClick={() => handleCopy(newCode)} title="Copiar código">
                <Copy className="w-4 h-4" />
              </Button>
            )}
          </div>
          <Input type="text" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Contraseña" className="bg-secondary border-border" />
          <select value={newRole} onChange={e => setNewRole(e.target.value as AppRole)} className="h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground">
            <option value="viewer">Visitante (solo lectura)</option>
            <option value="supervisor">Supervisor (crea + descarga)</option>
            <option value="admin">Administrador (control total)</option>
          </select>
          <Button onClick={handleCreate} className="gradient-orange text-primary-foreground">
            <Plus className="w-4 h-4 mr-1" /> Crear
          </Button>
        </div>
      </div>

      {/* Users table */}
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-primary">Nombre</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Rango</TableHead>
              <TableHead>Contraseña</TableHead>
              <TableHead className="text-center">Activo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(u => {
              const isShown = !!reveal[u.id];
              return (
                <TableRow key={u.id} className="border-border">
                  <TableCell className="font-medium text-foreground">
                    {u.name}
                    {u.isMaster && <Shield className="inline w-3.5 h-3.5 ml-1 text-primary" />}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span>{u.inviteCode}</span>
                      <button onClick={() => handleCopy(u.inviteCode)} className="text-muted-foreground hover:text-primary" title="Copiar">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.isMaster ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">{ROLE_LABEL[u.role]}</span>
                    ) : (
                      <select value={u.role} onChange={e => handleRole(u, e.target.value as AppRole)} className="h-8 rounded-md border border-border bg-secondary px-2 text-xs text-foreground">
                        <option value="viewer">{ROLE_LABEL.viewer}</option>
                        <option value="supervisor">{ROLE_LABEL.supervisor}</option>
                        <option value="admin">{ROLE_LABEL.admin}</option>
                      </select>
                    )}
                  </TableCell>
                  <TableCell className="font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-muted-foreground">{isShown ? u.password : '••••••'}</span>
                      <button onClick={() => setReveal(r => ({ ...r, [u.id]: !r[u.id] }))} className="text-muted-foreground hover:text-foreground" title={isShown ? 'Ocultar' : 'Ver'}>
                        {isShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={u.enabled} onCheckedChange={(v) => handleToggle(u, v)} disabled={u.isMaster} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEditPassword(u)} title="Cambiar contraseña" disabled={u.isMaster && false}>
                        <KeyRound className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(u)} className="text-muted-foreground hover:text-destructive" disabled={u.isMaster} title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        El <strong>Administrador Maestro</strong> está protegido: no puede ser desactivado ni eliminado, y mantiene siempre el código <code className="font-mono">3010285904</code>.
      </p>
    </div>
  );
}
