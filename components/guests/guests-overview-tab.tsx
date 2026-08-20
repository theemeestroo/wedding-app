import type { Dictionary } from '@/lib/i18n'
import { interpolate } from '@/lib/locale'
import type { Household, TierOption } from '@/components/guests/household-card'
import type { GuestRow, GuestsFilter } from '@/components/guests/shared'
import { RSVP_STATUSES, type RsvpStatus } from '@/components/guests/rsvp-status-control'

interface BreakdownRow {
  key: string
  label: string
  householdCount: number
  guestCount: number
}

function groupCounts(households: Household[], guestsByHousehold: Map<string, GuestRow[]>) {
  return (hh: Household[]) => ({
    householdCount: hh.length,
    guestCount: hh.reduce((sum, h) => sum + (guestsByHousehold.get(h.id)?.length ?? 0), 0),
  })
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

function BreakdownList({
  dict,
  heading,
  rows,
  totalGuests,
  emptyLabel,
  onSelect,
}: {
  dict: Dictionary
  heading: string
  rows: BreakdownRow[]
  totalGuests: number
  emptyLabel: string
  onSelect: (key: string) => void
}) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">{heading}</h3>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">{emptyLabel}</p>}
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.key}>
            <button onClick={() => onSelect(row.key)} className="w-full text-left">
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{row.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {interpolate(dict.guests.origins.countSummary, {
                    households: row.householdCount,
                    guests: row.guestCount,
                  })}
                </span>
              </div>
              <div className="relative h-1.5 w-full rounded-full bg-muted">
                <div
                  className="absolute h-1.5 rounded-full bg-gold/60"
                  style={{ width: `${totalGuests > 0 ? (row.guestCount / totalGuests) * 100 : 0}%` }}
                />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function GuestsOverviewTab({
  dict,
  households,
  guests,
  tiers,
  existingGroups,
  onNavigate,
}: {
  dict: Dictionary
  households: Household[]
  guests: GuestRow[]
  tiers: TierOption[]
  existingGroups: string[]
  onNavigate: (patch: Partial<GuestsFilter>) => void
}) {
  const d = dict.guests.overview

  const guestsByHousehold = new Map<string, GuestRow[]>()
  for (const g of guests) {
    const list = guestsByHousehold.get(g.household_id) ?? []
    list.push(g)
    guestsByHousehold.set(g.household_id, list)
  }
  const counts = groupCounts(households, guestsByHousehold)

  const totalGuests = guests.length
  const adults = guests.filter((g) => !g.is_child).length
  const children = guests.filter((g) => g.is_child).length
  const attending = guests.filter((g) => g.rsvp_status === 'attending').length

  const tierRows: BreakdownRow[] = [
    ...tiers.map((t) => ({ key: t.id, label: t.label, ...counts(households.filter((h) => h.tier_id === t.id)) })),
    { key: '__untiered', label: dict.settings.tiers.noTierOption, ...counts(households.filter((h) => !h.tier_id)) },
  ].filter((r) => r.householdCount > 0)

  const groupRows: BreakdownRow[] = [
    ...existingGroups.map((g) => ({ key: g, label: g, ...counts(households.filter((h) => h.group_label === g)) })),
    { key: '__ungrouped', label: d.ungrouped, ...counts(households.filter((h) => !h.group_label)) },
  ].filter((r) => r.householdCount > 0)

  const statusRows: { key: RsvpStatus; label: string; householdCount: number; guestCount: number }[] = RSVP_STATUSES.map(
    (s) => {
      const matching = guests.filter((g) => g.rsvp_status === s)
      const hh = new Set(matching.map((g) => g.household_id))
      return { key: s, label: dict.guests.rsvp[s], householdCount: hh.size, guestCount: matching.length }
    },
  ).filter((r) => r.guestCount > 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label={d.totalGuests} value={totalGuests} />
        <StatCard label={d.totalHouseholds} value={households.length} />
        <StatCard label={d.adults} value={adults} />
        <StatCard label={d.children} value={children} />
        <StatCard label={d.attending} value={`${attending} / ${totalGuests}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownList
          dict={dict}
          heading={d.byTier}
          rows={tierRows}
          totalGuests={totalGuests}
          emptyLabel={d.noTiers}
          onSelect={(key) => onNavigate({ tierId: key === '__untiered' ? null : key, group: null, rsvpStatus: null })}
        />
        <BreakdownList
          dict={dict}
          heading={d.byGroup}
          rows={groupRows}
          totalGuests={totalGuests}
          emptyLabel={d.noGroups}
          onSelect={(key) => onNavigate({ group: key === '__ungrouped' ? null : key, tierId: null, rsvpStatus: null })}
        />
        <BreakdownList
          dict={dict}
          heading={d.byStatus}
          rows={statusRows}
          totalGuests={totalGuests}
          emptyLabel=""
          onSelect={(key) => onNavigate({ rsvpStatus: key as RsvpStatus, tierId: null, group: null })}
        />
      </div>
    </div>
  )
}
