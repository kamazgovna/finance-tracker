import { useRef, useState } from 'react'
import { useStore, useSettingsStore } from '../store/useStore'
import { useAuth } from '../contexts/AuthContext'
import { Settings, LogOut, AlertTriangle, Download, Upload } from 'lucide-react'

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
  const { settings, updateSettings } = useSettingsStore()
  const {
    debts, income, expenses, budgets, goals,
    addDebt, addIncome, addExpense, setBudget, addGoal, clearAllData,
  } = useStore()
  const { user, signOut } = useAuth()
  const [confirmClear, setConfirmClear] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleExport = () => {
    const data = { debts, income, expenses, budgets, goals, settings, exportedAt: new Date().toISOString(), version: 1 }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finance-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (file: File | undefined) => {
    if (!file) return
    if (!confirm('Импорт заменит текущие данные в облаке. Продолжить?')) return
    setBusy(true)
    try {
      const raw = await file.text()
      const data = JSON.parse(raw)
      await clearAllData()
      if (data.settings) updateSettings(data.settings)
      for (const debt of data.debts ?? []) {
        const { id: _id, createdBy: _createdBy, createdByName: _createdByName, ...payload } = debt
        await addDebt(payload)
      }
      for (const source of data.income ?? []) {
        const { id: _id, createdBy: _createdBy, createdByName: _createdByName, ...payload } = source
        await addIncome(payload)
      }
      for (const expense of data.expenses ?? []) {
        const { id: _id, createdBy: _createdBy, createdByName: _createdByName, ...payload } = expense
        await addExpense(payload)
      }
      for (const budget of data.budgets ?? []) {
        await setBudget(budget.category, Number(budget.monthlyLimit ?? 0))
      }
      for (const goal of data.goals ?? []) {
        const { id: _id, ...payload } = goal
        await addGoal(payload)
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка импорта')
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Точно удалить все финансовые данные из облака?')) return
    setBusy(true)
    try {
      await clearAllData()
      setConfirmClear(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка очистки')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Настройки</h1>
        <p className="text-slate-400 text-sm mt-1">Персонализация и управление данными</p>
      </div>

      {/* Account */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-slate-200 flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-400" /> Аккаунт
        </h3>
        <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-3">
          <div>
            <p className="text-sm font-medium text-slate-300">{user?.email}</p>
            <p className="text-xs text-slate-500">Вошли как</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Выйти
          </button>
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

      {/* Stats */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-slate-200">Данные в облаке</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-2xl font-bold text-slate-100">{debts.length}</p>
            <p className="text-xs text-slate-500 mt-1">Долгов</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-2xl font-bold text-slate-100">{income.length}</p>
            <p className="text-xs text-slate-500 mt-1">Доходов</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-2xl font-bold text-slate-100">{expenses.length}</p>
            <p className="text-xs text-slate-500 mt-1">Расходов</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-2xl font-bold text-slate-100">{budgets.length}</p>
            <p className="text-xs text-slate-500 mt-1">Лимитов</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-2xl font-bold text-slate-100">{goals.length}</p>
            <p className="text-xs text-slate-500 mt-1">Целей</p>
          </div>
        </div>
        <p className="text-xs text-slate-600 text-center">
          Данные синхронизируются между всеми устройствами
        </p>
      </div>

      {/* Export */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-slate-200">Резервная копия</h3>
        <p className="text-xs text-slate-500">Скачать или восстановить все данные в JSON</p>
        <div className="flex flex-wrap gap-3">
          <button className="btn-secondary flex items-center gap-2" onClick={handleExport} disabled={busy}>
            <Download className="h-4 w-4" /> Экспорт JSON
          </button>
          <button className="btn-secondary flex items-center gap-2" onClick={() => fileInputRef.current?.click()} disabled={busy}>
            <Upload className="h-4 w-4" /> Импорт JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => handleImport(e.target.files?.[0])}
          />
        </div>
      </div>

      {/* Danger zone */}
      <div className="card border-red-500/20 space-y-3">
        <h3 className="font-semibold text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Опасная зона
        </h3>
        {!confirmClear ? (
          <button className="btn-danger flex items-center gap-2" onClick={() => setConfirmClear(true)}>
            Очистить все данные
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-400">Данные будут удалены из облака у всех пользователей. Это необратимо.</p>
            <div className="flex gap-3">
              <button className="btn-secondary" onClick={() => setConfirmClear(false)}>Отмена</button>
              <button
                className="bg-red-500 hover:bg-red-400 text-white font-semibold px-4 py-2 rounded-xl transition-all"
                disabled={busy}
                onClick={handleClearAll}
              >
                {busy ? 'Удаляю...' : 'Да, удалить'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
