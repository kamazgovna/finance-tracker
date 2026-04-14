import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Debt, IncomeSource, Expense, Settings } from '../types'

interface FinanceStore {
  debts: Debt[]
  income: IncomeSource[]
  expenses: Expense[]
  settings: Settings

  // Debts
  addDebt: (debt: Debt) => void
  updateDebt: (id: string, debt: Partial<Debt>) => void
  deleteDebt: (id: string) => void

  // Income
  addIncome: (source: IncomeSource) => void
  updateIncome: (id: string, source: Partial<IncomeSource>) => void
  deleteIncome: (id: string) => void

  // Expenses
  addExpense: (expense: Expense) => void
  updateExpense: (id: string, expense: Partial<Expense>) => void
  deleteExpense: (id: string) => void

  // Settings
  updateSettings: (settings: Partial<Settings>) => void
}

export const useStore = create<FinanceStore>()(
  persist(
    (set) => ({
      debts: [],
      income: [],
      expenses: [],
      settings: {
        currency: 'RUB',
        currencySymbol: '₽',
        locale: 'ru-RU',
        name: '',
      },

      addDebt: (debt) => set((s) => ({ debts: [...s.debts, debt] })),
      updateDebt: (id, debt) =>
        set((s) => ({ debts: s.debts.map((d) => (d.id === id ? { ...d, ...debt } : d)) })),
      deleteDebt: (id) => set((s) => ({ debts: s.debts.filter((d) => d.id !== id) })),

      addIncome: (source) => set((s) => ({ income: [...s.income, source] })),
      updateIncome: (id, source) =>
        set((s) => ({ income: s.income.map((i) => (i.id === id ? { ...i, ...source } : i)) })),
      deleteIncome: (id) => set((s) => ({ income: s.income.filter((i) => i.id !== id) })),

      addExpense: (expense) => set((s) => ({ expenses: [...s.expenses, expense] })),
      updateExpense: (id, expense) =>
        set((s) => ({ expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...expense } : e)) })),
      deleteExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

      updateSettings: (settings) =>
        set((s) => ({ settings: { ...s.settings, ...settings } })),
    }),
    {
      name: 'finance-tracker-data',
    }
  )
)
