import { notFound, redirect } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProject } from '@/lib/project'
import { PlanForm } from '@/components/plans/plan-form'
import { PlanCard, type PlanHousehold } from '@/components/plans/plan-card'

export const metadata = { title: 'Guest plans — Wedding Decision Platform' }

export default async function PlansPage({
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

  const [{ data: plans }, { data: households }] = await Promise.all([
    supabase.from('guest_plans').select('id, name, included_tiers, included_groups').eq('project_id', project.id),
    supabase.from('households').select('id, name, tier, group_label').eq('project_id', project.id),
  ])

  const householdIds = (households ?? []).map((h) => h.id)
  const { data: guests } = await supabase
    .from('guests')
    .select('household_id')
    .in('household_id', householdIds.length > 0 ? householdIds : ['00000000-0000-0000-0000-000000000000'])

  const guestCountByHousehold = new Map<string, number>()
  for (const g of guests ?? []) {
    guestCountByHousehold.set(g.household_id, (guestCountByHousehold.get(g.household_id) ?? 0) + 1)
  }

  const planHouseholds: PlanHousehold[] = (households ?? []).map((h) => ({
    id: h.id,
    name: h.name,
    tier: h.tier,
    groupLabel: h.group_label,
    guestCount: guestCountByHousehold.get(h.id) ?? 0,
  }))

  const planIds = (plans ?? []).map((p) => p.id)
  const { data: exceptionRows } = await supabase
    .from('guest_plan_exceptions')
    .select('guest_plan_id, household_id, include')
    .in('guest_plan_id', planIds.length > 0 ? planIds : ['00000000-0000-0000-0000-000000000000'])

  const exceptionsByPlan = new Map<string, Map<string, boolean>>()
  for (const ex of exceptionRows ?? []) {
    const map = exceptionsByPlan.get(ex.guest_plan_id) ?? new Map()
    map.set(ex.household_id, ex.include)
    exceptionsByPlan.set(ex.guest_plan_id, map)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{dict.plans.heading}</h1>

      <PlanForm dict={dict} projectId={project.id} />

      <div className="space-y-3">
        {(plans ?? []).map((p) => (
          <PlanCard
            key={p.id}
            dict={dict}
            plan={{ id: p.id, name: p.name, includedTiers: p.included_tiers, includedGroups: p.included_groups }}
            households={planHouseholds}
            exceptions={exceptionsByPlan.get(p.id) ?? new Map()}
          />
        ))}
        {(plans?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">{dict.plans.empty}</p>}
      </div>
    </div>
  )
}
