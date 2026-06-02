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
import { computeConsumptionLive, saveProductionSnapshot, getProductionSnapshot, deleteProductionSnapshot, addDefectiveBags, deleteDefectiveBagsByProduction, type DefectiveOrigin } from '@/lib/recipesDb';
import { useMaterialStock } from '@/hooks/useMaterialStock';
import { useFinishedStock } from '@/hooks/useFinishedStock';
import { toast } from 'sonner';
import { PinConfirmDialog } from '@/components/PinConfirmDialog';
import { useAudits, formatAuditStamp } from '@/lib/audit';

export function ProductionTracker() {
  const { addRecord, removeRecord, removeAllRecords, getRecordsByDate, loading } = useProduction();
  const { isAdmin, canCreate, canDelete } = useRole();
  const audits = useAudits('production');
  const { stocks: materialStocks, getStock, adjustMany } = useMaterialStock();
  const { getStock: getFinished, updateStock: updateFinished } = useFinishedStock();
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus>('Normal');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [previewConsumption, setPreviewConsumption] = useState<RecipeConsumption[]>([]);
  // Defective bags pending to register with this batch
  const [defBagType, setDefBagType] = useState<'Pego Gris' | 'Pego Blanco' | 'Pego Premium'>('Pego Gris');
  const [defQty, setDefQty] = useState('');
  const [defOrigin, setDefOrigin] = useState<DefectiveOrigin>('Fábrica');
  const [pendingDefects, setPendingDefects] = useState<{ product: 'Pego Gris' | 'Pego Blanco' | 'Pego Premium'; qty: number; origin: DefectiveOrigin }[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);

  const productToBag: Record<string, 'Bolsa Gris' | 'Bolsa Blanco' | 'Bolsa Premium'> = {
    'Pego Gris': 'Bolsa Gris',
    'Pego Blanco': 'Bolsa Blanco',
    'Pego Premium': 'Bolsa Premium',
  };

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

    // Add defective bags to consumption (extra bag stock to subtract)
    const defectsByBag: Record<string, number> = {};
    pendingDefects.forEach(d => {
      const bag = productToBag[d.product];
      defectsByBag[bag] = (defectsByBag[bag] || 0) + d.qty;
    });
    const merged: RecipeConsumption[] = consumption.map(c => ({ ...c }));
    Object.entries(defectsByBag).forEach(([bag, qty]) => {
      const idx = merged.findIndex(c => c.material === bag);
      if (idx >= 0) merged[idx].qty += qty;
      else merged.push({ material: bag, qty });
    });

    // Validate sufficient stock for every required material
    const missing = merged.filter(c => getStock(c.material) < c.qty);
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
      consumption: merged,
      createdAt: Date.now(),
    });

    // Persist each defective entry linked to this batch
    for (const d of pendingDefects) {
      await addDefectiveBags({
        id: `${created.id}-${Math.random().toString(36).slice(2, 9)}`,
        productionId: created.id,
        bagType: productToBag[d.product],
        product: d.product,
        qty: d.qty,
        origin: d.origin,
        date: dateStr,
        createdAt: Date.now(),
      });
    }

    // Subtract raw materials & bags
    await adjustMany(merged.map(c => ({ material: c.material, qty: -c.qty })));
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
    setPendingDefects([]);
    setDefQty('');
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
      await deleteDefectiveBagsByProduction(id);
    }
  };

  const addPendingDefect = () => {
    const q = Number(defQty);
    if (q <= 0) return;
    setPendingDefects(p => [...p, { product: defBagType, qty: q, origin: defOrigin }]);
    setDefQty('');
  };
  const removePendingDefect = (idx: number) => {
    setPendingDefects(p => p.filter((_, i) => i !== idx));
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Registro de Producción</h2>
          <p className="text-muted-foreground capitalize">{displayDate}</p>
        </div>
        {canDelete && (
          <Button size="sm" variant="destructive" onClick={() => setBulkOpen(true)}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar Historial
          </Button>
        )}
      </div>

      {canCreate && (
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

          {/* Defective bags section */}
          <div
            className="rounded-lg p-4 space-y-3 mt-2"
            style={{
              border: '1px solid hsl(50 100% 55% / 0.55)',
              boxShadow: '0 0 0 1px hsl(50 100% 55% / 0.25), 0 0 18px hsl(50 100% 55% / 0.35)',
              background: 'hsl(50 100% 55% / 0.04)',
            }}
          >
            <h4 className="font-semibold flex items-center gap-2" style={{ color: 'hsl(50 100% 60%)' }}>
              <AlertTriangle className="w-4 h-4" /> Bolsas Defectuosas en Jornada
            </h4>
            <p className="text-xs text-muted-foreground">Se sumarán al consumo de bolsas y se descontarán del inventario al registrar la producción.</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tipo de bolsa</label>
                <select
                  value={defBagType}
                  onChange={e => setDefBagType(e.target.value as any)}
                  className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
                >
                  <option value="Pego Gris">Bolsa Gris</option>
                  <option value="Pego Blanco">Bolsa Blanco</option>
                  <option value="Pego Premium">Bolsa Premium</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cantidad</label>
                <Input type="number" value={defQty} onChange={e => setDefQty(e.target.value)} placeholder="0" className="bg-secondary border-border" min="0" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Origen del defecto</label>
                <div className="flex gap-2">
                  {(['Fábrica', 'Obrero'] as DefectiveOrigin[]).map(o => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setDefOrigin(o)}
                      className={cn(
                        'flex-1 h-10 rounded-md border text-sm transition-colors',
                        defOrigin === o
                          ? 'border-yellow-400 bg-yellow-400/15 text-yellow-300 font-semibold'
                          : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {o === 'Fábrica' ? 'Defecto de Fábrica' : 'Defecto por Obrero'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addPendingDefect} className="border-yellow-500/40 text-yellow-300 hover:bg-yellow-400/10">
              <Plus className="w-3.5 h-3.5 mr-1" /> Añadir defectuosas
            </Button>
            {pendingDefects.length > 0 && (
              <div className="space-y-1.5">
                {pendingDefects.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs rounded px-2 py-1.5 bg-yellow-400/5 border border-yellow-400/20">
                    <span className="text-foreground">
                      <strong className="text-yellow-300">{d.qty}</strong> {productToBag[d.product]} · {d.origin}
                    </span>
                    <button onClick={() => removePendingDefect(i)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                <p className="text-[10px] text-muted-foreground mt-0.5">Registrado por: {formatAuditStamp(audits[record.id])}</p>
              </div>
              {canDelete && (
                <Button size="sm" variant="ghost" onClick={() => handleRemove(record.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <PinConfirmDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Eliminar Historial Completo de Producción"
        description="Se borrarán todos los registros de producción. Esta acción no devolverá automáticamente el stock. Ingresa la clave de administrador."
        destructiveLabel="Eliminar todo"
        onConfirm={async () => { await removeAllRecords(); toast.success('Historial de producción eliminado'); }}
      />
    </div>
  );
}
