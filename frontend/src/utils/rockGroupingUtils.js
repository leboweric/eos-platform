/**
 * Rock Grouping Utilities
 * 
 * Handles different organization methods for quarterly priorities (rocks) display.
 * Supports different EOS facilitation styles within Adaptive Framework Technology.
 */

/**
 * Group rocks based on organization's display preference
 * @param {Array} rocks - Array of rock/priority objects
 * @param {string} preference - Organization preference: 'grouped_by_type' or 'grouped_by_owner'
 * @param {Array} teamMembers - Array of team member objects for owner name lookup
 * @returns {Object} - Grouped rock data with display metadata
 */
export const groupRocksByPreference = (rocks, preference, teamMembers = []) => {
  if (!rocks || rocks.length === 0) {
    return {
      sections: [],
      byOwner: {},
      displayMode: preference === 'grouped_by_type' ? 'type' : 'owner',
      isEmpty: true
    };
  }

  // Create owner lookup map
  const ownerLookup = teamMembers.reduce((acc, member) => {
    acc[member.id] = member.name || member.first_name + ' ' + member.last_name || 'Unknown';
    return acc;
  }, {});

  if (preference === 'grouped_by_type') {
    // Separate into Company Rocks and Individual Rocks
    const companyRocks = rocks.filter(r => r.is_company_priority);
    const individualRocks = rocks.filter(r => !r.is_company_priority);
    
    return {
      sections: [
        { 
          title: 'Company Rocks', 
          rocks: companyRocks,
          type: 'company',
          isEmpty: companyRocks.length === 0
        },
        { 
          title: 'Individual Rocks', 
          rocks: individualRocks,
          type: 'individual',
          isEmpty: individualRocks.length === 0
        }
      ],
      displayMode: 'type',
      isEmpty: false
    };
  } else {
    // Group by owner (default: grouped_by_owner)
    const grouped = rocks.reduce((acc, rock) => {
      const ownerId = rock.owner_id || rock.assignee_id || 'unassigned';
      const rawOwnerName = ownerLookup[ownerId] || rock.ownerName || rock.owner || 'Unassigned';
      
      // 🔍 DEBUG: Log the owner name structure
      console.log('🔍 DEBUG owner name:', {
        ownerId,
        rawOwnerName,
        nameType: typeof rawOwnerName,
        isObject: typeof rawOwnerName === 'object',
        keys: typeof rawOwnerName === 'object' ? Object.keys(rawOwnerName) : null
      });
      
      // Ensure ownerName is always a string
      let ownerName = 'Unassigned';
      if (rawOwnerName) {
        if (typeof rawOwnerName === 'string') {
          ownerName = rawOwnerName;
        } else if (typeof rawOwnerName === 'object') {
          // Handle object case - might be {firstName: 'John', lastName: 'Doe'}
          if (rawOwnerName.name) {
            ownerName = String(rawOwnerName.name);
          } else if (rawOwnerName.firstName || rawOwnerName.lastName) {
            ownerName = `${rawOwnerName.firstName || ''} ${rawOwnerName.lastName || ''}`.trim();
          } else {
            ownerName = String(rawOwnerName);
          }
        } else {
          ownerName = String(rawOwnerName);
        }
      }
      
      if (!acc[ownerId]) {
        acc[ownerId] = {
          id: ownerId,  // Add missing id property for state management
          name: ownerName,
          rocks: [],
          companyRockCount: 0,
          individualRockCount: 0
        };
      }
      
      acc[ownerId].rocks.push(rock);
      
      // Track rock types for badges/statistics
      if (rock.is_company_priority) {
        acc[ownerId].companyRockCount++;
      } else {
        acc[ownerId].individualRockCount++;
      }
      
      return acc;
    }, {});
    
    return {
      byOwner: grouped,
      displayMode: 'owner',
      isEmpty: false
    };
  }
};

/**
 * Sort rocks within their groups based on priority, due date, or alphabetical
 * @param {Array} rocks - Array of rocks to sort
 * @param {string} sortBy - Sort criteria: 'priority', 'due_date', 'alphabetical'
 * @returns {Array} - Sorted array of rocks
 */
