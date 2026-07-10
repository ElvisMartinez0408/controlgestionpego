import { useEffect, useState } from 'react';
import { useAttendance } from '@/hooks/useAttendance';
import { useProduction } from '@/hooks/useProduction';
import { useSales } from '@/hooks/useSales';
import { CapacityProjectionCard } from '@/components/CapacityProjectionCard';
import { Users, Package, DollarSign, TrendingUp, UserCheck, UserX, AlertTriangle, PackageX } from 'lucide-react';
import { useStockAlerts } from '@/hooks/useStockAlerts';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { listDefectiveBags, type DefectiveBagRow } from '@/lib/recipesDb';
import { BagsClientsRanking } from '@/components/BagsClientsRanking';
import { InventoryWidget } from '@/components/InventoryWidget';

export function Dashboard() {
  const { employees, records: attRecords, loading: attLoading } = useAttendance();
  const { records: prodRecords, loading: prodLoading, getMonthlyStats: getProdStats } = useProduction();
  const { records: saleRecords, loading: saleLoading, getTodayRecords: getTodaySales } = useSales();
  const { alerts } = useStockAlerts();
  const [defects, setDefects] = useState<DefectiveBagRow[]>([]);

  useEffect(() => {
    const load = () => listDefectiveBags().then(setDefects);
    load();
    window.addEventListener('defective-bags-updated', load);
    return () => window.removeEventListener('defective-bags-updated', load);
  }, []);

  const loading = attLoading || prodLoading || saleLoading;

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando tablero...</div>;
  }

  const todayObj = new Date();
  const today = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  // Attendance today
  const todayAttendance = attRecords.filter(r => r.date === today);
  const presentToday = todayAttendance.filter(r => r.status === 'present').length;
  const absentToday = todayAttendance.filter(r => r.status === 'absent').length;

  // Production today
  const todayProduction = prodRecords.filter(r => r.date === today);
  const totalProdToday = todayProduction.reduce((s, r) => s + r.quantity, 0);

  // Sales today
  const todaySales = getTodaySales();
  const totalSalesToday = todaySales.reduce((s, r) => s + r.quantity, 0);

  // Monthly production for mini chart (last 7 days)
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayProd = prodRecords.filter(r => r.date === dateStr).reduce((s, r) => s + r.quantity, 0);
    const daySales = saleRecords.filter(r => r.date === dateStr).reduce((s, r) => s + r.quantity, 0);
    last7Days.push({
      day: d.getDate(),
      producción: dayProd,
      ventas: daySales,
    });
  }

  // Monthly totals
  const monthProdRecords = prodRecords.filter(r => { const d = new Date(r.date + 'T12:00:00'); return d.getMonth() === month && d.getFullYear() === year; });
  const totalProdMonth = monthProdRecords.reduce((s, r) => s + r.quantity, 0);
  const monthSaleRecords = saleRecords.filter(r => { const d = new Date(r.date + 'T12:00:00'); return d.getMonth() === month && d.getFullYear() === year; });
  const totalSalesMonth = monthSaleRecords.reduce((s, r) => s + r.quantity, 0);

  // Wastage: defective bags vs successful (sacks produced)
  const totalGoodBags = prodRecords.reduce((s, r) => s + r.quantity, 0);
  const totalDefBags = defects.reduce((s, d) => s + d.qty, 0);
  const totalBags = totalGoodBags + totalDefBags;
  const wastagePct = totalBags > 0 ? (totalDefBags / totalBags) * 100 : 0;
  const defByOrigin = defects.reduce((acc, d) => { acc[d.origin] = (acc[d.origin] || 0) + d.qty; return acc; }, {} as Record<string, number>);
  const wasteData = [
    { name: 'Exitosas', value: totalGoodBags, color: 'hsl(25 95% 53%)' },
    { name: 'Defectuosas', value: totalDefBags, color: 'hsl(50 100% 55%)' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Tablero de Control</h2>
        <p className="text-muted-foreground capitalize">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-xs">Empleados</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{employees.length}</p>
          <p className="text-xs text-muted-foreground">registrados</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-success">
            <UserCheck className="w-4 h-4" />
            <span className="text-xs">Presentes Hoy</span>
          </div>
          <p className="text-3xl font-bold text-success">{presentToday}</p>
          <div className="flex gap-2 text-xs">
            <span className="text-destructive">{absentToday} faltas</span>
          </div>
        </div>

        <div className="glass-card p-4 space-y-1 glow-orange">
          <div className="flex items-center gap-2 text-primary">
            <Package className="w-4 h-4" />
            <span className="text-xs">Producción Hoy</span>
          </div>
          <p className="text-3xl font-bold text-gradient-orange">{totalProdToday.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{todayProduction.length} registros</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs">Ventas Hoy</span>
          </div>
          <p className="text-3xl font-bold text-gradient-orange">{totalSalesToday.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{todaySales.length} ventas</p>
        </div>
      </div>

      {/* Monthly summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <TrendingUp className="w-4 h-4" /> Producción del Mes
          </p>
          <p className="text-3xl font-bold text-gradient-orange mt-1">{totalProdMonth.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <TrendingUp className="w-4 h-4" /> Ventas del Mes
          </p>
          <p className="text-3xl font-bold text-gradient-orange mt-1">{totalSalesMonth.toLocaleString()}</p>
        </div>
      </div>

      {/* Capacity projection */}
      <CapacityProjectionCard />

      {/* Inventario en vivo */}
      <InventoryWidget />

      {/* Desperdicio de bolsas + Ranking clientes (2 columnas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="glass-card p-4" style={{ boxShadow: '0 0 0 1px hsl(50 100% 55% / 0.25), 0 0 16px hsl(50 100% 55% / 0.18)' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <PackageX className="w-4 h-4" style={{ color: 'hsl(50 100% 60%)' }} /> Desperdicio de Bolsas
            </h3>
            <span className="text-xs text-muted-foreground">{totalDefBags.toLocaleString()} de {totalBags.toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={wasteData} dataKey="value" innerRadius={32} outerRadius={48} stroke="none">
                    {wasteData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">% Desperdicio</p>
              <p className="text-3xl font-bold" style={{ color: 'hsl(50 100% 60%)' }}>{wastagePct.toFixed(2)}%</p>
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Fábrica:</span><strong className="text-foreground">{(defByOrigin['Fábrica'] || 0).toLocaleString()}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Obrero:</span><strong className="text-foreground">{(defByOrigin['Obrero'] || 0).toLocaleString()}</strong></div>
              <div className="flex justify-between border-t border-border/50 pt-1 mt-1"><span className="text-muted-foreground">Exitosas:</span><strong className="text-foreground">{totalGoodBags.toLocaleString()}</strong></div>
            </div>
          </div>
        </div>
        <BagsClientsRanking />
      </div>

      {/* Stock alerts */}
      {alerts.length > 0 && (
        <div className="glass-card p-4 space-y-3 border-destructive/40">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h3 className="font-semibold text-foreground">Alertas de Stock Crítico ({alerts.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {alerts.map(a => (
              <span
                key={a.id}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                  a.severity === 'critical'
                    ? 'border-destructive/60 bg-destructive/10 text-destructive'
                    : 'border-primary/40 bg-primary/10 text-primary'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${a.severity === 'critical' ? 'bg-destructive animate-pulse' : 'bg-primary'}`} />
                <strong className="font-semibold">{a.label}:</strong>
                <span className="opacity-90">{a.detail}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Last 7 days chart */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Últimos 7 Días</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={last7Days}>
            <XAxis dataKey="day" stroke="hsl(220 10% 55%)" fontSize={12} />
            <YAxis stroke="hsl(220 10% 55%)" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(220 18% 13%)', border: '1px solid hsl(220 14% 20%)', borderRadius: '8px', color: 'hsl(30 10% 92%)' }} />
            <Bar dataKey="producción" name="Producción" fill="hsl(25 95% 53%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="ventas" name="Ventas" fill="hsl(210 80% 55%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
