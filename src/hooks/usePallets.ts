import { useEffect, useState, useCallback } from 'react';
import {
  getPalletsState,
  getClientBalances,
  totalsInCirculation,
  setWarehouseCount,
  addMovement,
  removeMovement,
  clearAllMovements,
  PALLETS_EVENT,
  type PalletsState,
  type ClientBalance,
} from '@/lib/palletsDb';

export function usePallets() {
  const [state, setState] = useState<PalletsState>(() => getPalletsState());
  const refresh = useCallback(() => setState(getPalletsState()), []);

  useEffect(() => {
    const h = () => refresh();
    window.addEventListener(PALLETS_EVENT, h);
    const storage = (e: StorageEvent) => { if (e.key === 'gyc_pallets_v1' || e.key === null) refresh(); };
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener(PALLETS_EVENT, h);
      window.removeEventListener('storage', storage);
    };
  }, [refresh]);

  const balances: ClientBalance[] = getClientBalances();
  const inCirculation = totalsInCirculation();

  return {
    state,
    balances,
    warehouse: state.warehouse,
    inCirculation,
    movements: state.movements,
    setWarehouseCount: (n: number) => { setWarehouseCount(n); refresh(); },
    addMovement: (m: Parameters<typeof addMovement>[0]) => { const r = addMovement(m); refresh(); return r; },
    removeMovement: (id: string) => { removeMovement(id); refresh(); },
    clearAll: () => { clearAllMovements(); refresh(); },
    refresh,
  };
}