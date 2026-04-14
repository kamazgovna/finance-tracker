import { useState, useMemo } from 'react'
import { useStore, useSettingsStore } from '../store/useStore'
import { IncomeSource, IncomeCategory, INCOME_CATEGORY_LABELS, Frequency } from '../types'
import { getMonthlyIncomeTotal } from '../utils/calculations'
import { formatCurrency } from '../utils/formatters'
import { Plus, Trash2, Edit2, X, TrendingUp } from 'lucide-react'

const FREQUENCY_LABELS: Record<Frequency, string> = {
  monthly: 'Ежемесячно',
  weekly: 'Еженедельно',
  biweekly: 'Раз в 2 недели',
  quarterly: 'Раз в квартал',
  yearly: 'Ежегодно',
  oneTime: 'Разово',
}

function toMonthly(amount: number, freq: Frequency): number {
  switch (freq) {
    case 'monthly': return amount
    case 'weekly': return amount * 4.33
    case 'biweekly': return amount * 2.17
    case 'quarterly': return amount / 3
    case 'yearly': return amount / 12
    case 'oneTime': return 0
  }
}

const INCOME_CATEGORY_OPTIONS = Object.entries(INCOME_CATEGORY_LABELS).map(([v, l]) => ({ value: v as IncomeCategory, label: l }))
const FREQUENCY_OPTIONS = Object.entries(FREQUENCY_LABELS).map(([v, l]) => ({ value: v as Frequency, label: l }))

const emptyForm: Omit<IncomeSource, 'id'> = {
  name: '',
  amount: 0,
  frequency: 'monthly',
  category: 'salary',
  notes: '',
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
        {children}
      </div>
    </div>
  )
}

function IncomeForm({ initial, onSave, onClose }: {
  initial?: Partial<Omit<IncomeSource, 'id'>>
  onSave: (data: Omit<IncomeSource, 'id'>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Omit<IncomeSource, 'id'>>({ ...emptyForm, ...initial })
  const set = (k: keyof typeof form, v: unknown) => setForm(p => ({ ...p, [k]: v }))
  const valid = form.name.trim() && form.amount > 0

  return (
    <>
      <div className="flex items-center justify-between p-5 border-b border-slate-800">
        <h3 className="font-semibold text-slate-100">{initial?.name ? 'Редактировать доход' : 'Добавить доход'}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="label">Название</label>
          <input className="input" placeholder="Зарплата, фриланс..." value={form.name}
            onChange={e => set('name', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Сумма</label>
            <input className="input" type="number" placeholder="100 000"
              value={form.amount || ''} onChange={e => set('amount', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Периодичность</label>
            <select className="select" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
              {FREQUENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Категория</label>
          <select className="select" value={form.category} onChange={e => set('category', e.target.value)}>
            {INCOME_CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
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

const CATEGORY_COLORS: Record<IncomeCategory, string> = {
  salary: '#10b981',
  freelance: '#3b82f6',
  investment: '#f59e0b',
  rental: '#8b5cf6',
  bonus: '#f97316',
  other: '#6b7280',
}

export default function Income() {
  const { income, addIncome, updateIncome, deleteIncome } = useStore()
  const { settings } = useSettingsStore()
  const sym = settings.currencySymbol
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<IncomeSource | null>(null)

  const monthlyTotal = useMemo(() => getMonthlyIncomeTotal(income), [income])

  // Group by category
  const byCategory = useMemo(() => {
    const map: Record<string, { label: string; total: number; color: string }> = {}
    income.forEach(s => {
      const monthly = toMonthly(s.amount, s.frequency)
      if (!map[s.category]) {
        map[s.category] = {
          label: INCOME_CATEGORY_LABELS[s.category],
          total: 0,
          color: CATEGORY_COLORS[s.category],
        }
      }
      map[s.category].total += monthly
    })
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total)
  }, [income])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Доходы</h1>
          <p className="text-slate-400 text-sm mt-1">Все источники поступлений</p>
        </div>
        <button className="btn-primary flex items-center gap-2 shrink-0" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" /> Добавить доход
        </button>
      </div>

      {/* Total */}
      <div className="card bg-gradient-to-br from-emerald-500/10 to-slate-900 border-emerald-500/20">
        <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider mb-2">Итого в месяц</p>
        <p className="text-4xl font-black text-emerald-400">{formatCurrency(monthlyTotal, sym)}</p>
        <p className="text-xs text-slate-500 mt-1">{income.length} {income.length === 1 ? 'источник' : income.length < 5 ? 'источника' : 'источников'}</p>
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
                    <span className="text-slate-400">{data.label}</span>
                    <span className="text-slate-300 font-medium">
                      {formatCurrency(data.total, sym)} <span className="text-slate-500">({pct.toFixed(0)}%)</span>
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

      {/* List */}
      {income.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-slate-600" />
          </div>
          <div>
            <p className="text-slate-300 font-medium">Источников дохода нет</p>
            <p className="text-slate-500 text-sm">Добавь зарплату, фриланс или другой доход</p>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Добавить первый доход
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {income.map(source => {
            const monthly = toMonthly(source.amount, source.frequency)
            const color = CATEGORY_COLORS[source.category]
            return (
              <div key={source.id} className="card flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}20`, border: `1px solid ${color}40` }}
                >
                  <TrendingUp className="w-5 h-5" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200">{source.name}</p>
                  <p className="text-xs text-slate-500">
                    {INCOME_CATEGORY_LABELS[source.category]} · {FREQUENCY_LABELS[source.frequency]}
                  </p>
                  {source.notes && <p className="text-xs text-slate-600 truncate">{source.notes}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-emerald-400">{formatCurrency(source.amount, sym)}</p>
                  {source.frequency !== 'monthly' && (
                    <p className="text-xs text-slate-500">{formatCurrency(monthly, sym)}/мес</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    className="text-slate-400 hover:text-blue-400 transition-colors"
                    onClick={() => setEditItem(source)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    className="text-slate-400 hover:text-red-400 transition-colors"
                    onClick={() => { if (confirm(`Удалить "${source.name}"?`)) deleteIncome(source.id) }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)}>
        <IncomeForm
          onSave={(data) => { addIncome(data); setAddOpen(false) }}
          onClose={() => setAddOpen(false)}
        />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)}>
        {editItem && (
          <IncomeForm
            initial={editItem}
            onSave={(data) => { updateIncome(editItem.id, data); setEditItem(null) }}
            onClose={() => setEditItem(null)}
          />
        )}
      </Modal>
    </div>
  )
}
