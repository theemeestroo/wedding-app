import type { createClient } from '@/lib/supabase/server'
import type { ProjectRole } from '@/lib/permissions'
import { canEditProject, canManageMembers } from '@/lib/permissions'

export interface CurrentProject {
  id: string
  name: string
  currency: string
  role: ProjectRole
  canEdit: boolean
  canManageMembers: boolean
}

/**
 * A user belongs to at most one project in v1 — a project is a couple, not a
 * multi-tenant org, so there's no project switcher yet.
 */
export async function getCurrentProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
): Promise<CurrentProject | null> {
  const { data } = await supabase
    .from('project_members')
    .select('role, projects(id, name, currency)')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (!data || !data.projects) return null

  const project = Array.isArray(data.projects) ? data.projects[0] : data.projects
  if (!project) return null

  const role = data.role as ProjectRole

  return {
    id: project.id,
    name: project.name,
    currency: project.currency,
    role,
    canEdit: canEditProject(role),
    canManageMembers: canManageMembers(role),
  }
}

export interface ProjectMember {
  role: ProjectRole
  profile?: { id: string; full_name: string | null; email: string | null }
}

/**
 * project_members lives in `wedding`, profiles in `public` — PostgREST
 * resource embedding isn't relied on across schemas anywhere else in this
 * codebase (see Letly's app/api/organisation/members/invite/route.ts), so
 * fetch profiles explicitly instead of embedding.
 */
export async function getProjectMembers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<ProjectMember[]> {
  const { data: memberRows } = await supabase
    .from('project_members')
    .select('role, profile_id')
    .eq('project_id', projectId)
    .eq('status', 'active')

  const profileIds = memberRows?.map((m) => m.profile_id) ?? []
  const { data: profileRows } = await supabase
    .schema('public')
    .from('profiles')
    .select('id, full_name, email')
    .in('id', profileIds.length > 0 ? profileIds : ['00000000-0000-0000-0000-000000000000'])

  return (memberRows ?? []).map((m) => ({
    role: m.role as ProjectRole,
    profile: profileRows?.find((p) => p.id === m.profile_id),
  }))
}
