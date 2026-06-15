#!/usr/bin/env node
/**
 * Cross-team transfer API smoke test
 *
 * Exercises every issue/todo transfer path through the REST API — no browser required.
 *
 * Usage:
 *   node scripts/cross-team-transfer-smoke-test.js
 *   node scripts/cross-team-transfer-smoke-test.js --api-url https://api.axplatform.app/api/v1
 *   node scripts/cross-team-transfer-smoke-test.js --login --email you@example.com --password secret
 *   node scripts/cross-team-transfer-smoke-test.js --keep-data   # skip cleanup
 *
 * Env:
 *   SMOKE_TEST_API_URL, SMOKE_TEST_EMAIL, SMOKE_TEST_PASSWORD
 */

import { randomUUID } from 'crypto';
import {
  stripTransferPayload,
  buildIssueDescription,
  userContentPersisted
} from '../../frontend/src/utils/transferUtils.js';

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : null;
};
const hasFlag = (name) => args.includes(name);

const API_URL = getArg('--api-url')
  || process.env.SMOKE_TEST_API_URL
  || 'https://api.axplatform.app/api/v1';
const USE_LOGIN = hasFlag('--login') || Boolean(process.env.SMOKE_TEST_EMAIL);
const KEEP_DATA = hasFlag('--keep-data');
const RUN_ID = Date.now().toString(36);

// ─── helpers ────────────────────────────────────────────────────────────────

