import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { localizePath } from '@/lib/locale'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProject, getProjectMembers } from '@/lib/project'
import { InviteForm } from '@/components/projects/invite-form'

export const metadata = { title: 'Members — The Wedding Lab' }

export default async function MembersPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  const d = dict.project.members
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${lang}/auth/login`)

  const project = await getCurrentProject(supabase, user.id)
  if (!project) redirect(`/${lang}/projects/new`)

  const members = await getProjectMembers(supabase, project.id)

  const { data: pendingInvites } = await supabase
    .from('project_invitations')
    .select('id, email, role, expires_at')
    .eq('project_id', project.id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{d.heading}</h1>

      <section className="rounded-2xl border bg-card p-6">
        <ul className="space-y-2">
          {members.map((m, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span>{m.profile?.full_name || m.profile?.email}</span>
              <span className="text-muted-foreground capitalize">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>

      {project.canManageMembers && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {d.inviteHeading}
          </h2>
          <InviteForm lang={lang} dict={dict} projectId={project.id} inviterProfileId={user.id} />

          {pendingInvites && pendingInvites.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {d.pendingHeading}
              </h3>
              <ul className="space-y-1">
                {pendingInvites.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between text-sm">
                    <span>{inv.email}</span>
                    <span className="text-muted-foreground capitalize">{inv.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {project.canManageMembers && (
        <Link
          href={localizePath(lang, '/settings/project')}
          className="inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {d.projectSettingsLink}
        </Link>
      )}
    </div>
  )
}
