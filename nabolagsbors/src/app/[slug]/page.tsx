import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Post, Reply } from '@/types'
import PostList from '@/components/PostList'
import PostForm from '@/components/PostForm'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function BoardPage({ params }: Props) {
  const { slug } = await params

  const { data: borettslag } = await supabase
    .from('borettslag')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!borettslag) notFound()

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('borettslag_id', borettslag.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const postIds = (posts ?? []).map((p) => p.id)

  const { data: replies } = postIds.length
    ? await supabase
        .from('replies')
        .select('*')
        .in('post_id', postIds)
        .order('created_at', { ascending: true })
    : { data: [] }

  const repliesByPost: Record<string, Reply[]> = {}
  for (const reply of replies ?? []) {
    if (!repliesByPost[reply.post_id]) repliesByPost[reply.post_id] = []
    repliesByPost[reply.post_id].push(reply as Reply)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">{borettslag.name}</h1>
          <p className="text-sm text-stone-500">Nabolagsbørs</p>
        </div>
        <a href={`/${slug}/styret`} className="text-xs text-stone-400 hover:underline">
          Styret
        </a>
      </header>

      <PostForm borettslagId={borettslag.id} slug={slug} />

      <PostList posts={(posts ?? []) as Post[]} repliesByPost={repliesByPost} slug={slug} />
    </div>
  )
}
