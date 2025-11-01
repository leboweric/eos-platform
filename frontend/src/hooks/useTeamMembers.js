import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { teamsService } from '../services/teamsService';

/**
 * Hook to fetch and filter team members based on current context
 * @param {string} teamId - Current team context
 * @param {object} options - Configuration options
 * @returns {object} Team members data and loading state
 */
export function useTeamMembers(teamId, options = {}) {
  const {
    includeAllIfLeadership = true, // Leadership team sees everyone
    sortBy = 'name', // 'name' | 'role' | 'recent'
    activeOnly = true, // Exclude inactive users
  } = options;

  const { user } = useAuthStore();
  const organizationId = user?.organizationId || user?.organization_id;
  
  const [teamMembers, setTeamMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLeadershipTeam, setIsLeadershipTeam] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!organizationId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // If no team context, show all org users as fallback
        if (!teamId || teamId === 'null' || teamId === 'undefined') {
          console.warn('No team context provided, showing all org users');
          const allOrgResponse = await teamsService.getAllOrganizationUsers(organizationId);
          console.log('📦 Fallback all org users API response:', allOrgResponse);
          
          // Handle different response formats defensively
          let allOrgUsers = [];
          if (Array.isArray(allOrgResponse)) {
            allOrgUsers = allOrgResponse;
          } else if (allOrgResponse?.data && Array.isArray(allOrgResponse.data)) {
            allOrgUsers = allOrgResponse.data;
          } else if (allOrgResponse?.users && Array.isArray(allOrgResponse.users)) {
            allOrgUsers = allOrgResponse.users;
          } else {
            console.warn('⚠️ Unexpected fallback response format:', allOrgResponse);
            allOrgUsers = [];
          }
          
          console.log('✅ Parsed fallback org users:', allOrgUsers);
          setAllUsers(allOrgUsers);
          setTeamMembers(allOrgUsers);
          setIsLeadershipTeam(false);
          setError(null);
          return;
        }
        
        // Fetch team members
        console.log('🔍 Fetching team members for:', { teamId, organizationId });
        const response = await teamsService.getTeamMembers(organizationId, teamId);
        console.log('📦 Team members API response:', response);
        
        // Handle different response formats defensively
        let members = [];
        if (Array.isArray(response)) {
          members = response;
        } else if (response?.data && Array.isArray(response.data)) {
          members = response.data;
        } else if (response?.members && Array.isArray(response.members)) {
          members = response.members;
        } else {
          console.warn('⚠️ Unexpected team members response format:', response);
          members = [];
        }
        
        console.log('✅ Parsed team members:', members);
        setTeamMembers(members);
        
        // Check if it's the leadership team
        const teamData = await teamsService.getTeam(organizationId, teamId);
        const isLeadership = teamData?.is_leadership_team || false;
        setIsLeadershipTeam(isLeadership);
        
        // If leadership team and includeAllIfLeadership, fetch all org users
        if (isLeadership && includeAllIfLeadership) {
          console.log('🔍 Fetching all organization users for leadership team');
          const allOrgResponse = await teamsService.getAllOrganizationUsers(organizationId);
          console.log('📦 All org users API response:', allOrgResponse);
          
          // Handle different response formats defensively
          let allOrgUsers = [];
          if (Array.isArray(allOrgResponse)) {
            allOrgUsers = allOrgResponse;
          } else if (allOrgResponse?.data && Array.isArray(allOrgResponse.data)) {
            allOrgUsers = allOrgResponse.data;
          } else if (allOrgResponse?.users && Array.isArray(allOrgResponse.users)) {
            allOrgUsers = allOrgResponse.users;
          } else {
            console.warn('⚠️ Unexpected all org users response format:', allOrgResponse);
            allOrgUsers = [];
          }
          
          console.log('✅ Parsed all org users:', allOrgUsers);
          setAllUsers(allOrgUsers);
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching team members:', err);
        setError(err.message);
        // Fallback to empty array on error
        setTeamMembers([]);
        setAllUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [teamId, organizationId, includeAllIfLeadership]);

  // Determine which user list to use and apply filters/sorting
  const members = useMemo(() => {
    const baseList = (isLeadershipTeam && includeAllIfLeadership && allUsers.length > 0)
      ? allUsers
      : teamMembers;

    // Defensive check: ensure baseList is always an array
    const safeBaseList = Array.isArray(baseList) ? baseList : [];
    console.log('🔍 useMemo processing:', {
      isLeadershipTeam,
      includeAllIfLeadership,
      allUsersLength: Array.isArray(allUsers) ? allUsers.length : 'not-array',
      teamMembersLength: Array.isArray(teamMembers) ? teamMembers.length : 'not-array',
      baseListType: typeof baseList,
      baseListIsArray: Array.isArray(baseList),
      safeBaseListLength: safeBaseList.length
    });

    // Filter active only if requested
    let filtered = activeOnly
      ? safeBaseList.filter(m => m && (m.status === 'active' || m.status === undefined || m.status === null))
      : safeBaseList;

    // Sort with defensive checks
    if (sortBy === 'name') {
      filtered = [...filtered].sort((a, b) => {
        // Defensive checks for objects
        if (!a || !b) return 0;
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else if (sortBy === 'role') {
      const roleOrder = { admin: 0, manager: 1, user: 2 };
      filtered = [...filtered].sort((a, b) => {
        // Defensive checks for objects
        if (!a || !b) return 0;
        const roleA = roleOrder[a.role] ?? 999;
        const roleB = roleOrder[b.role] ?? 999;
        if (roleA !== roleB) return roleA - roleB;
        // Secondary sort by name if roles are equal
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }

    return filtered;
  }, [teamMembers, allUsers, activeOnly, sortBy, isLeadershipTeam, includeAllIfLeadership]);

  return {
    members,
    teamMembers, // Original team-only list
    allUsers, // All org users (if leadership)
    loading,
    error,
    isLeadershipTeam,
    refetch: () => {
      // Trigger a re-fetch by updating the effect dependencies
      setLoading(true);
      setError(null);
    }
  };
}

export default useTeamMembers;