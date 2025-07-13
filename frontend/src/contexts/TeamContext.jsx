import { createContext, useContext, useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

const TeamContext = createContext();

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};

export const TeamProvider = ({ children }) => {
  const { user } = useAuthStore();
  const [selectedTeamId, setSelectedTeamId] = useState(() => {
    // Check localStorage first
    const stored = localStorage.getItem('selectedTeamId');
    if (stored) return stored;
    
    // Default to Leadership Team
    return '00000000-0000-0000-0000-000000000000';
  });

  useEffect(() => {
    // If user has teams, ensure selected team is valid
    if (user?.teams?.length > 0) {
      const teamIds = user.teams.map(t => t.id);
      
      // If current selection is not in user's teams and not the default Leadership Team ID
      if (!teamIds.includes(selectedTeamId) && selectedTeamId !== '00000000-0000-0000-0000-000000000000') {
        // Find leadership team or use default
        const leadershipTeam = user.teams.find(t => t.is_leadership_team);
        const newTeamId = leadershipTeam?.id || '00000000-0000-0000-0000-000000000000';
        setSelectedTeamId(newTeamId);
        localStorage.setItem('selectedTeamId', newTeamId);
      }
    }
  }, [user?.teams]);

  const selectTeam = (teamId) => {
    setSelectedTeamId(teamId);
    localStorage.setItem('selectedTeamId', teamId);
  };

  const getSelectedTeam = () => {
    if (!user?.teams) return null;
    return user.teams.find(t => t.id === selectedTeamId) || null;
  };

  const isLeadershipTeamSelected = () => {
    return selectedTeamId === '00000000-0000-0000-0000-000000000000' || 
           getSelectedTeam()?.is_leadership_team === true;
  };

  const value = {
    selectedTeamId,
    selectTeam,
    getSelectedTeam,
    isLeadershipTeamSelected,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
};