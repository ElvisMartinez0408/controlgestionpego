import { useMemo } from 'react';
import { useMaterialStock } from '@/hooks/useMaterialStock';
import { useFinishedStock } from '@/hooks/useFinishedStock';

export type AlertSeverity = 'critical' | 'warning';
export type AlertTarget = 'raw-materials' | 'dashboard';

export interface StockAlert {
  id: string;
  label: string;
  detail: string;
  severity: AlertSeverity;
  target: AlertTarget;
}

/** Thresholds in canonical (stored) units */
const RAW_THRESHOLDS: { name: string; min: number; unit: string; display: (v: number) => string }[] = [
  { name: 'Cemento Gris', min: 8000, unit: 'kg', display: v => `${(v / 1000).toFixed(2)} Tn` },
  { name: 'Arena', min: 8000, unit: 'kg', display: v => `${(v / 1000).toFixed(2)} Tn` },
  { name: 'Cemento Blanco', min: 800, unit: 'kg', display: v => `${v.toFixed(0)} kg` },
  { name: 'Celulosa', min: 25, unit: 'kg', display: v => `${v.toFixed(2)} kg` },
  { name: 'Silicón', min: 25, unit: 'kg', display: v => `${v.toFixed(2)} kg` },
  { name: 'Redispersable', min: 25, unit: 'kg', display: v => `${v.toFixed(2)} kg` },
  { name: 'Bobina de Envoplast', min: 25, unit: 'kg', display: v => `${v.toFixed(2)} kg` },
  { name: 'Bolsa Gris', min: 2400, unit: 'und', display: v => `${v.toFixed(0)} und` },
  { name: 'Bolsa Blanco', min: 2400, unit: 'und', display: v => `${v.toFixed(0)} und` },
  { name: 'Bolsa Premium', min: 2400, unit: 'und', display: v => `${v.toFixed(0)} und` },
];

const FINISHED_THRESHOLDS: { name: string; min: number }[] = [
  { name: 'Pego Gris', min: 2160 },
  { name: 'Pego Blanco', min: 600 },
  { name: 'Pego Premium', min: 315 },
];

export function useStockAlerts() {
  const { stocks } = useMaterialStock();
  const { items } = useFinishedStock();

  const alerts = useMemo<StockAlert[]>(() => {
    const out: StockAlert[] = [];
    for (const t of RAW_THRESHOLDS) {
      const s = stocks.find(x => x.material_name === t.name);
      const value = s ? Number(s.stock) : 0;
      if (value < t.min) {
        out.push({
          id: `raw-${t.name}`,
          label: t.name,
          detail: `Stock: ${t.display(value)} (mín ${t.display(t.min)})`,
          severity: value <= t.min / 2 ? 'critical' : 'warning',
          target: 'raw-materials',
        });
      }
    }
    for (const t of FINISHED_THRESHOLDS) {
      const s = items.find(x => x.product_name === t.name);
      const value = s ? Number(s.stock) : 0;
      if (value < t.min) {
        out.push({
          id: `fin-${t.name}`,
          label: t.name,
          detail: `${value.toLocaleString()} sacos (mín ${t.min.toLocaleString()})`,
          severity: value <= t.min / 2 ? 'critical' : 'warning',
          target: 'raw-materials',
        });
      }
    }
    return out;
  }, [stocks, items]);

  return { alerts, hasAlerts: alerts.length > 0 };
}
