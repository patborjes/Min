import { Post, Reply, PostType, POST_TYPE_LABELS } from '@/types'
import PostCard from './PostCard'

const TYPES: PostType[] = ['gir', 'tilbyr', 'trenger', 'info']

interface Props {
  posts: Post[]
  repliesByPost: Record<string, Reply[]>
  slug: string
}

export default function PostList({ posts, repliesByPost, slug }: Props) {
  if (posts.length === 0) {
    return (
      <div className="mt-8 text-center text-stone-400">
        Ingen innlegg ennå. Vær den første!
      </div>
    )
  }

  return (
    <div className="mt-8 space-y-8">
      {TYPES.map((type) => {
        const filtered = posts.filter((p) => p.type === type)
        if (filtered.length === 0) return null
        return (
          <section key={type}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-400">
              {POST_TYPE_LABELS[type]}
            </h2>
            <div className="space-y-3">
              {filtered.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  replies={repliesByPost[post.id] ?? []}
                  slug={slug}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
