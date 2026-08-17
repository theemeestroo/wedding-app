import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { localizePath } from '@/lib/locale'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProject } from '@/lib/project'
import { EnquiryStatusBadge, type EnquiryStatus } from '@/components/enquiries/enquiry-status-badge'
import { EnquiryStatusForm } from '@/components/enquiries/enquiry-status-form'
import { EnquiryTimeline } from '@/components/enquiries/enquiry-timeline'
import { EnquiryQuotes } from '@/components/enquiries/enquiry-quotes'
import { EnquiryMessageGenerator } from '@/components/enquiries/enquiry-message-generator'

export default async function EnquiryDetailPage({
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

  const { data: enquiry } = await supabase
    .from('enquiries')
    .select('id, venue_id, status, follow_up_date, next_action')
    .eq('id', id)
    .maybeSingle()

  if (!enquiry) notFound()

  const [{ data: venue }, { data: events }, { data: quotes }, { data: documents }, { data: facts }] = await Promise.all([
    supabase.from('venues').select('name').eq('id', enquiry.venue_id).single(),
    supabase.from('enquiry_events').select('id, event_type, occurred_at, notes, document_id').eq('enquiry_id', id).order('occurred_at', { ascending: false }),
    supabase.from('quotes').select('id, amount, currency, valid_until, notes, document_id').eq('enquiry_id', id).order('received_at', { ascending: false }),
    supabase.from('venue_documents').select('id, filename').eq('venue_id', enquiry.venue_id),
    supabase.from('venue_facts').select('fact_key').eq('venue_id', enquiry.venue_id),
  ])

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={localizePath(lang, `/venues/${enquiry.venue_id}`)}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {venue?.name}
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{dict.enquiries.detail.heading}</h1>
          <EnquiryStatusBadge dict={dict} status={enquiry.status as EnquiryStatus} />
        </div>
      </div>

      <EnquiryStatusForm
        dict={dict}
        enquiryId={enquiry.id}
        status={enquiry.status as EnquiryStatus}
        followUpDate={enquiry.follow_up_date}
        nextAction={enquiry.next_action}
      />

      <EnquiryMessageGenerator
        dict={dict}
        venueName={venue?.name ?? ''}
        existingFactKeys={(facts ?? []).map((f) => f.fact_key)}
      />

      <EnquiryTimeline dict={dict} enquiryId={enquiry.id} events={events ?? []} documents={documents ?? []} />

      <EnquiryQuotes dict={dict} enquiryId={enquiry.id} quotes={quotes ?? []} documents={documents ?? []} />
    </div>
  )
}
