import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { organizationService } from '../../services/organizationService';
import { getOrgTheme, saveOrgTheme, hexToRgba } from '../../utils/themeUtils';
import { debugTheme } from '../../utils/debugTheme';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Users,
  MessageSquare,
  Trash2,
  Plus
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { issuesService } from '../../services/issuesService';

const IssuesListClean = ({ 
  issues, 
  onEdit, 
  onStatusChange, 
  onTimelineChange, 
  onArchive,
  onVote,
  onMoveToTeam,
  getStatusColor, 
  getStatusIcon, 
  readOnly = false, 
  showVoting = false,
  compactGrid = false  // New prop for compact grid view in meetings
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

  // Compact card component for grid view
  const CompactIssueCard = ({ issue, index }) => {
    const hasVotes = (issue.vote_count || 0) > 0;
    const isTopIssue = index === 0 && hasVotes && showVoting;
    
    return (
      <div
        className={`
          group relative bg-white rounded-lg border transition-all duration-200 cursor-pointer h-full
          ${issue.status === 'closed' ? 'opacity-60' : ''}
          ${isTopIssue ? 'shadow-sm' : 'hover:shadow-sm'}
        `}
        style={{
          borderColor: isTopIssue ? themeColors.accent : hexToRgba(themeColors.accent, 0.3),
          borderWidth: isTopIssue ? '2px' : '1px'
        }}
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
        onClick={() => setSelectedIssue(issue)}
      >
        {/* Status indicator - left border */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
          style={{ 
            backgroundColor: issue.status === 'open' ? themeColors.accent : '#9CA3AF' 
          }}
        />
        
        <div className="p-3 pl-4">
          {/* Header with number and checkbox */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{
                color: isTopIssue ? themeColors.primary : '#6B7280'
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
              {isTopIssue && <span className="text-xs" title="Top voted">🔥</span>}
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={issue.status === 'closed'}
                onCheckedChange={(checked) => {
                  onStatusChange(issue.id, checked ? 'closed' : 'open');
                }}
                className="h-4 w-4 rounded border-gray-300"
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
              {issue.owner?.name || 'Unassigned'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Render compact grid or regular list based on prop */}
      {compactGrid ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {(issues || []).map((issue, index) => (
            <CompactIssueCard key={issue.id} issue={issue} index={index} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(issues || []).map((issue, index) => {
          const hasVotes = (issue.vote_count || 0) > 0;
          const isTopIssue = index === 0 && hasVotes && showVoting;
          
          return (
            <div
              key={issue.id}
              className={`
                group relative bg-white rounded-lg border transition-all duration-200 cursor-pointer
                ${issue.status === 'closed' ? 'opacity-60' : ''}
                ${isTopIssue ? 'shadow-sm' : 'hover:shadow-sm'}
              `}
              style={{
                borderColor: isTopIssue ? themeColors.accent : hexToRgba(themeColors.accent, 0.4),
                borderWidth: '2px'
              }}
              data-theme-accent={themeColors.accent}
              data-theme-primary={themeColors.primary}
              data-border-color={isTopIssue ? themeColors.accent : hexToRgba(themeColors.accent, 0.4)}
              onMouseEnter={(e) => {
                if (!isTopIssue && issue.status !== 'closed') {
                  e.currentTarget.style.borderColor = hexToRgba(themeColors.accent, 0.7);
                }
              }}
              onMouseLeave={(e) => {
                if (!isTopIssue && issue.status !== 'closed') {
                  e.currentTarget.style.borderColor = hexToRgba(themeColors.accent, 0.4);
                }
              }}
              onClick={() => setSelectedIssue(issue)}
            >
              {/* Status indicator - subtle left border */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                style={{ 
                  backgroundColor: issue.status === 'open' ? themeColors.accent : '#9CA3AF' 
                }}
              />
              
              <div className="p-4 pl-6">
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={issue.status === 'closed'}
                      onCheckedChange={(checked) => {
                        onStatusChange(issue.id, checked ? 'closed' : 'open');
                      }}
                      className="h-5 w-5 rounded border-gray-300 data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
                    />
                  </div>
                  
                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    {/* Title with trending indicator */}
                    <div className="flex items-start gap-2">
                      {/* Issue Number */}
                      <span className="text-sm font-semibold min-w-[2rem]"
                      style={{
                        color: isTopIssue ? themeColors.primary : '#6B7280'
                      }}>
                        #{index + 1}
                      </span>
                      {isTopIssue && (
                        <span className="text-sm" style={{ color: themeColors.primary }} title="Most voted issue">🔥</span>
                      )}
                      <h3 className={`
                        text-base font-medium leading-tight flex-1
                        ${issue.status === 'closed' ? 'text-gray-400 line-through' : 'text-gray-900'}
                      `}>
                        {issue.title}
                      </h3>
                    </div>
                    
                    {/* Metadata - clean single line */}
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      {/* Owner */}
                      <span className="text-gray-500">
                        {issue.owner_name || 'Unassigned'}
                      </span>
                      
                      {/* Separator */}
                      <span className="text-gray-300">•</span>
                      
                      {/* Created date */}
                      <span className="text-gray-500">
                        {formatDate(issue.created_at)}
                      </span>
                      
                      {/* Attachments */}
                      {issue.attachment_count > 0 && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1 text-gray-500">
                            <Paperclip className="h-3.5 w-3.5" />
                            {issue.attachment_count}
                          </span>
                        </>
                      )}
                      
                      {/* Votes - only show if voting enabled */}
                      {showVoting && (
                        <>
                          <span className="text-gray-300">•</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVote(issue.id, !issue.user_has_voted);
                            }}
                            className={`
                              flex items-center gap-1 text-sm font-medium
                              ${issue.user_has_voted ? '' : 'text-gray-500 hover:text-gray-700'}
                            `}
                            style={{
                              color: issue.user_has_voted ? themeColors.primary : undefined
                            }}
                          >
                            <ThumbsUp className={`h-3.5 w-3.5 ${issue.user_has_voted ? 'fill-current' : ''}`} />
                            {issue.vote_count || 0}
                          </button>
                        </>
                      )}
                      
                      {/* Status dot for closed items */}
                      {issue.status === 'closed' && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Solved
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions menu - visible on hover */}
                  {!readOnly && (
                    <div 
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                          >
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(issue);
                            }}
                            className="cursor-pointer"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {issue.timeline === 'short_term' ? (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onTimelineChange(issue.id, 'long_term');
                              }}
                              className="cursor-pointer"
                            >
                              <ArrowRight className="mr-2 h-4 w-4" />
                              Move to Long Term
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onTimelineChange(issue.id, 'short_term');
                              }}
                              className="cursor-pointer"
                            >
                              <ArrowRight className="mr-2 h-4 w-4" />
                              Move to Short Term
                            </DropdownMenuItem>
                          )}
                          {issue.status === 'closed' && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onArchive(issue.id);
                              }}
                              className="cursor-pointer text-red-600 focus:text-red-600"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          {onMoveToTeam && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onMoveToTeam(issue);
                              }}
                              className="cursor-pointer"
                            >
                              <Users className="mr-2 h-4 w-4" />
                              Move to Team
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Issue Detail Modal - shared between both views */}
      <Dialog open={!!selectedIssue} onOpenChange={(open) => !open && setSelectedIssue(null)}>
        <DialogContent className="max-w-2xl">
          {selectedIssue && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold pr-8">
                  {selectedIssue.title}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                {selectedIssue.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                    <p className="text-gray-600 whitespace-pre-wrap">{selectedIssue.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Details</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Owner:</span>
                        <span className="font-medium">{selectedIssue.owner_name || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">{formatDate(selectedIssue.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Timeline:</span>
                        <span className="font-medium">
                          {selectedIssue.timeline === 'short_term' ? 'Short Term' : 'Long Term'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ 
                            backgroundColor: selectedIssue.status === 'open' ? themeColors.accent : '#9CA3AF' 
                          }}
                        />
                        <span className="text-sm font-medium capitalize">{selectedIssue.status}</span>
                      </div>
                      {selectedIssue.vote_count > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <ThumbsUp className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Votes:</span>
                          <span className="font-medium">{selectedIssue.vote_count}</span>
                        </div>
                      )}
                      {selectedIssue.attachment_count > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Paperclip className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Attachments:</span>
                          <span className="font-medium">{selectedIssue.attachment_count}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Updates Section */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Updates ({issueUpdates.length})
                    </h4>
                    {!readOnly && !showAddUpdate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddUpdate(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Update
                      </Button>
                    )}
                  </div>

                  {/* Updates List */}
                  {loadingUpdates ? (
                    <div className="text-sm text-gray-500">Loading updates...</div>
                  ) : (
                    <>
                      {issueUpdates.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {issueUpdates.map(update => (
                            <div key={update.id} className="group bg-gray-50 rounded-lg p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{update.update_text}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-500">
                                      {update.created_by_name} • {formatDate(update.created_at)}
                                    </span>
                                  </div>
                                </div>
                                {!readOnly && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteUpdate(update.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                                  >
                                    <Trash2 className="h-3 w-3 text-red-500" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Update Form */}
                      {showAddUpdate && (
                        <div className="space-y-2">
                          <Textarea
                            value={updateText}
                            onChange={(e) => setUpdateText(e.target.value)}
                            placeholder="Add an update..."
                            className="text-sm"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleAddUpdate}
                              disabled={!updateText.trim() || savingUpdate}
                              className="bg-gray-900 hover:bg-gray-800"
                            >
                              {savingUpdate ? 'Saving...' : 'Add Update'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowAddUpdate(false);
                                setUpdateText('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {issueUpdates.length === 0 && !showAddUpdate && (
                        <p className="text-sm text-gray-500 text-center py-2">
                          No updates yet
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-4 border-t">
                  <div className="flex gap-2">
                    {!readOnly && onTimelineChange && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          onTimelineChange(selectedIssue.id, selectedIssue.timeline === 'short_term' ? 'long_term' : 'short_term');
                          setSelectedIssue(null);
                        }}
                      >
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Move to {selectedIssue.timeline === 'short_term' ? 'Long Term' : 'Short Term'}
                      </Button>
                    )}
                    {!readOnly && onMoveToTeam && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          onMoveToTeam(selectedIssue);
                          setSelectedIssue(null);
                        }}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Move to Team
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedIssue(null)}
                    >
                      Close
                    </Button>
                    {!readOnly && (
                      <Button
                        onClick={() => {
                          onEdit(selectedIssue);
                          // Keep modal open briefly to ensure edit dialog opens
                          setTimeout(() => setSelectedIssue(null), 100);
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Issue
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IssuesListClean;