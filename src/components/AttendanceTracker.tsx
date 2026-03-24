import { useState } from 'react';
import { useAttendance } from '@/hooks/useAttendance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, LogOut, UserX, UserPlus, Trash2, RotateCcw } from 'lucide-react';

export function AttendanceTracker() {
  const { employees, loading, addEmployee, removeEmployee, checkIn, checkOut, markAbsent, resetRecord, getTodayRecord } = useAttendance();
  const [newName, setNewName] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdd = () => {
    if (newName.trim() && newPosition.trim()) {
      addEmployee(newName.trim(), newPosition.trim());
      setNewName('');
      setNewPosition('');
      setShowAddForm(false);
    }
  };

  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Asistencia del Día</h2>
          <p className="text-muted-foreground capitalize">{today}</p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="gradient-orange text-primary-foreground hover:opacity-90"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Agregar Empleado
        </Button>
      </div>

      {showAddForm && (
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

      <div className="grid gap-3">
        {employees.map(emp => {
          const record = getTodayRecord(emp.id);
          const isPresent = record?.status === 'present';
          const isAbsent = record?.status === 'absent';
          const hasCheckedOut = !!record?.check_out;

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

              <div className="flex gap-2">
                {!isPresent && !isAbsent && (
                  <>
                    <Button size="sm" onClick={() => checkIn(emp.id)} className="bg-success/20 text-success hover:bg-success/30 border-0">
                      <LogIn className="w-4 h-4 mr-1" /> Entrada
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => markAbsent(emp.id)} className="border-destructive/30 text-destructive hover:bg-destructive/10">
                      <UserX className="w-4 h-4 mr-1" /> Falta
                    </Button>
                  </>
                )}
                {isPresent && !hasCheckedOut && (
                  <Button size="sm" onClick={() => checkOut(emp.id)} className="bg-primary/20 text-primary hover:bg-primary/30 border-0">
                    <LogOut className="w-4 h-4 mr-1" /> Salida
                  </Button>
                )}
                {(isPresent || isAbsent) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => resetRecord(emp.id)}
                    className="text-muted-foreground hover:text-foreground"
                    title="Resetear"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => removeEmployee(emp.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}

        {employees.length === 0 && (
          <div className="glass-card p-8 text-center text-muted-foreground">
            No hay empleados registrados. Agrega uno para comenzar.
          </div>
        )}
      </div>
    </div>
  );
}
