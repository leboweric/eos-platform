import { describe, it, expect } from 'vitest';
import {
  getUserTeamId,
  getEffectiveTeamId,
  getContextTeamId,
  LEADERSHIP_TEAM_ID
} from '../teamUtils';

const LEADERSHIP = {
  id: 'e9bba8ad-3aaf-479f-ad8f-51c23fe2da24',
  name: 'Leadership Team',
  is_leadership_team: true
};

const DELIVERY = {
  id: '46477b28-438f-48e1-8d4d-fa24ec9a70b4',
  name: 'Delivery Team',
  is_leadership_team: false
};

describe('getUserTeamId', () => {
  it('prefers leadership for dual-team users', () => {
    expect(getUserTeamId({ teams: [DELIVERY, LEADERSHIP] })).toBe(LEADERSHIP.id);
  });

  it('uses department team when user is not on leadership', () => {
    expect(getUserTeamId({ teams: [DELIVERY] })).toBe(DELIVERY.id);
  });
});

describe('getEffectiveTeamId', () => {
  const dualUser = { teams: [DELIVERY, LEADERSHIP] };

  it('trusts Leadership meeting URL and does not remap to Delivery', () => {
    expect(getEffectiveTeamId(LEADERSHIP.id, dualUser)).toBe(LEADERSHIP.id);
  });

  it('trusts Delivery meeting URL', () => {
    expect(getEffectiveTeamId(DELIVERY.id, dualUser)).toBe(DELIVERY.id);
  });

  it('trusts preferred team even when not in user.teams', () => {
    const deliveryOnly = { teams: [DELIVERY] };
    expect(getEffectiveTeamId(LEADERSHIP.id, deliveryOnly)).toBe(LEADERSHIP.id);
  });

  it('falls back to leadership for dual users when preferred is missing', () => {
    expect(getEffectiveTeamId(null, dualUser)).toBe(LEADERSHIP.id);
    expect(getEffectiveTeamId(LEADERSHIP_TEAM_ID, dualUser)).toBe(LEADERSHIP.id);
  });

  it('returns null when allowFallback is false and preferred is missing', () => {
    expect(getEffectiveTeamId(null, dualUser, false)).toBeNull();
  });
});

describe('getContextTeamId', () => {
  it('returns explicit meeting team ids', () => {
    expect(getContextTeamId(LEADERSHIP.id)).toBe(LEADERSHIP.id);
  });

  it('rejects placeholder and null-like values', () => {
    expect(getContextTeamId(LEADERSHIP_TEAM_ID)).toBeNull();
    expect(getContextTeamId('null')).toBeNull();
    expect(getContextTeamId(null)).toBeNull();
  });
});
