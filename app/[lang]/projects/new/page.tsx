import { notFound, redirect } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProject } from '@/lib/project'
import { CreateProjectForm } from '@/components/projects/create-project-form'

export const metadata = { title: 'Create your project — Wedding Decision Platform' }

// Deliberately outside the (app) route group — that layout redirects here
// when the user has no project yet, so this page can't live inside it
// without an infinite redirect loop.
export default async function NewProjectPage({
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

  const existing = await getCurrentProject(supabase, user.id)
  if (existing) redirect(`/${lang}/dashboard`)

  const d = dict.project.create

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-16">
      <div className="mb-6 space-y-1.5 text-center">
        <h1 className="text-xl font-bold tracking-tight">{d.title}</h1>
        <p className="text-sm text-muted-foreground">{d.subtitle}</p>
      </div>
      <CreateProjectForm lang={lang} dict={dict} />
    </div>
  )
}
