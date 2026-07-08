import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Layers, Loader2, Trash2, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { extractGuideFromPdf, ExtractedGuide } from '@/lib/pdfExtractor';
import { saveGuideMetadata } from '@/lib/guidesDb';
import { useSales } from '@/hooks/useSales';
import { useFinishedStock } from '@/hooks/useFinishedStock';

const PRODUCT_OPTIONS = ['Pego Gris', 'Pego Blanco', 'Pego Premium'];

interface QueueItem {
  id: string;
  fileName: string;
  selected: boolean;
  guideNumber: string;
  client: string;
  productName: string;
  quantity: string;
  date: string;
  raw: ExtractedGuide | null;
  error?: string;
}

function validate(item: QueueItem): string | undefined {
  if (!item.guideNumber.trim()) return 'Falta N° de guía';
  if (!item.productName) return 'Falta producto';
  const q = Number(item.quantity);
  if (!q || q <= 0) return 'Cantidad inválida';
  if (!item.date) return 'Falta fecha';
  return undefined;
}

export function BatchSmartUploadButton() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<QueueItem[]>([]);
  const { addRecord } = useSales();
  const { adjustStock, getStock } = useFinishedStock();

  const handlePick = () => fileRef.current?.click();

  const handleFiles = async (files: FileList) => {
    setBusy(true);
    setOpen(true);
    const newItems: QueueItem[] = [];
    for (const f of Array.from(files)) {
      try {
        const e = await extractGuideFromPdf(f);
        newItems.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          fileName: f.name,
          selected: true,
          guideNumber: e.guideNumber || '',
          client: e.client || '',
          productName: e.productName || '',
          quantity: e.quantity ? String(e.quantity) : '',
          date: e.date || new Date().toISOString().slice(0, 10),
          raw: e,
        });
      } catch (err) {
        newItems.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          fileName: f.name,
          selected: false,
          guideNumber: '',
          client: '',
          productName: '',
          quantity: '',
          date: '',
          raw: null,
          error: 'Error al procesar PDF — requiere revisión manual',
        });
      }
    }
    setItems(prev => [...prev, ...newItems]);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
    toast.success(`${newItems.length} guía(s) procesada(s)`);
  };

  const updateItem = (id: string, patch: Partial<QueueItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const toggleAll = (val: boolean) => setItems(prev => prev.map(i => ({ ...i, selected: val })));

  const handleSaveAll = async () => {
    const selected = items.filter(i => i.selected);
    if (selected.length === 0) { toast.error('Selecciona al menos una guía'); return; }
    const invalid = selected.filter(i => validate(i));
    if (invalid.length > 0) {
      toast.error(`${invalid.length} guía(s) con errores. Corrige antes de guardar.`);
      return;
    }
    setSaving(true);
    let ok = 0, fail = 0;
    for (const it of selected) {
      try {
        const qty = Number(it.quantity);
        const stock = getStock(it.productName);
        if (qty > stock) { fail++; updateItem(it.id, { error: `Stock insuficiente (${stock})` }); continue; }
        await addRecord(it.productName, qty, it.client || undefined, it.guideNumber);
        await adjustStock(it.productName, -qty);
        if (it.raw) {
          await saveGuideMetadata({
            ...it.raw,
            guideNumber: it.guideNumber,
            client: it.client,
            productName: it.productName,
            quantity: qty,
            date: it.date,
            createdAt: Date.now(),
          });
        }
        ok++;
      } catch (e) {
        fail++;
      }
    }
    setSaving(false);
    toast.success(`Guardadas: ${ok}` + (fail ? ` · Errores: ${fail}` : ''));
    if (fail === 0) {
      setItems([]);
      setOpen(false);
    } else {
      setItems(prev => prev.filter(i => !selected.find(s => s.id === i.id) || i.error));
    }
  };

  const allSelected = items.length > 0 && items.every(i => i.selected);

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); }}
      />
      <Button onClick={handlePick} disabled={busy} variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Layers className="w-4 h-4 mr-2" />}
        Carga Múltiple
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Layers className="w-5 h-5 text-primary" /> Procesamiento Masivo de Guías
              <span className="text-xs font-normal text-muted-foreground ml-2">({items.filter(i => i.selected).length}/{items.length} seleccionadas)</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
            <div className="flex items-center gap-2 text-xs">
              <Checkbox checked={allSelected} onCheckedChange={v => toggleAll(!!v)} />
              <span className="text-muted-foreground">Seleccionar todas</span>
            </div>
            <Button size="sm" variant="outline" onClick={handlePick} disabled={busy}>
              + Añadir más PDFs
            </Button>
          </div>

          <div className="overflow-y-auto flex-1 -mx-2 px-2">
            {items.length === 0 && !busy && (
              <p className="text-center text-muted-foreground text-sm py-8">Arrastra o selecciona varios PDFs de guías para comenzar.</p>
            )}
            {busy && <div className="flex items-center justify-center py-6 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Analizando...</div>}
            <div className="space-y-2">
              {items.map(it => {
                const err = it.error || validate(it);
                const bad = !!err;
                return (
                  <div key={it.id} className={`rounded-lg border p-3 ${bad ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-secondary/30'}`}>
                    <div className="flex items-start gap-2 mb-2">
                      <Checkbox checked={it.selected} onCheckedChange={v => updateItem(it.id, { selected: !!v })} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{it.fileName}</p>
                        {bad && (
                          <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" /> {err}
                          </p>
                        )}
                      </div>
                      <button onClick={() => removeItem(it.id)} className="text-muted-foreground hover:text-destructive p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <div>
                        <label className="text-[10px] uppercase text-muted-foreground">N° Guía</label>
                        <Input value={it.guideNumber} onChange={e => updateItem(it.id, { guideNumber: e.target.value, error: undefined })} className="h-8 text-xs bg-card border-border" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-muted-foreground">Fecha</label>
                        <Input type="date" value={it.date} onChange={e => updateItem(it.id, { date: e.target.value, error: undefined })} className="h-8 text-xs bg-card border-border" />
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <label className="text-[10px] uppercase text-muted-foreground">Cliente</label>
                        <Input value={it.client} onChange={e => updateItem(it.id, { client: e.target.value, error: undefined })} className="h-8 text-xs bg-card border-border" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-muted-foreground">Producto</label>
                        <select value={it.productName} onChange={e => updateItem(it.id, { productName: e.target.value, error: undefined })} className="w-full h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground">
                          <option value="">—</option>
                          {PRODUCT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-muted-foreground">Cantidad</label>
                        <Input type="number" value={it.quantity} onChange={e => updateItem(it.id, { quantity: e.target.value, error: undefined })} className="h-8 text-xs bg-card border-border" min="0" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-3">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cerrar</Button>
            <Button onClick={handleSaveAll} disabled={saving || items.length === 0} className="gradient-orange text-primary-foreground">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar todas las seleccionadas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}