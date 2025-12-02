import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { useAuthStore } from '../../stores/authStore';
import { organizationService } from '../../services/organizationService';
import { getOrgTheme, saveOrgTheme, hexToRgba } from '../../utils/themeUtils';
import { debugTheme } from '../../utils/debugTheme';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Edit,
  User,
  Calendar,
  Paperclip,
  ArrowRight,
  ThumbsUp,
  Clock,
  Archive,
  AlertCircle,
  CheckCircle,
  Users,
  MessageSquare,
  Plus,
  ListTodo,
  Send,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  List,
  GripVertical,
  Newspaper,
  ChevronRight,
  ChevronDown,
  Check
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { IssueContextMenu } from '../IssueContextMenu';
import { issuesService } from '../../services/issuesService';
import IssueDialog from './IssueDialog';

const IssuesListClean = ({ 
  issues, 
  onEdit, 
  onStatusChange, 
  onTimelineChange, 
  onArchive,
  onVote,
  onMoveToTeam,
  onCreateTodo,
  onCreateHeadline,
  onSendCascadingMessage,
  onMarkSolved,  // New prop for marking issues as solved
  onReorder,  // New prop for handling reordering
  onSave,  // Callback for saving issue changes
  tableView = false,  // New prop to control table vs card view
  teamMembers = [],  // Team members for assignment
  getStatusColor, 
  getStatusIcon, 
  readOnly = false, 
  showVoting = false,
  enableDragDrop = false,  // New prop to enable drag-and-drop
  compactGrid = false,  // New prop for compact grid view in meetings
  maxColumns = 3,  // Maximum number of columns for list view
  columnBreakpoint = 20,  // Number of items before adding another column
  onConvertToRock,  // Function to convert issue to Rock (for Quarterly Planning Meeting)
  isQuarterlyMeeting = false  // Flag to indicate if this is being used in Quarterly Planning Meeting
}) => {
  const { user } = useAuthStore();
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [issueUpdates, setIssueUpdates] = useState([]);
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [sortedIssues, setSortedIssues] = useState(issues);
  const [showListView, setShowListView] = useState(() => {
    // If in compact grid mode, ignore saved preference
    if (compactGrid) return false;
    // Otherwise check localStorage, defaulting to list view
    const savedMode = localStorage.getItem('issuesViewMode');
    // Default to list view if no saved preference or if set to list
    return !savedMode || savedMode === 'list';
  });
  const [draggedIssue, setDraggedIssue] = useState(null);
  const [draggedIssueIndex, setDraggedIssueIndex] = useState(null);
  const [dragOverIssueIndex, setDragOverIssueIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState({});  // Track which grouped issues are expanded

  // Helper function to extract days overdue from issue description
  const getDaysOverdue = (issue) => {
    if (!issue.description) return 0;
    const match = issue.description.match(/(\d+)\s*days?\s*overdue/i);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Helper function to group overdue issues by title
  const groupOverdueIssues = (issuesList) => {
    const groups = {};
    const result = [];

    issuesList.forEach(issue => {
      // Only group auto-created overdue issues (title starts with "Overdue:")
      if (issue.title?.startsWith('Overdue:')) {
        const baseTitle = issue.title;
        if (!groups[baseTitle]) {
          groups[baseTitle] = {
            primaryIssue: issue,
            relatedIssues: [issue],
            maxDaysOverdue: getDaysOverdue(issue)
          };
        } else {
          groups[baseTitle].relatedIssues.push(issue);
          // Update primary issue to the one with most days overdue
          const daysOverdue = getDaysOverdue(issue);
          if (daysOverdue > groups[baseTitle].maxDaysOverdue) {
            groups[baseTitle].maxDaysOverdue = daysOverdue;
            groups[baseTitle].primaryIssue = issue;
          }
        }
      } else {
        // Non-overdue issues go directly to result
        result.push({ type: 'single', issue });
      }
    });

    // Add grouped issues to result
    Object.keys(groups).forEach(title => {
      const group = groups[title];
      if (group.relatedIssues.length > 1) {
        // Multiple issues with same title - create a group
        result.push({
          type: 'group',
          primaryIssue: group.primaryIssue,
          relatedIssues: group.relatedIssues,
          groupKey: title,
          ownerCount: group.relatedIssues.length
        });
      } else {
        // Single issue - treat as regular
        result.push({ type: 'single', issue: group.primaryIssue });
      }
    });

    return result;
  };

  // Sort issues whenever issues prop or sort settings change
  useEffect(() => {
    // If drag-drop is enabled AND no sort field is selected, use backend order (manual_sort + created_at DESC)
    if (enableDragDrop && !sortField) {
      // Backend already provides correct order: manual_sort DESC, priority_rank ASC (for manual), created_at DESC
      setSortedIssues([...(issues || [])]);
      return;
    }

    const sorted = [...(issues || [])].sort((a, b) => {
      if (!sortField) return 0;

      let aValue, bValue;

      if (sortField === 'owner') {
        aValue = (a.owner_name || 'zzz').toLowerCase();
        bValue = (b.owner_name || 'zzz').toLowerCase();
      } else if (sortField === 'created') {
        aValue = a.created_at || '9999-12-31';
        bValue = b.created_at || '9999-12-31';
      } else if (sortField === 'title') {
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
      } else if (sortField === 'status') {
        aValue = a.status || 'zzz';
        bValue = b.status || 'zzz';
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setSortedIssues(sorted);
  }, [issues, sortField, sortDirection, enableDragDrop]);

  // Compute grouped issues for display
  const groupedIssuesForDisplay = groupOverdueIssues(sortedIssues);

  // Toggle group expansion
  const toggleGroupExpand = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Fetch updates when an issue is selected
  useEffect(() => {
    if (selectedIssue) {
      fetchIssueUpdates(selectedIssue.id);
    } else {
      setIssueUpdates([]);
      setShowAddUpdate(false);
      setUpdateText('');
    }
  }, [selectedIssue]);
  
  useEffect(() => {
    fetchOrganizationTheme();
    
    // Listen for theme changes
    const handleThemeChange = (event) => {
      console.log('🎨 Theme change event received:', event.detail);
      setThemeColors(event.detail);
    };
    
    // Listen for organization changes
    const handleOrgChange = () => {
      console.log('🎨 Organization change event received');
      fetchOrganizationTheme();
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    window.addEventListener('organizationChanged', handleOrgChange);
    
    // Run debug after component renders
    setTimeout(() => {
      console.log('🎨 Running theme debug after render...');
      debugTheme();
    }, 500);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
      window.removeEventListener('organizationChanged', handleOrgChange);
    };
  }, [user?.organizationId, user?.organization_id]);
  
  const fetchOrganizationTheme = async () => {
    console.log('🎨 IssuesListClean - Starting theme fetch');
    console.log('🎨 Current user:', user);
    console.log('🎨 Current localStorage:', {
      organizationId: localStorage.getItem('organizationId'),
      allThemeKeys: Object.keys(localStorage).filter(k => k.includes('theme') || k.includes('Theme'))
    });
    
    try {
      const orgId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
      console.log('🎨 Using orgId:', orgId);
      
      // Check what's in cache first
      const cachedTheme = getOrgTheme(orgId);
      console.log('🎨 Cached theme for org:', cachedTheme);
      
      // Show all theme-related localStorage items
      Object.keys(localStorage).forEach(key => {
        if (key.includes('theme') || key.includes('Theme')) {
          console.log(`🎨 localStorage[${key}]:`, localStorage.getItem(key));
        }
      });
      
      // Always fetch fresh theme data to avoid stale cache
      console.log('🎨 Fetching from API...');
      const orgData = await organizationService.getOrganization();
      console.log('🎨 API Response:', orgData);
      
      if (orgData) {
        const theme = {
          primary: orgData.theme_primary_color || '#3B82F6',
          secondary: orgData.theme_secondary_color || '#1E40AF',
          accent: orgData.theme_accent_color || '#60A5FA'
        };
        console.log('🎨 IssuesListClean - Setting theme colors:', theme, 'for org:', orgId);
        console.log('🎨 Theme will be applied - primary:', theme.primary, 'accent:', theme.accent);
        setThemeColors(theme);
        saveOrgTheme(orgId, theme);
        
        // Log what was actually saved
        console.log('🎨 Saved to localStorage key:', `orgTheme_${orgId}`);
        console.log('🎨 Saved value:', localStorage.getItem(`orgTheme_${orgId}`));
      } else {
        console.log('🎨 No org data from API, using cached theme');
        // Fallback to cached theme if API fails
        const savedTheme = getOrgTheme(orgId);
        if (savedTheme) {
          console.log('🎨 IssuesListClean - Using cached theme:', savedTheme);
          setThemeColors(savedTheme);
        }
      }
    } catch (error) {
      console.error('🎨 Failed to fetch organization theme:', error);
      // Try to use cached theme on error
      const orgId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
      const savedTheme = getOrgTheme(orgId);
      console.log('🎨 Error fallback - cached theme:', savedTheme);
      if (savedTheme) {
        setThemeColors(savedTheme);
      }
    }
  };

  const fetchIssueUpdates = async (issueId) => {
    try {
      setLoadingUpdates(true);
      const response = await issuesService.getIssueUpdates(issueId);
      setIssueUpdates(response.data || []);
    } catch (error) {
      console.error('Failed to fetch issue updates:', error);
      setIssueUpdates([]);
    } finally {
      setLoadingUpdates(false);
    }
  };

  const handleAddUpdate = async () => {
    if (!updateText.trim() || !selectedIssue) return;
    
    try {
      setSavingUpdate(true);
      const response = await issuesService.addIssueUpdate(selectedIssue.id, updateText);
      setIssueUpdates([response.data, ...issueUpdates]);
      setUpdateText('');
      setShowAddUpdate(false);
    } catch (error) {
      console.error('Failed to add update:', error);
    } finally {
      setSavingUpdate(false);
    }
  };

  const handleDeleteUpdate = async (updateId) => {
    if (!selectedIssue || !confirm('Are you sure you want to delete this update?')) return;
    
    try {
      await issuesService.deleteIssueUpdate(selectedIssue.id, updateId);
      setIssueUpdates(issueUpdates.filter(u => u.id !== updateId));
    } catch (error) {
      console.error('Failed to delete update:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, issue, index) => {
    setDraggedIssue(issue);
    setDraggedIssueIndex(index);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedIssue(null);
    setDraggedIssueIndex(null);
    setDragOverIssueIndex(null);
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    setDragOverIssueIndex(index);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOverIssueIndex(null);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 handleDrop called:', { draggedIssueIndex, dropIndex, draggedIssue: draggedIssue?.title });
    setDragOverIssueIndex(null);

    if (draggedIssueIndex === null || draggedIssueIndex === dropIndex || !draggedIssue) {
      console.log('⚠️ Drop cancelled:', { draggedIssueIndex, dropIndex, hasDraggedIssue: !!draggedIssue });
      return;
    }

    // If there's a sort applied, clear it to preserve manual order
    if (sortField) {
      setSortField(null);
      setSortDirection('asc');
    }

    // Create new order array
    const newOrder = [...sortedIssues];
    const [movedIssue] = newOrder.splice(draggedIssueIndex, 1);
    newOrder.splice(dropIndex, 0, movedIssue);

    // Update display order for all affected issues
    const updatedIssues = newOrder.map((issue, index) => ({
      ...issue,
      priority_rank: index
    }));

    // Update local state immediately for optimistic UI
    setSortedIssues(updatedIssues);
    
    // Reset drag state
    setDraggedIssue(null);
    setDraggedIssueIndex(null);

    // Call the onReorder callback if provided
    if (onReorder) {
      console.log('✅ Calling onReorder with', updatedIssues.length, 'issues');
      try {
        await onReorder(updatedIssues);
        console.log('✅ onReorder completed successfully');
      } catch (error) {
        console.error('❌ Failed to reorder issues:', error);
        // Revert on error
        setSortedIssues(sortedIssues);
      }
    } else {
      console.warn('⚠️ onReorder callback not provided');
    }
  };
  
  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3" />
      : <ArrowDown className="h-3 w-3" />;
  };

  // Compact card component for grid view
  const CompactIssueCard = ({ issue, index }) => {
    const hasVotes = (issue.vote_count || 0) > 0;
    const isTopIssue = index === 0 && hasVotes && showVoting;
    const isDragOver = dragOverIssueIndex === index;
    const isTopThree = index < 3;  // Always highlight top 3 issues
    
    return (
      <div
        className={`
          group relative backdrop-blur-sm rounded-2xl border transition-shadow duration-200 cursor-pointer h-full shadow-sm hover:shadow-xl
          ${issue.status === 'closed' ? 'opacity-60' : ''}
          ${isTopThree ? 'shadow-lg' : ''}
          ${isDragOver ? 'ring-2 ring-blue-400' : ''}
          ${draggedIssueIndex === index ? 'opacity-50' : ''}
        `}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderColor: hexToRgba(themeColors.accent, 0.3)
        }}
        onDragOver={handleDragOver}
        onDragEnter={(e) => handleDragEnter(e, index)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, index)}
        onMouseEnter={(e) => {
          if (issue.status !== 'closed') {
            e.currentTarget.style.borderColor = hexToRgba(themeColors.accent, 0.6);
          }
        }}
        onMouseLeave={(e) => {
          if (issue.status !== 'closed') {
            e.currentTarget.style.borderColor = hexToRgba(themeColors.accent, 0.3);
          }
        }}
        onClick={(e) => {
          // Open modal unless clicking on drag handle or interactive elements
          if (!e.target.closest('.drag-handle') && !e.target.closest('button') && !e.target.closest('input')) {
            setSelectedIssue(issue);
          }
        }}
      >
        {/* Enhanced status indicator with top 3 highlighting */}
        <div 
          className={`absolute left-0 top-0 bottom-0 rounded-l-2xl ${
            isTopThree ? 'w-1.5' : 'w-1'
          }`}
          style={{ 
            background: isTopThree 
              ? '#3B82F6'  // Blue for top 3
              : issue.status === 'open' 
                ? `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)` 
                : 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
          }}
        />
        
        <div className="p-4 pl-5">
          {/* Header with number and checkbox */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              {enableDragDrop && !readOnly && (
                <div 
                  className="drag-handle cursor-move p-1 -m-1 hover:bg-gray-100 rounded"
                  draggable="true"
                  onDragStart={(e) => {
                    handleDragStart(e, issue, index);
                  }}
                  onDragEnd={handleDragEnd}
                >
                  <GripVertical className="h-4 w-4 text-gray-400" />
                </div>
              )}
              {showVoting && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVote(issue.id, !issue.user_has_voted);
                  }}
                  className="h-4 px-1 py-0 hover:bg-gray-100"
                  style={{
                    color: issue.user_has_voted ? themeColors.primary : '#9CA3AF'
                  }}
                >
                  <ThumbsUp className={`h-3 w-3 ${issue.user_has_voted ? 'fill-current' : ''}`} />
                  {(issue.vote_count || 0) > 0 && (
                    <span className="ml-0.5 text-xs font-medium">{issue.vote_count}</span>
                  )}
                </Button>
              )}
            </div>
            <div className="relative">
              <input 
                type="checkbox" 
                checked={issue.status === 'closed'}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  onStatusChange(issue.id, e.target.checked ? 'closed' : 'open');
                }}
                className="w-6 h-6 rounded border-2"
                style={{
                  accentColor: themeColors.primary
                }}
              />
            </div>
          </div>
          
          {/* Title - truncated */}
          <h3 className={`
            text-sm font-medium leading-tight mb-2 line-clamp-2
            ${issue.status === 'closed' ? 'text-gray-400 line-through' : 'text-gray-900'}
          `}>
            {issue.title}
          </h3>
          
          {/* Bottom info - very compact */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 truncate max-w-[120px]">
              {issue.owner_name || 'Unassigned'}
            </span>
            {issue.attachment_count > 0 && (
              <div className="flex items-center text-gray-400" title={`${issue.attachment_count} attachment${issue.attachment_count > 1 ? 's' : ''}`}>
                <Paperclip className="h-3 w-3" />
                {issue.attachment_count > 1 && (
                  <span className="text-xs ml-0.5">{issue.attachment_count}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Enhanced Sorting header with drag-and-drop indicator */}
      <div className="mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
          {enableDragDrop && !sortField && (
            <div className="flex items-center gap-2 mr-4">
              <GripVertical className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-600">Drag to reorder</span>
              <span className="text-xs text-gray-400 mx-2">|</span>
            </div>
          )}
          {sortField && enableDragDrop && (
            <div className="flex items-center gap-2 mr-4">
              <span className="text-xs font-medium text-yellow-600">⚠️ Sorting overrides manual order</span>
              <span className="text-xs text-gray-400 mx-2">|</span>
            </div>
          )}
          <span className="text-xs font-medium text-gray-600 mr-2">Sort by:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('title')}
            className={`h-7 px-3 py-1 text-xs font-medium hover:bg-gray-200 ${sortField === 'title' ? 'bg-gray-200 text-gray-900' : 'text-gray-600'}`}
          >
            Title {getSortIcon('title')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('owner')}
            className={`h-7 px-3 py-1 text-xs font-medium hover:bg-gray-200 ${sortField === 'owner' ? 'bg-gray-200 text-gray-900' : 'text-gray-600'}`}
          >
            Owner {getSortIcon('owner')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('created')}
            className={`h-7 px-3 py-1 text-xs font-medium hover:bg-gray-200 ${sortField === 'created' ? 'bg-gray-200 text-gray-900' : 'text-gray-600'}`}
          >
            Created {getSortIcon('created')}
          </Button>
          {sortField && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSortField(null);
                setSortDirection('asc');
              }}
              className="h-7 px-3 py-1 ml-2 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              ✕ Clear
            </Button>
          )}
          </div>
          
        </div>
      </div>
      
      {/* Render based on view type */}
      {compactGrid ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sortedIssues.map((issue, index) => (
            <CompactIssueCard key={issue.id} issue={issue} index={index} />
          ))}
        </div>
      ) : tableView ? (
        // Table view - EXACT COPY from Level 10 Meeting WeeklyAccountabilityMeetingPage.jsx lines 5883-5885
        <Card className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-0">
            {enableDragDrop && (
              <div className="px-3 pt-3 pb-2">
                <p className="text-sm text-slate-600">
                  <GripVertical className="h-4 w-4 inline mr-2 text-slate-400" />
                  Drag to reorder by priority
                </p>
              </div>
            )}
            <div className="space-y-1">
            {/* Header Row - EXACT ORDER: Drag, Status, #, Issue, Owner, Created */}
            <div className="flex items-center px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
              {enableDragDrop && <div className="w-8 mr-2">Drag</div>}
              <div className="w-12">Status</div>
              <div className="w-8 ml-2">#</div>
              <div className="flex-1 ml-3">Issue</div>
              <div className="w-32 text-center">Owner</div>
              <div className="w-24 text-center">Created</div>
            </div>
            
            {/* Issue Rows - With grouping support for overdue issues */}
            {groupedIssuesForDisplay.map((item, index) => {
              // Handle grouped issues
              if (item.type === 'group') {
                const { primaryIssue, relatedIssues, groupKey, ownerCount } = item;
                const isGroupExpanded = expandedGroups[groupKey];
                const allSolved = relatedIssues.every(i => i.status === 'closed' || i.status === 'solved');

                return (
                  <div key={groupKey} className="border-b border-slate-100 last:border-0">
                    {/* Group Header Row */}
                    <div
                      className="flex items-center px-3 py-3 group cursor-pointer hover:bg-orange-50 transition-colors"
                      style={{
                        borderLeftWidth: '4px',
                        borderLeftColor: '#F97316', // Orange for grouped overdue
                        borderLeftStyle: 'solid',
                        backgroundColor: isGroupExpanded ? 'rgb(255 247 237)' : undefined
                      }}
                      onClick={() => toggleGroupExpand(groupKey)}
                    >
                      {/* Expand/Collapse Icon */}
                      <div className="w-8 mr-2 flex items-center justify-center">
                        {isGroupExpanded ? (
                          <ChevronDown className="h-4 w-4 text-orange-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-orange-500" />
                        )}
                      </div>

                      {/* Status - Show check only if ALL are solved */}
                      <div className="w-12 flex items-center relative">
                        <div
                          className="flex items-center justify-center w-7 h-7 rounded-full"
                          style={{
                            backgroundColor: allSolved ? themeColors.primary + '20' : 'transparent',
                            border: `2px solid ${allSolved ? themeColors.primary : '#E2E8F0'}`
                          }}
                        >
                          {allSolved && <CheckCircle className="h-4 w-4" style={{ color: themeColors.primary }} />}
                        </div>
                      </div>

                      {/* Issue Number */}
                      <div className="w-8 ml-2 text-sm font-medium text-slate-600">
                        {index + 1}.
                      </div>

                      {/* Issue Title with Owner Count Badge */}
                      <div className="flex-1 ml-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-slate-900 leading-tight ${allSolved ? 'line-through opacity-75' : ''}`}>
                            {primaryIssue.title}
                          </span>
                          <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {ownerCount} owners
                          </Badge>
                        </div>
                      </div>

                      {/* Owner - Show "Multiple" */}
                      <div className="w-32 text-center">
                        <span className="text-sm text-orange-600 font-medium">
                          {ownerCount} people
                        </span>
                      </div>

                      {/* Created Date */}
                      <div className="w-24 text-center">
                        <span className="text-xs text-slate-500">
                          {format(new Date(primaryIssue.created_at), 'MMM d')}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="w-8" />
                    </div>

                    {/* Expanded Group Members */}
                    {isGroupExpanded && (
                      <div className="bg-orange-50/50 border-l-4 border-orange-200 ml-4">
                        {relatedIssues.map((issue, subIndex) => {
                          const isSolved = issue.status === 'solved' || issue.status === 'completed' || issue.status === 'closed' || issue.status === 'resolved';

                          return (
                            <IssueContextMenu
                              key={issue.id}
                              issue={issue}
                              onEdit={onEdit}
                              onMarkSolved={(issue) => onStatusChange && onStatusChange(issue.id, 'closed')}
                              onCreateTodo={onCreateTodo}
                              onVote={onVote ? (issue) => onVote(issue.id, !issue.user_has_voted) : undefined}
                              onMoveToLongTerm={issue.timeline === 'short_term' && onTimelineChange ? (issue) => onTimelineChange(issue.id, 'long_term') : undefined}
                              onMoveToShortTerm={issue.timeline === 'long_term' && onTimelineChange ? (issue) => onTimelineChange(issue.id, 'short_term') : undefined}
                              onArchive={onArchive ? (issue) => onArchive(issue.id) : undefined}
                              currentUserId={user?.id}
                            >
                              <div className="flex items-center px-3 py-2 group hover:bg-orange-100/50 transition-colors border-b border-orange-100 last:border-0">
                                {/* Indent spacer */}
                                <div className="w-8 mr-2" />

                                {/* Status Checkbox */}
                                <div className="w-12 flex items-center relative">
                                  <div
                                    className="flex items-center justify-center w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform"
                                    style={{
                                      backgroundColor: isSolved ? themeColors.primary + '20' : 'transparent',
                                      border: `2px solid ${isSolved ? themeColors.primary : '#E2E8F0'}`
                                    }}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        const newStatus = isSolved ? 'open' : 'closed';
                                        await onStatusChange(issue.id, newStatus);
                                      } catch (error) {
                                        console.error('Failed to update issue status:', error);
                                      }
                                    }}
                                  >
                                    {isSolved && <CheckCircle className="h-3 w-3" style={{ color: themeColors.primary }} />}
                                  </div>
                                </div>

                                {/* Sub-number */}
                                <div className="w-8 ml-2 text-xs text-slate-400">
                                  {index + 1}.{subIndex + 1}
                                </div>

                                {/* Title (smaller) */}
                                <div className="flex-1 ml-3">
                                  <span
                                    className={`text-sm text-slate-700 cursor-pointer hover:text-blue-600 ${isSolved ? 'line-through opacity-75' : ''}`}
                                    onClick={() => onEdit && onEdit(issue)}
                                  >
                                    {getDaysOverdue(issue)} days overdue
                                  </span>
                                </div>

                                {/* Owner */}
                                <div className="w-32 text-center">
                                  <span className="text-sm text-slate-600">
                                    {issue.owner_name || 'Unassigned'}
                                  </span>
                                </div>

                                {/* Created */}
                                <div className="w-24 text-center">
                                  <span className="text-xs text-slate-500">
                                    {format(new Date(issue.created_at), 'MMM d')}
                                  </span>
                                </div>

                                {/* Edit button */}
                                <div className="w-8 flex items-center justify-center">
                                  <button
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 rounded"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEdit && onEdit(issue);
                                    }}
                                  >
                                    <Edit className="h-3 w-3 text-slate-600" />
                                  </button>
                                </div>
                              </div>
                            </IssueContextMenu>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Handle single issues (non-grouped)
              const issue = item.issue;
              const isSolved = issue.status === 'solved' || issue.status === 'completed' || issue.status === 'closed' || issue.status === 'resolved';
              const isTopThree = index < 3;  // Top 3 issues get blue border

              return (
                <IssueContextMenu
                  key={issue.id}
                  issue={issue}
                  onEdit={onEdit}
                  onMarkSolved={(issue) => onStatusChange && onStatusChange(issue.id, 'closed')}
                  onCreateTodo={onCreateTodo}
                  onVote={onVote ? (issue) => onVote(issue.id, !issue.user_has_voted) : undefined}
                  onMoveToLongTerm={issue.timeline === 'short_term' && onTimelineChange ? (issue) => onTimelineChange(issue.id, 'long_term') : undefined}
                  onMoveToShortTerm={issue.timeline === 'long_term' && onTimelineChange ? (issue) => onTimelineChange(issue.id, 'short_term') : undefined}
                  onArchive={onArchive ? (issue) => onArchive(issue.id) : undefined}
                  currentUserId={user?.id}
                >
                  <div
                    className="border-b border-slate-100 last:border-0 cursor-context-menu hover:bg-gray-50 transition-colors rounded"
                    style={{
                      borderLeftWidth: isTopThree ? '4px' : '0px',
                      borderLeftColor: isTopThree ? '#3B82F6' : 'transparent',
                      borderLeftStyle: 'solid'
                    }}
                  >
                      {/* Main Issue Row */}
                      <div
                        className={`flex items-center px-3 py-3 group ${
                          draggedIssueIndex === index ? 'opacity-50' : ''
                        } ${dragOverIssueIndex === index ? 'ring-2 ring-blue-400' : ''}`}
                        onDragOver={enableDragDrop ? handleDragOver : undefined}
                        onDragEnter={enableDragDrop ? (e) => handleDragEnter(e, index) : undefined}
                        onDragLeave={enableDragDrop ? handleDragLeave : undefined}
                        onDrop={enableDragDrop ? (e) => handleDrop(e, index) : undefined}
                      >
                        {/* Drag Handle */}
                        {enableDragDrop && (
                          <div
                            className="w-8 mr-2 flex items-center justify-center cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, issue, index)}
                            onDragEnd={handleDragEnd}
                          >
                            <GripVertical className="h-4 w-4 text-slate-400" />
                          </div>
                        )}

                        {/* Status Checkbox */}
                        <div className="w-12 flex items-center relative">
                          <div
                            className="flex items-center justify-center w-7 h-7 rounded-full cursor-pointer hover:scale-110 transition-transform"
                            style={{
                              backgroundColor: isSolved ? themeColors.primary + '20' : 'transparent',
                              border: `2px solid ${isSolved ? themeColors.primary : '#E2E8F0'}`
                            }}
                            onClick={async () => {
                              try {
                                const newStatus = isSolved ? 'open' : 'closed';
                                await onStatusChange(issue.id, newStatus);
                              } catch (error) {
                                console.error('Failed to update issue status:', error);
                              }
                            }}
                          >
                            {isSolved && <CheckCircle className="h-4 w-4" style={{ color: themeColors.primary }} />}
                          </div>
                        </div>

                        {/* Issue Number */}
                        <div className="w-8 ml-2 text-sm font-medium text-slate-600">
                          {index + 1}.
                        </div>

                        {/* Issue Title */}
                        <div className="flex-1 ml-3">
                          <div className="flex items-center">
                            <div
                              className={`flex-1 font-semibold text-slate-900 leading-tight cursor-pointer hover:text-blue-600 transition-colors ${
                                isSolved ? 'line-through opacity-75' : ''
                              }`}
                              onClick={() => onEdit && onEdit(issue)}
                            >
                              {issue.title}
                              {issue.attachment_count > 0 && (
                                <>
                                  <Paperclip className="h-4 w-4 inline ml-2 text-slate-400" />
                                  <span className="text-xs text-slate-400 ml-1">{issue.attachment_count}</span>
                                </>
                              )}
                            </div>
                            {issue.description && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedIssue(selectedIssue?.id === issue.id ? null : issue);
                                }}
                                className="ml-2 p-1 hover:bg-slate-100 rounded transition-colors"
                              >
                                <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${selectedIssue?.id === issue.id ? 'rotate-90' : ''}`} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Owner */}
                        <div className="w-32 text-center">
                          <span className="text-sm text-slate-600">
                            {issue.owner_name || issue.assignee_name || issue.assigned_to_name || 'Unassigned'}
                          </span>
                        </div>

                        {/* Created Date */}
                        <div className="w-24 text-center">
                          <span className="text-xs text-slate-500">
                            {format(new Date(issue.created_at), 'MMM d')}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="w-8 flex items-center justify-center">
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 rounded"
                            onClick={() => onEdit && onEdit(issue)}
                          >
                            <Edit className="h-3 w-3 text-slate-600" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedIssue?.id === issue.id && issue.description && (
                        <div className="px-16 pb-3">
                          <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded border-l-4" style={{ borderLeftColor: themeColors.primary }}>
                            {issue.description}
                          </div>
                        </div>
                      )}
                    </div>
                </IssueContextMenu>
              );
            })}
            </div>
          </CardContent>
        </Card>
      ) : (
        // Default view - List or Grid based on showListView
        (() => {
          if (showListView) {
            // Pagination logic
            const issueCount = sortedIssues.length;
            const totalPages = Math.ceil(issueCount / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, issueCount);
            const paginatedIssues = sortedIssues.slice(startIndex, endIndex);
            
            // Single column for paginated view
            const columns = [paginatedIssues];
            
            return (
              <>
              <div className="grid gap-4 grid-cols-1">
                {columns.map((columnIssues, colIndex) => (
                  <div key={colIndex} className="space-y-2">
                    {columnIssues.map((issue) => {
                      const globalIndex = sortedIssues.findIndex(i => i.id === issue.id);
                      const hasVotes = (issue.vote_count || 0) > 0;
                      const isTopIssue = globalIndex === 0 && hasVotes && showVoting;
                      const isDragOver = dragOverIssueIndex === globalIndex;
                      const isTopThree = globalIndex < 3;  // Always highlight top 3 issues
                      
                      return (
                        <ContextMenu key={issue.id}>
                          <ContextMenuTrigger>
                            <div
                              className={`
                                issue-card group relative flex items-center gap-3 bg-white border border-gray-200 rounded-lg pl-4 pr-4 py-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5
                                ${issue.status === 'closed' ? 'opacity-60' : ''}
                                ${isDragOver ? 'ring-2 ring-blue-400' : ''}
                                ${draggedIssueIndex === globalIndex ? 'opacity-50' : ''}
                              `}
                              style={{ 
                                borderLeftColor: isTopThree ? '#3B82F6' : themeColors.primary, 
                                borderLeftWidth: isTopThree ? '4px' : '3px' 
                              }}
                              onDragOver={handleDragOver}
                              onDragEnter={(e) => handleDragEnter(e, globalIndex)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, globalIndex)}
                              onClick={(e) => {
                                // Open modal unless clicking on drag handle or interactive elements
                                if (!e.target.closest('.drag-handle') && !e.target.closest('button') && !e.target.closest('input')) {
                                  setSelectedIssue(issue);
                                }
                              }}
                            >
                
                {/* Drag handle */}
                {enableDragDrop && !readOnly && (
                  <div 
                    className="drag-handle cursor-move p-1 -m-1 hover:bg-gray-100 rounded flex-shrink-0"
                    draggable="true"
                    onDragStart={(e) => {
                      handleDragStart(e, issue, globalIndex);
                    }}
                    onDragEnd={handleDragEnd}
                  >
                    <GripVertical className="h-4 w-4 text-gray-400" />
                  </div>
                )}
                
                {/* Enhanced checkbox */}
                <div className="relative">
                  <input 
                    type="checkbox" 
                    checked={issue.status === 'closed'}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      onStatusChange(issue.id, e.target.checked ? 'closed' : 'open');
                    }}
                    className="w-6 h-6 rounded border-2"
                    style={{
                      accentColor: themeColors.primary
                    }}
                  />
                </div>
                
                {/* Title and metadata */}
                <div className="flex-1">
                  <h4 className={`
                    text-base font-semibold text-gray-900 mb-1
                    ${issue.status === 'closed' ? 'text-gray-400 line-through' : ''}
                  `}>
                    {issue.title}
                  </h4>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {issue.owner_name || 'Unassigned'}
                    </span>
                    {issue.created_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(issue.created_at), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>
                
                
                {/* Votes (if voting enabled) */}
                {showVoting && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onVote(issue.id, !issue.user_has_voted)}
                      className="h-6 px-2 py-0 hover:bg-gray-100"
                      style={{
                        color: issue.user_has_voted ? themeColors.primary : '#9CA3AF'
                      }}
                    >
                      <ThumbsUp className={`h-3 w-3 ${issue.user_has_voted ? 'fill-current' : ''}`} />
                      {(issue.vote_count || 0) > 0 && (
                        <span className="ml-1 text-xs font-medium">{issue.vote_count}</span>
                      )}
                    </Button>
                  </div>
                )}
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent className="w-56">
                            {/* Edit */}
                            <ContextMenuItem onClick={() => onEdit?.(issue)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Issue
                            </ContextMenuItem>
                            
                            {/* Create Linked Todo */}
                            {onCreateTodo && (
                              <ContextMenuItem onClick={() => onCreateTodo({
                                ...issue,
                                due_date: format(addDays(new Date(), 7), 'yyyy-MM-dd')
                              })}>
                                <ListTodo className="mr-2 h-4 w-4" />
                                Create Linked To-Do
                              </ContextMenuItem>
                            )}
                            
                            {/* Create Linked Headline */}
                            {onCreateHeadline && (
                              <ContextMenuItem onClick={() => onCreateHeadline(issue)}>
                                <Newspaper className="mr-2 h-4 w-4" />
                                Create Linked Headline
                              </ContextMenuItem>
                            )}
                            
                            <ContextMenuSeparator />
                            
                            {/* Vote */}
                            {onVote && (
                              <ContextMenuItem onClick={() => onVote(issue.id, !issue.user_has_voted)}>
                                <ThumbsUp className={`mr-2 h-4 w-4 ${issue.user_has_voted ? 'text-blue-600' : ''}`} />
                                {issue.user_has_voted ? 'Remove Vote' : 'Vote on Issue'}
                              </ContextMenuItem>
                            )}
                            
                            {/* Mark Solved */}
                            {onMarkSolved && issue.status !== 'closed' && (
                              <ContextMenuItem onClick={() => onMarkSolved(issue)}>
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                Mark Solved
                              </ContextMenuItem>
                            )}
                            
                            <ContextMenuSeparator />
                            
                            {/* Move to Long-Term */}
                            {issue.timeline === 'short_term' && onTimelineChange && (
                              <ContextMenuItem onClick={() => onTimelineChange(issue.id, 'long_term')}>
                                <Clock className="mr-2 h-4 w-4" />
                                Move to Long-Term
                              </ContextMenuItem>
                            )}
                            
                            {/* Move to Short-Term */}
                            {issue.timeline === 'long_term' && onTimelineChange && (
                              <ContextMenuItem onClick={() => onTimelineChange(issue.id, 'short_term')}>
                                <Clock className="mr-2 h-4 w-4" />
                                Move to Short-Term
                              </ContextMenuItem>
                            )}
                            
                            {/* Archive */}
                            {onArchive && (
                              <ContextMenuItem onClick={() => onArchive(issue.id)}>
                                <Archive className="mr-2 h-4 w-4" />
                                Archive Issue
                              </ContextMenuItem>
                            )}
                            
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })}
                  </div>
                ))}
              </div>
              
              {/* Pagination Controls */}
              {issueCount > itemsPerPage && (
                <div className="mt-4 flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Items per page:</span>
                    <select 
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={issueCount}>All</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      {startIndex + 1}-{endIndex} of {issueCount}
                    </span>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="h-8 px-3"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 px-3"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              </>
            );
          } else {
            // Compact Grid View - Default
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedIssues.map((issue, index) => (
                  <CompactIssueCard key={issue.id} issue={issue} index={index} />
                ))}
              </div>
            );
          }
        })()
      )}

      {/* Issue Edit Modal - using IssueDialog for consistency with TodoDialog */}
      <IssueDialog
        open={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
        issue={selectedIssue}
        teamMembers={teamMembers}
        timeline={selectedIssue?.timeline}
        onSave={(updatedIssue) => {
          if (onSave) {
            onSave(updatedIssue);
          } else if (onEdit) {
            // Fallback to onEdit if onSave not provided
            onEdit(updatedIssue);
          }
          setSelectedIssue(null);
        }}
        onTimelineChange={onTimelineChange}
        onMoveToTeam={onMoveToTeam}
        onCreateTodo={onCreateTodo}
        onSendCascadingMessage={onSendCascadingMessage}
        onConvertToRock={onConvertToRock}
        isQuarterlyMeeting={isQuarterlyMeeting}
      />
    </>
  );
};

export default IssuesListClean;
