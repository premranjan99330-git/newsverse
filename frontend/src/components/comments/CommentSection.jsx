import { useState } from 'react'
import { ArrowUp, ArrowDown, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import { timeAgo, formatNumber, getInitials } from '../../utils/helpers'
import { commentsApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'

const LEVEL_COLORS = [
  'border-flame-400',
  'border-blue-400',
  'border-purple-400',
  'border-emerald-400',
  'border-amber-400',
]

function Avatar({ username, size = 7 }) {
  return (
    <div className={clsx(`w-${size} h-${size} rounded-lg bg-gradient-to-br from-flame-400 to-flame-600 flex items-center justify-center text-white shrink-0`,
      size === 6 ? 'text-xs' : 'text-xs'
    )}>
      {getInitials(username)}
    </div>
  )
}

function CommentBox({ articleId, parentId = null, onSubmit, onCancel }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, openLogin } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    if (!user) { openLogin(); return }
    setLoading(true)
    const comment = await commentsApi.create(articleId, { content: text, parentId })
    onSubmit(comment)
    setText('')
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={user ? "What do you think?" : "Log in to comment..."}
        rows={3}
        className="input resize-none text-sm"
        onClick={() => !user && openLogin()}
        readOnly={!user}
      />
      <div className="flex items-center justify-end gap-2 mt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost text-sm">Cancel</button>
        )}
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {loading ? 'Posting...' : 'Comment'}
        </button>
      </div>
    </form>
  )
}

function Comment({ comment, articleId, level = 0 }) {
  const [upvotes, setUpvotes] = useState(comment.upvotes)
  const [vote, setVote] = useState(comment.user_vote)
  const [showReply, setShowReply] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [replies, setReplies] = useState(comment.replies || [])
  const { user, openLogin } = useAuth()

  const handleVote = async (dir) => {
    if (!user) { openLogin(); return }
    const newVote = vote === dir ? null : dir
    setVote(newVote)
    setUpvotes(prev => {
      if (vote === dir) return prev + (dir === 'up' ? -1 : 1)
      if (vote) return prev + (dir === 'up' ? 2 : -2)
      return prev + (dir === 'up' ? 1 : -1)
    })
    await commentsApi.vote(comment.id, newVote)
  }

  const handleNewReply = (newComment) => {
    setReplies(r => [newComment, ...r])
    setShowReply(false)
  }

  const borderColor = LEVEL_COLORS[level % LEVEL_COLORS.length]

  return (
    <div className={clsx('group', level > 0 && `ml-4 sm:ml-8 pl-4 border-l-2 ${borderColor}/30 hover:${borderColor}/60 transition-colors`)}>
      <div className="flex gap-3">
        <Avatar username={comment.user.username} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="font-display font-semibold text-sm">{comment.user.username}</span>
            <span className="text-xs font-mono text-flame-500">{formatNumber(comment.user.karma)} karma</span>
            <span className="text-xs text-ink-400 font-mono">{timeAgo(comment.created_at)}</span>
          </div>

          {collapsed ? (
            <button onClick={() => setCollapsed(false)} className="text-xs text-ink-400 italic">
              [comment collapsed — click to expand]
            </button>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-ink-700 dark:text-ink-300">{comment.content}</p>

              <div className="flex items-center gap-1 mt-2.5">
                <button
                  onClick={() => handleVote('up')}
                  className={clsx('vote-btn', vote === 'up' ? 'text-flame-500 bg-flame-50 dark:bg-flame-950/40' : 'text-ink-400 hover:text-flame-500')}
                >
                  <ArrowUp size={13} /> {formatNumber(upvotes)}
                </button>
                <button
                  onClick={() => handleVote('down')}
                  className={clsx('vote-btn', vote === 'down' ? 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' : 'text-ink-400 hover:text-blue-500')}
                >
                  <ArrowDown size={13} />
                </button>
                {level < 5 && (
                  <button
                    onClick={() => setShowReply(s => !s)}
                    className="vote-btn text-ink-400 hover:text-ink-700 dark:hover:text-ink-200"
                  >
                    <MessageSquare size={13} /> Reply
                  </button>
                )}
                <button
                  onClick={() => setCollapsed(true)}
                  className="vote-btn text-ink-300 dark:text-ink-600 hover:text-ink-500 ml-auto"
                >
                  <ChevronUp size={13} /> Collapse
                </button>
              </div>

              {showReply && (
                <CommentBox
                  articleId={articleId}
                  parentId={comment.id}
                  onSubmit={handleNewReply}
                  onCancel={() => setShowReply(false)}
                />
              )}
            </>
          )}
        </div>
      </div>

      {!collapsed && replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {replies.map(reply => (
            <Comment key={reply.id} comment={reply} articleId={articleId} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommentSection({ articleId }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('top')

  useState(() => {
    commentsApi.getByArticle(articleId).then(data => {
      setComments(data)
      setLoading(false)
    })
  }, [articleId])

  const handleNewComment = (comment) => {
    setComments(c => [comment, ...c])
  }

  const SORTS = ['top', 'new', 'controversial']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-lg">{comments.length} Comments</h3>
        <div className="flex items-center gap-1">
          {SORTS.map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={clsx('px-3 py-1.5 text-xs font-mono rounded-lg capitalize transition-colors',
                sort === s ? 'bg-ink-900 dark:bg-ink-100 text-white dark:text-ink-900' : 'text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <CommentBox articleId={articleId} onSubmit={handleNewComment} />

      <div className="space-y-6">
        {loading ? (
          <p className="text-ink-400 text-sm">Loading comments...</p>
        ) : (
          comments.map(comment => (
            <Comment key={comment.id} comment={comment} articleId={articleId} />
          ))
        )}
      </div>
    </div>
  )
}
