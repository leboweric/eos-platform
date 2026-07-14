import { describe, it, expect } from 'vitest';
import { isRealMeetingMembership } from '../meetingMembership';

describe('isRealMeetingMembership', () => {
  it('uses explicit is_member when present', () => {
    expect(isRealMeetingMembership({ id: '1', is_member: true })).toBe(true);
    expect(isRealMeetingMembership({ id: '1', is_member: false, member_role: 'viewer' })).toBe(false);
  });

  it('treats legacy synthetic viewer access as non-member', () => {
    expect(isRealMeetingMembership({ id: '1', member_role: 'viewer' })).toBe(false);
  });

  it('treats membership role without is_member as member', () => {
    expect(isRealMeetingMembership({ id: '1', member_role: 'member' })).toBe(true);
  });
});
