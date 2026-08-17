import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { localizePath } from '@/lib/locale'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProject, getProjectMembers } from '@/lib/project'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  const d = dict.project.dashboard
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${lang}/auth/login`)

  const project = await getCurrentProject(supabase, user.id)
  if (!project) redirect(`/${lang}/projects/new`)

  const members = await getProjectMembers(supabase, project.id)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
        <p className="text-sm text-muted-foreground">
          {d.currencyLabel}: {project.currency}
        </p>
      </div>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {d.membersHeading}
        </h2>
        <ul className="space-y-2">
          {members?.map((m, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span>{m.profile?.full_name || m.profile?.email}</span>
              <span className="text-muted-foreground capitalize">{m.role}</span>
            </li>
          ))}
        </ul>
        <Link
          href={localizePath(lang, '/settings/members')}
          className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {d.inviteCta}
        </Link>
      </section>

      <section className="rounded-2xl border border-dashed bg-card p-6 text-center">
        <p className="mb-3 text-sm text-muted-foreground">{d.noVenuesYet}</p>
        <Link
          href={localizePath(lang, '/venues')}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90"
        >
          {d.addVenueCta}
        </Link>
      </section>
    </div>
  )
}
