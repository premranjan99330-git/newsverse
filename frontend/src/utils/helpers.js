export function timeAgo(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)

  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatNumber(n) {

  if (n === undefined || n === null) {
    return '0'
  }

  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'

  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'

  return n.toString()
}


export function getCategoryColor(category) {
  const map = {
    technology: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400',
    science: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400',
    business: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400',
    politics: 'text-red-500 bg-red-50 dark:bg-red-950/40 dark:text-red-400',
    sports: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400',
    entertainment: 'text-pink-500 bg-pink-50 dark:bg-pink-950/40 dark:text-pink-400',
    health: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-400',
    world: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400',
  }
  return map[category] || 'text-ink-500 bg-ink-100 dark:bg-ink-800 dark:text-ink-400'
}

export function getInitials(username) {
  return username?.slice(0, 2).toUpperCase() || 'U'
}
