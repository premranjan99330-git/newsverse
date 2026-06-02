import { Link, useSearchParams, useLocation } from 'react-router-dom'
import { CATEGORIES } from '../../utils/dummyData'
import clsx from 'clsx'

export default function CategoryNav() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const active = searchParams.get('category') || 'all'

  return (
    <div className="border-b border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-950 sticky top-14 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none py-0.5">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.id}
              to={cat.id === 'all' ? '/' : `/?category=${cat.id}`}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap font-medium transition-all duration-200 border-b-2 -mb-px',
                active === cat.id
                  ? 'border-flame-500 text-flame-500'
                  : 'border-transparent text-ink-500 dark:text-ink-400 hover:text-ink-800 dark:hover:text-ink-200'
              )}
            >
              <span className="text-base leading-none">{cat.icon}</span>
              {cat.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
