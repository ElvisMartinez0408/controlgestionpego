import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Layers, Warehouse, Truck, Save, History as HistoryIcon, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePallets } from '@/hooks/usePallets';
import { useRole } from '@/contexts/RoleContext';
import { toast } from 'sonner';

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const PAGE_SIZE = 10;

export function PalletsDashboard({ open, onOpenChange }: Props) {
  const { warehouse, inCirculation, balances, movements, setWarehouseCount, removeMovement } = usePallets();
  const { isAdmin, canDelete } = useRole();
  const [editingWh, setEditingWh] = useState(false);
  const [draft, setDraft] = useState(String(warehouse));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(movements.length / PAGE_SIZE));
  const pageRows = useMemo(() => movements.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [movements, page]);

  const saveWarehouse = () => {
    setWarehouseCount(Number(draft) || 0);
    setEditingWh(false);
    toast.success('Inventario de paletas actualizado');
  };

  const stampOf = (m: typeof movements[number]) => {
    const d = new Date(m.createdAt);
    return `${m.userName} · ${d.toLocaleDateString('es-VE')} ${d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Layers className="w-5 h-5 text-primary" /> Tablero de Paletas (Estibas)
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Préstamo, devolución y saldos por cliente. Persistencia local incluida en el respaldo.
            </DialogDescription>
          </DialogHeader>

          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="glass-card p-4 glow-orange">
              <div className="flex items-center gap-2 text-muted-foreground text-xs"><Warehouse className="w-4 h-4 text-primary" /> Disponibles en Almacén</div>
              {editingWh && isAdmin ? (
                <div className="flex gap-1 mt-1">
                  <Input type="number" min={0} value={draft} onChange={e => setDraft(e.target.value)} className="h-9 bg-secondary border-border" />
                  <Button size="sm" onClick={saveWarehouse} className="gradient-orange text-primary-foreground"><Save className="w-3.5 h-3.5" /></Button>
                </div>
              ) : (
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-gradient-orange">{warehouse.toLocaleString()}</p>
                  {isAdmin && (
                    <Button size="sm" variant="ghost" onClick={() => { setDraft(String(warehouse)); setEditingWh(true); }} className="text-xs text-muted-foreground">Editar</Button>
                  )}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">paletas físicas</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs"><Truck className="w-4 h-4 text-primary" /> En Circulación</div>
              <p className="text-3xl font-bold text-foreground">{inCirculation.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">paletas en manos de clientes</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs"><Layers className="w-4 h-4 text-primary" /> Movimientos</div>
              <p className="text-3xl font-bold text-foreground">{movements.length.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">total registrados</p>
            </div>
          </div>

          {/* Balances per client */}
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">Saldos por Cliente</h3>
              <Button size="sm" variant="outline" onClick={() => { setPage(1); setHistoryOpen(true); }} className="text-xs">
                <HistoryIcon className="w-3.5 h-3.5 mr-1" /> Historial
              </Button>
            </div>
            {balances.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Sin movimientos de paletas todavía.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Cliente / Ferretería</TableHead>
                    <TableHead className="text-right text-primary">Entregadas (+)</TableHead>
                    <TableHead className="text-right text-success">Recibidas (-)</TableHead>
                    <TableHead className="text-right">Deuda Actual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map(b => (
                    <TableRow key={b.client} className="border-border">
                      <TableCell className="font-medium text-foreground">{b.client}</TableCell>
                      <TableCell className="text-right text-primary font-semibold">{b.delivered.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-success font-semibold">{b.received.toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-bold ${b.balance > 0 ? 'text-destructive' : b.balance < 0 ? 'text-success' : 'text-muted-foreground'}`}>
                        {b.balance.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <HistoryIcon className="w-5 h-5 text-primary" /> Historial de Paletas
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Registro completo de movimientos con trazabilidad de autor.
            </DialogDescription>
          </DialogHeader>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sin movimientos registrados.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Entreg.</TableHead>
                    <TableHead className="text-right">Recib.</TableHead>
                    <TableHead>Registrado por</TableHead>
                    {canDelete && <TableHead className="text-right">Acción</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map(m => (
                    <TableRow key={m.id} className="border-border">
                      <TableCell className="text-xs text-muted-foreground">{m.date}</TableCell>
                      <TableCell className="text-foreground font-medium">{m.client}</TableCell>
                      <TableCell className="text-right text-primary font-semibold">{m.delivered}</TableCell>
                      <TableCell className="text-right text-success font-semibold">{m.received}</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">{stampOf(m)}</TableCell>
                      {canDelete && (
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => { removeMovement(m.id); toast.success('Movimiento eliminado'); }} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground">
                <span>Página {page} de {totalPages} · {movements.length} movimientos</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}