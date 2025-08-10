import { useAuthStore } from '../stores/authStore';
import { getTeamId } from '../utils/teamUtils';
import { useDepartment } from '../contexts/DepartmentContext';

const ScorecardDebug = () => {
  const { user } = useAuthStore();
  const { selectedDepartment, isLeadershipMember } = useDepartment();
  
  const leadershipTeamId = getTeamId(user, 'leadership');
  const currentTeamId = selectedDepartment?.id || leadershipTeamId;
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Scorecard Debug Info</h1>
      
      <h2>User Info:</h2>
      <pre>{JSON.stringify({
        email: user?.email,
        organizationId: user?.organizationId || user?.organization_id,
        teams: user?.teams
      }, null, 2)}</pre>
      
      <h2>Department Context:</h2>
      <pre>{JSON.stringify({
        selectedDepartment,
        isLeadershipMember
      }, null, 2)}</pre>
      
      <h2>Team IDs:</h2>
      <pre>{JSON.stringify({
        leadershipTeamId,
        currentTeamId,
        specialUUID: '00000000-0000-0000-0000-000000000000'
      }, null, 2)}</pre>
      
      <h2>Leadership Team Detection:</h2>
      <pre>{JSON.stringify({
        leadershipTeamFromUser: user?.teams?.find(t => t.is_leadership_team),
        hasLeadershipFlag: user?.teams?.some(t => t.is_leadership_team)
      }, null, 2)}</pre>
    </div>
  );
};

export default ScorecardDebug;