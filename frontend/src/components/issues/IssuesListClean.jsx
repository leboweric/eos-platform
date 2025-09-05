import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { organizationService } from '../../services/organizationService';
import { getOrgTheme, saveOrgTheme, hexToRgba } from '../../utils/themeUtils';
import { debugTheme } from '../../utils/debugTheme';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Trash2,
  Plus,
  ListTodo,
  Send,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  List,
  GripVertical
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
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
  onSendCascadingMessage,
  onReorder,  // New prop for handling reordering
  onSave,  // Callback for saving issue changes
  teamMembers = [],  // Team members for assignment
  getStatusColor, 
  getStatusIcon, 
  readOnly = false, 
  showVoting = false,
  enableDragDrop = false,  // New prop to enable drag-and-drop
  compactGrid = false,  // New prop for compact grid view in meetings
  maxColumns = 3,  // Maximum number of columns for list view
  columnBreakpoint = 20  // Number of items before adding another column
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

  // Sort issues whenever issues prop or sort settings change
  useEffect(() => {
    // If drag-drop is enabled AND no sort field is selected, preserve the original order (priority_rank)
    if (enableDragDrop && !sortField) {
      const sorted = [...(issues || [])].sort((a, b) => {
        // Sort by priority_rank if it exists, otherwise by id
        if (a.priority_rank !== undefined && b.priority_rank !== undefined) {
          return a.priority_rank - b.priority_rank;
        }
        return 0;
      });
      setSortedIssues(sorted);
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
    setDragOverIssueIndex(null);

    if (draggedIssueIndex === null || draggedIssueIndex === dropIndex || !draggedIssue) {
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
      try {
        await onReorder(updatedIssues);
      } catch (error) {
        console.error('Failed to reorder issues:', error);
        // Revert on error
        setSortedIssues(sortedIssues);
      }
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
    const isTopThree = showVoting && index < 3;  // Only highlight top 3 during meetings
    
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
          backgroundColor: showVoting && index === 0 ? hexToRgba(themeColors.primary, 0.08) : 
                          showVoting && index === 1 ? hexToRgba(themeColors.secondary, 0.06) :
                          showVoting && index === 2 ? hexToRgba(themeColors.accent, 0.04) :
                          'rgba(255, 255, 255, 0.9)',
          borderColor: showVoting && index === 0 ? themeColors.primary : 
                      showVoting && index === 1 ? themeColors.secondary :
                      showVoting && index === 2 ? themeColors.accent :
                      hexToRgba(themeColors.accent, 0.3)
        }}
        onDragOver={handleDragOver}
        onDragEnter={(e) => handleDragEnter(e, index)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, index)}
        onMouseEnter={(e) => {
          if (!isTopIssue && issue.status !== 'closed') {
            e.currentTarget.style.borderColor = hexToRgba(themeColors.accent, 0.6);
          }
        }}
        onMouseLeave={(e) => {
          if (!isTopIssue && issue.status !== 'closed') {
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
        {/* Enhanced status indicator */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ 
            background: issue.status === 'open' ? `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)` : 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
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
              <span className="text-xs font-bold" style={{
                color: showVoting && index === 0 ? themeColors.primary : 
                       showVoting && index === 1 ? themeColors.secondary :
                       showVoting && index === 2 ? themeColors.accent :
                       '#6B7280'
              }}>
                #{index + 1}
              </span>
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
              {showVoting && index === 0 && <span className="text-xs" title="#1 Priority">🥇</span>}
              {showVoting && index === 1 && <span className="text-xs" title="#2 Priority">🥈</span>}
              {showVoting && index === 2 && <span className="text-xs" title="#3 Priority">🥉</span>}
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <Checkbox
                  checked={issue.status === 'closed'}
                  onCheckedChange={(checked) => {
                    onStatusChange(issue.id, checked ? 'closed' : 'open');
                  }}
                  className={`h-5 w-5 rounded-lg border-2 transition-all duration-200 shadow-sm ${
                    issue.status === 'closed' ? 'data-[state=checked]:text-white data-[state=checked]:border-transparent' : ''
                  }`}
                  style={{
                    borderColor: issue.status === 'closed' ? themeColors.primary : '#D1D5DB',
                    backgroundColor: issue.status === 'closed' ? themeColors.primary : 'transparent'
                  }}
                />
              </div>
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
          
          {/* List view toggle - only show if not in compactGrid mode */}
          {!compactGrid && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const newMode = !showListView;
                setShowListView(newMode);
                localStorage.setItem('issuesViewMode', newMode ? 'list' : 'grid');
              }}
              className="h-7 px-3 py-1 text-xs font-medium hover:bg-gray-200"
              title={showListView ? "Switch to Compact Grid View" : "Switch to List View"}
            >
              <List className="h-3 w-3 mr-1" />
              {showListView ? "Grid View" : "List View"}
            </Button>
          )}
        </div>
      </div>
      
      {/* Render compact grid or regular list based on prop */}
      {compactGrid ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sortedIssues.map((issue, index) => (
            <CompactIssueCard key={issue.id} issue={issue} index={index} />
          ))}
        </div>
      ) : (
        // Default view - List or Grid based on showListView
        (() => {
          if (showListView) {
            // Multi-column list view logic
            const issueCount = sortedIssues.length;
            const columnCount = Math.min(maxColumns, Math.ceil(issueCount / columnBreakpoint));
            const issuesPerColumn = Math.ceil(issueCount / columnCount);
            
            // Split issues into columns
            const columns = [];
            for (let i = 0; i < columnCount; i++) {
              const start = i * issuesPerColumn;
              const end = Math.min(start + issuesPerColumn, issueCount);
              columns.push(sortedIssues.slice(start, end));
            }
            
            return (
              <div className={`grid gap-4 ${
                columnCount === 1 ? 'grid-cols-1' : 
                columnCount === 2 ? 'grid-cols-1 lg:grid-cols-2' : 
                'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
              }`}>
                {columns.map((columnIssues, colIndex) => (
                  <div key={colIndex} className="space-y-2">
                    {columnIssues.map((issue) => {
                      const globalIndex = sortedIssues.findIndex(i => i.id === issue.id);
                      const hasVotes = (issue.vote_count || 0) > 0;
                      const isTopIssue = globalIndex === 0 && hasVotes && showVoting;
                      const isDragOver = dragOverIssueIndex === globalIndex;
                      const isTopThree = showVoting && globalIndex < 3;  // Only highlight top 3 during meetings
                      
                      return (
                        <div
                          key={issue.id}
                          className={`
                            group relative flex items-center gap-3 backdrop-blur-sm rounded-xl border pl-3 pr-4 py-3 transition-shadow duration-200 cursor-pointer shadow-sm hover:shadow-md
                            ${issue.status === 'closed' ? 'opacity-60' : ''}
                            ${isDragOver ? 'ring-2 ring-blue-400' : ''}
                            ${draggedIssueIndex === globalIndex ? 'opacity-50' : ''}
                            ${isTopThree ? 'shadow-lg' : ''}
                          `}
                          style={{
                            backgroundColor: showVoting && globalIndex === 0 ? hexToRgba(themeColors.primary, 0.08) : 
                                          showVoting && globalIndex === 1 ? hexToRgba(themeColors.secondary, 0.06) :
                                          showVoting && globalIndex === 2 ? hexToRgba(themeColors.accent, 0.04) :
                                          'rgba(255, 255, 255, 0.9)',
                            borderColor: showVoting && globalIndex === 0 ? themeColors.primary : 
                                        showVoting && globalIndex === 1 ? themeColors.secondary :
                                        showVoting && globalIndex === 2 ? themeColors.accent :
                                        'rgba(255, 255, 255, 0.5)'
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
                {/* Enhanced status indicator */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                  style={{ 
                    background: issue.status === 'open' ? `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)` : 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
                  }}
                />
                
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
                <div onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <Checkbox
                      checked={issue.status === 'closed'}
                      onCheckedChange={(checked) => {
                        onStatusChange(issue.id, checked ? 'closed' : 'open');
                      }}
                      className={`h-5 w-5 rounded-lg border-2 transition-all duration-200 shadow-sm ${
                        issue.status === 'closed' ? 'data-[state=checked]:text-white data-[state=checked]:border-transparent' : ''
                      }`}
                      style={{
                        borderColor: issue.status === 'closed' ? themeColors.primary : '#D1D5DB',
                        backgroundColor: issue.status === 'closed' ? themeColors.primary : 'transparent'
                      }}
                    />
                  </div>
                </div>
                
                {/* Issue number with priority colors */}
                <span className="text-sm font-semibold min-w-[2rem]" style={{
                  color: showVoting && globalIndex === 0 ? themeColors.primary : 
                         showVoting && globalIndex === 1 ? themeColors.secondary :
                         showVoting && globalIndex === 2 ? themeColors.accent :
                         '#6B7280'
                }}>
                  #{globalIndex + 1}
                </span>
                
                {/* Medal emojis for top 3 - only during meetings */}
                {showVoting && globalIndex === 0 && <span className="text-xs" title="#1 Priority">🥇</span>}
                {showVoting && globalIndex === 1 && <span className="text-xs" title="#2 Priority">🥈</span>}
                {showVoting && globalIndex === 2 && <span className="text-xs" title="#3 Priority">🥉</span>}
                
                {/* Title */}
                <h3 className={`
                  flex-1 text-sm font-medium
                  ${issue.status === 'closed' ? 'text-gray-400 line-through' : 'text-gray-900'}
                `}>
                  {issue.title}
                </h3>
                
                {/* Attachment indicator */}
                {issue.attachment_count > 0 && (
                  <div className="flex items-center text-gray-400" title={`${issue.attachment_count} attachment${issue.attachment_count > 1 ? 's' : ''}`}>
                    <Paperclip className="h-3 w-3" />
                    {issue.attachment_count > 1 && (
                      <span className="text-xs ml-0.5">{issue.attachment_count}</span>
                    )}
                  </div>
                )}
                
                {/* Owner */}
                <span className="text-sm text-gray-500">
                  {issue.owner_name || 'Unassigned'}
                </span>
                
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
                      );
                    })}
                  </div>
                ))}
              </div>
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
      />
    </>
  );
};

export default IssuesListClean;
