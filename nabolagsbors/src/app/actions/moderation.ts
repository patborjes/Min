'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

const SESSION_COOKIE = 'styret_slug'

// Styret logs in with the moderator password for their borettslag
export async function styretLogin(slug: string, formData: FormData) {
  const password = formData.get('password') as string

  const { data: borettslag } = await supabase
    .from('borettslag')
    .select('id, moderator_password_hash')
    .eq('slug', slug)
    .single()

  if (!borettslag) return { error: 'Borettslaget ble ikke funnet.' }

  // Simple comparison — swap for bcrypt in production
  const expected = process.env.MODERATOR_SECRET + '_' + slug
  if (password !== expected) return { error: 'Feil passord.' }

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, slug, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
  })

  return { success: true }
}

export async function styretLogout() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

async function assertStyret(slug: string) {
  const cookieStore = await cookies()
  const value = cookieStore.get(SESSION_COOKIE)?.value
  if (value !== slug) throw new Error('Ikke autorisert')
}

export async function deletePost(slug: string, postId: string) {
  await assertStyret(slug)
  const service = createServiceClient()
  await service.from('posts').update({ is_active: false }).eq('id', postId)
  revalidatePath(`/${slug}`)
  revalidatePath(`/${slug}/styret`)
}

export async function moderatorResolvePost(slug: string, postId: string) {
  await assertStyret(slug)
  const service = createServiceClient()
  await service
    .from('posts')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', postId)
    .is('resolved_at', null)
  revalidatePath(`/${slug}`)
  revalidatePath(`/${slug}/styret`)
}
