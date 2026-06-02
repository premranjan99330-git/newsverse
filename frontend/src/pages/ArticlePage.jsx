import { useParams, Link } from 'react-router-dom'
import { ArrowUp, ArrowDown, ExternalLink, ArrowLeft, Clock, Share2, Bookmark } from 'lucide-react'
import { useState } from 'react'
import { useArticle } from '../hooks/useNews'
import { newsApi } from '../services/api'
import Layout from '../components/layout/Layout'
import CommentSection from '../components/comments/CommentSection'
import { ArticleSkeleton } from '../components/ui/Skeleton'
import { timeAgo, formatNumber, getCategoryColor } from '../utils/helpers'
import { useAuth } from '../context/AuthContext'
import clsx from 'clsx'

export default function ArticlePage() {
  const { id } = useParams()
  const { article, loading, error } = useArticle(id)
  const { user, openLogin } = useAuth()
  const [upvotes, setUpvotes] = useState(null)
  const [vote, setVote] = useState(null)
  const [saved, setSaved] = useState(false)

  const currentUpvotes = upvotes ?? article?.upvotes ?? 0

  const handleVote = async (dir) => {
    if (!user) { openLogin(); return }
    const newVote = vote === dir ? null : dir
    setVote(newVote)
    setUpvotes(prev => {
      const base = prev ?? article.upvotes
      if (vote === dir) return base + (dir === 'up' ? -1 : 1)
      if (vote) return base + (dir === 'up' ? 2 : -2)
      return base + (dir === 'up' ? 1 : -1)
    })
  }

  if (loading) return <Layout><div className="space-y-4"><ArticleSkeleton /><ArticleSkeleton /></div></Layout>
  if (error || !article) return (
    <Layout>
      <div className="card p-12 text-center">
        <p className="text-ink-500">Article not found.</p>
        <Link to="/" className="btn-primary mt-4 inline-block">← Back to feed</Link>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Back */}
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-800 dark:hover:text-ink-200 transition-colors">
          <ArrowLeft size={15} /> Back to feed
        </Link>

        {/* Article Header */}
        <div className="card overflow-hidden">
          {article.image_url && (
            <div className="h-64 sm:h-96 bg-ink-200 dark:bg-ink-800">
              <img src={article.image_url} alt={article.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-6">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={clsx('badge', getCategoryColor(article.category))}>{article.category}</span>
              <a href={article.source_url} target="_blank" rel="noopener noreferrer"
                className="text-xs font-mono text-ink-500 hover:text-flame-500 transition-colors flex items-center gap-1">
                {article.source} <ExternalLink size={10} />
              </a>
              <span className="text-xs text-ink-400 font-mono">{timeAgo(article.published_at)}</span>
              <span className="text-xs text-ink-400 font-mono flex items-center gap-1 ml-auto">
                <Clock size={11} /> {article.read_time} min read
              </span>
            </div>

            <h1 className="font-display font-bold text-2xl sm:text-3xl leading-tight mb-4">
              {article.title}
            </h1>

            <p className="text-ink-600 dark:text-ink-300 text-base leading-relaxed mb-6 font-medium">
              {article.summary}
            </p>

            <div className="prose prose-sm dark:prose-invert max-w-none text-ink-700 dark:text-ink-300 leading-relaxed">
              {article.content}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-6 pt-6 border-t border-ink-100 dark:border-ink-800 flex-wrap">
              <button
                onClick={() => handleVote('up')}
                className={clsx('vote-btn px-3 py-2', vote === 'up' ? 'text-flame-500 bg-flame-50 dark:bg-flame-950/40' : 'text-ink-500 hover:text-flame-500 bg-ink-100 dark:bg-ink-800')}
              >
                <ArrowUp size={16} /> <span className="font-mono font-bold">{formatNumber(currentUpvotes)}</span>
              </button>
              <button
                onClick={() => handleVote('down')}
                className={clsx('vote-btn px-3 py-2', vote === 'down' ? 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' : 'text-ink-500 hover:text-blue-500 bg-ink-100 dark:bg-ink-800')}
              >
                <ArrowDown size={16} />
              </button>
              <button
                onClick={() => setSaved(s => !s)}
                className={clsx('vote-btn px-3 py-2 bg-ink-100 dark:bg-ink-800', saved ? 'text-amber-500' : 'text-ink-500')}
              >
                <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
                {saved ? 'Saved' : 'Save'}
              </button>
              <button className="vote-btn px-3 py-2 text-ink-500 bg-ink-100 dark:bg-ink-800 hover:text-ink-700 dark:hover:text-ink-200">
                <Share2 size={16} /> Share
              </button>
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="vote-btn px-3 py-2 text-ink-500 bg-ink-100 dark:bg-ink-800 hover:text-ink-700 dark:hover:text-ink-200 ml-auto"
              >
                <ExternalLink size={16} /> Read Original
              </a>
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="card p-6">
          <CommentSection articleId={article.id} />
        </div>
      </div>
    </Layout>
  )
}
