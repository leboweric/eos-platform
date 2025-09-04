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
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load team selection from database
  useEffect(() => {
    const loadTeamSelection = async () => {
      if (!isAuthenticated || !user?.teams) {
        setIsLoading(false);
        return;
      }

      try {
        const savedTeamId = await teamSelectionService.getSelectedTeam();
        if (savedTeamId && user.teams.some(t => t.id === savedTeamId)) {
          setSelectedTeamId(savedTeamId);
        } else {
          // Default to Leadership Team if it exists
          const leadershipTeam = user.teams.find(t => t.is_leadership_team);
          if (leadershipTeam) {
            setSelectedTeamId(leadershipTeam.id);
          } else if (user.teams.length > 0) {
            // Fallback to first team if no leadership team
            setSelectedTeamId(user.teams[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load team selection:', error);
        // Use first available team on error
        if (user.teams?.length > 0) {
          const leadershipTeam = user.teams.find(t => t.is_leadership_team);
          setSelectedTeamId(leadershipTeam?.id || user.teams[0].id);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadTeamSelection();
  }, [isAuthenticated, user?.teams]);

  useEffect(() => {
    // If user has teams, ensure selected team is valid
    if (user?.teams?.length > 0 && !isLoading && selectedTeamId) {
      const teamIds = user.teams.map(t => t.id);
      
      // If current selection is not in user's teams
      if (!teamIds.includes(selectedTeamId)) {
        // Find leadership team or use first team
        const leadershipTeam = user.teams.find(t => t.is_leadership_team);
        const newTeamId = leadershipTeam?.id || user.teams[0].id;
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
    return getSelectedTeam()?.is_leadership_team === true;
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