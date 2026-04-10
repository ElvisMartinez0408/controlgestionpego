import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RawMaterialRecord {
  id: string;
  date: string;
  material_name: string;
  quantity: number;
  unit: string;
  sack_count?: number | null;
  kilos_per_sack?: number | null;
  notes?: string | null;
}

const MATERIALS = [
  'Cemento Gris',
  'Arena',
  'Cemento Blanco',
  'Celulosa',
  'Redispersable',
  'Silicón',
  'Bobina de Envoplast',
] as const;

export type MaterialName = typeof MATERIALS[number];

/** Materials measured in Toneladas */
const TON_MATERIALS: MaterialName[] = ['Cemento Gris', 'Arena'];
/** Materials measured in Kilos (direct) */
const KILO_DIRECT: MaterialName[] = ['Cemento Blanco', 'Bobina de Envoplast'];
/** Materials measured by sacks → auto-calculate Kilos */
const SACK_MATERIALS: MaterialName[] = ['Celulosa', 'Redispersable', 'Silicón'];

export function getUnitForMaterial(name: MaterialName): string {
  if (TON_MATERIALS.includes(name)) return 'Toneladas';
  return 'Kilos';
}

export function isSackMaterial(name: MaterialName): boolean {
  return SACK_MATERIALS.includes(name);
}

export { MATERIALS, TON_MATERIALS, KILO_DIRECT, SACK_MATERIALS };

export function useRawMaterials() {
  const [records, setRecords] = useState<RawMaterialRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    const { data } = await supabase
      .from('raw_materials')
      .select('*')
      .order('date', { ascending: false });
    if (data) setRecords(data as RawMaterialRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const addRecord = async (
    materialName: string,
    quantity: number,
    unit: string,
    date: string,
    sackCount?: number,
    kilosPerSack?: number,
    notes?: string,
  ) => {
    const { data } = await supabase
      .from('raw_materials')
      .insert({
        material_name: materialName,
        quantity,
        unit,
        date,
        sack_count: sackCount ?? null,
        kilos_per_sack: kilosPerSack ?? null,
        notes: notes || null,
      } as any)
      .select()
      .single();
    if (data) setRecords(prev => [data as RawMaterialRecord, ...prev]);
  };

  const removeRecord = async (id: string) => {
    await supabase.from('raw_materials').delete().eq('id', id);
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const getRecordsByDate = (dateStr: string) =>
    records.filter(r => r.date === dateStr);

  return { records, loading, addRecord, removeRecord, getRecordsByDate };
}
