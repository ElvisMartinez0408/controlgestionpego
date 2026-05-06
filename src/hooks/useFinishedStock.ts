import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FinishedStockRecord {
  id: string;
  product_name: string;
  stock: number;
  updated_at: string;
}

export const FINISHED_PRODUCTS = ['Pego Gris', 'Pego Blanco', 'Pego Premium'] as const;
export type FinishedProductName = typeof FINISHED_PRODUCTS[number];

export function useFinishedStock() {
  const [items, setItems] = useState<FinishedStockRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data } = await (supabase as any).from('finished_product_stock').select('*');
    if (data) setItems(data as FinishedStockRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const channel = (supabase as any)
      .channel(`finished_product_stock_changes_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finished_product_stock' }, () => {
        fetchAll();
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [fetchAll]);

  const updateStock = async (productName: string, stock: number) => {
    const { data } = await (supabase as any)
      .from('finished_product_stock')
      .update({ stock, updated_at: new Date().toISOString() })
      .eq('product_name', productName)
      .select()
      .single();
    if (data) setItems(prev => prev.map(i => (i.product_name === productName ? (data as FinishedStockRecord) : i)));
  };

  /** Adjust stock by a delta (positive adds, negative subtracts). Never goes below 0. */
  const adjustStock = async (productName: string, delta: number) => {
    const current = items.find(i => i.product_name === productName);
    const base = current ? Number(current.stock) : 0;
    const next = Math.max(0, base + delta);
    if (current) {
      await updateStock(productName, next);
    } else {
      const { data } = await (supabase as any)
        .from('finished_product_stock')
        .insert({ product_name: productName, stock: next })
        .select().single();
      if (data) setItems(prev => [...prev, data as FinishedStockRecord]);
    }
  };

  const getStock = (productName: string) =>
    items.find(i => i.product_name === productName)?.stock ?? 0;

  return { items, loading, updateStock, adjustStock, getStock };
}
