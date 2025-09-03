import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { format } from 'date-fns';
import { meetingsService } from '../services/meetingsService';
import { organizationService } from '../services/organizationService';
import MeetingBar from '../components/meeting/MeetingBar';
import useMeeting from '../hooks/useMeeting';
import { getOrgTheme, saveOrgTheme, hexToRgba } from '../utils/themeUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Users,
  User,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ScorecardTableClean from '../components/scorecard/ScorecardTableClean';
import { Progress } from '@/components/ui/progress';
import PriorityDialog from '../components/priorities/PriorityDialog';
import IssuesListClean from '../components/issues/IssuesListClean';
import IssueDialog from '../components/issues/IssueDialog';
import { MoveIssueDialog } from '../components/issues/MoveIssueDialog';
import TodosListClean from '../components/todos/TodosListClean';
import TodoDialog from '../components/todos/TodoDialog';
import MetricTrendChart from '../components/scorecard/MetricTrendChart';
import { scorecardService } from '../services/scorecardService';
import { quarterlyPrioritiesService } from '../services/quarterlyPrioritiesService';
import { issuesService } from '../services/issuesService';
import { todosService } from '../services/todosService';
import { headlinesService } from '../services/headlinesService';
import HeadlineDialog from '../components/headlines/HeadlineDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, GitBranch } from 'lucide-react';
import { useSelectedTodos } from '../contexts/SelectedTodosContext';
import { cascadingMessagesService } from '../services/cascadingMessagesService';
import { teamsService } from '../services/teamsService';
import { useTerminology } from '../contexts/TerminologyContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialogFooter } from '@/components/ui/dialog';
import { getEffectiveTeamId } from '../utils/teamUtils';

