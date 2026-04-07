'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { styretLogin } from '@/app/actions/moderation'

type State = { error?: string; success?: boolean } | null

export default function StyretLogin({ slug }: { slug: string }) {
  const router = useRouter()

  const action = async (prev: State, formData: FormData): Promise<State> => {
    const result = await styretLogin(slug, formData)
    if (result.success) router.refresh()
    return result
  }

  const [state, formAction, pending] = useActionState(action, null)

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form action={formAction} className="w-full max-w-sm space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold">Styret — innlogging</h1>
        <p className="text-sm text-stone-500">Skriv inn styretspassordet for <strong>{slug}</strong>.</p>

        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="password">
            Passord
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-stone-800 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {pending ? 'Logger inn…' : 'Logg inn'}
        </button>
      </form>
    </div>
  )
}
