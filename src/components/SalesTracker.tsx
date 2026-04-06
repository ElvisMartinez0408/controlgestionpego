import { useState, useMemo } from 'react';
import { useSales } from '@/hooks/useSales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, Plus, Trash2 } from 'lucide-react';

const PRODUCT_OPTIONS = ['Pego Gris', 'Pego Blanco', 'Pego Premium'];

export function SalesTracker() {
  const { addRecord, removeRecord, getTodayRecords, records, loading } = useSales();
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [client, setClient] = useState('');
  const [notes, setNotes] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  const todayRecords = getTodayRecords();
  const totalToday = todayRecords.reduce((s, r) => s + r.quantity, 0);

  const uniqueClients = useMemo(() => {
    const clients = records
      .map(r => r.client)
      .filter((c): c is string => !!c && c.trim() !== '');
    return [...new Set(clients)].sort();
  }, [records]);

  const filteredClients = useMemo(() => {
    if (!client.trim()) return uniqueClients.slice(0, 8);
    return uniqueClients.filter(c => c.toLowerCase().includes(client.toLowerCase())).slice(0, 8);
  }, [client, uniqueClients]);

  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const handleAdd = () => {
    if (productName.trim() && Number(quantity) > 0) {
      addRecord(productName.trim(), Number(quantity), client.trim() || undefined, notes.trim() || undefined);
      setProductName('');
      setQuantity('');
      setClient('');
      setNotes('');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Registro de Ventas</h2>
        <p className="text-muted-foreground capitalize">{today}</p>
      </div>

      <div className="glass-card p-4 space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Nueva Venta
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Producto</label>
            <select
              value={productName}
              onChange={e => setProductName(e.target.value)}
              className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
            >
              <option value="">Seleccionar producto...</option>
              {PRODUCT_OPTIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Cantidad</label>
            <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" className="bg-secondary border-border" min="0" />
          </div>
          <div className="relative">
            <label className="text-sm text-muted-foreground mb-1 block">Cliente (opcional)</label>
            <Input
              value={client}
              onChange={e => { setClient(e.target.value); setShowClientSuggestions(true); }}
              onFocus={() => setShowClientSuggestions(true)}
              onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
              placeholder="Nombre del cliente"
              className="bg-secondary border-border"
            />
            {showClientSuggestions && filteredClients.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                {filteredClients.map(c => (
                  <button
                    key={c}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                    onMouseDown={() => { setClient(c); setShowClientSuggestions(false); }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Notas (opcional)</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones..." className="bg-secondary border-border" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          </div>
        </div>
        <Button onClick={handleAdd} className="gradient-orange text-primary-foreground hover:opacity-90">
          <DollarSign className="w-4 h-4 mr-2" /> Registrar Venta
        </Button>
      </div>

      <div className="glass-card p-4 glow-orange">
        <p className="text-sm text-muted-foreground">Total vendido hoy</p>
        <p className="text-4xl font-bold text-gradient-orange">{totalToday.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">{todayRecords.length} ventas registradas</p>
      </div>

      {todayRecords.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground">Ventas de Hoy</h3>
          {todayRecords.map(record => (
            <div key={record.id} className="glass-card p-3 flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">{record.product_name}</span>
                <span className="text-primary ml-2 font-bold">{record.quantity} unidades</span>
                {record.client && <span className="text-xs text-muted-foreground ml-2">• {record.client}</span>}
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
