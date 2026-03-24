import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProductionRecord {
  id: string;
  date: string;
  product_name: string;
  quantity: number;
  unit: string;
  notes?: string | null;
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

  const addRecord = async (productName: string, quantity: number, unit: string, date: string, notes?: string) => {
    const { data } = await supabase.from('production_records')
      .insert({ product_name: productName, quantity, unit, date, notes: notes || null })
      .select().single();
    if (data) setRecords(prev => [data, ...prev]);
  };

  const removeRecord = async (id: string) => {
    await supabase.from('production_records').delete().eq('id', id);
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const getRecordsByDate = (dateStr: string) => {
    return records.filter(r => r.date === dateStr);
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
      const totalQty = dayRecords.reduce((sum, r) => sum + r.quantity, 0);
      dailyStats.push({
        day,
        date: dateStr,
        cantidad: totalQty,
        registros: dayRecords.length,
      });
    }

    return dailyStats;
  };

  const getMonthlyProductBreakdown = (month: number, year: number) => {
    const monthRecords = records.filter(r => {
      const d = new Date(r.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    const breakdown: Record<string, number> = {};
    monthRecords.forEach(r => {
      breakdown[r.product_name] = (breakdown[r.product_name] || 0) + r.quantity;
    });

    return Object.entries(breakdown).map(([name, total]) => ({ name, total }));
  };

  return {
    records,
    loading,
    addRecord,
    removeRecord,
    getRecordsByDate,
    getMonthlyStats,
    getMonthlyProductBreakdown,
  };
}
