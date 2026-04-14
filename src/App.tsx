import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, CreditCard, TrendingUp, ShoppingCart, Settings,
  Menu, X, DollarSign, LogOut, Loader2, PiggyBank, Target
} from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useStore } from './store/useStore'
import Dashboard from './components/Dashboard'
import Debts from './components/Debts'
import Income from './components/Income'
import Expenses from './components/Expenses'
import Budgets from './components/Budgets'
import Goals from './components/Goals'
import SettingsPage from './components/SettingsPage'
import LoginPage from './components/LoginPage'
import clsx from 'clsx'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Бюджет' },
  { to: '/debts', icon: CreditCard, label: 'Долги' },
  { to: '/income', icon: TrendingUp, label: 'Доходы' },
  { to: '/expenses', icon: ShoppingCart, label: 'Расходы' },
  { to: '/budgets', icon: PiggyBank, label: 'Лимиты' },
  { to: '/goals', icon: Target, label: 'Цели' },
  { to: '/settings', icon: Settings, label: 'Настройки' },
]

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signOut } = useAuth()

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onClose} />
      )}
      <aside className={clsx(
        'fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-800 z-40',
        'flex flex-col transition-transform duration-300',
        'lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="font-bold text-slate-100 text-sm">Finance Tracker</p>
            <p className="text-xs text-slate-500">Личный бюджет</p>
          </div>
          <button className="ml-auto lg:hidden text-slate-400 hover:text-slate-200" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              )}
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-800 space-y-2">
          <div className="px-3 py-2">
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full
                       text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Выйти
          </button>
        </div>
      </aside>
    </>
  )
}

function AppContent() {
  const { session, loading: authLoading } = useAuth()
  const { fetchAll, initialized, loading: dataLoading } = useStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (session && !initialized) {
      fetchAll()
    }
  }, [session, initialized, fetchAll])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    )
  }

  if (!session) return <LoginPage />

  if (!initialized && dataLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        <p className="text-slate-400">Загружаем данные...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 lg:ml-64 min-h-screen">
        <header className="lg:hidden sticky top-0 z-20 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-slate-200">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm">Finance Tracker</span>
          </div>
        </header>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/debts" element={<Debts />} />
            <Route path="/income" element={<Income />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </HashRouter>
  )
}
