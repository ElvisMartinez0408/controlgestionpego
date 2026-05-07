import { useMemo, useState } from 'react';
import { useProduction } from '@/hooks/useProduction';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { startOfMonth, endOfMonth } from 'date-fns';
import { ChartTypeToggle, GranularityToggle, ChartType, Granularity } from '@/components/ChartControls';
import { buildSeries } from '@/lib/chartAggregations';

const PIE_COLORS = ['hsl(25 95% 53%)', 'hsl(210 80% 55%)', 'hsl(142 71% 45%)'];

export function ProductionChart() {
  const { records, getMonthlyProductBreakdown, loading } = useProduction();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [dateRange, setDateRange] = useState({ from: startOfMonth(now), to: endOfMonth(now) });
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [granularity, setGranularity] = useState<Granularity>('day');

  const series = useMemo(() => buildSeries(records, granularity, month, year, {
    pegoGris: r => r.product_name === 'Pego Gris' ? r.quantity : 0,
    pegoBlanco: r => r.product_name === 'Pego Blanco' ? r.quantity : 0,
    pegoPremium: r => r.product_name === 'Pego Premium' ? r.quantity : 0,
    cantidad: r => r.quantity,
  }), [records, granularity, month, year]);

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando...</div>;

  const breakdown = getMonthlyProductBreakdown(month, year);
  const totalMonth = series.reduce((s, d) => s + (d.cantidad || 0), 0);
  const totalGris = series.reduce((s, d) => s + (d.pegoGris || 0), 0);
  const totalBlanco = series.reduce((s, d) => s + (d.pegoBlanco || 0), 0);
  const totalPremium = series.reduce((s, d) => s + (d.pegoPremium || 0), 0);

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
          <h2 className="text-2xl font-bold text-foreground">Gráfica de Producción</h2>
          <div className="flex flex-wrap items-center gap-2">
            <GranularityToggle value={granularity} onChange={setGranularity} />
            <ChartTypeToggle value={chartType} onChange={setChartType} />
          </div>
        </div>
        <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} month={month} year={year} onMonthChange={handleMonthChange} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card p-3 text-center glow-orange">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-gradient-orange">{totalMonth.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">sacos</p>
        </div>
        <div className="glass-card p-3 text-center"><p className="text-xs text-muted-foreground">Pego Gris</p><p className="text-2xl font-bold text-muted-foreground">{totalGris.toLocaleString()}</p></div>
        <div className="glass-card p-3 text-center"><p className="text-xs text-muted-foreground">Pego Blanco</p><p className="text-2xl font-bold" style={{ color: 'hsl(210 80% 55%)' }}>{totalBlanco.toLocaleString()}</p></div>
        <div className="glass-card p-3 text-center"><p className="text-xs text-muted-foreground">Pego Premium</p><p className="text-2xl font-bold text-primary">{totalPremium.toLocaleString()}</p></div>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Producción {periodLabel} por Producto</h3>
        {series.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            {chartType === 'bar' ? (
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={tooltip} />
                <Legend />
                <Bar dataKey="pegoGris" name="Pego Gris" fill="hsl(220 10% 55%)" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="pegoBlanco" name="Pego Blanco" fill="hsl(210 80% 55%)" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="pegoPremium" name="Pego Premium" fill="hsl(25 95% 53%)" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            ) : (
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={tooltip} />
                <Legend />
                <Line type="monotone" dataKey="pegoGris" name="Pego Gris" stroke="hsl(220 10% 55%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="pegoBlanco" name="Pego Blanco" stroke="hsl(210 80% 55%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="pegoPremium" name="Pego Premium" stroke="hsl(25 95% 53%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">No hay datos de producción para este periodo</div>
        )}
      </div>

      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Producción Total {periodLabel}</h3>
        {series.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            {chartType === 'bar' ? (
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={tooltip} />
                <Bar dataKey="cantidad" name="Total Sacos" fill="hsl(25 95% 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={tooltip} />
                <Line type="monotone" dataKey="cantidad" name="Total Sacos" stroke="hsl(25 95% 53%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : <div className="h-[250px] flex items-center justify-center text-muted-foreground">Sin datos</div>}
      </div>

      {breakdown.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-foreground mb-4">Desglose por Producto</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={breakdown} cx="50%" cy="50%" outerRadius={100} dataKey="total" nameKey="name" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine>
                {breakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltip} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
