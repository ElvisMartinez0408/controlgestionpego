import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Lock } from 'lucide-react';
import { isValidActiveAdminPassword } from '@/lib/authDb';
import { toast } from 'sonner';

interface PinConfirmDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  requireConfirmWord?: boolean;
  confirmWord?: string;
  destructiveLabel?: string;
  onConfirm: () => void | Promise<void>;
}

export function PinConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  requireConfirmWord = false,
  confirmWord = 'Confirmar',
  destructiveLabel = 'Eliminar',
  onConfirm,
}: PinConfirmDialogProps) {
  const [pin, setPin] = useState('');
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setPin(''); setWord(''); setBusy(false); }
  }, [open]);

  const canSubmit = isValidActiveAdminPassword(pin) && (!requireConfirmWord || word.trim() === confirmWord);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidActiveAdminPassword(pin)) { toast.error('Clave de administrador incorrecta'); return; }
    if (requireConfirmWord && word.trim() !== confirmWord) {
      toast.error(`Debe escribir exactamente "${confirmWord}"`);
      return;
    }
    setBusy(true);
    try { await onConfirm(); onOpenChange(false); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="w-5 h-5" /> {title}
          </DialogTitle>
          {description && <DialogDescription className="text-muted-foreground">{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Lock className="w-3 h-3" /> Clave de administrador</label>
            <Input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="••••••••" autoFocus className="bg-secondary border-border tracking-widest" />
          </div>
          {requireConfirmWord && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Escriba <span className="text-destructive font-bold">{confirmWord}</span> para validar</label>
              <Input value={word} onChange={e => setWord(e.target.value)} placeholder={confirmWord} className="bg-secondary border-border" />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!canSubmit || busy} variant="destructive">
              {busy ? 'Procesando…' : destructiveLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}