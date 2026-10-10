import { create } from 'zustand';

interface FilterState {
  dateFrom: number;
  dateTo: number;
  accountId: string | null;
  setDateRange: (from: number, to: number) => void;
  setAccountId: (id: string | null) => void;
  reset: () => void;
}

function defaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const to = now.getTime();
  return { from, to };
}

const initial = defaultRange();

export const useFilterStore = create<FilterState>((set) => ({
  dateFrom: initial.from,
  dateTo: initial.to,
  accountId: null,
  setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),
  setAccountId: (id) => set({ accountId: id }),
  reset: () => {
    const d = defaultRange();
    set({ dateFrom: d.from, dateTo: d.to, accountId: null });
  }
}));
