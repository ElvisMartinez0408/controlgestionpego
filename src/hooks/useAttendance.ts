import { useState, useEffect } from 'react';
import { Employee, AttendanceRecord } from '@/types';

const EMPLOYEES_KEY = 'employees';
const ATTENDANCE_KEY = 'attendance';

const defaultEmployees: Employee[] = [
  { id: '1', name: 'Carlos García', position: 'Operador' },
  { id: '2', name: 'María López', position: 'Supervisora' },
  { id: '3', name: 'Juan Martínez', position: 'Técnico' },
  { id: '4', name: 'Ana Rodríguez', position: 'Empacadora' },
];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

export function useAttendance() {
  const [employees, setEmployees] = useState<Employee[]>(() =>
    loadFromStorage(EMPLOYEES_KEY, defaultEmployees)
  );
  const [records, setRecords] = useState<AttendanceRecord[]>(() =>
    loadFromStorage(ATTENDANCE_KEY, [])
  );

  useEffect(() => {
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
  }, [records]);

  const addEmployee = (name: string, position: string) => {
    const newEmployee: Employee = {
      id: Date.now().toString(),
      name,
      position,
    };
    setEmployees(prev => [...prev, newEmployee]);
  };

  const removeEmployee = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    setRecords(prev => prev.filter(r => r.employeeId !== id));
  };

  const checkIn = (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
    const existing = records.find(r => r.employeeId === employeeId && r.date === today);
    
    if (existing) {
      setRecords(prev => prev.map(r =>
        r.id === existing.id ? { ...r, checkIn: now, status: 'present' as const } : r
      ));
    } else {
      setRecords(prev => [...prev, {
        id: Date.now().toString(),
        employeeId,
        date: today,
        checkIn: now,
        status: 'present',
      }]);
    }
  };

  const checkOut = (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
    setRecords(prev => prev.map(r =>
      r.employeeId === employeeId && r.date === today ? { ...r, checkOut: now } : r
    ));
  };

  const markAbsent = (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const existing = records.find(r => r.employeeId === employeeId && r.date === today);
    
    if (existing) {
      setRecords(prev => prev.map(r =>
        r.id === existing.id ? { ...r, status: 'absent' as const, checkIn: undefined, checkOut: undefined } : r
      ));
    } else {
      setRecords(prev => [...prev, {
        id: Date.now().toString(),
        employeeId,
        date: today,
        status: 'absent',
      }]);
    }
  };

  const getTodayRecord = (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return records.find(r => r.employeeId === employeeId && r.date === today);
  };

  const getMonthlyStats = (month: number, year: number) => {
    const monthRecords = records.filter(r => {
      const d = new Date(r.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dailyStats = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayRecords = monthRecords.filter(r => r.date === dateStr);
      dailyStats.push({
        day,
        date: dateStr,
        presentes: dayRecords.filter(r => r.status === 'present').length,
        ausentes: dayRecords.filter(r => r.status === 'absent').length,
        tardanzas: dayRecords.filter(r => r.status === 'late').length,
      });
    }

    return dailyStats;
  };

  return {
    employees,
    records,
    addEmployee,
    removeEmployee,
    checkIn,
    checkOut,
    markAbsent,
    getTodayRecord,
    getMonthlyStats,
  };
}
