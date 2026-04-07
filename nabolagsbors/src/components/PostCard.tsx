import { Post, POST_TYPE_LABELS, POST_TYPE_COLORS } from '@/types'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'nå nettopp'
  if (mins < 60) return `${mins} min siden`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} t siden`
  const days = Math.floor(hours / 24)
  return `${days} d siden`
}

export default function PostCard({ post }: { post: Post }) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${POST_TYPE_COLORS[post.type]}`}
        >
          {POST_TYPE_LABELS[post.type]}
        </span>
        <span className="text-xs text-stone-400">{timeAgo(post.created_at)}</span>
      </div>

      <h2 className="font-semibold leading-snug">{post.title}</h2>

      {post.description && (
        <p className="mt-1 text-sm text-stone-600 whitespace-pre-wrap">{post.description}</p>
      )}

      <footer className="mt-3 text-xs text-stone-400">
        {post.poster_name} · leil. {post.apartment_nr}
      </footer>
    </article>
  )
}
