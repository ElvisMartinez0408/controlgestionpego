import { useState } from 'react';
import { RecipesEditor } from './RecipesEditor';
import { FlaskConical } from 'lucide-react';

type Section = 'recipes';

export function SettingsPanel() {
  const [section] = useState<Section>('recipes');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configuración</h2>
        <p className="text-muted-foreground text-sm">Ajustes avanzados del sistema</p>
      </div>

      <nav className="flex gap-2 border-b border-border">
        <button
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            section === 'recipes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
          }`}
        >
          <FlaskConical className="w-4 h-4" /> Editar Recetas y Fórmulas
        </button>
      </nav>

      {section === 'recipes' && <RecipesEditor />}
    </div>
  );
}