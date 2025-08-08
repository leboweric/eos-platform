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
  Star,
  Building2,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ScorecardTable from '../components/scorecard/ScorecardTableClean';
import PriorityCard from '../components/priorities/PriorityCardClean';
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

  // Reference dialogs
  const [showBusinessBlueprint, setShowBusinessBlueprint] = useState(false);
  const [showOrgChart, setShowOrgChart] = useState(false);

  // Meeting agenda items
  const agendaItems = [
    { id: 'good-news', label: 'Good News', icon: Smile, duration: 5 },
    { id: 'scorecard', label: 'Scorecard', icon: BarChart, duration: 5 },
    { id: 'priorities', label: 'Priorities', icon: Target, duration: 5 },
    { id: 'headlines', label: 'Headlines', icon: Newspaper, duration: 60 },
    { id: 'todo-list', label: 'To-do List', icon: ListTodo, duration: 5 },
    { id: 'issues', label: 'Issues', icon: AlertTriangle, duration: 10 },
    { id: 'conclude', label: 'Conclude', icon: CheckSquare, duration: 5 }
  ];

  useEffect(() => {
    loadInitialData();
  }, [teamId]);

  useEffect(() => {
    const isActive = sessionStorage.getItem('meetingActive');
    const startTime = sessionStorage.getItem('meetingStartTime');
    
    if (isActive === 'true' && startTime) {
      setMeetingStarted(true);
      setMeetingStartTime(parseInt(startTime));
      
      // Calculate elapsed time
      const now = Date.now();
      const elapsed = Math.floor((now - parseInt(startTime)) / 1000);
      setElapsedTime(elapsed);
    }
  }, []);

  // Store meeting state in sessionStorage
  useEffect(() => {
    if (meetingStarted) {
      sessionStorage.setItem('meetingActive', 'true');
      if (meetingStartTime) {
        sessionStorage.setItem('meetingStartTime', meetingStartTime.toString());
      }
    } else {
      sessionStorage.removeItem('meetingActive');
      sessionStorage.removeItem('meetingStartTime');
    }
  }, [meetingStarted, meetingStartTime]);

  // Clear success messages after 3 seconds
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
    let timer;
    if (meetingStarted && meetingStartTime) {
      timer = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - meetingStartTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [meetingStarted, meetingStartTime]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchScorecardData(),
        fetchPrioritiesData(),
        fetchIssuesData(),
        fetchTodosData()
      ]);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError('Failed to load meeting data');
    } finally {
      setLoading(false);
    }
  };

  const fetchScorecardData = async () => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      const departmentId = teamId || user?.teamId;
      
      const response = await scorecardService.getScorecard(orgId, effectiveTeamId, departmentId);
      
      if (response && response.data) {
        // Filter to only show weekly metrics
        const weeklyMetrics = (response.data.metrics || []).filter(m => m.type === 'weekly');
        setScorecardMetrics(weeklyMetrics);
        setWeeklyScores(response.data.weeklyScores || {});
      } else if (response) {
        // Filter to only show weekly metrics
        const weeklyMetrics = (response.metrics || []).filter(m => m.type === 'weekly');
        setScorecardMetrics(weeklyMetrics);
        setWeeklyScores(response.weeklyScores || {});
      }
    } catch (error) {
      console.error('Failed to fetch scorecard:', error);
    }
  };

  const fetchPrioritiesData = async () => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      const response = await quarterlyPrioritiesService.getCurrentPriorities(orgId, effectiveTeamId);
      
      // Extract and flatten priorities
      const companyPriorities = response.companyPriorities || [];
      const teamMemberPriorities = response.teamMemberPriorities || {};
      
      const allPriorities = [
        ...companyPriorities.map(p => ({ ...p, priority_type: 'company' })),
        ...Object.values(teamMemberPriorities).flatMap(memberData => 
          (memberData.priorities || []).map(p => ({ ...p, priority_type: 'individual' }))
        )
      ];
      
      setPriorities(allPriorities);
    } catch (error) {
      console.error('Failed to fetch priorities:', error);
    }
  };

  const fetchIssuesData = async () => {
    try {
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      const response = await issuesService.getIssues('short_term', false, effectiveTeamId);
      setIssues(response.data.issues || []);
      setTeamMembers(response.data.teamMembers || []);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
    }
  };

  const fetchTodosData = async () => {
    try {
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      const response = await todosService.getTodos(
        null, // status filter
        null, // assignee filter
        false, // include completed
        effectiveTeamId // department filter
      );
      setTodos(response.data?.todos || []);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    }
  };

  const fetchTodaysTodos = async () => {
    try {
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      const response = await todosService.getTodaysTodos(effectiveTeamId);
      setTodaysTodos(response.todos || []);
    } catch (error) {
      console.error('Failed to fetch today\'s todos:', error);
    }
  };

  // Auto-start meeting on component mount
  useEffect(() => {
    const now = Date.now();
    setMeetingStartTime(now);
    setMeetingStarted(true);
    setElapsedTime(0);
    
    // Dispatch custom event to immediately update Layout
    window.dispatchEvent(new Event('meetingStateChanged'));
    
    // Fetch today's todos for the conclude section
    fetchTodaysTodos();
  }, []);

  const handleAddIssue = () => {
    setEditingIssue(null);
    setShowIssueDialog(true);
  };

  const handleAddTodo = () => {
    setEditingTodo(null);
    setShowTodoDialog(true);
  };

  const handleSaveIssue = async (issueData) => {
    try {
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      if (editingIssue) {
        await issuesService.updateIssue(editingIssue.id, issueData);
        setSuccess('Issue updated successfully');
      } else {
        await issuesService.createIssue({
          ...issueData,
          timeline: 'short_term',
          department_id: effectiveTeamId
        });
        setSuccess('Issue created successfully');
      }
      
      await fetchIssuesData();
      setShowIssueDialog(false);
      setEditingIssue(null);
      return issueData;
    } catch (error) {
      console.error('Failed to save issue:', error);
      setError('Failed to save issue');
      throw error;
    }
  };

  const handleEditIssue = (issue) => {
    setEditingIssue(issue);
    setShowIssueDialog(true);
  };

  const handleStatusChange = async (issueId, newStatus) => {
    try {
      setIssues(prev => 
        prev.map(issue => 
          issue.id === issueId ? { ...issue, status: newStatus } : issue
        )
      );
      
      await issuesService.updateIssue(issueId, { status: newStatus });
    } catch (error) {
      console.error('Failed to update issue status:', error);
      await fetchIssuesData();
    }
  };

  const handleTimelineChange = async (issueId, newTimeline) => {
    try {
      await issuesService.updateIssue(issueId, { timeline: newTimeline });
      setSuccess(`Issue moved to ${newTimeline === 'short_term' ? 'Short Term' : 'Long Term'}`);
      await fetchIssuesData();
    } catch (error) {
      console.error('Failed to update issue timeline:', error);
      setError('Failed to move issue');
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
      
      setIssues(prev => prev.map(updateVote));
      
      if (shouldVote) {
        await issuesService.voteForIssue(issueId);
      } else {
        await issuesService.unvoteForIssue(issueId);
      }
    } catch (error) {
      console.error('Failed to vote:', error);
      await fetchIssuesData();
    }
  };

  const handleArchive = async (issueId) => {
    try {
      await issuesService.archiveIssue(issueId);
      setSuccess('Issue archived successfully');
      await fetchIssuesData();
    } catch (error) {
      console.error('Failed to archive issue:', error);
      setError('Failed to archive issue');
    }
  };

  const handleSaveTodo = async (todoData) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      let savedTodo;
      if (editingTodo) {
        savedTodo = await todosService.updateTodo(editingTodo.id, {
          ...todoData,
          team_id: effectiveTeamId
        });
        setSuccess('To-do updated successfully');
      } else {
        savedTodo = await todosService.createTodo({
          ...todoData,
          organization_id: orgId,
          team_id: effectiveTeamId
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

  // Priority handlers for PriorityCard
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
    // First update the priority status
    await handleUpdatePriority(priorityId, { status: newStatus });
    
    // If the priority is marked as off-track, create an issue
    if (newStatus === 'off-track' || newStatus === 'at-risk') {
      const priority = priorities.find(p => p.id === priorityId);
      if (priority) {
        try {
          const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
          const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
          
          // Create issue from off-track priority
          const issueData = {
            title: `Off-Track Priority: ${priority.title}`,
            description: `Priority "${priority.title}" is off-track and needs attention.\n\nOriginal priority: ${priority.description || 'No description'}`,
            timeline: 'short_term',
            team_id: effectiveTeamId,
            created_by: user?.id,
            status: 'open',
            priority_level: 'high',
            related_priority_id: priorityId
          };
          
          await issuesService.createIssue(issueData);
          
          // Show success message with visual feedback
          setSuccess(
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Issue created for off-track priority and added to Issues List</span>
            </div>
          );
          
          // Refresh issues data
          await fetchIssuesData();
          
          // Clear success message after 5 seconds (longer for this important action)
          setTimeout(() => setSuccess(null), 5000);
        } catch (error) {
          console.error('Failed to create issue for off-track priority:', error);
          setError('Failed to create issue for off-track priority');
        }
      }
    }
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

  const handleIssueCheckboxChange = (issueId, checked) => {
    setSelectedIssueIds(prev => {
      if (checked) {
        return [...prev, issueId];
      } else {
        return prev.filter(id => id !== issueId);
      }
    });
  };

  const concludeMeeting = async () => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      // Calculate meeting duration in minutes
      const durationMinutes = Math.floor(elapsedTime / 60);
      
      // Send meeting summary
      await meetingsService.concludeMeeting(orgId, effectiveTeamId, {
        meetingType: 'weekly',
        duration: durationMinutes,
        rating: meetingRating || 8,
        cascadingMessage: cascadingMessage,
        issuesDiscussed: selectedIssueIds.length,
        todosAssigned: selectedTodoIds.length
      });
      
      setSuccess('Meeting concluded and summary sent!');
      
      // Clear sessionStorage
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
          <Card className="border-0 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Smile className="h-5 w-5 text-indigo-600" />
                    Good News
                  </CardTitle>
                  <CardDescription className="mt-1">Share personal and professional wins</CardDescription>
                </div>
                <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                  5 minutes
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
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
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <BarChart className="h-5 w-5 text-emerald-600" />
                      Scorecard Review
                    </CardTitle>
                    <CardDescription className="mt-1">Quick Status Update: Metric owners report "on-track" or "off-track" status</CardDescription>
                  </div>
                  <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                    5 minutes
                  </div>
                </div>
              </CardHeader>
            </Card>
            {scorecardMetrics.length === 0 ? (
              <Card>
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
              <ScorecardTable 
                metrics={scorecardMetrics} 
                weeklyScores={weeklyScores}
                monthlyScores={{}}
                type="weekly"
                readOnly={true}
                isRTL={false}
                showTotal={false}
                departmentId={teamId || user?.teamId || '00000000-0000-0000-0000-000000000000'}
                onIssueCreated={null}
                onScoreEdit={null}
                onChartOpen={null}
                onMetricUpdate={null}
                onMetricDelete={null}
                noWrapper={true}
                maxPeriods={4}
                meetingMode={true}
              />
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-center">
                    <span className="font-semibold">Quick Status Check:</span> Each priority owner reports "on-track" or "off-track" status
                  </p>
                </div>
                {/* Company Priorities Section */}
                {(() => {
                  const companyPriorities = priorities.filter(p => p.priority_type === 'company');
                  return companyPriorities.length > 0 && (
                    <div>
                      <div 
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => setExpandedSections(prev => ({ 
                          ...prev, 
                          companyPriorities: !prev.companyPriorities 
                        }))}
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
                          {companyPriorities.map(priority => (
                            <PriorityCard 
                              key={priority.id} 
                              priority={priority} 
                              readOnly={false}
                              onIssueCreated={(message) => {
                                setSuccess(message);
                                setTimeout(() => setSuccess(null), 3000);
                              }}
                              onStatusChange={async (priorityId, newStatus) => {
                                setPriorities(prev => 
                                  prev.map(p => 
                                    p.id === priorityId ? { ...p, status: newStatus } : p
                                  )
                                );
                                
                                // Automatically create an issue if marked as off-track
                                if (newStatus === 'off-track') {
                                  try {
                                    const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
                                    await issuesService.createIssue({
                                      title: `Off-Track Priority: ${priority.title}`,
                                      description: `Priority "${priority.title}" is off-track and needs attention.\n\nOwner: ${priority.owner?.name || 'Unassigned'}\n\nDescription: ${priority.description || 'No description provided'}`,
                                      timeline: 'short_term',
                                      ownerId: priority.owner?.id || null,
                                      department_id: effectiveTeamId
                                    });
                                    
                                    setSuccess(
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4" />
                                        <span>Priority marked off-track and issue created</span>
                                      </div>
                                    );
                                    await fetchIssuesData();
                                  } catch (error) {
                                    console.error('Failed to create issue for off-track priority:', error);
                                    setError('Failed to create issue for off-track priority');
                                  }
                                } else {
                                  setSuccess(`Priority status updated to ${newStatus}`);
                                }
                                setTimeout(() => {
                                  setSuccess(null);
                                  setError(null);
                                }, 3000);
                              }}
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
                              onClick={() => setExpandedSections(prev => ({ 
                                ...prev, 
                                individualPriorities: {
                                  ...prev.individualPriorities,
                                  [ownerId]: !prev.individualPriorities[ownerId]
                                }
                              }))}
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
                                    onStatusChange={async (priorityId, newStatus) => {
                                      setPriorities(prev => 
                                        prev.map(p => 
                                          p.id === priorityId ? { ...p, status: newStatus } : p
                                        )
                                      );
                                      
                                      // Automatically create an issue if marked as off-track
                                      if (newStatus === 'off-track') {
                                        try {
                                          const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
                                          await issuesService.createIssue({
                                            title: `Off-Track Priority: ${priority.title}`,
                                            description: `Priority "${priority.title}" is off-track and needs attention.\n\nOwner: ${priority.owner?.name || 'Unassigned'}\n\nDescription: ${priority.description || 'No description provided'}`,
                                            timeline: 'short_term',
                                            ownerId: priority.owner?.id || null,
                                            department_id: effectiveTeamId
                                          });
                                          
                                          setSuccess(
                                            <div className="flex items-center gap-2">
                                              <CheckCircle className="h-4 w-4" />
                                              <span>Priority marked off-track and issue created</span>
                                            </div>
                                          );
                                          await fetchIssuesData();
                                        } catch (error) {
                                          console.error('Failed to create issue for off-track priority:', error);
                                          setError('Failed to create issue for off-track priority');
                                        }
                                      } else {
                                        setSuccess(`Priority status updated to ${newStatus}`);
                                      }
                                      setTimeout(() => {
                                        setSuccess(null);
                                        setError(null);
                                      }, 3000);
                                    }}
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
          <Card className="border-0 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Newspaper className="h-5 w-5 text-orange-600" />
                    Customer & Employee Headlines
                  </CardTitle>
                  <CardDescription className="mt-1">Share important updates</CardDescription>
                </div>
                <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                  60 minutes
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <p className="text-gray-600">
                  Share critical information about customers and employees that the team needs to know.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 p-4 rounded-lg bg-white">
                    <h4 className="font-medium mb-2 text-gray-900 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Customer Headlines
                    </h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Major customer wins or losses</li>
                      <li>Important customer feedback</li>
                      <li>Market changes affecting customers</li>
                      <li>Competitive developments</li>
                    </ul>
                  </div>
                  <div className="border border-gray-200 p-4 rounded-lg bg-white">
                    <h4 className="font-medium mb-2 text-gray-900 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Employee Headlines
                    </h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Team member updates</li>
                      <li>Hiring or departures</li>
                      <li>Important HR announcements</li>
                      <li>Team achievements to celebrate</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'todo-list':
        return (
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <ListTodo className="h-5 w-5 text-cyan-600" />
                      To-do List Review
                    </CardTitle>
                    <CardDescription className="mt-1">Review action items</CardDescription>
                  </div>
                  <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                    5 minutes
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex justify-end mb-4">
                  <Button onClick={handleAddTodo} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Add To-do
                  </Button>
                </div>
                {todos.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No to-dos found for this week.</p>
                  </div>
                ) : (
                  <TodosList 
                    todos={todos}
                    onEdit={(todo) => {
                      setEditingTodo(todo);
                      setShowTodoDialog(true);
                    }}
                    onStatusChange={async (todoId, completed) => {
                      try {
                        await todosService.updateTodo(todoId, { completed });
                        await fetchTodosData();
                      } catch (error) {
                        console.error('Failed to update todo:', error);
                      }
                    }}
                    onDelete={async (todoId) => {
                      try {
                        await todosService.deleteTodo(todoId);
                        await fetchTodosData();
                        setSuccess('To-do deleted');
                      } catch (error) {
                        console.error('Failed to delete todo:', error);
                        setError('Failed to delete to-do');
                      }
                    }}
                    readOnly={false}
                    showCheckboxes={true}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'issues':
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
                    10 minutes
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="border border-gray-200 bg-white rounded-lg p-4 mb-4">
                  <p className="text-gray-700 text-center">
                    <span className="font-semibold">Quick voting:</span> Everyone votes on the most important issues. Then discuss and solve the top-voted issues using IDS.
                  </p>
                </div>
                <div className="flex justify-end mb-4">
                  <Button onClick={handleAddIssue} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Issue
                  </Button>
                </div>
                {issues.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No issues found.</p>
                  </div>
                ) : (
                  <IssuesList
                    issues={issues || []}
                    onEdit={handleEditIssue}
                    onStatusChange={handleStatusChange}
                    onTimelineChange={handleTimelineChange}
                    onArchive={handleArchive}
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
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'conclude':
        return (
          <Card className="border-0 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <CheckSquare className="h-5 w-5 text-green-600" />
                    Conclude Meeting
                  </CardTitle>
                  <CardDescription className="mt-1">Wrap up and cascade messages</CardDescription>
                </div>
                <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                  5 minutes
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="border border-gray-200 p-4 rounded-lg bg-white">
                  <h4 className="font-medium mb-2 text-gray-900 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Cascading Messages
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    What key information needs to be communicated to other teams?
                  </p>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                    placeholder="Enter any messages to cascade to other teams..."
                    value={cascadingMessage}
                    onChange={(e) => setCascadingMessage(e.target.value)}
                  />
                </div>

                <div className="border border-gray-200 p-4 rounded-lg bg-white">
                  <h4 className="font-medium mb-2 text-gray-900 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Meeting Rating
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Rate this meeting's effectiveness (1-10)
                  </p>
                  <Select value={meetingRating?.toString()} onValueChange={(value) => setMeetingRating(parseInt(value))}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(10)].map((_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-center pt-4">
                  <Button
                    onClick={concludeMeeting}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Send className="mr-2 h-5 w-5" />
                    Conclude Meeting & Send Summary
                  </Button>
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
              <h1 className="text-3xl font-bold text-gray-900">Weekly Accountability Meeting</h1>
              <p className="text-gray-600 mt-2">90 minutes - Keep your team aligned and moving forward</p>
            </div>
            {meetingStarted && (
              <div className="flex items-center gap-4">
                <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className={`text-lg font-mono font-semibold ${getTimerColor()}`}>
                      {formatTimer(elapsedTime)}
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
                  <span className="text-xs text-gray-500">{item.duration}m</span>
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

        {/* Floating Action Buttons */}
        {meetingStarted && activeSection !== 'good-news' && activeSection !== 'conclude' && (
          <FloatingActionButtons 
            onAddTodo={handleAddTodo}
            onAddIssue={handleAddIssue}
          />
        )}
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
        teamMembers={teamMembers || []}
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
        teamMembers={teamMembers || []}
      />
    </div>
  );
};

export default WeeklyAccountabilityMeetingPage;