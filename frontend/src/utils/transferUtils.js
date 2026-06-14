export function isTransferActive(transfer) {
  return Boolean(transfer?.enabled && transfer?.destinationTeamId);
}

export function getSavedEntityId(saved) {
  return saved?.id || saved?.data?.id || null;
}

export function stripTransferPayload(data = {}) {
  const { transferToTeam: _transferToTeam, ...rest } = data;
  return rest;
}

export function validateTransfer(transfer, sourceTeamId, { requireAssignee = false } = {}) {
  if (!transfer?.enabled) return null;

  if (!transfer.destinationTeamId) {
    return 'Please select a destination team';
  }

  if (sourceTeamId && transfer.destinationTeamId === sourceTeamId) {
    return 'Please select a different team than the current meeting team';
  }

  if (requireAssignee && !transfer.assigneeId) {
    return 'Please select someone on the destination team';
  }

  return null;
}