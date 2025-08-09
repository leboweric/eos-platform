import { createContext, useContext, useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { teamSelectionService } from '../services/userPreferencesService';

const TeamContext = createContext();

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};

export const TeamProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuthStore();
  const [selectedTeamId, setSelectedTeamId] = useState('00000000-0000-0000-0000-000000000000');
  const [isLoading, setIsLoading] = useState(true);

  // Load team selection from database
  useEffect(() => {
    const loadTeamSelection = async () => {
      if (!isAuthenticated) {
        setSelectedTeamId('00000000-0000-0000-0000-000000000000');
        setIsLoading(false);
        return;
      }

      try {
        const savedTeamId = await teamSelectionService.getSelectedTeam();
        if (savedTeamId) {
          setSelectedTeamId(savedTeamId);
        } else {
          // Default to Leadership Team
          setSelectedTeamId('00000000-0000-0000-0000-000000000000');
        }
      } catch (error) {
        console.error('Failed to load team selection:', error);
        // Use default on error
        setSelectedTeamId('00000000-0000-0000-0000-000000000000');
      } finally {
        setIsLoading(false);
      }
    };

    loadTeamSelection();
  }, [isAuthenticated]);

  useEffect(() => {
    // If user has teams, ensure selected team is valid
    if (user?.teams?.length > 0 && !isLoading) {
      const teamIds = user.teams.map(t => t.id);
      
      // If current selection is not in user's teams and not the default Leadership Team ID
      if (!teamIds.includes(selectedTeamId) && selectedTeamId !== '00000000-0000-0000-0000-000000000000') {
        // Find leadership team or use default
        const leadershipTeam = user.teams.find(t => t.is_leadership_team);
        const newTeamId = leadershipTeam?.id || '00000000-0000-0000-0000-000000000000';
        setSelectedTeamId(newTeamId);
        
        // Save to database
        if (isAuthenticated) {
          teamSelectionService.setSelectedTeam(newTeamId).catch(error => {
            console.error('Failed to save team selection:', error);
          });
        }
      }
    }
  }, [user?.teams, selectedTeamId, isLoading, isAuthenticated]);

  const selectTeam = async (teamId) => {
    setSelectedTeamId(teamId);
    
    // Save to database
    if (isAuthenticated) {
      try {
        await teamSelectionService.setSelectedTeam(teamId);
      } catch (error) {
        console.error('Failed to save team selection:', error);
      }
    }
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
    isLoading
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
};