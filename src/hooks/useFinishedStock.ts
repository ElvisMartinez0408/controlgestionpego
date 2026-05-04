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

  const updateStock = async (productName: string, stock: number) => {
    const { data } = await (supabase as any)
      .from('finished_product_stock')
      .update({ stock, updated_at: new Date().toISOString() })
      .eq('product_name', productName)
      .select()
      .single();
    if (data) setItems(prev => prev.map(i => (i.product_name === productName ? (data as FinishedStockRecord) : i)));
  };

  const getStock = (productName: string) =>
    items.find(i => i.product_name === productName)?.stock ?? 0;

  return { items, loading, updateStock, getStock };
}
