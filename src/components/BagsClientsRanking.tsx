import { useMemo, useState } from 'react';
import { Users, TrendingDown, Layers } from 'lucide-react';
import { usePallets } from '@/hooks/usePallets';
import { Button } from '@/components/ui/button';
import { PalletsDashboard } from '@/components/PalletsDashboard';

/**
 * Ranking of the top 6 clients with the largest outstanding pallet debt
 * (paletas entregadas − recibidas). Independent internal scroll: the rest
 * of the page remains still while the user scrolls the list.
 */
export function BagsClientsRanking() {
  const { balances, inCirculation } = usePallets();
  const [open, setOpen] = useState(false);

  const debtors = useMemo(
    () => balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance),
    [balances],
  );
  const top = debtors.slice(0, 6);
  const maxBal = top[0]?.balance || 1;

  return (
    <div className="glass-card p-4 flex flex-col h-full min-h-[280px]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Ranking de Clientes
          </h3>
          <p className="text-[11px] text-muted-foreground">Paletas pendientes de devolución · Top 6</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)} className="text-xs text-primary hover:text-primary">
          <Layers className="w-3.5 h-3.5 mr-1" /> Tablero
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 mb-3 border border-border">
        <span className="text-xs text-muted-foreground">Total en circulación</span>
        <span className="text-lg font-bold text-primary">{inCirculation.toLocaleString()}</span>
      </div>

      {debtors.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground text-center px-4">
          Sin clientes con paletas pendientes.
        </div>
      ) : (
        <ul
          className="space-y-2 overflow-y-auto pr-1"
          style={{ maxHeight: '260px' }}
        >
          {top.map((b, i) => {
            const pct = Math.max(6, (b.balance / maxBal) * 100);
            return (
              <li key={b.client} className="rounded-lg border border-border bg-secondary/40 p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="font-medium text-foreground text-sm truncate">{b.client}</span>
                  </div>
                  <span className="text-sm font-bold text-destructive flex items-center gap-1 shrink-0">
                    <TrendingDown className="w-3 h-3" />{b.balance.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full gradient-orange" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Entregadas: <span className="text-foreground font-semibold">{b.delivered}</span> · Recibidas: <span className="text-foreground font-semibold">{b.received}</span>
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <PalletsDashboard open={open} onOpenChange={setOpen} />
    </div>
  );
}