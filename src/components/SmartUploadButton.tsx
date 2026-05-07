import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUp, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { extractGuideFromPdf, ExtractedGuide } from '@/lib/pdfExtractor';
import { saveGuideMetadata } from '@/lib/guidesDb';
import { useSales } from '@/hooks/useSales';
import { useFinishedStock } from '@/hooks/useFinishedStock';

const PRODUCT_OPTIONS = ['Pego Gris', 'Pego Blanco', 'Pego Premium'];

export function SmartUploadButton() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<ExtractedGuide | null>(null);
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const { addRecord } = useSales();
  const { adjustStock, getStock } = useFinishedStock();

  const handlePick = () => fileRef.current?.click();

  const handleFile = async (f: File) => {
    setBusy(true);
    try {
      const extracted = await extractGuideFromPdf(f);
      if (!extracted.guideNumber) {
        toast.error('No se pudo detectar el N° de Guía en el PDF');
      }
      setData(extracted);
      setProductName(extracted.productName || '');
      setQuantity(extracted.quantity ? String(extracted.quantity) : '');
      setOpen(true);
    } catch (e) {
      console.error(e);
      toast.error('Error al procesar el PDF');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleConfirm = async () => {
    if (!data) return;
    const qty = Number(quantity);
    if (!productName || qty <= 0) {
      toast.error('Completa producto y cantidad');
      return;
    }
    const available = getStock(productName);
    if (qty > available) {
      toast.error(`Stock insuficiente: ${available.toLocaleString()} sacos disponibles`);
      return;
    }
    await addRecord(productName, qty, data.client || undefined, data.guideNumber || undefined);
    await adjustStock(productName, -qty);
    await saveGuideMetadata({
      guideNumber: data.guideNumber,
      client: data.client,
      rif: data.rif,
      address: data.address,
      phone: data.phone,
      product: data.product,
      productName,
      quantity: qty,
      date: data.date,
      driverName: data.driverName,
      driverId: data.driverId,
      vehicleBrand: data.vehicleBrand,
      vehiclePlate: data.vehiclePlate,
      rawText: data.rawText,
      createdAt: Date.now(),
    });
    toast.success(`Venta registrada: Guía ${data.guideNumber} · ${qty} sacos`);
    setOpen(false);
    setData(null);
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <Button onClick={handlePick} disabled={busy} className="gradient-orange text-primary-foreground hover:opacity-90 shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
        Carga Inteligente
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <FileUp className="w-5 h-5 text-primary" /> Confirmar Venta desde PDF
            </DialogTitle>
          </DialogHeader>
          {data && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground text-xs">N° Guía</Label>
                  <div className="text-primary font-bold">{data.guideNumber || '—'}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Fecha</Label>
                  <div className="text-foreground">{data.date || '—'}</div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Cliente</Label>
                <div className="text-foreground">{data.client || '—'}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Tipo de Pego</Label>
                  <select value={productName} onChange={e => setProductName(e.target.value)} className="w-full h-10 mt-1 rounded-md border border-border bg-secondary px-3 text-sm text-foreground">
                    <option value="">Seleccionar...</option>
                    {PRODUCT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {data.product && <p className="text-[11px] text-muted-foreground mt-1">PDF: {data.product}</p>}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Cantidad (sacos)</Label>
                  <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="mt-1 bg-secondary border-border" />
                  {productName && <p className="text-[11px] text-muted-foreground mt-1">Stock: {getStock(productName).toLocaleString()}</p>}
                </div>
              </div>
              <div className="border-t border-border pt-3 space-y-1 text-xs text-muted-foreground">
                <div><span className="text-foreground/70">Chofer:</span> {data.driverName || '—'} {data.driverId && `· ${data.driverId}`}</div>
                <div><span className="text-foreground/70">Vehículo:</span> {data.vehicleBrand || '—'} {data.vehiclePlate && `· Placa ${data.vehiclePlate}`}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirm} className="gradient-orange text-primary-foreground">Guardar Venta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}