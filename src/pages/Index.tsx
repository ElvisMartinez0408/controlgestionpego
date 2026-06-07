import { useState } from 'react';
import { Dashboard } from '@/components/Dashboard';
import logoImg from '@/assets/logo.png';
import { AttendanceTracker } from '@/components/AttendanceTracker';
import { AttendanceChart } from '@/components/AttendanceChart';
import { ProductionTracker } from '@/components/ProductionTracker';
import { ProductionChart } from '@/components/ProductionChart';
import { SalesTracker } from '@/components/SalesTracker';
import { SalesChart } from '@/components/SalesChart';
import { GuideRegistry } from '@/components/GuideRegistry';
import { RawMaterialsTracker } from '@/components/RawMaterialsTracker';
import { AuthGate } from '@/components/AuthGate';
import { ExportButton } from '@/components/ExportButton';
import { GYCReportButton } from '@/components/GYCReportButton';
import { RoleProvider, useRole } from '@/contexts/RoleContext';
import { LayoutDashboard, Users, Package, DollarSign, FileText, Warehouse, LogOut, Sun, Moon, Settings, Menu } from 'lucide-react';
import { SettingsPanel } from '@/components/SettingsPanel';
import { AlertsBell } from '@/components/AlertsBell';
import { NotesDrawer } from '@/components/NotesDrawer';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type Tab = 'dashboard' | 'raw-materials' | 'production' | 'sales' | 'attendance' | 'guides' | 'settings';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Tablero', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'attendance', label: 'Asistencia', icon: <Users className="w-4 h-4" /> },
  { id: 'production', label: 'Producción', icon: <Package className="w-4 h-4" /> },
  { id: 'sales', label: 'Ventas', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'guides', label: 'Guías', icon: <FileText className="w-4 h-4" /> },
  { id: 'raw-materials', label: 'Inventario', icon: <Warehouse className="w-4 h-4" /> },
];

function IndexContent() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, userName, roleLabel, isAdmin, canDownload, canConfig, logout } = useRole();
  const { theme, toggleTheme } = useTheme();

  if (!user) return <AuthGate />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button size="icon" variant="ghost" className="lg:hidden text-foreground" aria-label="Abrir menú">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 bg-card border-r border-border p-0">
                  <SheetHeader className="p-4 border-b border-border">
                    <SheetTitle className="flex items-center gap-2 text-foreground">
                      <img src={logoImg} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
                      PegoFlex
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-1 p-3">
                    {tabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setMobileOpen(false); }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                          activeTab === tab.id
                            ? 'gradient-orange text-primary-foreground shadow-lg'
                            : 'text-muted-foreground hover:text-primary hover:bg-secondary'
                        }`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
              <img src={logoImg} alt="Logo" className="w-10 h-10 rounded-lg object-cover" />
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">PegoFlex</h1>
                <p className="text-xs text-muted-foreground">
                  Usuario: <span className="text-foreground font-semibold">{userName}</span>
                  <span className="mx-1.5">|</span>
                  Rol: <span className="text-primary font-semibold">{roleLabel}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && <GYCReportButton />}
              {canDownload && <ExportButton />}
              <AlertsBell onNavigate={(t) => setActiveTab(t === 'raw-materials' ? 'raw-materials' : 'dashboard')} />
              {canConfig && (
                <Button size="sm" variant="ghost" onClick={() => setActiveTab('settings')} className={`text-muted-foreground hover:text-foreground ${activeTab === 'settings' ? 'text-primary' : ''}`} title="Configuración">
                  <Settings className="w-4 h-4" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground" title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={logout} className="text-muted-foreground hover:text-destructive" title="Cerrar sesión">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <nav className="border-b border-border bg-card/30 hidden lg:block">
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

      <main className="container mx-auto px-4 py-6">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'raw-materials' && <RawMaterialsTracker />}
        {activeTab === 'production' && (
          <div className="space-y-8">
            <ProductionTracker />
            <div className="border-t border-border/60 pt-8"><ProductionChart /></div>
          </div>
        )}
        {activeTab === 'sales' && (
          <div className="space-y-8">
            <SalesTracker />
            <div className="border-t border-border/60 pt-8"><SalesChart /></div>
          </div>
        )}
        {activeTab === 'attendance' && (
          <div className="space-y-8">
            <AttendanceTracker />
            <div className="border-t border-border/60 pt-8"><AttendanceChart /></div>
          </div>
        )}
        {activeTab === 'guides' && <GuideRegistry />}
        {activeTab === 'settings' && isAdmin && <SettingsPanel />}
      </main>
      <NotesDrawer />
    </div>
  );
}

export default function Index() {
  return (
    <ThemeProvider>
      <RoleProvider>
        <IndexContent />
      </RoleProvider>
    </ThemeProvider>
  );
}
