import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CustomSupply {
  id: string;
  name: string;
  unit: string;
  alert_threshold: number;
  current_quantity: number;
  created_at: string;
  updated_at: string;
}

export function useCustomSupplies() {
  const [supplies, setSupplies] = useState<CustomSupply[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('custom_supplies')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setSupplies(data as CustomSupply[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addSupply = async (name: string, unit: string, alertThreshold: number, currentQuantity: number) => {
    const { data } = await (supabase as any)
      .from('custom_supplies')
      .insert({ name, unit, alert_threshold: alertThreshold, current_quantity: currentQuantity })
      .select()
      .single();
    if (data) setSupplies(prev => [data as CustomSupply, ...prev]);
  };

  const updateSupply = async (id: string, patch: Partial<Pick<CustomSupply, 'current_quantity' | 'alert_threshold' | 'name' | 'unit'>>) => {
    const { data } = await (supabase as any)
      .from('custom_supplies')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (data) setSupplies(prev => prev.map(s => (s.id === id ? (data as CustomSupply) : s)));
  };

  const removeSupply = async (id: string) => {
    await (supabase as any).from('custom_supplies').delete().eq('id', id);
    setSupplies(prev => prev.filter(s => s.id !== id));
  };

  return { supplies, loading, addSupply, updateSupply, removeSupply };
}
