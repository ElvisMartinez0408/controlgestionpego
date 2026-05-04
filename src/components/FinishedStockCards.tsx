import { useState } from 'react';
import { useFinishedStock, FINISHED_PRODUCTS } from '@/hooks/useFinishedStock';
import { useRole } from '@/contexts/RoleContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRODUCT_ACCENT: Record<string, string> = {
  'Pego Gris': 'from-zinc-500/20 to-zinc-700/10 border-zinc-400/30',
  'Pego Blanco': 'from-amber-50/20 to-amber-100/5 border-amber-200/30',
  'Pego Premium': 'from-primary/20 to-primary/5 border-primary/40',
};

export function FinishedStockCards() {
  const { loading, getStock, updateStock } = useFinishedStock();
  const { isAdmin } = useRole();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const startEdit = (name: string) => {
    setEditing(name);
    setDraft(String(getStock(name)));
  };

  const save = async (name: string) => {
    const val = Number(draft);
    if (!isNaN(val) && val >= 0) await updateStock(name, val);
    setEditing(null);
  };

  if (loading) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Package className="w-4 h-4 text-primary" /> Stock de Producto Terminado (sacos)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {FINISHED_PRODUCTS.map(name => {
          const stock = getStock(name);
          const isEditing = editing === name;
          return (
            <div
              key={name}
              className={cn(
                'relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 backdrop-blur-sm transition-all hover:shadow-[0_0_20px_hsl(var(--primary)/0.12)]',
                PRODUCT_ACCENT[name],
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{name}</span>
                {isAdmin && !isEditing && (
                  <Button size="sm" variant="ghost" onClick={() => startEdit(name)} className="h-6 w-6 p-0 text-muted-foreground hover:text-primary">
                    <Pencil className="w-3 h-3" />
                  </Button>
                )}
              </div>
              {isEditing ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    className="bg-background/60 border-border h-9 text-lg font-bold"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') save(name); if (e.key === 'Escape') setEditing(null); }}
                  />
                  <Button size="sm" onClick={() => save(name)} className="h-9 w-9 p-0 gradient-orange"><Check className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="h-9 w-9 p-0"><X className="w-3.5 h-3.5" /></Button>
                </div>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{stock.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">sacos</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
