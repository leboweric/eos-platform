import { issuesService } from '../services/issuesService';
import { todosService } from '../services/todosService';
import {
  stripTransferPayload,
  getSavedEntityId,
  resolveTransferSourceTeamId,
  buildIssueDescription,
  hasMeaningfulRichText
} from './transferUtils';
import { logTransfer, summarizeText } from './transferDebug';

export function parseCrossTeamTransfer(data, sourceTeamId) {
  const transfer = data?.transferToTeam;
  const transferSourceTeamId = resolveTransferSourceTeamId(sourceTeamId, data);
  const isTransferRequested = Boolean(transfer?.enabled && transfer?.destinationTeamId);
  const isCrossTeamTransfer = Boolean(
    isTransferRequested && transferSourceTeamId && transfer.destinationTeamId !== transferSourceTeamId
  );
  return { transfer, isTransferRequested, isCrossTeamTransfer, transferSourceTeamId };
}

async function persistPendingIssueUpdate(issueId, pendingUpdateText) {
  if (!issueId || !pendingUpdateText?.trim()) return;
  await issuesService.addIssueUpdate(issueId, pendingUpdateText.trim());
}

function buildIssueSaveDebug({ issueId, sourceTeamId, transfer, description, pendingUpdateText, saved }) {
  const summary = summarizeText(description);
  const savedSummary = summarizeText(saved?.description);
  return {
    issueId: issueId || getSavedEntityId(saved),
    sourceTeamId,
    destinationTeamId: transfer?.destinationTeamId || null,
    summaryChars: summary.chars,
    summaryPreview: summary.preview,
    pendingUpdateChars: pendingUpdateText?.trim()?.length || 0,
    savedDescriptionChars: savedSummary.chars,
    savedDescriptionPreview: savedSummary.preview
  };
}

export async function saveIssueWithCrossTeamTransfer({
  issueData,
  sourceTeamId,
  issueId = null,
  timeline = 'short_term',
  meetingId = null
}) {
  const { transfer, isTransferRequested, isCrossTeamTransfer, transferSourceTeamId } = parseCrossTeamTransfer(issueData, sourceTeamId);
  const { payload, pendingUpdateText } = stripTransferPayload(issueData);
  const description = buildIssueDescription({
    description: payload.description,
    pendingUpdateText,
    transferReason: transfer?.reason || ''
  });

  logTransfer('issue:prepare', {
    issueId,
    sourceTeamId,
    isTransferRequested,
    isCrossTeamTransfer,
    destinationTeamId: transfer?.destinationTeamId,
    ...summarizeText(description),
    pendingUpdateChars: pendingUpdateText?.trim()?.length || 0
  });

  if (isTransferRequested && issueId) {
    if (pendingUpdateText) {
      await persistPendingIssueUpdate(issueId, pendingUpdateText);
    }

    // Auto-save may have created a title-only issue before transfer was enabled.
    // Persist summary/notes explicitly before moving teams.
    if (hasMeaningfulRichText(description) || payload.title) {
      await issuesService.updateIssue(issueId, {
        title: payload.title || issueData.title,
        description,
        ownerId: payload.ownerId,
        status: payload.status || issueData.status,
        timeline: payload.timeline || timeline
      });
    }

    const moveResult = await issuesService.moveIssueToTeam(issueId, {
      newTeamId: transfer.destinationTeamId,
      reason: transfer.reason || '',
      newOwnerId: transfer.assigneeId || payload.ownerId || null,
      title: issueData.title,
      description,
      status: issueData.status
    });
    const saved = moveResult.data || moveResult;

    if (hasMeaningfulRichText(description) && !hasMeaningfulRichText(saved?.description)) {
      logTransfer('issue:move-failed-validation', buildIssueSaveDebug({
        issueId, sourceTeamId, transfer, description, pendingUpdateText, saved
      }));
      throw new Error('Issue was moved but your notes did not persist. Check console for [AXP Transfer] logs.');
    }

    const debug = buildIssueSaveDebug({
      issueId, sourceTeamId, transfer, description, pendingUpdateText, saved
    });
    logTransfer('issue:move-complete', debug);

    return {
      saved,
      message: moveResult.message || 'Issue sent to another team',
      transferred: true,
      debug
    };
  }

  if (issueId) {
    const saved = await issuesService.updateIssue(issueId, {
      title: payload.title,
      description,
      ownerId: payload.ownerId,
      status: payload.status,
      timeline: payload.timeline
    });
    return {
      saved,
      message: 'Issue updated successfully',
      transferred: false
    };
  }

  const destinationTeamId = isTransferRequested ? transfer.destinationTeamId : sourceTeamId;
  const saved = await issuesService.createIssue({
    title: payload.title,
    description,
    ownerId: isTransferRequested
      ? (transfer.assigneeId || payload.ownerId || null)
      : payload.ownerId,
    status: payload.status || 'open',
    timeline: timeline || payload.timeline || 'short_term',
    department_id: destinationTeamId,
    meeting_id: meetingId || payload.meeting_id || null,
    related_headline_id: payload.related_headline_id,
    related_todo_id: payload.related_todo_id,
    related_priority_id: payload.related_priority_id,
    priority_level: payload.priority_level,
    ...(isTransferRequested ? {
      transferSourceTeamId: transferSourceTeamId || sourceTeamId || undefined,
      transferReason: transfer.reason || ''
    } : {})
  });

  if (hasMeaningfulRichText(description) && !hasMeaningfulRichText(saved?.description)) {
    logTransfer('issue:create-failed-validation', buildIssueSaveDebug({
      issueId, sourceTeamId, transfer, description, pendingUpdateText, saved
    }));
    throw new Error('Issue was saved but your notes did not persist. Check console for [AXP Transfer] logs.');
  }

  const savedId = getSavedEntityId(saved);
  if (pendingUpdateText) {
    await persistPendingIssueUpdate(savedId, pendingUpdateText);
  }

  const debug = buildIssueSaveDebug({
    issueId: savedId, sourceTeamId, transfer, description, pendingUpdateText, saved
  });
  logTransfer(isTransferRequested ? 'issue:create-transfer-complete' : 'issue:create-complete', debug);

  return {
    saved,
    message: isTransferRequested ? 'Issue sent to another team' : 'Issue created successfully',
    transferred: isTransferRequested,
    debug
  };
}

