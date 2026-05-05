import { useState, useMemo } from 'react';
import { useSales } from '@/hooks/useSales';
import { useRole } from '@/contexts/RoleContext';
import { useFinishedStock } from '@/hooks/useFinishedStock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, Plus, Trash2, Edit2, Check, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const PRODUCT_OPTIONS = ['Pego Gris', 'Pego Blanco', 'Pego Premium'];

export function SalesTracker() {
  const { addRecord, updateRecord, removeRecord, getTodayRecords, records, loading } = useSales();
  const { isAdmin } = useRole();
  const { getStock, adjustStock } = useFinishedStock();
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [client, setClient] = useState('');
  const [guideNumber, setGuideNumber] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ product_name: '', quantity: '', client: '', notes: '' });

  const todayRecords = getTodayRecords();
  const totalToday = todayRecords.reduce((s, r) => s + r.quantity, 0);

  const uniqueClients = useMemo(() => {
    const clients = records.map(r => r.client).filter((c): c is string => !!c && c.trim() !== '');
    return [...new Set(clients)].sort();
  }, [records]);

  const filteredClients = useMemo(() => {
    if (!client.trim()) return uniqueClients.slice(0, 8);
    return uniqueClients.filter(c => c.toLowerCase().includes(client.toLowerCase())).slice(0, 8);
  }, [client, uniqueClients]);

  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const handleAdd = async () => {
    const qty = Number(quantity);
    if (!productName.trim() || qty <= 0) return;
    const available = getStock(productName);
    if (qty > available) {
      toast.error(`Stock insuficiente: solo hay ${available.toLocaleString()} sacos de ${productName}`);
      return;
    }
    await addRecord(productName.trim(), qty, client.trim() || undefined, guideNumber.trim() || undefined);
    await adjustStock(productName.trim(), -qty);
    toast.success(`Venta registrada y ${qty.toLocaleString()} sacos descontados de ${productName}`);
    setProductName('');
    setQuantity('');
    setClient('');
    setGuideNumber('');
  };

  const startEdit = (record: typeof todayRecords[0]) => {
    setEditingId(record.id);
    setEditFields({
      product_name: record.product_name,
      quantity: String(record.quantity),
      client: record.client || '',
      notes: record.notes || '',
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const original = records.find(r => r.id === editingId);
    const newQty = Number(editFields.quantity);
    const newProduct = editFields.product_name;
    if (original) {
      // Reverse old, apply new
      await adjustStock(original.product_name, original.quantity); // refund
      const available = getStock(newProduct) + (newProduct === original.product_name ? original.quantity : 0);
      if (newQty > available) {
        // rollback refund
        await adjustStock(original.product_name, -original.quantity);
        toast.error(`Stock insuficiente: solo hay ${available.toLocaleString()} sacos de ${newProduct}`);
        return;
      }
      await adjustStock(newProduct, -newQty);
    }
    await updateRecord(editingId, {
      product_name: newProduct,
      quantity: newQty,
      client: editFields.client || undefined,
      notes: editFields.notes || undefined,
    });
    setEditingId(null);
  };

  const handleRemove = async (id: string) => {
    const target = records.find(r => r.id === id);
    await removeRecord(id);
    if (target) {
      await adjustStock(target.product_name, target.quantity);
      toast.success(`Venta eliminada · ${target.quantity.toLocaleString()} sacos devueltos al stock`);
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

      {isAdmin && (
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
                {PRODUCT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Cantidad (sacos)</label>
              <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" className="bg-secondary border-border" min="0" />
              {productName && (
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  {Number(quantity) > getStock(productName) && <AlertTriangle className="w-3 h-3 text-destructive" />}
                  Stock disponible: <span className={Number(quantity) > getStock(productName) ? 'text-destructive font-semibold' : 'text-foreground font-semibold'}>{getStock(productName).toLocaleString()} sacos</span>
                </p>
              )}
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
              <label className="text-sm text-muted-foreground mb-1 block">Número de Guía (opcional)</label>
              <Input value={guideNumber} onChange={e => setGuideNumber(e.target.value)} placeholder="Ej: 001234" className="bg-secondary border-border" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
          </div>
          <Button onClick={handleAdd} className="gradient-orange text-primary-foreground hover:opacity-90">
            <DollarSign className="w-4 h-4 mr-2" /> Registrar Venta
          </Button>
        </div>
      )}

      <div className="glass-card p-4 glow-orange">
        <p className="text-sm text-muted-foreground">Total vendido hoy</p>
        <p className="text-4xl font-bold text-gradient-orange">{totalToday.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">sacos · {todayRecords.length} ventas registradas</p>
      </div>

      {todayRecords.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground">Ventas de Hoy</h3>
          {todayRecords.map(record => (
            <div key={record.id} className="glass-card p-3">
              {editingId === record.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <select value={editFields.product_name} onChange={e => setEditFields(f => ({ ...f, product_name: e.target.value }))} className="h-9 rounded-md border border-border bg-secondary px-2 text-sm text-foreground">
                      {PRODUCT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <Input type="number" value={editFields.quantity} onChange={e => setEditFields(f => ({ ...f, quantity: e.target.value }))} className="h-9 bg-secondary border-border" />
                    <Input value={editFields.client} onChange={e => setEditFields(f => ({ ...f, client: e.target.value }))} placeholder="Cliente" className="h-9 bg-secondary border-border" />
                    <Input value={editFields.notes} onChange={e => setEditFields(f => ({ ...f, notes: e.target.value }))} placeholder="Nº Guía" className="h-9 bg-secondary border-border" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} className="bg-success/20 text-success hover:bg-success/30 border-0"><Check className="w-3.5 h-3.5 mr-1" /> Guardar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-3.5 h-3.5 mr-1" /> Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-foreground">{record.product_name}</span>
                    <span className="text-primary ml-2 font-bold">{record.quantity} sacos</span>
                    {record.client && <span className="text-xs text-muted-foreground ml-2">• {record.client}</span>}
                    {record.notes && <span className="text-xs text-primary/70 ml-2">Guía: {record.notes}</span>}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(record)} className="text-muted-foreground hover:text-foreground">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleRemove(record.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
