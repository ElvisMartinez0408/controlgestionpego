import { useEffect, useMemo, useState } from 'react';
import { useSales } from '@/hooks/useSales';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Search, Truck, User, MapPin, Hash, Phone, Package } from 'lucide-react';
import { listGuideMetadata, GuideMetadata } from '@/lib/guidesDb';

export function GuideRegistry() {
  const { getGuideRecords } = useSales();
  const guides = getGuideRecords();
  const [meta, setMeta] = useState<Record<string, GuideMetadata>>({});
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Registro de Guías
          </h2>
          <p className="text-muted-foreground">Toca cualquier guía para ver el detalle logístico completo</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar Nº Guía..." className="pl-9 bg-secondary border-border" />
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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