function stripHtmlToText(content) {
  if (!content) return '';
  return String(content)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

function includesUserContent(savedDescription, marker) {
  return stripHtmlToText(savedDescription).includes(marker);
}

function marker(scenario) {
  return `SMOKE_${RUN_ID}_${scenario}`;
}

/** Mirrors parseCrossTeamTransfer + saveIssueWithCrossTeamTransfer create branch */
function buildFrontendIssueCreatePayload(issueData, sourceTeamId, meetingId = null) {
  const transfer = issueData?.transferToTeam;
  const transferSourceTeamId = issueData.sourceContextTeamId || sourceTeamId || null;
  const isTransferRequested = Boolean(transfer?.enabled && transfer?.destinationTeamId);
  const { payload, pendingUpdateText } = stripTransferPayload(issueData);
  const userSummary = payload.description || '';
  const description = buildIssueDescription({
    description: userSummary,
    pendingUpdateText,
    transferReason: transfer?.reason || ''
  });
  const destinationTeamId = isTransferRequested ? transfer.destinationTeamId : sourceTeamId;
  return {
    apiPayload: {
      title: payload.title,
      description: description || userSummary || '',
      ownerId: isTransferRequested
        ? (transfer.assigneeId || payload.ownerId || null)
        : payload.ownerId,
      status: payload.status || 'open',
      timeline: issueData.timeline || 'short_term',
      teamId: destinationTeamId,
      meeting_id: meetingId || null,
      ...(isTransferRequested ? {
        transferSourceTeamId: transferSourceTeamId || sourceTeamId,
        transferReason: transfer.reason || ''
      } : {})
    },
    userSummary,
    pendingUpdateText,
    destinationTeamId,
    isTransferRequested
  };
}

function buildFrontendTodoCreatePayload(todoData, sourceTeamId, meetingId = null) {
  const transfer = todoData?.transferToTeam;
  const isTransferRequested = Boolean(transfer?.enabled && transfer?.destinationTeamId);
  const { payload } = stripTransferPayload(todoData);
  const destinationTeamId = isTransferRequested ? transfer.destinationTeamId : sourceTeamId;
  return {
    apiPayload: {
      title: payload.title,
      description: payload.description || '',
      assignedToId: isTransferRequested ? transfer.assigneeId : todoData.assignedToId,
      teamId: destinationTeamId,
      meeting_id: meetingId || null,
      ...(isTransferRequested ? {
        transferSourceTeamId: sourceTeamId,
        transferReason: transfer.reason || ''
      } : {})
    },
    userSummary: payload.description || '',
    destinationTeamId,
    isTransferRequested
  };
}

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL.replace(/\/$/, '');
    this.token = null;
    this.orgId = null;
    this.userId = null;
  }

  async request(method, path, body, { expectStatus } = {}) {
    const url = `${this.baseURL}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
      },
      body: body !== undefined && body !== null ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (expectStatus !== undefined && res.status !== expectStatus) {
      throw new Error(
        `${method} ${path} expected ${expectStatus}, got ${res.status}: ${JSON.stringify(data)}`
      );
    }
    return { status: res.status, data };
  }

  async register() {
    const email = `smoke-transfer-${RUN_ID}@axp-smoke-test.invalid`;
    const password = `SmokeTest!${RUN_ID}`;
    const res = await this.request('POST', '/auth/register', {
      email,
      password,
      firstName: 'Smoke',
      lastName: 'Transfer',
      organizationName: `AXP Transfer Smoke ${RUN_ID}`
    }, { expectStatus: 201 });

    this.token = res.data.data.accessToken;
    this.userId = res.data.data.user.id;
    this.orgId = res.data.data.user.organizationId;
    return { email, password };
  }

  async login(email, password) {
    const res = await this.request('POST', '/auth/login', { email, password }, { expectStatus: 200 });
    this.token = res.data.data.accessToken;
    this.userId = res.data.data.user.id;
    this.orgId = res.data.data.user.organizationId || res.data.data.user.organization_id;
  }

  async getTeams() {
    const res = await this.request('GET', `/organizations/${this.orgId}/teams`, null, { expectStatus: 200 });
    return res.data.data;
  }

  async createTeam(name, isLeadership = false) {
    const res = await this.request('POST', `/organizations/${this.orgId}/teams`, {
      name,
      description: `Smoke test team ${name}`,
      is_leadership_team: isLeadership
    }, { expectStatus: 201 });
    return res.data.data;
  }

  async addTeamMember(teamId, userId) {
    await this.request('POST', `/organizations/${this.orgId}/teams/${teamId}/members`, {
      user_id: userId,
      role: 'member'
    }, { expectStatus: 201 });
  }

  async createIssue(payload) {
    const res = await this.request('POST', `/organizations/${this.orgId}/issues`, payload, { expectStatus: 201 });
    return res.data.data;
  }

  async updateIssue(issueId, payload) {
    const res = await this.request('PUT', `/organizations/${this.orgId}/issues/${issueId}`, payload, { expectStatus: 200 });
    return res.data.data;
  }

  async moveIssue(issueId, payload) {
    const res = await this.request('POST', `/organizations/${this.orgId}/issues/${issueId}/move-team`, payload, { expectStatus: 200 });
    return res.data;
  }

  async deleteIssue(issueId) {
    await this.request('DELETE', `/organizations/${this.orgId}/issues/${issueId}`, null, { expectStatus: 200 });
  }

  async addIssueUpdate(issueId, updateText) {
    const res = await this.request('POST', `/organizations/${this.orgId}/issues/${issueId}/updates`, {
      update_text: updateText
    }, { expectStatus: 200 });
    return res.data.data;
  }

  async getIssueUpdates(issueId) {
    const res = await this.request('GET', `/organizations/${this.orgId}/issues/${issueId}/updates`, null, { expectStatus: 200 });
    return res.data.data || [];
  }

  async getIssues(departmentId, timeline = 'short_term') {
    const res = await this.request(
      'GET',
      `/organizations/${this.orgId}/issues?timeline=${timeline}&department_id=${departmentId}`,
      null,
      { expectStatus: 200 }
    );
    return res.data.data?.issues || [];
  }

  async createTodo(payload) {
    const res = await this.request('POST', `/organizations/${this.orgId}/todos`, payload, { expectStatus: 201 });
    return res.data.data;
  }

  async updateTodo(todoId, payload) {
    const res = await this.request('PUT', `/organizations/${this.orgId}/todos/${todoId}`, payload, { expectStatus: 200 });
    return res.data.data;
  }

  async moveTodo(todoId, payload) {
    const res = await this.request('POST', `/organizations/${this.orgId}/todos/${todoId}/move-team`, payload, { expectStatus: 200 });
    return res.data;
  }

  async deleteTodo(todoId) {
    await this.request('DELETE', `/organizations/${this.orgId}/todos/${todoId}`, null, { expectStatus: 200 });
  }

  async getTodos(departmentId) {
    const res = await this.request(
      'GET',
      `/organizations/${this.orgId}/todos?department_id=${departmentId}`,
      null,
      { expectStatus: 200 }
    );
    return res.data.data?.todos || res.data.data || [];
  }
}

// ─── test context ───────────────────────────────────────────────────────────

async function setupContext(api) {
  let leadershipTeam;
  let destTeam;

  if (USE_LOGIN) {
    const email = getArg('--email') || process.env.SMOKE_TEST_EMAIL;
    const password = getArg('--password') || process.env.SMOKE_TEST_PASSWORD;
    if (!email || !password) {
      throw new Error('Login mode requires --email/--password or SMOKE_TEST_EMAIL/SMOKE_TEST_PASSWORD');
    }
    await api.login(email, password);
    const teams = await api.getTeams();
    leadershipTeam = teams.find((t) => t.is_leadership_team) || teams[0];
    destTeam = teams.find((t) => !t.is_leadership_team && t.id !== leadershipTeam?.id) || teams[1];
    if (!leadershipTeam || !destTeam) {
      destTeam = await api.createTeam(`Finance Smoke ${RUN_ID}`);
      await api.addTeamMember(destTeam.id, api.userId);
    }
  } else {
    await api.register();
    const teams = await api.getTeams();
    leadershipTeam = teams.find((t) => t.is_leadership_team);
    destTeam = await api.createTeam(`Finance Smoke ${RUN_ID}`);
    await api.addTeamMember(destTeam.id, api.userId);
  }

  if (!leadershipTeam || !destTeam) {
    throw new Error('Could not resolve leadership and destination teams');
  }

  return {
    leadershipTeamId: leadershipTeam.id,
    destTeamId: destTeam.id,
    assigneeId: api.userId
  };
}

// ─── assertions ─────────────────────────────────────────────────────────────

function assertIssuePersisted({ saved, destTeamId, userMarker, assigneeId, extraChecks = [] }) {
  const errors = [];
  if (!saved?.id) errors.push('missing issue id');
  if (saved.team_id !== destTeamId) {
    errors.push(`team_id ${saved.team_id} !== dest ${destTeamId}`);
  }
  if (userMarker && !includesUserContent(saved.description, userMarker)) {
    errors.push(`description missing marker "${userMarker}" (got len=${(saved.description || '').length})`);
  }
  if (assigneeId && saved.owner_id !== assigneeId) {
    errors.push(`owner_id ${saved.owner_id} !== ${assigneeId}`);
  }
  for (const check of extraChecks) {
    const err = check(saved);
    if (err) errors.push(err);
  }
  return errors;
}

function assertTodoPersisted({ saved, destTeamId, userMarker, assigneeId }) {
  const errors = [];
  if (!saved?.id) errors.push('missing todo id');
  if (saved.team_id !== destTeamId) {
    errors.push(`team_id ${saved.team_id} !== dest ${destTeamId}`);
  }
  if (userMarker && !includesUserContent(saved.description, userMarker)) {
    errors.push(`description missing marker "${userMarker}" (got len=${(saved.description || '').length})`);
  }
  if (assigneeId && saved.assigned_to_id !== assigneeId) {
    errors.push(`assigned_to_id ${saved.assigned_to_id} !== ${assigneeId}`);
  }
  return errors;
}

function assertListedOnDestination(list, id, type) {
  const found = list.some((item) => item.id === id);
  return found ? null : `${type} ${id} not found on destination team list`;
}

// ─── scenarios ──────────────────────────────────────────────────────────────

function buildScenarios(ctx, api) {
  const { leadershipTeamId, destTeamId, assigneeId } = ctx;
  const created = { issues: [], todos: [] };

  const trackIssue = (id) => { if (id) created.issues.push(id); };
  const trackTodo = (id) => { if (id) created.todos.push(id); };

  return [
    // ── NEW ISSUE + TRANSFER (create on destination) ──
    {
      id: 'issue-create-transfer-plain-summary',
      group: 'issue-new-transfer',
      run: async () => {
        const m = marker('issue-plain');
        const saved = await api.createIssue({
          title: `Smoke plain issue ${m}`,
          description: m,
          ownerId: assigneeId,
          teamId: destTeamId,
          timeline: 'short_term',
          transferSourceTeamId: leadershipTeamId,
          transferReason: 'Routing from leadership'
        });
        trackIssue(saved.id);
        return assertIssuePersisted({ saved, destTeamId, userMarker: m, assigneeId });
      }
    },
    {
      id: 'issue-create-transfer-html-summary',
      group: 'issue-new-transfer',
      run: async () => {
        const m = marker('issue-html');
        const html = `<p><strong>${m}</strong></p><p>Second line</p>`;
        const saved = await api.createIssue({
          title: `Smoke HTML issue ${m}`,
          description: html,
          ownerId: assigneeId,
          teamId: destTeamId,
          timeline: 'short_term',
          transferSourceTeamId: leadershipTeamId,
          transferReason: ''
        });
        trackIssue(saved.id);
        return assertIssuePersisted({ saved, destTeamId, userMarker: m, assigneeId });
      }
    },
    {
      id: 'issue-create-transfer-summary-and-reason',
      group: 'issue-new-transfer',
      run: async () => {
        const m = marker('issue-both');
        const saved = await api.createIssue({
          title: `Smoke issue both ${m}`,
          description: m,
          ownerId: assigneeId,
          teamId: destTeamId,
          timeline: 'short_term',
          transferSourceTeamId: leadershipTeamId,
          transferReason: 'Needs finance review'
        });
        trackIssue(saved.id);
        const errors = assertIssuePersisted({ saved, destTeamId, userMarker: m, assigneeId });
        if (!stripHtmlToText(saved.description).includes('finance review')) {
          errors.push('transfer reason not in description');
        }
        return errors;
      }
    },
    {
      id: 'issue-transfer-reason-not-duplicated',
      group: 'issue-new-transfer',
      run: async () => {
        const m = marker('dedup');
        const reason = `Dedup reason ${m}`;
        const issueData = {
          title: `Smoke dedup ${m}`,
          description: `Summary ${m}`,
          ownerId: assigneeId,
          status: 'open',
          timeline: 'short_term',
          transferToTeam: {
            enabled: true,
            destinationTeamId: destTeamId,
            assigneeId,
            reason
          },
          sourceContextTeamId: leadershipTeamId
        };
        const { apiPayload, userSummary } = buildFrontendIssueCreatePayload(issueData, leadershipTeamId);
        const saved = await api.createIssue(apiPayload);
        trackIssue(saved.id);
        const errors = assertIssuePersisted({ saved, destTeamId, userMarker: userSummary, assigneeId });
        const text = stripHtmlToText(saved.description);
        const escaped = reason.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const occurrences = (text.match(new RegExp(escaped, 'g')) || []).length;
        if (occurrences !== 1) {
          errors.push(`transfer reason appears ${occurrences} times (expected 1 in footer)`);
        }
        if (new RegExp(`\\n---\\n${escaped}(\\n|$)`).test(text)) {
          errors.push('transfer reason duplicated as standalone body section');
        }
        return errors;
      }
    },
    {
      id: 'issue-create-transfer-reason-only',
      group: 'issue-new-transfer',
      run: async () => {
        const reason = `Reason only ${marker('issue-reason')}`;
        const saved = await api.createIssue({
          title: `Smoke issue reason only ${RUN_ID}`,
          description: '',
          ownerId: assigneeId,
          teamId: destTeamId,
          timeline: 'short_term',
          transferSourceTeamId: leadershipTeamId,
          transferReason: reason
        });
        trackIssue(saved.id);
        const errors = assertIssuePersisted({ saved, destTeamId, userMarker: null, assigneeId });
        if (!stripHtmlToText(saved.description).includes('Reason only')) {
          errors.push(`description should contain transfer reason (len=${(saved.description || '').length})`);
        }
        return errors;
      }
    },
    {
      id: 'issue-create-transfer-with-separate-update',
      group: 'issue-new-transfer',
      run: async () => {
        const m = marker('issue-update');
        const updateM = `${m}_UPDATE_NOTE`;
        const saved = await api.createIssue({
          title: `Smoke issue with update ${m}`,
          description: m,
          ownerId: assigneeId,
          teamId: destTeamId,
          timeline: 'short_term',
          transferSourceTeamId: leadershipTeamId,
          transferReason: ''
        });
        trackIssue(saved.id);
        await api.addIssueUpdate(saved.id, updateM);
        const updates = await api.getIssueUpdates(saved.id);
        const errors = assertIssuePersisted({ saved, destTeamId, userMarker: m, assigneeId });
        if (!updates.some((u) => stripHtmlToText(u.update_text).includes(updateM))) {
          errors.push('issue update not persisted');
        }
        return errors;
      }
    },
    {
      id: 'issue-create-transfer-visible-on-destination-list',
      group: 'issue-new-transfer',
      run: async () => {
        const m = marker('issue-list');
        const saved = await api.createIssue({
          title: `Smoke list visibility ${m}`,
          description: m,
          ownerId: assigneeId,
          teamId: destTeamId,
          timeline: 'short_term',
          transferSourceTeamId: leadershipTeamId,
          transferReason: ''
        });
        trackIssue(saved.id);
        const list = await api.getIssues(destTeamId);
        const errors = assertIssuePersisted({ saved, destTeamId, userMarker: m, assigneeId });
        const listErr = assertListedOnDestination(list, saved.id, 'issue');
        if (listErr) errors.push(listErr);
        const listed = list.find((i) => i.id === saved.id);
        if (listed && !includesUserContent(listed.description, m)) {
          errors.push('destination list item missing summary marker');
        }
        return errors;
      }
    },

    // ── EXISTING ISSUE + MOVE ──
    {
      id: 'issue-move-with-description-in-payload',
      group: 'issue-existing-move',
      run: async () => {
        const m = marker('issue-move-desc');
        const created = await api.createIssue({
          title: `Smoke pre-move ${m}`,
          description: 'temporary',
          ownerId: assigneeId,
          teamId: leadershipTeamId,
          timeline: 'short_term'
        });
        trackIssue(created.id);
        const moved = await api.moveIssue(created.id, {
          newTeamId: destTeamId,
          newOwnerId: assigneeId,
          reason: 'Move with description',
          title: created.title,
          description: m,
          status: 'open'
        });
        return assertIssuePersisted({ saved: moved.data, destTeamId, userMarker: m, assigneeId });
      }
    },
    {
      id: 'issue-move-preserve-existing-description',
      group: 'issue-existing-move',
      run: async () => {
        const m = marker('issue-move-keep');
        const created = await api.createIssue({
          title: `Smoke keep desc ${m}`,
          description: m,
          ownerId: assigneeId,
          teamId: leadershipTeamId,
          timeline: 'short_term'
        });
        trackIssue(created.id);
        const moved = await api.moveIssue(created.id, {
          newTeamId: destTeamId,
          newOwnerId: assigneeId,
          reason: 'Preserve test',
          title: created.title,
          status: 'open'
        });
        return assertIssuePersisted({ saved: moved.data, destTeamId, userMarker: m, assigneeId });
      }
    },
    {
      id: 'issue-move-after-explicit-update',
      group: 'issue-existing-move',
      run: async () => {
        const m = marker('issue-move-after-update');
        const created = await api.createIssue({
          title: `Smoke title only ${m}`,
          description: '',
          ownerId: assigneeId,
          teamId: leadershipTeamId,
          timeline: 'short_term'
        });
        trackIssue(created.id);
        await api.updateIssue(created.id, { description: m, title: created.title });
        const moved = await api.moveIssue(created.id, {
          newTeamId: destTeamId,
          newOwnerId: assigneeId,
          reason: 'Updated then moved',
          title: created.title,
          description: m,
          status: 'open'
        });
        return assertIssuePersisted({ saved: moved.data, destTeamId, userMarker: m, assigneeId });
      }
    },
    {
      id: 'issue-move-blank-description-does-not-wipe',
      group: 'issue-existing-move',
      run: async () => {
        const m = marker('issue-move-no-wipe');
        const created = await api.createIssue({
          title: `Smoke no wipe ${m}`,
          description: m,
          ownerId: assigneeId,
          teamId: leadershipTeamId,
          timeline: 'short_term'
        });
        trackIssue(created.id);
        const moved = await api.moveIssue(created.id, {
          newTeamId: destTeamId,
          newOwnerId: assigneeId,
          reason: 'Blank payload test',
          title: created.title,
          description: '',
          status: 'open'
        });
        return assertIssuePersisted({ saved: moved.data, destTeamId, userMarker: m, assigneeId });
      }
    },
    {
      id: 'issue-move-with-reason-appended',
      group: 'issue-existing-move',
      run: async () => {
        const m = marker('issue-move-reason');
        const created = await api.createIssue({
          title: `Smoke move reason ${m}`,
          description: m,
          ownerId: assigneeId,
          teamId: leadershipTeamId,
          timeline: 'short_term'
        });
        trackIssue(created.id);
        const moved = await api.moveIssue(created.id, {
          newTeamId: destTeamId,
          newOwnerId: assigneeId,
          reason: 'Escalated to finance',
          title: created.title,
          description: m,
          status: 'open'
        });
        const errors = assertIssuePersisted({ saved: moved.data, destTeamId, userMarker: m, assigneeId });
        if (!stripHtmlToText(moved.data.description).includes('Escalated to finance')) {
          errors.push('move reason not appended to description');
        }
        return errors;
      }
    },

    // ── NEW TODO + TRANSFER ──
    {
      id: 'todo-create-transfer-plain-summary',
      group: 'todo-new-transfer',
      run: async () => {
        const m = marker('todo-plain');
        const saved = await api.createTodo({
          title: `Smoke todo plain ${m}`,
          description: m,
          assignedToId: assigneeId,
          teamId: destTeamId,
          transferSourceTeamId: leadershipTeamId,
          transferReason: 'From leadership'
        });
        trackTodo(saved.id);
        return assertTodoPersisted({ saved, destTeamId, userMarker: m, assigneeId });
      }
    },
    {
      id: 'todo-create-transfer-html-summary',
      group: 'todo-new-transfer',
      run: async () => {
        const m = marker('todo-html');
        const html = `<p>${m}</p>`;
        const saved = await api.createTodo({
          title: `Smoke todo html ${m}`,
          description: html,
          assignedToId: assigneeId,
          teamId: destTeamId,
          transferSourceTeamId: leadershipTeamId,
          transferReason: ''
        });
        trackTodo(saved.id);
        return assertTodoPersisted({ saved, destTeamId, userMarker: m, assigneeId });
      }
    },
    {
      id: 'todo-create-transfer-summary-and-reason',
      group: 'todo-new-transfer',
      run: async () => {
        const m = marker('todo-both');
        const saved = await api.createTodo({
          title: `Smoke todo both ${m}`,
          description: m,
          assignedToId: assigneeId,
          teamId: destTeamId,
          transferSourceTeamId: leadershipTeamId,
          transferReason: 'Finance action needed'
        });
        trackTodo(saved.id);
        const errors = assertTodoPersisted({ saved, destTeamId, userMarker: m, assigneeId });
        if (!stripHtmlToText(saved.description).includes('Finance action')) {
          errors.push('transfer reason not in todo description');
        }
        return errors;
      }
    },
    {
      id: 'todo-create-transfer-reason-only',
      group: 'todo-new-transfer',
      run: async () => {
        const reason = `Todo reason ${marker('todo-reason')}`;
        const saved = await api.createTodo({
          title: `Smoke todo reason only ${RUN_ID}`,
          description: '',
          assignedToId: assigneeId,
          teamId: destTeamId,
          transferSourceTeamId: leadershipTeamId,
          transferReason: reason
        });
        trackTodo(saved.id);
        const errors = assertTodoPersisted({ saved, destTeamId, userMarker: null, assigneeId });
        if (!stripHtmlToText(saved.description).includes('Todo reason')) {
          errors.push(`todo description should contain reason (len=${(saved.description || '').length})`);
        }
        return errors;
      }
    },
    {
      id: 'todo-create-transfer-visible-on-destination-list',
      group: 'todo-new-transfer',
      run: async () => {
        const m = marker('todo-list');
        const saved = await api.createTodo({
          title: `Smoke todo list ${m}`,
          description: m,
          assignedToId: assigneeId,
          teamId: destTeamId,
          transferSourceTeamId: leadershipTeamId,
          transferReason: ''
        });
        trackTodo(saved.id);
        const list = await api.getTodos(destTeamId);
        const errors = assertTodoPersisted({ saved, destTeamId, userMarker: m, assigneeId });
        const listErr = assertListedOnDestination(list, saved.id, 'todo');
        if (listErr) errors.push(listErr);
        const listed = list.find((t) => t.id === saved.id);
        if (listed && !includesUserContent(listed.description, m)) {
          errors.push('destination todo list missing summary marker');
        }
        return errors;
      }
    },

    // ── EXISTING TODO + MOVE ──
    {
      id: 'todo-move-with-description-in-payload',
      group: 'todo-existing-move',
      run: async () => {
        const m = marker('todo-move-desc');
        const created = await api.createTodo({
          title: `Smoke todo pre-move ${m}`,
          description: 'temp',
          assignedToId: assigneeId,
          teamId: leadershipTeamId
        });
        trackTodo(created.id);
        const moved = await api.moveTodo(created.id, {
          newTeamId: destTeamId,
          newAssigneeId: assigneeId,
          reason: 'Move with description',
          title: created.title,
          description: m
        });
        return assertTodoPersisted({ saved: moved.data, destTeamId, userMarker: m, assigneeId });
      }
    },
    {
      id: 'todo-move-preserve-existing-description',
      group: 'todo-existing-move',
      run: async () => {
        const m = marker('todo-move-keep');
        const created = await api.createTodo({
          title: `Smoke todo keep ${m}`,
          description: m,
          assignedToId: assigneeId,
          teamId: leadershipTeamId
        });
        trackTodo(created.id);
        const moved = await api.moveTodo(created.id, {
          newTeamId: destTeamId,
          newAssigneeId: assigneeId,
          reason: 'Preserve todo desc',
          title: created.title
        });
        return assertTodoPersisted({ saved: moved.data, destTeamId, userMarker: m, assigneeId });
      }
    },
    {
      id: 'todo-move-with-reason-appended',
      group: 'todo-existing-move',
      run: async () => {
        const m = marker('todo-move-reason');
        const created = await api.createTodo({
          title: `Smoke todo move reason ${m}`,
          description: m,
          assignedToId: assigneeId,
          teamId: leadershipTeamId
        });
        trackTodo(created.id);
        const moved = await api.moveTodo(created.id, {
          newTeamId: destTeamId,
          newAssigneeId: assigneeId,
          reason: 'Handoff to finance',
          title: created.title,
          description: m
        });
        const errors = assertTodoPersisted({ saved: moved.data, destTeamId, userMarker: m, assigneeId });
        if (!stripHtmlToText(moved.data.description).includes('Handoff to finance')) {
          errors.push('todo move reason not appended');
        }
        return errors;
      }
    },

    // ── FRONTEND PATH (IssueDialog / crossTeamSave payload shape) ──
    {
      id: 'frontend-path-issue-create-transfer',
      group: 'frontend-path',
      run: async () => {
        const m = marker('fe-issue-create');
        const issueData = {
          title: `Frontend path issue ${m}`,
          description: m,
          ownerId: assigneeId,
          ownerName: 'Smoke User',
          status: 'open',
          timeline: 'short_term',
          transferToTeam: {
            enabled: true,
            destinationTeamId: destTeamId,
            assigneeId,
            reason: 'Frontend path routing'
          },
          sourceContextTeamId: leadershipTeamId
        };
        const { apiPayload, userSummary, destinationTeamId } = buildFrontendIssueCreatePayload(
          issueData,
          leadershipTeamId,
          null
        );
        const saved = await api.createIssue(apiPayload);
        trackIssue(saved.id);
        const errors = assertIssuePersisted({ saved, destTeamId: destinationTeamId, userMarker: m, assigneeId });
        if (!userContentPersisted(userSummary, saved.description)) {
          errors.push('userContentPersisted failed on create response');
        }
        const list = await api.getIssues(destinationTeamId);
        const listed = list.find((i) => i.id === saved.id);
        if (!listed) errors.push('not on destination list');
        else if (!includesUserContent(listed.description, m)) errors.push('destination list missing marker');
        return errors;
      }
    },
    {
      id: 'frontend-path-issue-create-with-pending-update',
      group: 'frontend-path',
      run: async () => {
        const m = marker('fe-issue-upd');
        const updateM = `${m}_PENDING`;
        const issueData = {
          title: `Frontend path issue update ${m}`,
          description: m,
          ownerId: assigneeId,
          status: 'open',
          timeline: 'short_term',
          pendingUpdateText: updateM,
          transferToTeam: {
            enabled: true,
            destinationTeamId: destTeamId,
            assigneeId,
            reason: ''
          },
          sourceContextTeamId: leadershipTeamId
        };
        const { apiPayload, userSummary } = buildFrontendIssueCreatePayload(issueData, leadershipTeamId);
        const saved = await api.createIssue(apiPayload);
        trackIssue(saved.id);
        const errors = assertIssuePersisted({ saved, destTeamId, userMarker: m, assigneeId });
        if (!userContentPersisted(updateM, saved.description)) {
          errors.push('pending update not merged into description');
        }
        if (!userContentPersisted(userSummary, saved.description)) {
          errors.push('summary lost after pending update merge');
        }
        return errors;
      }
    },
    {
      id: 'frontend-path-issue-move-existing',
      group: 'frontend-path',
      run: async () => {
        const m = marker('fe-issue-move');
        const created = await api.createIssue({
          title: `Frontend path move ${m}`,
          description: 'placeholder',
          ownerId: assigneeId,
          teamId: leadershipTeamId,
          timeline: 'short_term'
        });
        trackIssue(created.id);
        const issueData = {
          id: created.id,
          title: created.title,
          description: m,
          ownerId: assigneeId,
          status: 'open',
          timeline: 'short_term',
          transferToTeam: {
            enabled: true,
            destinationTeamId: destTeamId,
            assigneeId,
            reason: 'Frontend move path'
          },
          sourceContextTeamId: leadershipTeamId
        };
        const { apiPayload: _ignored, userSummary } = buildFrontendIssueCreatePayload(issueData, leadershipTeamId);
        const description = buildIssueDescription({
          description: userSummary,
          pendingUpdateText: '',
          transferReason: issueData.transferToTeam.reason
        });
        await api.updateIssue(created.id, {
          title: issueData.title,
          description,
          ownerId: issueData.ownerId,
          status: issueData.status,
          timeline: issueData.timeline
        });
        const moved = await api.moveIssue(created.id, {
          newTeamId: destTeamId,
          newOwnerId: assigneeId,
          reason: issueData.transferToTeam.reason,
          title: issueData.title,
          description,
          status: 'open'
        });
        const errors = assertIssuePersisted({ saved: moved.data, destTeamId, userMarker: m, assigneeId });
        const list = await api.getIssues(destTeamId);
        const listed = list.find((i) => i.id === created.id);
        if (!listed) errors.push('moved issue not on destination list');
        else if (!includesUserContent(listed.description, m)) errors.push('list missing marker after move');
        return errors;
      }
    },
    {
      id: 'frontend-path-todo-create-transfer',
      group: 'frontend-path',
      run: async () => {
        const m = marker('fe-todo-create');
        const todoData = {
          title: `Frontend path todo ${m}`,
          description: m,
          assignedToId: assigneeId,
          transferToTeam: {
            enabled: true,
            destinationTeamId: destTeamId,
            assigneeId,
            reason: 'Todo frontend path'
          }
        };
        const { apiPayload, userSummary, destinationTeamId } = buildFrontendTodoCreatePayload(
          todoData,
          leadershipTeamId
        );
        const saved = await api.createTodo(apiPayload);
        trackTodo(saved.id);
        const errors = assertTodoPersisted({ saved, destTeamId: destinationTeamId, userMarker: m, assigneeId });
        if (!userContentPersisted(userSummary, saved.description)) {
          errors.push('todo userContentPersisted failed');
        }
        return errors;
      }
    },

    // ── NEGATIVE ──
    {
      id: 'todo-move-rejects-missing-assignee',
      group: 'negative',
      run: async () => {
        const created = await api.createTodo({
          title: `Smoke todo negative ${RUN_ID}`,
          description: marker('todo-neg'),
          assignedToId: assigneeId,
          teamId: leadershipTeamId
        });
        trackTodo(created.id);
        const res = await api.request('POST', `/organizations/${api.orgId}/todos/${created.id}/move-team`, {
          newTeamId: destTeamId,
          reason: 'Should fail'
        });
        return res.status === 400 ? [] : [`expected 400 without newAssigneeId, got ${res.status}`];
      }
    },

    { created }
  ];
}

// ─── runner ─────────────────────────────────────────────────────────────────

async function cleanup(api, created) {
  if (KEEP_DATA) return;
  for (const id of created.issues) {
    try { await api.deleteIssue(id); } catch { /* ignore */ }
  }
  for (const id of created.todos) {
    try { await api.deleteTodo(id); } catch { /* ignore */ }
  }
}

async function main() {
  console.log('═'.repeat(72));
  console.log('AXP Cross-Team Transfer API Smoke Test');
  console.log(`API: ${API_URL}`);
  console.log(`Run: ${RUN_ID}`);
  console.log(`Mode: ${USE_LOGIN ? 'login' : 'register (isolated org)'}`);
  console.log('═'.repeat(72));

  const api = new ApiClient(API_URL);
  const ctx = await setupContext(api);
  console.log(`Org:     ${api.orgId}`);
  console.log(`User:    ${api.userId}`);
  console.log(`Source:  ${ctx.leadershipTeamId} (Leadership)`);
  console.log(`Dest:    ${ctx.destTeamId}`);
  console.log('');

  const scenarios = buildScenarios(ctx, api);
  const created = scenarios.find((s) => s.created)?.created;
  const tests = scenarios.filter((s) => s.run);

  const results = [];
  let passed = 0;
  let failed = 0;

  const groups = [...new Set(tests.map((t) => t.group))];
  for (const group of groups) {
    console.log(`\n── ${group} ${'─'.repeat(Math.max(0, 60 - group.length))}`);
    for (const test of tests.filter((t) => t.group === group)) {
      const start = Date.now();
      try {
        const errors = await test.run();
        const ms = Date.now() - start;
        if (errors.length === 0) {
          passed++;
          console.log(`  ✅ ${test.id} (${ms}ms)`);
          results.push({ id: test.id, group: test.group, status: 'pass', ms });
        } else {
          failed++;
          console.log(`  ❌ ${test.id} (${ms}ms)`);
          errors.forEach((e) => console.log(`       → ${e}`));
          results.push({ id: test.id, group: test.group, status: 'fail', ms, errors });
        }
      } catch (err) {
        failed++;
        const ms = Date.now() - start;
        console.log(`  ❌ ${test.id} (${ms}ms) EXCEPTION`);
        console.log(`       → ${err.message}`);
        results.push({ id: test.id, group: test.group, status: 'error', ms, errors: [err.message] });
      }
    }
  }

  console.log('\n' + '═'.repeat(72));
  console.log(`RESULTS: ${passed} passed, ${failed} failed, ${tests.length} total`);
  console.log('═'.repeat(72));

  if (!KEEP_DATA && created) {
    console.log('\nCleaning up test data...');
    await cleanup(api, created);
    console.log(`Deleted ${created.issues.length} issues, ${created.todos.length} todos`);
  }

  if (failed > 0) {
    console.log('\nFailed scenarios:');
    results.filter((r) => r.status !== 'pass').forEach((r) => {
      console.log(`  - ${r.id}: ${(r.errors || []).join('; ')}`);
    });
    process.exit(1);
  }

  console.log('\nAll transfer smoke tests passed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Smoke test setup failed:', err.message);
  process.exit(2);
});