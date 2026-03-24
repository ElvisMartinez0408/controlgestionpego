import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SaleRecord {
  id: string;
  date: string;
  product_name: string;
  quantity: number;
  client?: string | null;
  notes?: string | null;
}

export function useSales() {
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    const { data } = await supabase.from('sale_records').select('*').order('date', { ascending: false });
    if (data) setRecords(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const addRecord = async (productName: string, quantity: number, client?: string, notes?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('sale_records')
      .insert({ product_name: productName, quantity, date: today, client: client || null, notes: notes || null })
      .select().single();
    if (data) setRecords(prev => [data, ...prev]);
  };

  const removeRecord = async (id: string) => {
    await supabase.from('sale_records').delete().eq('id', id);
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const getTodayRecords = () => {
    const today = new Date().toISOString().split('T')[0];
    return records.filter(r => r.date === today);
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
      const totalCantidad = dayRecords.reduce((sum, r) => sum + r.quantity, 0);
      dailyStats.push({
        day,
        date: dateStr,
        cantidad: totalCantidad,
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
    getTodayRecords,
    getMonthlyStats,
    getMonthlyProductBreakdown,
  };
}
