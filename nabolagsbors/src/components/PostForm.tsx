'use client'

import { useActionState, useState } from 'react'
import { createPost } from '@/app/actions/posts'
import { PostType, POST_TYPE_LABELS } from '@/types'

const TYPES: PostType[] = ['gir', 'tilbyr', 'trenger', 'info']

interface Props {
  borettslagId: string
  slug: string
}

type State = { error?: string; success?: boolean } | null

export default function PostForm({ slug }: Props) {
  const [open, setOpen] = useState(false)

  const action = async (prev: State, formData: FormData): Promise<State> => {
    const result = await createPost(slug, formData)
    if (result.success) setOpen(false)
    return result
  }

  const [state, formAction, pending] = useActionState(action, null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border-2 border-dashed border-stone-300 py-4 text-sm text-stone-400 hover:border-stone-400 hover:text-stone-600 transition-colors"
      >
        + Legg inn nytt innlegg
      </button>
    )
  }

  return (
    <form action={formAction} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
      <h2 className="font-semibold">Nytt innlegg</h2>

      {/* Type */}
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Type *</legend>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <label key={t} className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="type" value={t} required className="accent-stone-700" />
              <span className="text-sm">{POST_TYPE_LABELS[t]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Title */}
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="title">
          Tittel *
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={120}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          placeholder="Hva tilbyr / trenger du?"
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="description">
          Beskrivelse
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={1000}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
          placeholder="Mer detaljer (valgfritt)"
        />
      </div>

      {/* Name + Apartment */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium" htmlFor="poster_name">
            Navn *
          </label>
          <input
            id="poster_name"
            name="poster_name"
            required
            maxLength={60}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            placeholder="Ola"
          />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-sm font-medium" htmlFor="apartment_nr">
            Leil.nr *
          </label>
          <input
            id="apartment_nr"
            name="apartment_nr"
            required
            maxLength={10}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            placeholder="H0301"
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-4 py-2 text-sm text-stone-500 hover:bg-stone-100"
        >
          Avbryt
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {pending ? 'Sender…' : 'Publiser'}
        </button>
      </div>
    </form>
  )
}
