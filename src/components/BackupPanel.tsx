import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Download, Upload, ShieldAlert, DatabaseBackup, AlertTriangle, CheckCircle2, XCircle, Info, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { exportBackup, importBackup, readBackupFile, validateBackupPayload, type BackupPayload, type RestoreLogEntry, type RestoreResult, type RestoreProgress } from '@/lib/backup';
import { PinConfirmDialog } from '@/components/PinConfirmDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { fullSystemReset } from '@/lib/systemReset';

export function BackupPanel() {
  const [exportPinOpen, setExportPinOpen] = useState(false);
  const [importPinOpen, setImportPinOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<BackupPayload | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [progress, setProgress] = useState<RestoreProgress | null>(null);
  const [progressOpen, setProgressOpen] = useState(false);
  // System reset state
  const [resetPinOpen, setResetPinOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetWord, setResetWord] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pendingPayloadRef = useRef<BackupPayload | null>(null);

  useEffect(() => {
    if (confirmOpen) {
      console.log('[BackupPanel] modal de reemplazo abierto', {
        hasPayloadState: !!pendingPayload,
        hasPayloadRef: !!pendingPayloadRef.current,
        isRestoring,
        buttonDisabled: false,
      });
    }
  }, [confirmOpen, pendingPayload, isRestoring]);

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
      pendingPayloadRef.current = payload;
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
    const restorePayload = pendingPayload ?? pendingPayloadRef.current;
    console.log('[BackupPanel] handleRestore disparado sin bloqueo', {
      hasPayloadState: !!pendingPayload,
      hasPayloadRef: !!pendingPayloadRef.current,
      isRestoring,
    });
    if (!restorePayload) {
      toast.error('No hay respaldo cargado');
      return;
    }
    setIsRestoring(true);
    setBusy(true);
    setProgress({ phase: 'validate', label: 'Iniciando restauración…', percent: 0 });
    setConfirmOpen(false);
    setProgressOpen(true);
    try {
      const res = await importBackup(restorePayload, (p) => setProgress(p));
      console.log('[BackupPanel] restore result', res);
      setResult(res);
      setPendingPayload(null);
      pendingPayloadRef.current = null;
      setProgressOpen(false);
      setLogOpen(true);
      if (res.ok) toast.success(`Respaldo cargado · ${res.totals.inserted} registros`);
      else toast.error(`Restauración finalizó con ${res.totals.failed} errores · revisa el log`);
    } catch (err: any) {
      console.error('[BackupPanel] restore failed', err);
      setProgressOpen(false);
      toast.error(err?.message || 'Error al cargar respaldo');
      alert('Error al restaurar respaldo: ' + (err?.message || 'desconocido'));
    } finally {
      setIsRestoring(false);
      setBusy(false);
    }
  };

  const handleResetPinOk = async () => {
    setResetWord('');
    setResetConfirmOpen(true);
  };

  const handleResetConfirmed = async () => {
    if (resetWord.trim().toUpperCase() !== 'CONFIRMAR') {
      toast.error('Debes escribir CONFIRMAR para continuar');
      return;
    }
    setIsResetting(true);
    try {
      await fullSystemReset();
      toast.success('Sistema restaurado · recetas y empleados conservados');
      setResetConfirmOpen(false);
      setTimeout(() => window.location.reload(), 700);
    } catch (err: any) {
      toast.error(err?.message || 'Error al restaurar el sistema');
    } finally {
      setIsResetting(false);
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

      {/* Reset System */}
      <div className="glass-card p-5 space-y-3 border-destructive/60">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-foreground">Restaurar Sistema desde Cero</h4>
            <p className="text-xs text-muted-foreground">
              Vacía <strong>historiales de ventas, producción, guías, asistencia e inventario</strong>.
              Se conservan: <strong>recetas de fabricación, empleados y usuarios/permisos</strong>.
            </p>
          </div>
        </div>
        <Button variant="destructive" onClick={() => setResetPinOpen(true)} disabled={isResetting}>
          <Trash2 className="w-4 h-4 mr-2" /> Restaurar Sistema
        </Button>
      </div>

      <div className="text-[11px] text-muted-foreground flex items-start gap-2">
        <ShieldAlert className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
        Todas las operaciones requieren validar la clave del Administrador vigente.
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
        onOpenChange={setImportPinOpen}
        title="Confirmar Carga de Respaldo"
        description="Ingresa tu clave de administrador para continuar."
        destructiveLabel="Continuar"
        onConfirm={handleImportPinOk}
      />
      <PinConfirmDialog
        open={resetPinOpen}
        onOpenChange={setResetPinOpen}
        title="Confirmar Restauración del Sistema"
        description="Ingresa tu clave de administrador para continuar con la restauración."
        destructiveLabel="Continuar"
        onConfirm={handleResetPinOk}
      />

      {/* Reset confirmation with typed word */}
      <Dialog open={resetConfirmOpen} onOpenChange={(o) => { setResetConfirmOpen(o); if (!o) setResetWord(''); }}>
        <DialogContent className="bg-card border-destructive/60 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Restauración irreversible
            </DialogTitle>
            <DialogDescription className="text-foreground/90 space-y-2">
              <span className="block">Se eliminarán todos los historiales operativos del sistema.</span>
              <span className="block">Para confirmar escribe <strong className="text-destructive">CONFIRMAR</strong> en el campo siguiente:</span>
            </DialogDescription>
          </DialogHeader>
          <Input
            value={resetWord}
            onChange={(e) => setResetWord(e.target.value)}
            placeholder="CONFIRMAR"
            autoFocus
            className="uppercase tracking-widest text-center font-bold"
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setResetConfirmOpen(false)} disabled={isResetting}>Cancelar</Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isResetting || resetWord.trim().toUpperCase() !== 'CONFIRMAR'}
              onClick={handleResetConfirmed}
            >
              {isResetting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Restaurando…</>) : 'Restaurar todo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Critical confirmation modal */}
      <Dialog open={confirmOpen} onOpenChange={(o) => {
        setConfirmOpen(o);
        if (!o && !isRestoring) {
          setPendingPayload(null);
          pendingPayloadRef.current = null;
        }
      }}>
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
              onClick={() => void handleRestore()}
              className="opacity-100 cursor-pointer"
            >
              {isRestoring ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Restaurando…</>
              ) : 'Sí, reemplazar todo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Live restore progress */}
      <Dialog open={progressOpen} onOpenChange={(o) => { if (!isRestoring) setProgressOpen(o); }}>
        <DialogContent className="bg-card border-primary/40 max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Loader2 className="w-5 h-5 text-primary animate-spin" /> Restaurando respaldo
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {progress?.label || 'Preparando…'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Progress value={progress?.percent ?? 0} className="h-2" />
            <p className="text-xs text-right text-muted-foreground">{progress?.percent ?? 0}%</p>
          </div>
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