export const sortRocks = (rocks, sortBy = 'alphabetical') => {
  if (!rocks || rocks.length === 0) return [];
  
  const sorted = [...rocks];
  
  switch (sortBy) {
    case 'priority':
      // Sort by status (on track first, then off track), then by title
      return sorted.sort((a, b) => {
        const statusA = a.status || 'on_track';
        const statusB = b.status || 'on_track';
        
        if (statusA !== statusB) {
          if (statusA === 'off_track') return 1;
          if (statusB === 'off_track') return -1;
        }
        
        return (a.title || '').localeCompare(b.title || '');
      });
      
    case 'due_date':
      // Sort by due date (earliest first), then by title
      return sorted.sort((a, b) => {
        const dateA = new Date(a.due_date || '9999-12-31');
        const dateB = new Date(b.due_date || '9999-12-31');
        
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA - dateB;
        }
        
        return (a.title || '').localeCompare(b.title || '');
      });
      
    case 'alphabetical':
    default:
      // Sort alphabetically by title
      return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }
};

/**
 * Get section header text based on methodology and display preference
 * @param {string} sectionType - 'company' or 'individual'
 * @param {string} methodology - 'eos', 'okr', '4dx', etc.
 * @returns {string} - Appropriate section header text
 */
export const getSectionHeader = (sectionType, methodology = 'eos') => {
  const headers = {
    eos: {
      company: 'Company Rocks',
      individual: 'Individual Rocks'
    },
    okr: {
      company: 'Company Objectives',
      individual: 'Individual Objectives'
    },
    '4dx': {
      company: 'Company WIGs',
      individual: 'Team WIGs'
    },
    scaling_up: {
      company: 'Company Priorities',
      individual: 'Individual Priorities'
    }
  };
  
  return headers[methodology]?.[sectionType] || headers.eos[sectionType];
};

/**
 * Calculate completion statistics for a group of rocks
 * @param {Array} rocks - Array of rocks to analyze
 * @returns {Object} - Statistics object with counts and percentages
 */
export const calculateRockStats = (rocks) => {
  if (!rocks || rocks.length === 0) {
    return {
      total: 0,
      completed: 0,
      onTrack: 0,
      offTrack: 0,
      notStarted: 0,
      completionPercentage: 0
    };
  }
  
  const stats = rocks.reduce((acc, rock) => {
    acc.total++;
    
    const status = rock.status || 'not_started';
    switch (status) {
      case 'completed':
        acc.completed++;
        break;
      case 'on_track':
        acc.onTrack++;
        break;
      case 'off_track':
        acc.offTrack++;
        break;
      default:
        acc.notStarted++;
    }
    
    return acc;
  }, {
    total: 0,
    completed: 0,
    onTrack: 0,
    offTrack: 0,
    notStarted: 0
  });
  
  stats.completionPercentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  
  return stats;
};

/**
 * Filter rocks based on status or other criteria
 * @param {Array} rocks - Array of rocks to filter
 * @param {Object} filters - Filter criteria object
 * @returns {Array} - Filtered array of rocks
 */
export const filterRocks = (rocks, filters = {}) => {
  if (!rocks || rocks.length === 0) return [];
  
  let filtered = [...rocks];
  
  // Filter by status
  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter(rock => rock.status === filters.status);
  }
  
  // Filter by company vs individual
  if (filters.type && filters.type !== 'all') {
    if (filters.type === 'company') {
      filtered = filtered.filter(rock => rock.is_company_priority);
    } else if (filters.type === 'individual') {
      filtered = filtered.filter(rock => !rock.is_company_priority);
    }
  }
  
  // Filter by owner
  if (filters.ownerId && filters.ownerId !== 'all') {
    filtered = filtered.filter(rock => rock.owner_id === filters.ownerId || rock.assignee_id === filters.ownerId);
  }
  
  // Filter by search term
  if (filters.search && filters.search.trim()) {
    const searchTerm = filters.search.toLowerCase().trim();
    filtered = filtered.filter(rock => 
      (rock.title || '').toLowerCase().includes(searchTerm) ||
      (rock.description || '').toLowerCase().includes(searchTerm)
    );
  }
  
  return filtered;
};