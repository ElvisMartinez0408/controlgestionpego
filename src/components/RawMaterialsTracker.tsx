import { useState } from 'react';
import { useRawMaterials, MATERIALS, getUnitForMaterial, isSackMaterial, type MaterialName, BAG_TYPES } from '@/hooks/useRawMaterials';
import { useRole } from '@/contexts/RoleContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MaterialStatusCards } from '@/components/MaterialStatusCards';
import { FinishedStockCards } from '@/components/FinishedStockCards';
import { BagEntryForm } from '@/components/BagEntryForm';
import { CustomSuppliesSection } from '@/components/CustomSuppliesSection';
import { ResetStockButton } from '@/components/ResetStockButton';
import { CapacityProjectionCard } from '@/components/CapacityProjectionCard';
import { Warehouse, Plus, Trash2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function RawMaterialsTracker() {
  const { records, loading, addRecord, removeRecord } = useRawMaterials();
  const { isAdmin } = useRole();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [material, setMaterial] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [sackCount, setSackCount] = useState('');
  const [kilosPerSack, setKilosPerSack] = useState('');
  const [notes, setNotes] = useState('');
  // Display unit toggle for Cementos/Arena: 'kg' shows raw kilos, 'tn' converts to toneladas
  const [weightDisplay, setWeightDisplay] = useState<'kg' | 'tn'>('tn');

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const displayDate = format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });

  const selectedMaterial = material as MaterialName;
  const isSack = material ? isSackMaterial(selectedMaterial) : false;
  const unit = material ? getUnitForMaterial(selectedMaterial) : '';

  // Auto-calculated total for sack materials
  const calculatedKilos = isSack && Number(sackCount) > 0 && Number(kilosPerSack) > 0
    ? Number(sackCount) * Number(kilosPerSack)
    : 0;

  const handleAdd = () => {
    if (!material) return;

    let finalQty: number;
    let finalUnit: string;

    if (isSack) {
      if (Number(sackCount) <= 0 || Number(kilosPerSack) <= 0) return;
      finalQty = calculatedKilos;
      finalUnit = 'Kilos';
    } else {
      if (Number(quantity) <= 0) return;
      finalQty = Number(quantity);
      finalUnit = unit;
    }

    addRecord(
      material,
      finalQty,
      finalUnit,
      dateStr,
      isSack ? Number(sackCount) : undefined,
      isSack ? Number(kilosPerSack) : undefined,
      notes.trim() || undefined,
    );
    setMaterial('');
    setQuantity('');
    setSackCount('');
    setKilosPerSack('');
    setNotes('');
  };

  // Filter records to show all (historical table)
  const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date));

  // Convert quantity for display based on toggle. Internally always stored in original unit.
  const TON_NAMES = ['Cemento Gris', 'Arena'];
  const formatRow = (rec: typeof records[number]) => {
    if (TON_NAMES.includes(rec.material_name)) {
      // Stored as Toneladas. Convert to Kilos if needed.
      if (weightDisplay === 'kg') {
        return { qty: rec.quantity * 1000, unit: 'Kilos' };
      }
      return { qty: rec.quantity, unit: 'Toneladas' };
    }
    return { qty: rec.quantity, unit: rec.unit };
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Registro de Materias Primas</h2>
            <p className="text-muted-foreground capitalize">{displayDate}</p>
          </div>
          <ResetStockButton />
        </div>
      </div>

      {/* Finished product stock cards (manual edit) */}
      <FinishedStockCards />

      {/* Capacity projection */}
      <CapacityProjectionCard />

      {isAdmin && (
        <div className="glass-card p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Nueva Entrada de Material
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Fecha */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Fecha</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal bg-secondary border-border")}
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

            {/* Material */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Material</label>
              <select
                value={material}
                onChange={e => {
                  setMaterial(e.target.value);
                  setQuantity('');
                  setSackCount('');
                  setKilosPerSack('');
                }}
                className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
              >
                <option value="">Seleccionar material...</option>
                {MATERIALS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Quantity fields — dynamic based on material type */}
            {material && !isSack && (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Cantidad ({unit})</label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="0"
                  className="bg-secondary border-border"
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            {material && isSack && (
              <>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Cantidad de Sacos</label>
                  <Input
                    type="number"
                    value={sackCount}
                    onChange={e => setSackCount(e.target.value)}
                    placeholder="0"
                    className="bg-secondary border-border"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Kilos por Saco</label>
                  <Input
                    type="number"
                    value={kilosPerSack}
                    onChange={e => setKilosPerSack(e.target.value)}
                    placeholder="0"
                    className="bg-secondary border-border"
                    min="0"
                    step="0.01"
                  />
                </div>
              </>
            )}

            {/* Notes */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Notas (opcional)</label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Observaciones..."
                className="bg-secondary border-border"
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
          </div>

          {/* Auto-calc display for sack materials */}
          {isSack && calculatedKilos > 0 && (
            <div className="glass-card p-2 text-sm text-foreground">
              <span className="text-muted-foreground">Cálculo: </span>
              <span className="font-bold text-primary">{sackCount} sacos × {kilosPerSack} kg = {calculatedKilos.toLocaleString()} Kilos</span>
            </div>
          )}

          <Button onClick={handleAdd} className="gradient-orange text-primary-foreground hover:opacity-90">
            <Warehouse className="w-4 h-4 mr-2" /> Registrar Entrada
          </Button>
        </div>
      )}

      {/* Bag entry form */}
      <BagEntryForm />

      {/* Historical Table */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-semibold text-foreground">Historial de Entradas</h3>
          <div className="inline-flex items-center rounded-lg border border-border bg-secondary p-0.5 text-xs">
            <button
              onClick={() => setWeightDisplay('kg')}
              className={cn('px-3 py-1 rounded-md font-medium transition-all', weightDisplay === 'kg' ? 'gradient-orange text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >Kilogramos</button>
            <button
              onClick={() => setWeightDisplay('tn')}
              className={cn('px-3 py-1 rounded-md font-medium transition-all', weightDisplay === 'tn' ? 'gradient-orange text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >Toneladas</button>
          </div>
        </div>
        {sortedRecords.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay registros de materias primas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Fecha</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Material</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Cantidad</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Unidad</th>
                  {isAdmin && <th className="text-center py-2 px-3 text-muted-foreground font-medium">Acción</th>}
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((record, i) => {
                  const { qty, unit: dispUnit } = formatRow(record);
                  return (
                  <tr key={record.id} className={cn("border-b border-border/50", i % 2 === 0 && "bg-secondary/30")}>
                    <td className="py-2 px-3 text-foreground">{record.date}</td>
                    <td className="py-2 px-3 text-foreground">{record.material_name}</td>
                    <td className="py-2 px-3 text-right font-bold text-primary">{qty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-muted-foreground">{dispUnit}</td>
                    {isAdmin && (
                      <td className="py-2 px-3 text-center">
                        <Button size="sm" variant="ghost" onClick={() => removeRecord(record.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom supplies with alert thresholds */}
      <CustomSuppliesSection />

      {/* Material Status Cards */}
      <MaterialStatusCards records={records} />
    </div>
  );
}
