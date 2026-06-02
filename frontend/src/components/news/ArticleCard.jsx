import { Link } from 'react-router-dom'
import { ArrowUp, ArrowDown, MessageSquare, Share2, Bookmark, ExternalLink, Clock } from 'lucide-react'
import { useState } from 'react'
import { newsApi } from '../../services/api'
import { timeAgo, formatNumber, getCategoryColor, getInitials } from '../../utils/helpers'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'

export default function ArticleCard({ article, featured = false }) {
  const { user, openLogin } = useAuth()
  const [upvotes, setUpvotes] = useState(article.upvotes)
  const [vote, setVote] = useState(article.user_vote)
  const [saved, setSaved] = useState(false)

  const handleVote = async (dir) => {
    if (!user) { openLogin(); return }
    const newVote = vote === dir ? null : dir
    setVote(newVote)
    setUpvotes(prev => {
      let delta = 0
      if (vote === 'up' && dir === 'up') delta = -1
      else if (vote === 'down' && dir === 'down') delta = 1
      else if (dir === 'up') delta = vote === 'down' ? 2 : 1
      else delta = vote === 'up' ? -2 : -1
      return prev + delta
    })
    await newsApi.vote(article.id, newVote)
  }

  if (featured) {
    return (
      <div className="card card-hover overflow-hidden animate-fade-in">
        <div className="relative h-56 sm:h-72 bg-ink-200 dark:bg-ink-800">
          {article.image_url && (
            <img src={article.image_url} alt={article.title} className="w-full h-full object-cover" loading="lazy" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <span className={clsx('badge mb-2', getCategoryColor(article.category))}>{article.category}</span>
            <Link to={`/article/${article.id}`}>
              <h2 className="font-display font-bold text-xl text-white hover:text-amber-400 transition-colors leading-tight line-clamp-2">
                {article.title}
              </h2>
            </Link>
            <div className="flex items-center gap-3 mt-2 text-white/70 text-xs font-mono">
              <span>{article.source}</span>
              <span>·</span>
              <span>{timeAgo(article.published_at)}</span>
            </div>
          </div>
        </div>
        <CardActions article={article} upvotes={upvotes} vote={vote} saved={saved} onVote={handleVote} onSave={() => setSaved(s => !s)} />
      </div>
    )
  }

  return (
    <div className="card card-hover flex gap-0 overflow-hidden animate-fade-in">
      {/* Vote Column */}
      <div className="flex flex-col items-center gap-1 px-3 py-4 bg-ink-50 dark:bg-ink-800/50 border-r border-ink-100 dark:border-ink-800">
        <button
          onClick={() => handleVote('up')}
          className={clsx('vote-btn', vote === 'up' ? 'text-flame-500 bg-flame-50 dark:bg-flame-950/40' : 'text-ink-400 hover:text-flame-500 hover:bg-ink-100 dark:hover:bg-ink-700')}
        >
          <ArrowUp size={16} />
        </button>
        <span className={clsx('font-mono font-bold text-sm', vote === 'up' ? 'text-flame-500' : vote === 'down' ? 'text-blue-500' : 'text-ink-600 dark:text-ink-300')}>
          {formatNumber(upvotes)}
        </span>
        <button
          onClick={() => handleVote('down')}
          className={clsx('vote-btn', vote === 'down' ? 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' : 'text-ink-400 hover:text-blue-500 hover:bg-ink-100 dark:hover:bg-ink-700')}
        >
          <ArrowDown size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 p-4">
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={clsx('badge', getCategoryColor(article.category))}>{article.category}</span>
              <span className="text-xs text-ink-400 font-mono">{article.source}</span>
              <span className="text-xs text-ink-300 dark:text-ink-600">·</span>
              <span className="text-xs text-ink-400 font-mono">{timeAgo(article.published_at)}</span>
              {article.read_time && (
                <>
                  <span className="text-xs text-ink-300 dark:text-ink-600">·</span>
                  <span className="text-xs text-ink-400 font-mono flex items-center gap-1">
                    <Clock size={11} />{article.read_time}m read
                  </span>
                </>
              )}
            </div>
            <Link to={`/article/${article.id}`}>
              <h2 className="font-display font-semibold text-base sm:text-lg leading-snug hover:text-flame-500 dark:hover:text-flame-400 transition-colors line-clamp-2 mb-1.5">
                {article.title}
              </h2>
            </Link>
            <p className="text-sm text-ink-500 dark:text-ink-400 line-clamp-2 leading-relaxed hidden sm:block">
              {article.summary}
            </p>
          </div>

          {/* Thumbnail */}
          {article.image_url && (
            <div className="w-20 h-20 sm:w-28 sm:h-24 rounded-lg overflow-hidden bg-ink-200 dark:bg-ink-700 shrink-0">
              <img src={article.image_url} alt={article.title} className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <Link to={`/article/${article.id}`} className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 transition-colors px-2 py-1 rounded-md hover:bg-ink-100 dark:hover:bg-ink-800">
            <MessageSquare size={13} />
            <span className="font-mono">{formatNumber(article.comment_count)} comments</span>
          </Link>
          <button
            onClick={() => setSaved(s => !s)}
            className={clsx('flex items-center gap-1.5 text-xs transition-colors px-2 py-1 rounded-md hover:bg-ink-100 dark:hover:bg-ink-800',
              saved ? 'text-amber-500' : 'text-ink-400 hover:text-ink-700 dark:hover:text-ink-200'
            )}
          >
            <Bookmark size={13} fill={saved ? 'currentColor' : 'none'} />
            <span>{saved ? 'Saved' : 'Save'}</span>
          </button>
          <button className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 transition-colors px-2 py-1 rounded-md hover:bg-ink-100 dark:hover:bg-ink-800">
            <Share2 size={13} />
            <span>Share</span>
          </button>
          <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 transition-colors px-2 py-1 rounded-md hover:bg-ink-100 dark:hover:bg-ink-800 ml-auto">
            <ExternalLink size={13} />
            <span className="hidden sm:block">Source</span>
          </a>
        </div>
      </div>
    </div>
  )
}

function CardActions({ article, upvotes, vote, saved, onVote, onSave }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-t border-ink-100 dark:border-ink-800">
      <button onClick={() => onVote('up')} className={clsx('vote-btn', vote === 'up' ? 'text-flame-500 bg-flame-50 dark:bg-flame-950/40' : 'text-ink-400 hover:text-flame-500')}>
        <ArrowUp size={14} /> <span className="font-mono">{formatNumber(upvotes)}</span>
      </button>
      <button onClick={() => onVote('down')} className={clsx('vote-btn', vote === 'down' ? 'text-blue-500 bg-blue-50' : 'text-ink-400 hover:text-blue-500')}>
        <ArrowDown size={14} />
      </button>
      <Link to={`/article/${article.id}`} className="vote-btn text-ink-400 hover:text-ink-700 dark:hover:text-ink-200">
        <MessageSquare size={14} /> <span className="font-mono">{formatNumber(article.comment_count)}</span>
      </Link>
      <button onClick={onSave} className={clsx('vote-btn ml-auto', saved ? 'text-amber-500' : 'text-ink-400')}>
        <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}
