import { notFound, redirect } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProject } from '@/lib/project'
import { CsvImportFlow } from '@/components/guests/csv-import-flow'

export const metadata = { title: 'Import guests — Wedding Decision Platform' }

export default async function ImportGuestsPage({
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{dict.guests.import.title}</h1>
      <CsvImportFlow lang={lang} dict={dict} projectId={project.id} />
    </div>
  )
}
