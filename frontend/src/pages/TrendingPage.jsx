import { useState, useEffect } from 'react'
import { TrendingUp, Flame } from 'lucide-react'
import { newsApi } from '../services/api'
import ArticleCard from '../components/news/ArticleCard'
import { ArticleSkeleton } from '../components/ui/Skeleton'
import Layout from '../components/layout/Layout'

export default function TrendingPage() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    newsApi.getTrending().then(data => {
      setArticles(data)
      setLoading(false)
    })
  }, [])

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-flame-50 dark:bg-flame-950/40 rounded-xl flex items-center justify-center">
            <TrendingUp size={20} className="text-flame-500" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl">Trending Now</h1>
            <p className="text-sm text-ink-500">Most upvoted stories in the last 24 hours</p>
          </div>
        </div>

        {loading
          ? [...Array(5)].map((_, i) => <ArticleSkeleton key={i} />)
          : articles.map((article, i) => (
              <div key={article.id} className="relative">
                <div className="absolute -left-3 top-4 w-7 h-7 bg-ink-100 dark:bg-ink-800 rounded-lg flex items-center justify-center">
                  <span className="font-display font-bold text-sm text-ink-500">#{i + 1}</span>
                </div>
                <ArticleCard article={article} />
              </div>
            ))
        }
      </div>
    </Layout>
  )
}
