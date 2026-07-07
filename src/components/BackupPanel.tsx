import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload, ShieldAlert, DatabaseBackup, AlertTriangle, CheckCircle2, XCircle, Info, Loader2 } from 'lucide-react';
import { exportBackup, importBackup, readBackupFile, validateBackupPayload, type BackupPayload, type RestoreLogEntry, type RestoreResult } from '@/lib/backup';
import { PinConfirmDialog } from '@/components/PinConfirmDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

export function BackupPanel() {
  const [exportPinOpen, setExportPinOpen] = useState(false);
  const [importPinOpen, setImportPinOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<BackupPayload | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const payload = await readBackupFile(f);
      const v = validateBackupPayload(payload);
      if (!v.ok) {
        setResult({ ok: false, totals: { inserted: 0, failed: 0 }, log: v.errors.map(e => ({ scope: 'validation' as const, target: 'payload', level: 'error' as const, message: e })) });
        setLogOpen(true);
        toast.error('El archivo no cumple con la estructura esperada');
        return;
      }
      setPendingPayload(payload);
      setImportPinOpen(true);
    } catch {
      toast.error('No se pudo leer el archivo de respaldo');
    }
  };

  const handleExportConfirmed = async () => {
    setBusy(true);
    try {
      await exportBackup();
      toast.success('Respaldo descargado exitosamente');
    } catch (err: any) {
      toast.error(err?.message || 'Error al generar respaldo');
    } finally { setBusy(false); }
  };

  const handleImportPinOk = async () => {
    // PIN ok → open final critical confirmation
    setConfirmOpen(true);
  };

  const handleRestore = async () => {
    console.log('[BackupPanel] handleRestore triggered', { hasPayload: !!pendingPayload });
    if (!pendingPayload) {
      toast.error('No hay respaldo cargado');
      return;
    }
    setIsRestoring(true);
    setBusy(true);
    try {
      const res = await importBackup(pendingPayload);
      console.log('[BackupPanel] restore result', res);
      setResult(res);
      setConfirmOpen(false);
      setPendingPayload(null);
      setLogOpen(true);
      if (res.ok) toast.success(`Respaldo cargado · ${res.totals.inserted} registros`);
      else toast.error(`Restauración finalizó con ${res.totals.failed} errores · revisa el log`);
    } catch (err: any) {
      console.error('[BackupPanel] restore failed', err);
      toast.error(err?.message || 'Error al cargar respaldo');
      alert('Error al restaurar respaldo: ' + (err?.message || 'desconocido'));
    } finally {
      setIsRestoring(false);
      setBusy(false);
    }
  };

  const reloadNow = () => window.location.reload();

  const levelIcon = (lvl: RestoreLogEntry['level']) =>
    lvl === 'error' ? <XCircle className="w-4 h-4 text-destructive shrink-0" /> :
    lvl === 'warn' ? <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" /> :
    <Info className="w-4 h-4 text-primary shrink-0" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <DatabaseBackup className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Respaldo y Portabilidad de Datos</h3>
          <p className="text-sm text-muted-foreground">
            Exporta e importa el 100% de la información del sistema. Acceso exclusivo del Administrador.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Export */}
        <div className="glass-card p-5 space-y-3 border-primary/30">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            <h4 className="font-bold text-foreground">Hacer Respaldo</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Empaqueta inventario, recetas, historiales (ventas, producción, guías, asistencia),
            trazabilidad y perfiles de usuario en un único archivo
            <code className="mx-1 px-1 rounded bg-secondary text-foreground">Respaldo_GYC_DD_MM_AAAA.json</code>.
          </p>
          <Button onClick={() => setExportPinOpen(true)} disabled={busy} className="gradient-orange text-primary-foreground">
            <Download className="w-4 h-4 mr-2" /> Descargar Respaldo
          </Button>
        </div>

        {/* Import */}
        <div className="glass-card p-5 space-y-3 border-destructive/40">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-destructive" />
            <h4 className="font-bold text-foreground">Cargar Respaldo</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Sustituye <strong>toda</strong> la base de datos actual con la del archivo. Acción irreversible.
          </p>
          <input ref={fileRef} type="file" accept=".json,.gyc,application/json" onChange={onFileSelected} className="hidden" />
          <Button onClick={() => fileRef.current?.click()} disabled={busy} variant="destructive">
            <Upload className="w-4 h-4 mr-2" /> Seleccionar Archivo
          </Button>
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground flex items-start gap-2">
        <ShieldAlert className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
        Ambas operaciones requieren validar nuevamente la clave del Administrador vigente.
      </div>

      {/* PIN gates */}
      <PinConfirmDialog
        open={exportPinOpen}
        onOpenChange={setExportPinOpen}
        title="Confirmar Exportación"
        description="Ingresa tu clave de administrador para descargar el respaldo."
        destructiveLabel="Descargar"
        onConfirm={handleExportConfirmed}
      />
      <PinConfirmDialog
        open={importPinOpen}
        onOpenChange={(o) => { setImportPinOpen(o); if (!o && !confirmOpen) setPendingPayload(null); }}
        title="Confirmar Carga de Respaldo"
        description="Ingresa tu clave de administrador para continuar."
        destructiveLabel="Continuar"
        onConfirm={handleImportPinOk}
      />

      {/* Critical confirmation modal */}
      <Dialog open={confirmOpen} onOpenChange={(o) => { setConfirmOpen(o); if (!o) setPendingPayload(null); }}>
        <DialogContent className="bg-card border-destructive/60 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> ¡ATENCIÓN!
            </DialogTitle>
            <DialogDescription className="text-foreground/90">
              Cargar un respaldo <strong>eliminará los datos actuales</strong> de este equipo
              y los reemplazará por los del archivo. ¿Está seguro?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)} disabled={isRestoring}>Cancelar</Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRestore}
              disabled={isRestoring || !pendingPayload}
            >
              {isRestoring ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Restaurando…</>
              ) : 'Sí, reemplazar todo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore log */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {result?.ok ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-destructive" />}
              Registro de Restauración
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {result ? `${result.totals.inserted} registros importados · ${result.totals.failed} con error` : 'Sin resultados'}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto space-y-1.5 pr-1">
            {result?.log.map((l, i) => (
              <div key={i} className="flex items-start gap-2 text-xs rounded border border-border bg-secondary/40 px-2.5 py-2">
                {levelIcon(l.level)}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground"><span className="font-semibold uppercase text-[10px] tracking-wide text-muted-foreground mr-1.5">{l.scope}·{l.target}</span>{l.message}</p>
                  {l.detail && <p className="text-[10px] text-muted-foreground mt-0.5 font-mono break-words">{l.detail}</p>}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLogOpen(false)}>Cerrar</Button>
            {result?.ok && (
              <Button onClick={reloadNow} className="gradient-orange text-primary-foreground">Recargar sistema</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}