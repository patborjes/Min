import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Post } from '@/types'
import StyretLogin from '@/components/StyretLogin'
import ModerationList from '@/components/ModerationList'

interface Props {
  params: Promise<{ slug: string }>
}

const SESSION_COOKIE = 'styret_slug'

export default async function StyretPage({ params }: Props) {
  const { slug } = await params

  const { data: borettslag } = await supabase
    .from('borettslag')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (!borettslag) notFound()

  const cookieStore = await cookies()
  const isAuthed = cookieStore.get(SESSION_COOKIE)?.value === slug

  if (!isAuthed) {
    return <StyretLogin slug={slug} />
  }

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('borettslag_id', borettslag.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{borettslag.name} — Styret</h1>
          <p className="text-sm text-stone-500">Moderer innlegg</p>
        </div>
        <a href={`/${slug}`} className="text-sm text-stone-500 hover:underline">
          ← Tilbake til tavlen
        </a>
      </header>

      <ModerationList posts={(posts ?? []) as Post[]} slug={slug} />
    </div>
  )
}
