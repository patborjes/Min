'use client'

import { useTransition } from 'react'
import { Post, POST_TYPE_LABELS, POST_TYPE_COLORS } from '@/types'
import { deletePost, styretLogout } from '@/app/actions/moderation'
import { useRouter } from 'next/navigation'

interface Props {
  posts: Post[]
  slug: string
}

export default function ModerationList({ posts, slug }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleDelete(postId: string) {
    startTransition(async () => {
      await deletePost(slug, postId)
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
                <span
                  className={`mb-1 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${POST_TYPE_COLORS[post.type]}`}
                >
                  {POST_TYPE_LABELS[post.type]}
                </span>
                <p className="font-medium leading-snug">{post.title}</p>
                {post.description && (
                  <p className="mt-0.5 text-sm text-stone-500 line-clamp-2">{post.description}</p>
                )}
                <p className="mt-1 text-xs text-stone-400">
                  {post.poster_name} · leil. {post.apartment_nr}
                </p>
              </div>
              <button
                onClick={() => handleDelete(post.id)}
                disabled={pending}
                className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                Fjern
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
