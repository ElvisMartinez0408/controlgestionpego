import { useState } from 'react';
import { useRawMaterials, BAG_TYPES } from '@/hooks/useRawMaterials';
import { useRole } from '@/contexts/RoleContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Package2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function BagEntryForm() {
  const { addRecord } = useRawMaterials();
  const { isAdmin } = useRole();
  const [show, setShow] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [bagType, setBagType] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  if (!isAdmin) return null;

  const handleAdd = async () => {
    if (!bagType || Number(quantity) <= 0) return;
    await addRecord(bagType, Number(quantity), 'Unidades', format(date, 'yyyy-MM-dd'), undefined, undefined, notes.trim() || undefined);
    setBagType(''); setQuantity(''); setNotes(''); setShow(false);
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Package2 className="w-4 h-4 text-primary" /> Entrada de Bolsas Vacías
        </h3>
        <Button size="sm" variant="ghost" onClick={() => setShow(s => !s)} className="text-primary hover:text-primary">
          <Plus className="w-4 h-4 mr-1" /> Nueva entrada de bolsas
        </Button>
      </div>

      {show && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-lg bg-secondary/40 border border-border">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Fecha</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal bg-secondary border-border">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, 'dd/MM/yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={d => d && setDate(d)} initialFocus className={cn('p-3 pointer-events-auto')} />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tipo de bolsa</label>
            <select value={bagType} onChange={e => setBagType(e.target.value)} className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground">
              <option value="">Seleccionar...</option>
              {BAG_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Cantidad (unidades)</label>
            <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" className="bg-secondary border-border" min="0" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Observaciones</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional..." className="bg-secondary border-border" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button onClick={handleAdd} className="gradient-orange text-primary-foreground hover:opacity-90">
              <Package2 className="w-4 h-4 mr-2" /> Registrar Bolsas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
