import { MATERIALS, type RawMaterialRecord } from '@/hooks/useRawMaterials';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package } from 'lucide-react';

interface Props {
  records: RawMaterialRecord[];
}

const MATERIAL_ICONS: Record<string, string> = {
  'Cemento Gris': '🏗️',
  'Arena': '🏖️',
  'Cemento Blanco': '⬜',
  'Celulosa': '📦',
  'Redispersable': '🧪',
  'Silicón': '💧',
  'Bobina de Envoplast': '🔄',
};

export function MaterialStatusCards({ records }: Props) {
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
        Última entrada por material
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
        {MATERIALS.map(mat => {
          const last = getLastArrival(mat);
          const daysAgo = last
            ? formatDistanceToNow(new Date(last.date + 'T12:00:00'), { locale: es, addSuffix: true })
            : null;

          return (
            <div
              key={mat}
              className="group relative overflow-hidden rounded-lg border border-border/40 bg-card/60 backdrop-blur-sm p-3 transition-all hover:border-primary/30 hover:shadow-[0_0_12px_hsl(var(--primary)/0.08)]"
            >
              {/* Subtle top accent */}
              <div className={`absolute top-0 left-0 right-0 h-[2px] transition-all ${last ? 'bg-primary/60 group-hover:bg-primary' : 'bg-muted-foreground/20'}`} />

              <div className="flex flex-col items-center text-center gap-1.5">
                <span className="text-lg">{MATERIAL_ICONS[mat] || '📋'}</span>
                <span className="text-[10px] font-medium text-foreground leading-tight line-clamp-2">{mat}</span>

                {last ? (
                  <>
                    <span className="text-[10px] text-primary font-semibold">
                      {last.quantity.toLocaleString()} {last.unit}
                    </span>
                    <span className="text-[9px] text-muted-foreground leading-tight">
                      {daysAgo}
                    </span>
                  </>
                ) : (
                  <span className="text-[9px] text-muted-foreground/60 italic">Sin registros</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
