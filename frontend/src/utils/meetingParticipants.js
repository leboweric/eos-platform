/**
 * Build attendee records from live socket participants for meeting conclude/snapshot.
 */
export function buildMeetingAttendees(participants = []) {
  return participants.map((participant) => ({
    userId: participant.id || participant.userId,
    userName: participant.name || 'Unknown',
    joined: true,
    temporarilyDisconnected: !!participant.temporarilyDisconnected
  }));
}