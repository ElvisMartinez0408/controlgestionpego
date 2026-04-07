import { useState } from 'react';
import { useAttendance } from '@/hooks/useAttendance';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { startOfMonth, endOfMonth } from 'date-fns';

export function AttendanceChart() {
  const { getMonthlyStats, getWeeklyStats, loading } = useAttendance();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [dateRange, setDateRange] = useState({ from: startOfMonth(now), to: endOfMonth(now) });

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
        <h2 className="text-2xl font-bold text-foreground">Gráfica de Asistencia</h2>
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
            <BarChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 20%)" />
              <XAxis dataKey="day" stroke="hsl(220 10% 55%)" fontSize={12} />
              <YAxis stroke="hsl(220 10% 55%)" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(220 18% 13%)', border: '1px solid hsl(220 14% 20%)', borderRadius: '8px', color: 'hsl(30 10% 92%)' }} />
              <Legend />
              <Bar dataKey="presentes" name="Presentes" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ausentes" name="Ausentes" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
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
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 20%)" />
              <XAxis dataKey="week" stroke="hsl(220 10% 55%)" fontSize={11} />
              <YAxis stroke="hsl(220 10% 55%)" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(220 18% 13%)', border: '1px solid hsl(220 14% 20%)', borderRadius: '8px', color: 'hsl(30 10% 92%)' }} />
              <Legend />
              <Bar dataKey="presentes" name="Presentes" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ausentes" name="Ausentes" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">Sin datos semanales</div>
        )}
      </div>
    </div>
  );
}
