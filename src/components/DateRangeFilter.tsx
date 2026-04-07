import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subDays, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface DateRangeFilterProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
  month: number;
  year: number;
  onMonthChange: (month: number, year: number) => void;
}

export function DateRangeFilter({ dateRange, onDateRangeChange, month, year, onMonthChange }: DateRangeFilterProps) {
  const [calOpen, setCalOpen] = useState(false);

  const prevMonth = () => {
    if (month === 0) { onMonthChange(11, year - 1); } else { onMonthChange(month - 1, year); }
  };
  const nextMonth = () => {
    if (month === 11) { onMonthChange(0, year + 1); } else { onMonthChange(month + 1, year); }
  };

  const presets = [
    { label: 'Hoy', fn: () => { const t = new Date(); onDateRangeChange({ from: t, to: t }); } },
    { label: '7 días', fn: () => { const t = new Date(); onDateRangeChange({ from: subDays(t, 6), to: t }); } },
    { label: 'Mes actual', fn: () => { const t = new Date(); onDateRangeChange({ from: startOfMonth(t), to: endOfMonth(t) }); } },
    { label: 'Año actual', fn: () => { const t = new Date(); onDateRangeChange({ from: startOfYear(t), to: endOfYear(t) }); } },
  ];

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      onDateRangeChange({ from: range.from, to: range.to || range.from });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-foreground font-medium min-w-[140px] text-center text-sm">
          {MONTH_NAMES[month]} {year}
        </span>
        <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <Popover open={calOpen} onOpenChange={setCalOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1 bg-secondary border-border">
            <CalendarIcon className="w-3 h-3" />
            {format(dateRange.from, 'dd/MM')} - {format(dateRange.to, 'dd/MM')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={handleSelect}
            numberOfMonths={1}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      <div className="flex gap-1">
        {presets.map(p => (
          <Button key={p.label} variant="outline" size="sm" onClick={p.fn} className="h-7 text-xs bg-secondary border-border px-2">
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
