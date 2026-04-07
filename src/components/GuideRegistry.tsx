import { useState } from 'react';
import { useSales } from '@/hooks/useSales';
import { useRole } from '@/contexts/RoleContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit2, Check, X, FileText } from 'lucide-react';

export function GuideRegistry() {
  const { getGuideRecords, updateRecord } = useSales();
  const { isAdmin } = useRole();
  const guides = getGuideRecords();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGuide, setEditGuide] = useState('');

  const startEdit = (id: string, currentGuide: string) => {
    setEditingId(id);
    setEditGuide(currentGuide);
  };

  const saveEdit = () => {
    if (editingId) {
      updateRecord(editingId, { notes: editGuide });
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" /> Registro de Guías
        </h2>
        <p className="text-muted-foreground">Números de guía registrados (orden descendente)</p>
      </div>

      {guides.length > 0 ? (
        <div className="space-y-2">
          <div className="glass-card p-3 grid grid-cols-5 gap-2 text-xs font-semibold text-muted-foreground">
            <span>Nº Guía</span>
            <span>Producto</span>
            <span>Cantidad</span>
            <span>Cliente</span>
            <span>Fecha</span>
          </div>
          {guides.map(record => (
            <div key={record.id} className="glass-card p-3 grid grid-cols-5 gap-2 items-center text-sm">
              {editingId === record.id ? (
                <>
                  <Input value={editGuide} onChange={e => setEditGuide(e.target.value)} className="h-8 bg-secondary border-border text-sm" />
                  <span className="text-foreground">{record.product_name}</span>
                  <span className="text-primary font-bold">{record.quantity} sacos</span>
                  <span className="text-muted-foreground">{record.client || '-'}</span>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={saveEdit} className="h-7 bg-success/20 text-success hover:bg-success/30 border-0">
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-primary font-bold">{record.notes}</span>
                  <span className="text-foreground">{record.product_name}</span>
                  <span className="text-foreground">{record.quantity} sacos</span>
                  <span className="text-muted-foreground">{record.client || '-'}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{record.date}</span>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" onClick={() => startEdit(record.id, record.notes || '')} className="h-7 text-muted-foreground hover:text-foreground">
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-8 text-center text-muted-foreground">
          No hay guías registradas. Agrega un "Número de Guía" al registrar ventas.
        </div>
      )}
    </div>
  );
}
