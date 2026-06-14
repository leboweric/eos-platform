const STORAGE_KEY = 'axp_transfer_debug';
const MAX_LOG_ENTRIES = 30;

function isEnabled() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === '0' || stored === 'false') return false;
    if (stored === '1' || stored === 'true') return true;
  } catch {
    // ignore
  }
  return true;
}

function ensureLogBuffer() {
  if (typeof window === 'undefined') return [];
  if (!Array.isArray(window.__axpTransferLog)) {
    window.__axpTransferLog = [];
  }
  return window.__axpTransferLog;
}

export function setTransferDebugEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}

export function isTransferDebugEnabled() {
  return isEnabled();
}

export function logTransfer(stage, details = {}) {
  const entry = {
    ts: new Date().toISOString(),
    stage,
    ...details
  };

  if (isEnabled()) {
    console.groupCollapsed(`[AXP Transfer] ${stage}`);
    console.log(entry);
    console.groupEnd();
  }

  const buffer = ensureLogBuffer();
  buffer.unshift(entry);
  if (buffer.length > MAX_LOG_ENTRIES) {
    buffer.length = MAX_LOG_ENTRIES;
  }

  return entry;
}

export function summarizeText(content) {
  if (!content) {
    return { chars: 0, preview: '(empty)' };
  }
  const text = String(content)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  const preview = text.length > 80 ? `${text.slice(0, 80)}…` : (text || '(empty)');
  return { chars: text.length, preview };
}

export function buildTransferToastMessage({ action, message, debug }) {
  if (!debug) return message;

  const lines = [
    message,
    `Summary: ${debug.summaryChars} chars`,
    debug.pendingUpdateChars ? `Pending update: ${debug.pendingUpdateChars} chars` : null,
    debug.destinationTeamId ? `→ Team ${debug.destinationTeamId.slice(0, 8)}…` : null,
    debug.savedDescriptionChars !== undefined
      ? `Saved description: ${debug.savedDescriptionChars} chars`
      : null,
    debug.issueId ? `Issue ${debug.issueId.slice(0, 8)}…` : null
  ].filter(Boolean);

  return lines.join('\n');
}