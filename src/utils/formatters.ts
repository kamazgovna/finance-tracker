export function formatCurrency(amount: number, symbol = '₽'): string {
  const abs = Math.round(Math.abs(amount))
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return amount < 0 ? `−${formatted} ${symbol}` : `${formatted} ${symbol}`
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

export function formatMonths(months: number): string {
  if (months <= 0) return '0 мес.'
  const years = Math.floor(months / 12)
  const m = months % 12
  if (years === 0) return `${m} мес.`
  if (m === 0) return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`
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
