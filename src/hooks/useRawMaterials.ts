import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Convert any incoming entry to canonical base unit (Kilos for weights, Unidades for bags). */
function toBaseUnit(materialName: string, quantity: number, unit: string): { qty: number; unit: string } {
  const u = unit.toLowerCase();
  if (u.startsWith('tonelada') || u === 'tn' || u === 't') return { qty: quantity * 1000, unit: 'Kilos' };
  if (u === 'unidades' || u === 'unidad' || u === 'und') return { qty: quantity, unit: 'Unidades' };
  return { qty: quantity, unit: 'Kilos' };
}

async function adjustMaterialStock(materialName: string, delta: number, unit: string) {
  const { data: current } = await (supabase as any)
    .from('material_stock')
    .select('*')
    .eq('material_name', materialName)
    .maybeSingle();
  if (current) {
    await (supabase as any)
      .from('material_stock')
      .update({ stock: Number(current.stock) + delta, updated_at: new Date().toISOString() })
      .eq('id', current.id);
  } else {
    await (supabase as any)
      .from('material_stock')
      .insert({ material_name: materialName, stock: delta, unit });
  }
}

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

/** Bag types tracked separately as packaging supply */
export const BAG_TYPES = ['Bolsa Gris', 'Bolsa Blanco', 'Bolsa Premium'] as const;
export type BagType = typeof BAG_TYPES[number];

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
    if (data) {
      setRecords(prev => [data as RawMaterialRecord, ...prev]);
      // Sum to centralized stock in canonical units
      const { qty, unit: baseUnit } = toBaseUnit(materialName, quantity, unit);
      await adjustMaterialStock(materialName, qty, baseUnit);
    }
  };

  const removeRecord = async (id: string) => {
    const target = records.find(r => r.id === id);
    await supabase.from('raw_materials').delete().eq('id', id);
    setRecords(prev => prev.filter(r => r.id !== id));
    // Reverse the stock addition
    if (target) {
      const { qty, unit: baseUnit } = toBaseUnit(target.material_name, target.quantity, target.unit);
      await adjustMaterialStock(target.material_name, -qty, baseUnit);
    }
  };

  const getRecordsByDate = (dateStr: string) =>
    records.filter(r => r.date === dateStr);

  return { records, loading, addRecord, removeRecord, getRecordsByDate };
}
