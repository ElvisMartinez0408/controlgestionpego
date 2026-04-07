import { useState } from 'react';
import { useSales } from '@/hooks/useSales';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { startOfMonth, endOfMonth } from 'date-fns';

const PIE_COLORS = ['hsl(25 95% 53%)', 'hsl(210 80% 55%)', 'hsl(142 71% 45%)', 'hsl(280 65% 60%)', 'hsl(38 92% 50%)', 'hsl(340 75% 55%)'];

export function SalesChart() {
  const { getMonthlyStats, getMonthlyProductBreakdown, getMonthlyClientBreakdown, getWeeklyStats, loading } = useSales();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [dateRange, setDateRange] = useState({ from: startOfMonth(now), to: endOfMonth(now) });

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando...</div>;

  const dailyData = getMonthlyStats(month, year);
  const breakdown = getMonthlyProductBreakdown(month, year);
  const clientBreakdown = getMonthlyClientBreakdown(month, year);
  const weeklyData = getWeeklyStats(month, year);

  const fromStr = dateRange.from.toISOString().split('T')[0];
  const toStr = dateRange.to.toISOString().split('T')[0];
  const filteredDaily = dailyData.filter(d => d.date >= fromStr && d.date <= toStr && d.cantidad > 0);
  const totalMonth = filteredDaily.reduce((s, d) => s + d.cantidad, 0);

  const handleMonthChange = (m: number, y: number) => {
    setMonth(m);
    setYear(y);
    const d = new Date(y, m, 1);
    setDateRange({ from: startOfMonth(d), to: endOfMonth(d) });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold text-foreground">Gráfica de Ventas</h2>
        <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} month={month} year={year} onMonthChange={handleMonthChange} />
      </div>

      <div className="glass-card p-4 text-center glow-orange">
        <p className="text-sm text-muted-foreground">Total del Periodo</p>
        <p className="text-4xl font-bold text-gradient-orange">{totalMonth.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">sacos vendidos</p>
      </div>

      {/* Daily chart */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Ventas Diarias</h3>
        {filteredDaily.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={filteredDaily}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 20%)" />
              <XAxis dataKey="day" stroke="hsl(220 10% 55%)" fontSize={12} />
              <YAxis stroke="hsl(220 10% 55%)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(220 18% 13%)', border: '1px solid hsl(220 14% 20%)', borderRadius: '8px', color: 'hsl(30 10% 92%)' }} />
              <Bar dataKey="cantidad" name="Sacos" fill="hsl(25 95% 53%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">No hay datos de ventas para este periodo</div>
        )}
      </div>

      {/* Weekly chart */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Ventas Semanales</h3>
        {weeklyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 20%)" />
              <XAxis dataKey="week" stroke="hsl(220 10% 55%)" fontSize={11} />
              <YAxis stroke="hsl(220 10% 55%)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(220 18% 13%)', border: '1px solid hsl(220 14% 20%)', borderRadius: '8px', color: 'hsl(30 10% 92%)' }} />
              <Bar dataKey="cantidad" name="Sacos" fill="hsl(210 80% 55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">Sin datos semanales</div>
        )}
      </div>

      {breakdown.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-foreground mb-4">Desglose por Producto</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={breakdown} cx="50%" cy="50%" outerRadius={100} dataKey="total" nameKey="name" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine>
                {breakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'hsl(220 18% 13%)', border: '1px solid hsl(220 14% 20%)', borderRadius: '8px', color: 'hsl(30 10% 92%)' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Client breakdown chart */}
      {clientBreakdown.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-foreground mb-4">Ventas por Cliente</h3>
          <ResponsiveContainer width="100%" height={Math.max(250, clientBreakdown.length * 40)}>
            <BarChart data={clientBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 20%)" />
              <XAxis type="number" stroke="hsl(220 10% 55%)" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="hsl(220 10% 55%)" fontSize={11} width={120} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(220 18% 13%)', border: '1px solid hsl(220 14% 20%)', borderRadius: '8px', color: 'hsl(30 10% 92%)' }} />
              <Bar dataKey="total" name="Sacos" fill="hsl(142 71% 45%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
