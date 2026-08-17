import { createAdminClient } from '@/lib/supabase/admin'

// Reads an invitation by token without requiring the caller to already be a
// project member — which is exactly the case here (they're not, yet), so
// RLS can't authorize this read. The token itself is the secret; this route
// only ever returns non-sensitive preview fields. Mirrors Letly's
// GET /api/organisation/members/accept?token= for the same reason.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: invite } = await admin
    .from('project_invitations')
    .select('project_id, email, role, expires_at, accepted_at')
    .eq('token', token)
    .maybeSingle()

  if (!invite) {
    return Response.json({ valid: false, reason: 'not_found' })
  }
  if (invite.accepted_at) {
    return Response.json({ valid: false, reason: 'already_accepted' })
  }
  if (new Date(invite.expires_at) < new Date()) {
    return Response.json({ valid: false, reason: 'expired' })
  }

  const { data: project } = await admin
    .from('projects')
    .select('name')
    .eq('id', invite.project_id)
    .single()

  return Response.json({
    valid: true,
    projectName: project?.name ?? null,
    email: invite.email,
    role: invite.role,
  })
}