export async function saveTodoWithCrossTeamTransfer({
  todoData,
  sourceTeamId,
  todoId = null,
  orgId = null,
  meetingId = null
}) {
  const { transfer, isTransferRequested, isCrossTeamTransfer } = parseCrossTeamTransfer(todoData, sourceTeamId);
  const { payload, pendingUpdateText } = stripTransferPayload(todoData);

  if (isTransferRequested && todoId) {
    if (pendingUpdateText) {
      await todosService.addTodoUpdate(todoId, pendingUpdateText);
    }

    const moveResult = await todosService.moveTodoToTeam(todoId, {
      newTeamId: transfer.destinationTeamId,
      newAssigneeId: transfer.assigneeId,
      reason: transfer.reason || '',
      title: todoData.title,
      description: payload.description,
      dueDate: todoData.dueDate,
      status: todoData.status
    });
    return {
      saved: moveResult.data || moveResult,
      message: moveResult.message || 'To-do sent to another team',
      transferred: true,
      isGroup: false
    };
  }

  if (todoId) {
    const saved = await todosService.updateTodo(todoId, {
      ...payload,
      department_id: sourceTeamId
    });
    return {
      saved,
      message: 'To-do updated successfully',
      transferred: false,
      isGroup: false
    };
  }

  const destinationTeamId = isTransferRequested ? transfer.destinationTeamId : sourceTeamId;
  const response = await todosService.createTodo({
    ...payload,
    description: payload.description || '',
    ...(orgId ? { organization_id: orgId } : {}),
    department_id: destinationTeamId,
    assignedToId: isTransferRequested ? transfer.assigneeId : todoData.assignedToId,
    ...(meetingId ? { meeting_id: meetingId } : {}),
    ...(isCrossTeamTransfer ? {
      transferSourceTeamId: sourceTeamId,
      transferReason: transfer.reason || ''
    } : {})
  });

  const isGroup = Boolean(response?.isGroup && Array.isArray(response?.data));
  const savedId = isGroup ? null : getSavedEntityId(response);
  if (pendingUpdateText && savedId) {
    await todosService.addTodoUpdate(savedId, pendingUpdateText);
  }

  return {
    saved: response,
    message: isTransferRequested
      ? 'To-do sent to another team'
      : isGroup
        ? `${response.data.length} To-Dos created successfully`
        : 'To-do created successfully',
    transferred: isTransferRequested,
    isGroup
  };
}