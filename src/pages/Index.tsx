import { useState } from 'react';
import { AttendanceTracker } from '@/components/AttendanceTracker';
import { AttendanceChart } from '@/components/AttendanceChart';
import { ProductionTracker } from '@/components/ProductionTracker';
import { ProductionChart } from '@/components/ProductionChart';
import { SalesTracker } from '@/components/SalesTracker';
import { SalesChart } from '@/components/SalesChart';
import { PinGate, useDeviceAuth } from '@/components/PinGate';
import { Users, BarChart3, Package, TrendingUp, DollarSign, LineChart } from 'lucide-react';

type Tab = 'attendance' | 'attendance-chart' | 'production' | 'production-chart' | 'sales' | 'sales-chart';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'attendance', label: 'Asistencia', icon: <Users className="w-4 h-4" /> },
  { id: 'attendance-chart', label: 'Gráfica Asistencia', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'production', label: 'Producción', icon: <Package className="w-4 h-4" /> },
  { id: 'production-chart', label: 'Gráfica Producción', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'sales', label: 'Ventas', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'sales-chart', label: 'Gráfica Ventas', icon: <LineChart className="w-4 h-4" /> },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>('attendance');
  const { authorized, authorize } = useDeviceAuth();

  if (!authorized) {
    return <PinGate onAuthorized={authorize} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gradient-orange flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Control de Gestión</h1>
              <p className="text-xs text-muted-foreground">Asistencia, Producción y Ventas</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-border bg-card/30">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'gradient-orange text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {activeTab === 'attendance' && <AttendanceTracker />}
        {activeTab === 'attendance-chart' && <AttendanceChart />}
        {activeTab === 'production' && <ProductionTracker />}
        {activeTab === 'production-chart' && <ProductionChart />}
        {activeTab === 'sales' && <SalesTracker />}
        {activeTab === 'sales-chart' && <SalesChart />}
      </main>
    </div>
  );
}