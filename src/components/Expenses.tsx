import { useState, useMemo } from 'react'
import { useStore, useSettingsStore } from '../store/useStore'
import {
  Expense, ExpenseCategory, EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORY_COLORS
} from '../types'
import { getExpensesForMonth, getExpensesForMonthByCategory, filterExpensesForMonth } from '../utils/calculations'
import { useMonthStore } from '../store/useMonthStore'
import MonthSelector from './MonthSelector'
import { formatCurrency } from '../utils/formatters'
import { Plus, Trash2, Edit2, X, ShoppingCart, RefreshCw, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import clsx from 'clsx'

const CATEGORY_OPTIONS = Object.entries(EXPENSE_CATEGORY_LABELS).map(([v, l]) => ({
  value: v as ExpenseCategory, label: l
}))

const emptyForm: Omit<Expense, 'id'> = {
  name: '',
  amount: 0,
  category: 'food',
  date: new Date().toISOString().split('T')[0],
  recurring: false,
  frequency: 'monthly',
  notes: '',
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

function ExpenseForm({ initial, onSave, onClose }: {
  initial?: Partial<Omit<Expense, 'id'>>
  onSave: (data: Omit<Expense, 'id'>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Omit<Expense, 'id'>>({ ...emptyForm, ...initial })
  const set = (k: keyof typeof form, v: unknown) => setForm(p => ({ ...p, [k]: v }))
  const valid = form.name.trim() && form.amount > 0

  return (
    <>
      <div className="flex items-center justify-between p-5 border-b border-slate-800">
        <h3 className="font-semibold text-slate-100">{initial?.name ? 'Редактировать' : 'Добавить расход'}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="label">Название</label>
          <input className="input" placeholder="Продукты, кофе..." value={form.name}
            onChange={e => set('name', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Сумма</label>
            <input className="input" type="number" placeholder="5 000"
              value={form.amount || ''} onChange={e => set('amount', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Дата</label>
            <input className="input" type="date" value={form.date}
              onChange={e => set('date', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Категория</label>
          <select className="select" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Recurring toggle */}
        <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-3">
          <div>
            <p className="text-sm font-medium text-slate-300">Регулярный расход</p>
            <p className="text-xs text-slate-500">Повторяется каждый период</p>
          </div>
          <button
            type="button"
            onClick={() => set('recurring', !form.recurring)}
            className={clsx(
              'relative w-11 h-6 rounded-full transition-colors',
              form.recurring ? 'bg-emerald-500' : 'bg-slate-700'
            )}
          >
            <span className={clsx(
              'absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow',
              form.recurring ? 'translate-x-5' : 'translate-x-0'
            )} />
          </button>
        </div>

        {form.recurring && (
          <div>
            <label className="label">Периодичность</label>
            <select className="select" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
              <option value="weekly">Еженедельно</option>
              <option value="monthly">Ежемесячно</option>
              <option value="yearly">Ежегодно</option>
            </select>
          </div>
        )}

        <div>
          <label className="label">Заметки</label>
          <input className="input" placeholder="..." value={form.notes || ''}
            onChange={e => set('notes', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3 p-5 border-t border-slate-800">
        <button className="btn-secondary flex-1" onClick={onClose}>Отмена</button>
        <button className="btn-primary flex-1" disabled={!valid} onClick={() => valid && onSave(form)}>
          Сохранить
        </button>
      </div>
    </>
  )
}

export default function Expenses() {
  const { expenses, addExpense, updateExpense, deleteExpense } = useStore()
  const { settings } = useSettingsStore()
  const { selectedMonth } = useMonthStore()
  const sym = settings.currencySymbol
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<Expense | null>(null)
  const [filter, setFilter] = useState<'all' | 'recurring' | 'oneTime'>('all')

  const monthlyTotal = useMemo(() => getExpensesForMonth(expenses, selectedMonth), [expenses, selectedMonth])

  const byCategory = useMemo(() => {
    const byCat = getExpensesForMonthByCategory(expenses, selectedMonth)
    const map: Record<string, { label: string; total: number; color: string; count: number }> = {}
    Object.entries(byCat).forEach(([cat, total]) => {
      const matching = expenses.filter(e => e.category === cat)
      map[cat] = {
        label: EXPENSE_CATEGORY_LABELS[cat as ExpenseCategory] ?? cat,
        total,
        color: EXPENSE_CATEGORY_COLORS[cat as ExpenseCategory] ?? '#6b7280',
        count: matching.length,
      }
    })
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total)
  }, [expenses, selectedMonth])

  const filtered = useMemo(() => {
    const forMonth = filterExpensesForMonth(expenses, selectedMonth)
    if (filter === 'recurring') return forMonth.filter(e => e.recurring)
    if (filter === 'oneTime') return forMonth.filter(e => !e.recurring)
    return forMonth
  }, [expenses, selectedMonth, filter])

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.date.localeCompare(a.date)),
    [filtered]
  )

  const recurringTotal = useMemo(
    () => expenses.filter(e => e.recurring).reduce((s, e) => {
      const monthly = e.frequency === 'weekly' ? e.amount * 4.33
        : e.frequency === 'yearly' ? e.amount / 12
        : e.amount
      return s + monthly
    }, 0),
    [expenses]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Расходы</h1>
          <p className="text-slate-400 text-sm mt-1">Всё, куда уходят деньги</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthSelector />
          <button className="btn-primary flex items-center gap-2 shrink-0" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Добавить
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card bg-gradient-to-br from-red-500/10 to-slate-900 border-red-500/20">
          <p className="text-xs text-red-400 font-medium uppercase tracking-wider mb-2">За месяц</p>
          <p className="text-3xl font-black text-red-400">{formatCurrency(monthlyTotal, sym)}</p>
          <p className="text-xs text-slate-500 mt-1">{filtered.length} {filtered.length === 1 ? 'запись' : filtered.length < 5 ? 'записи' : 'записей'}</p>
        </div>
        <div className="card">
          <p className="text-xs text-amber-400 font-medium uppercase tracking-wider mb-2">Регулярные</p>
          <p className="text-3xl font-black text-amber-400">{formatCurrency(recurringTotal, sym)}</p>
          <p className="text-xs text-slate-500 mt-1">{expenses.filter(e => e.recurring).length} повторяющихся</p>
        </div>
      </div>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-slate-200 mb-4">По категориям</h3>
          <div className="space-y-3">
            {byCategory.map(([cat, data]) => {
              const pct = monthlyTotal > 0 ? (data.total / monthlyTotal) * 100 : 0
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: data.color }} />
                      {data.label}
                      <span className="text-slate-600">({data.count})</span>
                    </span>
                    <span className="text-slate-300 font-medium">
                      {formatCurrency(data.total, sym)}
                      <span className="text-slate-500 ml-1">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%`, background: data.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filter */}
      {expenses.length > 0 && (
        <div className="flex gap-2">
          {(['all', 'recurring', 'oneTime'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filter === f
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700'
              )}
            >
              {f === 'all' ? 'Все' : f === 'recurring' ? 'Регулярные' : 'Разовые'}
            </button>
          ))}
        </div>
      )}

      {/* Expenses list */}
      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <ShoppingCart className="w-8 h-8 text-slate-600" />
          </div>
          <div>
            <p className="text-slate-300 font-medium">Расходов нет</p>
            <p className="text-slate-500 text-sm">Добавь свои траты для анализа</p>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Добавить расход
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(expense => {
            const color = EXPENSE_CATEGORY_COLORS[expense.category]
            return (
              <div key={expense.id} className="card flex items-center gap-3 py-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}20`, border: `1px solid ${color}40` }}
                >
                  {expense.recurring
                    ? <RefreshCw className="w-4 h-4" style={{ color }} />
                    : <Clock className="w-4 h-4" style={{ color }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{expense.name}</p>
                  <p className="text-xs text-slate-500">
                    {EXPENSE_CATEGORY_LABELS[expense.category]}
                    {expense.recurring && ` · ${expense.frequency === 'weekly' ? 'Еженед.' : expense.frequency === 'yearly' ? 'В год' : 'В мес.'}`}
                    {!expense.recurring && ` · ${format(new Date(expense.date), 'd MMM yyyy', { locale: ru })}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-slate-100">{formatCurrency(expense.amount, sym)}</p>
                  {expense.recurring && expense.frequency !== 'monthly' && (
                    <p className="text-xs text-slate-500">
                      {formatCurrency(
                        expense.frequency === 'weekly' ? expense.amount * 4.33
                        : expense.frequency === 'yearly' ? expense.amount / 12
                        : expense.amount,
                        sym
                      )}/мес
                    </p>
                  )}
                  {expense.createdByName && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full mt-1 inline-block ${
                      expense.createdByName === 'Юля'
                        ? 'bg-pink-500/10 text-pink-400'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {expense.createdByName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    className="text-slate-400 hover:text-blue-400 transition-colors"
                    onClick={() => setEditItem(expense)}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="text-slate-400 hover:text-red-400 transition-colors"
                    onClick={() => { if (confirm(`Удалить "${expense.name}"?`)) deleteExpense(expense.id) }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)}>
        <ExpenseForm
          onSave={(data) => { addExpense(data); setAddOpen(false) }}
          onClose={() => setAddOpen(false)}
        />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)}>
        {editItem && (
          <ExpenseForm
            initial={editItem}
            onSave={(data) => { updateExpense(editItem.id, data); setEditItem(null) }}
            onClose={() => setEditItem(null)}
          />
        )}
      </Modal>
    </div>
  )
}
