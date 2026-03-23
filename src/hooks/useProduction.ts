import { useState, useEffect } from 'react';
import { ProductionRecord } from '@/types';

const PRODUCTION_KEY = 'production';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

export function useProduction() {
  const [records, setRecords] = useState<ProductionRecord[]>(() =>
    loadFromStorage(PRODUCTION_KEY, [])
  );

  useEffect(() => {
    localStorage.setItem(PRODUCTION_KEY, JSON.stringify(records));
  }, [records]);

  const addRecord = (productName: string, quantity: number, unit: string, notes?: string) => {
    const today = new Date().toISOString().split('T')[0];
    setRecords(prev => [...prev, {
      id: Date.now().toString(),
      date: today,
      productName,
      quantity,
      unit,
      notes,
    }]);
  };

  const removeRecord = (id: string) => {
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
      breakdown[r.productName] = (breakdown[r.productName] || 0) + r.quantity;
    });

    return Object.entries(breakdown).map(([name, total]) => ({ name, total }));
  };

  return {
    records,
    addRecord,
    removeRecord,
    getTodayRecords,
    getMonthlyStats,
    getMonthlyProductBreakdown,
  };
}
