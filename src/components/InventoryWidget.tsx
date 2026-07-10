import { useFinishedStock } from '@/hooks/useFinishedStock';
import { Boxes, Radio } from 'lucide-react';

/**
 * Live inventory card. Iterates finished_product_stock via Supabase Realtime
 * so any new product type appears automatically.
 */
export function InventoryWidget() {
  const { items, loading } = useFinishedStock();

  const sorted = [...items].sort((a, b) => a.product_name.localeCompare(b.product_name));

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Boxes className="w-4 h-4 text-primary" /> Inventario Actual
        </h3>
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          <Radio className="w-3 h-3 text-emerald-500 animate-pulse" /> En vivo
        </span>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Cargando inventario…</p>
      ) : sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin productos registrados.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sorted.map(item => (
            <div
              key={item.id}
              className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2.5 hover:border-primary/40 transition-colors"
            >
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">{item.product_name}</p>
              <p className="text-2xl font-bold text-foreground leading-tight">
                {Number(item.stock).toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1">sacos</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}