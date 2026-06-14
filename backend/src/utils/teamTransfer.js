import { query } from '../config/database.js';

export async function getTeamInOrg(teamId, orgId) {
  const result = await query(
    'SELECT id, name FROM teams WHERE id = $1 AND organization_id = $2',
    [teamId, orgId]
  );
  return result.rows[0] || null;
}

export async function isUserOnTeam(userId, teamId, orgId) {
  const result = await query(
    `SELECT 1 FROM team_members tm
     INNER JOIN teams t ON t.id = tm.team_id
     WHERE tm.user_id = $1 AND tm.team_id = $2 AND t.organization_id = $3`,
    [userId, teamId, orgId]
  );
  return result.rows.length > 0;
}

export async function validateTeamTransfer(orgId, destinationTeamId, assigneeId, { requireAssignee = false } = {}) {
  if (!destinationTeamId) {
    return { valid: false, error: 'Destination team is required' };
  }

  const team = await getTeamInOrg(destinationTeamId, orgId);
  if (!team) {
    return { valid: false, error: 'Destination team not found in this organization' };
  }

  if (requireAssignee && !assigneeId) {
    return { valid: false, error: 'An assignee is required for this team' };
  }

  if (assigneeId) {
    const onTeam = await isUserOnTeam(assigneeId, destinationTeamId, orgId);
    if (!onTeam) {
      return { valid: false, error: 'Selected person is not a member of the destination team' };
    }
  }

  return { valid: true, team };
}

export function buildTransferNote({ fromTeamName, toTeamName, userName, reason }) {
  const date = new Date().toLocaleDateString();
  let note = `\n\n---\n[Sent from ${fromTeamName || 'Unknown Team'} to ${toTeamName || 'Unknown Team'} by ${userName} on ${date}]`;
  if (reason?.trim()) {
    note += `\nReason: ${reason.trim()}`;
  }
  return note;
}

export async function getTransferActorName(userId) {
  const result = await query(
    'SELECT first_name, last_name FROM users WHERE id = $1',
    [userId]
  );
  if (result.rows.length === 0) return 'user';
  const { first_name, last_name } = result.rows[0];
  return `${first_name || ''} ${last_name || ''}`.trim() || 'user';
}

export async function buildTransferNoteForTeams(orgId, sourceTeamId, destinationTeamId, userId, reason) {
  const fromTeam = sourceTeamId ? await getTeamInOrg(sourceTeamId, orgId) : null;
  const toTeam = destinationTeamId ? await getTeamInOrg(destinationTeamId, orgId) : null;
  const userName = await getTransferActorName(userId);
  return buildTransferNote({
    fromTeamName: fromTeam?.name,
    toTeamName: toTeam?.name,
    userName,
    reason
  });
}