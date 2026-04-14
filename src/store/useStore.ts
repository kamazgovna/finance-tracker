import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { Debt, IncomeSource, Expense, Settings, Budget, Goal, ExpenseCategory } from '../types'

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
  budgets: Budget[]
  goals: Goal[]
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

  setBudget: (category: ExpenseCategory, limit: number) => Promise<void>
  deleteBudget: (id: string) => Promise<void>

  addGoal: (goal: Omit<Goal, 'id'>) => Promise<void>
  updateGoal: (id: string, goal: Partial<Omit<Goal, 'id'>>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
}

export const useStore = create<FinanceStore>()((set, get) => ({
  debts: [],
  income: [],
  expenses: [],
  budgets: [],
  goals: [],
  loading: false,
  initialized: false,

  fetchAll: async () => {
    set({ loading: true })
    const [debtsRes, incomeRes, expensesRes, budgetsRes, goalsRes] = await Promise.all([
      supabase.from('finance_debts').select('*').order('created_at'),
      supabase.from('finance_income').select('*').order('created_at'),
      supabase.from('finance_expenses').select('*').order('created_at', { ascending: false }),
      supabase.from('finance_budgets').select('*'),
      supabase.from('finance_goals').select('*').order('created_at'),
    ])
    set({
      debts: (debtsRes.data ?? []).map(debtFromDB),
      income: (incomeRes.data ?? []).map(incomeFromDB),
      expenses: (expensesRes.data ?? []).map(expenseFromDB),
      budgets: (budgetsRes.data ?? []).map((r) => ({ id: r.id, category: r.category, monthlyLimit: r.monthly_limit }) as Budget),
      goals: (goalsRes.data ?? []).map((r) => ({
        id: r.id, name: r.name, targetAmount: r.target_amount,
        currentAmount: r.current_amount, monthlyContribution: r.monthly_contribution,
        deadline: r.deadline, color: r.color,
      }) as Goal),
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

  // Budgets
  setBudget: async (category, limit) => {
    const existing = get().budgets.find(b => b.category === category)
    if (existing) {
      const { error } = await supabase.from('finance_budgets').update({ monthly_limit: limit }).eq('id', existing.id)
      if (!error) set((s) => ({ budgets: s.budgets.map(b => b.category === category ? { ...b, monthlyLimit: limit } : b) }))
    } else {
      const { data, error } = await supabase.from('finance_budgets').insert({ category, monthly_limit: limit }).select().single()
      if (!error && data) set((s) => ({ budgets: [...s.budgets, { id: data.id, category, monthlyLimit: limit }] }))
    }
  },
  deleteBudget: async (id) => {
    const { error } = await supabase.from('finance_budgets').delete().eq('id', id)
    if (!error) set((s) => ({ budgets: s.budgets.filter(b => b.id !== id) }))
  },

  // Goals
  addGoal: async (goal) => {
    const { data, error } = await supabase.from('finance_goals').insert({
      name: goal.name, target_amount: goal.targetAmount, current_amount: goal.currentAmount,
      monthly_contribution: goal.monthlyContribution, deadline: goal.deadline, color: goal.color,
    }).select().single()
    if (!error && data) set((s) => ({ goals: [...s.goals, {
      id: data.id, name: data.name, targetAmount: data.target_amount,
      currentAmount: data.current_amount, monthlyContribution: data.monthly_contribution,
      deadline: data.deadline, color: data.color,
    }] }))
  },
  updateGoal: async (id, goal) => {
    const current = get().goals.find(g => g.id === id)
    if (!current) return
    const merged = { ...current, ...goal }
    const { error } = await supabase.from('finance_goals').update({
      name: merged.name, target_amount: merged.targetAmount, current_amount: merged.currentAmount,
      monthly_contribution: merged.monthlyContribution, deadline: merged.deadline, color: merged.color,
    }).eq('id', id)
    if (!error) set((s) => ({ goals: s.goals.map(g => g.id === id ? { ...g, ...goal } : g) }))
  },
  deleteGoal: async (id) => {
    const { error } = await supabase.from('finance_goals').delete().eq('id', id)
    if (!error) set((s) => ({ goals: s.goals.filter(g => g.id !== id) }))
  },
}))
