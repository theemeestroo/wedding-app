import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { localizePath, interpolate, daysSince } from '@/lib/locale'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProject, getProjectMembers } from '@/lib/project'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  const d = dict.project.dashboard
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${lang}/auth/login`)

  const project = await getCurrentProject(supabase, user.id)
  if (!project) redirect(`/${lang}/projects/new`)

  const members = await getProjectMembers(supabase, project.id)
  const { count: venueCount } = await supabase
    .from('venues')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', project.id)

  const { data: venueIdRows } = await supabase.from('venues').select('id').eq('project_id', project.id)
  const venueIds = (venueIdRows ?? []).map((v) => v.id)

  const { data: enquiryRows } = await supabase
    .from('enquiries')
    .select('id, status, follow_up_date')
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

  const today = new Date().toISOString().slice(0, 10)
  const awaitingReplyCount = (enquiryRows ?? []).filter((e) => {
    if (e.status !== 'sent' && e.status !== 'awaiting_response') return false
    const lastEvent = lastEventByEnquiry.get(e.id)
    if (!lastEvent) return false
    return daysSince(lastEvent) >= 5
  }).length
  const followUpsDueCount = (enquiryRows ?? []).filter((e) => e.follow_up_date && e.follow_up_date <= today).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
        <p className="text-sm text-muted-foreground">
          {d.currencyLabel}: {project.currency}
        </p>
      </div>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {d.membersHeading}
        </h2>
        <ul className="space-y-2">
          {members?.map((m, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span>{m.profile?.full_name || m.profile?.email}</span>
              <span className="text-muted-foreground capitalize">{m.role}</span>
            </li>
          ))}
        </ul>
        <Link
          href={localizePath(lang, '/settings/members')}
          className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {d.inviteCta}
        </Link>
      </section>

      {(awaitingReplyCount > 0 || followUpsDueCount > 0) && (
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {d.needsAttentionHeading}
          </h2>
          <p className="text-sm">
            {awaitingReplyCount > 0 && interpolate(d.awaitingReplyCount, { count: awaitingReplyCount })}
            {awaitingReplyCount > 0 && followUpsDueCount > 0 && ' · '}
            {followUpsDueCount > 0 && interpolate(d.followUpsDueCount, { count: followUpsDueCount })}
          </p>
          <Link
            href={localizePath(lang, '/enquiries')}
            className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {d.viewEnquiries}
          </Link>
        </section>
      )}

      {venueCount && venueCount > 0 ? (
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {d.venuesHeading}
          </h2>
          <p className="text-sm">{interpolate(d.venueCount, { count: venueCount })}</p>
          <Link
            href={localizePath(lang, '/venues')}
            className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {d.viewVenues}
          </Link>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed bg-card p-6 text-center">
          <p className="mb-3 text-sm text-muted-foreground">{d.noVenuesYet}</p>
          <Link
            href={localizePath(lang, '/venues/new')}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90"
          >
            {d.addVenueCta}
          </Link>
        </section>
      )}
    </div>
  )
}
