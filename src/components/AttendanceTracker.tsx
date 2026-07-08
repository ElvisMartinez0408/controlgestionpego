import { useState } from 'react';
import { useAttendance } from '@/hooks/useAttendance';
import { useRole } from '@/contexts/RoleContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, LogOut, UserX, UserPlus, Trash2, RotateCcw, CalendarIcon, Users as UsersIcon, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { BulkAttendanceButton } from '@/components/BulkAttendanceButton';

export function AttendanceTracker() {
  const { employees, records, loading, addEmployee, removeEmployee, checkIn, checkOut, markAbsent, resetRecord, getTodayRecord } = useAttendance();
  const { canCreate, canDelete } = useRole();
  const isAdmin = canCreate; // create/edit allowed for admin + supervisor
  const [newName, setNewName] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSubForm, setShowSubForm] = useState(false);
  const [subName, setSubName] = useState('');
  const [subFor, setSubFor] = useState('');
  const [manualTimes, setManualTimes] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [chartFilter, setChartFilter] = useState<'week' | 'month' | 'year'>('month');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  const displayDate = format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });

  const getDefaultTime = (empId: string) => {
    const record = getTodayRecord(empId, dateStr);
    if (!record || (!record.check_in && record.status !== 'absent')) return '07:30';
    if (record.check_in && !record.check_out) return '16:30';
    return '';
  };

  const getManualTime = (empId: string) => empId in manualTimes ? manualTimes[empId] : getDefaultTime(empId);
  const setManualTime = (empId: string, val: string) => setManualTimes(prev => ({ ...prev, [empId]: val }));
  const clearManualTime = (empId: string) => setManualTimes(prev => { const n = { ...prev }; delete n[empId]; return n; });

  const handleAdd = () => {
    if (newName.trim() && newPosition.trim()) {
      addEmployee(newName.trim(), newPosition.trim());
      setNewName('');
      setNewPosition('');
      setShowAddForm(false);
    }
  };

  const handleAddSub = () => {
    const target = employees.find(e => e.id === subFor);
    if (subName.trim() && target) {
      addEmployee(subName.trim(), `Suplente de ${target.name}`);
      // Marcar automáticamente la falta del titular en la fecha seleccionada
      markAbsent(target.id, dateStr);
      setSubName('');
      setSubFor('');
      setShowSubForm(false);
    }
  };

  // Compute absences per employee within filter range
  const now = new Date();
  const filterFrom = (() => {
    const d = new Date();
    if (chartFilter === 'week') d.setDate(d.getDate() - 6);
    else if (chartFilter === 'month') d.setDate(1);
    else d.setMonth(0, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const filterTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const absencesData = employees.map(emp => ({
    name: emp.name.split(' ')[0],
    fullName: emp.name,
    faltas: records.filter(r => r.employee_id === emp.id && r.status === 'absent' && r.date >= filterFrom && r.date <= filterTo).length,
  })).sort((a, b) => b.faltas - a.faltas);

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Registro de Asistencia</h2>
          <p className="text-muted-foreground capitalize">{displayDate}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="bg-secondary border-border">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {format(selectedDate, 'dd/MM/yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={selectedDate} onSelect={d => d && setSelectedDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          {isAdmin && (
            <>
              <Button onClick={() => setShowSubForm(!showSubForm)} variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
                <UsersIcon className="w-4 h-4 mr-2" /> Añadir Suplente
              </Button>
              <Button onClick={() => setShowAddForm(!showAddForm)} className="gradient-orange text-primary-foreground hover:opacity-90">
                <UserPlus className="w-4 h-4 mr-2" /> Agregar Empleado
              </Button>
            </>
          )}
        </div>
      </div>

      {isAdmin && showAddForm && (
        <div className="glass-card p-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm text-muted-foreground mb-1 block">Nombre</label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre completo" className="bg-secondary border-border" />
          </div>
          <div className="flex-1">
            <label className="text-sm text-muted-foreground mb-1 block">Puesto</label>
            <Input value={newPosition} onChange={e => setNewPosition(e.target.value)} placeholder="Puesto" className="bg-secondary border-border" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          </div>
          <Button onClick={handleAdd} className="gradient-orange text-primary-foreground">Guardar</Button>
        </div>
      )}

      {isAdmin && showSubForm && (
        <div className="glass-card p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="text-sm text-muted-foreground mb-1 block">Nombre del Suplente</label>
            <Input value={subName} onChange={e => setSubName(e.target.value)} placeholder="Nombre completo" className="bg-secondary border-border" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="text-sm text-muted-foreground mb-1 block">Suplente de</label>
            <select value={subFor} onChange={e => setSubFor(e.target.value)} className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground">
              <option value="">Seleccionar empleado...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <Button onClick={handleAddSub} className="gradient-orange text-primary-foreground">Registrar Suplente</Button>
        </div>
      )}

      {isAdmin && employees.length > 0 && (
        <BulkAttendanceButton dateStr={dateStr} />
      )}

      <div className="grid gap-3">
        {employees.map(emp => {
          const record = getTodayRecord(emp.id, dateStr);
          const isPresent = record?.status === 'present';
          const isAbsent = record?.status === 'absent';
          const hasCheckedOut = !!record?.check_out;
          const timeVal = getManualTime(emp.id);

          return (
            <div
              key={emp.id}
              className={`glass-card p-4 flex items-center justify-between transition-all ${
                isPresent ? 'border-l-4 border-l-success' : isAbsent ? 'border-l-4 border-l-destructive' : 'border-l-4 border-l-border'
              }`}
            >
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{emp.name}</h3>
                <p className="text-sm text-muted-foreground">{emp.position}</p>
                {record && (
                  <div className="flex gap-3 mt-1 text-xs">
                    {record.check_in && <span className="text-success">Entrada: {record.check_in}</span>}
                    {record.check_out && <span className="text-primary">Salida: {record.check_out}</span>}
                    {isAbsent && <span className="text-destructive font-medium">Falta</span>}
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="flex gap-2 items-center">
                  {(!isPresent || (isPresent && !hasCheckedOut)) && !isAbsent && (
                    <Input
                      type="time"
                      value={timeVal}
                      onChange={e => setManualTime(emp.id, e.target.value)}
                      className="w-28 bg-secondary border-border text-xs h-9"
                      placeholder="HH:MM"
                    />
                  )}
                  {!isPresent && !isAbsent && (
                    <>
                      <Button size="sm" onClick={() => { checkIn(emp.id, timeVal || undefined, dateStr); clearManualTime(emp.id); }} className="bg-success/20 text-success hover:bg-success/30 border-0">
                        <LogIn className="w-4 h-4 mr-1" /> Entrada
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => markAbsent(emp.id, dateStr)} className="border-destructive/30 text-destructive hover:bg-destructive/10">
                        <UserX className="w-4 h-4 mr-1" /> Falta
                      </Button>
                    </>
                  )}
                  {isPresent && !hasCheckedOut && (
                    <Button size="sm" onClick={() => { checkOut(emp.id, timeVal || undefined, dateStr); clearManualTime(emp.id); }} className="bg-primary/20 text-primary hover:bg-primary/30 border-0">
                      <LogOut className="w-4 h-4 mr-1" /> Salida
                    </Button>
                  )}
                  {(isPresent || isAbsent) && (
                    <Button size="sm" variant="ghost" onClick={() => resetRecord(emp.id, dateStr)} className="text-muted-foreground hover:text-foreground" title="Resetear">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button size="sm" variant="ghost" onClick={() => removeEmployee(emp.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {employees.length === 0 && (
          <div className="glass-card p-8 text-center text-muted-foreground">
            No hay empleados registrados. Agrega uno para comenzar.
          </div>
        )}
      </div>

      {/* Per-employee absences chart */}
      {employees.length > 0 && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-foreground">Faltas por Empleado</h3>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-lg border border-border bg-secondary p-0.5 text-xs">
                {(['week', 'month', 'year'] as const).map(f => (
                  <button key={f} onClick={() => setChartFilter(f)} className={cn('px-3 py-1 rounded-md font-medium capitalize transition-all', chartFilter === f ? 'gradient-orange text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                    {f === 'week' ? 'Semana' : f === 'month' ? 'Mes' : 'Año'}
                  </button>
                ))}
              </div>
              <div className="inline-flex items-center rounded-lg border border-border bg-secondary p-0.5">
                <button onClick={() => setChartType('bar')} className={cn('p-1.5 rounded-md transition-all', chartType === 'bar' ? 'gradient-orange text-primary-foreground' : 'text-muted-foreground hover:text-foreground')} title="Barras">
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setChartType('line')} className={cn('p-1.5 rounded-md transition-all', chartType === 'line' ? 'gradient-orange text-primary-foreground' : 'text-muted-foreground hover:text-foreground')} title="Líneas">
                  <LineChartIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'bar' ? (
              <BarChart data={absencesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                <Legend />
                <Bar dataKey="faltas" name="Faltas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={absencesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                <Legend />
                <Line type="monotone" dataKey="faltas" name="Faltas" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {absencesData.map(d => (
              <div key={d.fullName} className="rounded-lg border border-border/40 bg-card/60 p-2 text-center">
                <p className="text-[11px] text-muted-foreground truncate" title={d.fullName}>{d.fullName}</p>
                <p className={cn('text-lg font-bold', d.faltas > 0 ? 'text-destructive' : 'text-success')}>{d.faltas}</p>
                <p className="text-[10px] text-muted-foreground">faltas</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
