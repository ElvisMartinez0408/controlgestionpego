import { MATERIALS, BAG_TYPES, type RawMaterialRecord } from '@/hooks/useRawMaterials';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package } from 'lucide-react';
import { useMaterialStock } from '@/hooks/useMaterialStock';

interface Props {
  records: RawMaterialRecord[];
}

export function MaterialStatusCards({ records }: Props) {
  const { getStock, stocks } = useMaterialStock();
  const getLastArrival = (material: string) => {
    const found = records
      .filter(r => r.material_name === material)
      .sort((a, b) => b.date.localeCompare(a.date));
    return found.length > 0 ? found[0] : null;
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Package className="w-4 h-4 text-primary" />
        Stock actual por material
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {[...MATERIALS, ...BAG_TYPES].map(mat => {
          const last = getLastArrival(mat);
          const liveStock = getStock(mat);
          const stockUnit = stocks.find(s => s.material_name === mat)?.unit ?? 'Kilos';
          const daysAgo = last
            ? formatDistanceToNow(new Date(last.date + 'T12:00:00'), { locale: es, addSuffix: true })
            : null;

          return (
            <div
              key={mat}
              className="group relative overflow-hidden rounded-lg border border-border/50 bg-card/70 backdrop-blur-sm px-4 py-3 transition-all hover:border-primary/40 hover:shadow-[0_0_12px_hsl(var(--primary)/0.1)]"
            >
              <div className={`absolute left-0 top-0 bottom-0 w-[3px] transition-all ${last ? 'bg-primary/70 group-hover:bg-primary' : 'bg-muted-foreground/20'}`} />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{mat}</p>
                  {last ? (
                    <p className="text-[11px] text-muted-foreground mt-0.5">Última entrada: {daysAgo}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/70 italic mt-0.5">Sin entradas</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-primary leading-none">
                    {liveStock.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">{stockUnit}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
