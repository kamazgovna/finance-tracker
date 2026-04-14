import { useMemo } from 'react'
import { useStore, useSettingsStore } from '../store/useStore'
import {
  getMonthlyIncomeTotal,
  getMonthlyExpensesTotal,
  getTotalDebt,
  getMonthlyDebtPayments,
  getExpensesByCategory,
} from '../utils/calculations'
import { formatCurrency } from '../utils/formatters'
import {
  TrendingUp, TrendingDown, CreditCard, Wallet,
  AlertCircle, CheckCircle2, ArrowRight
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend
} from 'recharts'
import { EXPENSE_CATEGORY_COLORS, EXPENSE_CATEGORY_LABELS } from '../types'
import { Link } from 'react-router-dom'
import clsx from 'clsx'

function MetricCard({
  label, value, sub, icon: Icon, color, trend
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: 'green' | 'red' | 'blue' | 'yellow' | 'purple'
  trend?: 'up' | 'down' | 'neutral'
}) {
  const colorMap = {
    green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    yellow: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    purple: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  }
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center border', colorMap[color])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

const RADIAN = Math.PI / 180
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function Dashboard() {
  const { debts, income, expenses } = useStore()
  const { settings } = useSettingsStore()
  const sym = settings.currencySymbol

  const monthlyIncome = useMemo(() => getMonthlyIncomeTotal(income), [income])
  const monthlyExpenses = useMemo(() => getMonthlyExpensesTotal(expenses), [expenses])
  const totalDebt = useMemo(() => getTotalDebt(debts), [debts])
  const monthlyDebtPayments = useMemo(() => getMonthlyDebtPayments(debts), [debts])
  const cashFlow = monthlyIncome - monthlyExpenses - monthlyDebtPayments

  const expensesByCategory = useMemo(() => {
    const byCat = getExpensesByCategory(expenses)
    return Object.entries(byCat).map(([cat, amount]) => ({
      name: EXPENSE_CATEGORY_LABELS[cat as keyof typeof EXPENSE_CATEGORY_LABELS] ?? cat,
      value: amount,
      color: EXPENSE_CATEGORY_COLORS[cat as keyof typeof EXPENSE_CATEGORY_COLORS] ?? '#6b7280',
      category: cat,
    })).filter(e => e.value > 0).sort((a, b) => b.value - a.value)
  }, [expenses])

  const totalMonthlyOut = monthlyExpenses + monthlyDebtPayments

  // Bar chart data — income vs expenses breakdown
  const barData = [
    { name: 'Доходы', value: monthlyIncome, fill: '#10b981' },
    { name: 'Расходы', value: monthlyExpenses, fill: '#f59e0b' },
    { name: 'Долги', value: monthlyDebtPayments, fill: '#ef4444' },
  ]

  const isEmpty = debts.length === 0 && income.length === 0 && expenses.length === 0

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Wallet className="w-10 h-10 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Добро пожаловать!</h2>
          <p className="text-slate-400 max-w-sm">
            Начни добавлять свои доходы, расходы и долги — и здесь появится полная картина твоих финансов.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/income" className="btn-primary flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Добавить доход
          </Link>
          <Link to="/expenses" className="btn-secondary flex items-center gap-2">
            <TrendingDown className="w-4 h-4" /> Добавить расход
          </Link>
          <Link to="/debts" className="btn-secondary flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Добавить долг
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Дашборд</h1>
        <p className="text-slate-400 text-sm mt-1">Общая картина твоих финансов</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Доход / мес"
          value={formatCurrency(monthlyIncome, sym)}
          icon={TrendingUp}
          color="green"
        />
        <MetricCard
          label="Расходы / мес"
          value={formatCurrency(totalMonthlyOut, sym)}
          sub={`+${formatCurrency(monthlyDebtPayments, sym)} долги`}
          icon={TrendingDown}
          color="red"
        />
        <MetricCard
          label="Свободно / мес"
          value={formatCurrency(cashFlow, sym)}
          sub={cashFlow >= 0 ? 'Положительный поток' : 'Дефицит!'}
          icon={cashFlow >= 0 ? CheckCircle2 : AlertCircle}
          color={cashFlow >= 0 ? 'green' : 'red'}
        />
        <MetricCard
          label="Долги всего"
          value={formatCurrency(totalDebt, sym)}
          sub={`${debts.length} ${debts.length === 1 ? 'кредит' : debts.length < 5 ? 'кредита' : 'кредитов'}`}
          icon={CreditCard}
          color="yellow"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="card">
          <h3 className="font-semibold text-slate-200 mb-4">Денежный поток</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}к`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, color: '#f1f5f9' }}
                formatter={(v: number) => [formatCurrency(v, sym), '']}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {barData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <h3 className="font-semibold text-slate-200 mb-4">Расходы по категориям</h3>
          {expensesByCategory.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    labelLine={false}
                    label={CustomLabel}
                  >
                    {expensesByCategory.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, color: '#f1f5f9' }}
                    formatter={(v: number) => [formatCurrency(v, sym), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 overflow-hidden">
                {expensesByCategory.slice(0, 6).map((e) => (
                  <div key={e.category} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }} />
                    <span className="text-slate-400 truncate flex-1">{e.name}</span>
                    <span className="text-slate-300 font-medium shrink-0">{formatCurrency(e.value, sym)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
              Нет данных по расходам
            </div>
          )}
        </div>
      </div>

      {/* Debts summary */}
      {debts.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200">Долги</h3>
            <Link to="/debts" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              Все долги <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {debts.slice(0, 4).map((debt) => {
              const pct = debt.totalAmount > 0 ? (1 - debt.remainingBalance / debt.totalAmount) * 100 : 0
              return (
                <div key={debt.id} className="bg-slate-800/50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{debt.name}</p>
                      <p className="text-xs text-slate-500">{debt.interestRate}% годовых</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-100">{formatCurrency(debt.remainingBalance, sym)}</p>
                      <p className="text-xs text-slate-500">{formatCurrency(debt.monthlyPayment, sym)}/мес</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{pct.toFixed(0)}% выплачено</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
