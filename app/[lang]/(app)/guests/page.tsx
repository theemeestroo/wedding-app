import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { localizePath, interpolate } from '@/lib/locale'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProject } from '@/lib/project'
import { GdprNotice } from '@/components/guests/gdpr-notice'
import { AddHouseholdForm } from '@/components/guests/add-household-form'
import { HouseholdCard } from '@/components/guests/household-card'
import { OriginClusterPanel } from '@/components/guests/origin-cluster-panel'
import { ExportButtons, type ExportRow } from '@/components/guests/export-buttons'

export const metadata = { title: 'Guests — Aisle' }

export default async function GuestsPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  const d = dict.guests
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${lang}/auth/login`)

  const project = await getCurrentProject(supabase, user.id)
  if (!project) redirect(`/${lang}/projects/new`)

  const [{ data: households }, { data: clusters }, { data: tierDefinitions }] = await Promise.all([
    supabase
      .from('households')
      .select('id, name, home_city, home_country, tier_id, group_label, origin_cluster_id')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true }),
    supabase.from('origin_clusters').select('id, label').eq('project_id', project.id),
    supabase
      .from('tier_definitions')
      .select('id, label, sort_order')
      .eq('project_id', project.id)
      .order('sort_order', { ascending: true }),
  ])

  const tiers = (tierDefinitions ?? []).map((t) => ({ id: t.id, label: t.label, sortOrder: t.sort_order }))
  const tierLabelById = new Map(tiers.map((t) => [t.id, t.label]))

  const householdIds = (households ?? []).map((h) => h.id)
  const { data: guests } = await supabase
    .from('guests')
    .select('id, household_id, first_name, last_name, is_child')
    .in('household_id', householdIds.length > 0 ? householdIds : ['00000000-0000-0000-0000-000000000000'])

  const guestsByHousehold = new Map<string, typeof guests>()
  for (const g of guests ?? []) {
    const list = guestsByHousehold.get(g.household_id) ?? []
    list.push(g)
    guestsByHousehold.set(g.household_id, list)
  }

  const clusterOptions = (clusters ?? []).map((c) => ({ id: c.id, label: c.label }))
  const guestCountByCluster = new Map<string, number>()
  for (const h of households ?? []) {
    if (!h.origin_cluster_id) continue
    const current = guestCountByCluster.get(h.origin_cluster_id) ?? 0
    guestCountByCluster.set(h.origin_cluster_id, current + (guestsByHousehold.get(h.id)?.length ?? 0))
  }
  const clustersWithCounts = (clusters ?? []).map((c) => ({
    id: c.id,
    label: c.label,
    householdCount: (households ?? []).filter((h) => h.origin_cluster_id === c.id).length,
    guestCount: guestCountByCluster.get(c.id) ?? 0,
  }))
  const unassignedCount = (households ?? []).filter((h) => !h.origin_cluster_id).length

  const countries = new Set((households ?? []).map((h) => h.home_country).filter(Boolean))
  const regionCount = clustersWithCounts.length
  const existingGroups = Array.from(new Set((households ?? []).map((h) => h.group_label).filter(Boolean))) as string[]

  const exportRows: ExportRow[] = (households ?? []).flatMap((h) =>
    (guestsByHousehold.get(h.id) ?? []).map((g) => ({
      household: h.name,
      firstName: g.first_name,
      lastName: g.last_name ?? '',
      isChild: g.is_child,
      city: h.home_city ?? '',
      country: h.home_country ?? '',
      tier: (h.tier_id && tierLabelById.get(h.tier_id)) || '',
      group: h.group_label ?? '',
    })),
  )

  return (
    <div className="space-y-9">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-7">
        <div>
          <h1 className="font-heading text-4xl italic tracking-tight sm:text-5xl">{d.heading}</h1>
          {(households?.length ?? 0) > 0 && (
            <p className="mt-2.5 text-sm text-muted-foreground">
              {interpolate(d.originSummary, { regions: regionCount, countries: countries.size })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons dict={dict} rows={exportRows} />
          <Link
            href={localizePath(lang, '/guests/import')}
            className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            {d.importCta}
          </Link>
        </div>
      </div>

      {tiers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {interpolate(d.tierLegend, { list: tiers.map((t) => t.label).join(' → ') })}{' '}
          <Link href={localizePath(lang, '/settings/tiers')} className="text-primary underline-offset-4 hover:underline">
            {d.manageTiersLink}
          </Link>
        </p>
      )}

      <GdprNotice lang={lang} dict={dict} />

      <AddHouseholdForm dict={dict} projectId={project.id} tiers={tiers} existingGroups={existingGroups} />

      {clustersWithCounts.length > 0 && (
        <OriginClusterPanel
          dict={dict}
          projectId={project.id}
          clusters={clustersWithCounts}
          unassignedCount={unassignedCount}
        />
      )}
      {clustersWithCounts.length === 0 && unassignedCount > 0 && (
        <OriginClusterPanel dict={dict} projectId={project.id} clusters={[]} unassignedCount={unassignedCount} />
      )}

      <div className="space-y-3">
        {(households ?? []).map((h) => (
          <HouseholdCard
            key={h.id}
            dict={dict}
            household={h}
            guests={guestsByHousehold.get(h.id) ?? []}
            clusters={clusterOptions}
            tiers={tiers}
            existingGroups={existingGroups}
          />
        ))}
        {(households?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">{d.empty}</p>}
      </div>
    </div>
  )
}
