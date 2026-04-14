import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Settings, Download, Upload, Trash2, AlertTriangle } from 'lucide-react'

const CURRENCIES = [
  { code: 'RUB', symbol: '₽', label: 'Российский рубль' },
  { code: 'USD', symbol: '$', label: 'Доллар США' },
  { code: 'EUR', symbol: '€', label: 'Евро' },
  { code: 'GBP', symbol: '£', label: 'Фунт стерлингов' },
  { code: 'KZT', symbol: '₸', label: 'Казахстанский тенге' },
  { code: 'UAH', symbol: '₴', label: 'Украинская гривна' },
  { code: 'BYN', symbol: 'Br', label: 'Белорусский рубль' },
]

export default function SettingsPage() {
  const { settings, updateSettings, debts, income, expenses } = useStore()
  const [confirmClear, setConfirmClear] = useState(false)

  const handleExport = () => {
    const data = { debts, income, expenses, settings, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finance-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.debts) useStore.getState().debts.splice(0, 999, ...data.debts)
        // Use store methods to update
        if (data.settings) updateSettings(data.settings)
        localStorage.setItem('finance-tracker-data', JSON.stringify({
          state: {
            debts: data.debts ?? [],
            income: data.income ?? [],
            expenses: data.expenses ?? [],
            settings: data.settings ?? settings,
          },
          version: 0,
        }))
        window.location.reload()
      } catch {
        alert('Ошибка импорта: неверный формат файла')
      }
    }
    reader.readAsText(file)
  }

  const handleClearAll = () => {
    localStorage.removeItem('finance-tracker-data')
    window.location.reload()
  }

  const selectedCurrency = CURRENCIES.find(c => c.code === settings.currency) ?? CURRENCIES[0]

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Настройки</h1>
        <p className="text-slate-400 text-sm mt-1">Персонализация и управление данными</p>
      </div>

      {/* Profile */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-200 flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-400" /> Профиль
        </h3>
        <div>
          <label className="label">Имя (опционально)</label>
          <input
            className="input"
            placeholder="Иван"
            value={settings.name}
            onChange={e => updateSettings({ name: e.target.value })}
          />
        </div>
      </div>

      {/* Currency */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-200">Валюта</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CURRENCIES.map(c => (
            <button
              key={c.code}
              onClick={() => updateSettings({ currency: c.code, currencySymbol: c.symbol })}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                settings.currency === c.code
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                  : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span className="text-xl font-bold w-8 text-center">{c.symbol}</span>
              <div>
                <p className="text-sm font-medium">{c.code}</p>
                <p className="text-xs text-slate-500">{c.label}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Data stats */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-slate-200">Данные</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-2xl font-bold text-slate-100">{debts.length}</p>
            <p className="text-xs text-slate-500 mt-1">Долгов</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-2xl font-bold text-slate-100">{income.length}</p>
            <p className="text-xs text-slate-500 mt-1">Источников дохода</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-2xl font-bold text-slate-100">{expenses.length}</p>
            <p className="text-xs text-slate-500 mt-1">Расходов</p>
          </div>
        </div>
        <p className="text-xs text-slate-600 text-center">
          Все данные хранятся в localStorage вашего браузера
        </p>
      </div>

      {/* Export / Import */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-slate-200">Экспорт и импорт</h3>
        <p className="text-xs text-slate-500">Сохраните резервную копию или перенесите данные на другое устройство</p>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" /> Экспорт JSON
          </button>
          <label className="btn-secondary flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" /> Импорт JSON
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card border-red-500/20 space-y-3">
        <h3 className="font-semibold text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Опасная зона
        </h3>
        {!confirmClear ? (
          <button
            className="btn-danger flex items-center gap-2"
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 className="w-4 h-4" /> Очистить все данные
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-400">Вы уверены? Все данные будут удалены безвозвратно.</p>
            <div className="flex gap-3">
              <button className="btn-secondary" onClick={() => setConfirmClear(false)}>Отмена</button>
              <button
                className="bg-red-500 hover:bg-red-400 text-white font-semibold px-4 py-2 rounded-xl transition-all"
                onClick={handleClearAll}
              >
                Да, удалить всё
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
