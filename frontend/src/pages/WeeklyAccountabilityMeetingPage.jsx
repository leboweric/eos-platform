import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { meetingsService } from '../services/meetingsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Smile,
  BarChart,
  Target,
  Newspaper,
  ListTodo,
  AlertTriangle,
  CheckSquare,
  ArrowLeftRight,
  ChevronDown,
  Archive,
  Plus,
  MessageSquare,
  Send,
  Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ScorecardTable from '../components/scorecard/ScorecardTableClean';
import FullPriorityCard from '../components/priorities/FullPriorityCard';
import IssuesList from '../components/issues/IssuesListClean';
import IssueDialog from '../components/issues/IssueDialog';
import TodosList from '../components/todos/TodosListClean';
import TodoDialog from '../components/todos/TodoDialog';
import FloatingActionButtons from '../components/meetings/FloatingActionButtons';
import { scorecardService } from '../services/scorecardService';
import { quarterlyPrioritiesService } from '../services/quarterlyPrioritiesService';
import { issuesService } from '../services/issuesService';
import { todosService } from '../services/todosService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, GitBranch } from 'lucide-react';
import { useSelectedTodos } from '../contexts/SelectedTodosContext';

const WeeklyAccountabilityMeetingPage = () => {
  const { user } = useAuthStore();
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('good-news');
  const [success, setSuccess] = useState(null);
  
  // Meeting data
  const [scorecardMetrics, setScorecardMetrics] = useState([]);
  const [weeklyScores, setWeeklyScores] = useState({});
  const [priorities, setPriorities] = useState([]);
  const [issues, setIssues] = useState([]);
  const [selectedIssueIds, setSelectedIssueIds] = useState([]);
  const [todos, setTodos] = useState([]);
  const { selectedTodoIds } = useSelectedTodos();
  const [teamMembers, setTeamMembers] = useState([]);
  const [todaysTodos, setTodaysTodos] = useState([]);
  const [goodNews, setGoodNews] = useState([]);
  const [headlines, setHeadlines] = useState([]);
  
  // Dialog states
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [showTodoDialog, setShowTodoDialog] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    companyPriorities: false,
    individualPriorities: {}
  });
  const [isRTL, setIsRTL] = useState(() => {
    // Load RTL preference from localStorage
    const saved = localStorage.getItem('scorecardRTL');
    return saved === 'true';
  });
  const [showTotal, setShowTotal] = useState(() => {
    // Load showTotal preference from localStorage
    const saved = localStorage.getItem('scorecardShowTotal');
    return saved !== null ? saved === 'true' : true; // Default to true if not set
  });

  // Meeting state
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [meetingStartTime, setMeetingStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [meetingRating, setMeetingRating] = useState(null);
  const [cascadingMessage, setCascadingMessage] = useState('');
  
  // Track initial state for summary
  const [initialIssues, setInitialIssues] = useState([]);
  const [initialTodos, setInitialTodos] = useState([]);
  
  // Reference tools dialogs
  const [showBusinessBlueprint, setShowBusinessBlueprint] = useState(false);
  const [showOrgChart, setShowOrgChart] = useState(false);

  // Clear stale meeting flag on mount if no meeting is active
  useEffect(() => {
    // If we're on the meeting page but no meeting is started, clear the flag
    if (!meetingStarted) {
      sessionStorage.removeItem('meetingActive');
    }
  }, []);

  const agendaItems = [
    { id: 'good-news', label: 'Good News', duration: 5, icon: Smile },
    { id: 'scorecard', label: 'Scorecard', duration: 5, icon: BarChart },
    { id: 'priorities', label: 'Priorities', duration: 5, icon: Target },
    { id: 'headlines', label: 'Headlines', duration: 5, icon: Newspaper },
    { id: 'todo-list', label: 'To Do List', duration: 5, icon: ListTodo },
    { id: 'issues', label: 'Issues', duration: 60, icon: AlertTriangle },
    { id: 'conclude', label: 'Conclude', duration: 5, icon: CheckSquare }
  ];

  useEffect(() => {
    if (activeSection === 'scorecard') {
      fetchScorecardData();
    } else if (activeSection === 'priorities') {
      fetchPrioritiesData();
    } else if (activeSection === 'issues') {
      fetchIssuesData();
    } else if (activeSection === 'todo-list') {
      fetchTodosData();
    } else if (activeSection === 'conclude' && meetingStarted) {
      fetchTodaysTodos();
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

  // Timer effect for meeting duration
  useEffect(() => {
    let interval;
    if (meetingStarted && meetingStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now - meetingStartTime) / 1000); // in seconds
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [meetingStarted, meetingStartTime]);

  const fetchScorecardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      // Use the same default as ScorecardPage if teamId is not provided
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      console.log('Fetching scorecard with:', { orgId, teamId: effectiveTeamId });
      
      const response = await scorecardService.getScorecard(orgId, effectiveTeamId);
      console.log('Scorecard response:', response);
      
      // The response structure from the API has metrics and weeklyScores
      const allMetrics = response.metrics || response.data?.metrics || [];
      const scores = response.weeklyScores || response.data?.weeklyScores || {};
      
      // Filter to only show weekly metrics in the Weekly Accountability Meeting
      const weeklyMetrics = allMetrics.filter(metric => 
        !metric.type || metric.type === 'weekly'
      );
      
      console.log('Filtered weekly metrics:', weeklyMetrics.length, 'out of', allMetrics.length, 'total metrics');
      
      setScorecardMetrics(weeklyMetrics);
      setWeeklyScores(scores);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch scorecard:', error);
      setError('Failed to load scorecard data');
      setLoading(false);
    }
  };

  const fetchPrioritiesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      // Use the same default as ScorecardPage if teamId is not provided
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      // Use the simplified current priorities endpoint
      const response = await quarterlyPrioritiesService.getCurrentPriorities(orgId, effectiveTeamId);
      
      console.log('Weekly Meeting Priorities Response:', response);
      
      // Extract data in the same format as the original page
      const companyPriorities = response.companyPriorities || response.data?.companyPriorities || [];
      const teamMemberPriorities = response.teamMemberPriorities || response.data?.teamMemberPriorities || {};
      const teamMembers = response.teamMembers || response.data?.teamMembers || [];
      
      console.log('Team Members:', teamMembers);
      console.log('Team Member Priorities before filtering:', Object.keys(teamMemberPriorities));
      
      // Extract team member IDs for filtering
      const teamMemberIds = new Set(teamMembers.map(member => member.id));
      
      // Filter individual priorities to only include team members
      const filteredTeamMemberPriorities = {};
      Object.entries(teamMemberPriorities).forEach(([memberId, memberData]) => {
        if (teamMemberIds.has(memberId)) {
          filteredTeamMemberPriorities[memberId] = memberData;
        }
      });
      
      console.log('Team Member Priorities after filtering:', Object.keys(filteredTeamMemberPriorities));
      
      // Flatten the data structure to a simple array for easier handling
      const allPriorities = [
        ...companyPriorities.map(p => ({ ...p, priority_type: 'company' })),
        ...Object.values(filteredTeamMemberPriorities).flatMap(memberData => 
          (memberData.priorities || []).map(p => ({ ...p, priority_type: 'individual' }))
        )
      ];
      
      setPriorities(allPriorities);
      setTeamMembers(teamMembers);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch priorities:', error);
      setError('Failed to load priorities');
      setLoading(false);
    }
  };

  const fetchIssuesData = async () => {
    try {
      setLoading(true);
      // Use the teamId from URL params to filter issues by department
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      const response = await issuesService.getIssues(null, false, effectiveTeamId);
      
      console.log('All issues from API:', response.data.issues);
      console.log('Issues breakdown:', response.data.issues.map(i => ({
        id: i.id,
        title: i.title,
        status: i.status,
        timeline: i.timeline,
        willShow: i.status === 'open' && i.timeline === 'short_term'
      })));
      
      // Include both open and closed issues for the meeting view
      // Users should be able to check/uncheck issues without them disappearing
      const filteredIssues = response.data.issues.filter(i => i.timeline === 'short_term');
      console.log('Filtered short-term issues:', filteredIssues);
      
      // Sort issues by vote count (highest first), then by creation date
      const sortedIssues = filteredIssues.sort((a, b) => {
        const aVotes = a.vote_count || 0;
        const bVotes = b.vote_count || 0;
        
        // If vote counts are different, sort by votes (highest first)
        if (aVotes !== bVotes) {
          return bVotes - aVotes;
        }
        
        // If vote counts are the same, sort by creation date (newest first)
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      setIssues(sortedIssues);
      setTeamMembers(response.data.teamMembers || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
      setError('Failed to load issues');
      setLoading(false);
    }
  };

  const handleVote = async (issueId, shouldVote) => {
    try {
      if (shouldVote) {
        await issuesService.voteForIssue(issueId);
      } else {
        await issuesService.unvoteForIssue(issueId);
      }
      await fetchIssuesData();
    } catch (error) {
      console.error('Failed to vote:', error);
      setError('Failed to update vote');
    }
  };

  const handleArchive = async (issueId) => {
    try {
      await issuesService.archiveIssue(issueId);
      await fetchIssuesData();
    } catch (error) {
      console.error('Failed to archive issue:', error);
      setError('Failed to archive issue');
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedIssueIds.length === 0) {
      setError('Please select issues to archive');
      return;
    }
    
    if (!confirm(`Are you sure you want to archive ${selectedIssueIds.length} selected issue(s)?`)) return;
    
    try {
      // Archive each selected issue
      await Promise.all(selectedIssueIds.map(id => issuesService.archiveIssue(id)));
      setSelectedIssueIds([]);
      await fetchIssuesData();
    } catch (error) {
      console.error('Failed to archive selected issues:', error);
      setError('Failed to archive selected issues');
    }
  };

  const handleArchiveClosedIssues = async () => {
    try {
      // Get all closed issues
      const closedIssues = issues.filter(issue => issue.status === 'closed');
      
      if (closedIssues.length === 0) {
        setError('No closed issues to archive. Check the boxes next to issues you want to archive.');
        return;
      }
      
      if (!window.confirm(`Archive ${closedIssues.length} closed issue${closedIssues.length > 1 ? 's' : ''}?`)) {
        return;
      }
      
      // Archive all closed issues
      await Promise.all(closedIssues.map(issue => issuesService.archiveIssue(issue.id)));
      
      setSuccess(`${closedIssues.length} issue${closedIssues.length > 1 ? 's' : ''} archived successfully`);
      await fetchIssuesData();
    } catch (error) {
      console.error('Failed to archive closed issues:', error);
      setError('Failed to archive closed issues');
    }
  };

  const handleEditIssue = (issue) => {
    setEditingIssue(issue);
    setShowIssueDialog(true);
  };

  const handleSaveIssue = async (issueData) => {
    try {
      if (editingIssue) {
        await issuesService.updateIssue(editingIssue.id, issueData);
        setSuccess('Issue updated successfully');
      } else {
        const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
        await issuesService.createIssue({
          ...issueData,
          timeline: 'short_term', // New issues in meetings are short-term
          department_id: effectiveTeamId
        });
        setSuccess('Issue created successfully');
      }
      
      await fetchIssuesData();
      setShowIssueDialog(false);
      setEditingIssue(null);
    } catch (error) {
      console.error('Failed to save issue:', error);
      setError('Failed to save issue');
    }
  };

  const handleIssueStatusChange = async (issueId, newStatus) => {
    try {
      // Optimistically update the local state first for instant feedback
      setIssues(prev => 
        prev.map(issue => 
          issue.id === issueId ? { ...issue, status: newStatus } : issue
        )
      );
      
      // Then update the backend
      await issuesService.updateIssue(issueId, { status: newStatus });
      
      // Don't show success message for simple checkbox toggles
      // setSuccess(`Issue ${newStatus === 'closed' ? 'closed' : 'reopened'} successfully`);
    } catch (error) {
      console.error('Failed to update issue status:', error);
      setError('Failed to update issue status');
      // Revert on error
      await fetchIssuesData();
    }
  };

  const handleIssueTimelineChange = async (issueId, newTimeline) => {
    try {
      await issuesService.updateIssue(issueId, { timeline: newTimeline });
      await fetchIssuesData(); // Refresh the issues list
      setSuccess(`Issue moved to ${newTimeline.replace('_', ' ')} successfully`);
    } catch (error) {
      console.error('Failed to update issue timeline:', error);
      setError('Failed to update issue timeline');
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

  const fetchTodosData = async () => {
    try {
      setLoading(true);
      const response = await todosService.getTodos('incomplete', null, false, teamId);
      setTodos(response.data.todos || []);
      setTeamMembers(response.data.teamMembers || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
      setError('Failed to load todos');
      setLoading(false);
    }
  };

  const handleTodoUpdate = async () => {
    await fetchTodosData();
  };
  
  const fetchTodaysTodos = async () => {
    try {
      setLoading(true);
      const response = await todosService.getTodos(null, null, true, teamId);
      
      // Filter to only show todos created today
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      console.log('Fetching today\'s todos:', {
        todayStart: todayStart.toISOString(),
        todayEnd: todayEnd.toISOString(),
        allTodos: response.data.todos?.length || 0,
        allTodosData: response.data.todos
      });
      
      const todaysTodosList = (response.data.todos || []).filter(todo => {
        if (!todo.created_at) return false;
        const createdDate = new Date(todo.created_at);
        const isToday = createdDate >= todayStart && createdDate < todayEnd;
        
        console.log('Todo date check:', {
          title: todo.title,
          created_at: todo.created_at,
          createdDate: createdDate.toISOString(),
          isToday
        });
        
        return isToday;
      });
      
      console.log('Today\'s todos found:', todaysTodosList.length);
      setTodaysTodos(todaysTodosList);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch today\'s todos:', error);
      setError('Failed to load today\'s todos');
      setLoading(false);
    }
  };
  
  const handleArchiveSelectedTodos = async () => {
    if (selectedTodoIds.length === 0) {
      setError('Please select to-dos to archive');
      return;
    }
    
    if (!confirm(`Are you sure you want to mark ${selectedTodoIds.length} selected to-do(s) as complete?`)) return;
    
    try {
      // Mark each selected todo as complete
      await Promise.all(selectedTodoIds.map(id => 
        todosService.updateTodo(id, { status: 'complete' })
      ));
      setSelectedTodoIds([]);
      await fetchTodosData();
      setSuccess(`${selectedTodoIds.length} to-do(s) marked as complete`);
    } catch (error) {
      console.error('Failed to complete selected todos:', error);
      setError('Failed to complete selected to-dos');
    }
  };

  const handleEditTodo = (todo) => {
    setEditingTodo(todo);
    setShowTodoDialog(true);
  };

  const handleDeleteTodo = async (todoId) => {
    if (!confirm('Are you sure you want to delete this to-do?')) return;
    
    try {
      await todosService.deleteTodo(todoId);
      setSuccess('To-do deleted successfully');
      await fetchTodosData();
    } catch (error) {
      console.error('Failed to delete todo:', error);
      setError('Failed to delete to-do');
    }
  };

  const handleTodoToIssue = async (todo) => {
    if (!window.confirm(`Convert "${todo.title}" to an issue? This will cancel the to-do.`)) {
      return;
    }

    try {
      // Format the due date for display
      const dueDate = todo.due_date ? new Date(todo.due_date).toLocaleDateString() : 'Not set';
      const assigneeName = todo.assigned_to 
        ? `${todo.assigned_to.first_name} ${todo.assigned_to.last_name}`
        : 'Unassigned';

      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      const issueData = {
        title: todo.title,
        description: `This issue was created from an overdue to-do.\n\nOriginal due date: ${dueDate}\nAssigned to: ${assigneeName}\n\nDescription:\n${todo.description || 'No description provided'}`,
        timeline: 'short_term',
        ownerId: todo.assigned_to?.id || null,
        department_id: effectiveTeamId
      };
      
      await issuesService.createIssue(issueData);
      
      // Mark the todo as cancelled
      await todosService.updateTodo(todo.id, { status: 'cancelled' });
      
      setSuccess('To-do converted to issue successfully');
      await fetchTodosData();
    } catch (error) {
      console.error('Failed to create issue from todo:', error);
      setError('Failed to convert to-do to issue');
    }
  };

  const handleAddTodo = () => {
    setEditingTodo(null);
    setShowTodoDialog(true);
  };

  const handleAddIssue = () => {
    setEditingIssue(null);
    setShowIssueDialog(true);
  };

  const handleSaveTodo = async (todoData) => {
    try {
      let savedTodo;
      
      if (editingTodo) {
        savedTodo = await todosService.updateTodo(editingTodo.id, todoData);
        setSuccess('To-do updated successfully');
      } else {
        savedTodo = await todosService.createTodo({
          ...todoData,
          department_id: teamId
        });
        setSuccess('To-do created successfully');
      }
      
      // Refresh todos if we're on the todo section
      if (activeSection === 'todo-list') {
        await fetchTodosData();
      }
      
      // Also refresh today's todos for the conclude section
      if (meetingStarted) {
        await fetchTodaysTodos();
      }
      
      return savedTodo;
    } catch (error) {
      console.error('Failed to save todo:', error);
      setError('Failed to save to-do');
      throw error; // Re-throw so TodoDialog can handle it
    }
  };

  // Priority handlers for FullPriorityCard
  const handleUpdatePriority = async (priorityId, updates) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await quarterlyPrioritiesService.updatePriority(orgId, teamId, priorityId, updates);
      
      // Update local state
      setPriorities(prev => 
        prev.map(p => 
          p.id === priorityId ? { ...p, ...updates } : p
        )
      );
      
      setSuccess('Priority updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to update priority:', error);
      setError('Failed to update priority');
    }
  };

  const handlePriorityStatusChange = async (priorityId, newStatus) => {
    await handleUpdatePriority(priorityId, { status: newStatus });
  };

  const handleUpdateMilestone = async (priorityId, milestoneId, completed) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await quarterlyPrioritiesService.updateMilestone(orgId, teamId, priorityId, milestoneId, { completed });
      
      // Update local state
      setPriorities(prev => 
        prev.map(p => {
          if (p.id === priorityId) {
            return {
              ...p,
              milestones: p.milestones.map(m => 
                m.id === milestoneId ? { ...m, completed } : m
              )
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

  const handleCreateMilestone = async (priorityId, milestoneData) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      const newMilestone = await quarterlyPrioritiesService.createMilestone(orgId, teamId, priorityId, milestoneData);
      
      // Update local state
      setPriorities(prev => 
        prev.map(p => {
          if (p.id === priorityId) {
            return {
              ...p,
              milestones: [...(p.milestones || []), newMilestone]
            };
          }
          return p;
        })
      );
      
      setSuccess('Milestone added');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to create milestone:', error);
      setError('Failed to create milestone');
    }
  };

  const handleEditMilestone = async (priorityId, milestoneId, updates) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await quarterlyPrioritiesService.updateMilestone(orgId, teamId, priorityId, milestoneId, updates);
      
      // Update local state
      setPriorities(prev => 
        prev.map(p => {
          if (p.id === priorityId) {
            return {
              ...p,
              milestones: p.milestones.map(m => 
                m.id === milestoneId ? { ...m, ...updates } : m
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
    }
  };

  const handleDeleteMilestone = async (priorityId, milestoneId) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await quarterlyPrioritiesService.deleteMilestone(orgId, teamId, priorityId, milestoneId);
      
      // Update local state
      setPriorities(prev => 
        prev.map(p => {
          if (p.id === priorityId) {
            return {
              ...p,
              milestones: p.milestones.filter(m => m.id !== milestoneId)
            };
          }
          return p;
        })
      );
      
      setSuccess('Milestone deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to delete milestone:', error);
      setError('Failed to delete milestone');
    }
  };

  const handleAddPriorityUpdate = async (priorityId, updateText, statusChange = null) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await quarterlyPrioritiesService.addUpdate(orgId, teamId, priorityId, { text: updateText, statusChange });
      
      // If there's a status change, update the priority
      if (statusChange) {
        await handlePriorityStatusChange(priorityId, statusChange);
      }
      
      setSuccess('Update added');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh priorities to get the latest update
      await fetchPrioritiesData();
    } catch (error) {
      console.error('Failed to add update:', error);
      setError('Failed to add update');
    }
  };

  const handleStartMeeting = () => {
    if (window.confirm('Ready to start the meeting?')) {
      setMeetingStarted(true);
      setMeetingStartTime(new Date());
      setActiveSection('good-news'); // Auto-advance to first agenda item
      
      // Set meeting active flag for navigation
      sessionStorage.setItem('meetingActive', 'true');
      
      // Dispatch custom event to immediately update Layout
      window.dispatchEvent(new Event('meetingStateChanged'));
      
      // Capture initial state for summary
      setInitialIssues(issues.map(i => ({ id: i.id, status: i.status })));
      setInitialTodos(todos.map(t => ({ id: t.id, status: t.status })));
    }
  };

  const handleFinishMeeting = async () => {
    if (!meetingRating) {
      setError('Please rate the meeting before finishing');
      return;
    }

    try {
      // Calculate meeting metrics
      // Issues resolved = issues that were open at start and are now closed
      const issuesResolved = initialIssues.filter(initial => {
        const current = issues.find(i => i.id === initial.id);
        return initial.status === 'open' && current && current.status === 'closed';
      }).length;
      
      // Issues added = issues that didn't exist at start of meeting
      const issuesAdded = issues.filter(i => 
        !initialIssues.find(initial => initial.id === i.id)
      ).length;
      
      // Todos completed = todos that were incomplete at start and are now completed
      const todosCompleted = initialTodos.filter(initial => {
        const current = todos.find(t => t.id === initial.id);
        return initial.status === 'incomplete' && current && current.status === 'completed';
      }).length;
      
      // Todos added = todos that didn't exist at start of meeting
      const todosAdded = todos.filter(t => 
        !initialTodos.find(initial => initial.id === t.id)
      ).length;
      
      const duration = formatTimer(elapsedTime);
      const meetingDate = new Date().toLocaleDateString();
      const meetingTime = new Date().toLocaleTimeString();

      // Generate summary
      const summary = {
        date: meetingDate,
        time: meetingTime,
        duration: duration,
        rating: meetingRating,
        issuesResolved,
        issuesAdded,
        todosCompleted,
        todosAdded,
        teamMembers: teamMembers.length
      };

      // Prepare data for email
      // Get todos that were completed during the meeting
      const completedTodos = todos.filter(t => {
        const initial = initialTodos.find(initial => initial.id === t.id);
        return initial && initial.status === 'incomplete' && t.status === 'completed';
      });
      
      // Get todos that were added during the meeting
      const addedTodos = todos.filter(t => 
        !initialTodos.find(initial => initial.id === t.id)
      );
      
      const meetingData = {
        meetingType: 'Weekly Accountability Meeting',
        duration: elapsedTime,
        rating: meetingRating,
        summary: `Issues resolved: ${issuesResolved}, Issues added: ${issuesAdded}, Todos completed: ${todosCompleted}, Todos added: ${todosAdded}`,
        attendees: teamMembers,
        metrics: {
          issuesResolved,
          issuesAdded,
          todosCompleted,
          todosAdded
        },
        todos: {
          completed: completedTodos,
          added: addedTodos
        },
        issues: issues.filter(i => 
          !initialIssues.find(initial => initial.id === i.id)
        ),
        notes: cascadingMessage || ''
      };

      // Send meeting summary email
      try {
        const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
        const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
        
        await meetingsService.concludeMeeting(orgId, effectiveTeamId, meetingData);
        setSuccess('Meeting complete! Summary email sent to all attendees.');
      } catch (emailError) {
        console.error('Failed to send meeting summary email:', emailError);
        setError('Meeting complete, but failed to send summary email.');
      }
      
      // Clear meeting active flag
      sessionStorage.removeItem('meetingActive');
      
      // Dispatch custom event to immediately update Layout
      window.dispatchEvent(new Event('meetingStateChanged'));
      
      // Reset meeting state
      setMeetingStarted(false);
      setMeetingStartTime(null);
      setElapsedTime(0);
      setMeetingRating(null);
      setActiveSection('good-news');
      
    } catch (error) {
      console.error('Failed to finish meeting:', error);
      setError('Failed to generate meeting summary');
    }
  };

  const formatTimer = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    const minutes = elapsedTime / 60;
    if (minutes >= 85) return 'text-red-600';
    if (minutes >= 80) return 'text-yellow-600';
    return 'text-gray-600';
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
      case 'good-news':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smile className="h-5 w-5" />
                Good News
              </CardTitle>
              <CardDescription>Share personal and professional wins (5 minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Take turns sharing good news from your personal and professional lives. 
                  This helps build team connection and starts the meeting on a positive note.
                </p>
                <div className="border border-gray-200 p-4 rounded-lg bg-white">
                  <h4 className="font-medium mb-2 text-gray-900">Tips for Good News:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Keep it brief - aim for 30-60 seconds per person</li>
                    <li>Share both personal and professional wins</li>
                    <li>Celebrate team members' achievements</li>
                    <li>Be authentic and genuine</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'scorecard':
        return (
          <div className="space-y-4 w-full">
            {scorecardMetrics.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="h-5 w-5" />
                    Scorecard Review
                  </CardTitle>
                  <CardDescription>Review weekly metrics (5 minutes)</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No scorecard metrics found. Set up your scorecard to track key metrics.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate('/scorecard')}
                  >
                    Go to Scorecard
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="border border-gray-200 bg-white rounded-lg p-4 mb-4">
                  <p className="text-gray-700 text-center">
                    <span className="font-semibold">Quick Status Update:</span> Metric owners report "on-track" or "off-track" status. Any off-track metrics can be added to the Issues List for collaborative problem-solving.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    onClick={() => {
                      const newValue = !showTotal;
                      setShowTotal(newValue);
                      localStorage.setItem('scorecardShowTotal', newValue.toString());
                    }} 
                    variant="outline"
                    size="sm"
                    title={showTotal ? "Hide total column" : "Show total column"}
                  >
                    {showTotal ? "Hide Total" : "Show Total"}
                  </Button>
                  <Button 
                    onClick={() => {
                      const newValue = !isRTL;
                      setIsRTL(newValue);
                      localStorage.setItem('scorecardRTL', newValue.toString());
                    }} 
                    variant="outline"
                    size="sm"
                    title={isRTL ? "Switch to left-to-right" : "Switch to right-to-left"}
                  >
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    {isRTL ? "Switch to LTR" : "Switch to RTL"}
                  </Button>
                </div>
                <ScorecardTable 
                  metrics={scorecardMetrics} 
                  weeklyScores={weeklyScores} 
                  readOnly={true}
                  isRTL={isRTL}
                  showTotal={showTotal}
                  departmentId={teamId || user?.teamId || '00000000-0000-0000-0000-000000000000'}
                  onIssueCreated={(message) => {
                    setSuccess(message);
                    setTimeout(() => setSuccess(null), 3000);
                  }}
                />
              </>
            )}
          </div>
        );

      case 'priorities':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Quarterly Priorities Review
                </CardTitle>
                <CardDescription>Check progress on quarterly priorities (5 minutes)</CardDescription>
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
                <div className="border border-gray-200 bg-white rounded-lg p-4">
                  <p className="text-gray-700 text-center">
                    <span className="font-semibold">Status Check:</span> Priority owners share quick updates on progress. Off-track priorities can be converted to issues for team discussion and resolution.
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
                          <Target className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold">
                            Company Priorities ({companyPriorities.length})
                          </h3>
                        </div>
                      </div>
                      {expandedSections.companyPriorities && (
                        <div className="space-y-4 ml-7 mt-4">
                          {companyPriorities.map(priority => (
                            <FullPriorityCard 
                              key={priority.id} 
                              priority={priority} 
                              isCompany={true}
                              isArchived={false}
                              teamMembers={teamMembers}
                              onUpdate={handleUpdatePriority}
                              onStatusChange={handlePriorityStatusChange}
                              onMilestoneUpdate={handleUpdateMilestone}
                              onMilestoneCreate={handleCreateMilestone}
                              onMilestoneEdit={handleEditMilestone}
                              onMilestoneDelete={handleDeleteMilestone}
                              onAddUpdate={handleAddPriorityUpdate}
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
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <Target className="h-5 w-5 text-purple-600" />
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
                                  <FullPriorityCard 
                                    key={priority.id} 
                                    priority={priority} 
                                    isCompany={false}
                                    isArchived={false}
                                    teamMembers={teamMembers}
                                    onUpdate={handleUpdatePriority}
                                    onStatusChange={handlePriorityStatusChange}
                                    onMilestoneUpdate={handleUpdateMilestone}
                                    onMilestoneCreate={handleCreateMilestone}
                                    onMilestoneEdit={handleEditMilestone}
                                    onMilestoneDelete={handleDeleteMilestone}
                                    onAddUpdate={handleAddPriorityUpdate}
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

      case 'headlines':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5" />
                Headlines
              </CardTitle>
              <CardDescription>Share important updates and information (5 minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Share important updates that the team needs to know about. Keep headlines brief and factual.
                </p>
                <div className="border border-gray-200 p-4 rounded-lg bg-white">
                  <h4 className="font-medium mb-2">Examples of Headlines:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Customer feedback or complaints</li>
                    <li>Important deadlines or events</li>
                    <li>Personnel changes or updates</li>
                    <li>Market or competitive information</li>
                    <li>Process or system changes</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'todo-list':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ListTodo className="h-5 w-5" />
                      To-Do List Review
                    </CardTitle>
                    <CardDescription>Review action items from last week (5 minutes)</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={handleArchiveSelectedTodos}
                      variant="outline"
                      className="text-gray-600"
                      disabled={selectedTodoIds.length === 0}
                    >
                      <CheckSquare className="mr-2 h-4 w-4" />
                      Mark Complete ({selectedTodoIds.length})
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
            {todos.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No incomplete to-dos found</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="border border-gray-200 bg-white rounded-lg p-4">
                  <p className="text-gray-700 text-center">
                    <span className="font-semibold">Weekly Check-in:</span> Team members report "Done" or "Not Done" for each to-do. Incomplete items can be moved to Issues if needed. High-performing teams typically complete 90% of their weekly to-dos.
                  </p>
                </div>
                <TodosList
                  todos={todos}
                  onEdit={handleEditTodo}
                  onDelete={handleDeleteTodo}
                  onUpdate={handleTodoUpdate}
                  onConvertToIssue={handleTodoToIssue}
                  showCompleted={false}
                />
              </>
            )}
          </div>
        );

      case 'issues':
        const closedIssuesCount = issues.filter(issue => issue.status === 'closed').length;
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Issues Discussion
                    </CardTitle>
                    <CardDescription>Review and solve short-term issues (60 minutes)</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={handleArchiveClosedIssues}
                      variant="outline"
                      className="text-gray-600"
                      disabled={closedIssuesCount === 0}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archive Closed Issues ({closedIssuesCount})
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
            {issues.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No open issues found</p>
                </CardContent>
              </Card>
            ) : (
              <IssuesList
                issues={issues}
                onEdit={handleEditIssue}
                onStatusChange={handleIssueStatusChange}
                onTimelineChange={handleIssueTimelineChange}
                onArchive={handleArchive}
                onVote={handleVote}
                getStatusColor={(status) => {
                  switch (status) {
                    case 'open': return 'text-yellow-700 font-medium';
                    case 'closed': return 'text-green-700 font-medium';
                    default: return 'bg-gray-100 text-gray-800';
                  }
                }}
                getStatusIcon={(status) => {
                  switch (status) {
                    case 'open': return <AlertTriangle className="h-4 w-4" />;
                    case 'closed': return <CheckCircle className="h-4 w-4" />;
                    default: return null;
                  }
                }}
                showVoting={true}
                selectedIssues={selectedIssueIds}
                onSelectionChange={setSelectedIssueIds}
              />
            )}
          </div>
        );

      case 'conclude':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Conclude
              </CardTitle>
              <CardDescription>Wrap up and rate the meeting (5 minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Meeting Wrap-up:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Recap To Dos</li>
                    <li>Document Cascading Messages</li>
                    <li>Send Cascading Messages to another Team(s) - coming soon</li>
                  </ul>
                </div>
                
                {meetingStarted && (
                  <div className="space-y-6">
                    {/* New To-Dos created today */}
                    {todaysTodos.length > 0 && (
                      <div className="border border-gray-200 bg-white rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                          <ListTodo className="h-5 w-5" />
                          Recap To Dos ({todaysTodos.length})
                        </h4>
                        <ul className="space-y-2">
                          {todaysTodos.map(todo => (
                            <li key={todo.id} className="flex items-start gap-2">
                              <CheckSquare className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="font-medium text-gray-900">{todo.title}</span>
                                {todo.assigned_to && (
                                  <span className="text-gray-600 text-sm ml-2">
                                    - {todo.assigned_to.first_name} {todo.assigned_to.last_name}
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Cascading Messages */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5" />
                          Cascading Messages
                        </CardTitle>
                        <CardDescription>
                          Document key decisions from this meeting to share with other teams
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <textarea
                              placeholder="Enter key decisions or messages to cascade to other teams..."
                              className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              value={cascadingMessage}
                              onChange={(e) => setCascadingMessage(e.target.value)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                              These messages can be sent to other teams' Headlines - Coming Soon
                            </p>
                            <Button 
                              onClick={() => {
                                // TODO: Implement saving cascading messages
                                setSuccess('Cascading message saved');
                                setTimeout(() => setSuccess(null), 3000);
                              }}
                              disabled={!cascadingMessage.trim()}
                              className="bg-gray-900 hover:bg-gray-800"
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Save Message
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Rate this meeting */}
                    <div className="flex items-center justify-center gap-4">
                      <span className="text-lg font-medium">Rate this meeting:</span>
                      <Select value={meetingRating?.toString()} onValueChange={(value) => setMeetingRating(parseInt(value))}>
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                            <SelectItem key={num} value={num.toString()}>
                              {num}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex justify-center">
                      <Button 
                        onClick={handleFinishMeeting}
                        className="bg-gray-900 hover:bg-gray-800 text-white"
                        disabled={!meetingRating}
                      >
                        Finish Meeting & Send Summary
                      </Button>
                    </div>
                  </div>
                )}
                
                {!meetingStarted && (
                  <div className="flex items-center justify-center gap-2 py-8">
                    <CheckCircle className="h-8 w-8 text-gray-600" />
                    <span className="text-2xl font-semibold">Ready to conclude when meeting starts</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex relative">
        {/* Sidebar */}
        <div className={`w-64 bg-white border-r border-gray-200 min-h-screen flex-shrink-0 sticky top-0 h-screen overflow-y-auto ${!meetingStarted ? 'pointer-events-none' : ''}`}>
          <div className="p-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Weekly Accountability Meeting</h1>
              <p className="text-gray-600 text-sm">90 minutes total</p>
            </div>
          </div>
          
          <nav className={`px-4 pb-6 ${!meetingStarted ? 'opacity-40' : ''}`}>
            {agendaItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              const isCompleted = agendaItems.findIndex(i => i.id === activeSection) > index;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleSectionChange(item.id)}
                  disabled={!meetingStarted}
                  className={`w-full text-left px-4 py-3 mb-2 rounded-lg transition-colors flex items-center justify-between group ${
                    !meetingStarted
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      : isActive 
                      ? 'bg-gray-50 text-gray-900 border-l-2 border-gray-900' 
                      : isCompleted
                      ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${!meetingStarted ? 'text-gray-300' : isActive ? 'text-gray-900' : isCompleted ? 'text-gray-600' : 'text-gray-400'}`} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{item.duration}m</span>
                    {meetingStarted && isActive && <ChevronRight className="h-4 w-4" />}
                    {meetingStarted && isCompleted && <CheckCircle className="h-4 w-4 text-gray-600" />}
                  </div>
                </button>
              );
            })}
          </nav>
          
          {/* Reference Tools Section */}
          <div className={`px-4 pb-4 border-t ${!meetingStarted ? 'opacity-40' : ''}`}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-4">
              Reference Tools
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowBusinessBlueprint(true)}
                disabled={!meetingStarted}
                className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                  !meetingStarted ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <FileText className={`h-4 w-4 ${!meetingStarted ? 'text-gray-300' : 'text-gray-400'}`} />
                <span className="text-sm font-medium">2-Page Plan</span>
              </button>
              <button
                onClick={() => setShowOrgChart(true)}
                disabled={!meetingStarted}
                className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                  !meetingStarted ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <GitBranch className={`h-4 w-4 ${!meetingStarted ? 'text-gray-300' : 'text-gray-400'}`} />
                <span className="text-sm font-medium">Org Chart</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-x-auto relative">
          <div className={activeSection === 'scorecard' || activeSection === 'priorities' || activeSection === 'issues' ? 'min-w-fit' : 'max-w-6xl mx-auto'}>
            {/* Meeting Controls */}
            <div className="flex justify-between items-center mb-6">
              {/* Timer and Start button (left side) */}
              <div>
                {!meetingStarted ? (
                  <Button 
                    onClick={handleStartMeeting}
                    className="bg-gray-900 hover:bg-gray-800 text-white z-10 relative"
                    size="lg"
                  >
                    <Clock className="mr-2 h-5 w-5" />
                    Start Meeting
                  </Button>
                ) : (
                  <div className={`font-mono text-2xl font-bold ${getTimerColor()}`}>
                    ⏱️ {formatTimer(elapsedTime)}
                  </div>
                )}
              </div>
              
              {/* Action Buttons (right side) - hide on Good News and Conclude */}
              {meetingStarted && activeSection !== 'good-news' && activeSection !== 'conclude' && (
                <FloatingActionButtons 
                  onAddTodo={handleAddTodo}
                  onAddIssue={handleAddIssue}
                />
              )}
            </div>
            
            {/* Overlay message when meeting not started */}
            {!meetingStarted && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Meeting Not Started</h3>
                  <p className="text-gray-500">Click the "Start Meeting" button above to begin your Weekly Accountability Meeting</p>
                </div>
              </div>
            )}
            
            {/* Main content area with gray overlay when not started */}
            <div className={`${!meetingStarted ? 'opacity-20 pointer-events-none' : ''}`}>
              {error && (
                <Alert className="mb-6 border-red-200 bg-white">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="mb-6 border-green-200 bg-white border border-gray-200">
                  <CheckCircle className="h-4 w-4 text-gray-600" />
                  <AlertDescription className="text-green-700">{success}</AlertDescription>
                </Alert>
              )}

              {renderContent()}

              {/* Navigation buttons */}
              {(getPreviousSection() || getNextSection()) && (
                <div className="mt-6 flex justify-between">
                  <div>
                    {getPreviousSection() && (
                      <Button 
                        onClick={() => handleSectionChange(getPreviousSection())}
                        variant="outline"
                        className="border-gray-300 hover:bg-gray-50"
                      >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back: {agendaItems.find(item => item.id === getPreviousSection())?.label}
                      </Button>
                    )}
                  </div>
                  <div>
                    {getNextSection() && (
                      <Button 
                        onClick={() => handleSectionChange(getNextSection())}
                        className="bg-gray-900 hover:bg-gray-800"
                      >
                        Next: {agendaItems.find(item => item.id === getNextSection())?.label}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Issue Edit Dialog */}
      <IssueDialog
        open={showIssueDialog}
        onClose={() => {
          setShowIssueDialog(false);
          setEditingIssue(null);
        }}
        issue={editingIssue}
        onSave={handleSaveIssue}
        teamMembers={teamMembers}
      />
      
      {/* Todo Dialog */}
      <TodoDialog
        open={showTodoDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowTodoDialog(false);
            setEditingTodo(null);
          }
        }}
        todo={editingTodo}
        onSave={handleSaveTodo}
        teamMembers={teamMembers}
      />
      
      {/* Business Blueprint Dialog */}
      <Dialog open={showBusinessBlueprint} onOpenChange={setShowBusinessBlueprint}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>2-Page Plan</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-gray-600">Click the button below to open the 2-Page Plan in a new window.</p>
            <Button
              onClick={() => {
                window.open('/business-blueprint?fromMeeting=true', '_blank');
                setShowBusinessBlueprint(false);
              }}
              className="mt-4"
            >
              Open 2-Page Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Org Chart Dialog */}
      <Dialog open={showOrgChart} onOpenChange={setShowOrgChart}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Organizational Chart</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-gray-600">Click the button below to open the Organizational Chart in a new window.</p>
            <Button
              onClick={() => {
                window.open('/organizational-chart?autoOpen=true&fromMeeting=true', '_blank');
                setShowOrgChart(false);
              }}
              className="mt-4"
            >
              Open Organizational Chart
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WeeklyAccountabilityMeetingPage;