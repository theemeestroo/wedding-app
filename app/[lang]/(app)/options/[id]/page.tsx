import { notFound, redirect } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProject, getProjectMembers } from '@/lib/project'
import { computeIncludedHouseholds, sumHeadcount, type PlanHousehold } from '@/lib/guest-plan'
import { OptionDetail } from '@/components/options/option-detail'

export default async function OptionDetailPage({
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

  const { data: option } = await supabase
    .from('options')
    .select('id, name, guest_plan_id, venue_id')
    .eq('id', id)
    .maybeSingle()

  if (!option) notFound()

  const [
    { data: plan },
    { data: venue },
    { data: enquiry },
    { data: events },
    { data: clusters },
    { data: ratings },
    { data: decision },
    { data: accommodations },
    { data: arrivalProfiles },
    { data: allocations },
  ] = await Promise.all([
    supabase.from('guest_plans').select('id, name, included_tiers, included_groups').eq('id', option.guest_plan_id).single(),
    supabase.from('venues').select('id, name, archetype, location_city, location_country, latitude, longitude').eq('id', option.venue_id).single(),
    supabase.from('enquiries').select('id').eq('venue_id', option.venue_id).maybeSingle(),
    supabase
      .from('option_events')
      .select('id, event_type, label, event_date, attendance_mode, attendance_percentage, attendance_adults, attendance_children, nights, rooms, hours, is_primary')
      .eq('option_id', id)
      .order('is_primary', { ascending: false }),
    supabase.from('origin_clusters').select('id, label, centroid_lat, centroid_lng').eq('project_id', project.id),
    supabase.from('ratings').select('id, profile_id, rating, note').eq('option_id', id),
    supabase.from('decisions').select('option_id, rationale, decided_at').eq('project_id', project.id).maybeSingle(),
    supabase.from('accommodations').select('id, name, nightly_rate, currency').eq('venue_id', option.venue_id),
    supabase
      .from('arrival_profiles')
      .select('id, household_id, arrival_date, arrival_window, departure_date, departure_window, visa_notes')
      .eq('option_id', id),
    supabase.from('allocations').select('id, household_id, accommodation_id, rooms_assigned').eq('option_id', id),
  ])

  if (!plan || !venue) notFound()

  const { data: households } = await supabase
    .from('households')
    .select('id, name, tier, group_label, origin_cluster_id')
    .eq('project_id', project.id)

  const householdIds = (households ?? []).map((h) => h.id)
  const { data: guests } = await supabase
    .from('guests')
    .select('household_id, is_child')
    .in('household_id', householdIds.length > 0 ? householdIds : ['00000000-0000-0000-0000-000000000000'])

  const adultCountByHousehold = new Map<string, number>()
  const childCountByHousehold = new Map<string, number>()
  for (const g of guests ?? []) {
    const map = g.is_child ? childCountByHousehold : adultCountByHousehold
    map.set(g.household_id, (map.get(g.household_id) ?? 0) + 1)
  }

  const planHouseholds: PlanHousehold[] = (households ?? []).map((h) => ({
    id: h.id,
    name: h.name,
    tier: h.tier,
    groupLabel: h.group_label,
    adultCount: adultCountByHousehold.get(h.id) ?? 0,
    childCount: childCountByHousehold.get(h.id) ?? 0,
  }))

  const { data: exceptionRows } = await supabase
    .from('guest_plan_exceptions')
    .select('household_id, include')
    .eq('guest_plan_id', option.guest_plan_id)

  const exceptions = new Map((exceptionRows ?? []).map((e) => [e.household_id, e.include]))
  const includedHouseholds = computeIncludedHouseholds(
    planHouseholds,
    { includedTiers: plan.included_tiers, includedGroups: plan.included_groups },
    exceptions,
  )
  const headcount = sumHeadcount(includedHouseholds)

  const { data: rules } = await supabase
    .from('cost_rules')
    .select('id, label, basis, rate, currency, min_guests, max_guests, confidence, event_type, venue_id, guest_plan_id, option_id')
    .or(`venue_id.eq.${option.venue_id},guest_plan_id.eq.${option.guest_plan_id},option_id.eq.${id}`)

  const clusterByHousehold = new Map((households ?? []).map((h) => [h.id, h.origin_cluster_id]))
  const householdClusterInputs = includedHouseholds.map((h) => ({
    householdId: h.id,
    clusterId: clusterByHousehold.get(h.id) ?? null,
    guestCount: h.adultCount + h.childCount,
  }))

  const members = await getProjectMembers(supabase, project.id)
  const memberNames = new Map(
    members.map((m) => [m.profile?.id, m.profile?.full_name || m.profile?.email || '']),
  )

  return (
    <OptionDetail
      lang={lang}
      dict={dict}
      option={{ id: option.id, name: option.name }}
      plan={{ id: plan.id, name: plan.name }}
      venue={{
        id: venue.id,
        name: venue.name,
        archetype: venue.archetype,
        locationCity: venue.location_city,
        locationCountry: venue.location_country,
        latitude: venue.latitude,
        longitude: venue.longitude,
      }}
      enquiryId={enquiry?.id ?? null}
      events={events ?? []}
      rules={rules ?? []}
      headcount={headcount}
      currency={project.currency}
      projectId={project.id}
      clusters={(clusters ?? []).map((c) => ({ id: c.id, label: c.label, lat: c.centroid_lat, lng: c.centroid_lng }))}
      householdClusters={householdClusterInputs}
      households={includedHouseholds.map((h) => ({ id: h.id, name: h.name }))}
      accommodations={accommodations ?? []}
      arrivalProfiles={arrivalProfiles ?? []}
      allocations={allocations ?? []}
      ratings={ratings ?? []}
      memberNames={Object.fromEntries(memberNames)}
      currentUserId={user.id}
      decision={decision ?? null}
      canDecide={project.canManageMembers}
    />
  )
}
