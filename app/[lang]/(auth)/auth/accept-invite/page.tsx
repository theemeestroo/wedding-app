import { notFound } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { AcceptInviteForm } from '@/components/auth/accept-invite-form'

export const metadata = { title: "You've been invited — The Wedding Lab" }

export default async function AcceptInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  const { token } = await searchParams
  const d = dict.invite.accept

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="font-heading text-xl font-semibold tracking-tight">{d.title}</h1>
      </div>

      <AcceptInviteForm lang={lang} dict={dict} token={token ?? null} />
    </div>
  )
}
