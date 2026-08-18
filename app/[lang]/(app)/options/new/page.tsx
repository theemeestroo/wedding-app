import { notFound, redirect } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProject } from '@/lib/project'
import { CreateOptionForm } from '@/components/options/create-option-form'

export const metadata = { title: 'Create option — Aisle' }

export default async function NewOptionPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${lang}/auth/login`)

  const project = await getCurrentProject(supabase, user.id)
  if (!project) redirect(`/${lang}/projects/new`)

  const [{ data: plans }, { data: venues }] = await Promise.all([
    supabase.from('guest_plans').select('id, name').eq('project_id', project.id),
    supabase.from('venues').select('id, name').eq('project_id', project.id),
  ])

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{dict.options.create.title}</h1>
      <CreateOptionForm
        lang={lang}
        dict={dict}
        projectId={project.id}
        plans={plans ?? []}
        venues={venues ?? []}
      />
    </div>
  )
}
