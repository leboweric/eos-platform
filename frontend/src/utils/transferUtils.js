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

export function previewText(content, maxLen = 150) {
  const text = stripHtmlToText(content);
  if (!text) return '(empty)';
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

/**
 * True when the user's summary text appears in the saved description.
 * Transfer footers alone must not count as a successful persist.
 */
export function userContentPersisted(sentDescription, savedDescription) {
  const sentText = stripHtmlToText(sentDescription);
  if (!sentText) return true;
  const savedText = stripHtmlToText(savedDescription);
  if (!savedText) return false;
  return savedText.includes(sentText);
}

/**
 * Rich-text flush() can return '' while form state still has content (?? does not
 * fall back on empty string). Prefer whichever source has more meaningful text.
 */
export function resolveRichTextDescription(editorRef, formDescription = '') {
  let editorContent = '';
  try {
    editorContent = editorRef?.current?.getContent?.()
      ?? editorRef?.current?.flush?.()
      ?? '';
  } catch {
    editorContent = '';
  }

  const editorChars = stripHtmlToText(editorContent).length;
  const stateChars = stripHtmlToText(formDescription).length;

  if (editorChars >= stateChars) {
    return editorContent || formDescription || '';
  }
  return formDescription || editorContent || '';
}

export function textAlreadyInDescription(description, text) {
  const note = (text || '').trim();
  if (!note) return true;
  const base = stripHtmlToText(description);
  if (!base) return false;
  if (base === note || base.endsWith(note)) return true;
  return base.split(/\n---\n/).some((section) => section.trim() === note);
}

export function appendTextToDescription(description, text) {
  const note = (text || '').trim();
  if (!note) return description || '';
  if (textAlreadyInDescription(description, note)) {
    return description || stripHtmlToText(description) || '';
  }
  const base = stripHtmlToText(description);
  if (!base) return note;
  return `${base}\n\n---\n${note}`;
}

/**
 * Build description body sent to the API. Transfer reason is NOT appended here —
 * the backend adds a single structured footer (team names + "Reason:" line).
 */
export function buildIssueDescription({ description, pendingUpdateText, transferReason: _transferReason }) {
  let result = description || '';
  if (pendingUpdateText?.trim()) {
    result = appendTextToDescription(result, pendingUpdateText.trim());
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