import { useState } from 'react';
import { useSales } from '@/hooks/useSales';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const PIE_COLORS = [
  'hsl(25 95% 53%)', 'hsl(210 80% 55%)', 'hsl(142 71% 45%)',
  'hsl(280 65% 60%)', 'hsl(38 92% 50%)', 'hsl(340 75% 55%)',
];

export function SalesChart() {
  const { getMonthlyStats, getMonthlyProductBreakdown } = useSales();
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const dailyData = getMonthlyStats(month, year);
  const breakdown = getMonthlyProductBreakdown(month, year);
  const filteredDaily = dailyData.filter(d => d.ventas > 0);
  const totalMonth = dailyData.reduce((s, d) => s + d.ventas, 0);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Gráfica de Ventas</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-foreground font-medium min-w-[160px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="glass-card p-4 text-center glow-orange">
        <p className="text-sm text-muted-foreground">Total del Mes</p>
        <p className="text-4xl font-bold text-gradient-orange">${totalMonth.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        <p className="text-sm text-muted-foreground">en ventas</p>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Ventas Diarias</h3>
        {filteredDaily.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={filteredDaily}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 20%)" />
              <XAxis dataKey="day" stroke="hsl(220 10% 55%)" fontSize={12} />
              <YAxis stroke="hsl(220 10% 55%)" fontSize={12} tickFormatter={v => `$${v}`} />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Ventas']}
                contentStyle={{
                  backgroundColor: 'hsl(220 18% 13%)',
                  border: '1px solid hsl(220 14% 20%)',
                  borderRadius: '8px',
                  color: 'hsl(30 10% 92%)',
                }}
              />
              <Bar dataKey="ventas" name="Ventas" fill="hsl(25 95% 53%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            No hay datos de ventas para este mes
          </div>
        )}
      </div>

      {breakdown.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-foreground mb-4">Desglose por Producto</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={breakdown}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="total"
                nameKey="name"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine
              >
                {breakdown.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Total']}
                contentStyle={{
                  backgroundColor: 'hsl(220 18% 13%)',
                  border: '1px solid hsl(220 14% 20%)',
                  borderRadius: '8px',
                  color: 'hsl(30 10% 92%)',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
