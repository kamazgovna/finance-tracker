import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, isSameMonth } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useMonthStore } from '../store/useMonthStore'
import clsx from 'clsx'

export default function MonthSelector({ className }: { className?: string }) {
  const { selectedMonth, next, prev, reset } = useMonthStore()
  const isCurrentMonth = isSameMonth(selectedMonth, new Date())

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <button
        onClick={prev}
        className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center
                   text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-all"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <button
        onClick={reset}
        className={clsx(
          'px-3 h-8 rounded-lg text-sm font-medium border transition-all min-w-[130px] text-center',
          isCurrentMonth
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
        )}
      >
        {format(selectedMonth, 'LLLL yyyy', { locale: ru })}
      </button>

      <button
        onClick={next}
        className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center
                   text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-all"
        disabled={isCurrentMonth}
      >
        <ChevronRight className={clsx('w-4 h-4', isCurrentMonth && 'opacity-30')} />
      </button>
    </div>
  )
}
