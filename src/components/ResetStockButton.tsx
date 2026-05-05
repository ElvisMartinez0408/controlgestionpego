import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/contexts/RoleContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RotateCcw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

const ADMIN_PIN = '8799396';

export function ResetStockButton() {
  const { isAdmin } = useRole();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isAdmin) return null;

  const handleReset = async () => {
    if (pin !== ADMIN_PIN) {
      toast.error('Clave de administrador incorrecta');
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      await Promise.all([
        (supabase as any).from('material_stock').update({ stock: 0, updated_at: now }).not('id', 'is', null),
        (supabase as any).from('finished_product_stock').update({ stock: 0, updated_at: now }).not('id', 'is', null),
        (supabase as any).from('custom_supplies').update({ current_quantity: 0, updated_at: now }).not('id', 'is', null),
      ]);
      toast.success('Todos los stocks fueron reiniciados a 0');
      setOpen(false);
      setPin('');
    } catch (e) {
      toast.error('Error al reiniciar valores');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <RotateCcw className="w-4 h-4 mr-2" /> Reiniciar valores
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setPin(''); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" /> Confirmar reinicio total
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Esta acción pondrá en <strong>0</strong> todo el stock de materias primas, bolsas, productos terminados e insumos personalizados. El historial de entradas se conserva. Ingrese la clave de administrador para confirmar.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            placeholder="Clave de administrador"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="bg-secondary border-border"
            onKeyDown={(e) => e.key === 'Enter' && handleReset()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
            <Button onClick={handleReset} disabled={busy || !pin} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {busy ? 'Reiniciando...' : 'Reiniciar todo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}