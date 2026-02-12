import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { format, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import MeetingBar from '../components/meeting/MeetingBar';
import FloatingTimer from '../components/meetings/FloatingTimer';
import { MeetingAIRecordingControls } from '../components/MeetingAIRecordingControls';
import { MeetingAISummaryPanel } from '../components/MeetingAISummaryPanel';
import useMeeting from '../hooks/useMeeting';
import { useTokenRefresh } from '../hooks/useTokenRefresh';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/DatePicker';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Users,
  TrendingUp,
  Archive,
  MessageSquare,
  ListTodo,
  Send,
  User,
  Plus,
  Star,
  RefreshCw,
  DollarSign,
  TrendingDown,
  Activity,
  Check,
  X,
  MoreHorizontal,
  Edit
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import meetingSessionsService from '../services/meetingSessionsService';
import PriorityCard from '../components/priorities/PriorityCardClean';
import PriorityDialog from '../components/priorities/PriorityDialog';
// TEMPORARILY DISABLED: import RockSidePanel from '../components/priorities/RockSidePanel';
import IssuesListClean from '../components/issues/IssuesListClean';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { meetingsService } from '../services/meetingsService';
import { FileText, GitBranch, Smile, BarChart, Newspaper, ArrowLeftRight, Share2 } from 'lucide-react';
import { quarterlyPrioritiesService } from '../services/quarterlyPrioritiesService';
import { businessBlueprintService } from '../services/businessBlueprintService';
import { issuesService } from '../services/issuesService';
import { organizationService } from '../services/organizationService';
import { getOrgTheme, saveOrgTheme, hexToRgba } from '../utils/themeUtils';
import { useTerminology } from '../contexts/TerminologyContext';
import { getEffectiveTeamId } from '../utils/teamUtils';
import IssueDialog from '../components/issues/IssueDialog';
import TodoDialog from '../components/todos/TodoDialog';
import { todosService } from '../services/todosService';
import TwoPagePlanView from '../components/vto/TwoPagePlanView';
import { Checkbox } from '@/components/ui/checkbox';
import { cascadingMessagesService } from '../services/cascadingMessagesService';
import { teamsService } from '../services/teamsService';
import { parseDateLocal } from '../utils/dateUtils';

function QuarterlyPlanningMeetingPage() {
  const { user } = useAuthStore();
  const { teamId } = useParams();
  const navigate = useNavigate();
  
  // Enable background token refresh during meetings to prevent session expiration
  useTokenRefresh(true, 10); // Refresh every 10 minutes during meetings
  
  // Debug mount/unmount
  useEffect(() => {
    console.log('🎯 QuarterlyPlanningMeetingPage MOUNTED with teamId:', teamId);
    return () => {
      console.log('🔚 QuarterlyPlanningMeetingPage UNMOUNTING with teamId:', teamId);
    };
  }, []);
  
  // Validate team ID (but don't redirect immediately to allow route to settle)
  useEffect(() => {
    // Debug logging to understand what's happening
    console.log('🔍 QuarterlyPlanningMeetingPage - teamId from useParams:', teamId);
    console.log('🔍 Type of teamId:', typeof teamId);
    console.log('🔍 Window location:', window.location.pathname);
    
    // Only redirect if teamId is explicitly the string 'null' or 'undefined'
    // Don't redirect for actual null/undefined as these are temporary during route transitions
    if (teamId === 'null' || teamId === 'undefined') {
      console.warn('Invalid team ID detected in quarterly meeting URL:', teamId);
      console.warn('Will redirect to /meetings in 1000ms to avoid race condition');
      
      // Longer delay to avoid race conditions with socket navigation updates
      setTimeout(() => {
        // Double-check that we still have an invalid teamId before redirecting
        const currentTeamId = new URLSearchParams(window.location.pathname.split('/').pop()).get('teamId') || window.location.pathname.split('/').pop();
        if (currentTeamId === 'null' || currentTeamId === 'undefined') {
          console.log('Redirecting to /meetings due to invalid teamId');
          navigate('/meetings');
        } else {
          console.log('TeamId recovered, not redirecting');
        }
      }, 1000);
    }
  }, [teamId, navigate]);
  
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
    broadcastRating,
    syncTimer,
    updateNotes,
    activeMeetings,
    activeMeetingsRef,
    isReconnecting,
    isFollowing,
    toggleFollow,
    concludeMeeting: socketConcludeMeeting
  } = useMeeting();
  const { labels } = useTerminology();
  
  // Refs - declare early to avoid initialization issues
  const hasJoinedRef = useRef(false);
  const hasCheckedMeetingsRef = useRef(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('objectives');
  const [success, setSuccess] = useState(null);
  
  // Meeting data
  const [priorities, setPriorities] = useState([]);
  const [issues, setIssues] = useState([]);
  const [shortTermIssues, setShortTermIssues] = useState([]);
  const [longTermIssues, setLongTermIssues] = useState([]);
  const [issueTimeline, setIssueTimeline] = useState('short_term');
  const [todos, setTodos] = useState([]);
  const [vtoData, setVtoData] = useState(null);
  const [blueprintData, setBlueprintData] = useState(null);
  const [metricsStatus, setMetricsStatus] = useState({
    revenue: null, // 'on-track' or 'off-track'
    profit: null,
    measurables: null
  });
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [meetingStartTime, setMeetingStartTime] = useState(null);
  const [completedSections, setCompletedSections] = useState(new Set()); // Track completed sections
  const [elapsedTime, setElapsedTime] = useState(0);
  const [meetingRating, setMeetingRating] = useState(null);
  
  // Timer state for FloatingTimer
  const [sectionTimings, setSectionTimings] = useState({});
  const [currentSectionStartTime, setCurrentSectionStartTime] = useState(null);
  const [sectionElapsedTime, setSectionElapsedTime] = useState(0);
  const [sectionCumulativeTimes, setSectionCumulativeTimes] = useState({}); // Track cumulative time per section
  const [meetingPace, setMeetingPace] = useState('on-track');
  const [isPaused, setIsPaused] = useState(false);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [showFloatingTimer, setShowFloatingTimer] = useState(false); // Hidden by default - MeetingBar has timer
  const [sectionConfig, setSectionConfig] = useState(null);
  
  // AI Meeting Assistant state
  const [showAISummary, setShowAISummary] = useState(false);
  const [transcriptionCompleted, setTranscriptionCompleted] = useState(false);
  const [aiRecordingState, setAiRecordingState] = useState(null);
  
  // Section notes state (for MeetingBar)
  const [sectionNotes, setSectionNotes] = useState({});
  
  // Conclude section state
  const [todoSortBy, setTodoSortBy] = useState('assignee');
  const [sendSummaryEmail, setSendSummaryEmail] = useState(true);
  const [archiveCompleted, setArchiveCompleted] = useState(true);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingAverage, setRatingAverage] = useState(0);
  const [showConcludeDialog, setShowConcludeDialog] = useState(false);
  
  const [reviewConfirmDialog, setReviewConfirmDialog] = useState(false);
  const [participantRatings, setParticipantRatings] = useState({}); // Store ratings by participant
  const [quarterGrade, setQuarterGrade] = useState('');
  const [quarterFeedback, setQuarterFeedback] = useState('');
  const [sessionId, setSessionId] = useState(null); // Store meeting session ID
  const [sessionLoading, setSessionLoading] = useState(false); // Track session creation
  
  // Cascading message states
  const [showCascadeDialog, setShowCascadeDialog] = useState(false);
  const [cascadeFromIssue, setCascadeFromIssue] = useState(null);
  const [cascadeMessage, setCascadeMessage] = useState('');
  const [cascadeToAll, setCascadeToAll] = useState(false);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  
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
  
  // Track which priorities are expanded in the inline view
  const [expandedPriorities, setExpandedPriorities] = useState({});
  
  // Track which status dropdown is open
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null);
  
  // Track milestone creation
  const [addingMilestoneFor, setAddingMilestoneFor] = useState(null);
  const [newMilestone, setNewMilestone] = useState({ title: '', dueDate: '' });
  
  // Quarterly Numbers Review collapse state
  const [isNumbersReviewCollapsed, setIsNumbersReviewCollapsed] = useState(true);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openStatusDropdown && !e.target.closest('.status-dropdown')) {
        setOpenStatusDropdown(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openStatusDropdown]);
  
  // Close context menu when clicking outside - TEMPORARILY DISABLED
  // useEffect(() => {
  //   const handleClick = () => setContextMenu(null);
  //   const handleScroll = () => setContextMenu(null);
  //   
  //   if (contextMenu) {
  //     document.addEventListener('click', handleClick);
  //     document.addEventListener('scroll', handleScroll);
  //   }
  //   
  //   return () => {
  //     document.removeEventListener('click', handleClick);
  //     document.removeEventListener('scroll', handleScroll);
  //   };
  // }, [contextMenu]);
  
  // Priority dialog states
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  
  // Side panel state
  const [sidePanelRock, setSidePanelRock] = useState(null);
  
  
  // Context menu state - TEMPORARILY DISABLED
  // const [contextMenu, setContextMenu] = useState(null);
  // const [linkedIssueDialog, setLinkedIssueDialog] = useState(null);
  // const [linkedHeadlineDialog, setLinkedHeadlineDialog] = useState(null);
  
  // Theme state
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });

  // Get framework-specific quarterly planning agenda
  function getQuarterlyAgendaItems() {
    const isEOS = labels?.priorities_label === 'Rocks';
    const isOKR = labels?.priorities_label === 'Objectives';
    const isScalingUp = labels?.business_blueprint_label === 'One-Page Strategic Plan';
    const is4DX = labels?.priorities_label?.includes('WIG');
    
    if (isEOS) {
      // EOS Quarterly Pulsing Meeting
      return [
        { id: 'check-in', label: 'Check-In', duration: 15, icon: CheckSquare, description: 'Good news & expectations' },
        { id: 'review-quarterly-rocks', label: 'Review Prior Quarter', duration: 30, icon: Target, description: 'Review last quarter\'s Rocks completion' },
        { id: 'vto', label: 'Review V/TO', duration: 60, icon: ClipboardList, description: 'Review and update Vision/Traction Organizer' },
        { id: 'eos-tools', label: 'EOS Tools', duration: 60, icon: Building2, description: 'Review Accountability Chart & Scorecard' },
        { id: 'establish-quarterly-rocks', label: 'Rocks', duration: 120, icon: ListChecks, description: 'Set company and individual Rocks for next quarter' },
        { id: 'ids', label: 'IDS', duration: 180, icon: AlertTriangle, description: 'Identify, Discuss, Solve key issues' },
        { id: 'next-steps', label: 'Next Steps', duration: 7, icon: ClipboardList, description: 'Who, what, when' },
        { id: 'conclude', label: 'Conclude', duration: 8, icon: CheckSquare, description: 'Rate meeting & feedback' }
      ];
    } else if (isOKR) {
      // OKRs Quarterly Planning Session
      return [
        { id: 'check-in', label: 'Opening', duration: 10, icon: CheckSquare, description: 'Align on outcomes' },
        { id: 'review-prior', label: 'Previous OKRs Review', duration: 60, icon: Calendar, description: 'Assess key results achievement' },
        { id: 'learning', label: 'Learnings & Insights', duration: 45, icon: MessageSquare, description: 'What worked, what didn\'t' },
        { id: 'quarterly-priorities', label: 'Set New OKRs', duration: 120, icon: ListChecks, description: 'Define objectives & key results' },
        { id: 'issues', label: 'Dependencies & Risks', duration: 60, icon: AlertTriangle, description: 'Identify blockers & dependencies' },
        { id: 'conclude', label: 'Commitment & Close', duration: 15, icon: CheckSquare, description: 'Confirm OKRs & next steps' }
      ];
    } else if (isScalingUp) {
      // Scaling Up Quarterly Planning
      return [
        { id: 'objectives', label: 'Start on Time', duration: 5, icon: Target, description: 'Set meeting tone' },
        { id: 'check-in', label: 'Good News', duration: 15, icon: CheckSquare, description: 'Personal & professional wins' },
        { id: 'review-prior', label: 'Quarterly Theme Review', duration: 45, icon: Calendar, description: 'Review theme progress & KPIs' },
        { id: '2-page-plan', label: 'OPSP Review', duration: 60, icon: ClipboardList, description: 'One-Page Strategic Plan update' },
        { id: 'learning', label: 'Customer & Market Data', duration: 60, icon: MessageSquare, description: 'Market insights & feedback' },
        { id: 'quarterly-priorities', label: 'Quarterly Priorities', duration: 90, icon: ListChecks, description: 'Top 3-5 priorities' },
        { id: 'issues', label: 'Issues List', duration: 120, icon: AlertTriangle, description: 'Process top issues' },
        { id: 'conclude', label: 'Meeting Conclusion', duration: 15, icon: CheckSquare, description: 'Actions & cascading messages' }
      ];
    } else if (is4DX) {
      // 4DX Quarterly WIG Planning
      return [
        { id: 'review-prior', label: 'Scoreboard Review', duration: 30, icon: Calendar, description: 'Review WIG achievement' },
        { id: 'learning', label: 'Lessons Learned', duration: 30, icon: MessageSquare, description: 'What moved the needle' },
        { id: 'quarterly-priorities', label: 'Set New WIGs', duration: 90, icon: ListChecks, description: 'Define Wildly Important Goals' },
        { id: 'issues', label: 'Clear the Path', duration: 60, icon: AlertTriangle, description: 'Remove obstacles' },
        { id: 'conclude', label: 'Commitment Session', duration: 30, icon: CheckSquare, description: 'Lock in WIGs & lead measures' }
      ];
    } else {
      // Default agenda
      return [
        { id: 'objectives', label: 'Objectives', duration: null, icon: Target, description: 'Review meeting goals' },
        { id: 'check-in', label: 'Check In', duration: 15, icon: CheckSquare, description: 'Team connection' },
        { id: 'review-prior', label: 'Review Prior Quarter', duration: 30, icon: Calendar, description: 'Check progress' },
        { id: '2-page-plan', label: labels?.business_blueprint_label || '2-Page Plan', duration: 60, icon: ClipboardList, description: 'Review strategic plan' },
        { id: 'learning', label: 'Learning', duration: 60, icon: MessageSquare, description: 'Share insights & learnings' },
        { id: 'quarterly-priorities', label: labels?.priorities_label || 'Quarterly Priorities', duration: 120, icon: ListChecks, description: 'Set new priorities' },
        { id: 'issues', label: labels?.issues_label || 'Issues', duration: 180, icon: AlertTriangle, description: 'Review and resolve issues' },
        { id: 'next-steps', label: 'Next Steps', duration: 7, icon: ClipboardList, description: 'Action items' },
        { id: 'conclude', label: 'Conclude', duration: 8, icon: CheckSquare, description: 'Wrap up & rate' }
      ];
    }
  };
  
  const agendaItems = useMemo(() => getQuarterlyAgendaItems(), []);

  // Fetch organization theme
  useEffect(() => {
    fetchOrganizationTheme();
    
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, [user?.organizationId]);
  
  async function fetchOrganizationTheme() {
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
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
    }
  };

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

  // Fetch teams function (filtering out current team - no need to cascade to yourself)
  async function fetchTeams() {
    try {
      const response = await teamsService.getTeams();
      console.log('Teams API response:', response);
      
      let teams = [];
      if (response?.success && response?.data) {
        teams = response.data;
      } else if (Array.isArray(response)) {
        teams = response;
      }
      
      // Filter out the current team - it makes no sense to send cascading messages to yourself
      const otherTeams = teams.filter(team => team.id !== teamId);
      
      console.log('Available teams for cascading (excluding current team):', otherTeams);
      setAvailableTeams(otherTeams);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      setAvailableTeams([]);
    }
  };

  // Auto-start meeting on component mount
  useEffect(() => {
    setMeetingStarted(true);
    setMeetingStartTime(Date.now());
    // Load teams on mount so they're ready for conclude section
    fetchTeams();
  }, []);
  
  // Auto-join meeting when component mounts
  useEffect(() => {
    // Validate teamId before attempting to join
    // Check for actual null/undefined or string 'null'/'undefined'
    if (!teamId || teamId === 'null' || teamId === 'undefined') {
      if (teamId === 'null' || teamId === 'undefined') {
        console.warn('Invalid team ID string detected:', teamId);
      } else {
        console.log('⏳ Waiting for valid team ID before joining meeting...');
      }
      return;
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamId)) {
      console.warn('Invalid team ID format, not joining meeting:', teamId);
      return;
    }
    
    // Only join if we haven't already joined and are connected
    if (!isConnected || !joinMeeting || meetingCode || hasJoinedRef.current) {
      return;
    }
    
    // Include organization ID in meeting code to prevent cross-org collisions
    // CRITICAL: Must match the orgId logic used throughout the rest of the file
    const orgId = user?.organizationId || user?.organization_id;
    const meetingRoom = `${orgId}-${teamId}-quarterly-planning`;
    
    // Wait a bit for active meetings to load if we haven't checked yet
    if (!hasCheckedMeetingsRef.current && (!activeMeetings || Object.keys(activeMeetings).length === 0)) {
      console.log('🎬 Waiting for active meetings to load...');
      hasCheckedMeetingsRef.current = true;
      // Wait 500ms for active meetings to populate
      setTimeout(() => {
        if (!hasJoinedRef.current && !meetingCode) {
          // CRITICAL: Use activeMeetingsRef.current to get the CURRENT value, not the stale closure value
          const currentActiveMeetings = activeMeetingsRef.current;
          const existingMeeting = currentActiveMeetings?.[meetingRoom];
          const hasParticipants = existingMeeting?.participantCount > 0;

          console.log('🚀 Quarterly Planning auto-joining meeting room after delay:', meetingRoom);
          console.log('📡 Active meetings (current):', currentActiveMeetings);
          console.log('📡 Existing meeting:', existingMeeting);
          console.log('👥 Existing meeting found:', hasParticipants ? 'Yes, joining as participant' : 'No, joining as leader');
          
          hasJoinedRef.current = true;
          joinMeeting(meetingRoom, !hasParticipants);
          
          // Create database session if we're joining as leader, or get existing session if joining as follower
          if (!hasParticipants && !sessionLoading) {
            setSessionLoading(true);
            (async () => {
              try {
                console.log('📝 Creating database session for Quarterly Planning meeting');
                const result = await meetingSessionsService.startSession(orgId, teamId, 'quarterly');
                setSessionId(result.session.id);
                console.log('✅ Database session created successfully:', result.session.id);
              } catch (error) {
                console.error('❌ Failed to create database session:', error);
              } finally {
                setSessionLoading(false);
              }
            })();
          } else if (!sessionLoading) {
            // Check for existing active session as a follower
            setSessionLoading(true);
            (async () => {
              try {
                console.log('📋 Checking for existing database session for Quarterly Planning meeting');
                const activeSession = await meetingSessionsService.getActiveSession(orgId, teamId, 'quarterly');
                if (activeSession) {
                  setSessionId(activeSession.id);
                  console.log('✅ Found existing database session:', activeSession.id);
                }
              } catch (error) {
                console.error('❌ Failed to get existing database session:', error);
              } finally {
                setSessionLoading(false);
              }
            })();
          }
        }
      }, 500);
    } else if (activeMeetings && Object.keys(activeMeetings).length > 0) {
      // Active meetings loaded, check immediately
      const existingMeeting = activeMeetings[meetingRoom];
      const hasParticipants = existingMeeting?.participantCount > 0;
      
      console.log('🚀 Quarterly Planning auto-joining meeting room on page load:', meetingRoom);
      console.log('📡 Active meetings:', activeMeetings);
      console.log('📡 Existing meeting:', existingMeeting);
      console.log('👥 Existing meeting found:', hasParticipants ? 'Yes, joining as participant' : 'No, joining as leader');
      
      hasJoinedRef.current = true;
      joinMeeting(meetingRoom, !hasParticipants);
      
      // Create database session if we're joining as leader, or get existing session if joining as follower
      if (!hasParticipants && !sessionLoading) {
        setSessionLoading(true);
        (async () => {
          try {
            console.log('📝 Creating database session for Quarterly Planning meeting');
            const result = await meetingSessionsService.startSession(orgId, teamId, 'quarterly');
            setSessionId(result.session.id);
            console.log('✅ Database session created successfully:', result.session.id);
          } catch (error) {
            console.error('❌ Failed to create database session:', error);
          } finally {
            setSessionLoading(false);
          }
        })();
      } else if (!sessionLoading) {
        // Check for existing active session as a follower
        setSessionLoading(true);
        (async () => {
          try {
            console.log('📋 Checking for existing database session for Quarterly Planning meeting');
            const activeSession = await meetingSessionsService.getActiveSession(orgId, teamId, 'quarterly');
            if (activeSession) {
              setSessionId(activeSession.id);
              console.log('✅ Found existing database session:', activeSession.id);
            }
          } catch (error) {
            console.error('❌ Failed to get existing database session:', error);
          } finally {
            setSessionLoading(false);
          }
        })();
      }
    }
  }, [teamId, isConnected, joinMeeting, meetingCode, activeMeetings]);
  
  // Listen for section changes from leader
  useEffect(() => {
    const handleMeetingSectionChange = (event) => {
      const { section } = event.detail;
      if (section && !isLeader) {
        console.log('📍 Follower changing section to:', section);
        setActiveSection(section);
        
        // Always fetch data when following leader's navigation
        switch(section) {
          case 'objectives':
          case 'review-quarterly-rocks':
          case 'establish-quarterly-rocks':
            fetchPrioritiesData();
            break;
          case 'ids':
            fetchIssuesData();
            break;
          case 'vto':
            fetchVtoData();
            break;
          case 'eos-tools':
            fetchTeamMembers();
            break;
          default:
            break;
        }
      }
    };
    
    window.addEventListener('meeting-section-change', handleMeetingSectionChange);
    return () => window.removeEventListener('meeting-section-change', handleMeetingSectionChange);
  }, [isLeader]);
  
  // Handle organization changes and component unmount
  useEffect(() => {
    const handleOrgChange = () => {
      // Leave current meeting when organization changes
      if (meetingCode && leaveMeeting) {
        console.log('🎬 Organization changed, leaving current meeting');
        leaveMeeting();
        hasJoinedRef.current = false;
        hasCheckedMeetingsRef.current = false;
      }
    };
    
    window.addEventListener('organizationChanged', handleOrgChange);
    
    // Cleanup - leave meeting when component unmounts
    return () => {
      window.removeEventListener('organizationChanged', handleOrgChange);
      if (meetingCode && leaveMeeting) {
        console.log('🔚 Leaving quarterly planning meeting on unmount');
        leaveMeeting();
      }
    };
  }, [meetingCode, leaveMeeting]);
  
  // Listen for meeting updates from other participants
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
      setIssues(prev => prev.map(updateIssueVote));
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
        // Handle status changes
        setTodos(prev => prev.map(t => 
          t.id === todoId ? { ...t, status, completed } : t
        ));
      } else if (action === 'delete') {
        setTodos(prev => prev.filter(t => t.id !== todoId));
      } else if (action === 'archive-done') {
        setTodos(prev => prev.filter(t => t.status !== 'complete' && t.status !== 'completed'));
      }
    };
    
    window.addEventListener('meeting-vote-update', handleVoteUpdate);
    window.addEventListener('meeting-issue-update', handleIssueUpdate);
    window.addEventListener('meeting-todo-update', handleTodoUpdate);
    
    return () => {
      window.removeEventListener('meeting-vote-update', handleVoteUpdate);
      window.removeEventListener('meeting-issue-update', handleIssueUpdate);
      window.removeEventListener('meeting-todo-update', handleTodoUpdate);
    };
  }, [user?.id]);

  // Timer effect for meeting duration and section timing (Phase 2)
  useEffect(() => {
    let timer;
    if (meetingStarted && meetingStartTime && !isPaused) {
      timer = setInterval(() => {
        const now = Date.now();
        const totalElapsed = Math.floor((now - meetingStartTime) / 1000);
        // Subtract total paused time to get active duration
        const activeElapsed = totalElapsed - totalPausedTime;
        setElapsedTime(activeElapsed);
        
        // Update section elapsed time (Phase 2) - Add to cumulative time
        if (currentSectionStartTime) {
          const sessionTime = Math.floor((now - currentSectionStartTime) / 1000);
          const cumulativeTime = (sectionCumulativeTimes[activeSection] || 0) + sessionTime;
          setSectionElapsedTime(cumulativeTime);
          
          // Calculate meeting pace based on accumulated timing
          const currentSectionConfig = agendaItems.find(item => item.id === activeSection);
          if (currentSectionConfig) {
            // Calculate expected vs actual progress
            const sectionIndex = agendaItems.findIndex(item => item.id === activeSection);
            const expectedTimeByNow = agendaItems
              .slice(0, sectionIndex + 1)
              .reduce((sum, item) => sum + (item.duration * 60), 0);
            
            const actualTimeSpent = activeElapsed;
            const deviation = actualTimeSpent - expectedTimeByNow;
            const totalMeetingTime = agendaItems.reduce((sum, item) => sum + (item.duration * 60), 0);
            const deviationPercentage = (Math.abs(deviation) / totalMeetingTime) * 100;
            
            if (deviation > 0) {
              // Running behind
              if (deviationPercentage > 20) {
                setMeetingPace('critical');
              } else if (deviationPercentage > 10) {
                setMeetingPace('behind');
              } else {
                setMeetingPace('on-track');
              }
            } else {
              // Running ahead or on time
              if (deviationPercentage > 5) {
                setMeetingPace('ahead');
              } else {
                setMeetingPace('on-track');
              }
            }
          }
        }
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [meetingStarted, meetingStartTime, isPaused, totalPausedTime, currentSectionStartTime, activeSection, sectionCumulativeTimes, agendaItems]);

  // Update section config for floating timer
  useEffect(() => {
    const currentSectionConfig = agendaItems.find(item => item.id === activeSection);
    setSectionConfig(currentSectionConfig);
  }, [activeSection, agendaItems]);

  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Pause/Resume handlers
  const handlePauseResume = async () => {
    if (!sessionId) {
      setError('Meeting session not found. Please refresh the page.');
      return;
    }
    
    if (sessionLoading) {
      return;
    }
    
    const orgId = user?.organizationId || user?.organization_id;
    const effectiveTeamId = getEffectiveTeamId(teamId, user);
    
    setLoading(true);
    
    try {
      if (isPaused) {
        // Resume the session
        const result = await meetingSessionsService.resumeSession(orgId, effectiveTeamId, sessionId);
        
        setIsPaused(false);
        setTotalPausedTime(result.session.total_paused_duration || 0);
        
        // Update elapsed time to the backend's calculated active duration
        if (result.session.active_duration_seconds !== undefined) {
          setElapsedTime(result.session.active_duration_seconds);
        }
        
        // Reset the section start time to NOW so section timer calculates correctly from resume point
        setCurrentSectionStartTime(Date.now());
        
        // Broadcast resume to all participants
        if (broadcastIssueListUpdate) {
          broadcastIssueListUpdate({
            action: 'timer-resumed',
            resumedBy: user?.full_name || user?.email,
            timestamp: Date.now()
          });
        }
        
        setSuccess('Meeting resumed');
        setLoading(false);
      } else {
        // Save current section's session time to cumulative before pausing
        if (currentSectionStartTime && activeSection) {
          const sessionTime = Math.floor((Date.now() - currentSectionStartTime) / 1000);
          const previousCumulative = sectionCumulativeTimes[activeSection] || 0;
          const newCumulative = previousCumulative + sessionTime;
          
          setSectionCumulativeTimes(prev => ({
            ...prev,
            [activeSection]: newCumulative
          }));
          
          // Set start time to null during pause to stop section timer calculation
          setCurrentSectionStartTime(null);
          setSectionElapsedTime(newCumulative);
        }
        
        // Pause the session
        const result = await meetingSessionsService.pauseSession(orgId, effectiveTeamId, sessionId);
        
        setIsPaused(true);
        
        // Broadcast pause to all participants
        if (broadcastIssueListUpdate) {
          broadcastIssueListUpdate({
            action: 'timer-paused',
            pausedBy: user?.full_name || user?.email,
            timestamp: Date.now()
          });
        }
        
        setSuccess('Meeting paused');
        setLoading(false);
      }
    } catch (error) {
      setError('Failed to ' + (isPaused ? 'resume' : 'pause') + ' meeting');
      setLoading(false);
    }
  };

  const concludeMeeting = async (e) => {
    // Prevent form submission or page reload
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Check if sessionId exists
    if (!sessionId) {
      setError('Meeting session not found. Please refresh the page.');
      return;
    }
    
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
      
      // Calculate average rating from all participant ratings
      const ratings = Object.values(participantRatings);
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
        : (meetingRating || 5);
      
      // Calculate meeting duration in minutes
      let durationMinutes;
      if (elapsedTime > 0) {
        durationMinutes = Math.floor(elapsedTime / 60);
      } else if (meetingStartTime) {
        const now = Date.now();
        const actualDuration = Math.floor((now - meetingStartTime) / 1000 / 60);
        durationMinutes = actualDuration;
      } else {
        durationMinutes = 90; // Default quarterly planning meeting duration
      }
      
      // Send cascading message if there is one
      if (cascadeMessage.trim() && (cascadeToAll || selectedTeams.length > 0)) {
        try {
          const teamIds = cascadeToAll ? availableTeams.map(t => t.id) : selectedTeams;
          await cascadingMessagesService.createCascadingMessage(orgId, effectiveTeamId, {
            message: cascadeMessage,
            recipientTeamIds: teamIds,
            allTeams: cascadeToAll
          });
        } catch (cascadeError) {
          console.error('Failed to send cascading message:', cascadeError);
        }
      }
      
      // Prepare meeting data for conclude call
      const meetingData = {
        meetingType: 'Quarterly Planning',
        duration: durationMinutes,
        rating: averageRating,
        individualRatings: participantRatings,
        participantRatings: ratings.map(r => ({
          userId: r.userId,
          userName: r.userName,
          rating: r.rating
        })),
        summary: 'Quarterly planning session completed with priorities and strategic planning.',
        attendees: Object.keys(participantRatings).length > 0 ? Object.keys(participantRatings) : [],
        priorities: priorities.map(priority => ({
          name: priority.name || priority.title,
          owner: priority.owner_name,
          status: priority.status,
          milestones: priority.milestones?.length || 0
        })),
        vto: vtoData,
        todos: {
          completed: todos.filter(todo => 
            todo.status === 'complete' || todo.status === 'completed' || todo.completed
          ).map(todo => ({
            title: todo.title || todo.todo,
            id: todo.id,
            assigned_to_name: todo.assigned_to ? `${todo.assigned_to.first_name} ${todo.assigned_to.last_name}` : null,
            created_at: todo.created_at,
            completed_at: todo.completed_at || todo.updated_at
          })),
          added: todos.filter(todo => 
            todo.status !== 'complete' && todo.status !== 'completed' && !todo.completed
          ).map(todo => ({
            title: todo.title || todo.todo,
            id: todo.id,
            assigned_to_name: todo.assigned_to ? `${todo.assigned_to.first_name} ${todo.assigned_to.last_name}` : null,
            created_at: todo.created_at,
            due_date: todo.due_date
          }))
        },
        notes: cascadeMessage || '',
        cascadingMessage: cascadeMessage
      };
      
      // Conclude meeting in database
      let emailResult = null;
      try {
        emailResult = await meetingsService.concludeMeeting(orgId, effectiveTeamId, sessionId, sendSummaryEmail, meetingData);
      } catch (emailError) {
        console.error('Failed to conclude meeting:', emailError);
        const errorMessage = emailError?.message || emailError?.toString() || '';
        const isAlreadyConcluded = errorMessage.includes('No active meeting found') || 
                                   errorMessage.includes('already concluded') ||
                                   errorMessage.includes('404');
        if (isAlreadyConcluded) {
          emailResult = { success: true, alreadyConcluded: true };
        } else {
          throw emailError;
        }
      }
      
      // Archive completed items if requested
      if (archiveCompleted) {
        try {
          await todosService.archiveDoneTodos();
        } catch (error) {
          console.error('Failed to archive todos:', error);
        }
        
        // Archive solved issues
        const allIssues = [...(shortTermIssues || []), ...(longTermIssues || [])];
        const solvedIssues = allIssues.filter(i => 
          i.status === 'closed' || i.status === 'resolved' || i.status === 'solved' || i.status === 'completed'
        );
        for (const issue of solvedIssues) {
          try {
            await issuesService.archiveIssue(issue.id);
          } catch (error) {
            console.error('Failed to archive issue:', error);
          }
        }
      }
      
      // Build success message
      let emailMessage = '';
      if (sendSummaryEmail) {
        if (emailResult?.emailsSent > 0) {
          emailMessage = `Summary email sent to ${emailResult.emailsSent} participant${emailResult.emailsSent !== 1 ? 's' : ''}.`;
        } else {
          emailMessage = 'Summary email sent.';
        }
      }
      const archiveMessage = archiveCompleted ? 'Completed items archived.' : '';
      const baseMessage = `Meeting concluded successfully! ${emailMessage} ${archiveMessage}`.trim();
      
      toast.success(baseMessage, {
        description: 'Great job! All data has been saved.',
        duration: 5000
      });
      
      // Clear form after success
      setCascadeMessage('');
      setSelectedTeams([]);
      setCascadeToAll(false);
      setMeetingRating(null);
      setRatingSubmitted(false);
      
      // End the database session
      if (sessionId) {
        await meetingSessionsService.endSession(orgId, effectiveTeamId, sessionId)
          .catch(err => console.error('Failed to end meeting session:', err));
      }
      
      // Broadcast meeting end to all participants
      if (meetingCode && broadcastIssueListUpdate) {
        broadcastIssueListUpdate({
          action: 'meeting-ended',
          message: 'Meeting has been concluded by the facilitator'
        });
      }
      
      // Mark meeting as concluded
      if (meetingCode && socketConcludeMeeting) {
        socketConcludeMeeting();
      }
      
      // Leave the collaborative meeting if active
      if (meetingCode && leaveMeeting) {
        leaveMeeting();
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Clear meeting state
      setSessionId(null);
      setMeetingStartTime(null);
      setMeetingStarted(false);
      setElapsedTime(0);
      setIsPaused(false);
      setTotalPausedTime(0);
      setCompletedSections(new Set());
      sessionStorage.removeItem('meetingActive');
      sessionStorage.removeItem('meetingStartTime');
      
      // Navigate to Dashboard after concluding meeting
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Failed to conclude meeting:', error);
      setError('Failed to conclude meeting. Please try again.');
    }
  };

  useEffect(() => {
    if (activeSection === 'review-quarterly-rocks' || activeSection === 'establish-quarterly-rocks') {
      fetchPrioritiesData();
      fetchBlueprintData(); // Get 1-year plan targets
      fetchTeamMembers(); // Need team members for Add Priority dialog
    } else if (activeSection === 'ids') {
      fetchIssuesData();
      fetchTeamMembers();
    } else if (activeSection === 'vto') {
      fetchVtoData();
      fetchTeamMembers(); // Need team members for Add Issue dialog
    } else if (activeSection === 'eos-tools') {
      // EOS Tools section - could load scorecard/accountability chart data here
      fetchTeamMembers();
      setLoading(false);
    } else if (activeSection === 'check-in') {
      fetchTeamMembers(); // Need team members for Add Issue dialog in Check-In
      setLoading(false);
    } else if (activeSection === 'next-steps') {
      fetchTodosData();
      fetchTeamMembers(); // Need team members for todos
    } else if (activeSection === 'conclude') {
      fetchTodosData(); // Load open todos for review
      fetchTeams(); // Load teams for cascading messages
      setLoading(false);
    } else {
      // For non-data sections, ensure loading is false
      setLoading(false);
    }
  }, [activeSection, teamId]);

  // Priority update handlers for employee-centric view
  async function handleUpdatePriority(priorityId, updates) {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      await quarterlyPrioritiesService.updatePriority(orgId, effectiveTeamId, priorityId, updates);
      
      // Update local state
      setPriorities(prev => prev.map(p => p.id === priorityId ? { ...p, ...updates } : p));
      
      // Broadcast update to meeting participants
      if (broadcastIssueListUpdate) {
        broadcastIssueListUpdate({
          action: 'priority-updated',
          priorityId,
          updates
        });
      }
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  }

  async function handleToggleMilestone(priorityId, milestoneId, completed) {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      await quarterlyPrioritiesService.updateMilestone(orgId, effectiveTeamId, priorityId, milestoneId, { completed });
      
      // Update local state
      setPriorities(prev => prev.map(priority => 
        priority.id === priorityId 
          ? {
              ...priority,
              milestones: (priority.milestones || []).map(milestone =>
                milestone.id === milestoneId ? { ...milestone, completed } : milestone
              )
            }
          : priority
      ));
      
      // Broadcast update to meeting participants
      if (broadcastIssueListUpdate) {
        broadcastIssueListUpdate({
          action: 'milestone-toggled',
          priorityId,
          milestoneId,
          completed
        });
      }
    } catch (error) {
      console.error('Failed to toggle milestone:', error);
    }
  }

  async function handleAddMilestone(priorityId) {
    if (!newMilestone.title.trim()) return;
    
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      const milestone = await quarterlyPrioritiesService.createMilestone(orgId, effectiveTeamId, priorityId, {
        title: newMilestone.title,
        dueDate: newMilestone.dueDate || format(addDays(new Date(), 30), 'yyyy-MM-dd')
      });
      
      // Update local state
      setPriorities(prev => prev.map(priority => 
        priority.id === priorityId 
          ? {
              ...priority,
              milestones: [...(priority.milestones || []), milestone]
            }
          : priority
      ));
      
      // Reset form
      setNewMilestone({ title: '', dueDate: '' });
      setAddingMilestoneFor(null);
      
      // Broadcast update to meeting participants
      if (broadcastIssueListUpdate) {
        broadcastIssueListUpdate({
          action: 'milestone-added',
          priorityId,
          milestone
        });
      }
    } catch (error) {
      console.error('Failed to add milestone:', error);
    }
  }

  // Auto-clear success messages after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Update selectedPriority when priorities change
  useEffect(() => {
    if (selectedPriority && priorities.length > 0) {
      const updatedPriority = priorities.find(p => p.id === selectedPriority.id);
      if (updatedPriority) {
        setSelectedPriority(updatedPriority);
      }
    }
  }, [priorities, selectedPriority]);

  async function fetchPrioritiesData() {
    try {
      setLoading(true);
      setError(null);
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
      
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
      
      // Auto-expand all individual owner sections
      const individualPriorities = allPriorities.filter(p => p.priority_type === 'individual');
      const uniqueOwnerIds = [...new Set(individualPriorities.map(p => p.owner?.id || 'unassigned'))];
      const expandedOwners = {};
      uniqueOwnerIds.forEach(ownerId => {
        expandedOwners[ownerId] = true;
      });
      
      setExpandedSections(prev => ({
        ...prev,
        individualPriorities: expandedOwners
      }));
      
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
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
      
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
              title: `Off-Track ${labels?.priority_singular || 'Priority'}: ${priorityTitle}`,
              description: `Priority "${priorityTitle}" is off-track and needs attention.\n\nOwner: ${priority.owner?.name || 'Unassigned'}\n\nDescription: ${priority.description || 'No description provided'}`,
              timeline: 'short_term',
              ownerId: priority.owner?.id || priority.owner_id || priority.ownerId || user?.id, // Backend expects ownerId
              department_id: effectiveTeamId,
              teamId: effectiveTeamId // Add teamId as well for compatibility
            });
            
            setSuccess(`${labels?.priority_singular || 'Priority'} marked off-track and issue created`);
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

  const handleSectionComplete = (sectionId) => {
    setCompletedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleUpdateMilestone = async (priorityId, milestoneId, completed) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
      
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
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
      
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


  const handleCreatePriority = async () => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
      
      // Get current quarter and year - matching QuarterlyPrioritiesPageClean logic
      const now = new Date();
      const currentQuarter = Math.floor((now.getMonth() / 3)) + 1;
      const currentYear = now.getFullYear();
      const quarter = `Q${currentQuarter}`;
      
      const priorityData = {
        title: priorityForm.title,
        description: priorityForm.description || '',
        ownerId: priorityForm.ownerId,
        dueDate: priorityForm.dueDate,
        isCompanyPriority: priorityForm.isCompanyPriority,
        quarter: quarter,
        year: currentYear
      };
      
      await quarterlyPrioritiesService.createPriority(orgId, effectiveTeamId, priorityData);
      
      // Refresh priorities
      await fetchPrioritiesData();
      
      // Reset form and close dialog
      setPriorityForm({
        title: '',
        description: '',
        ownerId: '',
        dueDate: '',
        isCompanyPriority: false
      });
      setShowAddPriority(false);
      setSuccess('Priority created successfully');
    } catch (error) {
      console.error('Failed to create priority:', error);
      setError(error.response?.data?.error || 'Failed to create priority');
    }
  };

  // Handle converting an issue to a Rock/Priority
  const handleConvertIssueToRock = async (issue) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
      
      // Get current quarter and year
      const now = new Date();
      const currentQuarter = Math.floor((now.getMonth() / 3)) + 1;
      const currentYear = now.getFullYear();
      const quarter = `Q${currentQuarter}`;
      
      // Calculate due date as end of quarter
      const quarterEndMonth = currentQuarter * 3 - 1; // March = 2, June = 5, Sept = 8, Dec = 11
      const dueDate = new Date(currentYear, quarterEndMonth + 1, 0); // Last day of quarter
      const dueDateString = dueDate.toISOString().split('T')[0];
      
      const priorityData = {
        title: issue.title,
        description: issue.description || '',
        ownerId: issue.owner_id || '',
        dueDate: dueDateString,
        isCompanyPriority: false,
        quarter: quarter,
        year: currentYear
      };
      
      await quarterlyPrioritiesService.createPriority(orgId, effectiveTeamId, priorityData);
      
      // Archive the issue after converting to Rock
      if (issue.id) {
        await issuesService.archiveIssue(issue.id);
      }
      
      // Refresh both priorities and issues
      await fetchPrioritiesData();
      await fetchIssuesData();
      
      setSuccess(`Issue converted to ${labels?.priority_singular || 'Priority'} successfully`);
    } catch (error) {
      console.error('Failed to convert issue to priority:', error);
      setError(error.response?.data?.error || 'Failed to convert issue to priority');
    }
  };

  async function fetchIssuesData() {
    try {
      setLoading(true);
      setError(null);
      const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
      
      const response = await issuesService.getIssues(null, false, effectiveTeamId);
      // Use backend sorting (manual_sort first, then created_at DESC)
      const issues = response.data.issues || [];
      setIssues(issues);
      
      // Split into short-term and long-term
      const shortTerm = issues.filter(issue => issue.timeline === 'short_term');
      const longTerm = issues.filter(issue => issue.timeline === 'long_term');
      setShortTermIssues(shortTerm);
      setLongTermIssues(longTerm);
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
      setError('Failed to load issues');
      setLoading(false);
    }
  };

  async function fetchTeamMembers() {
    try {
      const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
      const response = await todosService.getTodos(null, null, true, effectiveTeamId);
      setTeamMembers(response.data.teamMembers || []);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  }
  
  // Issue handlers
  function handleEditIssue(issue) {
    setEditingIssue(issue);
    setShowIssueDialog(true);
  };
  
  const handleSaveIssue = async (issueData) => {
    try {
      if (editingIssue) {
        await issuesService.updateIssue(editingIssue.id, issueData);
      } else {
        await issuesService.createIssue(issueData);
      }
      await fetchIssuesData();
      setShowIssueDialog(false);
      setEditingIssue(null);
      setSuccess('Issue saved successfully');
    } catch (error) {
      console.error('Failed to save issue:', error);
      setError('Failed to save issue');
    }
  };
  
  const handleStatusChange = async (issueId, newStatus) => {
    try {
      // Optimistically update the UI first
      setShortTermIssues(prev => prev.map(issue => 
        issue.id === issueId ? { ...issue, status: newStatus } : issue
      ));
      setLongTermIssues(prev => prev.map(issue => 
        issue.id === issueId ? { ...issue, status: newStatus } : issue
      ));
      
      // Then update the backend
      await issuesService.updateIssue(issueId, { status: newStatus });
      
      // Don't refetch - preserve the current order and just keep the optimistic update
      // Only refetch if there's an error
    } catch (error) {
      console.error('Failed to update issue status:', error);
      // On error, revert the optimistic update by refetching
      await fetchIssuesData();
    }
  };
  
  const handleArchive = async (issueId) => {
    try {
      await issuesService.archiveIssue(issueId);
      await fetchIssuesData();
      setSuccess('Issue archived');
    } catch (error) {
      console.error('Failed to archive issue:', error);
      setError('Failed to archive issue');
    }
  };
  
  const handleMoveToTeam = async (issueId, newTeamId) => {
    try {
      await issuesService.updateIssue(issueId, { department_id: newTeamId });
      await fetchIssuesData();
      setSuccess('Issue moved to another team');
    } catch (error) {
      console.error('Failed to move issue:', error);
      setError('Failed to move issue to team');
    }
  };
  
  const handleCreateTodoFromIssue = async (issue) => {
    try {
      // Fetch issue updates (discussion notes) to include in the To-Do description
      let fullDescription = issue.description || '';
      
      const updatesResponse = await issuesService.getIssueUpdates(issue.id);
      const updates = updatesResponse?.data || [];
      
      if (updates.length > 0) {
        // Format updates with timestamps and authors
        const formattedUpdates = updates
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) // Oldest first
          .map(update => {
            const date = new Date(update.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
            const author = update.created_by_name || 'Unknown';
            return `[${date} - ${author}]\n${update.update_text}`;
          })
          .join('\n\n');
        
        // Combine original description with discussion notes
        if (fullDescription) {
          fullDescription = `${fullDescription}\n\n--- Discussion Notes ---\n\n${formattedUpdates}`;
        } else {
          fullDescription = `--- Discussion Notes ---\n\n${formattedUpdates}`;
        }
      }
      
      const todoData = {
        title: issue.title,
        description: fullDescription,
        priority: issue.priority_level || 'normal',
        assigned_to_id: issue.owner_id,
        due_date: null,
        status: 'pending'
      };
      await todosService.createTodo(todoData);
      await fetchTodosData();
      setSuccess('To-Do created from issue');
    } catch (error) {
      console.error('Failed to create todo from issue:', error);
      setError('Failed to create to-do');
    }
  };
  
  const handleSendCascadingMessage = async (issueId, message) => {
    try {
      // Implementation for cascading messages if needed
      console.log('Cascading message for issue:', issueId, message);
    } catch (error) {
      console.error('Failed to send cascading message:', error);
    }
  };
  
  const handleReorderIssues = async (reorderedIssues) => {
    try {
      if (issueTimeline === 'short_term') {
        setShortTermIssues(reorderedIssues);
      } else {
        setLongTermIssues(reorderedIssues);
      }
      // Optionally persist the order to backend
    } catch (error) {
      console.error('Failed to reorder issues:', error);
    }
  };

  async function fetchTodosData() {
    try {
      setLoading(true);
      const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
      const response = await todosService.getTodos(null, null, false, effectiveTeamId);
      // Filter to only show open todos
      const openTodos = (response.data.todos || []).filter(
        todo => todo.status !== 'complete' && todo.status !== 'completed' && todo.status !== 'cancelled'
      );
      setTodos(openTodos);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
      setError('Failed to fetch todos');
    } finally {
      setLoading(false);
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

  function handleAddTodo() {
    setEditingTodo(null);
    setShowTodoDialog(true);
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
      setShortTermIssues(prev => prev.map(updateVote));
      setLongTermIssues(prev => prev.map(updateVote));
      
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

  async function fetchVtoData() {
    try {
      setLoading(true);
      setError(null);
      
      // Just set a flag to show the TwoPagePlanView component
      // The component will fetch its own data
      setVtoData(true);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch VTO data:', error);
      setError(`Failed to load ${labels?.business_blueprint_label || '2-Page Plan'}`);
      setLoading(false);
    }
  };

  async function fetchBlueprintData() {
    try {
      const data = await businessBlueprintService.getBusinessBlueprint();
      setBlueprintData(data);
    } catch (error) {
      console.error('Failed to fetch business blueprint:', error);
      // Don't show error - this is optional data
    }
  };


  // Toggle functions for collapsible sections
  function toggleCompanyPriorities() {
    setExpandedSections(prev => ({
      ...prev,
      companyPriorities: !prev.companyPriorities
    }));
  };

  function toggleIndividualPriorities(memberId) {
    setExpandedSections(prev => ({
      ...prev,
      individualPriorities: {
        ...prev.individualPriorities,
        [memberId]: !prev.individualPriorities[memberId]
      }
    }));
  };

  function handleSectionChange(sectionId) {
    setActiveSection(sectionId);
    setError(null);
    
    // Always fetch relevant data when switching sections to ensure fresh data
    console.log(`📍 Switching to section: ${sectionId}, fetching relevant data...`);
    
    switch(sectionId) {
      case 'objectives':
      case 'review-quarterly-rocks':
      case 'establish-quarterly-rocks':
        fetchPrioritiesData();
        break;
      case 'ids':
        fetchIssuesData();
        break;
      case 'vto':
        fetchVtoData();
        break;
      case 'eos-tools':
        fetchTeamMembers();
        break;
      default:
        break;
    }
    
    // Emit navigation event if leader
    if (isLeader && navigateToSection) {
      navigateToSection(sectionId);
    }
  };

  // Helper function for status dot color
  const getStatusDotColor = (status) => {
    switch (status) {
      case 'on-track':
        return { backgroundColor: themeColors.primary };
      case 'off-track':
        return { backgroundColor: '#EF4444' };
      default:
        return { backgroundColor: '#6B7280' };
    }
  };

  // Helper function to calculate days until due
  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getNextSection = () => {
    const currentIndex = agendaItems.findIndex(item => item.id === activeSection);
    if (currentIndex < agendaItems.length - 1) {
      return agendaItems[currentIndex + 1];
    }
    return null;
  };

  const getPreviousSection = () => {
    const currentIndex = agendaItems.findIndex(item => item.id === activeSection);
    if (currentIndex > 0) {
      return agendaItems[currentIndex - 1];
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
      case 'eos-tools':
        return (
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                    <Building2 className="h-5 w-5" style={{ color: themeColors.primary }} />
                    EOS Tools
                  </CardTitle>
                  <CardDescription className="mt-2 text-slate-600 font-medium">Review Accountability Chart & Scorecard (1 hour)</CardDescription>
                </div>
                <div className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 shadow-sm font-medium">
                  1 hour
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl border" style={{ 
                    backgroundColor: hexToRgba(themeColors.accent, 0.03),
                    borderColor: hexToRgba(themeColors.accent, 0.15)
                  }}>
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Users className="h-5 w-5" style={{ color: themeColors.primary }} />
                      Accountability Chart
                    </h4>
                    <p className="text-gray-600">Review your organizational structure and ensure everyone knows their role.</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => window.open('/organizational-chart', '_blank')}
                    >
                      View Accountability Chart
                    </Button>
                  </div>
                  <div className="p-6 rounded-xl border" style={{ 
                    backgroundColor: hexToRgba(themeColors.secondary, 0.03),
                    borderColor: hexToRgba(themeColors.secondary, 0.15)
                  }}>
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" style={{ color: themeColors.secondary }} />
                      Scorecard
                    </h4>
                    <p className="text-gray-600">Review your weekly metrics and ensure they're tracking toward goals.</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => window.open('/scorecard', '_blank')}
                    >
                      View Scorecard
                    </Button>
                  </div>
                </div>
                <div className="p-4 bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-xl">
                  <p className="text-blue-800 text-center">
                    <span className="font-semibold">Key Questions:</span> Is everyone in the right seat? Are we measuring what matters?
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'ids':
        return (
          <div className="space-y-4">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                      <AlertTriangle className="h-5 w-5" style={{ color: themeColors.primary }} />
                      Identify Discuss Solve
                    </CardTitle>
                    <CardDescription className="mt-2 text-slate-600 font-medium">Solve the most important Issue(s) (3 hours)</CardDescription>
                  </div>
                  <div className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 shadow-sm font-medium">
                    3 hours
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
                          className="min-w-[120px] relative z-10 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                          data-state={issueTimeline === 'short_term' ? 'active' : 'inactive'}
                          style={issueTimeline === 'short_term' ? {
                            background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                            color: 'white'
                          } : {}}
                        >
                          Short Term ({shortTermIssues.length})
                        </TabsTrigger>
                        <TabsTrigger 
                          value="long_term" 
                          className="min-w-[120px] relative z-10 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                          data-state={issueTimeline === 'long_term' ? 'active' : 'inactive'}
                          style={issueTimeline === 'long_term' ? {
                            background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                            color: 'white'
                          } : {}}
                        >
                          Long Term ({longTermIssues.length})
                        </TabsTrigger>
                      </TabsList>
                      
                      <div className="flex gap-2">
                        {(() => {
                          const currentIssues = issueTimeline === 'short_term' ? shortTermIssues : longTermIssues;
                          const closedIssuesCount = currentIssues.filter(issue => issue.status === 'closed').length;
                          return closedIssuesCount > 0 && (
                            <Button 
                              onClick={async () => {
                                try {
                                  await issuesService.archiveClosedIssues(issueTimeline);
                                  setSuccess(`${closedIssuesCount} closed issue${closedIssuesCount > 1 ? 's' : ''} archived`);
                                  await fetchIssuesData();
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
                          compactGrid={false}
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
                          compactGrid={false}
                        />
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'next-steps':
        return (
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                    <ClipboardList className="h-5 w-5" style={{ color: themeColors.primary }} />
                    Next Steps
                  </CardTitle>
                  <CardDescription className="mt-2 text-slate-600 font-medium">Who, what, when (7 minutes)</CardDescription>
                </div>
                <div className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 shadow-sm font-medium">
                  7 minutes
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="p-6 rounded-xl border" style={{ 
                  backgroundColor: hexToRgba(themeColors.accent, 0.03),
                  borderColor: hexToRgba(themeColors.accent, 0.15)
                }}>
                  <h4 className="font-semibold text-lg mb-4">Review Action Items:</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span>Confirm all Quarterly Rocks are documented with clear ownership</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span>Review all To-Dos created during this meeting</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span>Schedule next Quarterly Planning Meeting</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span>Communicate priorities to the rest of the organization</span>
                    </li>
                  </ul>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => navigate('/quarterly-priorities')}
                  >
                    <Target className="h-4 w-4" />
                    View All Rocks
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => navigate('/todos')}
                  >
                    <CheckSquare className="h-4 w-4" />
                    View To-Dos
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => navigate('/issues')}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    View Issues
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'objectives':
        return (
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                    <Target className="h-5 w-5" style={{ color: themeColors.primary }} />
                    Meeting Objectives
                  </CardTitle>
                  <CardDescription className="mt-2 text-slate-600 font-medium">Review meeting goals and expected outcomes</CardDescription>
                </div>
                <div className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 shadow-sm font-medium">
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
                <div className="p-6 rounded-xl border" style={{ 
                  backgroundColor: hexToRgba(themeColors.accent, 0.03),
                  borderColor: hexToRgba(themeColors.accent, 0.2)
                }}>
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
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                    <div className="p-2 rounded-xl" style={{ background: `linear-gradient(135deg, ${themeColors.primary}20 0%, ${themeColors.secondary}20 100%)` }}>
                      <CheckSquare className="h-5 w-5" style={{ color: themeColors.primary }} />
                    </div>
                    Team Check-In
                  </CardTitle>
                  <CardDescription className="mt-2 text-slate-600 font-medium">Connect as a team before diving into business</CardDescription>
                </div>
                <div className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 shadow-sm font-medium">
                  15 minutes
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 px-6 pb-6">
              <div className="space-y-4">
                <p className="text-slate-600">
                  Go around the room and have each team member share:
                </p>
                <div className="space-y-4">
                  <div className="border border-white/30 p-4 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm border-l-4" style={{ borderLeftColor: themeColors.accent }}>
                    <h4 className="font-semibold text-slate-900">1. Bests</h4>
                    <p className="text-sm text-slate-600 mt-1">Personal and professional Best from the last 90 days</p>
                  </div>
                  <div className="border border-white/30 p-4 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm border-l-4" style={{ borderLeftColor: themeColors.accent }}>
                    <h4 className="font-semibold text-slate-900">2. Update</h4>
                    <p className="text-sm text-slate-600 mt-1">What's working/not working?</p>
                  </div>
                  <div className="border border-white/30 p-4 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm border-l-4" style={{ borderLeftColor: themeColors.accent }}>
                    <h4 className="font-semibold text-slate-900">3. Expectations for this session</h4>
                    <p className="text-sm text-slate-600 mt-1">What do you hope to accomplish in this meeting?</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'review-quarterly-rocks':
        if (loading) {
          return (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          );
        }
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
                        Review Prior Quarter
                      </CardTitle>
                      <CardDescription className="mt-2 text-slate-600 font-medium">Check progress on last quarter's priorities (30 minutes)</CardDescription>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 shadow-sm font-medium">
                    30 minutes
                  </div>
                </div>
              </CardHeader>
            </Card>
            
            {/* Quarterly Numbers Review - Simple On Track/Off Track */}
            <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl">
              <CardHeader 
                className="cursor-pointer"
                onClick={() => setIsNumbersReviewCollapsed(!isNumbersReviewCollapsed)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <DollarSign className="h-5 w-5" style={{ color: themeColors.primary }} />
                      Quarterly Numbers Review
                    </CardTitle>
                    <CardDescription>Are your key metrics on track or off track?</CardDescription>
                  </div>
                  <ChevronDown 
                    className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                      isNumbersReviewCollapsed ? '' : 'rotate-180'
                    }`}
                  />
                </div>
              </CardHeader>
              {!isNumbersReviewCollapsed && (
                <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Revenue */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Revenue</h4>
                      <TrendingUp className="h-4 w-4 text-gray-400" />
                    </div>
                    {blueprintData?.oneYearPlan?.revenue && (
                      <p className="text-sm text-gray-600 mb-2">
                        Target: {typeof blueprintData.oneYearPlan.revenue === 'number' 
                          ? `$${(blueprintData.oneYearPlan.revenue / 1000000).toFixed(1)}M`
                          : blueprintData.oneYearPlan.revenue}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={metricsStatus.revenue === 'on-track' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setMetricsStatus(prev => ({ ...prev, revenue: 'on-track' }))}
                        style={metricsStatus.revenue === 'on-track' ? {
                          backgroundColor: '#10B981',
                          color: 'white',
                          borderColor: '#10B981'
                        } : {}}
                      >
                        On Track
                      </Button>
                      <Button
                        size="sm"
                        variant={metricsStatus.revenue === 'off-track' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setMetricsStatus(prev => ({ ...prev, revenue: 'off-track' }))}
                        style={metricsStatus.revenue === 'off-track' ? {
                          backgroundColor: '#EF4444',
                          color: 'white',
                          borderColor: '#EF4444'
                        } : {}}
                      >
                        Off Track
                      </Button>
                    </div>
                  </div>

                  {/* Profit */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Profit</h4>
                      <Activity className="h-4 w-4 text-gray-400" />
                    </div>
                    {blueprintData?.oneYearPlan?.profit && (
                      <p className="text-sm text-gray-600 mb-2">
                        Target: {typeof blueprintData.oneYearPlan.profit === 'number' 
                          ? `$${(blueprintData.oneYearPlan.profit / 1000000).toFixed(1)}M`
                          : blueprintData.oneYearPlan.profit}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={metricsStatus.profit === 'on-track' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setMetricsStatus(prev => ({ ...prev, profit: 'on-track' }))}
                        style={metricsStatus.profit === 'on-track' ? {
                          backgroundColor: '#10B981',
                          color: 'white',
                          borderColor: '#10B981'
                        } : {}}
                      >
                        On Track
                      </Button>
                      <Button
                        size="sm"
                        variant={metricsStatus.profit === 'off-track' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setMetricsStatus(prev => ({ ...prev, profit: 'off-track' }))}
                        style={metricsStatus.profit === 'off-track' ? {
                          backgroundColor: '#EF4444',
                          color: 'white',
                          borderColor: '#EF4444'
                        } : {}}
                      >
                        Off Track
                      </Button>
                    </div>
                  </div>

                  {/* Key Measurables */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Key Measurables</h4>
                      <BarChart className="h-4 w-4 text-gray-400" />
                    </div>
                    {blueprintData?.oneYearPlan?.measurables && blueprintData.oneYearPlan.measurables.length > 0 && (
                      <div className="text-sm text-gray-600 mb-2">
                        {blueprintData.oneYearPlan.measurables.slice(0, 3).map((measurable, index) => (
                          <p key={index} className="truncate">
                            • {typeof measurable === 'object' 
                              ? `${measurable.name || measurable.title || ''} ${measurable.target_value ? `(${measurable.target_value}${measurable.unit || ''})` : ''}`
                              : measurable}
                          </p>
                        ))}
                        {blueprintData.oneYearPlan.measurables.length > 3 && (
                          <p className="text-xs text-gray-500">+{blueprintData.oneYearPlan.measurables.length - 3} more</p>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={metricsStatus.measurables === 'on-track' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setMetricsStatus(prev => ({ ...prev, measurables: 'on-track' }))}
                        style={metricsStatus.measurables === 'on-track' ? {
                          backgroundColor: '#10B981',
                          color: 'white',
                          borderColor: '#10B981'
                        } : {}}
                      >
                        On Track
                      </Button>
                      <Button
                        size="sm"
                        variant={metricsStatus.measurables === 'off-track' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setMetricsStatus(prev => ({ ...prev, measurables: 'off-track' }))}
                        style={metricsStatus.measurables === 'off-track' ? {
                          backgroundColor: '#EF4444',
                          color: 'white',
                          borderColor: '#EF4444'
                        } : {}}
                      >
                        Off Track
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> Review your quarterly targets from the 1-Year Plan before marking each metric.
                  </p>
                </div>
              </CardContent>
              )}
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
                    Go to {labels?.priorities_label || 'Quarterly Priorities'}
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
                    <span className="font-bold">Quick Status Check:</span> Each Rock owner reports "Done" or "Not Done"
                  </p>
                </div>
                
                {/* Rock Completion Status */}
                {priorities.length > 0 && (
                  <div className="flex justify-center">
                    <div className="text-center bg-white/80 backdrop-blur-sm rounded-2xl px-8 py-4 border border-white/50 shadow-lg">
                      <span className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        {Math.round((priorities.filter(p => p.status === 'complete').length / priorities.length) * 100)}%
                      </span>
                      <p className="text-sm text-slate-600 font-medium mt-1">
                        {priorities.filter(p => p.status === 'complete').length} of {priorities.length} Rocks complete
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Employee-Centric Rock View (Ninety.io Style) */}
                {(() => {
                  // Toggle expansion for a priority
                  const togglePriorityExpansion = (priorityId, e) => {
                    e.stopPropagation();
                    setExpandedPriorities(prev => ({
                      ...prev,
                      [priorityId]: !prev[priorityId]
                    }));
                  };
                  
                  // Group all priorities by owner
                  const prioritiesByOwner = priorities.reduce((acc, priority) => {
                    const ownerId = priority.owner?.id || 'unassigned';
                    const ownerName = priority.owner?.name || 'Unassigned';
                    if (!acc[ownerId]) {
                      acc[ownerId] = {
                        id: ownerId,
                        name: ownerName,
                        priorities: []
                      };
                    }
                    acc[ownerId].priorities.push(priority);
                    return acc;
                  }, {});
                  
                  // Convert to array and sort by name
                  const owners = Object.values(prioritiesByOwner).sort((a, b) => {
                    if (a.id === 'unassigned') return 1;
                    if (b.id === 'unassigned') return -1;
                    return (a.name || '').localeCompare(b.name || '');
                  });
                  
                  return (
                    <div className="space-y-6">
                      {owners.map(owner => (
                        <Card key={owner.id} className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-slate-100">
                                  <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 font-semibold">
                                    {owner.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h3 className="text-lg font-bold text-slate-900">{owner.name}</h3>
                                  <p className="text-sm text-slate-500">{owner.priorities.length} {labels?.priority_singular || 'Rock'}{owner.priorities.length !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                              <ChevronDown className="h-5 w-5 text-slate-400" />
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-1">
                              {/* Header Row */}
                              <div className="flex items-center px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                <div className="w-8"></div>
                                <div className="w-10 ml-2">Status</div>
                                <div className="flex-1 ml-3">Title</div>
                                <div className="w-40 text-center">Milestone Progress</div>
                                <div className="w-20 text-right">Due By</div>
                                <div className="w-8"></div>
                              </div>
                              
                              {/* Rock Rows */}
                              {owner.priorities.map(priority => {
                                const isComplete = priority.status === 'complete' || priority.status === 'completed';
                                const isOnTrack = priority.status === 'on-track';
                                const completedMilestones = (priority.milestones || []).filter(m => m.completed).length;
                                const totalMilestones = (priority.milestones || []).length;
                                const isExpanded = expandedPriorities[priority.id];
                                
                                return (
                                  <div key={priority.id} className="border-b border-slate-100 last:border-0">
                                    {/* Main Rock Row */}
                                    <div 
                                      className="flex items-center px-3 py-3 hover:bg-slate-50 rounded-lg transition-colors group"
                                      // TEMPORARILY DISABLED: onContextMenu
                                      // onContextMenu={(e) => {
                                      //   e.preventDefault();
                                      //   setContextMenu({
                                      //     x: e.clientX,
                                      //     y: e.clientY,
                                      //     priority: priority
                                      //   });
                                      // }}
                                    >
                                      {/* Expand Arrow */}
                                      <div 
                                        className="w-8 flex items-center justify-center cursor-pointer"
                                        onClick={(e) => togglePriorityExpansion(priority.id, e)}
                                      >
                                        <ChevronRight 
                                          className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                                            isExpanded ? 'rotate-90' : ''
                                          }`} 
                                        />
                                    </div>
                                    
                                    {/* Status Indicator with Dropdown */}
                                    <div className="w-10 ml-2 flex items-center relative status-dropdown">
                                      <div 
                                        className="flex items-center justify-center w-7 h-7 rounded-full cursor-pointer hover:scale-110 transition-transform"
                                        style={{
                                          backgroundColor: 
                                            priority.status === 'cancelled' ? '#6B728020' :
                                            isComplete ? themeColors.primary + '20' : 
                                            (isOnTrack ? '#10B98120' : '#EF444420'),
                                          border: `2px solid ${
                                            priority.status === 'cancelled' ? '#6B7280' :
                                            isComplete ? themeColors.primary : 
                                            (isOnTrack ? '#10B981' : '#EF4444')
                                          }`
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenStatusDropdown(openStatusDropdown === priority.id ? null : priority.id);
                                        }}
                                      >
                                        {priority.status === 'cancelled' ? (
                                          <X className="h-4 w-4 text-gray-500" />
                                        ) : isComplete ? (
                                          <CheckCircle className="h-4 w-4" style={{ color: themeColors.primary }} />
                                        ) : isOnTrack ? (
                                          <Check className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <X className="h-4 w-4 text-red-600" />
                                        )}
                                      </div>
                                      
                                      {/* Status Dropdown */}
                                      {openStatusDropdown === priority.id && (
                                        <div className="absolute top-8 left-0 z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px]">
                                          <button
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              await quarterlyPrioritiesService.updatePriority(
                                                user?.organizationId,
                                                teamId,
                                                priority.id,
                                                { status: 'on-track' }
                                              );
                                              await fetchPrioritiesData();
                                              setOpenStatusDropdown(null);
                                            }}
                                          >
                                            <div className="w-4 h-4 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center">
                                              {priority.status === 'on-track' && <Check className="h-3 w-3 text-green-600" />}
                                            </div>
                                            <span className={priority.status === 'on-track' ? 'font-medium' : ''}>On Track</span>
                                          </button>
                                          
                                          <button
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              await quarterlyPrioritiesService.updatePriority(
                                                user?.organizationId,
                                                teamId,
                                                priority.id,
                                                { status: 'off-track' }
                                              );
                                              await fetchPrioritiesData();
                                              setOpenStatusDropdown(null);
                                            }}
                                          >
                                            <div className="w-4 h-4 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center">
                                              {priority.status === 'off-track' && <X className="h-3 w-3 text-red-600" />}
                                            </div>
                                            <span className={priority.status === 'off-track' ? 'font-medium' : ''}>Off Track</span>
                                          </button>
                                          
                                          <button
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              await quarterlyPrioritiesService.updatePriority(
                                                user?.organizationId,
                                                teamId,
                                                priority.id,
                                                { status: 'complete' }
                                              );
                                              await fetchPrioritiesData();
                                              setOpenStatusDropdown(null);
                                            }}
                                          >
                                            <div className="w-4 h-4 rounded-full bg-green-100 border-2 border-green-600 flex items-center justify-center">
                                              {(priority.status === 'complete' || priority.status === 'completed') && <CheckCircle className="h-3 w-3 text-green-600" />}
                                            </div>
                                            <span className={(priority.status === 'complete' || priority.status === 'completed') ? 'font-medium' : ''}>Complete</span>
                                          </button>
                                          
                                          <div className="border-t border-slate-100 my-1"></div>
                                          
                                          <button
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              await quarterlyPrioritiesService.updatePriority(
                                                user?.organizationId,
                                                teamId,
                                                priority.id,
                                                { status: 'cancelled' }
                                              );
                                              await fetchPrioritiesData();
                                              setOpenStatusDropdown(null);
                                            }}
                                          >
                                            <div className="w-4 h-4 rounded-full bg-gray-100 border-2 border-gray-500 flex items-center justify-center">
                                              {priority.status === 'cancelled' && <X className="h-3 w-3 text-gray-600" />}
                                            </div>
                                            <span className={priority.status === 'cancelled' ? 'font-medium' : ''}>Cancelled</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Title */}
                                    <div 
                                      className="flex-1 ml-3 cursor-pointer hover:opacity-80"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSidePanelRock(priority);
                                      }}
                                    >
                                      <span className={`text-sm font-medium ${
                                        priority.status === 'cancelled' ? 'line-through text-slate-400' :
                                        isComplete ? 'line-through text-slate-400' : 
                                        'text-slate-900'
                                      }`}>
                                        {priority.title}
                                      </span>
                                    </div>
                                    
                                    {/* Milestone Progress */}
                                    <div className="w-40 flex items-center justify-center px-2">
                                      {totalMilestones > 0 ? (
                                        <div className="flex items-center gap-2 w-full">
                                          <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                                            <div 
                                              className="h-full bg-green-500 rounded-full transition-all"
                                              style={{
                                                width: `${(completedMilestones / totalMilestones) * 100}%`
                                              }}
                                            />
                                          </div>
                                          <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
                                            {completedMilestones}/{totalMilestones}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-slate-400">-</span>
                                      )}
                                    </div>
                                    
                                    {/* Due Date */}
                                    <div className="w-20 text-right text-sm text-slate-600">
                                      {priority.dueDate ? format(parseDateLocal(priority.dueDate), 'MMM d') : '-'}
                                    </div>
                                    
                                    {/* Menu */}
                                    <div className="w-8 flex items-center justify-center">
                                      <button 
                                        className="p-1 hover:bg-slate-200 rounded opacity-0 group-hover:opacity-100 transition-opacity" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Menu would go here
                                        }}
                                      >
                                        <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                      </button>
                                    </div>
                                  </div>
                                    
                                    {/* Expandable Content */}
                                    {isExpanded && (
                                      <div className="ml-12 mt-3 p-4 bg-slate-50 rounded-lg border-l-4" style={{ borderColor: themeColors.primary + '40' }}>
                                        {/* Milestones */}
                                        <div className="mb-4">
                                          <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-xs font-semibold uppercase text-slate-500">Milestones</h4>
                                            <span className="text-xs text-slate-500">
                                              {completedMilestones} of {totalMilestones} complete
                                            </span>
                                          </div>
                                          {priority.milestones && priority.milestones.length > 0 ? (
                                            <div className="space-y-2">
                                              {priority.milestones.map((milestone, idx) => (
                                                <div key={milestone.id || idx} className="flex items-start gap-3 group">
                                                  <div className="mt-0.5">
                                                    <div 
                                                      className="w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors"
                                                      style={{
                                                        borderColor: milestone.completed ? themeColors.primary : '#CBD5E1',
                                                        backgroundColor: milestone.completed ? themeColors.primary : 'white'
                                                      }}
                                                      onClick={async (e) => {
                                                        e.stopPropagation();
                                                        const newCompletedState = !milestone.completed;
                                                        
                                                        // Optimistically update the UI
                                                        setPriorities(prevPriorities => 
                                                          prevPriorities.map(p => 
                                                            p.id === priority.id 
                                                              ? {
                                                                  ...p,
                                                                  milestones: p.milestones.map(m =>
                                                                    m.id === milestone.id
                                                                      ? { ...m, completed: newCompletedState }
                                                                      : m
                                                                  )
                                                                }
                                                              : p
                                                          )
                                                        );
                                                        
                                                        try {
                                                          // Update on the server
                                                          await quarterlyPrioritiesService.updateMilestone(
                                                            user?.organizationId,
                                                            teamId,
                                                            priority.id,
                                                            milestone.id,
                                                            { completed: newCompletedState }
                                                          );
                                                          setSuccess(`Milestone ${newCompletedState ? 'completed' : 'uncompleted'}`);
                                                        } catch (error) {
                                                          console.error('Failed to update milestone:', error);
                                                          setError('Failed to update milestone');
                                                          // Revert the optimistic update on error
                                                          await fetchPrioritiesData();
                                                        }
                                                      }}
                                                    >
                                                      {milestone.completed && (
                                                        <Check className="h-3 w-3 text-white" />
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="flex-1">
                                                    <p className={`text-sm ${milestone.completed ? 'line-through text-slate-400' : 'text-slate-700'} group-hover:text-slate-900 transition-colors`}>
                                                      {milestone.title}
                                                    </p>
                                                    {milestone.dueDate && (
                                                      <p className="text-xs text-slate-500 mt-1">
                                                        Due {format(new Date(milestone.dueDate), 'MMM d, yyyy')}
                                                      </p>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-sm text-slate-500 italic">No milestones added</p>
                                          )}
                                        </div>
                                        
                                        {/* Updates */}
                                        {priority.updates && priority.updates.length > 0 && (
                                          <div className="mb-4">
                                            <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">Recent Updates</h4>
                                            <div className="space-y-2">
                                              {priority.updates.slice(0, 2).map((update, idx) => (
                                                <div key={idx} className="text-sm">
                                                  <p className="text-slate-700">{update.content}</p>
                                                  <p className="text-xs text-slate-500 mt-1">
                                                    {update.author} • {format(new Date(update.createdAt), 'MMM d, h:mm a')}
                                                  </p>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Add Milestone Section */}
                                        <div className="pt-3 border-t border-slate-200">
                                          {addingMilestoneFor === priority.id ? (
                                            // Inline milestone creation form
                                            <div className="space-y-2">
                                              <input
                                                type="text"
                                                placeholder="Milestone description..."
                                                value={newMilestone.title}
                                                onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                autoFocus
                                                onKeyDown={async (e) => {
                                                  if (e.key === 'Escape') {
                                                    setAddingMilestoneFor(null);
                                                    setNewMilestone({ title: '', dueDate: '' });
                                                  } else if (e.key === 'Enter' && newMilestone.title.trim()) {
                                                    e.preventDefault();
                                                    try {
                                                      await quarterlyPrioritiesService.createMilestone(
                                                        user?.organizationId,
                                                        teamId,
                                                        priority.id,
                                                        {
                                                          title: newMilestone.title,
                                                          dueDate: newMilestone.dueDate
                                                        }
                                                      );
                                                      await fetchPrioritiesData();
                                                      setAddingMilestoneFor(null);
                                                      setNewMilestone({ title: '', dueDate: '' });
                                                    } catch (error) {
                                                      console.error('Failed to create milestone:', error);
                                                    }
                                                  }
                                                }}
                                              />
                                              <div className="flex items-center gap-2">
                                                <input
                                                  value={newMilestone.dueDate}
                                                  onChange={(e) => setNewMilestone(prev => ({ ...prev, dueDate: e.target.value }))}
                                                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                                <Button
                                                  size="sm"
                                                  variant="default"
                                                  className="bg-green-600 hover:bg-green-700"
                                                  onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (newMilestone.title.trim()) {
                                                      try {
                                                        await quarterlyPrioritiesService.createMilestone(
                                                          user?.organizationId,
                                                          teamId,
                                                          priority.id,
                                                          {
                                                            title: newMilestone.title,
                                                            dueDate: newMilestone.dueDate
                                                          }
                                                        );
                                                        await fetchPrioritiesData();
                                                        setAddingMilestoneFor(null);
                                                        setNewMilestone({ title: '', dueDate: '' });
                                                      } catch (error) {
                                                        console.error('Failed to create milestone:', error);
                                                      }
                                                    }
                                                  }}
                                                >
                                                  <Check className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setAddingMilestoneFor(null);
                                                    setNewMilestone({ title: '', dueDate: '' });
                                                  }}
                                                >
                                                  <X className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            // Add Milestone button
                                            <Button 
                                              size="sm" 
                                              variant="outline"
                                              className="w-full"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setAddingMilestoneFor(priority.id);
                                                setNewMilestone({
                                                  title: '',
                                                  dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd')
                                                });
                                              }}
                                            >
                                              <Plus className="h-3 w-3 mr-1" />
                                              Add Milestone
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })()}
                
              </div>
            )}
            
            {/* Quarter Evaluation Card */}
            <Card className="mt-6 shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
                <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                  <Star className="h-5 w-5 text-indigo-600" />
                  Quarter Evaluation
                </CardTitle>
                <CardDescription>
                  Grade the quarter and provide feedback for the leadership team
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="letter-grade" className="text-sm font-medium text-gray-700">
                      Letter Grade for the Quarter
                    </Label>
                    <Select
                      value={quarterGrade}
                      onValueChange={setQuarterGrade}
                    >
                      <SelectTrigger 
                        id="letter-grade"
                        className="w-32 mt-2"
                        style={{
                          backgroundColor: quarterGrade === 'A' ? '#10B98120' :
                                         quarterGrade === 'B' ? '#3B82F620' :
                                         quarterGrade === 'C' ? '#EAB30820' :
                                         quarterGrade === 'D' ? '#F9731620' :
                                         quarterGrade === 'F' ? '#EF444420' : 'white',
                          borderColor: quarterGrade === 'A' ? '#10B981' :
                                      quarterGrade === 'B' ? '#3B82F6' :
                                      quarterGrade === 'C' ? '#EAB308' :
                                      quarterGrade === 'D' ? '#F97316' :
                                      quarterGrade === 'F' ? '#EF4444' : undefined
                        }}
                      >
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">
                          <span className="flex items-center gap-2">
                            <span className="font-bold text-green-600">A</span>
                            <span className="text-sm text-gray-600">Excellent</span>
                          </span>
                        </SelectItem>
                        <SelectItem value="B">
                          <span className="flex items-center gap-2">
                            <span className="font-bold text-blue-600">B</span>
                            <span className="text-sm text-gray-600">Good</span>
                          </span>
                        </SelectItem>
                        <SelectItem value="C">
                          <span className="flex items-center gap-2">
                            <span className="font-bold text-yellow-600">C</span>
                            <span className="text-sm text-gray-600">Average</span>
                          </span>
                        </SelectItem>
                        <SelectItem value="D">
                          <span className="flex items-center gap-2">
                            <span className="font-bold text-orange-600">D</span>
                            <span className="text-sm text-gray-600">Below Average</span>
                          </span>
                        </SelectItem>
                        <SelectItem value="F">
                          <span className="flex items-center gap-2">
                            <span className="font-bold text-red-600">F</span>
                            <span className="text-sm text-gray-600">Poor</span>
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {quarterGrade && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          {quarterGrade === 'A' ? 'Outstanding performance this quarter!' :
                           quarterGrade === 'B' ? 'Good job this quarter, room for improvement.' :
                           quarterGrade === 'C' ? 'Average performance, let\'s identify areas to improve.' :
                           quarterGrade === 'D' ? 'Below expectations, significant improvement needed.' :
                           quarterGrade === 'F' ? 'Major issues need to be addressed immediately.' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="quarter-feedback" className="text-sm font-medium text-gray-700">
                      Why did you give this grade? (Feedback for the team)
                    </Label>
                    <Textarea
                      id="quarter-feedback"
                      className="mt-2"
                      rows={4}
                      placeholder="Please explain your rating. What went well? What could be improved? What specific actions should we take next quarter?"
                      value={quarterFeedback}
                      onChange={(e) => setQuarterFeedback(e.target.value)}
                      style={{
                        borderColor: quarterGrade && !quarterFeedback ? '#EF4444' : undefined
                      }}
                    />
                    {quarterGrade && !quarterFeedback && (
                      <p className="text-xs text-red-600 mt-1">Please provide feedback to explain your grade</p>
                    )}
                  </div>
                  
                  {/* Visual indicator */}
                  {quarterGrade && quarterFeedback && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-green-800">
                        Quarter evaluation complete: Grade <strong>{quarterGrade}</strong> with feedback
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Complete Quarter Review Button */}
            <div className="flex justify-center mt-6">
              {priorities.length > 0 && (
                <Button
                  onClick={() => setReviewConfirmDialog(true)}
                  className="text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  size="lg"
                  style={{
                    background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                  }}
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Complete Quarter Review
                </Button>
              )}
            </div>
          </div>
        );

      case 'vto':
        if (loading) {
          return (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                      <ClipboardList className="h-5 w-5" style={{ color: themeColors.primary }} />
                      V/TO
                    </CardTitle>
                    <CardDescription className="mt-2 text-slate-600 font-medium">Review and update Vision/Traction Organizer (1 hour)</CardDescription>
                  </div>
                  <div className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 shadow-sm font-medium">
                    60 minutes
                  </div>
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
                    <p className="text-gray-500">Loading V/TO data...</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );

      case 'establish-quarterly-rocks':
        if (loading) {
          return (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          );
        }
        
        return (
          <div className="space-y-4">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                      <div className="p-2 rounded-xl" style={{ background: `linear-gradient(135deg, ${themeColors.primary}20 0%, ${themeColors.secondary}20 100%)` }}>
                        <ListChecks className="h-5 w-5" style={{ color: themeColors.primary }} />
                      </div>
                      Set {labels?.priorities_label || 'Quarterly Priorities'}
                    </CardTitle>
                    <CardDescription className="mt-2 text-slate-600 font-medium">Define 3-7 priorities for the upcoming quarter (2 hours)</CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      const orgId = user?.organizationId || user?.organization_id;
                      window.open(`/organizations/${orgId}/smart-rock-assistant`, '_blank');
                    }}
                    variant="outline"
                    style={{ 
                      color: themeColors.secondary,
                      borderColor: hexToRgba(themeColors.secondary, 0.3)
                    }}
                    className="hover:opacity-80"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    SMART Assistant
                  </Button>
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
                    Go to {labels?.priorities_label || 'Quarterly Priorities'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-xl p-4 shadow-sm">
                  <p className="text-blue-800 text-center">
                    <span className="font-semibold">Rock Setting:</span> Each Rock should be SMART (Specific, Measurable, Achievable, Relevant, Time-bound). Limit to 3-7 Company Rocks and 3-7 Individual Rocks.
                  </p>
                </div>
                
                {/* Employee-Centric Rock View */}
                {(() => {
                  // Combine all priorities (company and individual)
                  const allPriorities = priorities;
                  
                  // Toggle expansion for a priority
                  const togglePriorityExpansion = (priorityId, e) => {
                    e.stopPropagation();
                    setExpandedPriorities(prev => ({
                      ...prev,
                      [priorityId]: !prev[priorityId]
                    }));
                  };
                  
                  // Group all priorities by owner
                  const prioritiesByOwner = allPriorities.reduce((acc, priority) => {
                    const ownerId = priority.owner?.id || 'unassigned';
                    const ownerName = priority.owner?.name || 'Unassigned';
                    if (!acc[ownerId]) {
                      acc[ownerId] = {
                        id: ownerId,
                        name: ownerName,
                        priorities: []
                      };
                    }
                    acc[ownerId].priorities.push(priority);
                    return acc;
                  }, {});
                  
                  // Convert to array and sort by name
                  const owners = Object.values(prioritiesByOwner).sort((a, b) => {
                    if (a.id === 'unassigned') return 1;
                    if (b.id === 'unassigned') return -1;
                    return (a.name || '').localeCompare(b.name || '');
                  });
                  
                  if (allPriorities.length === 0) {
                    return (
                      <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl">
                        <CardContent className="text-center py-8">
                          <p className="text-slate-500 font-medium">No {labels.priorities_label?.toLowerCase() || 'priorities'} found for this quarter.</p>
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => setShowAddPriority(true)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add {labels.priority || 'Priority'}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  }
                  
                  return (
                    <div className="space-y-6">
                      <div className="flex justify-end">
                        <Button 
                          variant="outline" 
                          className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90"
                          onClick={() => setShowAddPriority(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add {labels.priority || 'Priority'}
                        </Button>
                      </div>
                      
                      {owners.map(owner => (
                        <Card key={owner.id} className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-slate-100">
                                  <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 font-semibold">
                                    {owner.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h3 className="text-lg font-bold text-slate-900">{owner.name}</h3>
                                  <p className="text-sm text-slate-500">{owner.priorities.length} {labels?.priority_singular || 'Rock'}{owner.priorities.length !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                              <ChevronDown className="h-5 w-5 text-slate-400" />
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-1">
                              {/* Header Row */}
                              <div className="flex items-center px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                <div className="w-8"></div>
                                <div className="w-10 ml-2">Status</div>
                                <div className="flex-1 ml-3">Title</div>
                                <div className="w-40 text-center">Milestone Progress</div>
                                <div className="w-20 text-right">Due By</div>
                                <div className="w-8"></div>
                              </div>
                              
                              {/* Rock Rows */}
                              {owner.priorities.map(priority => {
                                const isComplete = priority.status === 'complete' || priority.status === 'completed';
                                const isOnTrack = priority.status === 'on-track';
                                const completedMilestones = (priority.milestones || []).filter(m => m.completed).length;
                                const totalMilestones = (priority.milestones || []).length;
                                const isExpanded = expandedPriorities[priority.id];
                                
                                return (
                                  <div key={priority.id} className="border-b border-slate-100 last:border-0">
                                    {/* Main Rock Row */}
                                    <div className="flex items-center px-3 py-3 hover:bg-slate-50 rounded-lg transition-colors group">
                                      {/* Expand Arrow */}
                                      <div 
                                        className="w-8 flex items-center justify-center cursor-pointer"
                                        onClick={(e) => togglePriorityExpansion(priority.id, e)}
                                      >
                                        <ChevronRight 
                                          className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                                            isExpanded ? 'rotate-90' : ''
                                          }`} 
                                        />
                                      </div>
                                      
                                      {/* Status Indicator with Dropdown */}
                                      <div className="w-10 ml-2 flex items-center relative status-dropdown">
                                        <div 
                                          className="flex items-center justify-center w-7 h-7 rounded-full cursor-pointer hover:scale-110 transition-transform"
                                          style={{
                                            backgroundColor: 
                                              priority.status === 'cancelled' ? '#6B728020' :
                                              isComplete ? themeColors.primary + '20' : 
                                              (isOnTrack ? '#10B98120' : '#EF444420'),
                                            border: `2px solid ${
                                              priority.status === 'cancelled' ? '#6B7280' :
                                              isComplete ? themeColors.primary : 
                                              (isOnTrack ? '#10B981' : '#EF4444')
                                            }`
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenStatusDropdown(openStatusDropdown === priority.id ? null : priority.id);
                                          }}
                                        >
                                          {priority.status === 'cancelled' ? (
                                            <X className="h-4 w-4 text-gray-500" />
                                          ) : isComplete ? (
                                            <CheckCircle className="h-4 w-4" style={{ color: themeColors.primary }} />
                                          ) : isOnTrack ? (
                                            <Check className="h-4 w-4 text-green-600" />
                                          ) : (
                                            <X className="h-4 w-4 text-red-600" />
                                          )}
                                        </div>
                                        
                                        {/* Status Dropdown */}
                                        {openStatusDropdown === priority.id && (
                                          <div className="absolute top-8 left-0 z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px]">
                                            <button
                                              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                await handleUpdatePriority(priority.id, { status: 'on-track' });
                                                setOpenStatusDropdown(null);
                                              }}
                                            >
                                              <div className="w-4 h-4 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center">
                                                {priority.status === 'on-track' && <Check className="h-3 w-3 text-green-600" />}
                                              </div>
                                              <span className={priority.status === 'on-track' ? 'font-medium' : ''}>On Track</span>
                                            </button>
                                            
                                            <button
                                              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                await handleUpdatePriority(priority.id, { status: 'off-track' });
                                                setOpenStatusDropdown(null);
                                              }}
                                            >
                                              <div className="w-4 h-4 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center">
                                                {priority.status === 'off-track' && <X className="h-3 w-3 text-red-600" />}
                                              </div>
                                              <span className={priority.status === 'off-track' ? 'font-medium' : ''}>Off Track</span>
                                            </button>
                                            
                                            <button
                                              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                await handleUpdatePriority(priority.id, { status: 'complete' });
                                                setOpenStatusDropdown(null);
                                              }}
                                            >
                                              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                                                   style={{ 
                                                     backgroundColor: themeColors.primary + '20',
                                                     borderColor: themeColors.primary 
                                                   }}>
                                                {priority.status === 'complete' && <CheckCircle className="h-3 w-3" style={{ color: themeColors.primary }} />}
                                              </div>
                                              <span className={priority.status === 'complete' ? 'font-medium' : ''}>Complete</span>
                                            </button>
                                            
                                            <div className="border-t border-slate-100 my-1"></div>
                                            
                                            <button
                                              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                await handleUpdatePriority(priority.id, { status: 'cancelled' });
                                                setOpenStatusDropdown(null);
                                              }}
                                            >
                                              <div className="w-4 h-4 rounded-full bg-gray-100 border-2 border-gray-500 flex items-center justify-center">
                                                {priority.status === 'cancelled' && <X className="h-3 w-3 text-gray-500" />}
                                              </div>
                                              <span className={priority.status === 'cancelled' ? 'font-medium' : ''}>Cancelled</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Title */}
                                      <div 
                                        className="flex-1 ml-3 cursor-pointer"
                                        onClick={() => {
                                          // Open priority dialog/editor
                                          console.log('Edit priority:', priority.id);
                                        }}
                                      >
                                        <span className={`font-medium ${isComplete ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                          {priority.title}
                                        </span>
                                        {priority.priority_type === 'company' && (
                                          <Badge variant="outline" className="ml-2 text-xs">Company</Badge>
                                        )}
                                      </div>
                                      
                                      {/* Milestone Progress */}
                                      <div className="w-40 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <span className="text-sm text-slate-600">
                                            {completedMilestones}/{totalMilestones}
                                          </span>
                                          <Progress value={totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0} className="w-16 h-2" />
                                        </div>
                                      </div>
                                      
                                      {/* Due Date */}
                                      <div className="w-20 text-right">
                                        <span className="text-sm text-slate-600">
                                          {priority.dueDate ? format(parseDateLocal(priority.dueDate), 'MMM d') : '-'}
                                        </span>
                                      </div>
                                      
                                      {/* Actions */}
                                      <div className="w-8 flex items-center justify-center">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={() => {
                                            // Open priority dialog/editor
                                            console.log('Edit priority:', priority.id);
                                          }}
                                        >
                                          <Edit className="h-4 w-4 text-slate-400" />
                                        </Button>
                                      </div>
                                    </div>
                                    
                                    {/* Expanded Milestones Section */}
                                    {isExpanded && (
                                      <div className="ml-12 mr-4 mb-3 p-3 bg-slate-50 rounded-lg">
                                        <div className="space-y-2">
                                          {(priority.milestones || []).map(milestone => (
                                            <div key={milestone.id} className="flex items-center gap-3">
                                              <Checkbox
                                                checked={milestone.completed}
                                                onCheckedChange={async (checked) => {
                                                  await handleToggleMilestone(priority.id, milestone.id, checked);
                                                }}
                                                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                              />
                                              <span className={`text-sm flex-1 ${milestone.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                                {milestone.title}
                                              </span>
                                              <span className="text-xs text-slate-500">
                                                {milestone.dueDate ? format(new Date(milestone.dueDate), 'MMM d') : ''}
                                              </span>
                                            </div>
                                          ))}
                                          
                                          {/* Milestones Section with Elegant Design */}
                                          {(priority.milestones || []).length === 0 && addingMilestoneFor !== priority.id ? (
                                            <div className="space-y-3">
                                              <div className="border border-slate-200 rounded-lg p-4 bg-white/50">
                                                <p className="text-sm text-slate-500 text-center mb-3">No milestones added</p>
                                                <Button
                                                  variant="outline"
                                                  className="w-full border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                                                  onClick={() => {
                                                    setAddingMilestoneFor(priority.id);
                                                    setNewMilestone({ 
                                                      title: '', 
                                                      dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd')
                                                    });
                                                  }}
                                                >
                                                  <Plus className="h-4 w-4 mr-2" />
                                                  Add Milestone
                                                </Button>
                                              </div>
                                            </div>
                                          ) : null}
                                          
                                          {/* Add Milestone Inline */}
                                          {addingMilestoneFor === priority.id ? (
                                            <div className="flex items-center gap-2 mt-2">
                                              <Input
                                                value={newMilestone.title}
                                                onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                                                placeholder="Milestone description..."
                                                className="flex-1 h-8 text-sm"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter' && newMilestone.title.trim()) {
                                                    handleAddMilestone(priority.id);
                                                  }
                                                  if (e.key === 'Escape') {
                                                    setAddingMilestoneFor(null);
                                                    setNewMilestone({ title: '', dueDate: '' });
                                                  }
                                                }}
                                              />
                                              <DatePicker placeholder="Select date" 
                                                value={newMilestone.dueDate}
                                                onChange={(value) => setNewMilestone(prev => ({ ...prev, dueDate: value }))}
                                                className="w-44 h-8 text-sm shrink-0"
                                              />
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 hover:bg-green-100"
                                                onClick={() => handleAddMilestone(priority.id)}
                                              >
                                                <Check className="h-4 w-4 text-green-600" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 hover:bg-red-100"
                                                onClick={() => {
                                                  setAddingMilestoneFor(null);
                                                  setNewMilestone({ title: '', dueDate: '' });
                                                }}
                                              >
                                                <X className="h-4 w-4 text-red-600" />
                                              </Button>
                                            </div>
                                          ) : (priority.milestones || []).length > 0 ? (
                                            <button
                                              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mt-2"
                                              onClick={() => {
                                                setAddingMilestoneFor(priority.id);
                                                setNewMilestone({ 
                                                  title: '', 
                                                  dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd')
                                                });
                                              }}
                                            >
                                              <Plus className="h-3 w-3" />
                                              Add Milestone
                                            </button>
                                          ) : null}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );

      case 'conclude':
        return (
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                    <div className="p-2 rounded-xl" style={{ background: `linear-gradient(135deg, ${themeColors.primary}20 0%, ${themeColors.secondary}20 100%)` }}>
                      <CheckSquare className="h-5 w-5" style={{ color: themeColors.primary }} />
                    </div>
                    Conclude Meeting
                  </CardTitle>
                  <CardDescription className="mt-2 text-slate-600 font-medium">Wrap up and cascade messages</CardDescription>
                </div>
                <div className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 shadow-sm font-medium">
                  5 minutes
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 px-6 pb-6">
              <div className="space-y-6">
                {/* Open To-Dos Summary */}
                <div className="border border-white/30 p-4 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-900 flex items-center gap-2">
                      <ListTodo className="h-4 w-4" style={{ color: themeColors.primary }} />
                      Open To-Dos Summary
                    </h4>
                    {/* Sort Options */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-600">Sort by:</label>
                      <select
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                        value={todoSortBy}
                        onChange={(e) => setTodoSortBy(e.target.value)}
                      >
                        <option value="assignee">Owner</option>
                        <option value="due_date">Due Date</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    Review all open action items before concluding the meeting:
                  </p>
                  {(() => {
                    const openTodos = todos.filter(todo => todo.status !== 'complete' && todo.status !== 'completed' && todo.status !== 'cancelled');
                    
                    const sortedTodos = [...openTodos].sort((a, b) => {
                      if (todoSortBy === 'due_date') {
                        if (!a.due_date && !b.due_date) return 0;
                        if (!a.due_date) return 1;
                        if (!b.due_date) return -1;
                        return new Date(a.due_date) - new Date(b.due_date);
                      } else if (todoSortBy === 'assignee') {
                        const aName = a.assigned_to ? `${a.assigned_to.first_name} ${a.assigned_to.last_name}` : 'Unassigned';
                        const bName = b.assigned_to ? `${b.assigned_to.first_name} ${b.assigned_to.last_name}` : 'Unassigned';
                        return (aName || '').localeCompare(bName || '');
                      }
                      return 0;
                    });
                    
                    if (todoSortBy === 'assignee') {
                      const todosByAssignee = sortedTodos.reduce((acc, todo) => {
                        if (todo.assignees && todo.assignees.length > 0) {
                          todo.assignees.forEach(assignee => {
                            const assigneeName = `${assignee.first_name} ${assignee.last_name}`;
                            if (!acc[assigneeName]) acc[assigneeName] = [];
                            acc[assigneeName].push({
                              ...todo,
                              isMultiAssignee: todo.assignees.length > 1,
                              allAssignees: todo.assignees,
                              _currentAssignee: assignee
                            });
                          });
                        } else {
                          const assigneeName = todo.assigned_to ? 
                            `${todo.assigned_to.first_name} ${todo.assigned_to.last_name}` : 
                            'Unassigned';
                          if (!acc[assigneeName]) acc[assigneeName] = [];
                          acc[assigneeName].push(todo);
                        }
                        return acc;
                      }, {});
                      
                      return openTodos.length === 0 ? (
                        <p className="text-slate-500 text-sm">No open to-dos</p>
                      ) : (
                        <div className="space-y-3">
                          {Object.entries(todosByAssignee).map(([assignee, assigneeTodos]) => (
                            <div key={assignee} className="space-y-2">
                              <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                {assignee} ({assigneeTodos.length})
                              </h5>
                              {assigneeTodos.map(todo => (
                                <div 
                                  key={`${todo.id}-${assignee}`}
                                  className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg ml-2 cursor-pointer hover:bg-slate-100 transition-colors"
                                  onClick={() => {
                                    setEditingTodo(todo);
                                    setShowTodoDialog(true);
                                  }}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900">
                                      {todo.title}
                                      {todo.isMultiAssignee && (
                                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                          Also: {todo.allAssignees
                                            .filter(a => `${a.first_name} ${a.last_name}` !== assignee)
                                            .map(a => `${a.first_name} ${a.last_name[0]}.`)
                                            .join(', ')}
                                        </span>
                                      )}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1">
                                      {todo.due_date && (
                                        <span className={`text-xs font-medium ${
                                          new Date(todo.due_date) < new Date() ? 'text-red-600' : 'text-blue-600'
                                        }`}>
                                          Due: {format(parseDateLocal(todo.due_date), 'MMM d, yyyy')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      );
                    }
                    
                    return openTodos.length === 0 ? (
                      <p className="text-slate-500 text-sm">No open to-dos</p>
                    ) : (
                      <div className="space-y-2">
                        {sortedTodos.map(todo => (
                          <div 
                            key={todo.id} 
                            className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                            onClick={() => {
                              setEditingTodo(todo);
                              setShowTodoDialog(true);
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900">{todo.title}</p>
                              <div className="flex items-center gap-3 mt-1">
                                {todo.assignees && todo.assignees.length > 0 ? (
                                  <span className="text-xs text-slate-600 font-medium">
                                    {todo.assignees.map(a => `${a.first_name} ${a.last_name}`).join(', ')}
                                  </span>
                                ) : todo.assigned_to && (
                                  <span className="text-xs text-slate-600 font-medium">
                                    {todo.assigned_to.first_name} {todo.assigned_to.last_name}
                                  </span>
                                )}
                                {todo.due_date && (
                                  <span className={`text-xs font-medium ${
                                    new Date(todo.due_date) < new Date() ? 'text-red-600' : 'text-blue-600'
                                  }`}>
                                    Due: {format(parseDateLocal(todo.due_date), 'MMM d, yyyy')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Feedback - Quarterly-specific */}
                <div className="border border-white/30 p-4 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm">
                  <h4 className="font-medium mb-3 text-slate-900 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" style={{ color: themeColors.primary }} />
                    Feedback
                  </h4>
                  <div className="space-y-3">
                    <p className="text-sm text-slate-700">
                      &bull; Where's your head? How are you feeling?
                    </p>
                    <p className="text-sm text-slate-700">
                      &bull; Were your expectations met?
                    </p>
                  </div>
                </div>

                {/* Cascading Messages - Only show to facilitator */}
                {(!meetingCode || isLeader) ? (
                <div className="border border-white/30 p-4 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm">
                  <h4 className="font-medium mb-2 text-slate-900 flex items-center gap-2">
                    <Share2 className="h-4 w-4" style={{ color: themeColors.primary }} />
                    Cascading Messages
                  </h4>
                  <p className="text-sm text-slate-600 mb-3">
                    What key information needs to be communicated to other teams?
                  </p>
                  <textarea
                    className="w-full p-3 border border-slate-200 rounded-lg resize-none focus:ring-2 focus:border-transparent mb-4"
                    rows={3}
                    placeholder="Enter any messages to cascade to other teams..."
                    value={cascadeMessage}
                    onChange={(e) => {
                      setCascadeMessage(e.target.value);
                      if (e.target.value && availableTeams.length === 0) {
                        teamsService.getTeams().then(response => {
                          const teams = response.data || response;
                          setAvailableTeams(Array.isArray(teams) ? teams.filter(t => !t.is_leadership_team) : []);
                        }).catch(error => {
                          console.error('Failed to load teams:', error);
                        });
                      }
                    }}
                  />
                  
                  {cascadeMessage.trim() && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="cascade-all"
                          checked={cascadeToAll}
                          onCheckedChange={(checked) => {
                            setCascadeToAll(checked);
                            if (checked) setSelectedTeams([]);
                          }}
                        />
                        <label htmlFor="cascade-all" className="text-sm font-medium text-slate-700 cursor-pointer">
                          Send to all teams
                        </label>
                      </div>
                      
                      {!cascadeToAll && availableTeams.length > 0 && (
                        <div className="animate-in fade-in duration-200">
                          <p className="text-sm text-slate-600 mb-2">Or select specific teams:</p>
                          <div className="space-y-2 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-white/50">
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
                                <label htmlFor={`team-${team.id}`} className="text-sm text-slate-700 cursor-pointer">
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
                ) : null}

                {/* Meeting Rating - Slider style matching Weekly */}
                <div className="border border-white/30 p-4 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm">
                  <h4 className="font-medium mb-2 text-slate-900 flex items-center gap-2">
                    <Star className="h-4 w-4" style={{ color: themeColors.primary }} />
                    Rate this meeting
                  </h4>
                  <p className="text-sm text-slate-600 mb-3">How productive was this meeting?</p>
                  {/* Large Value Display */}
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-slate-800 mb-1">
                      {meetingRating ? meetingRating.toFixed(1) : '5.0'}
                    </div>
                    <div className="text-sm text-slate-600">out of 10</div>
                  </div>

                  {/* Decimal Slider */}
                  <div className="mb-4 px-4">
                    <div className="relative">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="0.1"
                        value={meetingRating || 5.0}
                        onChange={(e) => {
                          const rating = parseFloat(e.target.value);
                          setMeetingRating(rating);
                        }}
                        className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, 
                            #ef4444 0%, 
                            #f59e0b 35%, 
                            #84cc16 65%, 
                            #22c55e 100%)`,
                          WebkitAppearance: 'none',
                          outline: 'none'
                        }}
                        disabled={ratingSubmitted && meetingCode}
                      />
                      <style>{`
                        input[type="range"]::-webkit-slider-thumb {
                          appearance: none;
                          height: 24px;
                          width: 24px;
                          border-radius: 50%;
                          background: white;
                          border: 3px solid ${themeColors.primary};
                          cursor: pointer;
                          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
                        }
                        input[type="range"]::-moz-range-thumb {
                          height: 24px;
                          width: 24px;
                          border-radius: 50%;
                          background: white;
                          border: 3px solid ${themeColors.primary};
                          cursor: pointer;
                          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
                        }
                      `}</style>
                    </div>

                    {/* Scale Labels */}
                    <div className="flex justify-between text-xs text-slate-500 mt-2 px-1">
                      <span>Poor</span>
                      <span>Average</span>
                      <span>Good</span>
                      <span>Excellent</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  {meetingRating !== null && !ratingSubmitted && (
                    <div className="text-center mb-4">
                      <button
                        onClick={() => {
                          setRatingSubmitted(true);
                          // Store as participant rating
                          setParticipantRatings(prev => ({
                            ...prev,
                            [user?.id]: {
                              userId: user?.id,
                              userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'You',
                              rating: meetingRating
                            }
                          }));
                          // Broadcast rating if in collaborative meeting
                          if (meetingCode && broadcastRating) {
                            broadcastRating({
                              userId: user?.id,
                              userName: `${user?.firstName} ${user?.lastName}`,
                              rating: meetingRating
                            });
                          }
                        }}
                        className="px-6 py-2 rounded-lg font-medium text-white shadow-md hover:shadow-lg transition-all"
                        style={{
                          background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                        }}
                      >
                        Submit Rating
                      </button>
                    </div>
                  )}

                  {/* Submission Status */}
                  {ratingSubmitted && (
                    <div className="text-center text-sm text-green-600 flex items-center justify-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      <span>Rating submitted</span>
                    </div>
                  )}
                  
                  {/* Participant Rating Status - Show to everyone in collaborative meeting */}
                  {meetingCode && participants.length > 0 && (
                    <div className="border-t border-slate-200 pt-3 mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-slate-700">
                          Rating Status ({Object.keys(participantRatings).length} completed)
                        </h5>
                        {Object.keys(participantRatings).length > 0 && (
                          <span className="text-sm font-medium text-blue-600">
                            Average: {(Object.values(participantRatings).reduce((sum, r) => sum + r.rating, 0) / Object.values(participantRatings).length).toFixed(1)}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {participants.map((participant) => {
                          const hasRated = !!participantRatings[participant.id];
                          const rating = participantRatings[participant.id]?.rating;

                          return (
                            <div key={participant.id} className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-slate-50">
                              <div className="flex items-center gap-2">
                                {hasRated ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                                )}
                                <span className="text-sm text-slate-600">
                                  {participant.name}
                                  {participant.id === currentLeader && (
                                    <span className="ml-1 text-xs text-blue-600">(Facilitator)</span>
                                  )}
                                </span>
                              </div>
                              {hasRated && (
                                <span className="text-sm font-medium text-slate-700">{rating.toFixed(1)}/10</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Facilitator: Enter ratings for team members not in meeting */}
                      {isLeader && teamMembers.length > 0 && (() => {
                        const nonParticipantMembers = teamMembers.filter(member => {
                          const isParticipant = participants.some(p =>
                            String(p.id) === String(member.id) ||
                            String(p.userId) === String(member.id)
                          );
                          return !isParticipant;
                        });

                        if (nonParticipantMembers.length === 0) return null;

                        return (
                          <div className="border-t border-slate-200 pt-3 mt-3">
                            <h5 className="text-sm font-medium text-slate-700 mb-2">
                              Enter ratings for team members
                            </h5>
                            <div className="space-y-2">
                              {nonParticipantMembers.map((member) => {
                                const memberName = member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unknown';
                                const hasRated = !!participantRatings[member.id];
                                const existingRating = participantRatings[member.id]?.rating;

                                return (
                                  <div key={member.id} className="flex items-center gap-2 py-1 px-2 rounded-md bg-slate-50">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      {hasRated ? (
                                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                      ) : (
                                        <div className="h-4 w-4 rounded-full border-2 border-orange-300 flex-shrink-0" />
                                      )}
                                      <span className="text-sm text-slate-600 truncate">
                                        {memberName}
                                      </span>
                                    </div>
                                    {hasRated ? (
                                      <span className="text-sm font-medium text-slate-700 flex-shrink-0">
                                        {existingRating.toFixed(1)}/10
                                      </span>
                                    ) : (
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <input
                                          type="number"
                                          min="1"
                                          max="10"
                                          step="0.1"
                                          placeholder="1-10"
                                          id={`rating-input-${member.id}`}
                                          className="w-16 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              const ratingVal = parseFloat(e.target.value);
                                              if (ratingVal >= 1 && ratingVal <= 10) {
                                                setParticipantRatings(prev => ({
                                                  ...prev,
                                                  [member.id]: {
                                                    userId: member.id,
                                                    userName: memberName,
                                                    rating: ratingVal
                                                  }
                                                }));
                                                if (broadcastRating) {
                                                  broadcastRating({ userId: member.id, userName: memberName, rating: ratingVal });
                                                }
                                                e.target.value = '';
                                              }
                                            }
                                          }}
                                        />
                                        <button
                                          onClick={() => {
                                            const input = document.getElementById(`rating-input-${member.id}`);
                                            if (!input) return;
                                            const ratingVal = parseFloat(input.value);
                                            if (ratingVal >= 1 && ratingVal <= 10) {
                                              setParticipantRatings(prev => ({
                                                ...prev,
                                                [member.id]: {
                                                  userId: member.id,
                                                  userName: memberName,
                                                  rating: ratingVal
                                                }
                                              }));
                                              if (broadcastRating) {
                                                broadcastRating({ userId: member.id, userName: memberName, rating: ratingVal });
                                              }
                                              input.value = '';
                                            }
                                          }}
                                          className="px-2 py-1 text-xs font-medium text-white rounded"
                                          style={{ backgroundColor: themeColors.primary }}
                                        >
                                          Submit
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* AI Summary Panel - Show if transcription was completed */}
                {transcriptionCompleted && (
                  <div className="border border-white/30 p-4 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm">
                    <MeetingAISummaryPanel
                      meetingId={`quarterly-${teamId}-${Date.now()}`}
                      organizationId={user?.organizationId || user?.organization_id}
                    />
                  </div>
                )}

                {/* Conclude Meeting Button - Only for Facilitator */}
                <div className="flex justify-center">
                  {!meetingCode || (meetingCode && isLeader) ? (
                    <div className="text-center space-y-3">
                      {/* Warning message when recording is active */}
                      {aiRecordingState?.isRecording && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-2 text-yellow-800 font-medium mb-1">
                            <AlertCircle className="h-5 w-5" />
                            Recording is still active
                          </div>
                          <p className="text-yellow-700 text-sm">
                            Please click "Stop Note Taking" first to generate the AI summary and include it in your meeting recap.
                          </p>
                        </div>
                      )}
                      
                      <Button
                        className={`shadow-lg hover:shadow-xl transition-all duration-200 text-white font-medium py-3 px-6 ${
                          aiRecordingState?.isRecording 
                            ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                            : 'animate-pulse'
                        }`}
                        style={{
                          background: aiRecordingState?.isRecording 
                            ? undefined 
                            : `linear-gradient(135deg, ${themeColors.primary} 0%, #22c55e 50%, ${themeColors.secondary} 100%)`
                        }}
                        onClick={() => {
                          if (!aiRecordingState?.isRecording) {
                            setShowConcludeDialog(true);
                          }
                        }}
                        disabled={aiRecordingState?.isRecording}
                      >
                        {aiRecordingState?.isRecording ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Stop Note Taking First
                          </>
                        ) : (
                          <>
                            <CheckSquare className="mr-2 h-5 w-5" />
                            End Meeting
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <div className="text-slate-600">
                        {participants.find(p => p.id === currentLeader) && (
                          <p>
                            Waiting for <span className="font-medium">
                              {participants.find(p => p.id === currentLeader).name}
                            </span> to conclude the meeting...
                          </p>
                        )}
                      </div>
                      <div className="flex justify-center">
                        <div className="animate-spin h-5 w-5 border-2 border-slate-400 border-t-transparent rounded-full" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Meeting Conclusion Options - Only show to facilitator */}
                {(!meetingCode || isLeader) ? (
                <div className="border border-white/30 p-4 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm space-y-3">
                  <h4 className="font-medium text-slate-900 mb-3">Meeting Conclusion Options</h4>
                  
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="send-email"
                      checked={sendSummaryEmail}
                      onCheckedChange={(checked) => setSendSummaryEmail(checked)}
                      className="h-5 w-5"
                    />
                    <label htmlFor="send-email" className="text-sm text-slate-700 cursor-pointer select-none">
                      Send summary email to all team members
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="archive-completed"
                      checked={archiveCompleted}
                      onCheckedChange={(checked) => setArchiveCompleted(checked)}
                      className="h-5 w-5"
                    />
                    <label htmlFor="archive-completed" className="text-sm text-slate-700 cursor-pointer select-none">
                      Archive all completed To-Dos and solved Issues
                    </label>
                  </div>
                </div>
                ) : null}
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
      
      {/* Connection Warning Banner */}
      {isReconnecting && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white py-2 px-4 text-center shadow-lg animate-pulse">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-medium">Connection lost. Attempting to reconnect...</span>
          </div>
        </div>
      )}
      
      <div className="relative max-w-7xl mx-auto p-8 pb-32">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
                   style={{
                     background: `linear-gradient(135deg, ${themeColors.primary}15 0%, ${themeColors.secondary}15 100%)`,
                     color: themeColors.primary
                   }}>
                <Target className="h-4 w-4" />
                QUARTERLY PLANNING
              </div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">Quarterly Planning Meeting</h1>
              <p className="text-lg text-slate-600">Plan and align for the upcoming quarter</p>
            </div>
            {meetingStarted && (
              <div className="flex items-center gap-4">
                {participants.length > 0 && (
                  <>
                    <div className="relative group">
                      <div className="backdrop-blur-sm px-4 py-2 rounded-xl border shadow-sm cursor-pointer" style={{
                        backgroundColor: `${themeColors.primary}10`,
                        borderColor: `${themeColors.primary}30`
                      }}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" style={{ color: themeColors.primary }} />
                          <span className="text-sm font-medium" style={{ color: themeColors.primary }}>
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
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColors.primary }} />
                              <span>{participant.name || 'Unknown'}</span>
                              {participant.id === currentLeader && (
                                <span className="text-xs font-medium" style={{ color: themeColors.primary }}>(Presenter)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    
                    {/* Current presenter indicator */}
                    {isLeader && (
                      <div className="backdrop-blur-sm px-4 py-2 rounded-xl border shadow-sm" style={{ backgroundColor: `${themeColors.primary}10`, borderColor: `${themeColors.primary}30` }}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeColors.primary }} />
                          <span className="text-sm font-medium" style={{ color: themeColors.primary }}>You're Presenting</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-white/50">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span className="text-lg font-mono font-semibold text-slate-900">
                      {formatTime(elapsedTime)}
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
            <Alert className="mb-4 backdrop-blur-sm rounded-2xl shadow-sm" style={{ borderColor: `${themeColors.primary}30`, backgroundColor: `${themeColors.primary}10` }}>
              <CheckCircle className="h-4 w-4" style={{ color: themeColors.primary }} />
              <AlertDescription className="font-medium" style={{ color: themeColors.primary }}>{success}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Meeting Bar - for collaborative meetings */}
        {meetingCode && (
          <MeetingBar
            meetingCode={meetingCode}
            participants={participants}
            onLeave={leaveMeeting}
            isLeader={isLeader}
            currentLeader={currentLeader}
            onNavigate={navigateToSection}
            currentSection={activeSection}
            agendaItems={agendaItems}
            onSyncTimer={syncTimer}
            onUpdateNotes={updateNotes}
            sectionNotes={sectionNotes}
            onBroadcastRating={broadcastRating}
            meetingStartTime={meetingStartTime}
            meetingStarted={meetingStarted}
            isFollowing={isFollowing}
            toggleFollow={toggleFollow}
            isPaused={isPaused}
            onPauseResume={handlePauseResume}
            totalPausedTime={totalPausedTime}
          />
        )}

        {/* AI Meeting Assistant Controls */}
        {(() => {
          const orgId = user?.organizationId || user?.organization_id;
          return orgId && teamId;
        })() && (
          <div className="mb-6">
            <MeetingAIRecordingControls
              meetingId={`quarterly-${teamId}-${Date.now()}`}
              organizationId={user?.organizationId || user?.organization_id}
              onTranscriptionStarted={() => {
                console.log('AI transcription started');
              }}
              onTranscriptionStopped={() => {
                setTranscriptionCompleted(true);
              }}
              onRecordingStateChange={setAiRecordingState}
            />
          </div>
        )}

        {/* Navigation Tabs - Level 10 Style */}
        <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm p-2">
          <div className="flex space-x-1 overflow-x-auto">
            {agendaItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              const isCompleted = completedSections.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => handleSectionChange(item.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap relative
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' 
                      : isCompleted
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'text-slate-600 hover:bg-slate-100'
                    }
                  `}
                >
                  {isCompleted && !isActive ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span>{item.label}</span>
                  {item.duration && (
                    <span className={`text-xs ${isActive ? 'text-white/80' : isCompleted ? 'text-green-600' : 'text-slate-400'}`}>
                      {item.duration}m
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50">
          {renderContent()}
          
          {/* Section Navigation Footer */}
          <div className="p-6 border-t border-white/20 bg-gradient-to-r from-white/60 to-white/40 backdrop-blur-sm rounded-b-2xl">
            <div className="flex items-center justify-between">
              {/* Previous Button */}
              <div>
                {getPreviousSection() && (
                  <Button
                    variant="outline"
                    onClick={() => handleSectionChange(getPreviousSection().id)}
                    className="flex items-center gap-2 border-white/30 bg-white/60 hover:bg-white/80 transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {getPreviousSection().label}
                  </Button>
                )}
              </div>
              
              {/* Center: Mark Complete */}
              <Button
                onClick={() => handleSectionComplete(activeSection)}
                variant={completedSections.has(activeSection) ? "outline" : "default"}
                className={`flex items-center gap-2 ${
                  completedSections.has(activeSection) 
                    ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' 
                    : ''
                }`}
                style={!completedSections.has(activeSection) ? {
                  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                } : {}}
              >
                {completedSections.has(activeSection) ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Section Completed
                  </>
                ) : (
                  'Mark Section Complete'
                )}
              </Button>
              
              {/* Next Button */}
              <div>
                {getNextSection() && (
                  <Button
                    onClick={() => handleSectionChange(getNextSection().id)}
                    className="flex items-center gap-2 text-white transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                    }}
                  >
                    {getNextSection().label}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Priority Dialog */}
        <PriorityDialog
          open={showPriorityDialog}
          onOpenChange={setShowPriorityDialog}
          priority={selectedPriority}
          teamMembers={teamMembers}
          onUpdate={async (priorityId, updatedData) => {
            const orgId = user?.organizationId || user?.organization_id;
            const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
            
            // Update the priority in the backend
            await quarterlyPrioritiesService.updatePriority(orgId, effectiveTeamId, priorityId, updatedData);
            
            // Refresh the priorities data
            await fetchPrioritiesData();
            setShowPriorityDialog(false);
          }}
          onArchive={async (priorityId) => {
            const orgId = user?.organizationId || user?.organization_id;
            const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
            await quarterlyPrioritiesService.archivePriority(orgId, effectiveTeamId, priorityId);
            await fetchPrioritiesData();
            setShowPriorityDialog(false);
          }}
          onDelete={async (priorityId) => {
            const orgId = user?.organizationId || user?.organization_id;
            const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
            await quarterlyPrioritiesService.deletePriority(orgId, effectiveTeamId, priorityId);
            await fetchPrioritiesData();
            setShowPriorityDialog(false);
          }}
          onAddMilestone={async (priorityId, milestone) => {
            const orgId = user?.organizationId || user?.organization_id;
            const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
            await quarterlyPrioritiesService.createMilestone(orgId, effectiveTeamId, priorityId, milestone);
            await fetchPrioritiesData();
          }}
          onEditMilestone={async (priorityId, milestoneId, milestone) => {
            const orgId = user?.organizationId || user?.organization_id;
            const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
            await quarterlyPrioritiesService.updateMilestone(orgId, effectiveTeamId, priorityId, milestoneId, milestone);
            await fetchPrioritiesData();
          }}
          onDeleteMilestone={async (priorityId, milestoneId) => {
            const orgId = user?.organizationId || user?.organization_id;
            const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
            await quarterlyPrioritiesService.deleteMilestone(orgId, effectiveTeamId, priorityId, milestoneId);
            await fetchPrioritiesData();
          }}
          onToggleMilestone={async (priorityId, milestoneId, completed) => {
            // Optimistically update the selectedPriority for immediate visual feedback
            setSelectedPriority(prev => {
              if (!prev || prev.id !== priorityId) return prev;
              const updatedMilestones = prev.milestones?.map(m => 
                m.id === milestoneId ? { ...m, completed, is_complete: completed } : m
              ) || [];
              return { ...prev, milestones: updatedMilestones };
            });
            
            // Then update the backend
            const orgId = user?.organizationId || user?.organization_id;
            const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
            await quarterlyPrioritiesService.updateMilestone(orgId, effectiveTeamId, priorityId, milestoneId, { completed });
            
            // Finally refresh all data
            await fetchPrioritiesData();
          }}
          onCreateLinkedIssue={async (priorityId, issueData) => {
            await issuesService.createIssue({
              ...issueData,
              linkedPriorityId: priorityId
            });
            setSuccess('Issue created successfully');
          }}
          onAddUpdate={async (priorityId, updateText, statusChange) => {
            const orgId = user?.organizationId || user?.organization_id;
            const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
            await quarterlyPrioritiesService.addPriorityUpdate(orgId, effectiveTeamId, priorityId, updateText, statusChange);
            await fetchPrioritiesData();
          }}
          onEditUpdate={async (priorityId, updateId, updateText) => {
            const orgId = user?.organizationId || user?.organization_id;
            const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
            await quarterlyPrioritiesService.editPriorityUpdate(orgId, effectiveTeamId, priorityId, updateId, updateText);
            await fetchPrioritiesData();
          }}
          onDeleteUpdate={async (priorityId, updateId) => {
            const orgId = user?.organizationId || user?.organization_id;
            const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
            await quarterlyPrioritiesService.deletePriorityUpdate(orgId, effectiveTeamId, priorityId, updateId);
            await fetchPrioritiesData();
          }}
          onUploadAttachment={async (priorityId, file) => {
            const orgId = user?.organizationId || user?.organization_id;
            const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
            await quarterlyPrioritiesService.uploadAttachment(orgId, effectiveTeamId, priorityId, file);
            await fetchPrioritiesData();
          }}
          onDownloadAttachment={async (priorityId, attachmentId, fileName) => {
            const orgId = user?.organizationId || user?.organization_id;
            const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
            await quarterlyPrioritiesService.downloadAttachment(orgId, effectiveTeamId, priorityId, attachmentId, fileName);
          }}
          onDeleteAttachment={async (priorityId, attachmentId) => {
            const orgId = user?.organizationId || user?.organization_id;
            const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
            await quarterlyPrioritiesService.deleteAttachment(orgId, effectiveTeamId, priorityId, attachmentId);
            await fetchPrioritiesData();
          }}
        />

        {/* Add Priority Dialog */}
        <Dialog open={showAddPriority} onOpenChange={setShowAddPriority}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New {labels?.priority_singular || 'Priority'}</DialogTitle>
              <DialogDescription>
                Create a new quarterly Rock. Make it SMART: Specific, Measurable, Achievable, Relevant, and Time-bound.
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
                  <DatePicker placeholder="Select date" id="dueDate"
                    
                    value={priorityForm.dueDate}
                    onChange={(value) => setPriorityForm({ ...priorityForm, dueDate: value })}
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
                className="text-white"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                }}
              >
                Create {labels?.priority_singular || 'Priority'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Issue Dialog - Shared across all sections */}
        <IssueDialog
          open={showIssueDialog}
          isQuarterlyMeeting={true}
          onConvertToRock={async (issue) => {
            // Convert issue to rock/priority
            const priorityData = {
              title: issue.title,
              description: issue.description || '',
              ownerId: issue.owner_id || issue.ownerId,
              dueDate: getQuarterEndDate(), // Use end of current quarter
              isCompanyPriority: false,
              priority_type: 'individual',
              status: 'on-track'
            };
            
            try {
              await handleCreatePriority(priorityData);
              // Archive the issue after converting to rock
              if (issue.id) {
                await issuesService.archiveIssue(issue.id);
              }
              setShowIssueDialog(false);
              setEditingIssue(null);
              setSuccess(`Issue converted to ${labels?.priority_singular || 'Rock'} successfully`);
              await fetchIssuesData();
              await fetchPrioritiesData();
            } catch (error) {
              console.error('Failed to convert issue to rock:', error);
              setError(`Failed to convert to ${labels?.priority_singular || 'Rock'}`);
            }
          }}
          onClose={() => {
            setShowIssueDialog(false);
            setEditingIssue(null);
          }}
          onSave={async (issueData) => {
            try {
              const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
              
              // Log for debugging
              console.log('Saving issue with data:', issueData);
              console.log('Effective team ID:', effectiveTeamId);
              
              if (editingIssue) {
                await issuesService.updateIssue(editingIssue.id, issueData);
              } else {
                const response = await issuesService.createIssue({
                  ...issueData,
                  teamId: effectiveTeamId  // Changed from team_id to teamId
                });
                console.log('Issue created successfully:', response);
              }
              
              // Always refresh issues data after creating/updating
              await fetchIssuesData();
              
              setShowIssueDialog(false);
              setEditingIssue(null);
              setSuccess('Issue saved successfully');
            } catch (error) {
              console.error('Failed to save issue - Full error:', error);
              console.error('Error response:', error.response);
              
              // Show more detailed error message
              const errorMessage = error.response?.data?.message || error.message || 'Failed to save issue';
              setError(errorMessage);
              
              // Don't close the dialog on error so user can try again
            }
          }}
          issue={editingIssue}
          teamMembers={teamMembers || []}
          onTimelineChange={handleTimelineChange}
          onRefresh={fetchIssuesData}
        />

        {/* Todo Dialog */}
        <TodoDialog
          open={showTodoDialog}
          onOpenChange={setShowTodoDialog}
          todo={editingTodo}
          teamMembers={teamMembers || []}
          onSave={async (todoData) => {
            try {
              const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
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
              
              // Refresh todos after save using the same method as fetchTodosData
              // effectiveTeamId is already declared above
              const response = await todosService.getTodos(null, null, false, effectiveTeamId);
              // Filter to only show open todos - ensure we always have an array
              if (response && response.data && Array.isArray(response.data.todos)) {
                const openTodos = response.data.todos.filter(
                  todo => todo.status !== 'complete' && todo.status !== 'completed' && todo.status !== 'cancelled'
                );
                setTodos(openTodos);
              } else {
                console.warn('Invalid todos response structure:', response);
                setTodos([]);
              }
              
              return true;
            } catch (error) {
              console.error('Failed to save todo:', error);
              throw error;
            }
          }}
        />
        
        {/* Floating Action Buttons - Positioned to align with main content edge */}
        <div className="fixed z-40 flex flex-col gap-4" style={{
          right: 'calc((100vw - min(80rem, 100vw - 4rem)) / 2 - 11rem)',
          top: '30rem'
        }}>
          {/* Add To-Do Button */}
          <div className="relative group">
            <Button
              onClick={() => {
                setEditingTodo(null);
                setShowTodoDialog(true);
              }}
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 text-white"
              style={{
                background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
              }}
            >
              <ClipboardList className="h-6 w-6" />
            </Button>
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-100">
              Add To-Do
            </div>
          </div>
          
          {/* Add Issue Button */}
          <div className="relative group">
            <Button
              onClick={() => {
                setEditingIssue(null);
                setShowIssueDialog(true);
              }}
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 text-white"
              style={{
                background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
              }}
            >
              <AlertCircle className="h-6 w-6" />
            </Button>
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-100">
              Add Issue
            </div>
          </div>
          
          {/* Add Priority Button */}
          <div className="relative group">
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
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 text-white"
              style={{
                background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
              }}
            >
              <Target className="h-6 w-6" />
            </Button>
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-100">
              Add {labels?.priority_singular || 'Priority'}
            </div>
          </div>
        </div>
        
        {/* Meeting Collaboration Bar - rendered above nav tabs now */}
      </div>

      {/* Review Confirmation Dialog */}
      <Dialog open={reviewConfirmDialog} onOpenChange={setReviewConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Quarter Review</DialogTitle>
            <DialogDescription>
              This will process all {labels?.priorities_label?.toLowerCase() || 'priorities'} from the current quarter:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg border" style={{
              backgroundColor: hexToRgba(themeColors.primary, 0.05),
              borderColor: hexToRgba(themeColors.primary, 0.2)
            }}>
              <div className="flex items-center gap-2 font-medium" style={{ color: themeColors.primary }}>
                <CheckCircle className="h-5 w-5" />
                <span>{priorities.filter(p => p.status === 'complete').length} Completed {labels?.priorities_label || 'Priorities'}</span>
              </div>
              <p className="text-sm mt-1" style={{ color: hexToRgba(themeColors.primary, 0.8) }}>Will be archived and removed from the active list</p>
            </div>
            
            <div className="p-4 rounded-lg border" style={{
              backgroundColor: hexToRgba(themeColors.secondary, 0.05),
              borderColor: hexToRgba(themeColors.secondary, 0.2)
            }}>
              <div className="flex items-center gap-2 font-medium" style={{ color: themeColors.secondary }}>
                <AlertTriangle className="h-5 w-5" />
                <span>{priorities.filter(p => p.status !== 'complete').length} Incomplete {labels?.priorities_label || 'Priorities'}</span>
              </div>
              <p className="text-sm mt-1" style={{ color: hexToRgba(themeColors.secondary, 0.8) }}>Will be archived AND converted to issues for follow-up</p>
            </div>
            
            <p className="text-sm text-gray-600">
              All {labels?.priorities_label?.toLowerCase() || 'priorities'} will be cleared from the current quarter's list to make room for new ones.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  const orgId = user?.organizationId || user?.organization_id;
                  const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
                  
                  const completedPriorities = priorities.filter(p => p.status === 'complete');
                  const incompletePriorities = priorities.filter(p => p.status !== 'complete');
                  let issuesCreated = 0;
                  
                  // Convert incomplete priorities to issues first
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
                      console.log(`Could not create issue for priority: ${priority.title}`, error);
                    }
                  }
                  
                  // Archive ALL priorities (both complete and incomplete)
                  for (const priority of priorities) {
                    await quarterlyPrioritiesService.archivePriority(orgId, effectiveTeamId, priority.id);
                  }
                  
                  let successMessage = `${priorities.length} ${priorities.length === 1 ? 'priority' : 'priorities'} archived`;
                  if (issuesCreated > 0) {
                    successMessage += ` and ${issuesCreated} issue${issuesCreated === 1 ? '' : 's'} created`;
                  }
                  
                  setSuccess(successMessage);
                  setReviewConfirmDialog(false);
                  fetchPrioritiesData(); // Refresh the list
                } catch (error) {
                  console.error('Failed to complete quarter review:', error);
                  setError('Failed to complete quarter review');
                  setReviewConfirmDialog(false);
                }
              }}
              className="text-white shadow-md hover:shadow-lg transition-all duration-200"
              style={{
                background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
              }}
            >
              Complete Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Conclude Meeting Confirmation Dialog */}
      <Dialog open={showConcludeDialog} onOpenChange={setShowConcludeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>End Quarterly Planning Meeting?</DialogTitle>
            <DialogDescription>
              This will conclude the meeting session and save all data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg border bg-slate-50">
              <div className="space-y-2 text-sm text-slate-700">
                {sendSummaryEmail && <p>• Summary email will be sent to all team members</p>}
                {archiveCompleted && <p>• Completed To-Dos and solved Issues will be archived</p>}
                {cascadeMessage.trim() && <p>• Cascading message will be sent to selected teams</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConcludeDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={(e) => {
                setShowConcludeDialog(false);
                concludeMeeting(e);
              }}
              className="text-white shadow-md hover:shadow-lg transition-all duration-200"
              style={{
                background: `linear-gradient(135deg, ${themeColors.primary} 0%, #22c55e 50%, ${themeColors.secondary} 100%)`
              }}
            >
              <CheckSquare className="mr-2 h-4 w-4" />
              End Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Context Menu - TEMPORARILY DISABLED */}
      {/* {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-2 min-w-[180px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
            onClick={() => {
              setLinkedIssueDialog(contextMenu.priority);
              setContextMenu(null);
            }}
          >
            <AlertCircle className="h-4 w-4 text-slate-500" />
            Create Linked Issue
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
            onClick={() => {
              setLinkedHeadlineDialog(contextMenu.priority);
              setContextMenu(null);
            }}
          >
            <MessageSquare className="h-4 w-4 text-slate-500" />
            Create Linked Headline
          </button>
          <div className="border-t border-slate-100 my-1"></div>
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-red-600"
            onClick={async () => {
              try {
                await quarterlyPrioritiesService.archivePriority(
                  user?.organizationId,
                  teamId,
                  contextMenu.priority.id
                );
                await fetchPrioritiesData();
                setSuccess('Rock archived successfully');
              } catch (error) {
                console.error('Failed to archive Rock:', error);
                setError('Failed to archive Rock');
              }
              setContextMenu(null);
            }}
          >
            <Archive className="h-4 w-4" />
            Archive
          </button>
        </div>
      )} */}
      
      {/* Linked Issue Dialog - TEMPORARILY DISABLED */}
      {/* {linkedIssueDialog && (
        <Dialog open={true} onOpenChange={() => setLinkedIssueDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Linked Issue</DialogTitle>
              <DialogDescription>
                Create an issue linked to: {linkedIssueDialog.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Issue Title</label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter issue title..."
                  id="linked-issue-title"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <textarea
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter issue description..."
                  rows={3}
                  id="linked-issue-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkedIssueDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const title = document.getElementById('linked-issue-title').value;
                  const description = document.getElementById('linked-issue-description').value;
                  
                  if (title.trim()) {
                    try {
                      await issuesService.createIssue({
                        title: title,
                        description: description || `Related to Rock: ${linkedIssueDialog.title}`,
                        ownerId: linkedIssueDialog.ownerId,
                        organizationId: user?.organizationId,
                        teamId: teamId,
                        relatedRockId: linkedIssueDialog.id
                      });
                      // Issues will be refreshed when navigating to IDS section
                      setSuccess('Linked issue created successfully');
                      setLinkedIssueDialog(null);
                    } catch (error) {
                      console.error('Failed to create linked issue:', error);
                      setError('Failed to create linked issue');
                    }
                  }
                }}
              >
                Create Issue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )} */}
      
      {/* Linked Headline Dialog - TEMPORARILY DISABLED */}
      {/* {linkedHeadlineDialog && (
        <Dialog open={true} onOpenChange={() => setLinkedHeadlineDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Linked Headline</DialogTitle>
              <DialogDescription>
                Create a headline linked to: {linkedHeadlineDialog.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Headline Message</label>
                <textarea
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter headline message..."
                  rows={4}
                  id="linked-headline-message"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkedHeadlineDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const message = document.getElementById('linked-headline-message').value;
                  
                  if (message.trim()) {
                    try {
                      // Create a cascading message/headline
                      await cascadingMessagesService.createMessage({
                        message: message,
                        fromRockId: linkedHeadlineDialog.id,
                        fromRockTitle: linkedHeadlineDialog.title,
                        teamId: teamId,
                        organizationId: user?.organizationId
                      });
                      setSuccess('Headline created successfully');
                      setLinkedHeadlineDialog(null);
                    } catch (error) {
                      console.error('Failed to create headline:', error);
                      setError('Failed to create headline');
                    }
                  }
                }}
              >
                Create Headline
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )} */}
      
      {/* Rock Side Panel - TEMPORARILY DISABLED */}
      {/* <RockSidePanel
        isOpen={!!sidePanelRock}
        onClose={() => setSidePanelRock(null)}
        rock={sidePanelRock}
        teamId={teamId}
        onUpdate={(updatedRock) => {
          // Update the rock in the priorities list
          setPriorities(prev => prev.map(p => 
            p.id === updatedRock.id ? updatedRock : p
          ));
        }}
        themeColors={themeColors}
      /> */}

      {/* Floating Timer */}
      {meetingStarted && showFloatingTimer && (
        <FloatingTimer
          elapsed={elapsedTime}
          sectionElapsed={sectionElapsedTime}
          isPaused={isPaused}
          section={activeSection}
          sectionConfig={sectionConfig}
          meetingPace={meetingPace}
          isLeader={isLeader}
          onPauseResume={handlePauseResume}
          onClose={() => setShowFloatingTimer(false)}
          onSectionClick={(sectionId) => {
            handleSectionChange(sectionId);
            // Scroll to the section
            document.getElementById(`section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      )}
    </div>
  );
};

export default QuarterlyPlanningMeetingPage;