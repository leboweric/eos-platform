import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { Loader2, Users, User } from 'lucide-react';

export function TeamMemberSelect({
  teamId,
  value,
  onValueChange,
  placeholder = "Select team member",
  includeAllIfLeadership = true,
  disabled = false,
  className = "",
  showMemberCount = true,
  allowUnassigned = false,
  unassignedLabel = "Unassigned",
  emptyMessage = "No team members found",
  loadingMessage = "Loading members..."
}) {
  const { members, loading, error, isLeadershipTeam } = useTeamMembers(teamId, {
    includeAllIfLeadership,
    activeOnly: true,
    sortBy: 'name'
  });

  // Defensive check: ensure members is always an array
  const safeMembers = Array.isArray(members) ? members : [];
  
  // Enhanced logging for debugging
  console.log('🎯 TeamMemberSelect render:', {
    teamId,
    loading,
    error,
    membersType: typeof members,
    membersIsArray: Array.isArray(members),
    membersLength: safeMembers.length,
    members: safeMembers,
    isLeadershipTeam
  });

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-gray-50">
        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        <span className="text-sm text-gray-500">{loadingMessage}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-red-200 rounded-lg bg-red-50">
        <Users className="h-4 w-4 text-red-400" />
        <span className="text-sm text-red-600">Failed to load members</span>
      </div>
    );
  }

  if (safeMembers.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-gray-50">
        <Users className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500">{emptyMessage}</span>
      </div>
    );
  }

  // Use sentinel value for unassigned/empty selection
  const selectValue = value || (allowUnassigned ? 'unassigned-member' : 'member-select-default');

  return (
    <div className="space-y-1">
      <Select
        value={selectValue}
        onValueChange={(newValue) => {
          // Convert sentinel values back to null
          if (newValue === 'unassigned-member' || newValue === 'member-select-default') {
            onValueChange(null);
          } else {
            onValueChange(newValue);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {/* Show team context indicator */}
          {isLeadershipTeam && includeAllIfLeadership && (
            <div className="px-2 py-1.5 text-xs text-gray-500 bg-blue-50 border-b">
              Showing all organization members
            </div>
          )}
          {!isLeadershipTeam && teamId && (
            <div className="px-2 py-1.5 text-xs text-gray-500 bg-gray-50 border-b">
              Team members only
            </div>
          )}
          
          {/* Optional unassigned option */}
          {allowUnassigned && (
            <>
              <SelectItem value="unassigned-member">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200">
                    <User className="h-3 w-3 text-gray-500" />
                  </div>
                  <span className="text-gray-600">{unassignedLabel}</span>
                </div>
              </SelectItem>
              <div className="h-px bg-gray-200 my-1" />
            </>
          )}
          
          {/* Default/placeholder option for required fields */}
          {!allowUnassigned && !value && (
            <SelectItem value="member-select-default" disabled>
              <span className="text-gray-400">{placeholder}</span>
            </SelectItem>
          )}
          
          {/* Member list */}
          {safeMembers.map((member, index) => {
            // Defensive checks for member object
            if (!member || typeof member !== 'object') {
              console.warn('⚠️ Invalid member object at index', index, ':', member);
              return null;
            }
            
            const memberId = member.id || member.user_id || `member-${index}`;
            const firstName = member.first_name || member.firstName || '';
            const lastName = member.last_name || member.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim();
            const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
            
            // Skip members without valid ID
            if (!memberId || memberId === `member-${index}`) {
              console.warn('⚠️ Member without valid ID at index', index, ':', member);
              return null;
            }
            
            return (
              <SelectItem key={memberId} value={memberId}>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-medium">
                    {initials || '??'}
                  </div>
                  <span>{fullName || 'Unknown User'}</span>
                  {member.role === 'admin' && (
                    <span className="text-xs text-gray-500 ml-1">(Admin)</span>
                  )}
                </div>
              </SelectItem>
            );
          }).filter(Boolean)}
        </SelectContent>
      </Select>
      
      {/* Show member count */}
      {showMemberCount && (
        <p className="text-xs text-gray-500">
          {safeMembers.length} member{safeMembers.length !== 1 ? 's' : ''} available
          {isLeadershipTeam && includeAllIfLeadership && ' (all organization)'}
        </p>
      )}
    </div>
  );
}

export default TeamMemberSelect;