import { useState } from 'react';
import { useCustomSupplies } from '@/hooks/useCustomSupplies';
import { useRole } from '@/contexts/RoleContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, AlertTriangle, Boxes, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CustomSuppliesSection() {
  const { supplies, loading, addSupply, updateSupply, removeSupply } = useCustomSupplies();
  const { isAdmin } = useRole();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('Kilos');
  const [threshold, setThreshold] = useState('');
  const [qty, setQty] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addSupply(name.trim(), unit.trim() || 'Kilos', Number(threshold) || 0, Number(qty) || 0);
    setName(''); setUnit('Kilos'); setThreshold(''); setQty(''); setShowForm(false);
  };

  if (loading) return null;

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Boxes className="w-4 h-4 text-primary" /> Insumos Personalizados
        </h3>
        {isAdmin && (
          <Button size="sm" variant="ghost" onClick={() => setShowForm(s => !s)} className="text-primary hover:text-primary">
            <Plus className="w-4 h-4 mr-1" /> Añadir Nuevo Insumo
          </Button>
        )}
      </div>

      {isAdmin && showForm && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 p-3 rounded-lg bg-secondary/40 border border-border">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del insumo" className="bg-secondary border-border" />
          <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="Unidad (Kilos, Litros...)" className="bg-secondary border-border" />
          <Input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="Cantidad actual" className="bg-secondary border-border" min="0" step="0.01" />
          <Input type="number" value={threshold} onChange={e => setThreshold(e.target.value)} placeholder="Umbral de alerta" className="bg-secondary border-border" min="0" step="0.01" />
          <Button onClick={handleAdd} className="gradient-orange text-primary-foreground">Registrar</Button>
        </div>
      )}

      {supplies.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay insumos personalizados registrados.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {supplies.map(s => {
            const low = s.current_quantity <= s.alert_threshold;
            const editing = editingId === s.id;
            return (
              <div
                key={s.id}
                className={cn(
                  'relative rounded-lg border p-3 bg-card/60 backdrop-blur-sm transition-all',
                  low ? 'border-destructive/50 shadow-[0_0_12px_hsl(var(--destructive)/0.15)]' : 'border-border/40',
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground">{s.name}</span>
                  <div className="flex items-center gap-1">
                    {low && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                    {isAdmin && !editing && (
                      <Button size="sm" variant="ghost" onClick={() => { setEditingId(s.id); setEditQty(String(s.current_quantity)); }} className="h-6 w-6 p-0">
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button size="sm" variant="ghost" onClick={() => removeSupply(s.id)} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                {editing ? (
                  <div className="flex items-center gap-1">
                    <Input type="number" value={editQty} onChange={e => setEditQty(e.target.value)} className="h-8 bg-secondary border-border" autoFocus />
                    <Button size="sm" onClick={async () => { await updateSupply(s.id, { current_quantity: Number(editQty) || 0 }); setEditingId(null); }} className="h-8 w-8 p-0 gradient-orange"><Check className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8 p-0"><X className="w-3 h-3" /></Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1.5">
                      <span className={cn('text-xl font-bold', low ? 'text-destructive' : 'text-primary')}>
                        {s.current_quantity.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">{s.unit}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Alerta si ≤ {s.alert_threshold.toLocaleString()} {s.unit}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
