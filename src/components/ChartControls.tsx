import { BarChart3, LineChart as LineChartIcon, CalendarDays, CalendarRange, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ChartType = 'bar' | 'line';
export type Granularity = 'day' | 'week' | 'year';

export function ChartTypeToggle({ value, onChange }: { value: ChartType; onChange: (v: ChartType) => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-secondary p-0.5">
      <button onClick={() => onChange('bar')} className={cn('px-2 py-1 rounded-md transition-all flex items-center gap-1 text-xs', value === 'bar' ? 'gradient-orange text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
        <BarChart3 className="w-3.5 h-3.5" /> Barras
      </button>
      <button onClick={() => onChange('line')} className={cn('px-2 py-1 rounded-md transition-all flex items-center gap-1 text-xs', value === 'line' ? 'gradient-orange text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
        <LineChartIcon className="w-3.5 h-3.5" /> Líneas
      </button>
    </div>
  );
}

export function GranularityToggle({ value, onChange }: { value: Granularity; onChange: (v: Granularity) => void }) {
  const opts: { v: Granularity; label: string; icon: React.ReactNode }[] = [
    { v: 'day', label: 'Día', icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { v: 'week', label: 'Semana', icon: <CalendarRange className="w-3.5 h-3.5" /> },
    { v: 'year', label: 'Año', icon: <CalendarClock className="w-3.5 h-3.5" /> },
  ];
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-secondary p-0.5">
      {opts.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)} className={cn('px-2 py-1 rounded-md transition-all flex items-center gap-1 text-xs', value === o.v ? 'gradient-orange text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
          {o.icon} {o.label}
        </button>
      ))}
    </div>
  );
}