import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useTeam } from '../contexts/TeamContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Users, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const TeamSelector = ({ onTeamChange }) => {
  const { user } = useAuthStore();
  const { selectedTeamId, selectTeam, getSelectedTeam } = useTeam();

  useEffect(() => {
    // Notify parent component of team changes
    if (onTeamChange && selectedTeamId) {
      onTeamChange(selectedTeamId);
    }
  }, [selectedTeamId, onTeamChange]);

  const handleTeamChange = async (teamId) => {
    await selectTeam(teamId);
    if (onTeamChange) {
      onTeamChange(teamId);
    }
  };

  // If user has no teams or only one team, don't show selector
  if (!user?.teams || user.teams.length <= 1) {
    return null;
  }

  const currentTeam = getSelectedTeam() || user.teams.find(t => t.id === selectedTeamId);

  return (
    <div className="flex items-center space-x-2">
      <Select value={selectedTeamId} onValueChange={handleTeamChange}>
        <SelectTrigger className="w-[250px]">
          <SelectValue>
            <div className="flex items-center space-x-2">
              {currentTeam?.is_leadership_team ? (
                <Shield className="h-4 w-4 text-purple-600" />
              ) : (
                <Building2 className="h-4 w-4 text-gray-600" />
              )}
              <span>{currentTeam?.name || 'Select Team'}</span>
              {currentTeam?.is_leadership_team && (
                <Badge variant="default" className="ml-2 bg-purple-600 text-xs">
                  Leadership
                </Badge>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* Always show Leadership Team option first */}
          <SelectItem value="00000000-0000-0000-0000-000000000000">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-purple-600" />
              <span>Leadership Team</span>
            </div>
          </SelectItem>
          
          {/* Show other teams */}
          {(user.teams || []).filter(t => !t.is_leadership_team).map(team => (
            <SelectItem key={team.id} value={team.id}>
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-gray-600" />
                <span>{team.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TeamSelector;