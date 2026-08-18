import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { localizePath } from '@/lib/locale'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProject } from '@/lib/project'
import { DeleteProject } from '@/components/settings/delete-project'

export const metadata = { title: 'Project settings — Aisle' }

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  const d = dict.settings
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${lang}/auth/login`)

  const project = await getCurrentProject(supabase, user.id)
  if (!project) redirect(`/${lang}/projects/new`)

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{d.project.heading}</h1>

      <p className="text-sm text-muted-foreground">
        {d.project.privacyLink}{' '}
        <Link href={localizePath(lang, '/privacy')} className="text-primary underline-offset-4 hover:underline">
          {d.project.privacyLinkCta}
        </Link>
      </p>

      {project.canManageMembers && (
        <DeleteProject dict={dict} projectId={project.id} projectName={project.name} />
      )}
    </div>
  )
}
