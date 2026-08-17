export type ProjectRole = 'owner' | 'partner' | 'viewer'

export function canEditProject(role: ProjectRole): boolean {
  return role === 'owner' || role === 'partner'
}

export function canManageMembers(role: ProjectRole): boolean {
  return role === 'owner'
}
