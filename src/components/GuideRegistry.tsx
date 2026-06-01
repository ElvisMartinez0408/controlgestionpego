import { useEffect, useMemo, useState } from 'react';
import { useSales } from '@/hooks/useSales';
import { useRole } from '@/contexts/RoleContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Search, Truck, User, MapPin, Hash, Phone, Package, X, Trash2 } from 'lucide-react';
import { listGuideMetadata, GuideMetadata, deleteGuideMetadata, clearAllGuideMetadata } from '@/lib/guidesDb';
import { PinConfirmDialog } from '@/components/PinConfirmDialog';
import { toast } from 'sonner';

export function GuideRegistry() {
  const { getGuideRecords, removeRecord, removeAllRecords } = useSales();
  const { isAdmin } = useRole();
  const guides = getGuideRecords();
  const [meta, setMeta] = useState<Record<string, GuideMetadata>>({});
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    listGuideMetadata().then(list => {
      const map: Record<string, GuideMetadata> = {};
      list.forEach(g => { map[g.guideNumber] = g; });
      setMeta(map);
    });
  }, [guides.length]);

  const filtered = useMemo(() => {
    if (!query.trim()) return guides;
    const q = query.toLowerCase();
    return guides.filter(g => (g.notes || '').toLowerCase().includes(q));
  }, [guides, query]);

  const detail = selected ? meta[selected] : null;
  const selectedSale = selected ? guides.find(g => g.notes === selected) : null;

  const handleDeleteOne = async (e: React.MouseEvent, guideNumber: string, saleId: string) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar la guía ${guideNumber}?`)) return;
    await removeRecord(saleId);
    await deleteGuideMetadata(guideNumber);
    setMeta(prev => { const c = { ...prev }; delete c[guideNumber]; return c; });
    toast.success(`Guía ${guideNumber} eliminada`);
  };

  const handleBulkDelete = async () => {
    await removeAllRecords();
    await clearAllGuideMetadata();
    setMeta({});
    toast.success('Historial de guías eliminado por completo');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Registro de Guías
          </h2>
          <p className="text-muted-foreground">Toca cualquier guía para ver el detalle logístico completo</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar Nº Guía..." className="pl-9 bg-secondary border-border" />
          </div>
          {isAdmin && guides.length > 0 && (
            <Button size="sm" variant="destructive" onClick={() => setBulkOpen(true)} className="shrink-0">
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar Historial
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          No hay guías registradas. Usa "Carga Inteligente" en Ventas para procesar un PDF.
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-primary">Guía #</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                {isAdmin && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow
                  key={r.id}
                  onClick={() => setSelected(r.notes!)}
                  className="cursor-pointer border-border hover:bg-secondary/50 transition-colors"
                >
                  <TableCell className="font-bold text-primary">{r.notes}</TableCell>
                  <TableCell className="text-muted-foreground">{r.date}</TableCell>
                  <TableCell className="text-foreground">{r.client || '—'}</TableCell>
                  <TableCell className="text-right text-foreground font-semibold">{r.quantity} sacos</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right p-1">
                      <button
                        onClick={(e) => handleDeleteOne(e, r.notes!, r.id)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Eliminar guía"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PinConfirmDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Eliminar Historial Completo de Guías"
        description="Esta acción borrará todas las guías y ventas registradas. Ingresa la clave de administrador para continuar."
        destructiveLabel="Eliminar todo"
        onConfirm={handleBulkDelete}
      />

      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="bg-card border-border w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Guía {selected}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-5 text-sm">
            <Section title="Pedido" icon={<Package className="w-4 h-4" />}>
              <Row label="Producto" value={detail?.productName || selectedSale?.product_name} />
              <Row label="Cantidad" value={`${detail?.quantity ?? selectedSale?.quantity ?? '—'} sacos`} highlight />
              <Row label="Fecha" value={detail?.date || selectedSale?.date} />
            </Section>
            <Section title="Cliente" icon={<User className="w-4 h-4" />}>
              <Row label="Razón Social" value={detail?.client || selectedSale?.client} />
              <Row label="RIF" value={detail?.rif} />
              <Row label="Teléfono" value={detail?.phone} icon={<Phone className="w-3 h-3" />} />
              <Row label="Dirección" value={detail?.address} icon={<MapPin className="w-3 h-3" />} />
            </Section>
            <Section title="Conductor" icon={<User className="w-4 h-4" />}>
              <Row label="Nombre" value={detail?.driverName} />
              <Row label="Cédula" value={detail?.driverId} icon={<Hash className="w-3 h-3" />} />
            </Section>
            <Section title="Vehículo" icon={<Truck className="w-4 h-4" />}>
              <Row label="Marca" value={detail?.vehicleBrand} />
              <Row label="Placa" value={detail?.vehiclePlate} />
            </Section>
            {!detail && (
              <p className="text-xs text-muted-foreground italic">
                Esta guía fue creada manualmente. Procesa el PDF mediante "Carga Inteligente" para obtener metadatos completos.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs uppercase tracking-wider text-primary flex items-center gap-2 font-semibold">
        {icon} {title}
      </h4>
      <div className="glass-card p-3 space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value, icon, highlight }: { label: string; value?: string | number | null; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground text-xs flex items-center gap-1 shrink-0">{icon}{label}</span>
      <span className={`text-right ${highlight ? 'text-primary font-bold' : 'text-foreground'}`}>{value || '—'}</span>
    </div>
  );
}