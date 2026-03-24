import { useState } from 'react';
import { useAttendance } from '@/hooks/useAttendance';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function AttendanceChart() {
  const { getMonthlyStats, loading } = useAttendance();
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando...</div>;

  const data = getMonthlyStats(month, year);
  const filteredData = data.filter(d => d.presentes > 0 || d.ausentes > 0);
  const totalPresentes = data.reduce((s, d) => s + d.presentes, 0);
  const totalAusentes = data.reduce((s, d) => s + d.ausentes, 0);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Gráfica de Asistencia</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-foreground font-medium min-w-[160px] text-center">{MONTH_NAMES[month]} {year}</span>
          <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
        </div>
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

      <div className="glass-card p-6">
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
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">No hay datos de asistencia para este mes</div>
        )}
      </div>
    </div>
  );
}
