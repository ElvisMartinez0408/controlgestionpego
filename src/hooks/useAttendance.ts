import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Employee {
  id: string;
  name: string;
  position: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in?: string | null;
  check_out?: string | null;
  status: string;
}

export function useAttendance() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase.from('employees').select('*').order('name');
    if (data) setEmployees(data);
  }, []);

  const fetchRecords = useCallback(async () => {
    const { data } = await supabase.from('attendance_records').select('*').order('date', { ascending: false });
    if (data) setRecords(data);
  }, []);

  useEffect(() => {
    Promise.all([fetchEmployees(), fetchRecords()]).then(() => setLoading(false));
  }, [fetchEmployees, fetchRecords]);

  const addEmployee = async (name: string, position: string) => {
    const { data } = await supabase.from('employees').insert({ name, position }).select().single();
    if (data) setEmployees(prev => [...prev, data]);
  };

  const removeEmployee = async (id: string) => {
    await supabase.from('employees').delete().eq('id', id);
    setEmployees(prev => prev.filter(e => e.id !== id));
    setRecords(prev => prev.filter(r => r.employee_id !== id));
  };

  const checkIn = async (employeeId: string, manualTime?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const time = manualTime || new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
    const existing = records.find(r => r.employee_id === employeeId && r.date === today);

    if (existing) {
      const { data } = await supabase.from('attendance_records')
        .update({ check_in: time, check_out: null, status: 'present' })
        .eq('id', existing.id).select().single();
      if (data) setRecords(prev => prev.map(r => r.id === existing.id ? data : r));
    } else {
      const { data } = await supabase.from('attendance_records')
        .insert({ employee_id: employeeId, date: today, check_in: time, status: 'present' })
        .select().single();
      if (data) setRecords(prev => [...prev, data]);
    }
  };

  const checkOut = async (employeeId: string, manualTime?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const time = manualTime || new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
    const existing = records.find(r => r.employee_id === employeeId && r.date === today);
    if (existing) {
      const { data } = await supabase.from('attendance_records')
        .update({ check_out: time })
        .eq('id', existing.id).select().single();
      if (data) setRecords(prev => prev.map(r => r.id === existing.id ? data : r));
    }
  };

  const markAbsent = async (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const existing = records.find(r => r.employee_id === employeeId && r.date === today);

    if (existing) {
      const { data } = await supabase.from('attendance_records')
        .update({ status: 'absent', check_in: null, check_out: null })
        .eq('id', existing.id).select().single();
      if (data) setRecords(prev => prev.map(r => r.id === existing.id ? data : r));
    } else {
      const { data } = await supabase.from('attendance_records')
        .insert({ employee_id: employeeId, date: today, status: 'absent' })
        .select().single();
      if (data) setRecords(prev => [...prev, data]);
    }
  };

  const resetRecord = async (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const existing = records.find(r => r.employee_id === employeeId && r.date === today);
    if (existing) {
      await supabase.from('attendance_records').delete().eq('id', existing.id);
      setRecords(prev => prev.filter(r => r.id !== existing.id));
    }
  };

  const getTodayRecord = (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return records.find(r => r.employee_id === employeeId && r.date === today);
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
    loading,
    addEmployee,
    removeEmployee,
    checkIn,
    checkOut,
    markAbsent,
    resetRecord,
    getTodayRecord,
    getMonthlyStats,
  };
}