const WeeklyAccountabilityMeetingPage = () => {
  const { user } = useAuthStore();
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { 
    meetingCode, 
    participants, 
    joinMeeting,
    leaveMeeting, 
    isConnected, 
    isLeader, 
    currentLeader, 
    navigateToSection, 
    broadcastVote, 
    broadcastIssueUpdate,
    broadcastTodoUpdate,
    broadcastIssueListUpdate,
    syncTimer,
    updateNotes,
    claimPresenter,
    activeMeetings 
  } = useMeeting();
  
  // Debug logging for participants
  useEffect(() => {
    console.log('📊 Participants updated:', participants);
    console.log('📊 Number of participants:', participants.length);
    console.log('📊 Is Leader:', isLeader);
    console.log('📊 Current Leader:', currentLeader);
  }, [participants, isLeader, currentLeader]);
  const { labels } = useTerminology();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('good-news');
  const [success, setSuccess] = useState(null);
  
  // Meeting data
  const [scorecardMetrics, setScorecardMetrics] = useState([]);
  const [weeklyScores, setWeeklyScores] = useState({});
  const [weeklyNotes, setWeeklyNotes] = useState({});
  const [monthlyScores, setMonthlyScores] = useState({});
  const [monthlyNotes, setMonthlyNotes] = useState({});
  const [priorities, setPriorities] = useState([]);
  const [shortTermIssues, setShortTermIssues] = useState([]);
  const [longTermIssues, setLongTermIssues] = useState([]);
  const [issueTimeline, setIssueTimeline] = useState('short_term');
  const [selectedIssueIds, setSelectedIssueIds] = useState([]);
  const [todos, setTodos] = useState([]);
  const { selectedTodoIds } = useSelectedTodos();
  const [teamMembers, setTeamMembers] = useState([]);
  const [todaysTodos, setTodaysTodos] = useState([]);
  const [goodNews, setGoodNews] = useState([]);
  const [headlines, setHeadlines] = useState({ customer: [], employee: [] });
  const [cascadedMessages, setCascadedMessages] = useState([]);
  
  // Dialog states
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [movingIssue, setMovingIssue] = useState(null);
  const [showTodoDialog, setShowTodoDialog] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [todoFromIssue, setTodoFromIssue] = useState(null);
  const [showCascadeDialog, setShowCascadeDialog] = useState(false);
  const [cascadeFromIssue, setCascadeFromIssue] = useState(null);
  const [cascadeMessage, setCascadeMessage] = useState('');
  const [cascadeToAll, setCascadeToAll] = useState(false);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [chartModal, setChartModal] = useState({ isOpen: false, metric: null, metricId: null });
  const [showHeadlineDialog, setShowHeadlineDialog] = useState(false);
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState(null);
  
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
  const [sectionNotes, setSectionNotes] = useState({});
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const notesTimeoutRef = useRef(null);
  const [meetingRating, setMeetingRating] = useState(null);
  const [participantRatings, setParticipantRatings] = useState({}); // Store ratings by participant
  const [cascadingMessage, setCascadingMessage] = useState('');
  
  // Scorecard display options
  const [showScorecardAverage, setShowScorecardAverage] = useState(false);
  const [showScorecardTotal, setShowScorecardTotal] = useState(false);

  // Reference dialogs
  const [showBusinessBlueprint, setShowBusinessBlueprint] = useState(false);
  const [showOrgChart, setShowOrgChart] = useState(false);
  
  // Theme state
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });

  // Computed values
  const currentIssues = issueTimeline === 'short_term' ? shortTermIssues : longTermIssues;

  // Get framework-specific agenda items
  const getAgendaItems = () => {
    // Determine framework based on terminology
    const isEOS = labels.priorities_label === 'Rocks';
    const isOKR = labels.priorities_label === 'Objectives';
    const isScalingUp = labels.business_blueprint_label === 'One-Page Strategic Plan';
    const is4DX = labels.priorities_label?.includes('WIG');
    
    if (isEOS) {
      // EOS Level 10 Meeting
      return [
        { id: 'good-news', label: 'Segue (Good News)', icon: Smile, duration: 5 },
        { id: 'scorecard', label: 'Scorecard Review', icon: BarChart, duration: 5 },
        { id: 'priorities', label: 'Rock Review', icon: Target, duration: 5 },
        { id: 'headlines', label: 'Headlines', icon: Newspaper, duration: 5 },
        { id: 'todo-list', label: 'To-Do List', icon: ListTodo, duration: 5 },
        { id: 'issues', label: 'IDS', icon: AlertTriangle, duration: 60 },
        { id: 'conclude', label: 'Conclude', icon: CheckSquare, duration: 5 }
      ];
    } else if (isOKR) {
      // OKRs Weekly Check-in
      return [
        { id: 'good-news', label: 'Wins & Celebrations', icon: Smile, duration: 5 },
        { id: 'scorecard', label: 'Key Results Review', icon: BarChart, duration: 10 },
        { id: 'priorities', label: 'Objective Progress', icon: Target, duration: 10 },
        { id: 'issues', label: 'Blockers & Dependencies', icon: AlertTriangle, duration: 25 },
        { id: 'todo-list', label: 'Action Items', icon: ListTodo, duration: 5 },
        { id: 'conclude', label: 'Wrap-up', icon: CheckSquare, duration: 5 }
      ];
    } else if (isScalingUp) {
      // Scaling Up Weekly Meeting
      return [
        { id: 'good-news', label: 'Good News', icon: Smile, duration: 5 },
        { id: 'scorecard', label: 'KPI Dashboard Review', icon: BarChart, duration: 10 },
        { id: 'priorities', label: 'Priorities Update', icon: Target, duration: 10 },
        { id: 'headlines', label: 'Customer/Employee Data', icon: Newspaper, duration: 5 },
        { id: 'todo-list', label: 'Weekly Actions', icon: ListTodo, duration: 5 },
        { id: 'issues', label: 'Issues Processing', icon: AlertTriangle, duration: 45 },
        { id: 'conclude', label: 'Cascading Messages', icon: CheckSquare, duration: 10 }
      ];
    } else if (is4DX) {
      // 4DX WIG Session
      return [
        { id: 'scorecard', label: 'Review Scoreboard', icon: BarChart, duration: 5 },
        { id: 'todo-list', label: 'Report on Commitments', icon: ListTodo, duration: 10 },
        { id: 'issues', label: 'Clear the Path (Obstacles)', icon: AlertTriangle, duration: 15 },
        { id: 'priorities', label: 'Make New Commitments', icon: Target, duration: 10 },
        { id: 'good-news', label: 'Celebrate Wins', icon: Smile, duration: 5 }
      ];
    } else {
      // Default/Generic agenda
      return [
        { id: 'good-news', label: 'Good News', icon: Smile, duration: 5 },
        { id: 'scorecard', label: labels.scorecard_label || 'Scorecard', icon: BarChart, duration: 5 },
        { id: 'priorities', label: labels.priorities_label || 'Priorities', icon: Target, duration: 5 },
        { id: 'headlines', label: 'Headlines', icon: Newspaper, duration: 5 },
        { id: 'todo-list', label: labels.todos_label || 'To-Do List', icon: ListTodo, duration: 5 },
        { id: 'issues', label: labels.issues_label || 'Issues', icon: AlertTriangle, duration: 60 },
        { id: 'conclude', label: 'Conclude', icon: CheckSquare, duration: 5 }
      ];
    }
  };
  
  const agendaItems = getAgendaItems();
  
  // Get framework-specific meeting description
  const getMeetingDescription = () => {
    const isEOS = labels.priorities_label === 'Rocks';
    const isOKR = labels.priorities_label === 'Objectives';
    const isScalingUp = labels.business_blueprint_label === 'One-Page Strategic Plan';
    const is4DX = labels.priorities_label?.includes('WIG');
    
    if (isEOS) {
      return '90 minutes - Solve issues and keep your Rocks on track';
    } else if (isOKR) {
      return '60 minutes - Review key results and remove blockers';
    } else if (isScalingUp) {
      return '60-90 minutes - Review KPIs and process issues';
    } else if (is4DX) {
      return '30-45 minutes - Focus on your Wildly Important Goals';
    } else {
      return `90 minutes - Solve the ${labels.issues_label?.toLowerCase() || 'issues'} that will prevent your team from completing your ${labels.priorities_label?.toLowerCase() || 'priorities'}`;
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [teamId]);

  // Join meeting when page loads
  const hasJoinedRef = useRef(false);
  const hasCheckedMeetingsRef = useRef(false);
  
  useEffect(() => {
    if (teamId && isConnected && joinMeeting && !meetingCode && !hasJoinedRef.current) {
      const meetingRoom = `${teamId}-weekly-accountability`;
      
      // Wait a bit for active meetings to load if we haven't checked yet
      if (!hasCheckedMeetingsRef.current && (!activeMeetings || Object.keys(activeMeetings).length === 0)) {
        console.log('🎬 Waiting for active meetings to load...');
        hasCheckedMeetingsRef.current = true;
        // Wait 500ms for active meetings to populate
        setTimeout(() => {
          if (!hasJoinedRef.current && !meetingCode) {
            const existingMeeting = activeMeetings?.[meetingRoom];
            const hasParticipants = existingMeeting?.participantCount > 0;
            
            console.log('🎬 Auto-joining meeting after delay:', meetingRoom);
            console.log('🎬 Active meetings:', activeMeetings);
            console.log('🎬 Existing meeting:', existingMeeting);
            console.log('🎬 Existing meeting found:', hasParticipants ? 'Yes, joining as participant' : 'No, joining as leader');
            
            hasJoinedRef.current = true;
            joinMeeting(meetingRoom, !hasParticipants);
          }
        }, 500);
      } else if (activeMeetings && Object.keys(activeMeetings).length > 0) {
        // Active meetings loaded, check immediately
        const existingMeeting = activeMeetings[meetingRoom];
        const hasParticipants = existingMeeting?.participantCount > 0;
        
        console.log('🎬 Auto-joining meeting on page load:', meetingRoom);
        console.log('🎬 Active meetings:', activeMeetings);
        console.log('🎬 Existing meeting:', existingMeeting);
        console.log('🎬 Existing meeting found:', hasParticipants ? 'Yes, joining as participant' : 'No, joining as leader');
        
        hasJoinedRef.current = true;
        joinMeeting(meetingRoom, !hasParticipants);
      }
    }
  }, [teamId, isConnected, joinMeeting, meetingCode, activeMeetings]);

  useEffect(() => {
    fetchOrganizationTheme();
    
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    const handleOrgChange = () => {
      fetchOrganizationTheme();
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    window.addEventListener('organizationChanged', handleOrgChange);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
      window.removeEventListener('organizationChanged', handleOrgChange);
    };
  }, [user?.organizationId, user?.organization_id]);

  const getStatusDotColor = (status) => {
    // Return inline style object for dynamic colors
    switch (status) {
      case 'complete':
        return { backgroundColor: '#10B981' }; // Keep green for complete
      case 'on-track':
        return { backgroundColor: themeColors.primary };
      case 'off-track':
        return { backgroundColor: '#EF4444' }; // Keep red for off-track
      default:
        return { backgroundColor: '#9CA3AF' };
    }
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return 0;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      
      let due;
      // If the date string is in YYYY-MM-DD format, parse it as local date
      if (typeof dueDate === 'string' && dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dueDate.split('-').map(Number);
        due = new Date(year, month - 1, day);
      } else {
        // Otherwise parse normally (handles ISO timestamps)
        due = new Date(dueDate);
      }
      
      due.setHours(0, 0, 0, 0); // Reset time to start of day
      
      const diff = due - today;
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error('Error calculating days until due:', error, 'for date:', dueDate);
      return 0;
    }
  };

  const fetchOrganizationTheme = async () => {
    try {
      const orgId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
      const orgData = await organizationService.getOrganization();
      
      if (orgData) {
        const theme = {
          primary: orgData.theme_primary_color || '#3B82F6',
          secondary: orgData.theme_secondary_color || '#1E40AF',
          accent: orgData.theme_accent_color || '#60A5FA'
        };
        setThemeColors(theme);
        saveOrgTheme(orgId, theme);
      } else {
        const savedTheme = getOrgTheme(orgId);
        if (savedTheme) {
          setThemeColors(savedTheme);
        }
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
      const orgId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
      const savedTheme = getOrgTheme(orgId);
      if (savedTheme) {
        setThemeColors(savedTheme);
      }
    }
  };

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
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      const departmentId = teamId || user?.teamId;
      
      console.log('WeeklyMeeting - Fetching scorecard data for:', { orgId, effectiveTeamId, departmentId });
      
      const response = await scorecardService.getScorecard(orgId, effectiveTeamId, departmentId);
      
      console.log('WeeklyMeeting - Scorecard response:', response);
      console.log('WeeklyMeeting - Response structure:', {
        hasData: !!response?.data,
        metricsCount: response?.data?.metrics?.length || response?.metrics?.length || 0,
        weeklyScoresKeys: Object.keys(response?.data?.weeklyScores || response?.weeklyScores || {}),
        sampleScores: response?.data?.weeklyScores || response?.weeklyScores || {}
      });
      
      if (response && response.data) {
        // Filter to only show weekly metrics
        const weeklyMetrics = (response.data.metrics || []).filter(m => m.type === 'weekly');
        console.log('Weekly metrics found:', weeklyMetrics.length, weeklyMetrics);
        setScorecardMetrics(weeklyMetrics);
        setWeeklyScores(response.data.weeklyScores || {});
        setMonthlyScores(response.data.monthlyScores || {});
        setWeeklyNotes(response.data.weeklyNotes || {});
        setMonthlyNotes(response.data.monthlyNotes || {});
      } else if (response) {
        // Filter to only show weekly metrics
        const weeklyMetrics = (response.metrics || []).filter(m => m.type === 'weekly');
        console.log('Weekly metrics found (no data wrapper):', weeklyMetrics.length, weeklyMetrics);
        setScorecardMetrics(weeklyMetrics);
        setWeeklyScores(response.weeklyScores || {});
        setMonthlyScores(response.monthlyScores || {});
        setWeeklyNotes(response.weeklyNotes || {});
        setMonthlyNotes(response.monthlyNotes || {});
      }
    } catch (error) {
      console.error('Failed to fetch scorecard:', error);
    }
  };

  const fetchPrioritiesData = async () => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
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
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      // Fetch both short-term and long-term issues
      const [shortTermResponse, longTermResponse] = await Promise.all([
        issuesService.getIssues('short_term', false, effectiveTeamId),
        issuesService.getIssues('long_term', false, effectiveTeamId)
      ]);
      
      // Don't re-sort issues - they come from backend already sorted by priority_rank
      // This preserves the drag-and-drop order
      setShortTermIssues(shortTermResponse.data.issues || []);
      setLongTermIssues(longTermResponse.data.issues || []);
      setTeamMembers(shortTermResponse.data.teamMembers || []);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
    }
  };

  // Helper function to check if a todo is overdue
  const isOverdue = (todo) => {
    if (!todo.due_date || todo.status === 'complete' || todo.status === 'cancelled') {
      return false;
    }
    const dueDate = new Date(todo.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const fetchTodosData = async () => {
    try {
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      const response = await todosService.getTodos(
        null, // status filter
        null, // assignee filter
        true, // include completed - show all todos
        effectiveTeamId // department filter
      );
      const fetchedTodos = response.data?.todos || [];
      
      setTodos(fetchedTodos);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    }
  };

  const fetchTodaysTodos = async () => {
    try {
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      const response = await todosService.getTodaysTodos(effectiveTeamId);
      setTodaysTodos(response.todos || []);
    } catch (error) {
      console.error('Failed to fetch today\'s todos:', error);
    }
  };

  // Auto-start meeting timer only if leader
  useEffect(() => {
    // Only start timer if we're the leader (first to join)
    // Otherwise, timer will be synced from meeting-joined event
    if (isLeader && !meetingStartTime) {
      const now = Date.now();
      setMeetingStartTime(now);
      setMeetingStarted(true);
      setElapsedTime(0);
      
      // Sync timer with other participants
      if (syncTimer) {
        syncTimer({
          startTime: now,
          isPaused: false
        });
      }
    }
    
    // Dispatch custom event to immediately update Layout
    window.dispatchEvent(new Event('meetingStateChanged'));
    
    // Fetch today's todos for the conclude section
    fetchTodaysTodos();
  }, [isLeader, syncTimer]);

  // Fetch data based on active section
  useEffect(() => {
    if (activeSection === 'conclude') {
      fetchAvailableTeams();
    } else if (activeSection === 'headlines') {
      fetchCascadedMessages();
      fetchHeadlines();
    }
  }, [activeSection]);

  const fetchHeadlines = async () => {
    try {
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      console.log('Fetching headlines for teamId:', effectiveTeamId);
      
      // Fetch headlines for this team
      const response = await headlinesService.getHeadlines(effectiveTeamId);
      console.log('Headlines response:', response);
      
      // Group headlines by type
      const grouped = { customer: [], employee: [] };
      response.data.forEach(headline => {
        if (headline.type === 'customer') {
          grouped.customer.push(headline);
        } else if (headline.type === 'employee') {
          grouped.employee.push(headline);
        }
      });
      
      console.log('Grouped headlines:', grouped);
      setHeadlines(grouped);
    } catch (error) {
      console.error('Failed to fetch headlines:', error);
    }
  };

  const handleAddIssue = () => {
    setEditingIssue(null);
    setShowIssueDialog(true);
  };
  
  const handleAddIssueFromMetric = async (metric, isOffTrack) => {
    try {
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      const status = isOffTrack ? 'Off Track' : 'Needs Attention';
      
      await issuesService.createIssue({
        title: `${status}: ${metric.name}`,
        description: `Metric "${metric.name}" is ${status.toLowerCase()} and requires attention.\n\nGoal: ${formatGoal(metric.goal, metric.value_type, metric.comparison_operator)}\nOwner: ${metric.ownerName || metric.owner || 'Unassigned'}\n\nData Source: ${metric.description || 'No data source specified'}`,
        timeline: 'short_term',
        ownerId: metric.ownerId || null,
        department_id: effectiveTeamId
      });
      
      setSuccess(
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span>Issue created for metric "{metric.name}"</span>
        </div>
      );
      
      await fetchIssuesData();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to create issue from metric:', error);
      setError('Failed to create issue from metric');
    }
  };
  
  // Helper function for formatting goal
  const formatGoal = (goal, valueType, comparisonOperator) => {
    if (!goal && goal !== 0) return 'No goal';
    
    let formattedValue;
    if (valueType === 'currency') {
      formattedValue = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(parseFloat(goal));
    } else if (valueType === 'percentage') {
      formattedValue = `${Math.round(parseFloat(goal))}%`;
    } else {
      formattedValue = Math.round(parseFloat(goal)).toString();
    }
    
    switch (comparisonOperator) {
      case 'greater_equal':
        return `≥ ${formattedValue}`;
      case 'less_equal':
        return `≤ ${formattedValue}`;
      case 'equal':
        return `= ${formattedValue}`;
      default:
        return `≥ ${formattedValue}`;
    }
  };

  const handleAddTodo = () => {
    setEditingTodo(null);
    setShowTodoDialog(true);
  };

  const handleSaveIssue = async (issueData) => {
    try {
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      let savedIssue;
      if (editingIssue) {
        savedIssue = await issuesService.updateIssue(editingIssue.id, issueData);
        setSuccess('Issue updated successfully');
        
        // Broadcast issue update to other participants
        if (meetingCode && broadcastIssueListUpdate) {
          broadcastIssueListUpdate({
            action: 'update',
            issueId: editingIssue.id,
            issue: savedIssue.data || savedIssue
          });
        }
      } else {
        savedIssue = await issuesService.createIssue({
          ...issueData,
          timeline: issueTimeline,
          department_id: effectiveTeamId
        });
        setSuccess('Issue created successfully');
        
        // Broadcast new issue to other participants
        if (meetingCode && broadcastIssueListUpdate) {
          broadcastIssueListUpdate({
            action: 'create',
            issue: savedIssue.data || savedIssue
          });
        }
      }
      
      await fetchIssuesData();
      setShowIssueDialog(false);
      setEditingIssue(null);
      return savedIssue; // Return the actual created/updated issue
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
      // Update both short-term and long-term issues states
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
      
      // Broadcast status change to other meeting participants
      if (meetingCode && broadcastIssueUpdate) {
        broadcastIssueUpdate({ issueId, status: newStatus });
      }
      
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
          const newVoteCount = shouldVote 
            ? (issue.vote_count || 0) + 1 
            : Math.max(0, (issue.vote_count || 0) - 1);
          
          // Broadcast vote to other meeting participants
          if (meetingCode && broadcastVote) {
            broadcastVote(issueId, newVoteCount, shouldVote);
          }
          
          return {
            ...issue,
            user_has_voted: shouldVote,
            vote_count: newVoteCount
          };
        }
        return issue;
      };
      
      // Update the appropriate issues list based on current timeline
      // Don't re-sort - preserve the drag-and-drop order
      if (issueTimeline === 'short_term') {
        setShortTermIssues(prev => prev.map(updateVote));
      } else {
        setLongTermIssues(prev => prev.map(updateVote));
      }
      
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
      
      // Broadcast issue archive to other participants
      if (meetingCode && broadcastIssueListUpdate) {
        broadcastIssueListUpdate({
          action: 'delete',
          issueId
        });
      }
    } catch (error) {
      console.error('Failed to archive issue:', error);
      setError('Failed to archive issue');
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
    await fetchIssuesData();
  };

  const handleSaveTodo = async (todoData) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      let savedTodo;
      if (editingTodo) {
        savedTodo = await todosService.updateTodo(editingTodo.id, {
          ...todoData,
          department_id: effectiveTeamId
        });
        setSuccess('To-do updated successfully');
        
        // Broadcast todo update to other participants
        if (meetingCode && broadcastTodoUpdate) {
          broadcastTodoUpdate({
            action: 'update',
            todoId: editingTodo.id,
            todo: savedTodo.data || savedTodo
          });
        }
      } else {
        savedTodo = await todosService.createTodo({
          ...todoData,
          organization_id: orgId,
          department_id: effectiveTeamId
        });
        setSuccess('To-do created successfully');
        
        // Broadcast new todo to other participants
        if (meetingCode && broadcastTodoUpdate) {
          broadcastTodoUpdate({
            action: 'create',
            todo: savedTodo.data || savedTodo
          });
        }
      }
      
      // Refresh todos after creating/updating
      await fetchTodosData();
      
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

  const handleReorderIssues = async (reorderedIssues) => {
    try {
      // Update local state optimistically
      setShortTermIssues(issueTimeline === 'short_term' ? reorderedIssues : shortTermIssues);
      setLongTermIssues(issueTimeline === 'long_term' ? reorderedIssues : longTermIssues);

      // Call API to persist the new order
      const updates = reorderedIssues.map((issue, index) => ({
        id: issue.id,
        priority_rank: index
      }));

      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      await issuesService.updateIssueOrder(orgId, effectiveTeamId, updates);
      
      // Broadcast the reordering to other meeting participants
      if (meetingCode && broadcastIssueListUpdate) {
        broadcastIssueListUpdate({
          action: 'reorder',
          timeline: issueTimeline,
          issues: reorderedIssues
        });
      }
    } catch (error) {
      console.error('Failed to reorder issues:', error);
      // Refresh to get correct order on error
      fetchIssuesData();
      throw error;
    }
  };

  // Create To-Do from Issue
  const handleCreateTodoFromIssue = (issue) => {
    setTodoFromIssue(issue);
    // Don't set editingTodo for new todos - that's only for existing todos
    setEditingTodo(null);
    setShowTodoDialog(true);
  };

  // Create Issue from To-Do
  const handleCreateIssueFromTodo = async (todo) => {
    try {
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      // Create the issue using issuesService directly
      await issuesService.createIssue({
        title: `Issue from To-Do: ${todo.title}`,
        description: `Related to to-do: ${todo.title}\n\n${todo.description || ''}`,
        ownerId: todo.assigned_to_id || todo.assignee_id || user?.id,
        teamId: effectiveTeamId,
        related_todo_id: todo.id // Link back to the todo
      });
      
      setSuccess('Issue created successfully from to-do');
      await fetchIssuesData();
      
      // Stay on the current section (don't navigate away from todos)
      // Users can manually navigate to IDS if they want to see the issue
      // setActiveSection('ids');
    } catch (error) {
      console.error('Failed to create issue from todo:', error);
      
      // Check if it's a duplicate issue error
      if (error.response?.status === 409) {
        setError('An issue has already been created for this to-do. Each to-do can only have one linked issue.');
      } else {
        setError('Failed to create issue from to-do');
      }
    }
  };

  // Send Cascading Message from Issue
  const handleSendCascadingMessage = async (issue) => {
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

  // Priority handlers
  const handleUpdatePriority = async (priorityId, updates) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = getEffectiveTeamId(null, user);
      
      await quarterlyPrioritiesService.updatePriority(orgId, teamId, priorityId, updates);
      
      // Update local state
      setPriorities(prev => 
        prev.map(p => 
          p.id === priorityId ? { ...p, ...updates } : p
        )
      );
      
      // {labels.priority_singular || 'Priority'} updated silently - no success message to avoid screen jumping
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
          const effectiveTeamId = getEffectiveTeamId(teamId, user);
          
          // Ensure we have a valid title
          const priorityTitle = priority.title || priority.name || 'Untitled Priority';
          
          // Create issue from off-track priority
          const issueData = {
            title: `Off-Track ${labels.priority_singular || 'Priority'}: ${priorityTitle}`,
            description: `Priority "${priorityTitle}" is off-track and needs attention.\n\nOriginal priority: ${priority.description || 'No description'}`,
            timeline: 'short_term',
            department_id: effectiveTeamId, // issuesService expects department_id
            teamId: effectiveTeamId, // Add teamId as well for compatibility
            ownerId: priority.owner_id || priority.ownerId || user?.id, // Backend expects ownerId
            status: 'open',
            priority_level: 'high',
            related_priority_id: priorityId
          };
          
          console.log('Creating issue with data:', issueData);
          
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
      const teamId = getEffectiveTeamId(null, user);
      
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

  const handleCreateDiscussionIssue = async (priority) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      // Ensure we have a valid title
      const priorityTitle = priority.title || priority.name || 'Untitled Priority';
      const ownerName = priority.owner?.name || 'Unassigned';
      const dueDate = priority.dueDate ? format(new Date(priority.dueDate), 'MMM dd, yyyy') : 'Not set';
      
      // Create discussion issue
      const issueData = {
        title: `Discussion: ${priorityTitle}`,
        description: `Priority "${priorityTitle}" has been dropped down for discussion.\n\nStatus: ${priority.status || 'on-track'}\nOwner: ${ownerName}\nDue Date: ${dueDate}\n\nDescription: ${priority.description || 'No description provided'}`,
        timeline: 'short_term',
        department_id: effectiveTeamId,
        teamId: effectiveTeamId,
        ownerId: priority.owner?.id || priority.owner_id || priority.ownerId || user?.id,
        status: 'open',
        priority_level: 'normal',
        related_priority_id: priority.id
      };
      
      await issuesService.createIssue(issueData);
      
      // Show success message with visual feedback
      setSuccess(
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span>Discussion issue created and added to Issues List</span>
        </div>
      );
      
      // Refresh issues data
      await fetchIssuesData();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Failed to create discussion issue:', error);
      setError('Failed to create discussion issue');
    }
  };

  const handleArchivePriority = async (priorityId) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = getEffectiveTeamId(null, user);
      
      await quarterlyPrioritiesService.archivePriority(orgId, teamId, priorityId);
      
      // Remove from local state
      setPriorities(prev => prev.filter(p => p.id !== priorityId));
    } catch (error) {
      console.error('Failed to archive priority:', error);
    }
  };

  const handleAddMilestone = async (priorityId, milestone) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = getEffectiveTeamId(null, user);
      
      await quarterlyPrioritiesService.createMilestone(orgId, teamId, priorityId, milestone);
      await fetchPrioritiesData();
    } catch (error) {
      console.error('Failed to add milestone:', error);
    }
  };

  const handleEditMilestone = async (priorityId, milestoneId, updates) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = getEffectiveTeamId(null, user);
      
      await quarterlyPrioritiesService.updateMilestone(orgId, teamId, priorityId, milestoneId, updates);
      await fetchPrioritiesData();
    } catch (error) {
      console.error('Failed to edit milestone:', error);
    }
  };

  const handleDeleteMilestone = async (priorityId, milestoneId) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = getEffectiveTeamId(null, user);
      
      await quarterlyPrioritiesService.deleteMilestone(orgId, teamId, priorityId, milestoneId);
      await fetchPrioritiesData();
    } catch (error) {
      console.error('Failed to delete milestone:', error);
    }
  };

  const handleAddUpdate = async (priorityId, updateText) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = getEffectiveTeamId(null, user);
      
      await quarterlyPrioritiesService.createUpdate(orgId, teamId, priorityId, { text: updateText });
      await fetchPrioritiesData();
    } catch (error) {
      console.error('Failed to add update:', error);
    }
  };

  const handleEditUpdate = async (priorityId, updateId, newText) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = getEffectiveTeamId(null, user);
      
      await quarterlyPrioritiesService.updateUpdate(orgId, teamId, priorityId, updateId, { text: newText });
      await fetchPrioritiesData();
    } catch (error) {
      console.error('Failed to edit update:', error);
    }
  };

  const handleDeleteUpdate = async (priorityId, updateId) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = getEffectiveTeamId(null, user);
      
      await quarterlyPrioritiesService.deleteUpdate(orgId, teamId, priorityId, updateId);
      await fetchPrioritiesData();
    } catch (error) {
      console.error('Failed to delete update:', error);
    }
  };

  const handleUploadAttachment = async (priorityId, file) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = getEffectiveTeamId(null, user);
      
      await quarterlyPrioritiesService.uploadAttachment(orgId, teamId, priorityId, file);
      await fetchPrioritiesData();
    } catch (error) {
      console.error('Failed to upload attachment:', error);
    }
  };

  const handleDeleteAttachment = async (priorityId, attachmentId) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = getEffectiveTeamId(null, user);
      
      await quarterlyPrioritiesService.deleteAttachment(orgId, teamId, priorityId, attachmentId);
      await fetchPrioritiesData();
    } catch (error) {
      console.error('Failed to delete attachment:', error);
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

  const fetchAvailableTeams = async () => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      const response = await cascadingMessagesService.getAvailableTeams(orgId, effectiveTeamId);
      setAvailableTeams(response.data || []);
    } catch (error) {
      console.error('Failed to fetch available teams:', error);
    }
  };

  const fetchCascadedMessages = async () => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      const response = await cascadingMessagesService.getCascadingMessages(orgId, effectiveTeamId);
      setCascadedMessages(response.data || []);
    } catch (error) {
      console.error('Failed to fetch cascaded messages:', error);
    }
  };

  const concludeMeeting = async () => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      // Calculate meeting duration in minutes
      const durationMinutes = Math.floor(elapsedTime / 60);
      
      // Send cascading message if provided
      if (cascadingMessage.trim()) {
        await cascadingMessagesService.createCascadingMessage(orgId, effectiveTeamId, {
          message: cascadingMessage,
          recipientTeamIds: cascadeToAll ? null : selectedTeams,
          allTeams: cascadeToAll
        });
      }
      
      // Calculate average rating from all participants
      const ratingsArray = Object.values(participantRatings).map(r => r.rating);
      const averageRating = ratingsArray.length > 0 
        ? ratingsArray.reduce((sum, r) => sum + r, 0) / ratingsArray.length
        : meetingRating || 8;
      
      // Send meeting summary with individual and average ratings
      await meetingsService.concludeMeeting(orgId, effectiveTeamId, {
        meetingType: 'weekly',
        duration: durationMinutes,
        rating: averageRating,
        individualRatings: participantRatings, // Include individual ratings
        cascadingMessage: cascadingMessage,
        issuesDiscussed: selectedIssueIds.length,
        todosAssigned: selectedTodoIds.length
      });
      
      setSuccess('Meeting concluded and summary sent!');
      
      // Broadcast meeting end to all participants
      if (meetingCode) {
        // Create a custom event that all participants will receive
        const meetingEndEvent = new CustomEvent('meeting-ended', {
          detail: { message: 'Meeting has been concluded by the presenter' }
        });
        
        // Broadcast through the meeting socket if available
        if (broadcastIssueListUpdate) {
          broadcastIssueListUpdate({
            action: 'meeting-ended',
            message: 'Meeting has been concluded by the presenter'
          });
        }
      }
      
      // Leave the meeting room
      if (leaveMeeting) {
        leaveMeeting();
      }
      
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
    
    // Emit navigation event if leader
    if (isLeader && navigateToSection) {
      navigateToSection(sectionId);
    }
  };
  
  // Listen for section changes from leader
  useEffect(() => {
    const handleMeetingSectionChange = (event) => {
      const { section } = event.detail;
      if (section && !isLeader) {
        console.log('📍 Follower changing section to:', section);
        setActiveSection(section);
      }
    };
    
    window.addEventListener('meeting-section-change', handleMeetingSectionChange);
    return () => window.removeEventListener('meeting-section-change', handleMeetingSectionChange);
  }, [isLeader]);
  
  // Listen for all meeting updates from other participants
  useEffect(() => {
    const handleVoteUpdate = (event) => {
      const { issueId, voteCount, voterId } = event.detail;
      
      // Don't update if this is our own vote
      if (voterId === user?.id) return;
      
      console.log('📊 Received vote update for issue:', issueId, 'new count:', voteCount);
      
      const updateIssueVote = (issue) => {
        if (issue.id === issueId) {
          return {
            ...issue,
            vote_count: voteCount
          };
        }
        return issue;
      };
      
      setShortTermIssues(prev => prev.map(updateIssueVote));
      setLongTermIssues(prev => prev.map(updateIssueVote));
    };
    
    const handleIssueUpdate = (event) => {
      const issueData = event.detail;
      console.log('📊 Received issue update:', issueData);
      fetchIssuesData();
    };
    
    const handleTodoUpdate = (event) => {
      const { action, todoId, todo, status, completed } = event.detail;
      console.log('✅ Received todo update:', event.detail);
      
      if (action === 'create') {
        setTodos(prev => [...prev, todo]);
      } else if (action === 'update') {
        // Handle todo edits - replace the entire todo with the updated one
        setTodos(prev => prev.map(t => t.id === todoId ? (todo.id ? todo : { ...t, ...todo }) : t));
      } else if (action === 'status') {
        // Handle status changes (checking/unchecking)
        setTodos(prev => prev.map(t => 
          t.id === todoId ? { ...t, status, completed } : t
        ));
      } else if (action === 'delete') {
        setTodos(prev => prev.filter(t => t.id !== todoId));
      } else if (action === 'archive-done') {
        // Archive all completed todos
        setTodos(prev => prev.filter(t => t.status !== 'complete'));
      } else if (action === 'refresh') {
        fetchTodosData();
      }
    };
    
    const handleIssueListUpdate = (event) => {
      const { action, issue, issueId, timeline, issues } = event.detail;
      console.log('📝 Received issue list update:', event.detail);
      
      if (action === 'create' && issue) {
        // Add new issue to the appropriate list
        if (issue.timeline === 'short_term') {
          setShortTermIssues(prev => [...prev, issue]);
        } else {
          setLongTermIssues(prev => [...prev, issue]);
        }
      } else if (action === 'update' && issue) {
        // Update existing issue
        setShortTermIssues(prev => prev.map(i => i.id === issueId ? issue : i));
        setLongTermIssues(prev => prev.map(i => i.id === issueId ? issue : i));
      } else if (action === 'delete' && issueId) {
        // Remove deleted/archived issue
        setShortTermIssues(prev => prev.filter(i => i.id !== issueId));
        setLongTermIssues(prev => prev.filter(i => i.id !== issueId));
      } else if (action === 'reorder' && issues) {
        // Update the order of issues
        if (timeline === 'short_term') {
          setShortTermIssues(issues);
        } else if (timeline === 'long_term') {
          setLongTermIssues(issues);
        }
      } else if (action === 'archive-closed') {
        // Remove all closed issues for the specified timeline
        if (timeline === 'short_term') {
          setShortTermIssues(prev => prev.filter(i => i.status !== 'closed'));
        } else if (timeline === 'long_term') {
          setLongTermIssues(prev => prev.filter(i => i.status !== 'closed'));
        }
      } else if (action === 'meeting-ended') {
        // Meeting has been concluded by presenter
        console.log('📍 Meeting ended by presenter');
        setSuccess('Meeting has been concluded by the presenter');
        
        // Reset meeting state
        setMeetingStarted(false);
        setMeetingStartTime(null);
        setElapsedTime(0);
        setMeetingRating(null);
        setActiveSection('good-news');
        
        // Clear sessionStorage
        sessionStorage.removeItem('meetingActive');
        sessionStorage.removeItem('meetingStartTime');
        
        // Update UI
        window.dispatchEvent(new Event('meetingStateChanged'));
        
        // Use timeout to ensure state updates before leaving
        setTimeout(() => {
          window.location.reload(); // Reload to fully reset
        }, 1000);
      } else if (action === 'refresh') {
        fetchIssuesData();
      }
    };
    
    const handleTimerUpdate = (event) => {
      const { startTime, isPaused } = event.detail;
      console.log('⏱️ Received timer update:', event.detail);
      if (startTime) {
        setMeetingStartTime(startTime); // Keep as number (milliseconds)
        setMeetingStarted(!isPaused);
      }
    };
    
    const handleNotesUpdate = (event) => {
      const { section, content } = event.detail;
      console.log('📝 Received notes update for section:', section);
      setSectionNotes(prev => ({ ...prev, [section]: content }));
    };
    
    const handlePresenterChange = (event) => {
      const { presenterName } = event.detail;
      console.log('👑 New presenter:', presenterName);
      setSuccess(`${presenterName} is now presenting`);
    };
    
    window.addEventListener('meeting-vote-update', handleVoteUpdate);
    window.addEventListener('meeting-issue-update', handleIssueUpdate);
    window.addEventListener('meeting-todo-update', handleTodoUpdate);
    window.addEventListener('meeting-issue-list-update', handleIssueListUpdate);
    window.addEventListener('meeting-timer-update', handleTimerUpdate);
    window.addEventListener('meeting-notes-update', handleNotesUpdate);
    window.addEventListener('meeting-presenter-changed', handlePresenterChange);
    
    return () => {
      window.removeEventListener('meeting-vote-update', handleVoteUpdate);
      window.removeEventListener('meeting-issue-update', handleIssueUpdate);
      window.removeEventListener('meeting-todo-update', handleTodoUpdate);
      window.removeEventListener('meeting-issue-list-update', handleIssueListUpdate);
      window.removeEventListener('meeting-timer-update', handleTimerUpdate);
      window.removeEventListener('meeting-notes-update', handleNotesUpdate);
      window.removeEventListener('meeting-presenter-changed', handlePresenterChange);
    };
  }, [user?.id]);

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
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                    <div className="p-2 rounded-xl" style={{ background: `linear-gradient(135deg, ${themeColors.primary}20 0%, ${themeColors.secondary}20 100%)` }}>
                      <Smile className="h-5 w-5" style={{ color: themeColors.primary }} />
                    </div>
                    Good News
                  </CardTitle>
                  <CardDescription className="mt-2 text-slate-600 font-medium">Share personal and professional wins</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingTodo(null);
                      setShowTodoDialog(true);
                    }}
                    className="text-white shadow-sm hover:shadow-md transition-all duration-200 text-xs"
                    style={{
                      background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    To Do
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingIssue(null);
                      setShowIssueDialog(true);
                    }}
                    className="text-white shadow-sm hover:shadow-md transition-all duration-200 text-xs"
                    style={{
                      background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Issue
                  </Button>
                  <div className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 shadow-sm font-medium">
                    5 minutes
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 px-6 pb-6">
              <div className="space-y-6">
                <p className="text-slate-600 text-lg leading-relaxed">
                  Take turns sharing good news from your personal and professional lives. 
                  This helps build team connection and starts the meeting on a positive note.
                </p>
                <div className="border border-white/30 p-6 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm">
                  <h4 className="font-bold mb-3 text-slate-900 flex items-center gap-2">
                    <Star className="h-4 w-4" style={{ color: themeColors.primary }} />
                    Tips for Good News:
                  </h4>
                  <ul className="list-disc list-inside text-sm space-y-2 text-slate-700">
                    <li className="font-medium">Keep it brief - aim for 30-60 seconds per person</li>
                    <li className="font-medium">Share good personal news and good business news</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'scorecard':
        return (
          <div className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                      <div className="p-2 rounded-xl" style={{ background: `linear-gradient(135deg, ${themeColors.primary}20 0%, ${themeColors.secondary}20 100%)` }}>
                        <BarChart className="h-5 w-5" style={{ color: themeColors.primary }} />
                      </div>
                      Scorecard Review
                    </CardTitle>
                    <CardDescription className="mt-1">Quick Status Update: Metric owners report "on-track" or "off-track" status</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingTodo(null);
                        setShowTodoDialog(true);
                      }}
                      className="text-white shadow-sm hover:shadow-md transition-all duration-200 text-xs"
                    style={{
                      background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                    }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      To Do
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingIssue(null);
                        setShowIssueDialog(true);
                      }}
                      className="text-white shadow-sm hover:shadow-md transition-all duration-200 text-xs"
                    style={{
                      background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                    }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Issue
                    </Button>
                    <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                      5 minutes
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
            {/* Scorecard Options */}
            {scorecardMetrics.length > 0 && (
              <div className="flex items-center gap-4 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 shadow-sm">
                <span className="text-sm font-medium text-gray-700">Display Options:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showScorecardAverage}
                    onChange={(e) => setShowScorecardAverage(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-600">Show Average</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showScorecardTotal}
                    onChange={(e) => setShowScorecardTotal(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-600">Show Total</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRTL}
                    onChange={(e) => {
                      setIsRTL(e.target.checked);
                      localStorage.setItem('scorecardRTL', e.target.checked.toString());
                    }}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-600">Right to Left</span>
                </label>
              </div>
            )}
            
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
              <ScorecardTableClean 
                  metrics={scorecardMetrics} 
                  weeklyScores={weeklyScores}
                  monthlyScores={monthlyScores}
                  weeklyNotes={weeklyNotes}
                  monthlyNotes={monthlyNotes}
                  type="weekly"
                  readOnly={true}
                  isRTL={isRTL}
                  showTotal={showScorecardTotal}
                  showAverage={showScorecardAverage}
                  departmentId={getEffectiveTeamId(teamId, user)}
                  onAddIssue={handleAddIssueFromMetric}
                  onScoreEdit={null}
                  onChartOpen={(metric) => setChartModal({ isOpen: true, metric: metric, metricId: metric.id })}
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
          <div className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 flex-1">
                    <div>
                      <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                        <div className="p-2 rounded-xl" style={{ background: `linear-gradient(135deg, ${themeColors.primary}20 0%, ${themeColors.secondary}20 100%)` }}>
                          <Target className="h-5 w-5" style={{ color: themeColors.primary }} />
                        </div>
                        {labels.priorities_label || 'Quarterly Priorities'} Review
                      </CardTitle>
                      <CardDescription className="mt-2 text-slate-600 font-medium">Check progress on quarterly priorities</CardDescription>
                    </div>
                    {priorities.length > 0 && (
                      <div className="text-center bg-white/50 rounded-xl px-4 py-2 border border-white/30">
                        <span className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                          {Math.round((priorities.filter(p => p.status === 'complete').length / priorities.length) * 100)}%
                        </span>
                        <p className="text-sm text-slate-600 font-medium">
                          {priorities.filter(p => p.status === 'complete').length} of {priorities.length} complete
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingTodo(null);
                        setShowTodoDialog(true);
                      }}
                      className="text-white shadow-lg hover:shadow-xl transition-all duration-200"
                      style={{
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      To Do
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingIssue(null);
                        setShowIssueDialog(true);
                      }}
                      className="text-white shadow-lg hover:shadow-xl transition-all duration-200"
                      style={{
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Issue
                    </Button>
                    <div className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 shadow-sm font-medium">
                      5 minutes
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
            {priorities.length === 0 ? (
              <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl">
                <CardContent className="text-center py-8">
                  <p className="text-slate-500 font-medium">No priorities found for this quarter.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4 bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200"
                    onClick={() => navigate('/quarterly-priorities')}
                  >
                    Go to {labels.priorities_label || 'Quarterly Priorities'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="backdrop-blur-sm border border-opacity-50 rounded-2xl p-4 shadow-lg" style={{
                  background: `linear-gradient(135deg, ${hexToRgba(themeColors.primary, 0.1)} 0%, ${hexToRgba(themeColors.secondary, 0.1)} 100%)`,
                  borderColor: hexToRgba(themeColors.primary, 0.3)
                }}>
                  <p className="text-center font-medium" style={{ color: themeColors.primary }}>
                    <span className="font-bold">Quick Status Check:</span> Each priority owner reports "on-track" or "off-track" status
                  </p>
                </div>
                {/* Company {labels.priorities_label || 'Priorities'} Section */}
                {(() => {
                  const companyPriorities = priorities.filter(p => p.priority_type === 'company');
                  return companyPriorities.length > 0 && (
                    <div>
                      <div 
                        className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl cursor-pointer hover:bg-white/90 hover:shadow-lg transition-all duration-200 shadow-md"
                        onClick={() => setExpandedSections(prev => ({ 
                          ...prev, 
                          companyPriorities: !prev.companyPriorities 
                        }))}
                      >
                        <div className="flex items-center gap-3">
                          {expandedSections.companyPriorities ? (
                            <ChevronDown className="h-5 w-5 text-slate-600" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-slate-600" />
                          )}
                          <div className="p-2 rounded-xl" style={{
                            background: `linear-gradient(135deg, ${hexToRgba(themeColors.primary, 0.1)} 0%, ${hexToRgba(themeColors.secondary, 0.1)} 100%)`
                          }}>
                            <Building2 className="h-5 w-5" style={{ color: themeColors.primary }} />
                          </div>
                          <h3 className="text-lg font-bold text-slate-900">
                            Company {labels.priorities_label || 'Priorities'}
                          </h3>
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            {companyPriorities.length}
                          </Badge>
                        </div>
                      </div>
                      {expandedSections.companyPriorities && (
                        <div className="space-y-4 ml-7 mt-4">
                          {companyPriorities.map(priority => {
                            const isComplete = priority.status === 'complete' || priority.status === 'completed' || priority.progress === 100;
                            const daysUntil = !isComplete ? getDaysUntilDue(priority.dueDate || priority.due_date) : null;
                            const displayProgress = isComplete ? 100 : (priority.progress || 0);
                            
                            return (
                              <Card 
                                key={priority.id}
                                className={`max-w-5xl transition-all duration-300 hover:shadow-lg hover:scale-[1.01] cursor-pointer ${
                                  isComplete 
                                    ? 'bg-gradient-to-r from-green-50/80 to-emerald-50/80 border-green-200' 
                                    : 'bg-white/90 backdrop-blur-sm border-slate-200'
                                }`}
                                onClick={() => {
                                  setSelectedPriority(priority);
                                  setShowPriorityDialog(true);
                                }}
                              >
                                <CardHeader className="pb-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3">
                                        {isComplete ? (
                                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                        ) : (
                                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={getStatusDotColor(priority.status)} />
                                        )}
                                        <h3 className={`text-lg font-semibold break-words ${
                                          isComplete 
                                            ? 'text-green-900 line-through decoration-green-400' 
                                            : 'text-gray-900'
                                        }`}>
                                          {priority.title}
                                        </h3>
                                      </div>
                                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                        <span className="flex items-center gap-1">
                                          <User className="h-3 w-3" />
                                          {priority.owner?.name || 'Unassigned'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          Due {priority.dueDate ? format(new Date(priority.dueDate), 'MMM d') : 'No date'}
                                        </span>
                                        {daysUntil !== null && (
                                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                            daysUntil < 0 ? 'bg-red-100 text-red-700' :
                                            daysUntil <= 7 ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-green-100 text-green-700'
                                          }`}>
                                            {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` :
                                             daysUntil === 0 ? 'Due today' :
                                             `${daysUntil} days left`}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-right">
                                        <div className="text-2xl font-bold" style={{ color: themeColors.primary }}>
                                          {displayProgress}%
                                        </div>
                                        <Progress value={displayProgress} className="w-24 h-2" />
                                      </div>
                                      {isComplete && (
                                        <Badge className="bg-green-100 text-green-800 border-green-200">
                                          Complete
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </CardHeader>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                {/* Individual {labels.priorities_label || 'Priorities'} Section */}
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
                      <div className="flex items-center gap-3 p-4 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-md">
                        <div className="p-2 rounded-xl" style={{
                          background: `linear-gradient(135deg, ${hexToRgba(themeColors.primary, 0.1)} 0%, ${hexToRgba(themeColors.secondary, 0.1)} 100%)`
                        }}>
                          <Users className="h-5 w-5" style={{ color: themeColors.primary }} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">
                          Individual {labels.priorities_label || 'Priorities'}
                        </h3>
                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
                          {individualPriorities.length}
                        </Badge>
                      </div>
                      {Object.entries(groupedByOwner).map(([ownerId, ownerPriorities]) => {
                        const owner = ownerPriorities[0]?.owner;
                        const isExpanded = expandedSections.individualPriorities[ownerId];
                        return (
                          <div key={ownerId} className="ml-7">
                            <div 
                              className="flex items-center gap-3 p-3 bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl cursor-pointer hover:bg-white/90 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg shadow-sm"
                              onClick={() => setExpandedSections(prev => ({ 
                                ...prev, 
                                individualPriorities: {
                                  ...prev.individualPriorities,
                                  [ownerId]: !prev.individualPriorities[ownerId]
                                }
                              }))}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-600" />
                              )}
                              <h4 className="text-md font-semibold text-slate-800">
                                {owner?.name || 'Unassigned'}
                              </h4>
                              <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200">
                                {ownerPriorities.length}
                              </Badge>
                            </div>
                            {isExpanded && (
                              <div className="space-y-4 ml-7 mt-4">
                                {ownerPriorities.map(priority => {
                                  const isComplete = priority.status === 'complete' || priority.status === 'completed' || priority.progress === 100;
                                  const daysUntil = !isComplete ? getDaysUntilDue(priority.dueDate || priority.due_date) : null;
                                  const displayProgress = isComplete ? 100 : (priority.progress || 0);
                                  
                                  return (
                                    <Card 
                                      key={priority.id}
                                      className={`max-w-5xl transition-all duration-300 hover:shadow-lg hover:scale-[1.01] cursor-pointer ${
                                        isComplete 
                                          ? 'bg-gradient-to-r from-green-50/80 to-emerald-50/80 border-green-200' 
                                          : 'bg-white/90 backdrop-blur-sm border-slate-200'
                                      }`}
                                      onClick={() => {
                                        setSelectedPriority(priority);
                                        setShowPriorityDialog(true);
                                      }}
                                    >
                                      <CardHeader className="pb-4">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3">
                                              {isComplete ? (
                                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                              ) : (
                                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={getStatusDotColor(priority.status)} />
                                              )}
                                              <h3 className={`text-lg font-semibold break-words ${
                                                isComplete 
                                                  ? 'text-green-900 line-through decoration-green-400' 
                                                  : 'text-gray-900'
                                              }`}>
                                                {priority.title}
                                              </h3>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                              <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Due {priority.dueDate ? format(new Date(priority.dueDate), 'MMM d') : 'No date'}
                                              </span>
                                              {daysUntil !== null && (
                                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                  daysUntil < 0 ? 'bg-red-100 text-red-700' :
                                                  daysUntil <= 7 ? 'bg-yellow-100 text-yellow-700' :
                                                  'bg-green-100 text-green-700'
                                                }`}>
                                                  {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` :
                                                   daysUntil === 0 ? 'Due today' :
                                                   `${daysUntil} days left`}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <div className="text-right">
                                              <div className="text-2xl font-bold" style={{ color: themeColors.primary }}>
                                                {displayProgress}%
                                              </div>
                                              <Progress value={displayProgress} className="w-24 h-2" />
                                            </div>
                                            {isComplete && (
                                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                                Complete
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </CardHeader>
                                    </Card>
                                  );
                                })}
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
            <CardHeader className="rounded-t-lg" style={{ 
              background: `linear-gradient(to right, ${hexToRgba(themeColors.accent, 0.1)}, ${hexToRgba(themeColors.primary, 0.1)})`
            }}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Newspaper className="h-5 w-5" style={{ color: themeColors.primary }} />
                    Customer & Employee Headlines
                  </CardTitle>
                  <CardDescription className="mt-1">Share important updates</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingTodo(null);
                      setShowTodoDialog(true);
                    }}
                    className="text-white shadow-sm hover:shadow-md transition-all duration-200 text-xs"
                    style={{
                      background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    To Do
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingIssue(null);
                      setShowIssueDialog(true);
                    }}
                    className="text-white shadow-sm hover:shadow-md transition-all duration-200 text-xs"
                    style={{
                      background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Issue
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowHeadlineDialog(true)}
                    className="text-white shadow-sm hover:shadow-md transition-all duration-200 text-xs"
                    style={{
                      background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Headline
                  </Button>
                  <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                    5 minutes
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <p className="text-gray-600">
                  Share critical information about customers and employees that the team needs to know.
                </p>
                
                {/* Cascaded Messages Section */}
                {cascadedMessages.length > 0 && (
                  <div className="border border-blue-200 bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3 text-gray-900 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" style={{ color: themeColors.primary }} />
                      Cascaded Messages from Other Teams
                    </h4>
                    <div className="space-y-3">
                      {cascadedMessages.map((message) => (
                        <div key={message.id} className="bg-white p-3 rounded-lg border border-blue-100">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">
                                From: {message.from_team_name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(message.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {!message.is_read && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">New</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{message.message}</p>
                          <p className="text-xs text-gray-500 mt-2">Sent by: {message.created_by_name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-white/30 p-4 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm">
                    <h4 className="font-medium mb-2 text-gray-900 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Customer Headlines
                    </h4>
                    {headlines.customer.length > 0 ? (
                      <ul className="list-disc list-inside text-sm space-y-2">
                        {headlines.customer.map((headline) => (
                          <li key={headline.id} className="text-gray-700">
                            {headline.text}
                            <span className="text-xs text-gray-500 ml-2">
                              - {headline.created_by_name || headline.createdBy || 'Unknown'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="list-disc list-inside text-sm space-y-1 text-gray-500">
                        <li>Major customer wins or losses</li>
                        <li>Important customer feedback</li>
                        <li>Market changes affecting customers</li>
                        <li>Competitive developments</li>
                      </ul>
                    )}
                  </div>
                  <div className="border border-white/30 p-4 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm">
                    <h4 className="font-medium mb-2 text-gray-900 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Employee Headlines
                    </h4>
                    {headlines.employee.length > 0 ? (
                      <ul className="list-disc list-inside text-sm space-y-2">
                        {headlines.employee.map((headline) => (
                          <li key={headline.id} className="text-gray-700">
                            {headline.text}
                            <span className="text-xs text-gray-500 ml-2">
                              - {headline.created_by_name || headline.createdBy || 'Unknown'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="list-disc list-inside text-sm space-y-1 text-gray-500">
                        <li>Team member updates</li>
                        <li>Hiring or departures</li>
                        <li>Important HR announcements</li>
                        <li>Team achievements to celebrate</li>
                      </ul>
                    )}
                  </div>
                </div>
                
                {/* Archive Headlines Button - shown only when there are headlines */}
                {(headlines.customer.length > 0 || headlines.employee.length > 0) && (
                  <div className="mt-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const effectiveTeamId = getEffectiveTeamId(teamId, user);
                          await headlinesService.archiveHeadlines(effectiveTeamId);
                          setSuccess('Headlines archived');
                          await fetchHeadlines(); // Refresh the headlines
                        } catch (error) {
                          console.error('Failed to archive headlines:', error);
                          setError('Failed to archive headlines');
                        }
                      }}
                    >
                      Archive All Headlines
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'todo-list':
        return (
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="rounded-t-lg" style={{ 
                background: `linear-gradient(to right, ${hexToRgba(themeColors.accent, 0.1)}, ${hexToRgba(themeColors.primary, 0.1)})`
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <ListTodo className="h-5 w-5" style={{ color: themeColors.primary }} />
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
                <div className="flex justify-between mb-4">
                  <div>
                    {(() => {
                      const doneTodosCount = todos.filter(t => t.status === 'complete' && !t.archived).length;
                      return doneTodosCount > 0 && (
                        <Button 
                          onClick={async () => {
                            try {
                              const result = await todosService.archiveDoneTodos();
                              setSuccess(`${result.data.archivedCount} done to-do(s) archived`);
                              await fetchTodosData();
                              
                              // Broadcast archive action to other meeting participants
                              broadcastTodoUpdate({
                                action: 'archive-done',
                                archivedCount: result.data.archivedCount
                              });
                            } catch (error) {
                              console.error('Failed to archive done todos:', error);
                              setError('Failed to archive done to-dos');
                            }
                          }}
                          className="text-white transition-all duration-200 shadow-md hover:shadow-lg rounded-lg"
                          style={{
                            background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                            ':hover': {
                              filter: 'brightness(1.1)'
                            }
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.filter = 'brightness(1.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.filter = 'brightness(1)';
                          }}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive Done ({doneTodosCount})
                        </Button>
                      );
                    })()}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleAddTodo}
                      className="text-white shadow-lg hover:shadow-xl transition-all duration-200"
                      style={{
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add To-do
                    </Button>
                    <Button 
                      onClick={handleAddIssue}
                      className="text-white shadow-lg hover:shadow-xl transition-all duration-200"
                      style={{
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Issue
                    </Button>
                  </div>
                </div>
                {todos.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No to-dos found for this week.</p>
                  </div>
                ) : (
                  <TodosListClean 
                    todos={todos}
                    onEdit={(todo) => {
                      setEditingTodo(todo);
                      setShowTodoDialog(true);
                    }}
                    onStatusChange={async (todoId, completed) => {
                      try {
                        await todosService.updateTodo(todoId, { 
                          status: completed ? 'complete' : 'incomplete' 
                        });
                        await fetchTodosData();
                        
                        // Broadcast todo status change to other meeting participants
                        broadcastTodoUpdate({
                          action: 'status',
                          todoId,
                          completed,
                          status: completed ? 'complete' : 'incomplete'
                        });
                      } catch (error) {
                        console.error('Failed to update todo:', error);
                      }
                    }}
                    onDelete={async (todoId) => {
                      try {
                        await todosService.deleteTodo(todoId);
                        await fetchTodosData();
                        setSuccess('To-do deleted');
                        
                        // Broadcast todo deletion/archive to other meeting participants
                        broadcastTodoUpdate({
                          action: 'delete',
                          todoId
                        });
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
              <CardHeader className="rounded-t-lg bg-gradient-to-r from-red-50 to-pink-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      Identify Discuss Solve
                    </CardTitle>
                    <CardDescription className="mt-1">Solve the most important Issue(s)</CardDescription>
                  </div>
                  <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                    60 minutes
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="border border-white/30 bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4 shadow-sm">
                  <p className="text-gray-700 text-center">
                    <span className="font-semibold">Quick voting:</span> Everyone votes on the most important issues. Then discuss and solve the top-voted issues together.
                  </p>
                </div>
                <div className="mb-4">
                  <Tabs value={issueTimeline} onValueChange={setIssueTimeline} className="w-full">
                    <div className="flex justify-between items-center mb-4">
                      <TabsList className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-xl p-1">
                        <TabsTrigger 
                          value="short_term" 
                          className="min-w-[120px] data-[state=active]:text-white"
                          style={{
                            '--active-bg': `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                          }}
                        >
                          Short Term ({shortTermIssues.length})
                        </TabsTrigger>
                        <TabsTrigger 
                          value="long_term" 
                          className="min-w-[120px] data-[state=active]:text-white"
                          style={{
                            '--active-bg': `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                          }}
                        >
                          Long Term ({longTermIssues.length})
                        </TabsTrigger>
                      </TabsList>
                      
                      <div className="flex gap-2">
                        {(() => {
                          const closedIssuesCount = currentIssues.filter(issue => issue.status === 'closed').length;
                          return closedIssuesCount > 0 && (
                            <Button 
                              onClick={async () => {
                                try {
                                  await issuesService.archiveClosedIssues(issueTimeline);
                                  setSuccess(`${closedIssuesCount} closed issue${closedIssuesCount > 1 ? 's' : ''} archived`);
                                  await fetchIssuesData();
                                  
                                  // Broadcast archive closed issues to other participants
                                  if (meetingCode && broadcastIssueListUpdate) {
                                    broadcastIssueListUpdate({
                                      action: 'archive-closed',
                                      timeline: issueTimeline,
                                      archivedCount: closedIssuesCount
                                    });
                                  }
                                } catch (error) {
                                  console.error('Failed to archive closed issues:', error);
                                  setError('Failed to archive closed issues');
                                }
                              }}
                              className="text-white transition-all duration-200 shadow-md hover:shadow-lg rounded-lg"
                          style={{
                            background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                            ':hover': {
                              filter: 'brightness(1.1)'
                            }
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.filter = 'brightness(1.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.filter = 'brightness(1)';
                          }}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive Solved ({closedIssuesCount})
                            </Button>
                          );
                        })()}
                        <Button 
                          onClick={handleAddTodo}
                          className="text-white shadow-lg hover:shadow-xl transition-all duration-200"
                      style={{
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                      }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add To Do
                        </Button>
                        <Button 
                          onClick={handleAddIssue}
                          className="text-white shadow-lg hover:shadow-xl transition-all duration-200"
                      style={{
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                      }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Issue
                        </Button>
                      </div>
                    </div>
                    
                    <TabsContent value="short_term" className="mt-0">
                      {shortTermIssues.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No short-term issues found.</p>
                        </div>
                      ) : (
                        <IssuesListClean
                          issues={shortTermIssues || []}
                          onEdit={handleEditIssue}
                          onSave={handleSaveIssue}
                          teamMembers={teamMembers}
                          onStatusChange={handleStatusChange}
                          onTimelineChange={handleTimelineChange}
                          onArchive={handleArchive}
                          onVote={handleVote}
                          onMoveToTeam={handleMoveToTeam}
                          onCreateTodo={handleCreateTodoFromIssue}
                          onSendCascadingMessage={handleSendCascadingMessage}
                          onReorder={handleReorderIssues}
                          enableDragDrop={true}
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
                          compactGrid={false}  // Allow toggle between grid and list views
                        />
                      )}
                    </TabsContent>
                    
                    <TabsContent value="long_term" className="mt-0">
                      {longTermIssues.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No long-term issues found.</p>
                        </div>
                      ) : (
                        <IssuesListClean
                          issues={longTermIssues || []}
                          onEdit={handleEditIssue}
                          onSave={handleSaveIssue}
                          teamMembers={teamMembers}
                          onStatusChange={handleStatusChange}
                          onTimelineChange={handleTimelineChange}
                          onArchive={handleArchive}
                          onVote={handleVote}
                          onMoveToTeam={handleMoveToTeam}
                          onCreateTodo={handleCreateTodoFromIssue}
                          onSendCascadingMessage={handleSendCascadingMessage}
                          onReorder={handleReorderIssues}
                          enableDragDrop={true}
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
                          compactGrid={false}  // Allow toggle between grid and list views
                        />
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'conclude':
        return (
          <Card className="border-0 shadow-sm">
            <CardHeader className="rounded-t-lg" style={{ 
              background: `linear-gradient(to right, ${hexToRgba(themeColors.accent, 0.1)}, ${hexToRgba(themeColors.primary, 0.1)})`
            }}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <CheckSquare className="h-5 w-5" style={{ color: themeColors.primary }} />
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
                {/* Open To-Dos Summary */}
                <div className="border border-gray-200 p-4 rounded-lg bg-white">
                  <h4 className="font-medium mb-3 text-gray-900 flex items-center gap-2">
                    <ListTodo className="h-4 w-4" />
                    Open To-Dos Summary
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Review all open action items before concluding the meeting:
                  </p>
                  {todos.filter(todo => todo.status !== 'complete' && todo.status !== 'completed' && todo.status !== 'cancelled').length === 0 ? (
                    <p className="text-gray-500 text-sm">No open to-dos</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {todos
                        .filter(todo => todo.status !== 'complete' && todo.status !== 'completed' && todo.status !== 'cancelled')
                        .map(todo => (
                          <div key={todo.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                            <div className="w-1 h-full rounded" style={{ 
                              backgroundColor: todo.priority === 'high' ? '#EF4444' : 
                                             todo.priority === 'medium' ? '#F59E0B' : 
                                             '#10B981',
                              minHeight: '40px'
                            }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{todo.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {todo.assigned_to && (
                                  <span className="text-xs text-gray-600">
                                    {todo.assigned_to.first_name} {todo.assigned_to.last_name}
                                  </span>
                                )}
                                {todo.due_date && (
                                  <>
                                    {todo.assigned_to && <span className="text-xs text-gray-400">•</span>}
                                    <span className="text-xs text-gray-600">
                                      Due: {new Date(todo.due_date).toLocaleDateString()}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Cascading Messages */}
                <div className="border border-gray-200 p-4 rounded-lg bg-white">
                  <h4 className="font-medium mb-2 text-gray-900 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Cascading Messages
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    What key information needs to be communicated to other teams?
                  </p>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                    rows={3}
                    placeholder="Enter any messages to cascade to other teams..."
                    value={cascadingMessage}
                    onChange={(e) => setCascadingMessage(e.target.value)}
                  />
                  
                  {cascadingMessage.trim() && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="cascade-all"
                          checked={cascadeToAll}
                          onCheckedChange={(checked) => {
                            setCascadeToAll(checked);
                            if (checked) setSelectedTeams([]);
                          }}
                        />
                        <label htmlFor="cascade-all" className="text-sm font-medium text-gray-700">
                          Send to all teams
                        </label>
                      </div>
                      
                      {!cascadeToAll && availableTeams.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Or select specific teams:</p>
                          <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                            {availableTeams.map(team => (
                              <div key={team.id} className="flex items-center gap-2">
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
                                <label htmlFor={`team-${team.id}`} className="text-sm text-gray-700">
                                  {team.name}
                                  {team.is_leadership_team && (
                                    <span className="ml-2 text-xs text-blue-600">(Leadership)</span>
                                  )}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border border-gray-200 p-4 rounded-lg bg-white">
                  <h4 className="font-medium mb-2 text-gray-900 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Meeting Rating
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Rate this meeting's effectiveness (1-10)
                  </p>
                  
                  {/* Individual Participant Ratings */}
                  {participants.length > 0 ? (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-3">
                        Each participant rates the meeting:
                      </label>
                      <div className="space-y-3">
                        {participants.map(participant => {
                          const isCurrentUser = participant.id === user?.id;
                          const rating = participantRatings[participant.id];
                          
                          return (
                            <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className={`text-sm ${isCurrentUser ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                                {participant.name}{isCurrentUser ? ' (You)' : ''}:
                              </span>
                              {isCurrentUser ? (
                                <Select value={rating?.rating?.toString() || ''} onValueChange={(value) => {
                                  const ratingValue = parseInt(value);
                                  setParticipantRatings(prev => ({
                                    ...prev,
                                    [user.id]: {
                                      userId: user.id,
                                      userName: participant.name,
                                      rating: ratingValue
                                    }
                                  }));
                                  // Also set the old meetingRating for backwards compatibility
                                  setMeetingRating(ratingValue);
                                }}>
                                  <SelectTrigger className="w-24">
                                    <SelectValue placeholder="Rate" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[...Array(10)].map((_, i) => (
                                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                                        {i + 1}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className={`font-medium ${rating ? 'text-gray-900' : 'text-gray-400'}`}>
                                  {rating ? rating.rating : 'Waiting...'}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Calculate and show average if there are ratings */}
                      {Object.keys(participantRatings).length > 0 && (
                        <div className="border-t pt-2 mt-2">
                          <div className="flex items-center justify-between text-sm font-medium">
                            <span className="text-gray-700">Average Rating:</span>
                            <span className="text-lg" style={{ color: themeColors.primary }}>
                              {(Object.values(participantRatings).reduce((sum, r) => sum + r.rating, 0) / Object.values(participantRatings).length).toFixed(1)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Fallback for single user (not in a meeting) */
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Your Rating:
                      </label>
                      <Select value={meetingRating?.toString()} onValueChange={(value) => {
                        const rating = parseInt(value);
                        setMeetingRating(rating);
                        // Store as single participant rating
                        setParticipantRatings({
                          [user?.id]: {
                            userId: user?.id,
                            userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'You',
                            rating: rating
                          }
                        });
                      }}>
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
                  )}
                </div>

                <div className="text-center pt-4">
                  <Button
                    onClick={concludeMeeting}
                    size="lg"
                    className="text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    style={{
                      background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                    }}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
                   style={{
                     background: `linear-gradient(135deg, ${themeColors.primary}15 0%, ${themeColors.secondary}15 100%)`,
                     color: themeColors.primary
                   }}>
                <Users className="h-4 w-4" />
                WEEKLY MEETING
              </div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">{labels.weekly_meeting_label || 'Weekly Accountability Meeting'}</h1>
              <p className="text-lg text-slate-600">{getMeetingDescription()}</p>
            </div>
            {meetingStarted && (
              <div className="flex items-center gap-4">
                {participants.length > 0 && (
                  <>
                    <div className="relative group">
                      <div className="bg-blue-50/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-blue-200/50 shadow-sm cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">
                            {participants.length} participant{participants.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      
                      {/* Participant names tooltip */}
                      <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 min-w-[200px]">
                        <div className="text-xs font-semibold text-gray-700 mb-2">Participants:</div>
                        <div className="space-y-1">
                          {participants.map((participant, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                              <div className="w-2 h-2 rounded-full bg-green-400" />
                              <span>{participant.name || 'Unknown'}</span>
                              {participant.id === currentLeader && (
                                <span className="text-xs text-blue-600 font-medium">(Presenter)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Claim Presenter button */}
                    {!isLeader && meetingCode && (
                      <Button
                        onClick={() => {
                          if (claimPresenter) {
                            claimPresenter();
                          }
                        }}
                        className="text-white shadow-lg hover:shadow-xl transition-all duration-200"
                        style={{
                          background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                          ':hover': {
                            filter: 'brightness(1.1)'
                          }
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.filter = 'brightness(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.filter = 'brightness(1)';
                        }}
                        size="sm"
                      >
                        Claim Presenter
                      </Button>
                    )}
                    
                    {/* Current presenter indicator */}
                    {isLeader && (
                      <div className="bg-green-50/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-green-200/50 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                          <span className="text-sm font-medium text-green-900">You're Presenting</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-white/50">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span className={`text-lg font-mono font-semibold ${getTimerColor()}`}>
                      {formatTimer(elapsedTime)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* Meeting auto-starts - no start button needed */}
          </div>

          {/* Alerts */}
          {error && (
            <Alert className="mb-4 border-red-200/50 bg-red-50/80 backdrop-blur-sm rounded-2xl shadow-sm">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 border-green-200/50 bg-green-50/80 backdrop-blur-sm rounded-2xl shadow-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 font-medium">{success}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeSection} onValueChange={handleSectionChange} className="space-y-8">
          <TabsList className="w-full grid grid-cols-4 lg:grid-cols-8 gap-2 h-auto p-2 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-lg">
            {agendaItems.map((item) => {
              const Icon = item.icon;
              const currentIndex = agendaItems.findIndex(i => i.id === activeSection);
              const itemIndex = agendaItems.findIndex(i => i.id === item.id);
              const isCompleted = itemIndex < currentIndex;
              const isActive = item.id === activeSection;
              
              return (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: isActive ? `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)` : 'transparent',
                    color: isActive ? 'white' : 'inherit',
                    boxShadow: isActive ? '0 8px 32px rgba(0,0,0,0.12)' : 'none'
                  }}
                >
                  <Icon className={`h-5 w-5 ${
                    isCompleted ? 'text-green-400' : isActive ? 'text-white' : 'text-slate-600'
                  }`} />
                  <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-slate-700'}`}>{item.label}</span>
                  <span className={`text-xs ${isActive ? 'text-white/80' : 'text-slate-500'}`}>{item.duration}m</span>
                  {isCompleted && (
                    <CheckCircle className="h-3 w-3 text-green-400" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Tab Content */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50">
            {renderContent()}
          </div>
        </Tabs>

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
            setEditingTodo(null);
            setTodoFromIssue(null);
          }
        }}
        todo={editingTodo}
        todoFromIssue={todoFromIssue}
        onSave={handleSaveTodo}
        onCreateIssue={handleCreateIssueFromTodo}
        teamMembers={teamMembers || []}
      />

      {/* Headline Dialog */}
      <HeadlineDialog
        open={showHeadlineDialog}
        onOpenChange={setShowHeadlineDialog}
        onSave={async (headlineData) => {
          const effectiveTeamId = getEffectiveTeamId(teamId, user);
          await headlinesService.createHeadline({
            ...headlineData,
            teamId: effectiveTeamId
          });
          await fetchHeadlines();
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
              className="text-white shadow-lg hover:shadow-xl transition-all duration-200"
              style={{
                background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
              }}
            >
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Metric Trend Chart Modal */}
      <MetricTrendChart
        isOpen={chartModal.isOpen}
        onClose={() => setChartModal({ isOpen: false, metric: null, metricId: null })}
        metric={chartModal.metric}
        metricId={chartModal.metricId}
        orgId={user?.organizationId}
        teamId={getEffectiveTeamId(teamId, user)}
      />
      
      {/* Priority Dialog */}
      {showPriorityDialog && selectedPriority && (
        <PriorityDialog
          priority={selectedPriority}
          open={showPriorityDialog}
          onOpenChange={setShowPriorityDialog}
          onUpdate={handleUpdatePriority}
          onArchive={handleArchivePriority}
          onAddMilestone={handleAddMilestone}
          onEditMilestone={handleEditMilestone}
          onDeleteMilestone={handleDeleteMilestone}
          onToggleMilestone={handleUpdateMilestone}
          onAddUpdate={handleAddUpdate}
          onEditUpdate={handleEditUpdate}
          onDeleteUpdate={handleDeleteUpdate}
          onStatusChange={handlePriorityStatusChange}
          onUploadAttachment={handleUploadAttachment}
          onDeleteAttachment={handleDeleteAttachment}
          teamMembers={teamMembers}
        />
      )}
      
      {/* Meeting Collaboration Bar */}
      <MeetingBar />
    </div>
  );
};

export default WeeklyAccountabilityMeetingPage;