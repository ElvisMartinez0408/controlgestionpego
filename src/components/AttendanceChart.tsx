import { useMemo, useState } from 'react';
import { useAttendance } from '@/hooks/useAttendance';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { startOfMonth, endOfMonth } from 'date-fns';
import { ChartTypeToggle, GranularityToggle, ChartType, Granularity } from '@/components/ChartControls';
import { buildSeries } from '@/lib/chartAggregations';

export function AttendanceChart() {
  const { records, loading } = useAttendance();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [dateRange, setDateRange] = useState({ from: startOfMonth(now), to: endOfMonth(now) });
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [granularity, setGranularity] = useState<Granularity>('day');

  const series = useMemo(() => buildSeries(records, granularity, month, year, {
    presentes: r => r.status === 'present' ? 1 : 0,
    ausentes: r => r.status === 'absent' ? 1 : 0,
  }), [records, granularity, month, year]);

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando...</div>;

  const totalPresentes = series.reduce((s, d) => s + (d.presentes || 0), 0);
  const totalAusentes = series.reduce((s, d) => s + (d.ausentes || 0), 0);

  const handleMonthChange = (m: number, y: number) => {
    setMonth(m); setYear(y);
    const d = new Date(y, m, 1);
    setDateRange({ from: startOfMonth(d), to: endOfMonth(d) });
  };

  const tooltip = { backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' };
  const periodLabel = granularity === 'day' ? 'Diaria' : granularity === 'week' ? 'Semanal' : 'Mensual (Año)';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-foreground">Gráfica de Asistencia</h2>
          <div className="flex flex-wrap items-center gap-2">
            <GranularityToggle value={granularity} onChange={setGranularity} />
            <ChartTypeToggle value={chartType} onChange={setChartType} />
          </div>
        </div>
        <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} month={month} year={year} onMonthChange={handleMonthChange} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4 text-center"><p className="text-3xl font-bold text-success">{totalPresentes}</p><p className="text-sm text-muted-foreground">Asistencias</p></div>
        <div className="glass-card p-4 text-center"><p className="text-3xl font-bold text-destructive">{totalAusentes}</p><p className="text-sm text-muted-foreground">Faltas</p></div>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Asistencia {periodLabel}</h3>
        {series.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            {chartType === 'bar' ? (
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={tooltip} />
                <Legend />
                <Bar dataKey="presentes" name="Presentes" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ausentes" name="Ausentes" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={tooltip} />
                <Legend />
                <Line type="monotone" dataKey="presentes" name="Presentes" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="ausentes" name="Ausentes" stroke="hsl(0 72% 51%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : <div className="h-[350px] flex items-center justify-center text-muted-foreground">No hay datos de asistencia para este periodo</div>}
      </div>
    </div>
  );
}
