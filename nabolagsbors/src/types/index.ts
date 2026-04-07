export type PostType = 'gir' | 'trenger' | 'tilbyr' | 'info'

export interface Borettslag {
  id: string
  slug: string
  name: string
  created_at: string
}

export interface Post {
  id: string
  borettslag_id: string
  type: PostType
  title: string
  description: string | null
  poster_name: string
  apartment_nr: string
  is_active: boolean
  resolved_at: string | null
  created_at: string
}

export interface Reply {
  id: string
  post_id: string
  poster_name: string
  apartment_nr: string
  body: string
  created_at: string
}

export interface NewPost {
  type: PostType
  title: string
  description?: string
  poster_name: string
  apartment_nr: string
}

export const POST_TYPE_LABELS: Record<PostType, string> = {
  gir: 'Gir bort',
  trenger: 'Trenger',
  tilbyr: 'Tilbyr',
  info: 'Info',
}

export const POST_TYPE_COLORS: Record<PostType, string> = {
  gir: 'bg-green-100 text-green-800 border-green-200',
  trenger: 'bg-orange-100 text-orange-800 border-orange-200',
  tilbyr: 'bg-blue-100 text-blue-800 border-blue-200',
  info: 'bg-gray-100 text-gray-800 border-gray-200',
}

export const POST_TYPE_BADGE: Record<PostType, string> = {
  gir: 'bg-green-500',
  trenger: 'bg-orange-500',
  tilbyr: 'bg-blue-500',
  info: 'bg-gray-500',
}
