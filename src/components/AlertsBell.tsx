import { useState, useMemo } from 'react';
import { Bell, BellRing, AlertTriangle, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useStockAlerts, type StockAlert } from '@/hooks/useStockAlerts';
import { cn } from '@/lib/utils';

interface Props {
  onNavigate?: (target: StockAlert['target']) => void;
}

export function AlertsBell({ onNavigate }: Props) {
  const { alerts } = useStockAlerts();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  const visible = useMemo(() => alerts.filter(a => !dismissed.has(a.id)), [alerts, dismissed]);
  const has = visible.length > 0;

  const dismiss = (id: string) => setDismissed(prev => new Set(prev).add(id));
  const clearAll = () => setDismissed(new Set(alerts.map(a => a.id)));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'relative inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors',
            has && 'text-primary'
          )}
          title={has ? `${visible.length} alertas activas` : 'Sin alertas'}
          aria-label="Notificaciones"
        >
          {has ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          {has && (
            <span
              className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-destructive animate-pulse"
              style={{ boxShadow: '0 0 8px hsl(var(--destructive)), 0 0 14px hsl(var(--destructive) / 0.6)' }}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-popover border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn('w-4 h-4', has ? 'text-destructive' : 'text-muted-foreground')} />
            <h4 className="font-semibold text-sm text-foreground">
              Alertas ({visible.length})
            </h4>
          </div>
          {has && (
            <Button size="sm" variant="ghost" onClick={clearAll} className="h-7 text-xs text-muted-foreground hover:text-foreground">
              Limpiar
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {!has && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Sin alertas activas. Todo en orden.
            </div>
          )}
          {visible.map(a => (
            <div
              key={a.id}
              className={cn(
                'group flex items-start gap-2 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-secondary/40 transition-colors',
              )}
            >
              <span
                className={cn(
                  'mt-1 w-2 h-2 rounded-full shrink-0',
                  a.severity === 'critical' ? 'bg-destructive' : 'bg-primary'
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.detail}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <button
                    onClick={() => { onNavigate?.(a.target); setOpen(false); }}
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    Ir al problema <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => dismiss(a.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                aria-label="Descartar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
