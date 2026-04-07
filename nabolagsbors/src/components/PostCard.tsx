'use client'

import { useState, useActionState, useTransition } from 'react'
import { Post, Reply, POST_TYPE_LABELS, POST_TYPE_COLORS } from '@/types'
import { createReply, resolvePost } from '@/app/actions/posts'

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

interface Props {
  post: Post
  replies: Reply[]
  slug: string
}

type ReplyState = { error?: string; success?: boolean } | null

export default function PostCard({ post, replies, slug }: Props) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const replyAction = async (prev: ReplyState, formData: FormData): Promise<ReplyState> => {
    const result = await createReply(post.id, slug, formData)
    if (result.success) setShowReplyForm(false)
    return result
  }

  const [replyState, replyFormAction, replyPending] = useActionState(replyAction, null)

  function handleResolve() {
    startTransition(async () => {
      await resolvePost(post.id, slug)
    })
  }

  const resolved = !!post.resolved_at

  return (
    <article className={`rounded-xl border bg-white p-4 shadow-sm ${resolved ? 'border-stone-100 opacity-70' : 'border-stone-200'}`}>
      {/* Header row */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${POST_TYPE_COLORS[post.type]}`}>
            {POST_TYPE_LABELS[post.type]}
          </span>
          {resolved && (
            <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-500">
              Løst
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs text-stone-400">{timeAgo(post.created_at)}</span>
      </div>

      <h2 className="font-semibold leading-snug">{post.title}</h2>

      {post.description && (
        <p className="mt-1 text-sm text-stone-600 whitespace-pre-wrap">{post.description}</p>
      )}

      <footer className="mt-3 text-xs text-stone-400">
        {post.poster_name} · leil. {post.apartment_nr}
      </footer>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
          {replies.map((reply) => (
            <div key={reply.id} className="rounded-lg bg-stone-50 px-3 py-2 text-sm">
              <p className="text-stone-700">{reply.body}</p>
              <p className="mt-1 text-xs text-stone-400">
                {reply.poster_name} · leil. {reply.apartment_nr} · {timeAgo(reply.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {!resolved && (
        <div className="mt-3 flex gap-3 border-t border-stone-100 pt-3">
          <button
            onClick={() => setShowReplyForm((v) => !v)}
            className="text-xs text-stone-400 hover:text-stone-700"
          >
            {showReplyForm ? 'Avbryt' : 'Svar'}
          </button>
          <button
            onClick={handleResolve}
            disabled={isPending}
            className="text-xs text-stone-400 hover:text-stone-700 disabled:opacity-40"
          >
            Marker som løst
          </button>
        </div>
      )}

      {/* Reply form */}
      {showReplyForm && (
        <form action={replyFormAction} className="mt-3 space-y-2">
          <textarea
            name="body"
            required
            rows={2}
            maxLength={500}
            placeholder="Skriv svar…"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
          />
          <div className="flex gap-2">
            <input
              name="poster_name"
              required
              maxLength={60}
              placeholder="Navn"
              className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
            <input
              name="apartment_nr"
              required
              maxLength={10}
              placeholder="Leil.nr"
              className="w-24 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
            <button
              type="submit"
              disabled={replyPending}
              className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-50"
            >
              {replyPending ? '…' : 'Send'}
            </button>
          </div>
          {replyState?.error && (
            <p className="text-xs text-red-600">{replyState.error}</p>
          )}
        </form>
      )}
    </article>
  )
}
