export type DebtType = 'mortgage' | 'car' | 'creditCard' | 'personal' | 'other'
export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'utilities'
  | 'housing'
  | 'healthcare'
  | 'entertainment'
  | 'clothing'
  | 'education'
  | 'subscriptions'
  | 'debtPayment'
  | 'other'

export type IncomeCategory = 'salary' | 'freelance' | 'investment' | 'rental' | 'bonus' | 'other'
export type Frequency = 'monthly' | 'weekly' | 'biweekly' | 'quarterly' | 'yearly' | 'oneTime'

export interface Debt {
  id: string
  name: string
  type: DebtType
  totalAmount: number
  remainingBalance: number
  interestRate: number // Annual % (APR)
  monthlyPayment: number
  startDate: string
  notes?: string
}

export interface IncomeSource {
  id: string
  name: string
  amount: number
  frequency: Frequency
  category: IncomeCategory
  date?: string
  notes?: string
}

export interface Expense {
  id: string
  name: string
  amount: number
  category: ExpenseCategory
  date: string
  recurring: boolean
  frequency?: 'monthly' | 'weekly' | 'yearly'
  notes?: string
}

export interface Settings {
  currency: string
  currencySymbol: string
  locale: string
  name: string
}

export interface AmortizationRow {
  month: number
  date: string
  payment: number
  principal: number
  interest: number
  balance: number
  totalInterestPaid: number
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: 'Еда и продукты',
  transport: 'Транспорт',
  utilities: 'Коммунальные',
  housing: 'Жильё',
  healthcare: 'Здоровье',
  entertainment: 'Развлечения',
  clothing: 'Одежда',
  education: 'Образование',
  subscriptions: 'Подписки',
  debtPayment: 'Выплата долгов',
  other: 'Прочее',
}

export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food: '#f59e0b',
  transport: '#3b82f6',
  utilities: '#8b5cf6',
  housing: '#ec4899',
  healthcare: '#10b981',
  entertainment: '#f97316',
  clothing: '#06b6d4',
  education: '#84cc16',
  subscriptions: '#a78bfa',
  debtPayment: '#ef4444',
  other: '#6b7280',
}

export const INCOME_CATEGORY_LABELS: Record<IncomeCategory, string> = {
  salary: 'Зарплата',
  freelance: 'Фриланс',
  investment: 'Инвестиции',
  rental: 'Аренда',
  bonus: 'Бонус / Премия',
  other: 'Прочее',
}

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  mortgage: 'Ипотека',
  car: 'Автокредит',
  creditCard: 'Кредитная карта',
  personal: 'Потреб. кредит',
  other: 'Другой долг',
}
