import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Target,
  CheckSquare,
  Calendar,
  ClipboardList,
  ListChecks,
  AlertTriangle,
  Building2,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PriorityCard from '../components/priorities/PriorityCardClean';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { meetingsService } from '../services/meetingsService';
import { FileText, GitBranch, Smile, BarChart, Newspaper, ListTodo, ArrowLeftRight, Archive, Plus, MessageSquare, Send, Star, User } from 'lucide-react';
import { quarterlyPrioritiesService } from '../services/quarterlyPrioritiesService';
import { issuesService } from '../services/issuesService';
import { organizationService } from '../services/organizationService';
import IssuesList from '../components/issues/IssuesListClean';
import IssueDialog from '../components/issues/IssueDialog';
import TodoDialog from '../components/todos/TodoDialog';
import { todosService } from '../services/todosService';
import TwoPagePlanView from '../components/vto/TwoPagePlanView';

const QuarterlyPlanningMeetingPage = () => {
  const { user } = useAuthStore();
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('objectives');
  const [success, setSuccess] = useState(null);
  
  // Meeting data
  const [priorities, setPriorities] = useState([]);
  const [issues, setIssues] = useState([]);
  const [todos, setTodos] = useState([]);
  const [vtoData, setVtoData] = useState(null);
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [meetingStartTime, setMeetingStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [meetingRating, setMeetingRating] = useState(null);
  
  // Dialog states for issues and todos
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [showTodoDialog, setShowTodoDialog] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showAddPriority, setShowAddPriority] = useState(false);
  const [priorityForm, setPriorityForm] = useState({
    title: '',
    description: '',
    ownerId: '',
    dueDate: '',
    isCompanyPriority: false
  });
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    companyPriorities: false,
    individualPriorities: {}
  });

  const agendaItems = [
    { id: 'objectives', label: 'Objectives', duration: null, icon: Target, description: 'Review meeting goals' },
    { id: 'check-in', label: 'Check In', duration: 15, icon: CheckSquare, description: 'Team connection' },
    { id: 'review-prior', label: 'Review Prior Quarter', duration: 30, icon: Calendar, description: 'Check progress' },
    { id: '2-page-plan', label: '2-Page Plan', duration: 60, icon: ClipboardList, description: 'Review strategic plan' },
    { id: 'learning', label: 'Learning', duration: 60, icon: MessageSquare, description: 'Share insights & learnings' },
    { id: 'quarterly-priorities', label: 'Quarterly Priorities', duration: 120, icon: ListChecks, description: 'Set new priorities' },
    { id: 'issues', label: 'Issues', duration: 180, icon: AlertTriangle, description: 'IDS - Identify, Discuss, Solve' },
    { id: 'next-steps', label: 'Next Steps', duration: 7, icon: ClipboardList, description: 'Action items' },
    { id: 'conclude', label: 'Conclude', duration: 8, icon: CheckSquare, description: 'Wrap up & rate' }
  ];

  // Timer effect
  useEffect(() => {
    let interval;
    if (meetingStarted && meetingStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - meetingStartTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [meetingStarted, meetingStartTime]);

  // Auto-start meeting on component mount
  useEffect(() => {
    setMeetingStarted(true);
    setMeetingStartTime(Date.now());
  }, []);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const concludeMeeting = async () => {
    if (!meetingRating) {
      setError('Please rate the meeting before concluding');
      return;
    }
    
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      const duration = Math.floor((Date.now() - meetingStartTime) / 60000); // in minutes
      
      await meetingsService.concludeMeeting(orgId, effectiveTeamId, {
        meetingType: 'quarterly_planning',
        duration,
        rating: meetingRating,
        summary: {
          priorities: priorities.length,
          completed: priorities.filter(p => p.status === 'complete').length
        }
      });
      
      setSuccess('Meeting concluded and summary sent to team!');
      setTimeout(() => {
        navigate('/quarterly-priorities');
      }, 2000);
    } catch (error) {
      console.error('Failed to conclude meeting:', error);
      setError('Failed to conclude meeting');
    }
  };

  useEffect(() => {
    if (activeSection === 'review-prior' || activeSection === 'quarterly-priorities') {
      fetchPrioritiesData();
    } else if (activeSection === 'issues') {
      fetchIssuesData();
      fetchTeamMembers();
    } else if (activeSection === '2-page-plan') {
      fetchVtoData();
      fetchTeamMembers(); // Need team members for Add Issue dialog
    } else if (activeSection === 'next-steps') {
      fetchTodosData();
    } else {
      // For non-data sections, ensure loading is false
      setLoading(false);
    }
  }, [activeSection, teamId]);


  // Auto-clear success messages after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchPrioritiesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      // Use the simplified current priorities endpoint
      const response = await quarterlyPrioritiesService.getCurrentPriorities(orgId, effectiveTeamId);
      
      // Extract data in the same format as the original page
      const companyPriorities = response.companyPriorities || [];
      const teamMemberPriorities = response.teamMemberPriorities || {};
      
      // Flatten the data structure to a simple array for easier handling
      const allPriorities = [
        ...(companyPriorities || []).map(p => ({ ...p, priority_type: 'company' })),
        ...Object.values(teamMemberPriorities || {}).flatMap(memberData => 
          (memberData.priorities || []).map(p => ({ ...p, priority_type: 'individual' }))
        )
      ];
      
      setPriorities(allPriorities);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch priorities:', error);
      setError('Failed to load priorities');
      setLoading(false);
    }
  };

  const handlePriorityStatusChange = async (priorityId, newStatus) => {
    // Update local state immediately (optimistic update)
    setPriorities(prev => 
      prev.map(p => 
        p.id === priorityId ? { ...p, status: newStatus } : p
      )
    );
    
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      // Update in database
      await quarterlyPrioritiesService.updatePriority(orgId, effectiveTeamId, priorityId, { status: newStatus });
      
      // If marked as off-track, create an issue
      if (newStatus === 'off-track') {
        const priority = priorities.find(p => p.id === priorityId);
        if (priority) {
          try {
            // Ensure we have a valid title
            const priorityTitle = priority.title || priority.name || 'Untitled Priority';
            
            await issuesService.createIssue({
              title: `Off-Track Priority: ${priorityTitle}`,
              description: `Priority "${priorityTitle}" is off-track and needs attention.\n\nOwner: ${priority.owner?.name || 'Unassigned'}\n\nDescription: ${priority.description || 'No description provided'}`,
              timeline: 'short_term',
              ownerId: priority.owner?.id || priority.owner_id || priority.ownerId || user?.id, // Backend expects ownerId
              department_id: effectiveTeamId,
              teamId: effectiveTeamId // Add teamId as well for compatibility
            });
            
            setSuccess('Priority marked off-track and issue created');
          } catch (error) {
            console.error('Failed to create issue for off-track priority:', error);
          }
        }
      } else {
        // Status updated silently - no need for success message that causes screen jumping
      }
      
      // Only set timeout if we actually showed a success message
      if (newStatus === 'off-track') {
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error) {
      console.error('Failed to update priority status:', error);
      
      // Revert the optimistic update on error
      const priority = priorities.find(p => p.id === priorityId);
      if (priority) {
        const previousStatus = newStatus === 'complete' ? 'on-track' : priority.status;
        setPriorities(prev => 
          prev.map(p => 
            p.id === priorityId ? { ...p, status: previousStatus } : p
          )
        );
      }
      
      setError('Failed to update priority status');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUpdateMilestone = async (priorityId, milestoneId, completed) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await quarterlyPrioritiesService.updateMilestone(orgId, effectiveTeamId, priorityId, milestoneId, { completed });
      
      // Update local state
      setPriorities(prev => 
        prev.map(p => {
          if (p.id === priorityId) {
            const updatedMilestones = p.milestones?.map(m => 
              m.id === milestoneId ? { ...m, completed } : m
            ) || [];
            
            // Calculate new progress based on milestone completion
            const completedCount = updatedMilestones.filter(m => m.completed).length;
            const totalCount = updatedMilestones.length;
            const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            
            return {
              ...p,
              milestones: updatedMilestones,
              progress: newProgress
            };
          }
          return p;
        })
      );
      
      setSuccess('Milestone updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to update milestone:', error);
      setError('Failed to update milestone');
    }
  };

  const handleEditMilestone = async (priorityId, milestoneId, milestoneData) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await quarterlyPrioritiesService.updateMilestone(orgId, effectiveTeamId, priorityId, milestoneId, milestoneData);
      
      // Update local state
      setPriorities(prev => 
        prev.map(p => {
          if (p.id === priorityId) {
            return {
              ...p,
              milestones: p.milestones?.map(m => 
                m.id === milestoneId ? { ...m, ...milestoneData } : m
              )
            };
          }
          return p;
        })
      );
      
      setSuccess('Milestone updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to edit milestone:', error);
      setError('Failed to edit milestone');
      setTimeout(() => setError(null), 3000);
    }
  };

  const fetchIssuesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      const response = await issuesService.getIssues(null, false, effectiveTeamId);
      // Sort issues by vote count (highest first)
      const sortedIssues = (response.data.issues || []).sort((a, b) => 
        (b.vote_count || 0) - (a.vote_count || 0)
      );
      setIssues(sortedIssues);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
      setError('Failed to load issues');
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      const response = await todosService.getTodos(null, null, true, effectiveTeamId);
      setTeamMembers(response.data.teamMembers || []);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  const fetchTodosData = async () => {
    try {
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      const response = await todosService.getTodos(null, null, false, effectiveTeamId);
      // Filter to only show open todos
      const openTodos = (response.data.todos || []).filter(
        todo => todo.status !== 'complete' && todo.status !== 'completed' && todo.status !== 'cancelled'
      );
      setTodos(openTodos);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    }
  };

  const handleAddTodo = () => {
    setEditingTodo(null);
    setShowTodoDialog(true);
  };

  const handleCreatePriority = async () => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      const priorityData = {
        ...priorityForm,
        quarter: Math.ceil((new Date().getMonth() + 1) / 3),
        year: new Date().getFullYear(),
        status: 'on-track',
        priority_type: priorityForm.isCompanyPriority ? 'company' : 'individual',
        team_id: effectiveTeamId
      };
      
      await quarterlyPrioritiesService.createPriority(orgId, effectiveTeamId, priorityData);
      
      setShowAddPriority(false);
      setPriorityForm({
        title: '',
        description: '',
        ownerId: '',
        dueDate: '',
        isCompanyPriority: false
      });
      setSuccess('Priority created successfully');
      // Refresh priorities
      await fetchPrioritiesData();
    } catch (error) {
      console.error('Failed to create priority:', error);
      setError('Failed to create priority');
    }
  };

  const handleVote = async (issueId, shouldVote) => {
    try {
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
      
      // Update and sort issues by vote count
      setIssues(prevIssues => {
        const updated = prevIssues.map(updateVote);
        return updated.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
      });
      
      // Make API call to toggle vote
      if (shouldVote) {
        await issuesService.voteForIssue(issueId);
      } else {
        await issuesService.unvoteForIssue(issueId);
      }
    } catch (error) {
      console.error('Failed to update vote:', error);
      // Revert on error
      await fetchIssuesData();
    }
  };

  const fetchVtoData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Just set a flag to show the TwoPagePlanView component
      // The component will fetch its own data
      setVtoData(true);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch VTO data:', error);
      setError('Failed to load 2-Page Plan');
      setLoading(false);
    }
  };

  // Toggle functions for collapsible sections
  const toggleCompanyPriorities = () => {
    setExpandedSections(prev => ({
      ...prev,
      companyPriorities: !prev.companyPriorities
    }));
  };

  const toggleIndividualPriorities = (memberId) => {
    setExpandedSections(prev => ({
      ...prev,
      individualPriorities: {
        ...prev.individualPriorities,
        [memberId]: !prev.individualPriorities[memberId]
      }
    }));
  };

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    setError(null);
  };

  const getNextSection = () => {
    const currentIndex = agendaItems.findIndex(item => item.id === activeSection);
    if (currentIndex < agendaItems.length - 1) {
      return agendaItems[currentIndex + 1].id;
    }
    return null;
  };

  const getPreviousSection = () => {
    const currentIndex = agendaItems.findIndex(item => item.id === activeSection);
    if (currentIndex > 0) {
      return agendaItems[currentIndex - 1].id;
    }
    return null;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    switch (activeSection) {
      case 'objectives':
        return (
          <Card className="border-0 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Target className="h-5 w-5 text-blue-600" />
                    Meeting Objectives
                  </CardTitle>
                  <CardDescription className="mt-1">Review meeting goals and expected outcomes</CardDescription>
                </div>
                <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                  5 minutes
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <p className="text-gray-700 leading-relaxed">
                  This quarterly planning meeting is designed to help your team transition effectively 
                  from one quarter to the next.
                </p>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                  <h4 className="font-semibold text-lg mb-4 text-gray-900">Meeting Goals:</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span className="text-gray-700">Clear Vision, All on Same Page</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span className="text-gray-700">Clear Plan for Next Quarter</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span className="text-gray-700">Resolve All Key Issues</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'check-in':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Team Check-In
              </CardTitle>
              <CardDescription>Connect as a team before diving into business (10 minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Go around the room and have each team member share:
                </p>
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium">1. Bests</h4>
                    <p className="text-sm text-gray-600">Personal and professional Best from the last 90 days</p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium">2. Update</h4>
                    <p className="text-sm text-gray-600">What's working/not working?</p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium">3. Expectations for this session</h4>
                    <p className="text-sm text-gray-600">What do you hope to accomplish in this meeting?</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'review-prior':
        if (loading) {
          return (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Review Prior Quarter
                  </div>
                  {priorities.length > 0 && (
                    <div className="text-sm font-normal">
                      <span className={`text-2xl font-semibold ${
                        Math.round((priorities.filter(p => p.status === 'complete').length / priorities.length) * 100) >= 85
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {Math.round((priorities.filter(p => p.status === 'complete').length / priorities.length) * 100)}%
                      </span>
                      <span className="text-gray-500 ml-2">Complete</span>
                      <span className="text-gray-400 ml-2">
                        ({priorities.filter(p => p.status === 'complete').length}/{priorities.length})
                      </span>
                    </div>
                  )}
                </CardTitle>
                <CardDescription>Check progress on last quarter's priorities</CardDescription>
              </CardHeader>
            </Card>
            {priorities.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No priorities found for this quarter.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate('/quarterly-priorities')}
                  >
                    Go to Quarterly Priorities
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-center">
                    <span className="font-semibold">Status Check:</span> Review what was accomplished, what wasn't, and why. Be honest about successes and failures.
                  </p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3 justify-center">
                  {priorities.filter(p => p.status === 'complete').length > 0 && (
                    <Button
                      onClick={async () => {
                        try {
                          const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
                          const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
                          
                          // Archive completed priorities
                          const completedPriorities = priorities.filter(p => p.status === 'complete');
                          for (const priority of completedPriorities) {
                            await quarterlyPrioritiesService.archivePriority(orgId, effectiveTeamId, priority.id);
                          }
                          
                          setSuccess(`${completedPriorities.length} completed priorities archived`);
                          fetchPrioritiesData(); // Refresh the list
                        } catch (error) {
                          console.error('Failed to archive priorities:', error);
                          setError('Failed to archive completed priorities');
                        }
                      }}
                      variant="outline"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archive Complete Priorities ({priorities.filter(p => p.status === 'complete').length})
                    </Button>
                  )}
                  
                  {priorities.filter(p => p.status !== 'complete').length > 0 && (
                    <Button
                      onClick={async () => {
                        try {
                          const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
                          const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
                          
                          // Add incomplete priorities to issues list
                          const incompletePriorities = priorities.filter(p => p.status !== 'complete');
                          let issuesCreated = 0;
                          
                          for (const priority of incompletePriorities) {
                            try {
                              await issuesService.createIssue({
                                title: `Incomplete Priority: ${priority.title || priority.name}`,
                                description: `This priority was not completed last quarter and needs attention.\n\nOriginal Description: ${priority.description || 'No description'}\nOwner: ${priority.owner?.name || 'Unassigned'}\nStatus: ${priority.status || 'incomplete'}`,
                                timeline: 'short_term',
                                ownerId: priority.owner?.id || priority.owner_id || null,
                                department_id: effectiveTeamId,
                                status: 'open',
                                priority_level: 'high',
                                related_priority_id: priority.id
                              });
                              issuesCreated++;
                            } catch (error) {
                              // Skip if duplicate or other error
                              console.log(`Could not create issue for priority: ${priority.title}`, error);
                            }
                          }
                          
                          if (issuesCreated > 0) {
                            setSuccess(`${issuesCreated} issue(s) created from incomplete priorities`);
                          } else {
                            setError('Issues may already exist for these priorities');
                          }
                        } catch (error) {
                          console.error('Failed to create issues:', error);
                          setError('Failed to create issues from incomplete priorities');
                        }
                      }}
                      variant="outline"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Add Incomplete Priorities to Issues List ({priorities.filter(p => p.status !== 'complete').length})
                    </Button>
                  )}
                </div>
                
                {/* Company Priorities Section */}
                {(() => {
                  const companyPriorities = priorities.filter(p => p.priority_type === 'company');
                  return companyPriorities.length > 0 && (
                    <div>
                      <div 
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={toggleCompanyPriorities}
                      >
                        <div className="flex items-center gap-3">
                          {expandedSections.companyPriorities ? (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-600" />
                          )}
                          <Building2 className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold">
                            Company Priorities ({companyPriorities.length})
                          </h3>
                        </div>
                      </div>
                      {expandedSections.companyPriorities && (
                        <div className="space-y-4 ml-7 mt-4">
                          {(companyPriorities || []).map(priority => (
                          <PriorityCard 
                            key={priority.id} 
                            priority={priority} 
                            readOnly={false}
                            onIssueCreated={(message) => {
                              setSuccess(message);
                              setTimeout(() => setSuccess(null), 3000);
                            }}
                            onStatusChange={handlePriorityStatusChange}
                            onToggleMilestone={handleUpdateMilestone}
                            onEditMilestone={handleEditMilestone}
                            teamMembers={teamMembers}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  );
                })()}
                
                {/* Individual Priorities Section */}
                {(() => {
                  const individualPriorities = priorities.filter(p => p.priority_type !== 'company');
                  const groupedByOwner = individualPriorities.reduce((acc, priority) => {
                    const ownerId = priority.owner?.id || 'unassigned';
                    if (!acc[ownerId]) {
                      acc[ownerId] = [];
                    }
                    acc[ownerId].push(priority);
                    return acc;
                  }, {});
                  
                  return Object.keys(groupedByOwner).length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg">
                        <Users className="h-5 w-5 text-purple-600" />
                        <h3 className="text-lg font-semibold">
                          Individual Priorities ({individualPriorities.length})
                        </h3>
                      </div>
                      {Object.entries(groupedByOwner).map(([ownerId, ownerPriorities]) => {
                        const owner = ownerPriorities[0]?.owner;
                        const isExpanded = expandedSections.individualPriorities[ownerId];
                        return (
                          <div key={ownerId} className="ml-7">
                            <div 
                              className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => toggleIndividualPriorities(ownerId)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-600" />
                              )}
                              <h4 className="text-md font-medium">
                                {owner?.name || 'Unassigned'} ({ownerPriorities.length})
                              </h4>
                            </div>
                            {isExpanded && (
                              <div className="space-y-4 ml-7 mt-4">
                                {ownerPriorities.map(priority => (
                                  <PriorityCard 
                                    key={priority.id} 
                                    priority={priority} 
                                    readOnly={false}
                                    onIssueCreated={(message) => {
                                      setSuccess(message);
                                      setTimeout(() => setSuccess(null), 3000);
                                    }}
                                    onStatusChange={handlePriorityStatusChange}
                                    onToggleMilestone={handleUpdateMilestone}
                                    onEditMilestone={handleEditMilestone}
                                    teamMembers={teamMembers}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );

      case '2-page-plan':
        if (loading) {
          return (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <ClipboardList className="h-5 w-5 text-indigo-600" />
                      2-Page Plan
                    </CardTitle>
                    <CardDescription className="mt-1">Review and align your strategic vision</CardDescription>
                  </div>
                  <Button onClick={() => {
                    setEditingIssue(null);
                    setShowIssueDialog(true);
                  }} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Issue
                  </Button>
                </div>
              </CardHeader>
            </Card>
            
            {/* Embedded VTO - Without Issues and Quarterly Priorities sections */}
            <div className="bg-white rounded-lg shadow-sm">
              {vtoData ? (
                <TwoPagePlanView hideIssuesAndPriorities={true} />
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">Loading 2-Page Plan data...</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );

      case 'quarterly-priorities':
        if (loading) {
          return (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ListChecks className="h-5 w-5" />
                      Set Quarterly Priorities
                    </CardTitle>
                    <CardDescription>Define 3-7 priorities for the upcoming quarter (120 minutes)</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
                        window.open(`/organizations/${orgId}/smart-rock-assistant`, '_blank');
                      }}
                      variant="outline"
                      className="text-purple-600 border-purple-300 hover:bg-purple-50"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      SMART Assistant
                    </Button>
                    <Button
                      onClick={() => {
                        setPriorityForm({
                          title: '',
                          description: '',
                          ownerId: user?.id || '',
                          dueDate: '',
                          isCompanyPriority: false
                        });
                        setShowAddPriority(true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Priority
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
            {priorities.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No priorities found for this quarter.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate('/quarterly-priorities')}
                  >
                    Go to Quarterly Priorities
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-center">
                    <span className="font-semibold">Priority Setting:</span> Each priority should be SMART (Specific, Measurable, Achievable, Relevant, Time-bound). Limit to 3-7 priorities total.
                  </p>
                </div>
                {/* Company Priorities Section */}
                {(() => {
                  const companyPriorities = priorities.filter(p => p.priority_type === 'company');
                  return companyPriorities.length > 0 && (
                    <div>
                      <div 
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={toggleCompanyPriorities}
                      >
                        <div className="flex items-center gap-3">
                          {expandedSections.companyPriorities ? (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-600" />
                          )}
                          <Building2 className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold">
                            Company Priorities ({companyPriorities.length})
                          </h3>
                        </div>
                      </div>
                      {expandedSections.companyPriorities && (
                        <div className="space-y-4 ml-7 mt-4">
                          {(companyPriorities || []).map(priority => (
                            <PriorityCard 
                              key={priority.id} 
                              priority={priority} 
                              readOnly={false}
                              onIssueCreated={(message) => {
                                setSuccess(message);
                                setTimeout(() => setSuccess(null), 3000);
                              }}
                              onStatusChange={handlePriorityStatusChange}
                              onToggleMilestone={handleUpdateMilestone}
                              onEditMilestone={handleEditMilestone}
                              teamMembers={teamMembers}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                {/* Individual Priorities Section */}
                {(() => {
                  const individualPriorities = priorities.filter(p => p.priority_type !== 'company');
                  const groupedByOwner = individualPriorities.reduce((acc, priority) => {
                    const ownerId = priority.owner?.id || 'unassigned';
                    if (!acc[ownerId]) {
                      acc[ownerId] = [];
                    }
                    acc[ownerId].push(priority);
                    return acc;
                  }, {});
                  
                  return Object.keys(groupedByOwner).length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg">
                        <Users className="h-5 w-5 text-purple-600" />
                        <h3 className="text-lg font-semibold">
                          Individual Priorities ({individualPriorities.length})
                        </h3>
                      </div>
                      {Object.entries(groupedByOwner).map(([ownerId, ownerPriorities]) => {
                        const owner = ownerPriorities[0]?.owner;
                        const isExpanded = expandedSections.individualPriorities[ownerId];
                        return (
                          <div key={ownerId} className="ml-7">
                            <div 
                              className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => toggleIndividualPriorities(ownerId)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-600" />
                              )}
                              <h4 className="text-md font-medium">
                                {owner?.name || 'Unassigned'} ({ownerPriorities.length})
                              </h4>
                            </div>
                            {isExpanded && (
                              <div className="space-y-4 ml-7 mt-4">
                                {ownerPriorities.map(priority => (
                                  <PriorityCard 
                                    key={priority.id} 
                                    priority={priority} 
                                    readOnly={false}
                                    onIssueCreated={(message) => {
                                      setSuccess(message);
                                      setTimeout(() => setSuccess(null), 3000);
                                    }}
                                    onStatusChange={handlePriorityStatusChange}
                                    onToggleMilestone={handleUpdateMilestone}
                                    onEditMilestone={handleEditMilestone}
                                    teamMembers={teamMembers}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );

      case 'issues':
        if (loading) {
          return (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      IDS (Issues)
                    </CardTitle>
                    <CardDescription className="mt-1">Identify, Discuss, and Solve issues</CardDescription>
                  </div>
                  <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                    180 minutes
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="border border-gray-200 bg-white rounded-lg p-4 mb-4">
                  <p className="text-gray-700 text-center">
                    <span className="font-semibold">Quick voting:</span> Everyone votes on the most important issues. Then discuss and solve the top-voted issues using IDS.
                  </p>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    {(() => {
                      const closedIssuesCount = issues.filter(issue => issue.status === 'closed').length;
                      return closedIssuesCount > 0 && (
                        <Button 
                          onClick={async () => {
                            try {
                              await issuesService.archiveClosedIssues();
                              setSuccess(`${closedIssuesCount} closed issue${closedIssuesCount > 1 ? 's' : ''} archived`);
                              await fetchIssuesData();
                            } catch (error) {
                              console.error('Failed to archive closed issues:', error);
                              setError('Failed to archive closed issues');
                            }
                          }}
                          variant="outline"
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive Solved ({closedIssuesCount})
                        </Button>
                      );
                    })()}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddTodo} className="bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Add To Do
                    </Button>
                    <Button onClick={() => {
                      setEditingIssue(null);
                      setShowIssueDialog(true);
                    }} className="bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Issue
                    </Button>
                  </div>
                </div>
                {issues.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No issues found.</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
            
            {/* Embedded Issues List */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <IssuesList 
                issues={issues || []}
                onEdit={(issue) => {
                  setEditingIssue(issue);
                  setShowIssueDialog(true);
                }}
                onStatusChange={async (issueId, newStatus) => {
                  try {
                    // Optimistic update
                    setIssues(prev => 
                      prev.map(issue => 
                        issue.id === issueId ? { ...issue, status: newStatus } : issue
                      )
                    );
                    
                    await issuesService.updateIssue(issueId, { status: newStatus });
                  } catch (error) {
                    console.error('Failed to update status:', error);
                    // Revert on error
                    await fetchIssuesData();
                  }
                }}
                onTimelineChange={async (issueId, newTimeline) => {
                  try {
                    // Optimistic update
                    setIssues(prev => 
                      prev.map(issue => 
                        issue.id === issueId ? { ...issue, timeline: newTimeline } : issue
                      )
                    );
                    
                    await issuesService.updateIssue(issueId, { timeline: newTimeline });
                    setSuccess(`Issue moved to ${newTimeline === 'short_term' ? 'Short Term' : 'Long Term'}`);
                  } catch (error) {
                    console.error('Failed to update timeline:', error);
                    setError('Failed to move issue');
                    // Revert on error
                    await fetchIssuesData();
                  }
                }}
                onArchive={async (issueId) => {
                  try {
                    // Optimistic update - remove from list
                    setIssues(prev => prev.filter(issue => issue.id !== issueId));
                    
                    await issuesService.archiveIssue(issueId);
                    setSuccess('Issue archived');
                  } catch (error) {
                    console.error('Failed to archive:', error);
                    setError('Failed to archive issue');
                    // Revert on error
                    await fetchIssuesData();
                  }
                }}
                onVote={handleVote}
                getStatusColor={(status) => {
                  switch (status) {
                    case 'open':
                      return 'bg-yellow-100 text-yellow-800';
                    case 'closed':
                      return 'bg-gray-100 text-gray-800';
                    default:
                      return 'bg-gray-100 text-gray-800';
                  }
                }}
                getStatusIcon={(status) => null}
                readOnly={false}
                showVoting={true}
              />
            </div>
            
            {/* Add Priority Dialog */}
            <Dialog open={showAddPriority} onOpenChange={setShowAddPriority}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Priority</DialogTitle>
                  <DialogDescription>
                    Create a new priority for Q{Math.ceil((new Date().getMonth() + 1) / 3)} {new Date().getFullYear()}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={priorityForm.title}
                      onChange={(e) => setPriorityForm({ ...priorityForm, title: e.target.value })}
                      placeholder="Enter priority title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={priorityForm.description}
                      onChange={(e) => setPriorityForm({ ...priorityForm, description: e.target.value })}
                      placeholder="Describe what needs to be accomplished"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="owner">Owner</Label>
                      <Select
                        value={priorityForm.ownerId}
                        onValueChange={(value) => setPriorityForm({ ...priorityForm, ownerId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.map(member => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.first_name} {member.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={priorityForm.dueDate}
                        onChange={(e) => setPriorityForm({ ...priorityForm, dueDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isCompany"
                      checked={priorityForm.isCompanyPriority}
                      onChange={(e) => setPriorityForm({ ...priorityForm, isCompanyPriority: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="isCompany">This is a company-wide priority</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddPriority(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePriority}>
                    Create Priority
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );

      case 'next-steps':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Next Steps
              </CardTitle>
              <CardDescription>Review open action items and responsibilities (7 minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-600">
                    Review all open to-dos before concluding the meeting:
                  </p>
                  <Button
                    onClick={handleAddTodo}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add To-Do
                  </Button>
                </div>
                
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : todos.length === 0 ? (
                  <div className="bg-gray-50 p-6 rounded-lg text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">No open to-dos!</p>
                    <p className="text-sm text-gray-500 mt-1">All action items have been completed.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <span className="font-semibold">{todos.length} open to-do{todos.length !== 1 ? 's' : ''}</span> to review
                      </p>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {todos.map((todo) => (
                        <div key={todo.id} className="relative bg-white border border-gray-200 rounded-lg p-4 pl-6 hover:shadow-sm transition-shadow">
                          {/* Blue left edge indicator */}
                          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-blue-500" />
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{todo.title}</h4>
                              {todo.description && (
                                <p className="text-sm text-gray-600 mt-1">{todo.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {todo.assigned_to?.first_name} {todo.assigned_to?.last_name || 'Unassigned'}
                                </span>
                                {todo.due_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(todo.due_date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'conclude':
        return (
          <Card className="border-0 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <CheckSquare className="h-5 w-5 text-green-600" />
                    Meeting Conclusion
                  </CardTitle>
                  <CardDescription className="mt-1">Wrap up and capture key takeaways</CardDescription>
                </div>
                <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                  8 minutes
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                      Feedback
                    </h4>
                    <p className="text-sm text-gray-600">Where's your head? How are you feeling?</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-600" />
                      Expectations
                    </h4>
                    <p className="text-sm text-gray-600">Were your expectations met?</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Star className="h-4 w-4 text-purple-600" />
                      Session Rating
                    </h4>
                    <p className="text-sm text-gray-600">Rate effectiveness (1-10)</p>
                  </div>
                </div>
                
                <div className="text-center py-8 border-t border-gray-100">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Great Planning Session!</h3>
                  <p className="text-gray-600">Your quarterly priorities are set and the team is aligned.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quarterly Planning Meeting</h1>
              <p className="text-gray-600 mt-2">Plan and align for the upcoming quarter</p>
            </div>
            {meetingStarted && (
              <div className="flex items-center gap-4">
                <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-lg font-mono font-semibold text-gray-900">
                      {formatTime(elapsedTime)}
                    </span>
                  </div>
                </div>
                {activeSection === 'conclude' && (
                  <Button
                    onClick={concludeMeeting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Conclude Meeting
                  </Button>
                )}
              </div>
            )}
            {/* Meeting auto-starts - no start button needed */}
          </div>

          {/* Alerts */}
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeSection} onValueChange={handleSectionChange} className="space-y-6">
          <TabsList className="w-full grid grid-cols-4 lg:grid-cols-8 gap-2 h-auto p-1 bg-white shadow-sm">
            {agendaItems.map((item) => {
              const Icon = item.icon;
              const currentIndex = agendaItems.findIndex(i => i.id === activeSection);
              const itemIndex = agendaItems.findIndex(i => i.id === item.id);
              const isCompleted = itemIndex < currentIndex;
              
              return (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700"
                >
                  <Icon className={`h-5 w-5 ${
                    isCompleted ? 'text-green-600' : ''
                  }`} />
                  <span className="text-xs font-medium">{item.label}</span>
                  {item.duration && <span className="text-xs text-gray-500">{item.duration}m</span>}
                  {isCompleted && (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm">
            {renderContent()}
          </div>
        </Tabs>

        {/* Meeting Rating Dialog for Conclude */}
        {activeSection === 'conclude' && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Rate This Meeting</h3>
            <div className="flex gap-2 mb-4">
              {[...Array(10)].map((_, i) => (
                <Button
                  key={i + 1}
                  variant={meetingRating === i + 1 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMeetingRating(i + 1)}
                  className={`w-10 h-10 ${
                    meetingRating === i + 1 
                      ? 'bg-indigo-600 hover:bg-indigo-700' 
                      : ''
                  }`}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Add Priority Dialog */}
        <Dialog open={showAddPriority} onOpenChange={setShowAddPriority}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Priority</DialogTitle>
              <DialogDescription>
                Create a new quarterly priority. Make it SMART: Specific, Measurable, Achievable, Relevant, and Time-bound.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={priorityForm.title}
                  onChange={(e) => setPriorityForm({ ...priorityForm, title: e.target.value })}
                  placeholder="Enter priority title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={priorityForm.description}
                  onChange={(e) => setPriorityForm({ ...priorityForm, description: e.target.value })}
                  placeholder="Describe what success looks like"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="owner">Owner *</Label>
                  <Select
                    value={priorityForm.ownerId}
                    onValueChange={(value) => setPriorityForm({ ...priorityForm, ownerId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.first_name} {member.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={priorityForm.dueDate}
                    onChange={(e) => setPriorityForm({ ...priorityForm, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isCompany"
                  checked={priorityForm.isCompanyPriority}
                  onChange={(e) => setPriorityForm({ ...priorityForm, isCompanyPriority: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                />
                <Label htmlFor="isCompany" className="text-sm font-medium">
                  Company Priority
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddPriority(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreatePriority}
                disabled={!priorityForm.title || !priorityForm.ownerId || !priorityForm.dueDate}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Create Priority
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Issue Dialog - Shared across all sections */}
        <IssueDialog
          open={showIssueDialog}
          onClose={() => {
            setShowIssueDialog(false);
            setEditingIssue(null);
          }}
          onSave={async (issueData) => {
            try {
              const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
              if (editingIssue) {
                await issuesService.updateIssue(editingIssue.id, issueData);
              } else {
                await issuesService.createIssue({
                  ...issueData,
                  team_id: effectiveTeamId
                });
              }
              // Only refresh issues data if we're on the issues section
              if (activeSection === 'issues') {
                await fetchIssuesData();
              }
              setShowIssueDialog(false);
              setEditingIssue(null);
              setSuccess('Issue saved successfully');
            } catch (error) {
              console.error('Failed to save issue:', error);
              setError('Failed to save issue');
            }
          }}
          issue={editingIssue}
          teamMembers={teamMembers || []}
        />

        {/* Todo Dialog */}
        <TodoDialog
          open={showTodoDialog}
          onOpenChange={setShowTodoDialog}
          todo={editingTodo}
          teamMembers={teamMembers || []}
          onSave={async (todoData) => {
            try {
              const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
              const todoDataWithOrgInfo = {
                ...todoData,
                organization_id: user?.organizationId || user?.organization_id,
                team_id: effectiveTeamId,
                department_id: effectiveTeamId
              };
              
              if (editingTodo) {
                await todosService.updateTodo(editingTodo.id, todoDataWithOrgInfo);
              } else {
                await todosService.createTodo(todoDataWithOrgInfo);
              }
              setShowTodoDialog(false);
              setEditingTodo(null);
              setSuccess('To-do saved successfully');
              
              // Refresh todos after save
              const response = await todosService.getTodos({ status: 'pending' });
              setTodos(response.data || []);
              
              return true;
            } catch (error) {
              console.error('Failed to save todo:', error);
              throw error;
            }
          }}
        />
      </div>
    </div>
  );
};

export default QuarterlyPlanningMeetingPage;