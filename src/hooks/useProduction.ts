import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProductionRecord {
  id: string;
  date: string;
  product_name: string;
  quantity: number;
  unit: string;
  notes?: string | null;
  shift_status?: string | null;
}

export function useProduction() {
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    const { data } = await supabase.from('production_records').select('*').order('date', { ascending: false });
    if (data) setRecords(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const addRecord = async (
    productName: string,
    quantity: number,
    unit: string,
    date: string,
    notes?: string,
    shiftStatus: string = 'Normal',
  ) => {
    const { data } = await supabase.from('production_records')
      .insert({ product_name: productName, quantity, unit, date, notes: notes || null, shift_status: shiftStatus } as any)
      .select().single();
    if (data) {
      setRecords(prev => [data as ProductionRecord, ...prev]);
      return data as ProductionRecord;
    }
    return null;
  };

  const removeRecord = async (id: string) => {
    await supabase.from('production_records').delete().eq('id', id);
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const getRecordsByDate = (dateStr: string) => {
    return records.filter(r => r.date === dateStr);
  };

  const getFilteredRecords = (from: Date, to: Date) => {
    const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;
    const toStr = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}-${String(to.getDate()).padStart(2, '0')}`;
    return records.filter(r => r.date >= fromStr && r.date <= toStr);
  };

  const getMonthlyStats = (month: number, year: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dailyStats = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayRecords = records.filter(r => r.date === dateStr);
      const totalQty = dayRecords.reduce((sum, r) => sum + r.quantity, 0);
      // Per-product breakdown
      const pegoGris = dayRecords.filter(r => r.product_name === 'Pego Gris').reduce((s, r) => s + r.quantity, 0);
      const pegoBlanco = dayRecords.filter(r => r.product_name === 'Pego Blanco').reduce((s, r) => s + r.quantity, 0);
      const pegoPremium = dayRecords.filter(r => r.product_name === 'Pego Premium').reduce((s, r) => s + r.quantity, 0);
      dailyStats.push({
        day,
        date: dateStr,
        cantidad: totalQty,
        pegoGris,
        pegoBlanco,
        pegoPremium,
        registros: dayRecords.length,
      });
    }
    return dailyStats;
  };

  const getMonthlyProductBreakdown = (month: number, year: number) => {
    const monthRecords = records.filter(r => {
      const d = new Date(r.date + 'T12:00:00');
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const breakdown: Record<string, number> = {};
    monthRecords.forEach(r => {
      breakdown[r.product_name] = (breakdown[r.product_name] || 0) + r.quantity;
    });
    return Object.entries(breakdown).map(([name, total]) => ({ name, total }));
  };

  const getWeeklyStats = (month: number, year: number) => {
    const monthRecords = records.filter(r => {
      const d = new Date(r.date + 'T12:00:00');
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const weeks: { week: string; cantidad: number; pegoGris: number; pegoBlanco: number; pegoPremium: number }[] = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let w = 0; w < Math.ceil(daysInMonth / 7); w++) {
      const start = w * 7 + 1;
      const end = Math.min(start + 6, daysInMonth);
      const weekRecords = monthRecords.filter(r => {
        const day = new Date(r.date + 'T12:00:00').getDate();
        return day >= start && day <= end;
      });
      weeks.push({
        week: `${start}-${end}`,
        cantidad: weekRecords.reduce((s, r) => s + r.quantity, 0),
        pegoGris: weekRecords.filter(r => r.product_name === 'Pego Gris').reduce((s, r) => s + r.quantity, 0),
        pegoBlanco: weekRecords.filter(r => r.product_name === 'Pego Blanco').reduce((s, r) => s + r.quantity, 0),
        pegoPremium: weekRecords.filter(r => r.product_name === 'Pego Premium').reduce((s, r) => s + r.quantity, 0),
      });
    }
    return weeks;
  };

  return {
    records,
    loading,
    addRecord,
    removeRecord,
    getRecordsByDate,
    getFilteredRecords,
    getMonthlyStats,
    getMonthlyProductBreakdown,
    getWeeklyStats,
  };
}
