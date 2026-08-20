import { notFound, redirect } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProject } from '@/lib/project'
import { VenueDetailTabs } from '@/components/venues/venue-detail-tabs'

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>
}) {
  const { lang, id } = await params
  if (!hasLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${lang}/auth/login`)

  const project = await getCurrentProject(supabase, user.id)
  if (!project) redirect(`/${lang}/projects/new`)

  const { data: venue } = await supabase
    .from('venues')
    .select('id, name, location_city, location_country, archetype, status, notes')
    .eq('id', id)
    .maybeSingle()

  // RLS returns no row rather than an error for a venue outside this
  // project — same result as a genuinely missing id, so both 404.
  if (!venue) notFound()

  const [{ data: sources }, { data: facts }, { data: contacts }, { data: accommodations }, { data: documents }, { data: enquiry }] = await Promise.all([
    supabase.from('venue_sources').select('id, url, platform, title, image_url, description, price_shown').eq('venue_id', id).order('created_at', { ascending: false }),
    supabase.from('venue_facts').select('id, fact_key, fact_value, confidence').eq('venue_id', id).order('created_at', { ascending: false }),
    supabase.from('venue_contacts').select('id, name, email, phone, role').eq('venue_id', id),
    supabase.from('accommodations').select('id, name, type, confidence, pricing_mode, block_nightly_rate, block_currency').eq('venue_id', id).order('created_at', { ascending: false }),
    supabase.from('venue_documents').select('id, storage_path, filename, created_at').eq('venue_id', id).order('created_at', { ascending: false }),
    // Every venue has exactly one enquiry (Phase 2 trigger) — safe to assume it exists.
    supabase.from('enquiries').select('id, status, follow_up_date').eq('venue_id', id).single(),
  ])

  const accommodationIds = (accommodations ?? []).map((a) => a.id)
  const { data: accommodationRooms } = await supabase
    .from('accommodation_rooms')
    .select('id, accommodation_id, label, room_type, capacity_adults, capacity_children, nightly_rate, currency')
    .in('accommodation_id', accommodationIds.length > 0 ? accommodationIds : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: true })

  // Signed URLs generated fresh per page load — documents live in a private bucket.
  const documentsWithUrls = await Promise.all(
    (documents ?? []).map(async (doc) => {
      const { data: signed } = await supabase.storage
        .from('wedding-documents')
        .createSignedUrl(doc.storage_path, 60)
      return { ...doc, signedUrl: signed?.signedUrl ?? null }
    }),
  )

  return (
    <VenueDetailTabs
      lang={lang}
      dict={dict}
      venue={venue}
      sources={sources ?? []}
      facts={facts ?? []}
      contacts={contacts ?? []}
      accommodations={accommodations ?? []}
      accommodationRooms={accommodationRooms ?? []}
      documents={documentsWithUrls}
      projectId={project.id}
      enquiry={enquiry ?? null}
    />
  )
}
