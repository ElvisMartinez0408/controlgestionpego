import { useState, useEffect } from 'react';
import { useRecipes } from '@/hooks/useRecipes';
import { resetRecipeToDefault } from '@/lib/recipesDb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, RotateCcw, ShieldCheck, FlaskConical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useRole } from '@/contexts/RoleContext';
import type { RecipeConsumption } from '@/lib/recipes';

export function RecipesEditor() {
  const { isAdmin } = useRole();
  const { recipes, loading, update } = useRecipes();
  const [drafts, setDrafts] = useState<Record<string, RecipeConsumption[]>>({});
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => {
    const map: Record<string, RecipeConsumption[]> = {};
    recipes.forEach(r => { map[r.product] = r.ingredients.map(i => ({ ...i })); });
    setDrafts(map);
  }, [recipes]);

  if (!isAdmin) {
    return <p className="text-sm text-muted-foreground">Solo el administrador puede editar las fórmulas.</p>;
  }
  if (loading) return <p className="text-sm text-muted-foreground">Cargando recetas...</p>;

  const updateQty = (product: string, idx: number, qty: number) => {
    setDrafts(prev => ({
      ...prev,
      [product]: prev[product].map((ing, i) => i === idx ? { ...ing, qty } : ing),
    }));
  };

  const handleSave = async (product: string) => {
    const ing = drafts[product];
    if (!ing || ing.some(i => i.qty < 0 || isNaN(i.qty))) {
      toast.error('Cantidades inválidas');
      return;
    }
    await update(product, ing);
    toast.success(`Fórmula de ${product} actualizada`, {
      description: 'Aplicará a la próxima producción registrada.',
    });
    setConfirm(null);
  };

  const handleReset = async (product: string) => {
    await resetRecipeToDefault(product);
    toast.success(`Fórmula de ${product} restaurada a valores por defecto`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
        <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="text-foreground font-medium">Datos protegidos</p>
          <p>Las recetas y los snapshots de producción no se eliminan al reiniciar valores. La producción ya registrada conserva los valores con los que fue creada (historial íntegro).</p>
        </div>
      </div>

      {recipes.map(r => (
        <div key={r.product} className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" /> {r.product}
            </h3>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              por 1 saco · actualizada {new Date(r.updatedAt).toLocaleDateString()}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingrediente</TableHead>
                <TableHead className="w-44">Cantidad por saco</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(drafts[r.product] || []).map((ing, idx) => (
                <TableRow key={ing.material}>
                  <TableCell className="font-medium text-foreground">{ing.material}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={ing.qty}
                      onChange={e => updateQty(r.product, idx, Number(e.target.value))}
                      className="bg-secondary border-border h-9"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" size="sm" onClick={() => handleReset(r.product)}>
              <RotateCcw className="w-4 h-4 mr-1" /> Restaurar
            </Button>
            <Button size="sm" onClick={() => setConfirm(r.product)} className="gradient-orange text-primary-foreground">
              <Save className="w-4 h-4 mr-1" /> Guardar Nueva Fórmula
            </Button>
          </div>
        </div>
      ))}

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar nueva fórmula</DialogTitle>
            <DialogDescription>
              Vas a sobrescribir la receta vigente de <strong>{confirm}</strong>. Los registros de producción anteriores no se modifican; los nuevos usarán esta fórmula.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
            <Button onClick={() => confirm && handleSave(confirm)} className="gradient-orange text-primary-foreground">
              Confirmar y Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}