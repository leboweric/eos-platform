import { issuesService } from '../services/issuesService';
import { todosService } from '../services/todosService';
import { stripTransferPayload } from './transferUtils';

export function parseCrossTeamTransfer(data, sourceTeamId) {
  const transfer = data?.transferToTeam;
  const isCrossTeamTransfer = Boolean(
    transfer?.enabled && transfer.destinationTeamId && sourceTeamId && transfer.destinationTeamId !== sourceTeamId
  );
  return { transfer, isCrossTeamTransfer };
}

export async function saveIssueWithCrossTeamTransfer({
  issueData,
  sourceTeamId,
  issueId = null,
  timeline = 'short_term',
  meetingId = null
}) {
  const { transfer, isCrossTeamTransfer } = parseCrossTeamTransfer(issueData, sourceTeamId);
  const payload = stripTransferPayload(issueData);

  if (isCrossTeamTransfer && issueId) {
    const moveResult = await issuesService.moveIssueToTeam(issueId, {
      newTeamId: transfer.destinationTeamId,
      reason: transfer.reason || '',
      newOwnerId: transfer.assigneeId || null,
      title: issueData.title,
      description: issueData.description,
      status: issueData.status
    });
    return {
      saved: moveResult.data || moveResult,
      message: moveResult.message || 'Issue sent to another team',
      transferred: true
    };
  }

  if (issueId) {
    const saved = await issuesService.updateIssue(issueId, payload);
    return {
      saved,
      message: 'Issue updated successfully',
      transferred: false
    };
  }

  const destinationTeamId = isCrossTeamTransfer ? transfer.destinationTeamId : sourceTeamId;
  const saved = await issuesService.createIssue({
    ...payload,
    timeline,
    department_id: destinationTeamId,
    ...(meetingId ? { meeting_id: meetingId } : {}),
    ...(isCrossTeamTransfer ? {
      transferSourceTeamId: sourceTeamId,
      transferReason: transfer.reason || ''
    } : {})
  });

  return {
    saved,
    message: isCrossTeamTransfer ? 'Issue sent to another team' : 'Issue created successfully',
    transferred: isCrossTeamTransfer
  };
}

export async function saveTodoWithCrossTeamTransfer({
  todoData,
  sourceTeamId,
  todoId = null,
  orgId = null,
  meetingId = null
}) {
  const { transfer, isCrossTeamTransfer } = parseCrossTeamTransfer(todoData, sourceTeamId);
  const payload = stripTransferPayload(todoData);

  if (isCrossTeamTransfer && todoId) {
    const moveResult = await todosService.moveTodoToTeam(todoId, {
      newTeamId: transfer.destinationTeamId,
      newAssigneeId: transfer.assigneeId,
      reason: transfer.reason || '',
      title: todoData.title,
      description: todoData.description,
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

  const destinationTeamId = isCrossTeamTransfer ? transfer.destinationTeamId : sourceTeamId;
  const response = await todosService.createTodo({
    ...payload,
    ...(orgId ? { organization_id: orgId } : {}),
    department_id: destinationTeamId,
    assignedToId: isCrossTeamTransfer ? transfer.assigneeId : todoData.assignedToId,
    ...(meetingId ? { meeting_id: meetingId } : {}),
    ...(isCrossTeamTransfer ? {
      transferSourceTeamId: sourceTeamId,
      transferReason: transfer.reason || ''
    } : {})
  });

  const isGroup = Boolean(response?.isGroup && Array.isArray(response?.data));

  return {
    saved: response,
    message: isCrossTeamTransfer
      ? 'To-do sent to another team'
      : isGroup
        ? `${response.data.length} To-Dos created successfully`
        : 'To-do created successfully',
    transferred: isCrossTeamTransfer,
    isGroup
  };
}