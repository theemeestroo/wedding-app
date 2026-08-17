import { notFound, redirect } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProject } from '@/lib/project'
import { VenueBoard } from '@/components/venues/venue-board'
import type { VenueCardData } from '@/components/venues/venue-card'

export const metadata = { title: 'Venues — Wedding Decision Platform' }

export default async function VenuesPage({
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

  const { data } = await supabase
    .from('venues')
    .select('id, name, location_city, location_country, status, venue_sources(image_url)')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })

  const venues: VenueCardData[] = (data ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    location_city: v.location_city,
    location_country: v.location_country,
    status: v.status,
    image_url: v.venue_sources?.find((s) => s.image_url)?.image_url ?? null,
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{dict.nav.venues}</h1>
      <VenueBoard lang={lang} dict={dict} venues={venues} />
    </div>
  )
}
