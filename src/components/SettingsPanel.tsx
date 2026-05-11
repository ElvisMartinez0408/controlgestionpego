import { useState } from 'react';
import { RecipesEditor } from './RecipesEditor';
import { CompanyInfoEditor } from './CompanyInfoEditor';
import { FlaskConical, Building2 } from 'lucide-react';

type Section = 'recipes' | 'company';

export function SettingsPanel() {
  const [section, setSection] = useState<Section>('recipes');

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
      </nav>

      {section === 'recipes' && <RecipesEditor />}
      {section === 'company' && <CompanyInfoEditor />}
    </div>
  );
}
