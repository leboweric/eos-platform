import { useState, useEffect, Component } from 'react';
import { useAuthStore } from '../stores/authStore';
import { issuesService } from '../services/issuesService';
import { organizationService } from '../services/organizationService';
import { getOrgTheme, saveOrgTheme } from '../utils/themeUtils';
import { useDepartment } from '../contexts/DepartmentContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus,
  Loader2,
  AlertCircle,
  CheckSquare,
  AlertTriangle,
  Archive
} from 'lucide-react';
import IssueDialog from '../components/issues/IssueDialog';
import IssuesListClean from '../components/issues/IssuesListClean';
import ArchivedIssuesList from '../components/issues/ArchivedIssuesList';
import { MoveIssueDialog } from '../components/issues/MoveIssueDialog';
import TodoDialog from '../components/todos/TodoDialog';
import { todosService } from '../services/todosService';
import { cascadingMessagesService } from '../services/cascadingMessagesService';
import { teamsService } from '../services/teamsService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

// Error Boundary Component
class IssuesErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Issues Page Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="space-y-2">
                <p>An error occurred loading the issues page.</p>
                <p className="text-sm">Error: {this.state.error?.message}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  size="sm"
                  variant="outline"
                >
                  Refresh Page
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

const IssuesPageClean = () => {
  const { user } = useAuthStore();
  const { selectedDepartment } = useDepartment();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('short_term');
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  
  // Issues data
  const [shortTermIssues, setShortTermIssues] = useState([]);
  const [longTermIssues, setLongTermIssues] = useState([]);
  const [archivedIssues, setArchivedIssues] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  
  // Dialog states
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [movingIssue, setMovingIssue] = useState(null);
  const [showTodoDialog, setShowTodoDialog] = useState(false);
  const [todoFromIssue, setTodoFromIssue] = useState(null);
  const [showCascadeDialog, setShowCascadeDialog] = useState(false);
  const [cascadeFromIssue, setCascadeFromIssue] = useState(null);
  const [cascadeMessage, setCascadeMessage] = useState('');
  const [availableTeams, setAvailableTeams] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [cascadeToAll, setCascadeToAll] = useState(false);

  useEffect(() => {
    fetchIssues();
    fetchOrganizationTheme();
    
    // Listen for theme changes
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, [selectedDepartment]);
  
  const fetchOrganizationTheme = async () => {
    try {
      // First check localStorage
      const orgId = user?.organizationId || user?.organization_id;
      const savedTheme = getOrgTheme(orgId);
      if (savedTheme) {
        setThemeColors(savedTheme);
        return;
      }
      
      // Fetch from API
      const orgData = await organizationService.getOrganization();
      
      if (orgData) {
        const theme = {
          primary: orgData.theme_primary_color || '#3B82F6',
          secondary: orgData.theme_secondary_color || '#1E40AF',
          accent: orgData.theme_accent_color || '#60A5FA'
        };
        setThemeColors(theme);
        saveOrgTheme(orgId, theme);
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
    }
  };

  const fetchIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all types of issues
      const [shortTermResponse, longTermResponse, archivedResponse] = await Promise.all([
        issuesService.getIssues('short_term', false, selectedDepartment?.id),
        issuesService.getIssues('long_term', false, selectedDepartment?.id),
        issuesService.getIssues(null, true, selectedDepartment?.id) // Get all archived issues
      ]);
      
      // Ensure we have valid arrays and log for debugging
      const shortTerm = Array.isArray(shortTermResponse?.data?.issues) ? shortTermResponse.data.issues : [];
      const longTerm = Array.isArray(longTermResponse?.data?.issues) ? longTermResponse.data.issues : [];
      const archived = Array.isArray(archivedResponse?.data?.issues) ? archivedResponse.data.issues : [];
      
      console.log('Issues loaded:', { shortTerm: shortTerm.length, longTerm: longTerm.length, archived: archived.length });
      
      setShortTermIssues(shortTerm);
      setLongTermIssues(longTerm);
      setArchivedIssues(archived);
      
      // Team members come from either response (they're the same)
      setTeamMembers(shortTermResponse.data.teamMembers || []);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
      setError('Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIssue = () => {
    setEditingIssue(null);
    setShowIssueDialog(true);
  };

  const handleEditIssue = (issue) => {
    setEditingIssue(issue);
    setShowIssueDialog(true);
  };

  const handleSaveIssue = async (issueData) => {
    try {
      let savedIssue;
      if (editingIssue) {
        savedIssue = await issuesService.updateIssue(editingIssue.id, issueData);
        setSuccess('Issue updated successfully');
      } else {
        savedIssue = await issuesService.createIssue({
          ...issueData,
          timeline: activeTab,
          department_id: selectedDepartment?.id
        });
        setSuccess('Issue created successfully');
      }
      
      await fetchIssues();
      setShowIssueDialog(false);
      return savedIssue; // Return the saved issue for attachment uploads
    } catch (error) {
      console.error('Failed to save issue:', error);
      throw error;
    }
  };

  const handleStatusChange = async (issueId, newStatus) => {
    try {
      // Optimistically update the local state first for instant feedback
      setShortTermIssues(prev => 
        prev.map(issue => 
          issue.id === issueId ? { ...issue, status: newStatus } : issue
        )
      );
      setLongTermIssues(prev => 
        prev.map(issue => 
          issue.id === issueId ? { ...issue, status: newStatus } : issue
        )
      );
      
      // Then update the backend
      await issuesService.updateIssue(issueId, { status: newStatus });
      
      // Don't refetch - the optimistic update handles it
    } catch (error) {
      console.error('Failed to update issue status:', error);
      setError('Failed to update issue status');
      // Revert on error by refetching
      await fetchIssues();
    }
  };

  const handleTimelineChange = async (issueId, newTimeline) => {
    try {
      await issuesService.updateIssue(issueId, { timeline: newTimeline });
      setSuccess(`Issue moved to ${newTimeline === 'short_term' ? 'Short Term' : 'Long Term'}`);
      await fetchIssues();
    } catch (error) {
      console.error('Failed to update issue timeline:', error);
      setError('Failed to move issue');
    }
  };

  const handleVote = async (issueId, shouldVote) => {
    try {
      // Optimistically update the local state for instant feedback
      const updateVote = (issue) => {
        if (issue.id === issueId) {
          return {
            ...issue,
            user_has_voted: shouldVote,
            vote_count: shouldVote 
              ? (issue.vote_count || 0) + 1 
              : Math.max(0, (issue.vote_count || 0) - 1)
          };
        }
        return issue;
      };
      
      setShortTermIssues(prev => prev.map(updateVote));
      setLongTermIssues(prev => prev.map(updateVote));
      
      // Then update the backend
      if (shouldVote) {
        await issuesService.voteForIssue(issueId);
      } else {
        await issuesService.unvoteForIssue(issueId);
      }
    } catch (error) {
      console.error('Failed to vote:', error);
      setError('Failed to update vote');
      // Revert on error
      await fetchIssues();
    }
  };

  const handleMoveToTeam = (issue) => {
    setMovingIssue(issue);
    setShowMoveDialog(true);
  };

  const handleMoveSuccess = async (message) => {
    setSuccess(message);
    setShowMoveDialog(false);
    setMovingIssue(null);
    await fetchIssues();
  };

  const handleArchive = async (issueId) => {
    try {
      await issuesService.archiveIssue(issueId);
      setSuccess('Issue archived successfully');
      await fetchIssues();
    } catch (error) {
      console.error('Failed to archive issue:', error);
      setError('Failed to archive issue');
    }
  };

  const handleArchiveSelected = async () => {
    try {
      // Get all closed issues from the current tab
      const closedIssues = currentIssues.filter(issue => issue.status === 'closed');
      
      if (closedIssues.length === 0) {
        setError('No closed issues to archive');
        return;
      }
      
      if (!window.confirm(`Archive ${closedIssues.length} closed issue${closedIssues.length > 1 ? 's' : ''}?`)) {
        return;
      }
      
      // Archive all closed issues
      await Promise.all(closedIssues.map(issue => issuesService.archiveIssue(issue.id)));
      
      setSuccess(`${closedIssues.length} issue${closedIssues.length > 1 ? 's' : ''} archived successfully`);
      await fetchIssues();
    } catch (error) {
      console.error('Failed to archive issues:', error);
      setError('Failed to archive issues');
    }
  };

  const handleUnarchive = async (issueId) => {
    try {
      await issuesService.unarchiveIssue(issueId);
      setSuccess('Issue restored successfully');
      await fetchIssues();
    } catch (error) {
      console.error('Failed to unarchive issue:', error);
      setError('Failed to restore issue');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="h-4 w-4" />;
      case 'closed':
        return <CheckSquare className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const handleCreateTodoFromIssue = (issue) => {
    setTodoFromIssue(issue);
    setShowTodoDialog(true);
  };

  const handleSaveTodo = async (todoData) => {
    try {
      // Add reference to the issue in the description
      const enhancedDescription = todoFromIssue 
        ? `${todoData.description}\n\n[Related Issue: ${todoFromIssue.title}]`
        : todoData.description;
      
      await todosService.createTodo({
        ...todoData,
        description: enhancedDescription,
        department_id: selectedDepartment?.id
      });
      
      setSuccess('To-Do created successfully from issue');
      setShowTodoDialog(false);
      setTodoFromIssue(null);
    } catch (error) {
      console.error('Failed to create todo:', error);
      setError('Failed to create to-do');
    }
  };

  const handleSendCascadingMessage = async (issue) => {
    // Fetch available teams
    try {
      const response = await teamsService.getTeams();
      const teams = response.data || response;
      setAvailableTeams(Array.isArray(teams) ? teams.filter(t => !t.is_leadership_team) : []);
      setCascadeFromIssue(issue);
      setCascadeMessage(`Issue Update: ${issue.title}\n\nStatus: ${issue.status}\nOwner: ${issue.owner_name || 'Unassigned'}\n\nDetails: ${issue.description || 'No description provided'}`);
      setShowCascadeDialog(true);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      setError('Failed to load teams for cascading message');
    }
  };

  const handleSendCascade = async () => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamIds = cascadeToAll ? availableTeams.map(t => t.id) : selectedTeams;
      
      if (teamIds.length === 0) {
        setError('Please select at least one team');
        return;
      }
      
      await cascadingMessagesService.createMessage(orgId, {
        message: cascadeMessage,
        team_ids: teamIds,
        created_by: user?.id
      });
      
      setSuccess('Cascading message sent successfully');
      setShowCascadeDialog(false);
      setCascadeFromIssue(null);
      setCascadeMessage('');
      setSelectedTeams([]);
      setCascadeToAll(false);
    } catch (error) {
      console.error('Failed to send cascading message:', error);
      setError('Failed to send cascading message');
    }
  };

  const currentIssues = activeTab === 'short_term' ? shortTermIssues : activeTab === 'long_term' ? longTermIssues : archivedIssues;
  const closedIssuesCount = (currentIssues || []).filter(issue => issue.status === 'closed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Clean Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            <span className="inline-block w-1 h-7 mr-2 rounded-full" style={{ backgroundColor: themeColors.primary }} />
            Issues{selectedDepartment ? ` - ${selectedDepartment.name}` : ''}
          </h1>
          <div className="flex items-center gap-3">
            {activeTab !== 'archived' && closedIssuesCount > 0 && (
              <Button 
                onClick={handleArchiveSelected} 
                variant="ghost"
                className="text-gray-600 transition-colors"
                onMouseEnter={(e) => e.currentTarget.style.color = themeColors.primary}
                onMouseLeave={(e) => e.currentTarget.style.color = ''}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive Solved ({closedIssuesCount})
              </Button>
            )}
            {activeTab !== 'archived' && (
              <Button 
                onClick={handleCreateIssue} 
                className="text-white transition-colors"
                style={{ backgroundColor: themeColors.primary }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeColors.secondary}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeColors.primary}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Issue
              </Button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert className="border-red-200 bg-red-50 mb-6">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 mb-6">
            <CheckSquare className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Clean Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-transparent border-0 p-0 h-auto mb-8 border-b border-gray-100">
            <TabsTrigger 
              value="short_term" 
              className="bg-transparent shadow-none border-b-2 rounded-none pb-3 px-4 font-medium transition-colors"
              style={{ 
                borderBottomColor: activeTab === 'short_term' ? themeColors.primary : 'transparent'
              }}
            >
              Short Term
              <span className="ml-2 text-sm text-gray-500">({shortTermIssues.length})</span>
            </TabsTrigger>
            <TabsTrigger 
              value="long_term" 
              className="bg-transparent shadow-none border-b-2 rounded-none pb-3 px-4 font-medium transition-colors"
              style={{ 
                borderBottomColor: activeTab === 'long_term' ? themeColors.primary : 'transparent'
              }}
            >
              Long Term
              <span className="ml-2 text-sm text-gray-500">({longTermIssues.length})</span>
            </TabsTrigger>
            <TabsTrigger 
              value="archived" 
              className="bg-transparent shadow-none border-b-2 rounded-none pb-3 px-4 font-medium transition-colors"
              style={{ 
                borderBottomColor: activeTab === 'archived' ? themeColors.primary : 'transparent'
              }}
            >
              Archived
              <span className="ml-2 text-sm text-gray-500">({archivedIssues.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {currentIssues.length === 0 ? (
              <div className="text-center py-16">
                <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {activeTab === 'archived' ? 'No archived issues' : `No ${activeTab === 'short_term' ? 'short-term' : 'long-term'} issues yet`}
                </h3>
                <p className="text-gray-500 mb-6">
                  {activeTab === 'archived' ? 'Archived issues will appear here' : 'Create your first issue to start tracking'}
                </p>
                {activeTab !== 'archived' && (
                  <Button onClick={handleCreateIssue} variant="outline" className="border-gray-300">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Issue
                  </Button>
                )}
              </div>
            ) : (
              activeTab === 'archived' ? (
                <ArchivedIssuesList
                  issues={currentIssues}
                  onUnarchive={handleUnarchive}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                />
              ) : (
                <IssuesListClean
                  issues={currentIssues}
                  onEdit={handleEditIssue}
                  onStatusChange={handleStatusChange}
                  onTimelineChange={handleTimelineChange}
                  onArchive={handleArchive}
                  onVote={handleVote}
                  onMoveToTeam={handleMoveToTeam}
                  onCreateTodo={handleCreateTodoFromIssue}
                  onSendCascadingMessage={handleSendCascadingMessage}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  showVoting={false} // Will be enabled during Weekly Accountability Meetings
                  compactGrid={false} // Allow toggle between grid and list views
                />
              )
            )}
          </TabsContent>
        </Tabs>

        {/* Move Issue Dialog */}
        <MoveIssueDialog
          isOpen={showMoveDialog}
          onClose={() => {
            setShowMoveDialog(false);
            setMovingIssue(null);
          }}
          issue={movingIssue}
          onSuccess={handleMoveSuccess}
        />

        {/* Todo Dialog */}
        <TodoDialog
          open={showTodoDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowTodoDialog(false);
              setTodoFromIssue(null);
            }
          }}
          onSave={handleSaveTodo}
          teamMembers={teamMembers}
          todo={todoFromIssue ? {
            title: `Follow up: ${todoFromIssue.title}`,
            description: `Related to issue: ${todoFromIssue.title}`,
            assigned_to_id: todoFromIssue.owner_id || user?.id
          } : null}
        />

        {/* Cascading Message Dialog */}
        <Dialog open={showCascadeDialog} onOpenChange={(open) => {
          if (!open) {
            setShowCascadeDialog(false);
            setCascadeFromIssue(null);
            setCascadeMessage('');
            setSelectedTeams([]);
            setCascadeToAll(false);
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send Cascading Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Message</Label>
                <Textarea
                  value={cascadeMessage}
                  onChange={(e) => setCascadeMessage(e.target.value)}
                  rows={6}
                  className="mt-1"
                  placeholder="Enter your message..."
                />
              </div>
              
              <div>
                <Label>Select Teams</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="cascade-all"
                      checked={cascadeToAll}
                      onCheckedChange={setCascadeToAll}
                    />
                    <label htmlFor="cascade-all" className="text-sm font-medium">
                      Send to all teams
                    </label>
                  </div>
                  
                  {!cascadeToAll && (
                    <div className="space-y-2 ml-6">
                      {availableTeams.map(team => (
                        <div key={team.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`team-${team.id}`}
                            checked={selectedTeams.includes(team.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTeams([...selectedTeams, team.id]);
                              } else {
                                setSelectedTeams(selectedTeams.filter(id => id !== team.id));
                              }
                            }}
                          />
                          <label htmlFor={`team-${team.id}`} className="text-sm">
                            {team.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowCascadeDialog(false);
                setCascadeFromIssue(null);
                setCascadeMessage('');
                setSelectedTeams([]);
                setCascadeToAll(false);
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleSendCascade}
                style={{ backgroundColor: themeColors.primary }}
                className="text-white"
              >
                Send Message
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Issue Dialog */}
        <IssueDialog
          open={showIssueDialog}
          onClose={() => {
            setShowIssueDialog(false);
            setEditingIssue(null);
          }}
          onSave={handleSaveIssue}
          issue={editingIssue}
          teamMembers={teamMembers}
          timeline={activeTab}
        />
      </div>
    </div>
  );
};

// Wrap with error boundary
const IssuesPageWithErrorBoundary = () => (
  <IssuesErrorBoundary>
    <IssuesPageClean />
  </IssuesErrorBoundary>
);

export default IssuesPageWithErrorBoundary;