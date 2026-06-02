export function ArticleSkeleton() {
  return (
    <div className="card flex gap-0 overflow-hidden">
      <div className="w-12 bg-ink-50 dark:bg-ink-800/50 border-r border-ink-100 dark:border-ink-800" />
      <div className="flex-1 p-4 space-y-3">
        <div className="flex gap-3 items-center">
          <div className="skeleton h-4 w-16 rounded-full" />
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-4 w-12" />
        </div>
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <div className="skeleton h-5 w-full" />
            <div className="skeleton h-5 w-4/5" />
            <div className="skeleton h-4 w-full mt-2" />
            <div className="skeleton h-4 w-3/4" />
          </div>
          <div className="skeleton w-24 h-20 rounded-lg shrink-0" />
        </div>
        <div className="flex gap-3 pt-1">
          <div className="skeleton h-6 w-24 rounded-md" />
          <div className="skeleton h-6 w-16 rounded-md" />
          <div className="skeleton h-6 w-16 rounded-md" />
        </div>
      </div>
    </div>
  )
}

export function CommentSkeleton({ level = 0 }) {
  return (
    <div className={`space-y-3 ${level > 0 ? 'ml-8 pl-4 border-l-2 border-ink-100 dark:border-ink-800' : ''}`}>
      <div className="flex gap-3">
        <div className="skeleton w-7 h-7 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
          <div className="skeleton h-4 w-3/4" />
        </div>
      </div>
      {level === 0 && <CommentSkeleton level={1} />}
    </div>
  )
}

export function FeaturedSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton h-72 w-full rounded-none" />
      <div className="p-4 space-y-2">
        <div className="skeleton h-4 w-20 rounded-full" />
        <div className="skeleton h-6 w-full" />
        <div className="skeleton h-6 w-3/4" />
      </div>
    </div>
  )
}
