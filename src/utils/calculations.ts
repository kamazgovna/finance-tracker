import { Debt, IncomeSource, Expense, AmortizationRow } from '../types'
import { addMonths, subMonths, format, startOfMonth, endOfMonth, isWithinInterval, parseISO, isSameMonth } from 'date-fns'
import { ru } from 'date-fns/locale'

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
  return {
    totalPaid,
    totalInterest,
    overpayment: totalInterest,
    monthsLeft: rows.length,
    payoffDate: rows[rows.length - 1]?.date ?? '—',
    insufficient: !isPaymentSufficient(debt, extraPayment),
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
      case 'oneTime': return sum
      default: return sum
    }
  }, 0)
}

// Income total for a specific month, respecting start dates and one-time entries
export function getMonthlyIncomeTotalForMonth(sources: IncomeSource[], month: Date): number {
  const monthStart = startOfMonth(month)
  const currentMonthStart = startOfMonth(new Date())
  return sources.reduce((sum, s) => {
    if (s.date) {
      const srcDate = parseISO(s.date)
      if (s.frequency === 'oneTime') {
        // One-time: only count in the exact month it was received
        return isSameMonth(srcDate, month) ? sum + s.amount : sum
      }
      // Recurring: only count if it started on or before this month
      if (startOfMonth(srcDate) > monthStart) return sum
    } else {
      // No date set: only count from current month onwards (no history)
      if (monthStart < currentMonthStart) return sum
      if (s.frequency === 'oneTime') return sum
    }
    switch (s.frequency) {
      case 'monthly': return sum + s.amount
      case 'weekly': return sum + s.amount * 4.33
      case 'biweekly': return sum + s.amount * 2.17
      case 'quarterly': return sum + s.amount / 3
      case 'yearly': return sum + s.amount / 12
      default: return sum
    }
  }, 0)
}

export function getExpensesForMonth(expenses: Expense[], month: Date): number {
  return expenses.reduce((sum, e) => {
    if (e.recurring) {
      switch (e.frequency) {
        case 'weekly': return sum + e.amount * 4.33
        case 'yearly': return sum + e.amount / 12
        default: return sum + e.amount
      }
    } else {
      const expDate = parseISO(e.date)
      if (isWithinInterval(expDate, { start: startOfMonth(month), end: endOfMonth(month) })) {
        return sum + e.amount
      }
      return sum
    }
  }, 0)
}

// Alias for backward compat
export function getMonthlyExpensesTotal(expenses: Expense[], month?: Date): number {
  return getExpensesForMonth(expenses, month ?? new Date())
}

export function getExpensesForMonthByCategory(expenses: Expense[], month: Date): Record<string, number> {
  const byCategory: Record<string, number> = {}
  expenses.forEach(e => {
    let amount = 0
    if (e.recurring) {
      amount = e.frequency === 'weekly' ? e.amount * 4.33
        : e.frequency === 'yearly' ? e.amount / 12
        : e.amount
    } else {
      const expDate = parseISO(e.date)
      if (isWithinInterval(expDate, { start: startOfMonth(month), end: endOfMonth(month) })) {
        amount = e.amount
      }
    }
    if (amount > 0) byCategory[e.category] = (byCategory[e.category] ?? 0) + amount
  })
  return byCategory
}

export function getExpensesByCategory(expenses: Expense[]) {
  return getExpensesForMonthByCategory(expenses, new Date())
}

// Filter expenses list for display in a given month
export function filterExpensesForMonth(expenses: Expense[], month: Date): Expense[] {
  return expenses.filter(e => {
    if (e.recurring) return true
    const expDate = parseISO(e.date)
    return isSameMonth(expDate, month)
  })
}

export function get6MonthChartData(expenses: Expense[], income: IncomeSource[], debts: Debt[]) {
  const debtPayments = getMonthlyDebtPayments(debts)

  return Array.from({ length: 6 }, (_, i) => {
    const month = startOfMonth(subMonths(new Date(), 5 - i))
    const inc = getMonthlyIncomeTotalForMonth(income, month)
    const exp = getExpensesForMonth(expenses, month)
    return {
      month: format(month, 'LLL', { locale: ru }),
      fullMonth: format(month, 'LLLL yyyy', { locale: ru }),
      income: Math.round(inc),
      expenses: Math.round(exp),
      debts: Math.round(debtPayments),
      free: Math.round(inc - exp - debtPayments),
    }
  })
}

export function getUserBreakdown(expenses: Expense[], month: Date) {
  const result: Record<string, number> = {}
  expenses.forEach(e => {
    const name = e.createdByName ?? 'Другой'
    let amount = 0
    if (e.recurring) {
      amount = e.frequency === 'weekly' ? e.amount * 4.33
        : e.frequency === 'yearly' ? e.amount / 12
        : e.amount
    } else {
      const expDate = parseISO(e.date)
      if (isWithinInterval(expDate, { start: startOfMonth(month), end: endOfMonth(month) })) {
        amount = e.amount
      }
    }
    if (amount > 0) result[name] = (result[name] ?? 0) + amount
  })
  return result
}

export function getTotalDebt(debts: Debt[]): number {
  return debts.reduce((s, d) => s + d.remainingBalance, 0)
}

export function getMonthlyDebtPayments(debts: Debt[]): number {
  return debts.reduce((s, d) => s + d.monthlyPayment, 0)
}

export function getFreeMoneyAfterObligations(
  income: IncomeSource[],
  expenses: Expense[],
  debts: Debt[],
  month: Date
): number {
  const totalIncome = getMonthlyIncomeTotalForMonth(income, month)
  const recurringExp = expenses
    .filter(e => e.recurring)
    .reduce((s, e) => s + (e.frequency === 'weekly' ? e.amount * 4.33 : e.frequency === 'yearly' ? e.amount / 12 : e.amount), 0)
  const debtPayments = getMonthlyDebtPayments(debts)
  const oneTimeExp = expenses
    .filter(e => !e.recurring)
    .reduce((s, e) => {
      const d = parseISO(e.date)
      return isWithinInterval(d, { start: startOfMonth(month), end: endOfMonth(month) }) ? s + e.amount : s
    }, 0)
  return totalIncome - recurringExp - debtPayments - oneTimeExp
}
