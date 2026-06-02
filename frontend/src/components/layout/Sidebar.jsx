import { Link } from 'react-router-dom'
import { TrendingUp, Flame, ExternalLink, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { newsApi } from '../../services/api'
import { formatNumber, timeAgo, getCategoryColor } from '../../utils/helpers'
import { CATEGORIES } from '../../utils/dummyData'
import clsx from 'clsx'

function TrendingCard({ article, rank }) {
  return (
    <Link to={`/article/${article.id}`} className="flex gap-3 group p-2 -mx-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800/50 transition-colors">
      <span className="font-display font-bold text-2xl text-ink-200 dark:text-ink-700 leading-none w-6 shrink-0 pt-0.5">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium line-clamp-2 group-hover:text-flame-500 transition-colors leading-snug">{article.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={clsx('badge', getCategoryColor(article.category))}>{article.category}</span>
          <span className="text-xs text-ink-400 font-mono">{formatNumber(article.upvotes)} pts</span>
        </div>
      </div>
    </Link>
  )
}

export default function Sidebar() {
  const [trending, setTrending] = useState([])

  useEffect(() => {
    newsApi.getTrending().then(setTrending)
  }, [])

  return (
    <aside className="space-y-4">
      {/* Trending */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-flame-500" />
          <h3 className="font-display font-bold text-sm uppercase tracking-wider">Trending Today</h3>
        </div>
        <div className="space-y-1">
          {trending.map((article, i) => (
            <TrendingCard key={article.id} article={article} rank={i + 1} />
          ))}
        </div>
      </div>

      {/* Fact Check CTA */}
      <div className="card p-4 border-sage-400/30 bg-gradient-to-br from-sage-400/5 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={16} className="text-sage-500" />
          <h3 className="font-display font-bold text-sm">Fake News Detector</h3>
        </div>
        <p className="text-xs text-ink-500 dark:text-ink-400 mb-3 leading-relaxed">
          Got a suspicious WhatsApp forward? Paste any news and we'll fact-check it instantly.
        </p>
        <Link to="/factcheck" className="block w-full text-center text-sm font-medium bg-sage-500 hover:bg-sage-400 text-white py-2 rounded-lg transition-colors">
          Check Now →
        </Link>
      </div>

      {/* Categories */}
      <div className="card p-4">
        <h3 className="font-display font-bold text-sm uppercase tracking-wider mb-3">Browse Topics</h3>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
            <Link
              key={cat.id}
              to={`/?category=${cat.id}`}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-ink-100 dark:bg-ink-800 hover:bg-flame-50 dark:hover:bg-flame-950/30 hover:text-flame-500 transition-colors"
            >
              {cat.icon} {cat.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-1">
        <p className="text-xs text-ink-400 leading-relaxed">
          © 2026 Newsverse · Built with{' '}
          <span className="text-flame-500">♥</span> in Jaipur
        </p>
      </div>
    </aside>
  )
}
