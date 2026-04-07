import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SaleRecord {
  id: string;
  date: string;
  product_name: string;
  quantity: number;
  client?: string | null;
  notes?: string | null; // now used as "Número de Guía"
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

  const updateRecord = async (id: string, updates: { product_name?: string; quantity?: number; client?: string; notes?: string }) => {
    const { data } = await supabase.from('sale_records')
      .update(updates)
      .eq('id', id).select().single();
    if (data) setRecords(prev => prev.map(r => r.id === id ? data : r));
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
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dailyStats = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayRecords = records.filter(r => r.date === dateStr);
      dailyStats.push({
        day,
        date: dateStr,
        cantidad: dayRecords.reduce((sum, r) => sum + r.quantity, 0),
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

  const getMonthlyClientBreakdown = (month: number, year: number) => {
    const monthRecords = records.filter(r => {
      const d = new Date(r.date + 'T12:00:00');
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const breakdown: Record<string, number> = {};
    monthRecords.forEach(r => {
      const name = r.client || 'Sin cliente';
      breakdown[name] = (breakdown[name] || 0) + r.quantity;
    });
    return Object.entries(breakdown).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  };

  const getWeeklyStats = (month: number, year: number) => {
    const monthRecords = records.filter(r => {
      const d = new Date(r.date + 'T12:00:00');
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const weeks: { week: string; cantidad: number }[] = [];
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
      });
    }
    return weeks;
  };

  const getGuideRecords = () => {
    return records
      .filter(r => r.notes && r.notes.trim() !== '')
      .sort((a, b) => {
        // Sort by guide number descending
        const numA = parseInt(a.notes || '0');
        const numB = parseInt(b.notes || '0');
        if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
        return (b.notes || '').localeCompare(a.notes || '');
      });
  };

  return {
    records,
    loading,
    addRecord,
    updateRecord,
    removeRecord,
    getTodayRecords,
    getMonthlyStats,
    getMonthlyProductBreakdown,
    getMonthlyClientBreakdown,
    getWeeklyStats,
    getGuideRecords,
  };
}
