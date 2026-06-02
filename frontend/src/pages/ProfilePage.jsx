import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Calendar, MessageSquare, FileText, Flame, Award } from 'lucide-react'
import { authApi } from '../services/api'
import ArticleCard from '../components/news/ArticleCard'
import { ArticleSkeleton } from '../components/ui/Skeleton'
import Layout from '../components/layout/Layout'
import { formatNumber, getInitials, timeAgo } from '../utils/helpers'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="font-display font-bold text-lg leading-none">{formatNumber(value)}</p>
        <p className="text-xs text-ink-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { username } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('posts')

  useEffect(() => {
    authApi.getProfile(username).then(data => {
      setProfile(data)
      setLoading(false)
    })
  }, [username])

  if (loading) return (
    <Layout showSidebar={false}>
      <div className="space-y-4">
        <div className="card h-40 animate-skeleton" />
        {[...Array(3)].map((_, i) => <ArticleSkeleton key={i} />)}
      </div>
    </Layout>
  )

  return (
    <Layout showSidebar={false}>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">

        {/* Profile Header */}
        <div className="card p-6">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-flame-400 to-flame-600 flex items-center justify-center text-white font-display font-bold text-2xl shrink-0">
              {getInitials(username)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-bold text-2xl">{username}</h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-ink-500 flex-wrap">
                <Calendar size={13} />
                <span className="font-mono">Joined {timeAgo(profile?.joined)}</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1.5 bg-flame-50 dark:bg-flame-950/40 text-flame-500 px-3 py-1.5 rounded-lg">
                  <Flame size={14} />
                  <span className="font-mono font-bold text-sm">{formatNumber(profile?.karma)} karma</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={FileText} label="Posts" value={profile?.post_count || 0} color="bg-flame-500" />
          <StatCard icon={MessageSquare} label="Comments" value={profile?.comment_count || 0} color="bg-blue-500" />
          <StatCard icon={Award} label="Karma" value={profile?.karma || 0} color="bg-purple-500" />
          <StatCard icon={Flame} label="Upvotes given" value={2341} color="bg-amber-500" />
        </div>

        {/* Tabs */}
        <div className="border-b border-ink-100 dark:border-ink-800">
          {['posts', 'comments'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                tab === t ? 'border-flame-500 text-flame-500' : 'border-transparent text-ink-500 hover:text-ink-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-4">
          {tab === 'posts' && profile?.recent_posts?.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
          {tab === 'comments' && (
            <div className="card p-8 text-center text-ink-400 text-sm">
              Comment history coming soon...
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
