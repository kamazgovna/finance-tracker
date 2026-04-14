export function formatCurrency(amount: number, symbol = '₽', locale = 'ru-RU'): string {
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
  return `${formatted} ${symbol}`
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

export function formatMonths(months: number): string {
  const years = Math.floor(months / 12)
  const m = months % 12
  if (years === 0) return `${m} мес.`
  if (m === 0) return `${years} лет`
  return `${years} л. ${m} мес.`
}

export function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100
  const rem = abs % 10
  if (abs >= 11 && abs <= 19) return many
  if (rem === 1) return one
  if (rem >= 2 && rem <= 4) return few
  return many
}
