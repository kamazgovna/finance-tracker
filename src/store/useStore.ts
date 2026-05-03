import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PostgrestError } from '@supabase/supabase-js'
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
    endDate: (r.end_date as string) ?? undefined,
    originalTermMonths: (r.original_term_months as number) ?? undefined,
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
    start_date: d.startDate,
    end_date: d.endDate ?? null,
    original_term_months: d.originalTermMonths ?? null,
    notes: d.notes,
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

function budgetFromDB(r: Record<string, unknown>): Budget {
  return { id: r.id as string, category: r.category as ExpenseCategory, monthlyLimit: Number(r.monthly_limit ?? 0) }
}

function goalFromDB(r: Record<string, unknown>): Goal {
  return {
    id: r.id as string,
    name: r.name as string,
    targetAmount: Number(r.target_amount ?? 0),
    currentAmount: Number(r.current_amount ?? 0),
    monthlyContribution: Number(r.monthly_contribution ?? 0),
    deadline: (r.deadline as string) ?? undefined,
    color: (r.color as string) ?? '#10b981',
  }
}

function goalToDB(goal: Omit<Goal, 'id'>) {
  return {
    name: goal.name,
    target_amount: goal.targetAmount,
    current_amount: goal.currentAmount,
    monthly_contribution: goal.monthlyContribution,
    deadline: goal.deadline || null,
    color: goal.color,
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

// Module-level realtime subscription (singleton)
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null
let realtimeTimer: ReturnType<typeof setTimeout> | null = null

async function getCurrentUserName(): Promise<string> {
  const { data } = await supabase.auth.getUser()
  return (data.user?.user_metadata?.display_name as string)
    ?? data.user?.email?.split('@')[0]
    ?? '?'
}

function assertSupabase(action: string, error: PostgrestError | Error | null | undefined): void {
  if (!error) return
  throw new Error(`${action}: ${error.message}`)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Неизвестная ошибка'
}

interface FinanceStore {
  debts: Debt[]
  income: IncomeSource[]
  expenses: Expense[]
  budgets: Budget[]
  goals: Goal[]
  loading: boolean
  initialized: boolean
  error: string | null
  lastSyncedAt: string | null

  fetchAll: (options?: { silent?: boolean }) => Promise<void>
  clearError: () => void
  reset: () => void
  clearAllData: () => Promise<void>

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
  error: null,
  lastSyncedAt: null,

  fetchAll: async (options) => {
    try {
      if (!options?.silent) set({ loading: true, error: null })
      const [debtsRes, incomeRes, expensesRes, budgetsRes, goalsRes] = await Promise.all([
        supabase.from('finance_debts').select('*').order('created_at'),
        supabase.from('finance_income').select('*').order('created_at'),
        supabase.from('finance_expenses').select('*').order('created_at', { ascending: false }),
        supabase.from('finance_budgets').select('*'),
        supabase.from('finance_goals').select('*').order('created_at'),
      ])
      assertSupabase('Загрузка долгов', debtsRes.error)
      assertSupabase('Загрузка доходов', incomeRes.error)
      assertSupabase('Загрузка расходов', expensesRes.error)
      assertSupabase('Загрузка лимитов', budgetsRes.error)
      assertSupabase('Загрузка целей', goalsRes.error)

      set({
        debts: (debtsRes.data ?? []).map(debtFromDB),
        income: (incomeRes.data ?? []).map(incomeFromDB),
        expenses: (expensesRes.data ?? []).map(expenseFromDB),
        budgets: (budgetsRes.data ?? []).map(budgetFromDB),
        goals: (goalsRes.data ?? []).map(goalFromDB),
        loading: false,
        initialized: true,
        error: null,
        lastSyncedAt: new Date().toISOString(),
      })

      if (!realtimeChannel) {
        const scheduleRefetch = () => {
          if (realtimeTimer) clearTimeout(realtimeTimer)
          realtimeTimer = setTimeout(() => {
            get().fetchAll({ silent: true }).catch(() => undefined)
          }, 400)
        }
        realtimeChannel = supabase
          .channel('finance-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_debts' }, scheduleRefetch)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_income' }, scheduleRefetch)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_expenses' }, scheduleRefetch)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_budgets' }, scheduleRefetch)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_goals' }, scheduleRefetch)
          .subscribe()
      }
    } catch (e) {
      const message = errorMessage(e)
      set({ loading: false, error: message })
      throw e
    }
  },

  clearError: () => set({ error: null }),

  reset: () => {
    if (realtimeTimer) clearTimeout(realtimeTimer)
    realtimeTimer = null
    if (realtimeChannel) supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
    set({
      debts: [],
      income: [],
      expenses: [],
      budgets: [],
      goals: [],
      loading: false,
      initialized: false,
      error: null,
      lastSyncedAt: null,
    })
  },

  clearAllData: async () => {
    try {
      set({ error: null })
      const [goalsRes, budgetsRes, expensesRes, incomeRes, debtsRes] = await Promise.all([
        supabase.from('finance_goals').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('finance_budgets').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('finance_expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('finance_income').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('finance_debts').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ])
      assertSupabase('Очистка целей', goalsRes.error)
      assertSupabase('Очистка лимитов', budgetsRes.error)
      assertSupabase('Очистка расходов', expensesRes.error)
      assertSupabase('Очистка доходов', incomeRes.error)
      assertSupabase('Очистка долгов', debtsRes.error)
      set({ debts: [], income: [], expenses: [], budgets: [], goals: [], error: null, lastSyncedAt: new Date().toISOString() })
    } catch (e) {
      const message = errorMessage(e)
      set({ error: message })
      throw e
    }
  },

  // Debts
  addDebt: async (debt) => {
    try {
      set({ error: null })
      const name = await getCurrentUserName()
      const { data, error } = await supabase.from('finance_debts').insert(debtToDB(debt, name)).select().single()
      assertSupabase('Добавление долга', error)
      if (data) set((s) => ({ debts: [...s.debts, debtFromDB(data)] }))
    } catch (e) {
      set({ error: errorMessage(e) })
      throw e
    }
  },
  updateDebt: async (id, debt) => {
    try {
      set({ error: null })
      const current = get().debts.find(d => d.id === id)
      if (!current) return
      const merged = { ...current, ...debt }
      const { error } = await supabase.from('finance_debts').update(debtToDB(merged)).eq('id', id)
      assertSupabase('Обновление долга', error)
      set((s) => ({ debts: s.debts.map(d => d.id === id ? { ...d, ...debt } : d) }))
    } catch (e) {
      set({ error: errorMessage(e) })
      throw e
    }
  },
  deleteDebt: async (id) => {
    try {
      set({ error: null })
      const { error } = await supabase.from('finance_debts').delete().eq('id', id)
      assertSupabase('Удаление долга', error)
      set((s) => ({ debts: s.debts.filter(d => d.id !== id) }))
    } catch (e) {
      set({ error: errorMessage(e) })
      throw e
    }
  },

  // Income
  addIncome: async (source) => {
    try {
      set({ error: null })
      const name = await getCurrentUserName()
      const { data, error } = await supabase.from('finance_income').insert(incomeToDB(source, name)).select().single()
      assertSupabase('Добавление дохода', error)
      if (data) set((s) => ({ income: [...s.income, incomeFromDB(data)] }))
    } catch (e) {
      set({ error: errorMessage(e) })
      throw e
    }
  },
  updateIncome: async (id, source) => {
    try {
      set({ error: null })
      const current = get().income.find(i => i.id === id)
      if (!current) return
      const merged = { ...current, ...source }
      const { error } = await supabase.from('finance_income').update(incomeToDB(merged)).eq('id', id)
      assertSupabase('Обновление дохода', error)
      set((s) => ({ income: s.income.map(i => i.id === id ? { ...i, ...source } : i) }))
    } catch (e) {
      set({ error: errorMessage(e) })
      throw e
    }
  },
  deleteIncome: async (id) => {
    try {
      set({ error: null })
      const { error } = await supabase.from('finance_income').delete().eq('id', id)
      assertSupabase('Удаление дохода', error)
      set((s) => ({ income: s.income.filter(i => i.id !== id) }))
    } catch (e) {
      set({ error: errorMessage(e) })
      throw e
    }
  },

  // Expenses
  addExpense: async (expense) => {
    try {
      set({ error: null })
      const name = await getCurrentUserName()
      const { data, error } = await supabase.from('finance_expenses').insert(expenseToDB(expense, name)).select().single()
      assertSupabase('Добавление расхода', error)
      if (data) set((s) => ({ expenses: [expenseFromDB(data), ...s.expenses] }))
    } catch (e) {
      set({ error: errorMessage(e) })
      throw e
    }
  },
  updateExpense: async (id, expense) => {
    try {
      set({ error: null })
      const current = get().expenses.find(e => e.id === id)
      if (!current) return
      const merged = { ...current, ...expense }
      const { error } = await supabase.from('finance_expenses').update(expenseToDB(merged)).eq('id', id)
      assertSupabase('Обновление расхода', error)
      set((s) => ({ expenses: s.expenses.map(e => e.id === id ? { ...e, ...expense } : e) }))
    } catch (e) {
      set({ error: errorMessage(e) })
      throw e
    }
  },
  deleteExpense: async (id) => {
    try {
      set({ error: null })
      const { error } = await supabase.from('finance_expenses').delete().eq('id', id)
      assertSupabase('Удаление расхода', error)
      set((s) => ({ expenses: s.expenses.filter(e => e.id !== id) }))
    } catch (e) {
      set({ error: errorMessage(e) })
      throw e
    }
  },

  // Budgets
  setBudget: async (category, limit) => {
    try {
      set({ error: null })
      const existing = get().budgets.find(b => b.category === category)
      if (existing) {
        const { error } = await supabase.from('finance_budgets').update({ monthly_limit: limit }).eq('id', existing.id)
        assertSupabase('Обновление лимита', error)
        set((s) => ({ budgets: s.budgets.map(b => b.category === category ? { ...b, monthlyLimit: limit } : b) }))
      } else {
        const { data, error } = await supabase.from('finance_budgets').insert({ category, monthly_limit: limit }).select().single()
        assertSupabase('Добавление лимита', error)
        if (data) set((s) => ({ budgets: [...s.budgets, budgetFromDB(data)] }))
      }
    } catch (e) {
      set({ error: errorMessage(e) })
      throw e
    }
  },
  deleteBudget: async (id) => {
    try {
      set({ error: null })
      const { error } = await supabase.from('finance_budgets').delete().eq('id', id)
      assertSupabase('Удаление лимита', error)
      set((s) => ({ budgets: s.budgets.filter(b => b.id !== id) }))
    } catch (e) {
      set({ error: errorMessage(e) })
      throw e
    }
  },

  // Goals
  addGoal: async (goal) => {
    try {
      set({ error: null })
      const { data, error } = await supabase.from('finance_goals').insert(goalToDB(goal)).select().single()
      assertSupabase('Добавление цели', error)
      if (data) set((s) => ({ goals: [...s.goals, goalFromDB(data)] }))
    } catch (e) {
      set({ error: errorMessage(e) })
      throw e
    }
  },
  updateGoal: async (id, goal) => {
    try {
      set({ error: null })
      const current = get().goals.find(g => g.id === id)
      if (!current) return
      const merged = { ...current, ...goal }
      const { error } = await supabase.from('finance_goals').update(goalToDB(merged)).eq('id', id)
      assertSupabase('Обновление цели', error)
      set((s) => ({ goals: s.goals.map(g => g.id === id ? { ...g, ...goal } : g) }))
    } catch (e) {
      set({ error: errorMessage(e) })
      throw e
    }
  },
  deleteGoal: async (id) => {
    try {
      set({ error: null })
      const { error } = await supabase.from('finance_goals').delete().eq('id', id)
      assertSupabase('Удаление цели', error)
      set((s) => ({ goals: s.goals.filter(g => g.id !== id) }))
    } catch (e) {
      set({ error: errorMessage(e) })
      throw e
    }
  },
}))
