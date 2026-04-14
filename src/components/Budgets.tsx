import { useState, useMemo } from 'react'
import { useStore, useSettingsStore } from '../store/useStore'
import { useMonthStore } from '../store/useMonthStore'
import { EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORY_COLORS, ExpenseCategory } from '../types'
import { getExpensesForMonthByCategory } from '../utils/calculations'
import { formatCurrency } from '../utils/formatters'
import { PiggyBank, Trash2, Plus, X } from 'lucide-react'
import MonthSelector from './MonthSelector'
import clsx from 'clsx'

const CATEGORY_OPTIONS = Object.entries(EXPENSE_CATEGORY_LABELS).map(([v, l]) => ({
  value: v as ExpenseCategory, label: l,
}))

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl">
        {children}
      </div>
    </div>
  )
}

export default function Budgets() {
  const { budgets, setBudget, deleteBudget, expenses } = useStore()
  const { settings } = useSettingsStore()
  const { selectedMonth } = useMonthStore()
  const sym = settings.currencySymbol

  const [addOpen, setAddOpen] = useState(false)
  const [category, setCategory] = useState<ExpenseCategory>('food')
  const [limit, setLimit] = useState('')

  const spentByCategory = useMemo(
    () => getExpensesForMonthByCategory(expenses, selectedMonth),
    [expenses, selectedMonth]
  )

  const handleSave = async () => {
    const val = parseFloat(limit)
    if (!val || val <= 0) return
    await setBudget(category, val)
    setAddOpen(false)
    setLimit('')
    setCategory('food')
  }

  // Categories without budget (for the add form)
  const usedCategories = budgets.map(b => b.category)
  const availableCategories = CATEGORY_OPTIONS.filter(c => !usedCategories.includes(c.value))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Лимиты</h1>
          <p className="text-slate-400 text-sm mt-1">Лимиты по категориям</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthSelector />
          {availableCategories.length > 0 && (
            <button className="btn-primary flex items-center gap-2 shrink-0" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" /> Добавить лимит
            </button>
          )}
        </div>
      </div>

      {budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <PiggyBank className="w-8 h-8 text-slate-600" />
          </div>
          <div>
            <p className="text-slate-300 font-medium">Лимитов нет</p>
            <p className="text-slate-500 text-sm">Установи лимиты по категориям чтобы контролировать траты</p>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Установить первый лимит
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {budgets.map(budget => {
            const spent = spentByCategory[budget.category] ?? 0
            const pct = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0
            const color = EXPENSE_CATEGORY_COLORS[budget.category]
            const isOver = pct > 100
            const isWarning = pct > 80 && !isOver

            return (
              <div key={budget.id} className={clsx(
                'card',
                isOver && 'border-red-500/30',
                isWarning && 'border-amber-500/30',
              )}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: color }} />
                    <span className="font-medium text-slate-200">{EXPENSE_CATEGORY_LABELS[budget.category]}</span>
                    {isOver && <span className="badge-red">Превышен!</span>}
                    {isWarning && <span className="badge-yellow">Почти лимит</span>}
                  </div>
                  <button
                    onClick={() => deleteBudget(budget.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex justify-between text-sm mb-2">
                  <span className={clsx(
                    'font-bold text-lg',
                    isOver ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-slate-100'
                  )}>
                    {formatCurrency(spent, sym)}
                  </span>
                  <span className="text-slate-500">из {formatCurrency(budget.monthlyLimit, sym)}</span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      background: isOver ? '#ef4444' : isWarning ? '#f59e0b' : color,
                    }}
                  />
                </div>

                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>{pct.toFixed(0)}% использовано</span>
                  <span className={clsx(isOver ? 'text-red-400' : 'text-emerald-400')}>
                    {isOver
                      ? `Перерасход ${formatCurrency(spent - budget.monthlyLimit, sym)}`
                      : `Остаток ${formatCurrency(budget.monthlyLimit - spent, sym)}`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Total overview */}
      {budgets.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-slate-200 mb-3">Итого по бюджету</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Лимит</p>
              <p className="font-bold text-slate-200">{formatCurrency(budgets.reduce((s, b) => s + b.monthlyLimit, 0), sym)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Потрачено</p>
              <p className="font-bold text-slate-200">{formatCurrency(budgets.reduce((s, b) => s + (spentByCategory[b.category] ?? 0), 0), sym)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-xs text-red-400 mb-1">Превышений</p>
              <p className="font-bold text-red-400">{budgets.filter(b => (spentByCategory[b.category] ?? 0) > b.monthlyLimit).length}</p>
            </div>
          </div>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)}>
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h3 className="font-semibold text-slate-100">Новый лимит</h3>
          <button onClick={() => setAddOpen(false)} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Категория</label>
            <select className="select" value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}>
              {availableCategories.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Лимит в месяц</label>
            <input className="input" type="number" placeholder="30 000"
              value={limit} onChange={e => setLimit(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-slate-800">
          <button className="btn-secondary flex-1" onClick={() => setAddOpen(false)}>Отмена</button>
          <button className="btn-primary flex-1" disabled={!limit || parseFloat(limit) <= 0} onClick={handleSave}>
            Сохранить
          </button>
        </div>
      </Modal>
    </div>
  )
}
