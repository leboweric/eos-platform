/**
 * Real team_members only — admins/Leadership may *view* all departments via user.teams,
 * but L10 start/join must use teams they actually belong to.
 */
export function isRealMeetingMembership(team) {
  if (!team) return false;
  if (typeof team.is_member === 'boolean') return team.is_member;
  // Legacy auth payloads before is_member: synthetic access used member_role 'viewer'
  if (team.member_role === 'viewer') return false;
  return true;
}
