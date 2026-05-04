import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MaterialStockRow {
  id: string;
  material_name: string;
  stock: number;
  unit: string;
  updated_at: string;
}

export function useMaterialStock() {
  const [stocks, setStocks] = useState<MaterialStockRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data } = await (supabase as any).from('material_stock').select('*');
    if (data) setStocks(data as MaterialStockRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getStock = (name: string) => stocks.find(s => s.material_name === name)?.stock ?? 0;

  /** Adjusts stock by delta (positive = add, negative = subtract). Creates row if missing. */
  const adjustStock = async (name: string, delta: number, unit = 'Kilos') => {
    const current = stocks.find(s => s.material_name === name);
    if (current) {
      const newStock = Number(current.stock) + delta;
      const { data } = await (supabase as any)
        .from('material_stock')
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', current.id)
        .select().single();
      if (data) setStocks(prev => prev.map(s => (s.id === current.id ? (data as MaterialStockRow) : s)));
    } else {
      const { data } = await (supabase as any)
        .from('material_stock')
        .insert({ material_name: name, stock: delta, unit })
        .select().single();
      if (data) setStocks(prev => [...prev, data as MaterialStockRow]);
    }
  };

  /** Apply many deltas (e.g. recipe consumption). */
  const adjustMany = async (deltas: { material: string; qty: number; unit?: string }[]) => {
    for (const d of deltas) {
      await adjustStock(d.material, d.qty, d.unit ?? 'Kilos');
    }
  };

  const setStockAbsolute = async (name: string, value: number) => {
    const current = stocks.find(s => s.material_name === name);
    if (!current) return;
    const { data } = await (supabase as any)
      .from('material_stock')
      .update({ stock: value, updated_at: new Date().toISOString() })
      .eq('id', current.id)
      .select().single();
    if (data) setStocks(prev => prev.map(s => (s.id === current.id ? (data as MaterialStockRow) : s)));
  };

  return { stocks, loading, getStock, adjustStock, adjustMany, setStockAbsolute, refetch: fetchAll };
}
