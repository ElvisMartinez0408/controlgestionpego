import { useState } from 'react';
import { useProduction } from '@/hooks/useProduction';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { startOfMonth, endOfMonth } from 'date-fns';

const PIE_COLORS = ['hsl(25 95% 53%)', 'hsl(210 80% 55%)', 'hsl(142 71% 45%)'];
const PRODUCT_COLORS: Record<string, string> = {
  'Pego Gris': 'hsl(220 10% 55%)',
  'Pego Blanco': 'hsl(210 80% 55%)',
  'Pego Premium': 'hsl(25 95% 53%)',
};

export function ProductionChart() {
  const { getMonthlyStats, getMonthlyProductBreakdown, getWeeklyStats, loading } = useProduction();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [dateRange, setDateRange] = useState({ from: startOfMonth(now), to: endOfMonth(now) });

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando...</div>;

  const dailyData = getMonthlyStats(month, year);
  const breakdown = getMonthlyProductBreakdown(month, year);
  const weeklyData = getWeeklyStats(month, year);

  // Filter by date range
  const fromStr = dateRange.from.toISOString().split('T')[0];
  const toStr = dateRange.to.toISOString().split('T')[0];
  const filteredDaily = dailyData.filter(d => d.date >= fromStr && d.date <= toStr && d.cantidad > 0);
  const totalMonth = filteredDaily.reduce((s, d) => s + d.cantidad, 0);
  const totalGris = filteredDaily.reduce((s, d) => s + d.pegoGris, 0);
  const totalBlanco = filteredDaily.reduce((s, d) => s + d.pegoBlanco, 0);
  const totalPremium = filteredDaily.reduce((s, d) => s + d.pegoPremium, 0);

  const handleMonthChange = (m: number, y: number) => {
    setMonth(m);
    setYear(y);
    const d = new Date(y, m, 1);
    setDateRange({ from: startOfMonth(d), to: endOfMonth(d) });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold text-foreground">Gráfica de Producción</h2>
        <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} month={month} year={year} onMonthChange={handleMonthChange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card p-3 text-center glow-orange">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-gradient-orange">{totalMonth.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">sacos</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xs text-muted-foreground">Pego Gris</p>
          <p className="text-2xl font-bold text-muted-foreground">{totalGris.toLocaleString()}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xs text-muted-foreground">Pego Blanco</p>
          <p className="text-2xl font-bold" style={{ color: 'hsl(210 80% 55%)' }}>{totalBlanco.toLocaleString()}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xs text-muted-foreground">Pego Premium</p>
          <p className="text-2xl font-bold text-primary">{totalPremium.toLocaleString()}</p>
        </div>
      </div>

      {/* Monthly - Unified per-product chart */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Producción Diaria por Producto</h3>
        {filteredDaily.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={filteredDaily}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 20%)" />
              <XAxis dataKey="day" stroke="hsl(220 10% 55%)" fontSize={12} />
              <YAxis stroke="hsl(220 10% 55%)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(220 18% 13%)', border: '1px solid hsl(220 14% 20%)', borderRadius: '8px', color: 'hsl(30 10% 92%)' }} />
              <Legend />
              <Bar dataKey="pegoGris" name="Pego Gris" fill="hsl(220 10% 55%)" radius={[2, 2, 0, 0]} stackId="a" />
              <Bar dataKey="pegoBlanco" name="Pego Blanco" fill="hsl(210 80% 55%)" radius={[2, 2, 0, 0]} stackId="a" />
              <Bar dataKey="pegoPremium" name="Pego Premium" fill="hsl(25 95% 53%)" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">No hay datos de producción para este periodo</div>
        )}
      </div>

      {/* Weekly breakdown */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Producción Semanal</h3>
        {weeklyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 20%)" />
              <XAxis dataKey="week" stroke="hsl(220 10% 55%)" fontSize={11} />
              <YAxis stroke="hsl(220 10% 55%)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(220 18% 13%)', border: '1px solid hsl(220 14% 20%)', borderRadius: '8px', color: 'hsl(30 10% 92%)' }} />
              <Legend />
              <Bar dataKey="pegoGris" name="Pego Gris" fill="hsl(220 10% 55%)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="pegoBlanco" name="Pego Blanco" fill="hsl(210 80% 55%)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="pegoPremium" name="Pego Premium" fill="hsl(25 95% 53%)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">Sin datos semanales</div>
        )}
      </div>

      {/* Total production chart (non-stacked, daily total) */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Producción Total Diaria (3 productos)</h3>
        {filteredDaily.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={filteredDaily}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 20%)" />
              <XAxis dataKey="day" stroke="hsl(220 10% 55%)" fontSize={12} />
              <YAxis stroke="hsl(220 10% 55%)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(220 18% 13%)', border: '1px solid hsl(220 14% 20%)', borderRadius: '8px', color: 'hsl(30 10% 92%)' }} />
              <Bar dataKey="cantidad" name="Total Sacos" fill="hsl(25 95% 53%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">Sin datos</div>
        )}
      </div>

      {/* Pie breakdown */}
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
    </div>
  );
}
