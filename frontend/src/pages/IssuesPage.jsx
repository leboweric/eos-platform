import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { issuesService } from '../services/issuesService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Plus,
  Loader2,
  AlertCircle,
  Calendar,
  User,
  Paperclip,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import IssueDialog from '../components/issues/IssueDialog';
import IssueCard from '../components/issues/IssueCard';

const IssuesPage = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('short_term');
  
  // Issues data
  const [shortTermIssues, setShortTermIssues] = useState([]);
  const [longTermIssues, setLongTermIssues] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  
  // Dialog states
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both short-term and long-term issues
      const [shortTermResponse, longTermResponse] = await Promise.all([
        issuesService.getIssues('short_term'),
        issuesService.getIssues('long_term')
      ]);
      
      setShortTermIssues(shortTermResponse.data.issues || []);
      setLongTermIssues(longTermResponse.data.issues || []);
      
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
          timeline: activeTab
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

  const handleDeleteIssue = async (issueId) => {
    if (!confirm('Are you sure you want to delete this issue?')) return;
    
    try {
      await issuesService.deleteIssue(issueId);
      setSuccess('Issue deleted successfully');
      await fetchIssues();
    } catch (error) {
      console.error('Failed to delete issue:', error);
      setError('Failed to delete issue');
    }
  };

  const handleStatusChange = async (issueId, newStatus) => {
    try {
      await issuesService.updateIssue(issueId, { status: newStatus });
      await fetchIssues();
    } catch (error) {
      console.error('Failed to update issue status:', error);
      setError('Failed to update issue status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
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
      case 'in-progress':
        return <Clock className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const currentIssues = activeTab === 'short_term' ? shortTermIssues : longTermIssues;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Issues List
            </h1>
            <p className="text-gray-600 mt-2 text-lg">Track and resolve organizational issues</p>
          </div>
          <Button onClick={handleCreateIssue} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Add Issue
          </Button>
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-14 bg-white shadow-sm">
            <TabsTrigger value="short_term" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-lg font-medium">
              <Calendar className="mr-2 h-5 w-5" />
              Short Term (This Quarter)
            </TabsTrigger>
            <TabsTrigger value="long_term" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-lg font-medium">
              <Calendar className="mr-2 h-5 w-5" />
              Long Term (Next Quarter)
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {currentIssues.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No {activeTab === 'short_term' ? 'short-term' : 'long-term'} issues yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Create your first issue to start tracking
                  </p>
                  <Button onClick={handleCreateIssue}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Issue
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {currentIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onEdit={handleEditIssue}
                    onDelete={handleDeleteIssue}
                    onStatusChange={handleStatusChange}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Issue Dialog */}
        {showIssueDialog && (
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
        )}
      </div>
    </div>
  );
};

export default IssuesPage;