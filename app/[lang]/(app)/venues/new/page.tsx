import { notFound, redirect } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProject } from '@/lib/project'
import { AddVenueForm } from '@/components/venues/add-venue-form'

export const metadata = { title: 'Add a venue — The Wedding Lab' }

export default async function NewVenuePage({
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
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{dict.venues.add.title}</h1>
      <AddVenueForm lang={lang} dict={dict} projectId={project.id} />
    </div>
  )
}
