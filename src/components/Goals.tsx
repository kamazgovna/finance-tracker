import { useState } from 'react'
import { useStore, useSettingsStore } from '../store/useStore'
import { Goal } from '../types'
import { formatCurrency, formatMonths } from '../utils/formatters'
import { Target, Plus, Trash2, Edit2, X, Loader2 } from 'lucide-react'
import clsx from 'clsx'

const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6',
  '#ec4899', '#f97316', '#06b6d4', '#84cc16',
]

const emptyForm: Omit<Goal, 'id'> = {
  name: '',
  targetAmount: 0,
  currentAmount: 0,
  monthlyContribution: 0,
  deadline: '',
  color: '#10b981',
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

function GoalForm({ initial, onSave, onClose, loading }: {
  initial?: Partial<Omit<Goal, 'id'>>
  onSave: (data: Omit<Goal, 'id'>) => void
  onClose: () => void
  loading?: boolean
}) {
  const [form, setForm] = useState<Omit<Goal, 'id'>>({ ...emptyForm, ...initial })
  const set = (k: keyof typeof form, v: unknown) => setForm(p => ({ ...p, [k]: v }))
  const valid = form.name.trim() && form.targetAmount > 0

  const monthsLeft = form.monthlyContribution > 0
    ? Math.ceil((form.targetAmount - form.currentAmount) / form.monthlyContribution)
    : null

  return (
    <>
      <div className="flex items-center justify-between p-5 border-b border-slate-800">
        <h3 className="font-semibold text-slate-100">{initial?.name ? 'Редактировать цель' : 'Новая цель'}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="label">Название</label>
          <input className="input" placeholder="Машина, отпуск, подушка..." value={form.name}
            onChange={e => set('name', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Цель (сумма)</label>
            <input className="input" type="number" placeholder="500 000"
              value={form.targetAmount || ''} onChange={e => set('targetAmount', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Уже накоплено</label>
            <input className="input" type="number" placeholder="0"
              value={form.currentAmount || ''} onChange={e => set('currentAmount', parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Откладываю в месяц</label>
            <input className="input" type="number" placeholder="10 000"
              value={form.monthlyContribution || ''} onChange={e => set('monthlyContribution', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Дедлайн (опц.)</label>
            <input className="input" type="date" value={form.deadline || ''}
              onChange={e => set('deadline', e.target.value)} />
          </div>
        </div>

        {monthsLeft !== null && monthsLeft > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-sm text-emerald-400">
            При таком темпе цель достигнута через <strong>{formatMonths(monthsLeft)}</strong>
          </div>
        )}

        <div>
          <label className="label">Цвет</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => set('color', c)}
                className={clsx(
                  'w-8 h-8 rounded-full border-2 transition-all',
                  form.color === c ? 'border-white scale-110' : 'border-transparent'
                )}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-3 p-5 border-t border-slate-800">
        <button className="btn-secondary flex-1" onClick={onClose}>Отмена</button>
        <button
          className="btn-primary flex-1 flex items-center justify-center gap-2"
          disabled={!valid || loading}
          onClick={() => valid && onSave(form)}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Сохранить
        </button>
      </div>
    </>
  )
}

export default function Goals() {
  const { goals, addGoal, updateGoal, deleteGoal } = useStore()
  const { settings } = useSettingsStore()
  const sym = settings.currencySymbol
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<Goal | null>(null)
  const [saving, setSaving] = useState(false)

  const handleAdd = async (data: Omit<Goal, 'id'>) => {
    setSaving(true)
    await addGoal(data)
    setSaving(false)
    setAddOpen(false)
  }

  const handleUpdate = async (data: Omit<Goal, 'id'>) => {
    if (!editItem) return
    setSaving(true)
    await updateGoal(editItem.id, data)
    setSaving(false)
    setEditItem(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Цели</h1>
          <p className="text-slate-400 text-sm mt-1">Накопления и финансовые цели</p>
        </div>
        <button className="btn-primary flex items-center gap-2 shrink-0" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" /> Новая цель
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Target className="w-8 h-8 text-slate-600" />
          </div>
          <div>
            <p className="text-slate-300 font-medium">Целей нет</p>
            <p className="text-slate-500 text-sm">Добавь цель — машина, отпуск, подушка безопасности</p>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Добавить первую цель
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {goals.map(goal => {
            const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
            const remaining = goal.targetAmount - goal.currentAmount
            const monthsLeft = goal.monthlyContribution > 0 && remaining > 0
              ? Math.ceil(remaining / goal.monthlyContribution)
              : null
            const done = pct >= 100

            return (
              <div key={goal.id} className={clsx('card', done && 'border-emerald-500/30')}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${goal.color}20`, border: `1px solid ${goal.color}40` }}
                    >
                      <Target className="w-5 h-5" style={{ color: goal.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-100">{goal.name}</p>
                      {done
                        ? <span className="badge-green">Цель достигнута! 🎉</span>
                        : monthsLeft && <p className="text-xs text-slate-500">{formatMonths(monthsLeft)} до цели</p>
                      }
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button className="text-slate-400 hover:text-blue-400 transition-colors" onClick={() => setEditItem(goal)}>
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      className="text-slate-400 hover:text-red-400 transition-colors"
                      onClick={() => { if (confirm(`Удалить цель "${goal.name}"?`)) deleteGoal(goal.id) }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>{formatCurrency(goal.currentAmount, sym)} накоплено</span>
                    <span>цель {formatCurrency(goal.targetAmount, sym)}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(pct, 100)}%`, background: goal.color }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{pct.toFixed(1)}%</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">Осталось</p>
                    <p className="font-bold text-slate-200 text-sm">{done ? '—' : formatCurrency(remaining, sym)}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">В месяц</p>
                    <p className="font-bold text-slate-200 text-sm">
                      {goal.monthlyContribution > 0 ? formatCurrency(goal.monthlyContribution, sym) : '—'}
                    </p>
                  </div>
                </div>

                {/* Quick deposit */}
                <button
                  className="w-full mt-3 text-xs font-medium py-2 rounded-xl border border-dashed border-slate-700
                             text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all"
                  onClick={() => setEditItem(goal)}
                >
                  + Пополнить
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary */}
      {goals.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-slate-200 mb-3">Итого по целям</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Накоплено</p>
              <p className="font-bold text-emerald-400">{formatCurrency(goals.reduce((s, g) => s + g.currentAmount, 0), sym)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Осталось</p>
              <p className="font-bold text-slate-200">{formatCurrency(goals.reduce((s, g) => s + Math.max(0, g.targetAmount - g.currentAmount), 0), sym)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">В месяц</p>
              <p className="font-bold text-blue-400">{formatCurrency(goals.reduce((s, g) => s + g.monthlyContribution, 0), sym)}</p>
            </div>
          </div>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)}>
        <GoalForm onSave={handleAdd} onClose={() => setAddOpen(false)} loading={saving} />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)}>
        {editItem && (
          <GoalForm
            initial={editItem}
            onSave={handleUpdate}
            onClose={() => setEditItem(null)}
            loading={saving}
          />
        )}
      </Modal>
    </div>
  )
}
