import { describe, it, expect } from 'vitest';
import { decideTodoTeamId } from '../utils/todoTeamRouting.js';

const LEADERSHIP = 'lead-team-id';
const DELIVERY = 'delivery-team-id';
const FINANCE = 'finance-team-id';

const dualMember = [
  { team_id: DELIVERY, is_leadership_team: false, name: 'Delivery' },
  { team_id: LEADERSHIP, is_leadership_team: true, name: 'Leadership' }
];

const financeOnly = [
  { team_id: FINANCE, is_leadership_team: false, name: 'Finance' }
];

const leadershipOnly = [
  { team_id: LEADERSHIP, is_leadership_team: true, name: 'Leadership' }
];

describe('decideTodoTeamId', () => {
  it('keeps meeting todos on the requested team', () => {
    expect(
      decideTodoTeamId(LEADERSHIP, dualMember, {
        requestedIsLeadership: true,
        meetingId: 'meeting-1'
      })
    ).toBe(LEADERSHIP);
  });

  it('keeps Leadership todos for dual Leadership+Delivery members', () => {
    expect(
      decideTodoTeamId(LEADERSHIP, dualMember, { requestedIsLeadership: true })
    ).toBe(LEADERSHIP);
  });

  it('keeps Delivery todos when Delivery is requested for dual members', () => {
    expect(
      decideTodoTeamId(DELIVERY, dualMember, { requestedIsLeadership: false })
    ).toBe(DELIVERY);
  });

  it('routes Leadership todos to Finance when assignee is finance-only', () => {
    expect(
      decideTodoTeamId(LEADERSHIP, financeOnly, { requestedIsLeadership: true })
    ).toBe(FINANCE);
  });

  it('keeps Leadership todos for leadership-only assignees', () => {
    expect(
      decideTodoTeamId(LEADERSHIP, leadershipOnly, { requestedIsLeadership: true })
    ).toBe(LEADERSHIP);
  });

  it('returns requested team when assignee has no teams', () => {
    expect(
      decideTodoTeamId(LEADERSHIP, [], { requestedIsLeadership: true })
    ).toBe(LEADERSHIP);
  });
});
