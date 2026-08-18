import { notFound, redirect } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProject, getProjectMembers } from '@/lib/project'
import { computeIncludedHouseholds, sumHeadcount, type PlanHousehold, type Headcount } from '@/lib/guest-plan'
import { computeOptionCosts, type CostRuleInput, type OptionEventInput } from '@/lib/cost-engine'
import { computeOptionLogistics, type HouseholdClusterInput, type ClusterCoordsInput } from '@/lib/journey-engine'
import { CompareBoard } from '@/components/compare/compare-board'

export const metadata = { title: 'Compare — Aisle' }

// Synthetic guest-count sweep for the break-even chart (PRD §13) — the
// current plan's adult:child ratio is preserved at each point.
const BREAK_EVEN_GUEST_COUNTS = [20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150]

export default async function ComparePage({
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

  const { data: options } = await supabase
    .from('options')
    .select(
      'id, name, guest_plan_id, venue_id, guest_plans(id, name, included_tier_ids, included_groups), venues(id, name, archetype, latitude, longitude)',
    )
    .eq('project_id', project.id)
    .order('created_at', { ascending: true })

  if (!options || options.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{dict.compare.heading}</h1>
        <p className="text-sm text-muted-foreground">{dict.compare.empty}</p>
      </div>
    )
  }

  const optionIds = options.map((o) => o.id)
  const venueIds = [...new Set(options.map((o) => o.venue_id))]
  const guestPlanIds = [...new Set(options.map((o) => o.guest_plan_id))]

  const [
    { data: households },
    { data: exceptionRows },
    { data: rules },
    { data: events },
    { data: clusters },
    { data: ratings },
    { data: decision },
  ] = await Promise.all([
    supabase.from('households').select('id, name, tier_id, group_label, origin_cluster_id').eq('project_id', project.id),
    supabase.from('guest_plan_exceptions').select('guest_plan_id, household_id, include').in('guest_plan_id', guestPlanIds),
    supabase
      .from('cost_rules')
      .select('id, label, basis, rate, currency, min_guests, max_guests, confidence, event_type, venue_id, guest_plan_id, option_id')
      .or(`venue_id.in.(${venueIds.join(',')}),guest_plan_id.in.(${guestPlanIds.join(',')}),option_id.in.(${optionIds.join(',')})`),
    supabase
      .from('option_events')
      .select('id, option_id, event_type, attendance_mode, attendance_percentage, attendance_adults, attendance_children, nights, rooms, hours, is_primary')
      .in('option_id', optionIds),
    supabase.from('origin_clusters').select('id, label, centroid_lat, centroid_lng').eq('project_id', project.id),
    supabase.from('ratings').select('id, option_id, profile_id, rating').in('option_id', optionIds),
    supabase.from('decisions').select('option_id').eq('project_id', project.id).maybeSingle(),
  ])

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
    tierId: h.tier_id,
    groupLabel: h.group_label,
    adultCount: adultCountByHousehold.get(h.id) ?? 0,
    childCount: childCountByHousehold.get(h.id) ?? 0,
  }))
  const clusterByHousehold = new Map((households ?? []).map((h) => [h.id, h.origin_cluster_id]))

  const exceptionsByPlan = new Map<string, Map<string, boolean>>()
  for (const e of exceptionRows ?? []) {
    if (!exceptionsByPlan.has(e.guest_plan_id)) exceptionsByPlan.set(e.guest_plan_id, new Map())
    exceptionsByPlan.get(e.guest_plan_id)!.set(e.household_id, e.include)
  }

  const members = await getProjectMembers(supabase, project.id)
  const memberNames = new Map(members.map((m) => [m.profile?.id, m.profile?.full_name || m.profile?.email || '']))

  const clusterCoords: ClusterCoordsInput[] = (clusters ?? []).map((c) => ({
    id: c.id,
    label: c.label,
    lat: c.centroid_lat,
    lng: c.centroid_lng,
  }))

  const comparisons = options.map((o) => {
    const plan = Array.isArray(o.guest_plans) ? o.guest_plans[0] : o.guest_plans
    const venue = Array.isArray(o.venues) ? o.venues[0] : o.venues

    const exceptions = exceptionsByPlan.get(o.guest_plan_id) ?? new Map()
    const includedHouseholds = plan
      ? computeIncludedHouseholds(planHouseholds, { includedTierIds: plan.included_tier_ids, includedGroups: plan.included_groups }, exceptions)
      : []
    const headcount = sumHeadcount(includedHouseholds)

    const ruleInputs: CostRuleInput[] = (rules ?? [])
      .filter((r) => r.venue_id === o.venue_id || r.guest_plan_id === o.guest_plan_id || r.option_id === o.id)
      .map((r) => ({
        id: r.id,
        label: r.label,
        basis: r.basis,
        rate: r.rate,
        currency: r.currency,
        minGuests: r.min_guests,
        maxGuests: r.max_guests,
        confidence: r.confidence,
        eventType: r.event_type,
      }))
    const eventInputs: OptionEventInput[] = (events ?? [])
      .filter((e) => e.option_id === o.id)
      .map((e) => ({
        id: e.id,
        eventType: e.event_type,
        attendanceMode: e.attendance_mode,
        attendancePercentage: e.attendance_percentage,
        attendanceAdults: e.attendance_adults,
        attendanceChildren: e.attendance_children,
        nights: e.nights,
        rooms: e.rooms,
        hours: e.hours,
        isPrimary: e.is_primary,
      }))

    const summary = computeOptionCosts(ruleInputs, eventInputs, headcount)

    const venueCoords = venue?.latitude != null && venue?.longitude != null ? { lat: venue.latitude, lng: venue.longitude } : null
    const householdClusterInputs: HouseholdClusterInput[] = includedHouseholds.map((h) => ({
      householdId: h.id,
      clusterId: clusterByHousehold.get(h.id) ?? null,
      guestCount: h.adultCount + h.childCount,
    }))
    const logistics = venueCoords ? computeOptionLogistics(householdClusterInputs, clusterCoords, venueCoords) : null

    const optionRatings = (ratings ?? [])
      .filter((r) => r.option_id === o.id)
      .map((r) => ({ profileId: r.profile_id, rating: r.rating as 'love' | 'like' | 'neutral' | 'dislike', name: memberNames.get(r.profile_id) ?? '' }))
    const myRating = optionRatings.find((r) => r.profileId === user.id) ?? null

    const breakEven = BREAK_EVEN_GUEST_COUNTS.map((guestCount) => {
      const adultRatio = headcount.total > 0 ? headcount.adults / headcount.total : 1
      const adults = Math.round(guestCount * adultRatio)
      const synthetic: Headcount = { adults, children: guestCount - adults, total: guestCount }
      return computeOptionCosts(ruleInputs, eventInputs, synthetic).total.mid
    })

    return {
      id: o.id,
      name: o.name,
      planName: plan?.name ?? '—',
      venueName: venue?.name ?? '—',
      totalLow: summary.total.low,
      totalMid: summary.total.mid,
      totalHigh: summary.total.high,
      perGuest: summary.perGuest,
      mixedCurrency: summary.mixedCurrency,
      headcountTotal: headcount.total,
      hasVenueCoords: venueCoords !== null,
      totalGuestHours: logistics?.totalGuestHours ?? null,
      bandCounts: logistics?.bandCounts ?? null,
      myRating: myRating?.rating ?? null,
      ratings: optionRatings,
      isDecided: decision?.option_id === o.id,
      breakEven,
      venueCoords,
      householdClusterInputs,
    }
  })

  return (
    <CompareBoard
      dict={dict}
      lang={lang}
      currency={project.currency}
      options={comparisons}
      breakEvenGuestCounts={BREAK_EVEN_GUEST_COUNTS}
      clusterCoords={clusterCoords}
    />
  )
}
