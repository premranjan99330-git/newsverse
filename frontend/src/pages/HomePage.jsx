import { useSearchParams } from 'react-router-dom'
import { useNews, useIntersectionObserver } from '../hooks/useNews'
import ArticleCard from '../components/news/ArticleCard'
import { ArticleSkeleton, FeaturedSkeleton } from '../components/ui/Skeleton'
import Layout from '../components/layout/Layout'
import { Loader2 } from 'lucide-react'
import { useCallback } from 'react'

export default function HomePage() {
  const [searchParams] = useSearchParams()
  const category = searchParams.get('category') || 'all'

  const { articles, loading, hasMore, loadMore } = useNews({ category })

  const sentinelRef = useIntersectionObserver(
    useCallback(() => { if (hasMore) loadMore() }, [hasMore, loadMore])
  )

  const [featured, ...rest] = articles

  return (
    <Layout>
      <div className="space-y-4">
        {loading && articles.length === 0 ? (
          <>
            <FeaturedSkeleton />
            {[...Array(4)].map((_, i) => <ArticleSkeleton key={i} />)}
          </>
        ) : (
          <>
            {featured && <ArticleCard article={featured} featured />}
            {rest.map((article, i) => (
              <div key={article.id} className="animate-slide-up" style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}>
                <ArticleCard article={article} />
              </div>
            ))}
          </>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="flex justify-center py-4">
          {loading && articles.length > 0 && (
            <Loader2 size={20} className="text-ink-400 animate-spin" />
          )}
          {!hasMore && !loading && articles.length > 0 && (
            <p className="text-xs font-mono text-ink-400">— You're all caught up —</p>
          )}
        </div>
      </div>
    </Layout>
  )
}
