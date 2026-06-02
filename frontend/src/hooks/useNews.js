import { useState, useEffect, useCallback, useRef } from 'react'
import { newsApi } from '../services/api'

export function useNews({ category = 'all', search = '' } = {}) {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    setLoading(true)
    setArticles([])
    setPage(1)
  }, [category, search])

  useEffect(() => {
    let cancelled = false
    newsApi.getAll({ category, page, search })
      .then(data => {
        if (cancelled) return
        setArticles(prev => page === 1 ? data.results : [...prev, ...data.results])
        setHasMore(!!data.next)
        setLoading(false)
      })
      .catch(err => {
        if (!cancelled) { setError(err.message); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [category, page, search])

  const loadMore = useCallback(() => {
    if (!loading && hasMore) setPage(p => p + 1)
  }, [loading, hasMore])

  return { articles, loading, error, hasMore, loadMore }
}

export function useArticle(id) {
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    newsApi.getById(id)
      .then(data => { setArticle(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [id])

  return { article, loading, error }
}

export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

export function useIntersectionObserver(callback, options = {}) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) callback()
    }, { threshold: 0.1, ...options })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [callback])
  return ref
}
