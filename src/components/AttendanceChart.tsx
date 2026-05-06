import { useState } from 'react';
import { useAttendance } from '@/hooks/useAttendance';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { startOfMonth, endOfMonth } from 'date-fns';
import { BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AttendanceChart() {
  const { getMonthlyStats, getWeeklyStats, loading } = useAttendance();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [dateRange, setDateRange] = useState({ from: startOfMonth(now), to: endOfMonth(now) });
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando...</div>;

  const data = getMonthlyStats(month, year);
  const weeklyData = getWeeklyStats(month, year);

  const fromStr = dateRange.from.toISOString().split('T')[0];
  const toStr = dateRange.to.toISOString().split('T')[0];
  const filteredData = data.filter(d => d.date >= fromStr && d.date <= toStr && (d.presentes > 0 || d.ausentes > 0));
  const totalPresentes = filteredData.reduce((s, d) => s + d.presentes, 0);
  const totalAusentes = filteredData.reduce((s, d) => s + d.ausentes, 0);

  const handleMonthChange = (m: number, y: number) => {
    setMonth(m);
    setYear(y);
    const d = new Date(y, m, 1);
    setDateRange({ from: startOfMonth(d), to: endOfMonth(d) });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-foreground">Gráfica de Asistencia</h2>
          <div className="inline-flex items-center rounded-lg border border-border bg-secondary p-0.5">
            <button onClick={() => setChartType('bar')} className={cn('px-2 py-1 rounded-md transition-all flex items-center gap-1 text-xs', chartType === 'bar' ? 'gradient-orange text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
              <BarChart3 className="w-3.5 h-3.5" /> Barras
            </button>
            <button onClick={() => setChartType('line')} className={cn('px-2 py-1 rounded-md transition-all flex items-center gap-1 text-xs', chartType === 'line' ? 'gradient-orange text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
              <LineChartIcon className="w-3.5 h-3.5" /> Líneas
            </button>
          </div>
        </div>
        <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} month={month} year={year} onMonthChange={handleMonthChange} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-bold text-success">{totalPresentes}</p>
          <p className="text-sm text-muted-foreground">Asistencias</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-3xl font-bold text-destructive">{totalAusentes}</p>
          <p className="text-sm text-muted-foreground">Faltas</p>
        </div>
      </div>

      {/* Monthly daily chart */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Asistencia Diaria</h3>
        {filteredData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            {chartType === 'bar' ? (
              <BarChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                <Legend />
                <Bar dataKey="presentes" name="Presentes" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ausentes" name="Ausentes" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                <Legend />
                <Line type="monotone" dataKey="presentes" name="Presentes" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="ausentes" name="Ausentes" stroke="hsl(0 72% 51%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">No hay datos de asistencia para este periodo</div>
        )}
      </div>

      {/* Weekly chart */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Asistencia Semanal</h3>
        {weeklyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            {chartType === 'bar' ? (
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                <Legend />
                <Bar dataKey="presentes" name="Presentes" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ausentes" name="Ausentes" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                <Legend />
                <Line type="monotone" dataKey="presentes" name="Presentes" stroke="hsl(142 71% 45%)" strokeWidth={2} />
                <Line type="monotone" dataKey="ausentes" name="Ausentes" stroke="hsl(0 72% 51%)" strokeWidth={2} />
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">Sin datos semanales</div>
        )}
      </div>
    </div>
  );
}
