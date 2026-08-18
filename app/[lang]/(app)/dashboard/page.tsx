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
    <div className="space-y-9">
      <div className="border-b pb-7">
        <p className="mb-2.5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
          <span className="h-px w-8 bg-primary/50" aria-hidden="true" />
          {d.currencyLabel}: {project.currency}
        </p>
        <h1 className="font-heading text-4xl italic tracking-tight sm:text-5xl">{project.name}</h1>
      </div>

      <DashboardSection heading={d.membersHeading}>
        <ul className="divide-y divide-border/60">
          {members?.map((m, i) => (
            <li key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-sm italic text-primary">
                {initials(m.profile?.full_name || m.profile?.email)}
              </span>
              <span className="flex-1 text-sm">{m.profile?.full_name || m.profile?.email}</span>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{m.role}</span>
            </li>
          ))}
        </ul>
        <Link
          href={localizePath(lang, '/settings/members')}
          className="mt-5 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {d.inviteCta}
        </Link>
      </DashboardSection>

      {(awaitingReplyCount > 0 || followUpsDueCount > 0) && (
        <DashboardSection heading={d.needsAttentionHeading}>
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
        </DashboardSection>
      )}

      {venueCount && venueCount > 0 ? (
        <DashboardSection heading={d.venuesHeading}>
          <p className="text-sm">{interpolate(d.venueCount, { count: venueCount })}</p>
          <Link
            href={localizePath(lang, '/venues')}
            className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {d.viewVenues}
          </Link>
        </DashboardSection>
      ) : (
        <section className="rounded-2xl border border-dashed bg-card p-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">{d.noVenuesYet}</p>
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

function initials(name: string | null | undefined) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  const chars = parts.slice(0, 2).map((p) => p[0]?.toUpperCase())
  return chars.join('') || '?'
}

function DashboardSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-6 sm:p-7">
      <h2 className="mb-5 flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
        <span className="h-px w-5 bg-primary/40" aria-hidden="true" />
        {heading}
      </h2>
      {children}
    </section>
  )
}
