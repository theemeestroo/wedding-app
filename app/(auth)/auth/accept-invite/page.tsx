import { getDictionary } from '@/lib/i18n'
import { AcceptInviteForm } from '@/components/auth/accept-invite-form'

export const metadata = { title: "You've been invited — The Wedding Lab" }

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const dict = await getDictionary('en')
  const { token } = await searchParams
  const d = dict.invite.accept

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="font-heading text-xl font-semibold tracking-tight">{d.title}</h1>
      </div>

      <AcceptInviteForm lang="en" dict={dict} token={token ?? null} />
    </div>
  )
}
