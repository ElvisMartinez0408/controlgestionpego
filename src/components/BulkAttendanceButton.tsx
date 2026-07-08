import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, LogOut, Loader2, Users } from 'lucide-react';
import { useAttendance } from '@/hooks/useAttendance';
import { toast } from 'sonner';

interface Props { dateStr: string; }

export function BulkAttendanceButton({ dateStr }: Props) {
  const { employees, records, checkIn, checkOut } = useAttendance();
  const [customTime, setCustomTime] = useState('');
  const [busy, setBusy] = useState(false);

  const dayRecords = useMemo(
    () => records.filter(r => r.date === dateStr),
    [records, dateStr]
  );

  // Mode: 'out' when every employee (with any activity) already has check_in and none is missing → next action is Salida.
  const activeEmployees = employees;
  const allCheckedIn = activeEmployees.length > 0 && activeEmployees.every(e => {
    const r = dayRecords.find(r => r.employee_id === e.id);
    return r?.check_in && !r?.check_out && r.status !== 'absent';
  });
  const mode: 'in' | 'out' = allCheckedIn ? 'out' : 'in';
  const defaultTime = mode === 'in' ? '07:30' : '16:30';
  const effectiveTime = customTime || defaultTime;

  const handleBulk = async () => {
    if (activeEmployees.length === 0) { toast.error('No hay empleados'); return; }
    setBusy(true);
    try {
      for (const emp of activeEmployees) {
        const r = dayRecords.find(rec => rec.employee_id === emp.id);
        if (mode === 'in') {
          if (r?.status === 'absent') continue;
          if (!r?.check_in) await checkIn(emp.id, effectiveTime, dateStr);
        } else {
          if (r?.check_in && !r?.check_out) await checkOut(emp.id, effectiveTime, dateStr);
        }
      }
      toast.success('Asistencia registrada correctamente', {
        description: `${activeEmployees.length} empleados · ${mode === 'in' ? 'Entrada' : 'Salida'} ${effectiveTime}`,
      });
      setCustomTime('');
    } catch {
      toast.error('Error registrando asistencia');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-card p-3 flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="w-4 h-4 text-primary" />
        <span className="font-semibold text-foreground">Asistencia Masiva</span>
      </div>
      <div>
        <label className="text-[10px] uppercase text-muted-foreground block mb-1">Ajustar hora</label>
        <Input
          type="time"
          value={customTime}
          onChange={e => setCustomTime(e.target.value)}
          placeholder={defaultTime}
          className="w-28 h-9 bg-secondary border-border text-xs"
        />
      </div>
      <Button
        type="button"
        onClick={handleBulk}
        disabled={busy || employees.length === 0}
        className={mode === 'in'
          ? 'bg-success/20 text-success hover:bg-success/30 border-0'
          : 'gradient-orange text-primary-foreground hover:opacity-90'}
      >
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : mode === 'in' ? <LogIn className="w-4 h-4 mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
        Marcar todos: {mode === 'in' ? 'Entrada' : 'Salida'} ({effectiveTime})
      </Button>
    </div>
  );
}