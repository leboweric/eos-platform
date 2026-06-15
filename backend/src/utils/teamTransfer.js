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

function stripHtmlToText(content) {
  if (!content) return '';
  return String(content)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

/**
 * Remove a transfer reason duplicated in the body (legacy clients appended it
 * before the backend footer). Keeps summary + pending updates intact.
 */
export function normalizeDescriptionBeforeTransferNote(description, reason) {
  const r = (reason || '').trim();
  if (!r) return description || '';

  const text = stripHtmlToText(description);
  if (!text) return '';

  const sections = text.split(/\n---\n/).map((s) => s.trim()).filter(Boolean);
  if (sections.length === 0) return description || '';

  const filtered = sections.filter((section) => {
    if (section === r) return false;
    if (section.startsWith('[Sent from ') && section.includes('Reason:')) return true;
    return true;
  });

  if (filtered.length === sections.length) {
    return description || '';
  }

  return filtered.join('\n\n---\n');
}

export function countReasonOccurrences(description, reason) {
  const r = (reason || '').trim();
  if (!r) return 0;
  const text = stripHtmlToText(description);
  const escaped = r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (text.match(new RegExp(escaped, 'g')) || []).length;
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

async function getAssigneeTeams(orgId, assigneeId) {
  const teamsResult = await query(
    `SELECT tm.team_id, t.is_leadership_team, t.name
     FROM team_members tm
     INNER JOIN teams t ON t.id = tm.team_id
     WHERE tm.user_id = $1 AND t.organization_id = $2
     ORDER BY t.is_leadership_team ASC NULLS LAST, t.name ASC`,
    [assigneeId, orgId]
  );
  return teamsResult.rows;
}

async function isLeadershipTeamId(teamId) {
  const result = await query(
    'SELECT is_leadership_team FROM teams WHERE id = $1',
    [teamId]
  );
  return result.rows[0]?.is_leadership_team === true;
}

/**
 * Route todos to the team where they should appear in the department list.
 * Leadership can assign to anyone, but departmental assignees should own the
 * to-do on their functional team — even if they are also on Leadership.
 */
export async function resolveTodoTeamId(orgId, requestedTeamId, assigneeId) {
  if (!requestedTeamId || !assigneeId) {
    return requestedTeamId || null;
  }

  const assigneeTeams = await getAssigneeTeams(orgId, assigneeId);
  if (assigneeTeams.length === 0) {
    return requestedTeamId;
  }

  const departmentalTeam = assigneeTeams.find((team) => !team.is_leadership_team);
  const requestedIsLeadership = await isLeadershipTeamId(requestedTeamId);

  // Leadership assigning to someone with a departmental team → use that team
  if (requestedIsLeadership && departmentalTeam) {
    return departmentalTeam.team_id;
  }

  const onRequestedTeam = assigneeTeams.some((team) => team.team_id === requestedTeamId);
  if (onRequestedTeam) {
    return requestedTeamId;
  }

  return assigneeTeams[0].team_id;
}

/**
 * Move existing leadership-team to-dos to each assignee's departmental team.
 * Idempotent — safe to run on every leadership to-do list fetch.
 */
export async function repairLeadershipMisassignedTodos(orgId, leadershipTeamId) {
  if (!orgId || !leadershipTeamId) return 0;

  const isLeadership = await isLeadershipTeamId(leadershipTeamId);
  if (!isLeadership) return 0;

  const result = await query(
    `UPDATE todos t
     SET team_id = resolved.new_team_id,
         updated_at = CURRENT_TIMESTAMP
     FROM (
       SELECT
         t2.id AS todo_id,
         (
           SELECT tm.team_id
           FROM team_members tm
           JOIN teams st ON st.id = tm.team_id
           WHERE tm.user_id = t2.assigned_to_id
             AND st.organization_id = t2.organization_id
             AND st.is_leadership_team = false
           ORDER BY st.name ASC
           LIMIT 1
         ) AS new_team_id
       FROM todos t2
       WHERE t2.organization_id = $1
         AND t2.team_id = $2
         AND t2.deleted_at IS NULL
         AND t2.assigned_to_id IS NOT NULL
     ) resolved
     WHERE t.id = resolved.todo_id
       AND resolved.new_team_id IS NOT NULL
       AND resolved.new_team_id <> t.team_id`,
    [orgId, leadershipTeamId]
  );

  return result.rowCount || 0;
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