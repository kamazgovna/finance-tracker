import { create } from 'zustand'
import { startOfMonth, addMonths, subMonths } from 'date-fns'

interface MonthStore {
  selectedMonth: Date
  next: () => void
  prev: () => void
  reset: () => void
}

export const useMonthStore = create<MonthStore>()((set) => ({
  selectedMonth: startOfMonth(new Date()),
  next: () => set((s) => ({ selectedMonth: startOfMonth(addMonths(s.selectedMonth, 1)) })),
  prev: () => set((s) => ({ selectedMonth: startOfMonth(subMonths(s.selectedMonth, 1)) })),
  reset: () => set({ selectedMonth: startOfMonth(new Date()) }),
}))
