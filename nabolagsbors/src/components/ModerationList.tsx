'use client'

import { useTransition } from 'react'
import { Post, POST_TYPE_LABELS, POST_TYPE_COLORS } from '@/types'
import { deletePost, moderatorResolvePost, styretLogout } from '@/app/actions/moderation'
import { useRouter } from 'next/navigation'

interface Props {
  posts: Post[]
  slug: string
}

export default function ModerationList({ posts, slug }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handle(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn()
      router.refresh()
    })
  }

  async function handleLogout() {
    await styretLogout()
    router.refresh()
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={handleLogout} className="text-sm text-stone-400 hover:text-stone-700">
          Logg ut
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="text-center text-stone-400">Ingen aktive innlegg.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap gap-1.5">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${POST_TYPE_COLORS[post.type]}`}>
                    {POST_TYPE_LABELS[post.type]}
                  </span>
                  {post.resolved_at && (
                    <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-500">
                      Løst
                    </span>
                  )}
                </div>
                <p className="font-medium leading-snug">{post.title}</p>
                {post.description && (
                  <p className="mt-0.5 text-sm text-stone-500 line-clamp-2">{post.description}</p>
                )}
                <p className="mt-1 text-xs text-stone-400">
                  {post.poster_name} · leil. {post.apartment_nr}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                {!post.resolved_at && (
                  <button
                    onClick={() => handle(() => moderatorResolvePost(slug, post.id))}
                    disabled={pending}
                    className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-40"
                  >
                    Løst
                  </button>
                )}
                <button
                  onClick={() => handle(() => deletePost(slug, post.id))}
                  disabled={pending}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                >
                  Fjern
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
