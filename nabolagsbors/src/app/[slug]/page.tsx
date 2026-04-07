import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Post } from '@/types'
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">{borettslag.name}</h1>
        <p className="text-sm text-stone-500">Nabolagsbørs</p>
      </header>

      <PostForm borettslagId={borettslag.id} slug={slug} />

      <PostList posts={(posts ?? []) as Post[]} />
    </div>
  )
}
