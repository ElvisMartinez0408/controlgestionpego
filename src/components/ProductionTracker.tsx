import { useState, useEffect } from 'react';
import { useProduction } from '@/hooks/useProduction';
import { useRole } from '@/contexts/RoleContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Plus, Trash2, CalendarIcon, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { SHIFT_STATUSES, type ShiftStatus, type RecipeConsumption } from '@/lib/recipes';
import { computeConsumptionLive, saveProductionSnapshot, getProductionSnapshot, deleteProductionSnapshot } from '@/lib/recipesDb';
import { useMaterialStock } from '@/hooks/useMaterialStock';
import { useFinishedStock } from '@/hooks/useFinishedStock';
import { toast } from 'sonner';

export function ProductionTracker() {
  const { addRecord, removeRecord, getRecordsByDate, loading } = useProduction();
  const { isAdmin } = useRole();
  const { stocks: materialStocks, getStock, adjustMany } = useMaterialStock();
  const { getStock: getFinished, updateStock: updateFinished } = useFinishedStock();
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus>('Normal');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [previewConsumption, setPreviewConsumption] = useState<RecipeConsumption[]>([]);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dateRecords = getRecordsByDate(dateStr);
  const totalDay = dateRecords.reduce((s, r) => s + r.quantity, 0);

  const displayDate = format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });

  // Live preview of consumption (reads CURRENT recipe from Dexie)
  useEffect(() => {
    let cancelled = false;
    if (productName && Number(quantity) > 0) {
      computeConsumptionLive(productName, Number(quantity)).then(c => {
        if (!cancelled) setPreviewConsumption(c);
      });
    } else {
      setPreviewConsumption([]);
    }
    return () => { cancelled = true; };
  }, [productName, quantity]);

  const handleAdd = async () => {
    const sacks = Number(quantity);
    if (!productName.trim() || sacks <= 0) return;

    const consumption = await computeConsumptionLive(productName, sacks);

    // Validate sufficient stock for every required material
    const missing = consumption.filter(c => getStock(c.material) < c.qty);
    if (missing.length > 0) {
      toast.error('Stock insuficiente', {
        description: missing.map(m => `${m.material}: faltan ${(m.qty - getStock(m.material)).toFixed(2)}`).join(' · '),
      });
      return;
    }

    const created = await addRecord(productName.trim(), sacks, 'sacos', dateStr, notes.trim() || undefined, shiftStatus);
    if (!created) return;

    // Save historical snapshot of recipe used (for integrity on reversal)
    await saveProductionSnapshot({
      productionId: created.id,
      product: productName.trim(),
      sacks,
      consumption,
      createdAt: Date.now(),
    });

    // Subtract raw materials & bags
    await adjustMany(consumption.map(c => ({ material: c.material, qty: -c.qty })));
    // Add to finished product stock
    const currentFinished = getFinished(productName);
    await updateFinished(productName, currentFinished + sacks);

    toast.success(`+${sacks} sacos de ${productName}`, {
      description: `Stock terminado: ${(currentFinished + sacks).toLocaleString()} sacos`,
    });

    setProductName('');
    setQuantity('');
    setNotes('');
    setShiftStatus('Normal');
  };

  const handleRemove = async (id: string) => {
    const record = dateRecords.find(r => r.id === id);
    await removeRecord(id);
    // Reverse using the SNAPSHOT (so historical edits to the recipe don't break old reversals)
    if (record) {
      const snap = await getProductionSnapshot(id);
      const consumption = snap
        ? snap.consumption
        : await computeConsumptionLive(record.product_name, record.quantity);
      if (consumption.length > 0) {
        await adjustMany(consumption.map(c => ({ material: c.material, qty: c.qty })));
      }
      const finished = getFinished(record.product_name);
      await updateFinished(record.product_name, Math.max(0, finished - record.quantity));
      await deleteProductionSnapshot(id);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Registro de Producción</h2>
        <p className="text-muted-foreground capitalize">{displayDate}</p>
      </div>

      {isAdmin && (
        <div className="glass-card p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Nuevo Registro
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Fecha</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal bg-secondary border-border", !selectedDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => d && setSelectedDate(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Producto</label>
              <select
                value={productName}
                onChange={e => setProductName(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
              >
                <option value="">Seleccionar producto...</option>
                <option value="Pego Gris">Pego Gris</option>
                <option value="Pego Blanco">Pego Blanco</option>
                <option value="Pego Premium">Pego Premium</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Cantidad (sacos)</label>
              <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" className="bg-secondary border-border" min="0" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Estado de Jornada *</label>
              <select
                value={shiftStatus}
                onChange={e => setShiftStatus(e.target.value as ShiftStatus)}
                className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
              >
                {SHIFT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Notas (opcional)</label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones..." className="bg-secondary border-border" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
          </div>

          {/* Live consumption preview */}
          {previewConsumption.length > 0 && (
            <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Consumo estimado</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                {previewConsumption.map(c => {
                  const available = getStock(c.material);
                  const insufficient = available < c.qty;
                  return (
                    <div key={c.material} className={cn('flex items-center justify-between rounded px-2 py-1', insufficient ? 'bg-destructive/15 text-destructive' : 'bg-card/60 text-foreground')}>
                      <span className="truncate mr-1">{c.material}</span>
                      <span className="font-bold whitespace-nowrap flex items-center gap-1">
                        −{c.qty.toFixed(c.qty < 1 ? 3 : 2)}
                        {insufficient && <AlertTriangle className="w-3 h-3" />}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Button onClick={handleAdd} className="gradient-orange text-primary-foreground hover:opacity-90">
            <Package className="w-4 h-4 mr-2" /> Registrar Producción
          </Button>
        </div>
      )}

      <div className="glass-card p-4 glow-orange">
        <p className="text-sm text-muted-foreground">Total producido ({format(selectedDate, 'dd/MM/yyyy')})</p>
        <p className="text-4xl font-bold text-gradient-orange">{totalDay.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">sacos · {dateRecords.length} registros</p>
      </div>

      {dateRecords.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground">Registros del {format(selectedDate, 'dd/MM/yyyy')}</h3>
          {dateRecords.map(record => (
            <div key={record.id} className="glass-card p-3 flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">{record.product_name}</span>
                <span className="text-primary ml-2 font-bold">{record.quantity} sacos</span>
                {record.shift_status && record.shift_status !== 'Normal' && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-destructive/15 text-destructive">
                    <AlertTriangle className="w-3 h-3" /> {record.shift_status}
                  </span>
                )}
                {record.shift_status === 'Normal' && (
                  <span className="ml-2 text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-primary/10 text-primary">Normal</span>
                )}
                {record.notes && <p className="text-xs text-muted-foreground mt-0.5">{record.notes}</p>}
              </div>
              {isAdmin && (
                <Button size="sm" variant="ghost" onClick={() => handleRemove(record.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
