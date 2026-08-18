import { notFound, redirect } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProject } from '@/lib/project'
import { TierManager } from '@/components/settings/tier-manager'

export const metadata = { title: 'Manage tiers — Aisle' }

export default async function TiersSettingsPage({
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

  const { data: tierDefinitions } = await supabase
    .from('tier_definitions')
    .select('id, label, sort_order')
    .eq('project_id', project.id)
    .order('sort_order', { ascending: true })
  const tiers = (tierDefinitions ?? []).map((t) => ({ id: t.id, label: t.label, sortOrder: t.sort_order }))

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{dict.settings.tiers.heading}</h1>
      <TierManager dict={dict} projectId={project.id} tiers={tiers} />
    </div>
  )
}
