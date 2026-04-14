import { useState, useMemo } from 'react'
import { useStore, useSettingsStore } from '../store/useStore'
import { Debt, DebtType, DEBT_TYPE_LABELS } from '../types'
import { getDebtMetrics, calculateAmortization } from '../utils/calculations'
import { formatCurrency, formatMonths } from '../utils/formatters'
import {
  Plus, Trash2, Edit2, ChevronDown, ChevronUp, Calculator, X, CreditCard, AlertTriangle, Banknote
} from 'lucide-react'
import { isPaymentSufficient } from '../utils/calculations'
import clsx from 'clsx'

const DEBT_TYPE_OPTIONS: { value: DebtType; label: string }[] = Object.entries(DEBT_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as DebtType, label })
)

const emptyForm: Omit<Debt, 'id'> = {
  name: '',
  type: 'personal',
  totalAmount: 0,
  remainingBalance: 0,
  interestRate: 0,
  monthlyPayment: 0,
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  originalTermMonths: undefined,
  notes: '',
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

function DebtForm({ initial, onSave, onClose }: {
  initial?: Partial<Omit<Debt, 'id'>>
  onSave: (data: Omit<Debt, 'id'>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Omit<Debt, 'id'>>({ ...emptyForm, ...initial })
  const set = (k: keyof typeof form, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  const valid = form.name.trim() && form.remainingBalance > 0 && form.monthlyPayment > 0

  return (
    <>
      <div className="flex items-center justify-between p-5 border-b border-slate-800">
        <h3 className="font-semibold text-slate-100">{initial ? 'Редактировать долг' : 'Добавить долг'}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Название</label>
            <input className="input" placeholder="Ипотека Сбербанк" value={form.name}
              onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Тип</label>
            <select className="select" value={form.type} onChange={e => set('type', e.target.value)}>
              {DEBT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Процентная ставка, % год.</label>
            <input className="input" type="number" step="0.01" placeholder="12.5"
              value={form.interestRate || ''} onChange={e => set('interestRate', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Изначальная сумма</label>
            <input className="input" type="number" placeholder="1 000 000"
              value={form.totalAmount || ''} onChange={e => set('totalAmount', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Остаток долга</label>
            <input className="input" type="number" placeholder="800 000"
              value={form.remainingBalance || ''} onChange={e => set('remainingBalance', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Ежемесячный платёж</label>
            <input className="input" type="number" placeholder="15 000"
              value={form.monthlyPayment || ''} onChange={e => set('monthlyPayment', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Дата начала</label>
            <input className="input" type="date" value={form.startDate}
              onChange={e => set('startDate', e.target.value)} />
          </div>
          <div>
            <label className="label">Дата окончания договора</label>
            <input className="input" type="date" value={form.endDate || ''}
              onChange={e => set('endDate', e.target.value || undefined)} />
          </div>
          <div>
            <label className="label">Срок договора (мес.)</label>
            <input className="input" type="number" placeholder="60"
              value={form.originalTermMonths || ''}
              onChange={e => set('originalTermMonths', parseInt(e.target.value) || undefined)} />
          </div>
          <div className="col-span-2">
            <label className="label">Заметки (необязательно)</label>
            <input className="input" placeholder="Любые заметки..."
              value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
          </div>
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

function AmortizationTable({ debt, onClose }: { debt: Debt; onClose: () => void }) {
  const { settings } = useSettingsStore()
  const sym = settings.currencySymbol
  const [extra, setExtra] = useState(0)

  const rows = useMemo(() => calculateAmortization(debt, extra), [debt, extra])
  const base = useMemo(() => getDebtMetrics(debt, 0), [debt])
  const withExtra = useMemo(() => getDebtMetrics(debt, extra), [debt, extra])

  const interestSaved = base.totalInterest - withExtra.totalInterest
  const monthsSaved = base.monthsLeft - withExtra.monthsLeft

  return (
    <>
      <div className="flex items-center justify-between p-5 border-b border-slate-800">
        <div>
          <h3 className="font-semibold text-slate-100">График погашения</h3>
          <p className="text-xs text-slate-400 mt-0.5">{debt.name}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
      </div>

      <div className="p-5 space-y-4">
        {/* Insufficient payment warning */}
        {base.insufficient && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">Платёж меньше процентов!</p>
              <p className="text-xs text-red-400/70 mt-0.5">
                Минимум {formatCurrency(debt.remainingBalance * debt.interestRate / 100 / 12, sym)}/мес чтобы долг не рос.
                Текущий платёж не покрывает проценты — долг увеличивается.
              </p>
            </div>
          </div>
        )}

        {/* Extra payment calculator */}
        <div className="bg-slate-800/60 rounded-xl p-4">
          <label className="label flex items-center gap-2">
            <Calculator className="w-3.5 h-3.5" /> Доп. платёж в месяц
          </label>
          <input
            className="input"
            type="number"
            placeholder="0"
            value={extra || ''}
            onChange={e => setExtra(parseFloat(e.target.value) || 0)}
          />
          {extra > 0 && !withExtra.insufficient && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                <p className="text-xs text-emerald-400 font-medium">Сэкономлено %</p>
                <p className="text-lg font-bold text-emerald-400">{formatCurrency(interestSaved, sym)}</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                <p className="text-xs text-blue-400 font-medium">Быстрее на</p>
                <p className="text-lg font-bold text-blue-400">{formatMonths(monthsSaved)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Платежей</p>
            <p className="font-bold text-slate-200">{formatMonths(withExtra.monthsLeft)}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Переплата</p>
            <p className="font-bold text-red-400">{formatCurrency(withExtra.overpayment, sym)}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Закроется</p>
            <p className="font-bold text-slate-200">{withExtra.payoffDate}</p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <th className="text-left p-3 text-slate-400 font-medium">Дата</th>
                <th className="text-right p-3 text-slate-400 font-medium">Платёж</th>
                <th className="text-right p-3 text-slate-400 font-medium">Основной</th>
                <th className="text-right p-3 text-slate-400 font-medium">%</th>
                <th className="text-right p-3 text-slate-400 font-medium">Остаток</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={clsx('border-b border-slate-800/50', i % 2 === 0 ? '' : 'bg-slate-800/20')}>
                  <td className="p-3 text-slate-400">{row.date}</td>
                  <td className="p-3 text-right text-slate-200 font-medium">{formatCurrency(row.payment, sym)}</td>
                  <td className="p-3 text-right text-emerald-400">{formatCurrency(row.principal, sym)}</td>
                  <td className="p-3 text-right text-red-400">{formatCurrency(row.interest, sym)}</td>
                  <td className="p-3 text-right text-slate-300">{formatCurrency(row.balance, sym)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function EarlyPaymentModal({ debt, onClose }: { debt: Debt; onClose: () => void }) {
  const { updateDebt } = useStore()
  const { settings } = useSettingsStore()
  const sym = settings.currencySymbol
  const [amount, setAmount] = useState(0)
  const [saving, setSaving] = useState(false)

  const newBalance = Math.max(0, debt.remainingBalance - amount)
  const valid = amount > 0 && amount <= debt.remainingBalance

  const handleConfirm = async () => {
    if (!valid) return
    setSaving(true)
    await updateDebt(debt.id, { remainingBalance: newBalance })
    setSaving(false)
    onClose()
  }

  return (
    <>
      <div className="flex items-center justify-between p-5 border-b border-slate-800">
        <div>
          <h3 className="font-semibold text-slate-100">Досрочный платёж</h3>
          <p className="text-xs text-slate-400 mt-0.5">{debt.name}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-5 space-y-4">
        <div className="bg-slate-800/50 rounded-xl p-3 flex justify-between text-sm">
          <span className="text-slate-400">Текущий остаток</span>
          <span className="font-semibold text-slate-200">{formatCurrency(debt.remainingBalance, sym)}</span>
        </div>
        <div>
          <label className="label">Сумма досрочного платежа</label>
          <input
            className="input"
            type="number"
            placeholder="50 000"
            value={amount || ''}
            onChange={e => setAmount(parseFloat(e.target.value) || 0)}
          />
        </div>
        {amount > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex justify-between text-sm">
            <span className="text-emerald-400">Остаток после платежа</span>
            <span className="font-bold text-emerald-400">{formatCurrency(newBalance, sym)}</span>
          </div>
        )}
        {amount > debt.remainingBalance && (
          <p className="text-xs text-red-400">Сумма превышает остаток долга</p>
        )}
      </div>
      <div className="flex gap-3 p-5 border-t border-slate-800">
        <button className="btn-secondary flex-1" onClick={onClose}>Отмена</button>
        <button
          className="btn-primary flex-1 flex items-center justify-center gap-2"
          disabled={!valid || saving}
          onClick={handleConfirm}
        >
          {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Применить
        </button>
      </div>
    </>
  )
}

function DebtCard({ debt }: { debt: Debt }) {
  const { deleteDebt, updateDebt } = useStore()
  const { settings } = useSettingsStore()
  const sym = settings.currencySymbol
  const [expanded, setExpanded] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [amortOpen, setAmortOpen] = useState(false)
  const [earlyPayOpen, setEarlyPayOpen] = useState(false)

  const metrics = useMemo(() => getDebtMetrics(debt), [debt])
  const pct = debt.totalAmount > 0 ? (1 - debt.remainingBalance / debt.totalAmount) * 100 : 0
  const paymentOk = useMemo(() => isPaymentSufficient(debt), [debt])

  // Remaining months based on contract end date
  const contractMonthsLeft = useMemo(() => {
    if (!debt.endDate) return null
    const end = new Date(debt.endDate)
    const now = new Date()
    const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth())
    return Math.max(0, months)
  }, [debt.endDate])

  return (
    <>
      <div className={clsx('card', !paymentOk && 'border-red-500/30')}>
        {!paymentOk && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <p className="text-xs text-red-400">Платёж не покрывает проценты — долг растёт!</p>
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-100">{debt.name}</h3>
              <span className="badge-yellow">{DEBT_TYPE_LABELS[debt.type]}</span>
              <span className="badge-red">{debt.interestRate}%</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{debt.notes}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              className="text-slate-400 hover:text-emerald-400 transition-colors"
              onClick={() => setEarlyPayOpen(true)}
              title="Досрочный платёж"
            >
              <Banknote className="w-4 h-4" />
            </button>
            <button
              className="text-slate-400 hover:text-violet-400 transition-colors"
              onClick={() => setAmortOpen(true)}
              title="График погашения"
            >
              <Calculator className="w-4 h-4" />
            </button>
            <button
              className="text-slate-400 hover:text-blue-400 transition-colors"
              onClick={() => setEditOpen(true)}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              className="text-slate-400 hover:text-red-400 transition-colors"
              onClick={() => {
                if (confirm(`Удалить долг "${debt.name}"?`)) deleteDebt(debt.id)
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Выплачено {pct.toFixed(1)}%</span>
            <span>{formatCurrency(debt.remainingBalance, sym)} осталось</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Платёж/мес</p>
            <p className="font-bold text-slate-100 text-sm">{formatCurrency(debt.monthlyPayment, sym)}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Переплата</p>
            <p className="font-bold text-red-400 text-sm">{formatCurrency(metrics.overpayment, sym)}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Закроется</p>
            <p className="font-bold text-slate-100 text-sm">{metrics.payoffDate}</p>
          </div>
        </div>

        <button
          className="w-full mt-3 text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1 py-1"
          onClick={() => setExpanded(v => !v)}
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Скрыть детали' : 'Детали'}
        </button>

        {expanded && (
          <div className="mt-2 pt-3 border-t border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Изначальная сумма:</span>
              <span className="text-slate-300 font-medium">{formatCurrency(debt.totalAmount, sym)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ставка:</span>
              <span className="text-slate-300 font-medium">{debt.interestRate}% год.</span>
            </div>
            {debt.startDate && (
              <div className="flex justify-between">
                <span className="text-slate-500">Начало кредита:</span>
                <span className="text-slate-300 font-medium">{debt.startDate}</span>
              </div>
            )}
            {debt.endDate && (
              <div className="flex justify-between">
                <span className="text-slate-500">Дата окончания по договору:</span>
                <span className="text-amber-400 font-medium">{debt.endDate}</span>
              </div>
            )}
            {contractMonthsLeft !== null && (
              <div className="flex justify-between">
                <span className="text-slate-500">По договору осталось:</span>
                <span className="text-amber-400 font-medium">{formatMonths(contractMonthsLeft)}</span>
              </div>
            )}
            {debt.originalTermMonths && (
              <div className="flex justify-between">
                <span className="text-slate-500">Срок по договору:</span>
                <span className="text-slate-300 font-medium">{formatMonths(debt.originalTermMonths)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Закроется (расчёт):</span>
              <span className="text-emerald-400 font-medium">{metrics.payoffDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Осталось (расчёт):</span>
              <span className="text-emerald-400 font-medium">{formatMonths(metrics.monthsLeft)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Всего выплатить:</span>
              <span className="text-slate-300 font-medium">{formatCurrency(metrics.totalPaid, sym)}</span>
            </div>
            {contractMonthsLeft !== null && contractMonthsLeft > metrics.monthsLeft && (
              <div className="mt-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-emerald-400">
                Математически закроется на <strong>{formatMonths(contractMonthsLeft - metrics.monthsLeft)}</strong> раньше срока — платёж выше минимального
              </div>
            )}
          </div>
        )}
      </div>

      {/* Early payment modal */}
      <Modal open={earlyPayOpen} onClose={() => setEarlyPayOpen(false)}>
        <EarlyPaymentModal debt={debt} onClose={() => setEarlyPayOpen(false)} />
      </Modal>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)}>
        <DebtForm
          initial={debt}
          onSave={(data) => { updateDebt(debt.id, data); setEditOpen(false) }}
          onClose={() => setEditOpen(false)}
        />
      </Modal>

      {/* Amortization modal */}
      <Modal open={amortOpen} onClose={() => setAmortOpen(false)}>
        <AmortizationTable debt={debt} onClose={() => setAmortOpen(false)} />
      </Modal>
    </>
  )
}

export default function Debts() {
  const { debts, addDebt } = useStore()
  const { settings } = useSettingsStore()
  const sym = settings.currencySymbol
  const [addOpen, setAddOpen] = useState(false)

  const totalDebt = debts.reduce((s, d) => s + d.remainingBalance, 0)
  const totalOverpayment = useMemo(
    () => debts.reduce((s, d) => s + getDebtMetrics(d).overpayment, 0),
    [debts]
  )
  const totalMonthlyPayment = debts.reduce((s, d) => s + d.monthlyPayment, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Долги</h1>
          <p className="text-slate-400 text-sm mt-1">Кредиты, ипотеки, рассрочки</p>
        </div>
        <button className="btn-primary flex items-center gap-2 shrink-0" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" /> Добавить долг
        </button>
      </div>

      {debts.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-xs text-slate-500 mb-2">Общий долг</p>
            <p className="text-xl font-bold text-red-400">{formatCurrency(totalDebt, sym)}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-slate-500 mb-2">Платёж в мес.</p>
            <p className="text-xl font-bold text-amber-400">{formatCurrency(totalMonthlyPayment, sym)}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-slate-500 mb-2">Итого переплата</p>
            <p className="text-xl font-bold text-slate-300">{formatCurrency(totalOverpayment, sym)}</p>
          </div>
        </div>
      )}

      {debts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-slate-600" />
          </div>
          <div>
            <p className="text-slate-300 font-medium">Долгов нет</p>
            <p className="text-slate-500 text-sm">Добавь кредит или ипотеку для отслеживания</p>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Добавить первый долг
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {debts.map(debt => <DebtCard key={debt.id} debt={debt} />)}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)}>
        <DebtForm
          onSave={(data) => {
            addDebt(data)
            setAddOpen(false)
          }}
          onClose={() => setAddOpen(false)}
        />
      </Modal>
    </div>
  )
}
