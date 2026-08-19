import { notFound, redirect } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { daysSince } from '@/lib/locale'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProject } from '@/lib/project'
import { EnquiryList, type EnquiryListItem } from '@/components/enquiries/enquiry-list'
import type { EnquiryStatus } from '@/components/enquiries/enquiry-status-badge'

export const metadata = { title: 'Enquiries — The Wedding Lab' }

export default async function EnquiriesPage({
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

  const { data: venues } = await supabase
    .from('venues')
    .select('id, name')
    .eq('project_id', project.id)

  const venueIds = (venues ?? []).map((v) => v.id)
  const venueNameById = new Map((venues ?? []).map((v) => [v.id, v.name]))

  const { data: enquiryRows } = await supabase
    .from('enquiries')
    .select('id, venue_id, status, follow_up_date')
    .in('venue_id', venueIds.length > 0 ? venueIds : ['00000000-0000-0000-0000-000000000000'])

  const enquiryIds = (enquiryRows ?? []).map((e) => e.id)
  const { data: eventRows } = await supabase
    .from('enquiry_events')
    .select('enquiry_id, occurred_at')
    .in('enquiry_id', enquiryIds.length > 0 ? enquiryIds : ['00000000-0000-0000-0000-000000000000'])
    .order('occurred_at', { ascending: false })

  const lastEventByEnquiry = new Map<string, string>()
  for (const ev of eventRows ?? []) {
    if (!lastEventByEnquiry.has(ev.enquiry_id)) lastEventByEnquiry.set(ev.enquiry_id, ev.occurred_at)
  }

  const enquiries: EnquiryListItem[] = (enquiryRows ?? []).map((e) => {
    const lastEvent = lastEventByEnquiry.get(e.id)
    const daysSinceLastEvent = lastEvent ? daysSince(lastEvent) : null
    return {
      id: e.id,
      venueId: e.venue_id,
      venueName: venueNameById.get(e.venue_id) ?? '',
      status: e.status as EnquiryStatus,
      followUpDate: e.follow_up_date,
      daysSinceLastEvent,
    }
  })

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{dict.nav.enquiries}</h1>
      <EnquiryList lang={lang} dict={dict} enquiries={enquiries} />
    </div>
  )
}
