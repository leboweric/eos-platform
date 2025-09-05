import { useState, useEffect, Component } from 'react';
import { useAuthStore } from '../stores/authStore';
import { issuesService } from '../services/issuesService';
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
import IssuesList from '../components/issues/IssuesList';
import ArchivedIssuesList from '../components/issues/ArchivedIssuesList';
import { MoveIssueDialog } from '../components/issues/MoveIssueDialog';

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

  useEffect(() => {
    fetchIssues();
  }, [selectedDepartment]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

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
      // Update the issue in the database first
      await issuesService.updateIssue(issueId, { timeline: newTimeline });
      
      // Show success message immediately
      setSuccess(`Issue moved to ${newTimeline === 'short_term' ? 'Short Term' : 'Long Term'} ✓`);
      
      // Find the issue in either list to animate it if visible
      const shortTermIssue = shortTermIssues.find(issue => issue.id === issueId);
      const longTermIssue = longTermIssues.find(issue => issue.id === issueId);
      
      if (shortTermIssue || longTermIssue) {
        // Mark as moving for animation
        const markAsMoving = (issue) => ({
          ...issue,
          isMoving: true
        });
        
        if (newTimeline === 'long_term' && shortTermIssue) {
          // Moving from short to long
          setShortTermIssues(prev => prev.map(issue => 
            issue.id === issueId ? markAsMoving(issue) : issue
          ));
          
          // Remove after animation
          setTimeout(() => {
            setShortTermIssues(prev => prev.filter(issue => issue.id !== issueId));
          }, 300);
        } else if (newTimeline === 'short_term' && longTermIssue) {
          // Moving from long to short
          setLongTermIssues(prev => prev.map(issue => 
            issue.id === issueId ? markAsMoving(issue) : issue
          ));
          
          // Remove after animation
          setTimeout(() => {
            setLongTermIssues(prev => prev.filter(issue => issue.id !== issueId));
          }, 300);
        }
      }
      
      // Always refresh the full lists to ensure accuracy
      setTimeout(() => fetchIssues(), 500);
    } catch (error) {
      console.error('Failed to update issue timeline:', error);
      setError(`Failed to move issue: ${error.response?.data?.message || error.message}`);
      // On error, refetch to restore correct state
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
            Issues{selectedDepartment ? ` - ${selectedDepartment.name}` : ''}
          </h1>
          <div className="flex items-center gap-3">
            {activeTab !== 'archived' && closedIssuesCount > 0 && (
              <Button 
                onClick={handleArchiveSelected} 
                variant="ghost"
                className="text-gray-600 hover:text-gray-900"
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive Solved ({closedIssuesCount})
              </Button>
            )}
            {activeTab !== 'archived' && (
              <Button onClick={handleCreateIssue} className="bg-gray-900 hover:bg-gray-800 text-white">
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
          <Alert className="border-green-200 bg-green-50 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckSquare className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 font-medium">{success}</AlertDescription>
          </Alert>
        )}

        {/* Clean Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-transparent border-0 p-0 h-auto mb-8 border-b border-gray-100">
            <TabsTrigger 
              value="short_term" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-3 px-4 font-medium"
            >
              Short Term
              <span className="ml-2 text-sm text-gray-500">({shortTermIssues.length})</span>
            </TabsTrigger>
            <TabsTrigger 
              value="long_term" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-3 px-4 font-medium"
            >
              Long Term
              <span className="ml-2 text-sm text-gray-500">({longTermIssues.length})</span>
            </TabsTrigger>
            <TabsTrigger 
              value="archived" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-3 px-4 font-medium"
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
                <IssuesList
                  issues={currentIssues}
                  onEdit={handleEditIssue}
                  onStatusChange={handleStatusChange}
                  onTimelineChange={handleTimelineChange}
                  onArchive={handleArchive}
                  onVote={handleVote}
                  onMoveToTeam={handleMoveToTeam}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  showVoting={false} // Will be enabled during Weekly Accountability Meetings
                  compactGrid={activeTab !== 'archived'} // Use compact grid for Short Term and Long Term only
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
          onTimelineChange={handleTimelineChange}
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