import type { Dictionary } from '@/lib/i18n'
import { OriginClusterPanel, type OriginCluster } from '@/components/guests/origin-cluster-panel'

export function GuestsOriginsTab({
  dict,
  projectId,
  clusters,
  unassignedCount,
}: {
  dict: Dictionary
  projectId: string
  clusters: OriginCluster[]
  unassignedCount: number
}) {
  return <OriginClusterPanel dict={dict} projectId={projectId} clusters={clusters} unassignedCount={unassignedCount} />
}
