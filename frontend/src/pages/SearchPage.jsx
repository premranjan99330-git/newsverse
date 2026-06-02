import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useNews } from '../hooks/useNews'
import ArticleCard from '../components/news/ArticleCard'
import { ArticleSkeleton } from '../components/ui/Skeleton'
import Layout from '../components/layout/Layout'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const { articles, loading } = useNews({ search: q })

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Search size={20} className="text-ink-400" />
          <div>
            <h1 className="font-display font-bold text-xl">
              {q ? `Results for "${q}"` : 'Search'}
            </h1>
            {!loading && (
              <p className="text-sm text-ink-500 font-mono">{articles.length} articles found</p>
            )}
          </div>
        </div>

        {loading ? (
          [...Array(4)].map((_, i) => <ArticleSkeleton key={i} />)
        ) : articles.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-ink-500 mb-2">No articles found for "{q}"</p>
            <p className="text-sm text-ink-400">Try different keywords or browse categories.</p>
          </div>
        ) : (
          articles.map(article => <ArticleCard key={article.id} article={article} />)
        )}
      </div>
    </Layout>
  )
}
