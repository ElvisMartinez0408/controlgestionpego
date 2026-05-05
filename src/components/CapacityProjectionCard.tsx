import { useCapacityProjection } from '@/hooks/useCapacityProjection';
import { Zap, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRODUCT_ACCENT: Record<string, string> = {
  'Pego Gris': 'from-zinc-500/10 to-zinc-700/5 border-zinc-400/30',
  'Pego Blanco': 'from-amber-50/10 to-amber-100/5 border-amber-200/30',
  'Pego Premium': 'from-primary/15 to-primary/5 border-primary/40',
};

interface Props {
  compact?: boolean;
}

export function CapacityProjectionCard({ compact = false }: Props) {
  const { projections, loading } = useCapacityProjection();

  if (loading) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        Proyección de capacidad
        <span className="text-[10px] text-muted-foreground/70 normal-case font-normal">
          (sacos producibles antes del punto de quiebre)
        </span>
      </h3>
      <div className={cn('grid gap-3', compact ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-3')}>
        {projections.map(p => {
          const critical = p.maxSacks === 0;
          return (
            <div
              key={p.product}
              className={cn(
                'relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 backdrop-blur-sm transition-all hover:shadow-[0_0_20px_hsl(var(--primary)/0.12)]',
                PRODUCT_ACCENT[p.product] || 'border-border bg-card/60',
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {p.product}
                </span>
                {critical && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn('text-3xl font-bold', critical ? 'text-destructive' : 'text-gradient-orange')}>
                  {p.maxSacks.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">sacos</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">
                Capacidad actual: <span className="font-semibold text-foreground">{p.maxSacks.toLocaleString()} sacos de {p.product.replace('Pego ', '')}</span>
                {p.limitingMaterial && (
                  <> <span className="text-muted-foreground/80">— limitado por <span className="text-primary font-medium">{p.limitingMaterial}</span></span></>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}