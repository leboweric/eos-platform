import { useState, useEffect, Component } from 'react';
import { format, addDays } from 'date-fns';
import { useAuthStore } from '../stores/authStore';
import { issuesService } from '../services/issuesService';
import { organizationService } from '../services/organizationService';
import { getOrgTheme, saveOrgTheme } from '../utils/themeUtils';
import { exportIssuesToExcel } from '../utils/excelExport';
import { useDepartment } from '../contexts/DepartmentContext';
import { useTerminology } from '../contexts/TerminologyContext';
import { getEffectiveTeamId } from '../utils/teamUtils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus,
  Loader2,
  AlertCircle,
  CheckSquare,
  AlertTriangle,
  Archive,
  Download,
  Activity,
  Target,
  Users,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import IssueDialog from '../components/issues/IssueDialog';
import IssuesListClean from '../components/issues/IssuesListClean';
import { MoveIssueDialog } from '../components/issues/MoveIssueDialog';
import TodoDialog from '../components/todos/TodoDialog';
import HeadlineDialog from '../components/headlines/HeadlineDialog';
import { headlinesService } from '../services/headlinesService';
import { todosService } from '../services/todosService';
import { cascadingMessagesService } from '../services/cascadingMessagesService';
import { teamsService } from '../services/teamsService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import ConfirmationDialog, { useConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { toast } from 'sonner';

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
  const { labels } = useTerminology();
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
  
  // Confirmation dialog for archive
  const archiveConfirmation = useConfirmationDialog();
  
  // Dialog states
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [movingIssue, setMovingIssue] = useState(null);
  const [showTodoDialog, setShowTodoDialog] = useState(false);
  const [todoFromIssue, setTodoFromIssue] = useState(null);
  const [showHeadlineDialog, setShowHeadlineDialog] = useState(false);
  const [headlineFromIssue, setHeadlineFromIssue] = useState(null);
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
    console.log('🔍 fetchIssues called - refreshing all issues...');
    try {
      setLoading(true);
      setError(null);
      
      // Get effective team ID (like Level 10 Meeting does)
      const effectiveTeamId = getEffectiveTeamId(selectedDepartment?.id, user);
      console.log('Issues Page - Fetching issues for effective team:', effectiveTeamId, 'selected department:', selectedDepartment?.id);
      
      // Fetch all types of issues for the specific team
      const [shortTermResponse, longTermResponse, archivedResponse] = await Promise.all([
        issuesService.getIssues('short_term', false, effectiveTeamId),
        issuesService.getIssues('long_term', false, effectiveTeamId),
        issuesService.getIssues(null, true, effectiveTeamId) // Get all archived issues
      ]);
      
      console.log('📊 Fetch Results:');
      console.log('  - Short term issues count:', shortTermResponse.data?.issues?.length);
      console.log('  - Long term issues count:', longTermResponse.data?.issues?.length);
      console.log('  - Short term issue details:', shortTermResponse.data?.issues?.map(i => ({ 
        id: i.id, 
        title: i.title, 
        timeline: i.timeline 
      })));
      console.log('  - Long term issue details:', longTermResponse.data?.issues?.map(i => ({ 
        id: i.id, 
        title: i.title, 
        timeline: i.timeline 
      })));
      
      // Ensure we have valid arrays and log for debugging
      const shortTerm = Array.isArray(shortTermResponse?.data?.issues) ? shortTermResponse.data.issues : [];
      const longTerm = Array.isArray(longTermResponse?.data?.issues) ? longTermResponse.data.issues : [];
      const archived = Array.isArray(archivedResponse?.data?.issues) ? archivedResponse.data.issues : [];
      
      console.log('✅ Setting state with:', { shortTerm: shortTerm.length, longTerm: longTerm.length, archived: archived.length });
      
      setShortTermIssues(shortTerm);
      setLongTermIssues(longTerm);
      setArchivedIssues(archived);
      
      // Team members come from either response (they're the same)
      setTeamMembers(shortTermResponse.data.teamMembers || []);
    } catch (error) {
      console.error('❌ Failed to fetch issues:', error);
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
    console.log('🔧 handleEditIssue called with issue:', {
      id: issue.id,
      title: issue.title,
      timeline: issue.timeline,
      status: issue.status
    });
    setEditingIssue(issue);
    setShowIssueDialog(true);
  };

  const handleSaveIssue = async (issueData) => {
    try {
      let savedIssue;
      
      // Check if we're editing an existing issue (either from editingIssue state or if issueData has an id)
      const isEditing = editingIssue || issueData.id;
      const issueId = editingIssue?.id || issueData.id;
      
      if (isEditing && issueId) {
        savedIssue = await issuesService.updateIssue(issueId, issueData);
        setSuccess('Issue updated successfully');
      } else {
        // Get effective team ID for creating the issue
        const effectiveTeamId = getEffectiveTeamId(selectedDepartment?.id, user);
        
        savedIssue = await issuesService.createIssue({
          ...issueData,
          timeline: activeTab,
          department_id: effectiveTeamId  // This will be handled by issuesService
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
    console.log('🚀 handleTimelineChange called');
    console.log('  - Issue ID:', issueId);
    console.log('  - New Timeline:', newTimeline);
    console.log('  - Current Short Term Issues:', shortTermIssues.length);
    console.log('  - Current Long Term Issues:', longTermIssues.length);
    
    try {
      // Update the issue in the database FIRST
      console.log('📡 Updating issue in database...');
      const response = await issuesService.updateIssue(issueId, { timeline: newTimeline });
      console.log('✅ Database update response:', response);
      
      // Show success message
      setSuccess(`Issue moved to ${newTimeline === 'short_term' ? 'Short Term' : 'Long Term'}`);
      
      // FORCE A FULL REFRESH OF THE ISSUES
      console.log('🔄 Fetching fresh issue data...');
      await fetchIssues();
      console.log('✅ Issues refreshed');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('❌ Failed to update issue timeline:', error);
      console.error('Error response:', error.response);
      setError(`Failed to move issue: ${error.response?.data?.message || error.message}`);
      // On error, also refetch to restore correct state
      await fetchIssues();
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
      
      archiveConfirmation.showConfirmation({
        type: 'archive',
        title: 'Archive Solved Issues',
        message: `Archive ${closedIssues.length} closed issue${closedIssues.length > 1 ? 's' : ''}?`,
        actionLabel: 'Archive',
        themeColor: themeColors.primary,
        onConfirm: async () => {
          console.log('🗃️ Archive onConfirm started');
          try {
            // Archive all closed issues
            await Promise.all(closedIssues.map(issue => issuesService.archiveIssue(issue.id)));
            console.log('✅ Archive operations completed successfully');
            
            toast.success(`${closedIssues.length} issue${closedIssues.length > 1 ? 's' : ''} archived successfully`);
            
            // Refresh the issues list
            console.log('🔄 Starting fetchIssues...');
            await fetchIssues();
            console.log('✅ fetchIssues completed successfully');
            console.log('🗃️ Archive onConfirm finished - modal should close now');
            
            // ✅ CRITICAL FIX: Explicitly close the modal (backup safety measure)
            archiveConfirmation.hideConfirmation();
            
          } catch (error) {
            console.error('❌ Error in archive onConfirm:', error);
            
            // ✅ CRITICAL FIX: Close modal even on error to prevent stuck state
            archiveConfirmation.hideConfirmation();
            
            // Show error to user
            toast.error('Failed to archive issues. Please try again.');
          }
        }
      });
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

  const handleCreateHeadlineFromIssue = (issue) => {
    setHeadlineFromIssue(issue);
    setShowHeadlineDialog(true);
  };


  const handleMarkIssueSolved = async (issue) => {
    try {
      // Use 'closed' status - this is the correct value for solved issues
      await issuesService.updateIssue(issue.id, {
        status: 'closed'
      });
      setSuccess('Issue marked as solved');
      await fetchIssues();
    } catch (error) {
      console.error('Failed to mark issue as solved:', error);
      setError('Failed to mark issue as solved');
    }
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
      const orgId = user?.organizationId || user?.organization_id;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
                   style={{
                     background: `linear-gradient(135deg, ${themeColors.primary}15 0%, ${themeColors.secondary}15 100%)`,
                     color: themeColors.primary
                   }}>
                <Activity className="h-4 w-4" />
                ISSUE TRACKING
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                {labels.issues_label}{selectedDepartment ? ` - ${selectedDepartment.name}` : ''}
              </h1>
              <p className="text-base lg:text-lg text-slate-600">Identify, prioritize, and solve challenges</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {activeTab !== 'archived' && (
                <Button
                  onClick={() => {
                    const allIssues = [...shortTermIssues, ...longTermIssues];
                    if (allIssues.length > 0) {
                      exportIssuesToExcel(allIssues);
                    } else {
                      setError('No issues to export');
                    }
                  }}
                  variant="outline"
                  className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm transition-all duration-200"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export to Excel
                </Button>
              )}
              {activeTab !== 'archived' && (
                <Button 
                  onClick={handleCreateIssue} 
                  className="text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  style={{ 
                    background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Issue
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Alerts */}
        {error && (
          <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm rounded-xl mb-6">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50/80 backdrop-blur-sm rounded-xl mb-6">
            <Sparkles className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 font-medium">{success}</AlertDescription>
          </Alert>
        )}

        {/* Enhanced Tabs */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50 mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 inline-flex shadow-sm">
                <TabsList className="bg-transparent border-0 p-0 h-auto gap-1">
                  <TabsTrigger 
                    value="short_term" 
                    className="data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-200 font-medium px-4 py-2"
                    style={{
                      ...(activeTab === 'short_term' ? {
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                      } : {})
                    }}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Short Term
                    <span className="ml-2 text-sm opacity-80">({shortTermIssues.length})</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="long_term" 
                    className="data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-200 font-medium px-4 py-2"
                    style={{
                      ...(activeTab === 'long_term' ? {
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.accent} 100%)`
                      } : {})
                    }}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Long Term
                    <span className="ml-2 text-sm opacity-80">({longTermIssues.length})</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="archived" 
                    className="data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-200 font-medium px-4 py-2"
                    style={{
                      ...(activeTab === 'archived' ? {
                        background: `linear-gradient(135deg, ${themeColors.secondary} 0%, ${themeColors.accent} 100%)`
                      } : {})
                    }}
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Archived
                    <span className="ml-2 text-sm opacity-80">({archivedIssues.length})</span>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              {activeTab !== 'archived' && closedIssuesCount > 0 && (
                <Button 
                  onClick={handleArchiveSelected} 
                  className="text-white transition-all duration-200 shadow-md hover:shadow-lg rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${themeColors.accent} 0%, ${themeColors.primary} 100%)`
                  }}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive Solved ({closedIssuesCount})
                </Button>
              )}
            </div>

            <TabsContent value={activeTab} className="mt-6">
              {currentIssues.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 shadow-sm border border-white/50 text-center">
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
                       style={{ background: `linear-gradient(135deg, ${themeColors.primary}15 0%, ${themeColors.secondary}15 100%)` }}>
                    <AlertTriangle className="h-8 w-8" style={{ color: themeColors.primary }} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {activeTab === 'archived' ? 'No archived issues' : `No ${activeTab === 'short_term' ? 'short-term' : 'long-term'} issues yet`}
                  </h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    {activeTab === 'archived' ? 'Archived issues will appear here once you archive them' : 'Create your first issue to start tracking and solving challenges'}
                  </p>
                  {activeTab !== 'archived' && (
                    <Button 
                      onClick={handleCreateIssue} 
                      className="shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                      style={{ 
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Issue
                    </Button>
                  )}
                </div>
              ) : (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg p-6">
                  <IssuesListClean
                    issues={currentIssues}
                    onEdit={handleEditIssue}
                    onSave={handleSaveIssue}
                    teamMembers={teamMembers}
                    onStatusChange={handleStatusChange}
                    onTimelineChange={handleTimelineChange}
                    onArchive={handleArchive}
                    onUnarchive={handleUnarchive}
                    onVote={handleVote}
                    onMoveToTeam={handleMoveToTeam}
                    onCreateTodo={handleCreateTodoFromIssue}
                    onCreateHeadline={handleCreateHeadlineFromIssue}
                    onSendCascadingMessage={handleSendCascadingMessage}
                    onMarkSolved={handleMarkIssueSolved}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                    showVoting={false}
                    compactGrid={false}
                    tableView={true}
                    showingArchived={activeTab === 'archived'}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

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
          teamId={getEffectiveTeamId(selectedDepartment?.id, user)}
          todo={todoFromIssue ? {
            title: `Follow up: ${todoFromIssue.title}`,
            description: `Related to issue: ${todoFromIssue.title}`,
            assigned_to_id: todoFromIssue.owner_id || user?.id,
            due_date: todoFromIssue.due_date || format(addDays(new Date(), 7), 'yyyy-MM-dd')
          } : null}
        />

        {/* Headline Dialog */}
        <HeadlineDialog
          open={showHeadlineDialog}
          onOpenChange={(open) => {
            setShowHeadlineDialog(open);
            if (!open) setHeadlineFromIssue(null);
          }}
          headline={headlineFromIssue ? {
            headline: headlineFromIssue.title,
            description: headlineFromIssue.title
          } : null}
          onSave={async (headlineData) => {
            try {
              await headlinesService.createHeadline({
                ...headlineData,
                team_id: selectedDepartment?.id || null
              });
              setShowHeadlineDialog(false);
              setHeadlineFromIssue(null);
              setSuccess('Headline created successfully');
            } catch (error) {
              console.error('Failed to create headline:', error);
              setError('Failed to create headline');
            }
          }}
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
          teamId={getEffectiveTeamId(selectedDepartment?.id, user)}
          timeline={editingIssue ? editingIssue.timeline : activeTab}
          onTimelineChange={handleTimelineChange}
        />
        
        {/* Archive confirmation dialog */}
        <archiveConfirmation.ConfirmationDialog />
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