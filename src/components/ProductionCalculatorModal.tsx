import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calculator, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useFinishedStock } from '@/hooks/useFinishedStock';
import { useSales } from '@/hooks/useSales';
import { toast } from 'sonner';

const PRODUCTS = ['Pego Blanco', 'Pego Gris', 'Pego Premium'] as const;
type ProductKey = typeof PRODUCTS[number];

interface Row { inicial: string; ventas: string; actual: string; }
const emptyRow = (): Row => ({ inicial: '', ventas: '', actual: '' });

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (results: Record<ProductKey, number>) => void;
}

export function ProductionCalculatorModal({ open, onOpenChange, onApply }: Props) {
  const { getStock } = useFinishedStock();
  const { records: sales } = useSales();
  const [rows, setRows] = useState<Record<ProductKey, Row>>({
    'Pego Blanco': emptyRow(),
    'Pego Gris': emptyRow(),
    'Pego Premium': emptyRow(),
  });

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const setField = (p: ProductKey, field: keyof Row, val: string) => {
    setRows(prev => ({ ...prev, [p]: { ...prev[p], [field]: val } }));
  };

  const loadYesterday = (p: ProductKey) => {
    // Use last known finished stock (represents current/last snapshot)
    const stock = getStock(p);
    setField(p, 'inicial', String(stock));
    toast.success(`${p}: cargado ${stock} sacos como inventario inicial`);
  };

  const autoFillTodaySales = (p: ProductKey) => {
    const total = sales
      .filter(s => s.date === today && s.product_name === p)
      .reduce((sum, s) => sum + s.quantity, 0);
    setField(p, 'ventas', String(total));
  };

  const compute = (p: ProductKey) => {
    const r = rows[p];
    const ini = Number(r.inicial) || 0;
    const ven = Number(r.ventas) || 0;
    const act = Number(r.actual) || 0;
    if (!r.inicial && !r.ventas && !r.actual) return null;
    return (act + ven) - ini;
  };

  const handleApply = () => {
    const results: Record<ProductKey, number> = { 'Pego Blanco': 0, 'Pego Gris': 0, 'Pego Premium': 0 };
    let any = false;
    for (const p of PRODUCTS) {
      const v = compute(p);
      if (v !== null && v > 0) {
        results[p] = v;
        any = true;
      }
    }
    if (!any) {
      toast.error('No hay producción positiva para aplicar');
      return;
    }
    onApply(results);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Calculator className="w-5 h-5 text-primary" /> Calculadora de Producción
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div className="hidden md:grid grid-cols-[1fr_1.3fr_1fr_1fr_0.9fr] gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            <div>Producto</div>
            <div>Inventario Inicial</div>
            <div>Ventas del día</div>
            <div>Inventario Actual</div>
            <div className="text-right">Total Producido</div>
          </div>
          {PRODUCTS.map(p => {
            const result = compute(p);
            const negative = result !== null && result < 0;
            return (
              <div key={p} className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr_1fr_1fr_0.9fr] gap-2 items-center rounded-lg border border-border bg-secondary/40 p-3">
                <div className="font-semibold text-foreground text-sm">{p}</div>
                <div className="flex gap-1">
                  <Input type="number" value={rows[p].inicial} onChange={e => setField(p, 'inicial', e.target.value)} placeholder="Inicial" className="bg-card border-border h-9" min="0" />
                  <Button type="button" size="sm" variant="outline" onClick={() => loadYesterday(p)} title="Cargar de ayer" className="h-9 px-2 shrink-0 border-primary/40 text-primary hover:bg-primary/10">
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex gap-1">
                  <Input type="number" value={rows[p].ventas} onChange={e => setField(p, 'ventas', e.target.value)} placeholder="Ventas" className="bg-card border-border h-9" min="0" />
                  <Button type="button" size="sm" variant="ghost" onClick={() => autoFillTodaySales(p)} title="Cargar ventas de hoy" className="h-9 px-2 shrink-0 text-xs">
                    Hoy
                  </Button>
                </div>
                <Input type="number" value={rows[p].actual} onChange={e => setField(p, 'actual', e.target.value)} placeholder="Actual" className="bg-card border-border h-9" min="0" />
                <div className={`text-right font-bold text-lg ${negative ? 'text-destructive' : result && result > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {result === null ? '—' : result}
                  {negative && (
                    <div className="text-[10px] font-normal text-destructive flex items-center justify-end gap-1 mt-0.5">
                      <AlertTriangle className="w-3 h-3" /> Revisar datos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground pt-2">
            Fórmula: <span className="text-foreground font-mono">Producción = (Inventario Actual + Ventas) − Inventario Inicial</span>
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleApply} className="gradient-orange text-primary-foreground">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Aplicar Resultados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}