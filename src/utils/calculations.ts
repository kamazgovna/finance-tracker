import { Debt, IncomeSource, Expense, AmortizationRow } from '../types'
import { addMonths, format, startOfMonth, isWithinInterval, parseISO } from 'date-fns'

export function isPaymentSufficient(debt: Debt, extraPayment = 0): boolean {
  if (debt.interestRate === 0) return true
  const monthlyInterest = debt.remainingBalance * (debt.interestRate / 100 / 12)
  return (debt.monthlyPayment + extraPayment) > monthlyInterest
}

export function calculateAmortization(debt: Debt, extraPayment = 0): AmortizationRow[] {
  const monthlyRate = debt.interestRate / 100 / 12
  const rows: AmortizationRow[] = []
  let balance = debt.remainingBalance
  let totalInterestPaid = 0
  const startDate = new Date()
  let month = 0

  while (balance > 0.01 && month < 600) {
    const interest = balance * monthlyRate
    const principal = debt.monthlyPayment + extraPayment - interest

    // Payment doesn't cover interest — debt is growing, stop
    if (principal <= 0) break

    const actualPayment = Math.min(debt.monthlyPayment + extraPayment, balance + interest)
    const actualPrincipal = Math.min(principal, balance)
    balance = Math.max(0, balance - actualPrincipal)
    totalInterestPaid += interest

    rows.push({
      month: month + 1,
      date: format(addMonths(startDate, month), 'MM.yyyy'),
      payment: actualPayment,
      principal: actualPrincipal,
      interest,
      balance,
      totalInterestPaid,
    })

    month++
    if (balance <= 0) break
  }

  return rows
}

export function getDebtMetrics(debt: Debt, extraPayment = 0) {
  const rows = calculateAmortization(debt, extraPayment)
  const totalPaid = rows.reduce((s, r) => s + r.payment, 0)
  const totalInterest = rows.reduce((s, r) => s + r.interest, 0)
  const sufficient = isPaymentSufficient(debt, extraPayment)
  return {
    totalPaid,
    totalInterest,
    overpayment: totalInterest,
    monthsLeft: rows.length,
    payoffDate: rows[rows.length - 1]?.date ?? '—',
    insufficient: !sufficient,
  }
}

export function getMonthlyIncomeTotal(sources: IncomeSource[]): number {
  return sources.reduce((sum, s) => {
    switch (s.frequency) {
      case 'monthly': return sum + s.amount
      case 'weekly': return sum + s.amount * 4.33
      case 'biweekly': return sum + s.amount * 2.17
      case 'quarterly': return sum + s.amount / 3
      case 'yearly': return sum + s.amount / 12
      case 'oneTime': return sum // Don't include one-time in monthly
      default: return sum
    }
  }, 0)
}

export function getMonthlyExpensesTotal(expenses: Expense[], month?: Date): number {
  const target = month ?? startOfMonth(new Date())
  return expenses.reduce((sum, e) => {
    if (e.recurring) {
      // Always count recurring expenses
      switch (e.frequency) {
        case 'monthly': return sum + e.amount
        case 'weekly': return sum + e.amount * 4.33
        case 'yearly': return sum + e.amount / 12
        default: return sum + e.amount
      }
    } else {
      // Count one-off expenses only if they're in the target month
      const expDate = parseISO(e.date)
      const monthStart = startOfMonth(target)
      const monthEnd = new Date(target.getFullYear(), target.getMonth() + 1, 0)
      if (isWithinInterval(expDate, { start: monthStart, end: monthEnd })) {
        return sum + e.amount
      }
      return sum
    }
  }, 0)
}

export function getExpensesByCategory(expenses: Expense[]) {
  const byCategory: Record<string, number> = {}
  expenses.forEach(e => {
    const monthly = e.recurring
      ? e.frequency === 'weekly' ? e.amount * 4.33
      : e.frequency === 'yearly' ? e.amount / 12
      : e.amount
      : e.amount
    byCategory[e.category] = (byCategory[e.category] ?? 0) + monthly
  })
  return byCategory
}

export function getTotalDebt(debts: Debt[]): number {
  return debts.reduce((s, d) => s + d.remainingBalance, 0)
}

export function getMonthlyDebtPayments(debts: Debt[]): number {
  return debts.reduce((s, d) => s + d.monthlyPayment, 0)
}
