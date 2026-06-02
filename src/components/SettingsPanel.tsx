import { useState } from 'react';
import { RecipesEditor } from './RecipesEditor';
import { CompanyInfoEditor } from './CompanyInfoEditor';
import { UsersAdminPanel } from './UsersAdminPanel';
import { Button } from '@/components/ui/button';
import { FlaskConical, Building2, RotateCcw, ShieldAlert, Users } from 'lucide-react';
import { PinConfirmDialog } from '@/components/PinConfirmDialog';
import { fullSystemReset } from '@/lib/systemReset';
import { toast } from 'sonner';

type Section = 'recipes' | 'company' | 'users' | 'restore';

export function SettingsPanel() {
  const [section, setSection] = useState<Section>('recipes');
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configuración</h2>
        <p className="text-muted-foreground text-sm">Ajustes avanzados del sistema</p>
      </div>

      <nav className="flex gap-2 border-b border-border flex-wrap">
        <button
          onClick={() => setSection('recipes')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            section === 'recipes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FlaskConical className="w-4 h-4" /> Editar Recetas
        </button>
        <button
          onClick={() => setSection('company')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            section === 'company' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="w-4 h-4" /> Información de la Empresa
        </button>
        <button
          onClick={() => setSection('users')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            section === 'users' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" /> Usuarios y Accesos
        </button>
        <button
          onClick={() => setSection('restore')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            section === 'restore' ? 'border-destructive text-destructive' : 'border-transparent text-muted-foreground hover:text-destructive'
          }`}
        >
          <RotateCcw className="w-4 h-4" /> Restaurar Sistema
        </button>
      </nav>

      {section === 'recipes' && <RecipesEditor />}
      {section === 'company' && <CompanyInfoEditor />}
      {section === 'users' && <UsersAdminPanel />}
      {section === 'restore' && (
        <div className="glass-card p-6 space-y-4 border-destructive/40">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Restaurar desde Cero</h3>
              <p className="text-sm text-muted-foreground">
                Vacía los historiales de <strong>Asistencia, Producción, Ventas, Guías e Inventario</strong>.
                Las <strong>recetas</strong> y la información de la empresa permanecerán intactas.
              </p>
            </div>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-5">
            <li>Se eliminarán todos los registros operativos.</li>
            <li>Las recetas configuradas se conservan.</li>
            <li>Requiere doble verificación: clave de administrador + palabra "Confirmar".</li>
          </ul>
          <Button variant="destructive" onClick={() => setResetOpen(true)}>
            <RotateCcw className="w-4 h-4 mr-2" /> Restaurar desde Cero
          </Button>
        </div>
      )}

      <PinConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Restaurar Sistema desde Cero"
        description="Acción irreversible. Se borrarán todos los historiales operativos. Las recetas se conservarán."
        requireConfirmWord
        confirmWord="Confirmar"
        destructiveLabel="Restaurar todo"
        onConfirm={async () => {
          await fullSystemReset();
          toast.success('Sistema restaurado · recetas conservadas');
          setTimeout(() => window.location.reload(), 800);
        }}
      />
    </div>
  );
}
