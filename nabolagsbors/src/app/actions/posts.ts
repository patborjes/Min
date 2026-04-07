'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { PostType } from '@/types'

const VALID_TYPES: PostType[] = ['gir', 'trenger', 'tilbyr', 'info']

export async function createPost(slug: string, formData: FormData) {
  const type = formData.get('type') as PostType
  const title = (formData.get('title') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const poster_name = (formData.get('poster_name') as string)?.trim()
  const apartment_nr = (formData.get('apartment_nr') as string)?.trim()

  if (!VALID_TYPES.includes(type) || !title || !poster_name || !apartment_nr) {
    return { error: 'Fyll ut alle påkrevde felt.' }
  }

  const { data: borettslag } = await supabase
    .from('borettslag')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!borettslag) return { error: 'Borettslaget ble ikke funnet.' }

  const { error } = await supabase.from('posts').insert({
    borettslag_id: borettslag.id,
    type,
    title,
    description,
    poster_name,
    apartment_nr,
  })

  if (error) return { error: 'Noe gikk galt. Prøv igjen.' }

  revalidatePath(`/${slug}`)
  return { success: true }
}

export async function createReply(postId: string, slug: string, formData: FormData) {
  const body = (formData.get('body') as string)?.trim()
  const poster_name = (formData.get('poster_name') as string)?.trim()
  const apartment_nr = (formData.get('apartment_nr') as string)?.trim()

  if (!body || !poster_name || !apartment_nr) {
    return { error: 'Fyll ut alle felt.' }
  }

  const { error } = await supabase.from('replies').insert({
    post_id: postId,
    body,
    poster_name,
    apartment_nr,
  })

  if (error) return { error: 'Noe gikk galt. Prøv igjen.' }

  revalidatePath(`/${slug}`)
  return { success: true }
}

export async function resolvePost(postId: string, slug: string) {
  const { error } = await supabase
    .from('posts')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', postId)
    .is('resolved_at', null)

  if (error) return { error: 'Noe gikk galt.' }

  revalidatePath(`/${slug}`)
  return { success: true }
}
