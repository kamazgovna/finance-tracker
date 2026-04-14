import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { Debt, IncomeSource, Expense, Settings } from '../types'

// --- DB mappers ---

function debtFromDB(r: Record<string, unknown>): Debt {
  return {
    id: r.id as string,
    name: r.name as string,
    type: r.type as Debt['type'],
    totalAmount: r.total_amount as number,
    remainingBalance: r.remaining_balance as number,
    interestRate: r.interest_rate as number,
    monthlyPayment: r.monthly_payment as number,
    startDate: (r.start_date as string) ?? '',
    notes: (r.notes as string) ?? '',
    createdBy: (r.created_by as string) ?? undefined,
    createdByName: (r.created_by_name as string) ?? undefined,
  }
}

function debtToDB(d: Omit<Debt, 'id'>, userName?: string) {
  return {
    name: d.name, type: d.type,
    total_amount: d.totalAmount, remaining_balance: d.remainingBalance,
    interest_rate: d.interestRate, monthly_payment: d.monthlyPayment,
    start_date: d.startDate, notes: d.notes,
    ...(userName ? { created_by_name: userName } : {}),
  }
}

function incomeFromDB(r: Record<string, unknown>): IncomeSource {
  return {
    id: r.id as string,
    name: r.name as string,
    amount: r.amount as number,
    frequency: r.frequency as IncomeSource['frequency'],
    category: r.category as IncomeSource['category'],
    date: (r.date as string) ?? undefined,
    notes: (r.notes as string) ?? '',
    createdBy: (r.created_by as string) ?? undefined,
    createdByName: (r.created_by_name as string) ?? undefined,
  }
}

function incomeToDB(s: Omit<IncomeSource, 'id'>, userName?: string) {
  return {
    name: s.name, amount: s.amount, frequency: s.frequency,
    category: s.category, date: s.date, notes: s.notes,
    ...(userName ? { created_by_name: userName } : {}),
  }
}

function expenseFromDB(r: Record<string, unknown>): Expense {
  return {
    id: r.id as string,
    name: r.name as string,
    amount: r.amount as number,
    category: r.category as Expense['category'],
    date: r.date as string,
    recurring: r.recurring as boolean,
    frequency: (r.frequency as Expense['frequency']) ?? undefined,
    notes: (r.notes as string) ?? '',
    createdBy: (r.created_by as string) ?? undefined,
    createdByName: (r.created_by_name as string) ?? undefined,
  }
}

function expenseToDB(e: Omit<Expense, 'id'>, userName?: string) {
  return {
    name: e.name, amount: e.amount, category: e.category,
    date: e.date, recurring: e.recurring, frequency: e.frequency, notes: e.notes,
    ...(userName ? { created_by_name: userName } : {}),
  }
}

// --- Settings store (localStorage only, per-device) ---

interface SettingsStore {
  settings: Settings
  updateSettings: (s: Partial<Settings>) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: { currency: 'RUB', currencySymbol: '₽', locale: 'ru-RU', name: '' },
      updateSettings: (s) => set((prev) => ({ settings: { ...prev.settings, ...s } })),
    }),
    { name: 'finance-settings' }
  )
)

// --- Finance store (Supabase) ---

async function getCurrentUserName(): Promise<string> {
  const { data } = await supabase.auth.getUser()
  return (data.user?.user_metadata?.display_name as string)
    ?? data.user?.email?.split('@')[0]
    ?? '?'
}

interface FinanceStore {
  debts: Debt[]
  income: IncomeSource[]
  expenses: Expense[]
  loading: boolean
  initialized: boolean

  fetchAll: () => Promise<void>

  addDebt: (debt: Omit<Debt, 'id'>) => Promise<void>
  updateDebt: (id: string, debt: Partial<Omit<Debt, 'id'>>) => Promise<void>
  deleteDebt: (id: string) => Promise<void>

  addIncome: (source: Omit<IncomeSource, 'id'>) => Promise<void>
  updateIncome: (id: string, source: Partial<Omit<IncomeSource, 'id'>>) => Promise<void>
  deleteIncome: (id: string) => Promise<void>

  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>
  updateExpense: (id: string, expense: Partial<Omit<Expense, 'id'>>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
}

export const useStore = create<FinanceStore>()((set, get) => ({
  debts: [],
  income: [],
  expenses: [],
  loading: false,
  initialized: false,

  fetchAll: async () => {
    set({ loading: true })
    const [debtsRes, incomeRes, expensesRes] = await Promise.all([
      supabase.from('finance_debts').select('*').order('created_at'),
      supabase.from('finance_income').select('*').order('created_at'),
      supabase.from('finance_expenses').select('*').order('created_at', { ascending: false }),
    ])
    set({
      debts: (debtsRes.data ?? []).map(debtFromDB),
      income: (incomeRes.data ?? []).map(incomeFromDB),
      expenses: (expensesRes.data ?? []).map(expenseFromDB),
      loading: false,
      initialized: true,
    })
  },

  // Debts
  addDebt: async (debt) => {
    const name = await getCurrentUserName()
    const { data, error } = await supabase.from('finance_debts').insert(debtToDB(debt, name)).select().single()
    if (!error && data) set((s) => ({ debts: [...s.debts, debtFromDB(data)] }))
  },
  updateDebt: async (id, debt) => {
    const current = get().debts.find(d => d.id === id)
    if (!current) return
    const merged = { ...current, ...debt }
    const { error } = await supabase.from('finance_debts').update(debtToDB(merged)).eq('id', id)
    if (!error) set((s) => ({ debts: s.debts.map(d => d.id === id ? { ...d, ...debt } : d) }))
  },
  deleteDebt: async (id) => {
    const { error } = await supabase.from('finance_debts').delete().eq('id', id)
    if (!error) set((s) => ({ debts: s.debts.filter(d => d.id !== id) }))
  },

  // Income
  addIncome: async (source) => {
    const name = await getCurrentUserName()
    const { data, error } = await supabase.from('finance_income').insert(incomeToDB(source, name)).select().single()
    if (!error && data) set((s) => ({ income: [...s.income, incomeFromDB(data)] }))
  },
  updateIncome: async (id, source) => {
    const current = get().income.find(i => i.id === id)
    if (!current) return
    const merged = { ...current, ...source }
    const { error } = await supabase.from('finance_income').update(incomeToDB(merged)).eq('id', id)
    if (!error) set((s) => ({ income: s.income.map(i => i.id === id ? { ...i, ...source } : i) }))
  },
  deleteIncome: async (id) => {
    const { error } = await supabase.from('finance_income').delete().eq('id', id)
    if (!error) set((s) => ({ income: s.income.filter(i => i.id !== id) }))
  },

  // Expenses
  addExpense: async (expense) => {
    const name = await getCurrentUserName()
    const { data, error } = await supabase.from('finance_expenses').insert(expenseToDB(expense, name)).select().single()
    if (!error && data) set((s) => ({ expenses: [expenseFromDB(data), ...s.expenses] }))
  },
  updateExpense: async (id, expense) => {
    const current = get().expenses.find(e => e.id === id)
    if (!current) return
    const merged = { ...current, ...expense }
    const { error } = await supabase.from('finance_expenses').update(expenseToDB(merged)).eq('id', id)
    if (!error) set((s) => ({ expenses: s.expenses.map(e => e.id === id ? { ...e, ...expense } : e) }))
  },
  deleteExpense: async (id) => {
    const { error } = await supabase.from('finance_expenses').delete().eq('id', id)
    if (!error) set((s) => ({ expenses: s.expenses.filter(e => e.id !== id) }))
  },
}))
