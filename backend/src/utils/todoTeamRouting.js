/**
 * Pure routing decision for todo team assignment.
 *
 * @param {string} requestedTeamId
 * @param {Array<{team_id: string, is_leadership_team: boolean}>} assigneeTeams
 * @param {{ requestedIsLeadership?: boolean, meetingId?: string|null }} options
 * @returns {string|null}
 */
export function decideTodoTeamId(requestedTeamId, assigneeTeams, options = {}) {
  if (!requestedTeamId) return null;
  if (options.meetingId) return requestedTeamId;
  if (!assigneeTeams || assigneeTeams.length === 0) return requestedTeamId;

  // Assignee is on the requested team → keep it.
  // Critical for dual Leadership+Delivery members so Leadership todos stay private to LT.
  const onRequestedTeam = assigneeTeams.some((team) => team.team_id === requestedTeamId);
  if (onRequestedTeam) {
    return requestedTeamId;
  }

  const departmentalTeam = assigneeTeams.find((team) => !team.is_leadership_team);

  // Leadership assigning to someone who is NOT on Leadership → their department
  if (options.requestedIsLeadership && departmentalTeam) {
    return departmentalTeam.team_id;
  }

  return assigneeTeams[0].team_id;
}
