import { useState } from 'react';
import { useProduction } from '@/hooks/useProduction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Plus, Trash2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function ProductionTracker() {
  const { addRecord, removeRecord, getRecordsByDate, loading } = useProduction();
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('piezas');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dateRecords = getRecordsByDate(dateStr);
  const totalDay = dateRecords.reduce((s, r) => s + r.quantity, 0);

  const displayDate = format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });

  const handleAdd = () => {
    if (productName.trim() && Number(quantity) > 0) {
      addRecord(productName.trim(), Number(quantity), unit, dateStr, notes.trim() || undefined);
      setProductName('');
      setQuantity('');
      setNotes('');
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

      <div className="glass-card p-4 space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Nuevo Registro
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
            <label className="text-sm text-muted-foreground mb-1 block">Producto / Material</label>
            <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Ej: Cajas tipo A" className="bg-secondary border-border" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Cantidad</label>
            <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" className="bg-secondary border-border" min="0" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Unidad</label>
            <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground">
              <option value="piezas">Piezas</option>
              <option value="kg">Kilogramos</option>
              <option value="litros">Litros</option>
              <option value="metros">Metros</option>
              <option value="cajas">Cajas</option>
              <option value="toneladas">Toneladas</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Notas (opcional)</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones..." className="bg-secondary border-border" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          </div>
        </div>
        <Button onClick={handleAdd} className="gradient-orange text-primary-foreground hover:opacity-90">
          <Package className="w-4 h-4 mr-2" /> Registrar Producción
        </Button>
      </div>

      <div className="glass-card p-4 glow-orange">
        <p className="text-sm text-muted-foreground">Total producido ({format(selectedDate, 'dd/MM/yyyy')})</p>
        <p className="text-4xl font-bold text-gradient-orange">{totalDay.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">{dateRecords.length} registros</p>
      </div>

      {dateRecords.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground">Registros del {format(selectedDate, 'dd/MM/yyyy')}</h3>
          {dateRecords.map(record => (
            <div key={record.id} className="glass-card p-3 flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">{record.product_name}</span>
                <span className="text-primary ml-2 font-bold">{record.quantity} {record.unit}</span>
                {record.notes && <p className="text-xs text-muted-foreground mt-0.5">{record.notes}</p>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => removeRecord(record.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
