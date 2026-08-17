'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

const messages: Record<string, { title: string; subtitle: string; retry: string; login: string }> = {
  en: { title: 'Something went wrong', subtitle: 'An unexpected error occurred. Please try again.', retry: 'Try again', login: 'Return to login' },
  de: { title: 'Etwas ist schiefgelaufen', subtitle: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.', retry: 'Erneut versuchen', login: 'Zurück zum Login' },
  fr: { title: 'Une erreur est survenue', subtitle: "Une erreur inattendue s'est produite. Veuillez réessayer.", retry: 'Réessayer', login: 'Retour à la connexion' },
}

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams<{ lang: string }>()
  const lang = params?.lang ?? 'en'
  const t = messages[lang] ?? messages.en

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center shadow-xl shadow-primary/5">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <svg
            className="size-6 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-lg font-semibold">{t.title}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{t.subtitle}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            {t.retry}
          </button>
          <Link
            href={`/${lang}/auth/login`}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t.login}
          </Link>
        </div>
      </div>
    </div>
  )
}
