import { useMemo, useState } from 'react';
import { useSales, SaleRecord } from '@/hooks/useSales';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { startOfMonth, endOfMonth } from 'date-fns';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChartTypeToggle, GranularityToggle, ChartType, Granularity } from '@/components/ChartControls';
import { buildSeries } from '@/lib/chartAggregations';

const PIE_COLORS = ['hsl(25 95% 53%)', 'hsl(210 80% 55%)', 'hsl(142 71% 45%)', 'hsl(280 65% 60%)', 'hsl(38 92% 50%)', 'hsl(340 75% 55%)'];

export function SalesChart() {
  const { records, getMonthlyProductBreakdown, getMonthlyClientBreakdown, loading } = useSales();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [dateRange, setDateRange] = useState({ from: startOfMonth(now), to: endOfMonth(now) });
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [granularity, setGranularity] = useState<Granularity>('day');

  const series = useMemo(() => buildSeries(records, granularity, month, year, { cantidad: r => r.quantity }), [records, granularity, month, year]);
  const breakdown = getMonthlyProductBreakdown(month, year);
  const clientBreakdown = getMonthlyClientBreakdown(month, year);

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando...</div>;

  const totalPeriod = series.reduce((s, d) => s + (d.cantidad || 0), 0);

  const handleMonthChange = (m: number, y: number) => {
    setMonth(m); setYear(y);
    const d = new Date(y, m, 1);
    setDateRange({ from: startOfMonth(d), to: endOfMonth(d) });
  };

  const clientRecords: SaleRecord[] = selectedClient
    ? records.filter(r => (r.client || 'Sin cliente') === selectedClient).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50)
    : [];

  const tooltip = { backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-foreground">Gráfica de Ventas</h2>
          <div className="flex flex-wrap items-center gap-2">
            <GranularityToggle value={granularity} onChange={setGranularity} />
            <ChartTypeToggle value={chartType} onChange={setChartType} />
          </div>
        </div>
        <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} month={month} year={year} onMonthChange={handleMonthChange} />
      </div>

      <div className="glass-card p-4 text-center glow-orange">
        <p className="text-sm text-muted-foreground">Total del Periodo</p>
        <p className="text-4xl font-bold text-gradient-orange">{totalPeriod.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">sacos vendidos</p>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Ventas por {granularity === 'day' ? 'Día' : granularity === 'week' ? 'Semana' : 'Mes (Año)'}</h3>
        {series.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            {chartType === 'bar' ? (
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={tooltip} />
                <Bar dataKey="cantidad" name="Sacos" fill="hsl(25 95% 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={tooltip} />
                <Line type="monotone" dataKey="cantidad" name="Sacos" stroke="hsl(25 95% 53%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">No hay datos de ventas para este periodo</div>
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
              <Tooltip contentStyle={tooltip} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {clientBreakdown.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-foreground mb-2">Ventas por Cliente</h3>
          <p className="text-xs text-muted-foreground mb-4">Haz clic en una barra para ver el detalle de compras</p>
          <ResponsiveContainer width="100%" height={Math.max(250, clientBreakdown.length * 40)}>
            <BarChart data={clientBreakdown} layout="vertical" onClick={(e: any) => { if (e?.activePayload?.[0]?.payload?.name) setSelectedClient(e.activePayload[0].payload.name); }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={120} />
              <Tooltip contentStyle={tooltip} />
              <Bar dataKey="total" name="Sacos" fill="hsl(142 71% 45%)" radius={[0, 4, 4, 0]} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {selectedClient && (
        <div className="glass-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Últimas compras de: <span className="text-primary">{selectedClient}</span></h3>
            <Button size="sm" variant="ghost" onClick={() => setSelectedClient(null)}><X className="w-4 h-4" /></Button>
          </div>
          {clientRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Fecha</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Producto</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Cantidad</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Nº Guía</th>
                  </tr>
                </thead>
                <tbody>
                  {clientRecords.map(r => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-2 px-3 text-foreground">{new Date(r.date + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="py-2 px-3 text-foreground">{r.product_name}</td>
                      <td className="py-2 px-3 text-right text-primary font-medium">{r.quantity}</td>
                      <td className="py-2 px-3 text-muted-foreground">{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border">
                    <td colSpan={2} className="py-2 px-3 text-muted-foreground font-medium">Total</td>
                    <td className="py-2 px-3 text-right text-primary font-bold">{clientRecords.reduce((s, r) => s + r.quantity, 0)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : <p className="text-muted-foreground text-center py-4">No hay registros para este cliente</p>}
        </div>
      )}
    </div>
  );
}
