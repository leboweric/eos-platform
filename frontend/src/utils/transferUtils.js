export function isTransferActive(transfer) {
  return Boolean(transfer?.enabled && transfer?.destinationTeamId);
}

export function getSavedEntityId(saved) {
  return saved?.id || saved?.data?.id || null;
}

export function stripTransferPayload(data = {}) {
  const {
    transferToTeam: _transferToTeam,
    pendingUpdateText,
    sourceContextTeamId: _sourceContextTeamId,
    ...payload
  } = data;
  return { payload, pendingUpdateText: pendingUpdateText || '' };
}

export function resolveTransferSourceTeamId(sourceTeamId, issueData = {}) {
  return issueData.sourceContextTeamId || sourceTeamId || null;
}

export function stripHtmlToText(content) {
  if (!content) return '';
  return String(content)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function hasMeaningfulRichText(content) {
  return stripHtmlToText(content).length > 0;
}

export function appendTextToDescription(description, text) {
  const note = (text || '').trim();
  if (!note) return description || '';
  const base = stripHtmlToText(description);
  if (!base) return note;
  return `${base}\n\n---\n${note}`;
}

export function buildIssueDescription({ description, pendingUpdateText, transferReason }) {
  let result = description || '';
  if (pendingUpdateText?.trim()) {
    result = appendTextToDescription(result, pendingUpdateText.trim());
  }
  if (transferReason?.trim()) {
    result = appendTextToDescription(result, transferReason.trim());
  }
  return result;
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