/**
 * Guest-plan inclusion logic — extracted from components/plans/plan-card.tsx
 * so the Phase 4 cost engine can reuse the exact same "which households are
 * in this plan" computation instead of re-deriving it. Pure, no React/client
 * dependencies — safe from server or client code.
 */

export interface PlanHousehold {
  id: string
  name: string
  tier: string
  groupLabel: string | null
  adultCount: number
  childCount: number
}

export interface PlanRules {
  includedTiers: string[]
  includedGroups: string[]
}

export function isHouseholdIncluded(
  household: PlanHousehold,
  plan: PlanRules,
  exceptions: Map<string, boolean>,
): boolean {
  if (exceptions.has(household.id)) return exceptions.get(household.id)!
  return (
    plan.includedTiers.includes(household.tier) ||
    (household.groupLabel ? plan.includedGroups.includes(household.groupLabel) : false)
  )
}

export function computeIncludedHouseholds(
  households: PlanHousehold[],
  plan: PlanRules,
  exceptions: Map<string, boolean>,
): PlanHousehold[] {
  return households.filter((h) => isHouseholdIncluded(h, plan, exceptions))
}

export interface Headcount {
  adults: number
  children: number
  total: number
}

export function sumHeadcount(households: PlanHousehold[]): Headcount {
  const adults = households.reduce((sum, h) => sum + h.adultCount, 0)
  const children = households.reduce((sum, h) => sum + h.childCount, 0)
  return { adults, children, total: adults + children }
}
