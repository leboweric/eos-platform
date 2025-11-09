import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { format, addDays } from 'date-fns';
import { formatDateSafe } from '../utils/dateUtils';
import { meetingsService } from '../services/meetingsService';
import meetingHistoryService from '../services/meetingHistoryService';
import { organizationService } from '../services/organizationService';
import MeetingBar from '../components/meeting/MeetingBar';
import useMeeting from '../hooks/useMeeting';
import { useTokenRefresh } from '../hooks/useTokenRefresh';
import { MeetingAIRecordingControls } from '../components/MeetingAIRecordingControls';
import { MeetingAISummaryPanel } from '../components/MeetingAISummaryPanel';
import { getOrgTheme, saveOrgTheme, hexToRgba } from '../utils/themeUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Sparkles,
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
  Paperclip,
  Edit3,
  Building2,
  Users,
  User,
  Calendar,
  ClipboardList,
  Check,
  Edit,
  X,
  ThumbsUp,
  GripVertical,
  TrendingUp,
  Share2,
  Mail,
  Pause,
  Play,
  Video,
  FileText,
  GitBranch,
  BarChart3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import meetingSessionsService from '../services/meetingSessionsService';
import ScorecardTableClean from '../components/scorecard/ScorecardTableClean';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import PriorityDialog from '../components/priorities/PriorityDialog';
// import { MovePriorityDialog } from '../components/priorities/MovePriorityDialog';
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
import HeadlineItem from '../components/headlines/HeadlineItem';
import HeadlineDialog from '../components/headlines/HeadlineDialog';
import CascadingMessageDialog from '../components/cascadingMessages/CascadingMessageDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import RockContextMenu from '../components/priorities/RockContextMenu';
import { TodoContextMenu } from '../components/TodoContextMenu';
import { IssueContextMenu } from '../components/IssueContextMenu';
import { useSelectedTodos } from '../contexts/SelectedTodosContext';
import { cascadingMessagesService } from '../services/cascadingMessagesService';
import { teamsService } from '../services/teamsService';
import { useTerminology } from '../contexts/TerminologyContext';
import { getEffectiveTeamId } from '../utils/teamUtils';
import { groupRocksByPreference, getSectionHeader } from '../utils/rockGroupingUtils';
import FloatingTimer from '../components/meetings/FloatingTimer';
import { parseDateLocal } from '../utils/dateUtils';

// Helper function to parse date string as local date
const parseDateAsLocal = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(num => parseInt(num));
  return new Date(year, month - 1, day, 12, 0, 0);
};

// Helper function to determine if a To-Do is overdue
const isOverdue = (todo) => {
  const dueDate = parseDateAsLocal(todo.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate && dueDate < today && todo.status !== 'complete' && todo.status !== 'completed';
};

const WeeklyAccountabilityMeetingPage = () => {
  console.log('🔥🔥🔥 MEETING PAGE COMPONENT LOADED - DEPLOYMENT TEST 123 🔥🔥🔥');
  const { user, currentOrganization } = useAuthStore();
  const { teamId } = useParams();
  const navigate = useNavigate();
  
  // Enable background token refresh during meetings to prevent session expiration
  useTokenRefresh(true, 10); // Refresh every 10 minutes during meetings
  
  // Team validation - redirect to meetings page if no valid team selected
  useEffect(() => {
    if (!teamId || teamId === 'null' || teamId === 'undefined') {
      console.error('⚠️ No team ID provided - redirecting to meetings page to select team');
      // Redirect to meetings page to select a team
      navigate('/meetings');
      return;
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamId)) {
      console.error('⚠️ Invalid team ID format - redirecting to meetings page');
      navigate('/meetings');
      return;
    }
  }, [teamId, navigate]);

  // Cleanup sidebar state when leaving meeting
  useEffect(() => {
    return () => {
      console.log('🚪 Leaving L10 meeting - ensuring sidebar will be visible on next page');
      sessionStorage.removeItem('hideSidebarTemp');
      
      // Also ensure full screen mode is disabled
      const isFullScreen = sessionStorage.getItem('fullScreenMode') === 'true';
      if (isFullScreen) {
        sessionStorage.removeItem('fullScreenMode');
      }
    };
  }, []);
  
  // DEBUG: Log the raw teamId from URL params
  console.log('🐛 [WeeklyAccountabilityMeeting] Raw teamId from useParams:', teamId);
  console.log('🐛 [WeeklyAccountabilityMeeting] teamId length:', teamId?.length);
  console.log('🐛 [WeeklyAccountabilityMeeting] teamId type:', typeof teamId);
  
  // Fetch current team information on mount
  useEffect(() => {
    const fetchCurrentTeam = async () => {
      if (!teamId || teamId === 'null' || teamId === 'undefined') return;
      
      try {
        // First check if team info is in user.teams
        if (user?.teams && user.teams.length > 0) {
          const team = user.teams.find(t => t.id === teamId);
          if (team) {
            setCurrentTeam(team);
            return;
          }
        }
        
        // If not found, fetch from API
        const response = await teamsService.getTeam(teamId);
        if (response?.data) {
          setCurrentTeam(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch team information:', error);
      }
    };
    
    fetchCurrentTeam();
  }, [teamId, user]);
  
  const { 
    meetingCode,
    participants, 
    joinMeeting,
    leaveMeeting, 
    isConnected, 
    isLeader, 
    currentLeader,
    isFollowing,
    toggleFollow,
    navigateToSection, 
    broadcastVote, 
    broadcastIssueUpdate,
    broadcastTodoUpdate,
    broadcastIssueListUpdate,
    broadcastRating,
    syncTimer,
    updateNotes,
    claimPresenter,
    activeMeetings,
    concludeMeeting
  } = useMeeting();
  
  // Debug logging for participants
  useEffect(() => {
    console.log('📊 Participants updated:', participants);
    console.log('📊 Number of participants:', participants.length);
    console.log('📊 Is Leader:', isLeader);
    console.log('📊 Current Leader:', currentLeader);
  }, [participants, isLeader, currentLeader]);
  
  // Listen for timer pause/resume events from other participants
  useEffect(() => {
    const handleBroadcast = (event) => {
      if (event.detail) {
        const { action, pausedBy, resumedBy, timestamp } = event.detail;
        
        if (action === 'timer-paused' && !isLeader) {
          setIsPaused(true);
          setSuccess(`Meeting paused by ${pausedBy}`);
        } else if (action === 'timer-resumed' && !isLeader) {
          setIsPaused(false);
          setSuccess(`Meeting resumed by ${resumedBy}`);
        }
      }
    };
    
    // Listen for broadcast events
    window.addEventListener('meeting-broadcast', handleBroadcast);
    
    return () => {
      window.removeEventListener('meeting-broadcast', handleBroadcast);
    };
  }, [isLeader]);
  const { labels } = useTerminology();
  
  // Default methodology - can be made configurable later when organization methodology is implemented
  const methodology = 'eos';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('good-news');
  const [completedSections, setCompletedSections] = useState(new Set()); // Track completed sections
  const [success, setSuccess] = useState(null);
  
  // AI Meeting Assistant state
  const [showAISummary, setShowAISummary] = useState(false);
  const [transcriptionCompleted, setTranscriptionCompleted] = useState(false);
  
  // Meeting data
  const [scorecardMetrics, setScorecardMetrics] = useState([]);
  const [weeklyScores, setWeeklyScores] = useState({});
  const [weeklyNotes, setWeeklyNotes] = useState({});
  const [monthlyScores, setMonthlyScores] = useState({});
  const [monthlyNotes, setMonthlyNotes] = useState({});
  const [priorities, setPriorities] = useState([]);
  const [quarterlyPriorities, setQuarterlyPriorities] = useState([]);
  const [completedPrioritiesCount, setCompletedPrioritiesCount] = useState(0);
  const [shortTermIssues, setShortTermIssues] = useState([]);
  const [longTermIssues, setLongTermIssues] = useState([]);
  const [issueTimeline, setIssueTimeline] = useState('short_term');
  const [selectedIssueIds, setSelectedIssueIds] = useState([]);
  const [moveIssueDialogOpen, setMoveIssueDialogOpen] = useState(false);
  const [issueToMove, setIssueToMove] = useState(null);
  // const [movePriorityDialogOpen, setMovePriorityDialogOpen] = useState(false);
  // const [priorityToMove, setPriorityToMove] = useState(null);
  const [todos, setTodos] = useState([]);
  const { selectedTodoIds } = useSelectedTodos();
  const [teamMembers, setTeamMembers] = useState([]);
  
  // Drag and drop state for issues
  const [draggedIssue, setDraggedIssue] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [todaysTodos, setTodaysTodos] = useState([]);
  const [goodNews, setGoodNews] = useState([]);
  const [headlines, setHeadlines] = useState({ customer: [], employee: [] });
  const [goodNewsHeadlines, setGoodNewsHeadlines] = useState([]);
  const [stuckHeadlines, setStuckHeadlines] = useState([]);
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
  const [sendSummaryEmail, setSendSummaryEmail] = useState(true); // Default to sending email
  const [archiveCompleted, setArchiveCompleted] = useState(true); // Default to archiving
  const [chartModal, setChartModal] = useState({ isOpen: false, metric: null, metricId: null });
  const [showHeadlineDialog, setShowHeadlineDialog] = useState(false);
  const [editingHeadline, setEditingHeadline] = useState(null);
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [creatingIssueFromHeadline, setCreatingIssueFromHeadline] = useState(null);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveData, setArchiveData] = useState({ 
    priorityId: null, 
    priorityTitle: null, 
    isBulk: false, 
    count: 0 
  });
  const [showConcludeDialog, setShowConcludeDialog] = useState(false);
  
  // AI Recording state
  const [aiRecordingState, setAiRecordingState] = useState({
    isRecording: false,
    transcriptId: null,
    recordingTime: 0,
    transcriptionStatus: 'not_started'
  });
  
  // Confirmation dialog states
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: 'delete',
    title: '',
    message: '',
    onConfirm: null,
    loading: false
  });
  
  // Additional state for new priorities display pattern
  const [expandedPriorities, setExpandedPriorities] = useState({});
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null);
  const [addingMilestoneFor, setAddingMilestoneFor] = useState(null);
  const [newMilestone, setNewMilestone] = useState({ title: '', dueDate: '' });
  const [showAddPriority, setShowAddPriority] = useState(false);
  const [todoSortBy, setTodoSortBy] = useState('assignee'); // For Conclude section todo sorting - default to assignee/owner
  
  // Helper function to show confirmation dialogs
  const showConfirmation = (type, title, message, onConfirm) => {
    setConfirmDialog({
      open: true,
      type,
      title,
      message,
      onConfirm,
      loading: false
    });
  };
  
  // Toggle expansion for a priority
  const togglePriorityExpansion = (priorityId, e) => {
    e.stopPropagation();
    const newExpandedState = !expandedPriorities[priorityId];
    setExpandedPriorities(prev => ({
      ...prev,
      [priorityId]: newExpandedState
    }));
    
    // Broadcast expansion state to other meeting participants
    console.log('📂 Toggle Rock expansion:', { priorityId, expanded: newExpandedState, meetingCode, hasBroadcast: !!broadcastIssueListUpdate });
    if (meetingCode && broadcastIssueListUpdate) {
      console.log('📡 Broadcasting Rock expansion:', { priorityId, expanded: newExpandedState });
      broadcastIssueListUpdate({
        action: 'priority-expanded',
        priorityId: priorityId,
        expanded: newExpandedState
      });
    } else {
      console.warn('⚠️ Rock expansion broadcast skipped - meetingCode:', meetingCode, 'broadcastIssueListUpdate:', !!broadcastIssueListUpdate);
    }
  };

  // Toggle expansion for individual person sections  
  const toggleIndividualPriorities = (ownerId) => {
    setExpandedSections(prev => ({
      ...prev,
      individualPriorities: {
        ...prev.individualPriorities,
        [ownerId]: !prev.individualPriorities[ownerId]
      }
    }));
  };

  // Toggle expansion for todo assignee sections
  const toggleTodoAssignees = (assigneeId) => {
    setExpandedSections(prev => ({
      ...prev,
      todoAssignees: {
        ...prev.todoAssignees,
        [assigneeId]: !prev.todoAssignees[assigneeId]
      }
    }));
  };
  
  // Function to create issue directly from headline
  const createIssueFromHeadline = async (headline, type) => {
    try {
      setCreatingIssueFromHeadline(headline.id);
      
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      const orgId = user?.organizationId || user?.organization_id;
      
      const issueData = {
        title: `Issue from Headline: ${headline.text.substring(0, 100)}`,
        description: `This issue was created from a ${type.toLowerCase()} headline reported in the Weekly Meeting:\n\n**Headline:** ${headline.text}\n**Type:** ${type}\n**Reported by:** ${headline.created_by_name || headline.createdBy || 'Unknown'}\n**Date:** ${formatDateSafe(headline.created_at, 'MMM d, yyyy')}\n\n**Next steps:**\n- [ ] Investigate root cause\n- [ ] Determine action plan\n- [ ] Assign owner`,
        timeline: 'short_term',
        priority_level: 'normal',
        organization_id: orgId,
        department_id: effectiveTeamId,
        related_headline_id: headline.id
      };
      
      await issuesService.createIssue({ ...issueData, meeting_id: sessionId });
      
      // Update the headline to show it has an issue
      setHeadlines(prev => ({
        customer: prev.customer.map(h => 
          h.id === headline.id ? { ...h, has_related_issue: true } : h
        ),
        employee: prev.employee.map(h => 
          h.id === headline.id ? { ...h, has_related_issue: true } : h
        )
      }));
      
      // Refresh issues
      await fetchIssuesData();
      
      // Show success message
      setSuccess('Issue created successfully');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Failed to create issue from headline:', error);
      setError('Failed to create issue from headline');
      setTimeout(() => setError(null), 3000);
    } finally {
      setCreatingIssueFromHeadline(null);
    }
  };
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    companyPriorities: false,
    individualPriorities: {}, // Will be populated with owners on load
    todoAssignees: {} // Will be populated with assignees on load
  });
  
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenStatusDropdown(null);
    if (openStatusDropdown) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openStatusDropdown]);

  // Priority update handlers
  async function handleUpdatePriority(priorityId, updates) {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      
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

  const handleUpdateMilestone = async (priorityId, milestoneId, completed) => {
    try {
      const orgId = user?.organizationId;
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      
      if (!orgId || !effectiveTeamId) {
        throw new Error('Organization or department not found');
      }
      
      // First update the milestone
      await quarterlyPrioritiesService.updateMilestone(orgId, effectiveTeamId, priorityId, milestoneId, { completed });
      
      // Update local state and recalculate progress
      const updatePriorityWithProgress = (p) => {
        if (p.id !== priorityId) return p;
        
        const updatedMilestones = p.milestones?.map(m => 
          m.id === milestoneId ? { ...m, completed } : m
        ) || [];
        
        // Calculate new progress based on completed milestones
        const completedCount = updatedMilestones.filter(m => m.completed).length;
        const totalCount = updatedMilestones.length;
        const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        
        // Auto-update status based on milestone completion
        let newStatus = p.status;
        if (totalCount > 0) {
          // Only set to complete if ALL milestones are actually checked (not just 100% progress)
          if (completedCount === totalCount && totalCount > 0) {
            // All milestones complete - mark as complete
            newStatus = 'complete';
          } else if (newStatus === 'complete' && completedCount < totalCount) {
            // Was complete but unchecked a milestone - revert to on-track
            newStatus = 'on-track';
          }
        }
        
        console.log('Milestone Progress Calculation:', {
          priorityId,
          completedCount,
          totalCount,
          newProgress,
          newStatus,
          previousStatus: p.status,
          milestones: updatedMilestones.map(m => ({ id: m.id, title: m.title, completed: m.completed }))
        });
        
        return { 
          ...p, 
          milestones: updatedMilestones,
          progress: newProgress,
          status: newStatus
        };
      };
      
      setPriorities(prev => prev.map(updatePriorityWithProgress));
      
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
      console.error('Failed to update milestone:', error);
    }
  };

  const handleToggleMilestone = async (priorityId, milestoneId, completed) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      
      await quarterlyPrioritiesService.updateMilestone(orgId, effectiveTeamId, priorityId, milestoneId, { completed });
      
      // Update local state
      setPriorities(prev => prev.map(p => 
        p.id === priorityId 
          ? {
              ...p,
              milestones: p.milestones?.map(m => 
                m.id === milestoneId ? { ...m, completed } : m
              ) || []
            }
          : p
      ));
      
      // Update selected priority if it's the one being viewed
      if (selectedPriority?.id === priorityId) {
        setSelectedPriority(prev => ({
          ...prev,
          milestones: prev.milestones?.map(m => 
            m.id === milestoneId ? { ...m, completed } : m
          ) || []
        }));
      }

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
  };

  async function handleAddMilestone(priorityId) {
    if (!newMilestone.title.trim()) {
      toast.error('Please enter a milestone description');
      return;
    }
    
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      
      console.log('🔧 [Milestone] Creating milestone with params:', {
        orgId,
        teamId: cleanTeamId,
        effectiveTeamId,
        priorityId,
        title: newMilestone.title,
        dueDate: newMilestone.dueDate
      });
      
      if (!orgId || !effectiveTeamId) {
        throw new Error('Missing organization ID or team ID');
      }
      
      const milestone = await quarterlyPrioritiesService.createMilestone(orgId, effectiveTeamId, priorityId, {
        title: newMilestone.title,
        dueDate: newMilestone.dueDate || format(addDays(new Date(), 30), 'yyyy-MM-dd')
      });
      
      console.log('✅ [Milestone] Created milestone:', milestone);
      
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
      
      // Success feedback
      toast.success('Milestone added successfully');
      
      // Broadcast update to meeting participants
      if (broadcastIssueListUpdate) {
        broadcastIssueListUpdate({
          action: 'milestone-added',
          priorityId,
          milestone
        });
      }
    } catch (error) {
      console.error('❌ [Milestone] Failed to add milestone:', error);
      toast.error(`Failed to add milestone: ${error.message}`);
    }
  }

  const [isRTL, setIsRTL] = useState(() => {
    // Load RTL preference from localStorage, default to true (Right-to-Left)
    const saved = localStorage.getItem('scorecardRTL');
    return saved === null ? true : saved === 'true';
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
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [participantRatings, setParticipantRatings] = useState([]); // Store ratings by participant
  const [ratingAverage, setRatingAverage] = useState(0);
  const [showSendSummaryTimeout, setShowSendSummaryTimeout] = useState(false);
  const [ratingTimeoutTimer, setRatingTimeoutTimer] = useState(null);
  const [cascadingMessage, setCascadingMessage] = useState('');
  
  // Pause/Resume state
  const [sessionId, setSessionId] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  
  // Section timing state (Phase 2)
  const [sectionTimings, setSectionTimings] = useState({});
  const [currentSectionStartTime, setCurrentSectionStartTime] = useState(null);
  const [sectionElapsedTime, setSectionElapsedTime] = useState(0);
  const [sectionCumulativeTimes, setSectionCumulativeTimes] = useState({}); // Track cumulative time per section
  const [meetingPace, setMeetingPace] = useState('on-track');
  const [showFloatingTimer, setShowFloatingTimer] = useState(false); // Hidden by default - MeetingBar has timer
  const [sectionConfig, setSectionConfig] = useState(null);
  
  // Full-screen mode state
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Scorecard display options
  const [showScorecardAverage, setShowScorecardAverage] = useState(true);
  const [showScorecardTotal, setShowScorecardTotal] = useState(false);
  const [scorecardViewType, setScorecardViewType] = useState('weekly'); // 'weekly' or 'monthly'
  const [showScorecardThirteenWeeks, setShowScorecardThirteenWeeks] = useState(false);

  // Reference dialogs
  const [showBusinessBlueprint, setShowBusinessBlueprint] = useState(false);
  const [showOrgChart, setShowOrgChart] = useState(false);
  
  // Theme state
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  const [scorecardTimePeriodPreference, setScorecardTimePeriodPreference] = useState('13_week_rolling');
  const [rockDisplayPreference, setRockDisplayPreference] = useState('grouped_by_owner');

  // Debug scorecard preference changes
  useEffect(() => {
    console.log('🔍 WeeklyMeeting - Scorecard preference state changed:', scorecardTimePeriodPreference);
  }, [scorecardTimePeriodPreference]);

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
        { id: 'good-news', label: 'Segue (Good News)', name: 'Segue', icon: Smile, duration: 5, description: 'Good news and wins from the past week' },
        { id: 'scorecard', label: 'Scorecard Review', name: 'Scorecard', icon: BarChart, duration: 5, description: 'Review weekly metrics and KPIs' },
        { id: 'priorities', label: 'Rock Review', name: 'Rock Review', icon: Target, duration: 5, description: 'Check progress on quarterly priorities' },
        { id: 'headlines', label: 'Headlines', name: 'Headlines', icon: Newspaper, duration: 5, description: 'Share customer and employee headlines' },
        { id: 'todo-list', label: 'To-Do List', name: 'To-Do Review', icon: ListTodo, duration: 5, description: 'Review last week\'s action items' },
        { id: 'issues', label: 'IDS', name: 'IDS', icon: AlertTriangle, duration: 30, description: 'Identify, Discuss, and Solve issues' },
        { id: 'conclude', label: 'Conclude', name: 'Conclude', icon: CheckSquare, duration: 5, description: 'Rate the meeting and cascade messages' }
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
        { id: 'good-news', label: 'Good News', name: 'Good News', icon: Smile, duration: 5, description: 'Share positive updates and wins' },
        { id: 'scorecard', label: labels.scorecard_label || 'Scorecard', name: labels.scorecard_label || 'Scorecard', icon: BarChart, duration: 5, description: 'Review performance metrics' },
        { id: 'priorities', label: labels.priorities_label || 'Priorities', name: labels.priorities_label || 'Priorities', icon: Target, duration: 5, description: 'Check progress on priorities' },
        { id: 'headlines', label: 'Headlines', name: 'Headlines', icon: Newspaper, duration: 5, description: 'Share important updates' },
        { id: 'todo-list', label: labels.todos_label || 'To-Do List', name: labels.todos_label || 'To-Do List', icon: ListTodo, duration: 5, description: 'Review action items' },
        { id: 'issues', label: labels.issues_label || 'Issues', name: labels.issues_label || 'Issues', icon: AlertTriangle, duration: 60, description: 'Identify and solve issues' },
        { id: 'conclude', label: 'Conclude', name: 'Conclude', icon: CheckSquare, duration: 5, description: 'Wrap up and cascade messages' }
      ];
    }
  };
  
  const agendaItems = getAgendaItems();
  
  // Helper function to auto-start the first section after session creation
  const autoStartFirstSection = async (sessionId, orgId, effectiveTeamId, logContext = '') => {
    const firstSection = agendaItems[0];
    if (firstSection && sessionId) {
      try {
        console.log(`🎬 Auto-starting first section '${firstSection.id}' ${logContext}`);
        await meetingSessionsService.startSection(orgId, effectiveTeamId, sessionId, firstSection.id);
        console.log(`✅ First section '${firstSection.id}' auto-started successfully ${logContext}`);
      } catch (error) {
        console.warn(`⚠️ Failed to auto-start first section '${firstSection.id}' ${logContext}:`, error);
        // Don't throw - this is a non-critical enhancement
      }
    }
  };
  
  // Get framework-specific meeting description
  const getMeetingDescription = () => {
    const isEOS = labels.priorities_label === 'Rocks';
    const isOKR = labels.priorities_label === 'Objectives';
    const isScalingUp = labels.business_blueprint_label === 'One-Page Strategic Plan';
    const is4DX = labels.priorities_label?.includes('WIG');
    
    if (isEOS) {
      return '60 minutes - Express format for department teams';
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

  // Data fetching functions
  const fetchTodosData = useCallback(async () => {
    console.log('🔥 FETCHING TODOS - teamId:', teamId);
    try {
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      
      const response = await todosService.getTodos(
        null, // status filter
        null, // assignee filter
        true, // include completed - show all todos
        effectiveTeamId // department filter
      );
      
      console.log('📋 TODOS RESPONSE:', response);
      const fetchedTodos = response.data?.todos || [];
      console.log('✅ SETTING TODOS:', fetchedTodos.length, 'todos');
      setTodos(fetchedTodos);

      // Auto-expand all todo assignee sections with consistent ID logic
      const expandedAssignees = {};
      fetchedTodos.forEach(todo => {
        if (todo.assignees && todo.assignees.length > 0) {
          todo.assignees.forEach(assignee => {
            const assigneeId = assignee.user_id || assignee.id;
            if (assigneeId) {
              expandedAssignees[assigneeId] = true;
            }
          });
        } else {
          // Handle single assignee todos (backward compatibility)
          const assigneeId = todo.assigned_to?.id || 'unassigned';
          if (assigneeId) {
            expandedAssignees[assigneeId] = true;
          }
        }
      });
      
      setExpandedSections(prev => ({
        ...prev,
        todoAssignees: expandedAssignees
      }));
    } catch (error) {
      console.error('❌ Failed to fetch todos:', error);
      // Ensure empty state if fetch fails - prevents stale data
      setTodos([]);
    }
  }, [teamId, user]);

  const fetchIssuesData = useCallback(async () => {
    console.log('🔥 FETCHING ISSUES - teamId:', teamId);
    try {
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      
      // Fetch both short-term and long-term issues (active issues only, not archived)
      const [shortTermResponse, longTermResponse] = await Promise.all([
        issuesService.getIssues('short_term', false, effectiveTeamId),
        issuesService.getIssues('long_term', false, effectiveTeamId)
      ]);
      
      console.log('📋 ISSUES RESPONSE:', shortTermResponse, longTermResponse);
      const shortTermList = shortTermResponse.data?.issues || [];
      const longTermList = longTermResponse.data?.issues || [];
      console.log('✅ SETTING ISSUES:', shortTermList.length, 'short-term,', longTermList.length, 'long-term');
      
      setShortTermIssues(shortTermList);
      setLongTermIssues(longTermList);
      setTeamMembers(shortTermResponse.data?.teamMembers || []);
    } catch (error) {
      console.error('❌ Failed to fetch issues:', error);
      // Ensure empty state if fetch fails - prevents stale data
      setShortTermIssues([]);
      setLongTermIssues([]);
      setTeamMembers([]);
    }
  }, [teamId, user]);

  const fetchHeadlines = async () => {
    try {
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      
      const response = await headlinesService.getHeadlines(effectiveTeamId, false); // false = don't include archived
      
      // Access the data array from the response
      const headlinesData = response.data || response || [];
      
      // Organize headlines by type
      const customerHeadlines = Array.isArray(headlinesData) 
        ? headlinesData.filter(h => h.type === 'customer')
        : headlinesData.customerHeadlines || [];
      const employeeHeadlines = Array.isArray(headlinesData)
        ? headlinesData.filter(h => h.type === 'employee')
        : headlinesData.employeeHeadlines || [];
      
      setHeadlines({
        customer: customerHeadlines,
        employee: employeeHeadlines
      });
    } catch (error) {
      console.error('Failed to fetch headlines:', error);
      // Ensure empty state if fetch fails - prevents stale data
      setGoodNewsHeadlines([]);
      setStuckHeadlines([]);
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('🚨 ABOUT TO CALL fetchPrioritiesData in loadInitialData');
      await Promise.all([
        fetchScorecardData(),
        fetchPrioritiesData(),
        fetchIssuesData(),
        fetchTodosData(),
        fetchHeadlines(),
        fetchCascadedMessages()
      ]);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError('Failed to load meeting data');
    } finally {
      setLoading(false);
    }
  };

  const fetchScorecardData = useCallback(async () => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      // Handle "null" string from URL params
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      const departmentId = effectiveTeamId;
      
      console.log('🔍 WeeklyMeeting - Team ID debugging:', { 
        rawTeamIdFromURL: teamId,
        cleanTeamId,
        effectiveTeamId,
        userTeams: user?.teams,
        currentTeamFromState: currentTeam,
        teamFromEffectiveId: user?.teams?.find(t => t.id === effectiveTeamId)
      });
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
        // Store all metrics (will filter by type in render based on scorecardViewType)
        const allMetrics = response.data.metrics || [];
        console.log('All metrics found:', allMetrics.length, allMetrics);
        setScorecardMetrics(allMetrics);
        setWeeklyScores(response.data.weeklyScores || {});
        setMonthlyScores(response.data.monthlyScores || {});
        setWeeklyNotes(response.data.weeklyNotes || {});
        setMonthlyNotes(response.data.monthlyNotes || {});
      } else if (response) {
        // Store all metrics (will filter by type in render based on scorecardViewType)
        const allMetrics = response.metrics || [];
        console.log('All metrics found (no data wrapper):', allMetrics.length, allMetrics);
        setScorecardMetrics(allMetrics);
        setWeeklyScores(response.weeklyScores || {});
        setMonthlyScores(response.monthlyScores || {});
        setWeeklyNotes(response.weeklyNotes || {});
        setMonthlyNotes(response.monthlyNotes || {});
      }
    } catch (error) {
      console.error('Failed to fetch scorecard:', error);
      // Ensure empty state if fetch fails - prevents stale data
      setScorecardMetrics([]);
      setWeeklyScores({});
      setWeeklyNotes({});
      setMonthlyScores({});
      setMonthlyNotes({});
    }
  }, [teamId, user]);

  const fetchPrioritiesData = useCallback(async () => {
    console.log('🔥🔥🔥 FETCHPRIORITIESDATA FUNCTION START 🔥🔥🔥');
    try {
      const orgId = user?.organizationId || user?.organization_id;
      console.log('🔥 orgId:', orgId);
      console.log('🔥 teamId from URL:', teamId);
      
      // Handle "null" string from URL params
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      console.log('🔥 cleanTeamId after processing:', cleanTeamId);
      
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      console.log('🔥 effectiveTeamId from function:', effectiveTeamId);

      console.log('🔥 ABOUT TO CREATE COMPARISON OBJECT');
      
      const comparison = {
        urlTeamId: teamId,
        cleanTeamId,
        effectiveTeamId,
        areTheSame: cleanTeamId === effectiveTeamId
      };
      
      console.log('🔥 COMPARISON OBJECT CREATED:', comparison);
      console.log('🔍 Team ID comparison:', comparison);

      // Then use cleanTeamId as the fix proposes
      const response = await quarterlyPrioritiesService.getCurrentPriorities(orgId, cleanTeamId);
      
      // Extract and flatten priorities
      const companyPriorities = response.companyPriorities || [];
      const teamMemberPriorities = response.teamMemberPriorities || {};
      
      console.log('🚨 Company priorities:', companyPriorities);
      console.log('🚨 Team member priorities:', teamMemberPriorities);
      
      const allPriorities = [
        ...companyPriorities.map(p => ({ ...p, priority_type: 'company' })),
        ...Object.values(teamMemberPriorities).flatMap(memberData => 
          (memberData.priorities || []).map(p => ({ ...p, priority_type: 'individual' }))
        )
      ];
      
      console.log('🚨 All priorities being set:', allPriorities);
      console.log('🚨 First priority milestones:', allPriorities[0]?.milestones);
      
      console.log('🔥🔥🔥 ABOUT TO RENDER PRIORITIES:', allPriorities);
      setPriorities(allPriorities);
      
      // Update team members from priorities API - this ensures we get team-specific members
      if (response.teamMembers && response.teamMembers.length > 0) {
        console.log('👥 Updating team members from priorities API:', response.teamMembers.length);
        setTeamMembers(response.teamMembers);
      }
      
      // Auto-expand all individual owner sections with consistent ID logic
      const expandedOwners = {};
      allPriorities.forEach(priority => {
        const ownerId = priority.owner?.id || priority.owner_id || priority.assignee_id || 'unassigned';
        if (ownerId) {
          expandedOwners[ownerId] = true;
        }
      });
      
      setExpandedSections(prev => ({
        ...prev,
        individualPriorities: expandedOwners
      }));
    } catch (error) {
      console.error('Failed to fetch priorities:', error);
      // Ensure empty state if fetch fails - prevents stale data
      setQuarterlyPriorities([]);
    }
  }, [teamId, user]);

  // Load data on mount and when teamId changes - CLEAR STATE FIRST
  useEffect(() => {
    console.log('🚨 useEffect triggered with teamId:', teamId);
    if (teamId) {
      console.log('🚨 CLEARING ALL STATE before fetching new team data');
      
      // CLEAR ALL STATE IMMEDIATELY when teamId changes
      // This prevents stale data from previous team being displayed
      setScorecardMetrics([]);
      setWeeklyScores({});
      setWeeklyNotes({});
      setMonthlyScores({});
      setMonthlyNotes({});
      setTodos([]);
      setShortTermIssues([]);
      setLongTermIssues([]);
      setQuarterlyPriorities([]);
      setGoodNewsHeadlines([]);
      setStuckHeadlines([]);
      setTeamMembers([]);
      
      console.log('🚨 ABOUT TO CALL fetch functions with cleared state');
      
      // Then fetch new data for the team
      fetchTodosData();
      fetchIssuesData();
      fetchScorecardData();
      fetchPrioritiesData();
      fetchHeadlines();
    }
  }, [teamId]); // FIXED: Removed 'user' from dependencies to prevent infinite re-renders

  // Join meeting when page loads
  const hasJoinedRef = useRef(false);
  const hasCheckedMeetingsRef = useRef(false);
  const meetingConcludedRef = useRef(false); // Prevent auto-join after meeting ends
  
  useEffect(() => {
    console.log('🔍 Meeting auto-join check:', {
      teamId: !!teamId,
      isConnected,
      hasJoinMeeting: !!joinMeeting,
      meetingCode,
      hasJoined: hasJoinedRef.current,
      user: !!user
    });
    
    if (teamId && isConnected && joinMeeting && !meetingCode && !hasJoinedRef.current && !meetingConcludedRef.current) {
      // Include organization ID in meeting code to prevent cross-org collisions
      // CRITICAL: Must match the orgId logic used throughout the rest of the file
      const orgId = user?.organizationId || user?.organization_id;
      
      // Use consistent format with session service
      const meetingRoom = `${orgId}-${teamId}-weekly-express`;
      console.log('📝 Meeting room:', meetingRoom, 'OrgId:', orgId, 'Format:', orgId ? 'new (orgId-teamId)' : 'legacy (teamId only)');
      
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
            
            // Start the timer if joining as leader
            if (!hasParticipants && !meetingStartTime) {
              const now = Date.now();
              setMeetingStartTime(now);
              setMeetingStarted(true);
              console.log('⏱️ Starting timer as leader at:', now);
              
              // Initialize section config for the first section (Phase 2)
              const firstSection = agendaItems.find(item => item.id === 'good-news') || agendaItems[0];
              if (firstSection) {
                setSectionConfig(firstSection);
                setActiveSection(firstSection.id); // Ensure activeSection matches
                setCurrentSectionStartTime(now);
                setSectionElapsedTime(0);
                setSectionCumulativeTimes({}); // Reset cumulative times for new meeting
                setSectionTimings({
                  [firstSection.id]: {
                    started_at: new Date().toISOString(),
                    allocated: firstSection.duration * 60
                  }
                });
              }
              
              // Enter full-screen mode
              sessionStorage.setItem('hideSidebarTemp', 'true');
              setIsFullScreen(true);
              window.dispatchEvent(new Event('toggleSidebar'));
              
              // Sync timer with other participants
              if (syncTimer) {
                syncTimer({
                  startTime: now,
                  isPaused: false
                });
              }
            }
            
            // Initialize database session for ALL users (both leaders and participants)
            const orgId = user?.organizationId || user?.organization_id;
            const effectiveTeamId = getEffectiveTeamId(teamId, user, false); // Don't fallback - let backend validate
            
            // Start session immediately and await result (only if not already loading)
            if (orgId && effectiveTeamId && !sessionId && !sessionLoading) {
              console.log('🟡 Setting sessionLoading to true, starting session creation...');
              setSessionLoading(true);
              (async () => {
                try {
                  // First check if there's already an active session to avoid duplicates
                  const activeSession = await meetingSessionsService.getActiveSession(orgId, effectiveTeamId, 'weekly');
                  
                  if (activeSession) {
                    // Use the existing session
                    console.log('📊 Found existing session, setting sessionId:', activeSession.id);
                    setSessionId(activeSession.id);
                    setIsPaused(activeSession.is_paused);
                    setTotalPausedTime(activeSession.total_paused_duration || 0);
                    console.log('📊 Resuming existing meeting session:', activeSession.id);
                  } else {
                    // Create a new session
                    const result = await meetingSessionsService.startSession(orgId, effectiveTeamId, 'weekly');
                    console.log('📊 Created new session, setting sessionId:', result.session.id);
                    setSessionId(result.session.id);
                    if (result.session.is_paused) {
                      setIsPaused(true);
                      setTotalPausedTime(result.session.total_paused_duration || 0);
                    }
                    console.log('📊 New meeting session started:', result.session.id);
                    
                    // Create meeting record in database (NEW - fixes conclude 404 error)
                    try {
                      console.log('📝 Creating meeting record in database...');
                      const meetingResult = await meetingsService.createMeeting(
                        orgId, 
                        effectiveTeamId, 
                        'weekly'
                      );
                      console.log('✅ Meeting record created:', meetingResult.meeting.id);
                    } catch (meetingError) {
                      console.error('❌ Failed to create meeting record:', meetingError);
                      // Don't block the UI - meeting can still proceed with just the session
                    }
                    
                    // Auto-start the first section for new sessions
                    await autoStartFirstSection(result.session.id, orgId, effectiveTeamId, '(location 1)');
                  }
                } catch (err) {
                  console.error('Failed to start/resume meeting session:', err);
                  console.error('Session error details:', {
                    orgId,
                    effectiveTeamId,
                    user,
                    teamId
                  });
                  // Show error for permission issues, but allow meeting to continue locally for other errors
                  if (err.message && err.message.includes('permission')) {
                    setError(err.message);
                  }
                } finally {
                  console.log('🟡 Setting sessionLoading to false, session creation complete');
                  setSessionLoading(false);
                }
              })();
            } else if (!orgId || !effectiveTeamId) {
              console.warn('Cannot start session - missing required IDs:', {
                orgId,
                effectiveTeamId,
                user,
                teamId
              });
            } else if (sessionId) {
              console.log('Session already exists:', sessionId);
            } else if (sessionLoading) {
              console.log('Session is already being loaded');
            }
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
        
        // Start the timer if joining as leader
        if (!hasParticipants && !meetingStartTime) {
          const now = Date.now();
          setMeetingStartTime(now);
          setMeetingStarted(true);
          console.log('⏱️ Starting timer as leader at:', now);
          
          // Initialize section config for the first section (Phase 2)
          const firstSection = agendaItems.find(item => item.id === 'good-news') || agendaItems[0];
          if (firstSection) {
            setSectionConfig(firstSection);
            setActiveSection(firstSection.id); // Ensure activeSection matches
            setCurrentSectionStartTime(now);
            setSectionElapsedTime(0);
            setSectionCumulativeTimes({}); // Reset cumulative times for new meeting
            setSectionTimings({
              [firstSection.id]: {
                started_at: new Date().toISOString(),
                allocated: firstSection.duration * 60
              }
            });
          }
          
          // Enter full-screen mode
          sessionStorage.setItem('hideSidebarTemp', 'true');
          setIsFullScreen(true);
          window.dispatchEvent(new Event('toggleSidebar'));
          
          // Sync timer with other participants
          if (syncTimer) {
            syncTimer({
              startTime: now,
              isPaused: false
            });
          }
        }
        
        // Initialize database session for ALL users (both leaders and participants)
        const orgId = user?.organizationId || user?.organization_id;
        const effectiveTeamId = getEffectiveTeamId(teamId, user, false); // Don't fallback - let backend validate
        
        // Start session immediately and await result (only if not already loading)
        if (orgId && effectiveTeamId && !sessionId && !sessionLoading) {
          console.log('🟡 Setting sessionLoading to true (immediate path), starting session creation...');
          setSessionLoading(true);
          (async () => {
            try {
              // First check if there's already an active session to avoid duplicates
              const activeSession = await meetingSessionsService.getActiveSession(orgId, effectiveTeamId, 'weekly');
              
              if (activeSession) {
                // Use the existing session
                console.log('📊 Found existing session (immediate), setting sessionId:', activeSession.id);
                setSessionId(activeSession.id);
                setIsPaused(activeSession.is_paused);
                setTotalPausedTime(activeSession.total_paused_duration || 0);
                console.log('📊 Resuming existing meeting session:', activeSession.id);
              } else {
                // Create a new session
                const result = await meetingSessionsService.startSession(orgId, effectiveTeamId, 'weekly');
                console.log('📊 Created new session (immediate), setting sessionId:', result.session.id);
                setSessionId(result.session.id);
                if (result.session.is_paused) {
                  setIsPaused(true);
                  setTotalPausedTime(result.session.total_paused_duration || 0);
                }
                console.log('📊 New meeting session started:', result.session.id);
                
                // Create meeting record in database (NEW - fixes conclude 404 error)
                try {
                  console.log('📝 Creating meeting record in database (immediate path)...');
                  const meetingResult = await meetingsService.createMeeting(
                    orgId, 
                    effectiveTeamId, 
                    'weekly'
                  );
                  console.log('✅ Meeting record created (immediate path):', meetingResult.meeting.id);
                } catch (meetingError) {
                  console.error('❌ Failed to create meeting record (immediate path):', meetingError);
                  // Don't block the UI - meeting can still proceed with just the session
                }
                
                // Auto-start the first section for new sessions
                await autoStartFirstSection(result.session.id, orgId, effectiveTeamId, '(location 2)');
              }
            } catch (err) {
              console.error('Failed to start/resume meeting session (immediate):', err);
              console.error('Session error details:', {
                orgId,
                effectiveTeamId,
                user,
                teamId
              });
              // Show error for permission issues, but allow meeting to continue locally for other errors
              if (err.message && err.message.includes('permission')) {
                setError(err.message);
              }
            } finally {
              console.log('🟡 Setting sessionLoading to false (immediate), session creation complete');
              setSessionLoading(false);
            }
          })();
        } else if (!orgId || !effectiveTeamId) {
          console.warn('Cannot start session (immediate) - missing required IDs:', {
            orgId,
            effectiveTeamId,
            user,
            teamId
          });
        } else if (sessionId) {
          console.log('Session already exists (immediate):', sessionId);
        } else if (sessionLoading) {
          console.log('Session is already being loaded (immediate)');
        }
      }
    }
  }, [teamId, isConnected, joinMeeting, meetingCode, activeMeetings, user, meetingStartTime, syncTimer, sessionId, sessionLoading]);

  useEffect(() => {
    fetchOrganizationTheme();
    
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    const handleOrgChange = () => {
      fetchOrganizationTheme();
      // Leave current meeting when organization changes
      if (meetingCode && leaveMeeting) {
        console.log('🎬 Organization changed, leaving current meeting');
        leaveMeeting();
        hasJoinedRef.current = false;
        hasCheckedMeetingsRef.current = false;
      }
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    window.addEventListener('organizationChanged', handleOrgChange);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
      window.removeEventListener('organizationChanged', handleOrgChange);
    };
  }, [user?.organizationId, user?.organization_id, meetingCode, leaveMeeting]);

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
        due = new Date(year, month - 1, day, 12, 0, 0);
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
      console.log('🔍 WeeklyMeeting - Fetching organization data...');
      const orgData = await organizationService.getOrganization();
      
      console.log('🔍 WeeklyMeeting - Organization data received:', {
        ...orgData,
        scorecard_time_period_preference: orgData?.scorecard_time_period_preference,
        hasPreference: !!orgData?.scorecard_time_period_preference
      });
      
      if (orgData) {
        const theme = {
          primary: orgData.theme_primary_color || '#3B82F6',
          secondary: orgData.theme_secondary_color || '#1E40AF',
          accent: orgData.theme_accent_color || '#60A5FA'
        };
        setThemeColors(theme);
        saveOrgTheme(orgId, theme);
        
        // Set scorecard time period preference
        const preference = orgData.scorecard_time_period_preference || '13_week_rolling';
        console.log('🔍 WeeklyMeeting - Setting scorecard preference:', {
          fromDB: orgData.scorecard_time_period_preference,
          final: preference
        });
        setScorecardTimePeriodPreference(preference);
        
        // Set rock display preference
        setRockDisplayPreference(orgData.rock_display_preference || 'grouped_by_owner');
      } else {
        const savedTheme = getOrgTheme(orgId);
        if (savedTheme) {
          setThemeColors(savedTheme);
        }
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
      const orgId = user?.organizationId || user?.organization_id;
      const savedTheme = getOrgTheme(orgId);
      if (savedTheme) {
        setThemeColors(savedTheme);
      }
    }
  };

  useEffect(() => {
    const checkExistingSession = async () => {
      const isActive = sessionStorage.getItem('meetingActive');
      const startTime = sessionStorage.getItem('meetingStartTime');
      
      if (isActive === 'true' && startTime) {
        // Don't resume if we just concluded a meeting
        if (meetingConcludedRef.current) {
          console.log('🚫 Skipping session resume - meeting was just concluded');
          sessionStorage.removeItem('meetingActive');
          sessionStorage.removeItem('meetingStartTime');
          meetingConcludedRef.current = false; // Reset flag
          return;
        }
        
        // Check if there's an active database session
        const orgId = user?.organizationId || user?.organization_id;
        const effectiveTeamId = getEffectiveTeamId(teamId, user, false); // Don't fallback - let backend validate
        
        if (orgId && effectiveTeamId) {
          const activeSession = await meetingSessionsService.getActiveSession(orgId, effectiveTeamId, 'weekly');
          
          if (activeSession) {
            // Resume the existing session
            setSessionId(activeSession.id);
            setMeetingStarted(true);
            setMeetingStartTime(parseInt(startTime));
            
            // Initialize section config when resuming (Phase 2)
            const currentSectionId = activeSection || 'good-news';
            const currentSection = agendaItems.find(item => item.id === currentSectionId) || agendaItems[0];
            if (currentSection) {
              setSectionConfig(currentSection);
              setCurrentSectionStartTime(parseInt(startTime));
              console.log('📌 Restored section config on resume:', currentSection);
            }
            
            // Enter full-screen mode when resuming
            sessionStorage.setItem('hideSidebarTemp', 'true');
            setIsFullScreen(true);
            window.dispatchEvent(new Event('toggleSidebar'));
            setIsPaused(activeSession.is_paused);
            setTotalPausedTime(activeSession.total_paused_duration || 0);
            
            // Calculate elapsed time
            const now = Date.now();
            const elapsed = Math.floor((now - parseInt(startTime)) / 1000) - (activeSession.total_paused_duration || 0);
            setElapsedTime(elapsed);
          } else {
            // No active session, clear stale sessionStorage
            sessionStorage.removeItem('meetingActive');
            sessionStorage.removeItem('meetingStartTime');
            setMeetingStarted(false);
            setMeetingStartTime(null);
            setElapsedTime(0);
          }
        }
      }
    };
    
    checkExistingSession();
  }, [user, teamId]);

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

  // Initialize database session when meeting starts (fallback for non-collaborative meetings)
  useEffect(() => {
    console.log('📍 Session init check:', {
      meetingStarted,
      sessionId,
      sessionLoading,
      hasUser: !!user,
      hasTeamId: !!teamId
    });
    
    if (meetingStarted && !sessionId && !sessionLoading && user && teamId) {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user, false); // Don't fallback - let backend validate
      
      console.log('📍 Session init IDs:', {
        orgId,
        effectiveTeamId
      });
      
      if (orgId && effectiveTeamId) {
        console.log('🚀 Initializing session for non-collaborative meeting');
        setSessionLoading(true);
        (async () => {
          try {
            // Check for existing session first
            const activeSession = await meetingSessionsService.getActiveSession(orgId, effectiveTeamId, 'weekly');
            
            if (activeSession) {
              console.log('📊 Found existing session (fallback):', activeSession.id);
              setSessionId(activeSession.id);
              setIsPaused(activeSession.is_paused);
              setTotalPausedTime(activeSession.total_paused_duration || 0);
            } else {
              // Create new session
              const result = await meetingSessionsService.startSession(orgId, effectiveTeamId, 'weekly');
              console.log('📊 Created new session (fallback):', result.session.id);
              setSessionId(result.session.id);
              if (result.session.is_paused) {
                setIsPaused(true);
                setTotalPausedTime(result.session.total_paused_duration || 0);
              }
              
              // Create meeting record in database (NEW - fixes conclude 404 error)
              try {
                console.log('📝 Creating meeting record in database (fallback path)...');
                const meetingResult = await meetingsService.createMeeting(
                  orgId, 
                  effectiveTeamId, 
                  'weekly'
                );
                console.log('✅ Meeting record created (fallback path):', meetingResult.meeting.id);
              } catch (meetingError) {
                console.error('❌ Failed to create meeting record (fallback path):', meetingError);
                // Don't block the UI - meeting can still proceed with just the session
              }
              
              // Auto-start the first section for new sessions
              await autoStartFirstSection(result.session.id, orgId, effectiveTeamId, '(location 3)');
            }
          } catch (err) {
            console.error('Failed to initialize session (fallback):', err);
            // Show error for permission issues
            if (err.message && err.message.includes('permission')) {
              setError(err.message);
            }
          } finally {
            setSessionLoading(false);
          }
        })();
      }
    }
  }, [meetingStarted, sessionId, sessionLoading, user, teamId]);

  // IMMEDIATE session initialization - don't wait for meeting to start
  useEffect(() => {
    if (user && teamId && !sessionId && !sessionLoading) {
      // Don't resume if we just concluded a meeting
      if (meetingConcludedRef.current) {
        console.log('🚫 Skipping immediate session init - meeting was just concluded');
        meetingConcludedRef.current = false; // Reset flag
        return;
      }
      
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user, false); // Don't fallback - let backend validate
      
      if (orgId && effectiveTeamId) {
        console.log('🔥 IMMEDIATE session initialization on mount');
        setSessionLoading(true);
        (async () => {
          try {
            const activeSession = await meetingSessionsService.getActiveSession(orgId, effectiveTeamId, 'weekly');
            
            if (activeSession) {
              console.log('📊 Found existing session (immediate mount):', activeSession.id);
              setSessionId(activeSession.id);
              setIsPaused(activeSession.is_paused);
              setTotalPausedTime(activeSession.total_paused_duration || 0);
              
              // If there's an active session, the meeting was likely already started
              if (activeSession.is_active && !meetingStarted) {
                const sessionStartTime = new Date(activeSession.start_time).getTime();
                setMeetingStartTime(sessionStartTime);
                setMeetingStarted(true);
                const elapsed = activeSession.active_duration_seconds || 0;
                setElapsedTime(elapsed);
                
                // Enter full-screen mode
                sessionStorage.setItem('hideSidebarTemp', 'true');
                setIsFullScreen(true);
                window.dispatchEvent(new Event('toggleSidebar'));
              }
            } else {
              // Don't create a new session yet - wait for meeting to actually start
              console.log('📊 No active session found, will create when meeting starts');
            }
          } catch (err) {
            console.error('Failed to check for existing session:', err);
          } finally {
            setSessionLoading(false);
          }
        })();
      }
    }
  }, [user, teamId]); // Minimal dependencies to run ASAP

  // Clear success messages after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

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
  }, [meetingStarted, meetingStartTime, isPaused, totalPausedTime, currentSectionStartTime, activeSection, agendaItems, sectionCumulativeTimes]);
  
  // Auto-save timer state every 30 seconds
  useEffect(() => {
    if (!sessionId || !meetingStarted || isPaused) return;
    
    const interval = setInterval(() => {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      meetingSessionsService.saveTimerState(orgId, effectiveTeamId, sessionId, elapsedTime)
        .catch(err => console.warn('Failed to auto-save timer state:', err));
    }, 30000); // Save every 30 seconds
    
    return () => clearInterval(interval);
  }, [sessionId, meetingStarted, isPaused, elapsedTime, teamId, user]);
  
  // Cleanup on unmount - preserve session for return but clear if navigating away
  useEffect(() => {
    return () => {
      // Clear the service cache when leaving the page
      meetingSessionsService.clearCache();
      
      // Exit full-screen mode when leaving the meeting page
      sessionStorage.removeItem('hideSidebarTemp');
      setIsFullScreen(false);
      window.dispatchEvent(new Event('toggleSidebar'));
    };
  }, []);

  const fetchTodaysTodos = async () => {
    try {
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      const response = await todosService.getTodos('incomplete', null, false, effectiveTeamId);
      setTodaysTodos(response.todos || []);
    } catch (error) {
      console.error('Failed to fetch today\'s todos:', error);
    }
  };

  // Auto-start meeting timer only if leader
  useEffect(() => {
    // Only start timer if we're the leader (first to join)
    // Otherwise, timer will be synced from meeting-joined event
    if (isLeader && !meetingStartTime && user && teamId) {
      const now = Date.now();
      setMeetingStartTime(now);
      setMeetingStarted(true);
      setElapsedTime(0);
      
      // Initialize section config for the first section (Phase 2)
      const firstSection = agendaItems.find(item => item.id === 'good-news') || agendaItems[0];
      if (firstSection) {
        setSectionConfig(firstSection);
        setCurrentSectionStartTime(now);
        setSectionElapsedTime(0);
        setSectionCumulativeTimes({}); // Reset cumulative times for new meeting
        setSectionTimings({
          [firstSection.id]: {
            started_at: new Date().toISOString(),
            allocated: firstSection.duration * 60
          }
        });
      }
      
      // Enter full-screen mode when meeting starts
      sessionStorage.setItem('hideSidebarTemp', 'true');
      setIsFullScreen(true);
      // Trigger a re-render of Layout component
      window.dispatchEvent(new Event('toggleSidebar'));
      
      // Create session if needed when starting as leader
      if (!sessionId && !sessionLoading) {
        const orgId = user?.organizationId || user?.organization_id;
        const effectiveTeamId = getEffectiveTeamId(teamId, user, false); // Don't fallback - let backend validate
        
        if (orgId && effectiveTeamId) {
          console.log('🎯 Creating session for leader start');
          setSessionLoading(true);
          (async () => {
            try {
              const result = await meetingSessionsService.startSession(orgId, effectiveTeamId, 'weekly');
              console.log('📊 Session created for leader:', result.session.id);
              setSessionId(result.session.id);
              
              // Create meeting record in database (NEW - fixes conclude 404 error)
              try {
                console.log('📝 Creating meeting record in database (leader path)...');
                const meetingResult = await meetingsService.createMeeting(
                  orgId, 
                  effectiveTeamId, 
                  'weekly'
                );
                console.log('✅ Meeting record created (leader path):', meetingResult.meeting.id);
              } catch (meetingError) {
                console.error('❌ Failed to create meeting record (leader path):', meetingError);
                // Don't block the UI - meeting can still proceed with just the session
              }
              
              // Auto-start the first section for new sessions
              await autoStartFirstSection(result.session.id, orgId, effectiveTeamId, '(location 4 - leader)');
            } catch (err) {
              console.error('Failed to create session for leader:', err);
              setError(err.message || 'Failed to start meeting session');
            } finally {
              setSessionLoading(false);
            }
          })();
        }
      }
      
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
  }, [isLeader, syncTimer, user, teamId, sessionId, sessionLoading]);

  // Fetch data based on active section
  useEffect(() => {
    if (activeSection === 'conclude') {
      fetchAvailableTeams();
    } else if (activeSection === 'headlines') {
      fetchHeadlines();
      fetchCascadedMessages();
    }
  }, [activeSection]);

  const handleAddIssue = () => {
    setEditingIssue(null);
    setShowIssueDialog(true);
  };

  // Helper function for formatting goal - moved before usage
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
  
  const handleAddIssueFromMetric = async (metric, isOffTrack) => {
    try {
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      const status = isOffTrack ? 'Off Track' : 'Needs Attention';
      
      await issuesService.createIssue({
        title: `${status}: ${metric.name}`,
        description: `Metric "${metric.name}" is ${status.toLowerCase()} and requires attention.\n\nGoal: ${formatGoal(metric.goal, metric.value_type, metric.comparison_operator)}\nOwner: ${metric.ownerName || metric.owner || 'Unassigned'}\n\nData Source: ${metric.description || 'No data source specified'}`,
        timeline: 'short_term',
        priority_level: isOffTrack ? 'high' : 'normal',
        ownerId: metric.ownerId || null,
        department_id: effectiveTeamId,
        teamId: effectiveTeamId  // Add both fields to ensure compatibility
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

  const handleAddTodo = () => {
    setEditingTodo(null);
    setShowTodoDialog(true);
  };

  const handleSaveIssue = useCallback(async (issueData, options = {}) => {
    const { isAutoSave = false } = options;
    
    try {
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      let savedIssue;
      
      // Check if we're editing an existing issue (either from editingIssue state or if issueData has an id)
      const isEditing = editingIssue || issueData.id;
      const issueId = editingIssue?.id || issueData.id;
      
      if (isEditing && issueId) {
        savedIssue = await issuesService.updateIssue(issueId, {
          ...issueData,
          organization_id: user?.organizationId || user?.organization_id,
          team_id: effectiveTeamId
        });
        
        // For auto-save, optimistically update the local state without full refresh
        if (isAutoSave) {
          const updateIssueInList = (issues) => 
            issues.map(issue => 
              issue.id === issueId 
                ? { ...issue, ...savedIssue.data || savedIssue }
                : issue
            );
          
          setShortTermIssues(prev => updateIssueInList(prev));
          setLongTermIssues(prev => updateIssueInList(prev));
          
          // Don't update editingIssue - it causes dialog to re-render and flash
          // The dialog maintains its own internal state (formData)
        } else {
          setSuccess('Issue updated successfully');
        }
        
        // Broadcast issue update to other participants
        if (meetingCode && broadcastIssueListUpdate) {
          broadcastIssueListUpdate({
            action: 'update',
            issueId: issueId,
            issue: savedIssue.data || savedIssue
          });
        }
      } else {
        savedIssue = await issuesService.createIssue({
          meeting_id: sessionId,
          ...issueData,
          timeline: issueTimeline,
          department_id: effectiveTeamId
        });
        
        // For auto-save, optimistically add to local state without full refresh
        if (isAutoSave) {
          const newIssue = savedIssue.data || savedIssue;
          const timeline = newIssue.timeline || issueTimeline;
          
          if (timeline === 'short_term') {
            setShortTermIssues(prev => [newIssue, ...prev]);
          } else if (timeline === 'long_term') {
            setLongTermIssues(prev => [newIssue, ...prev]);
          }
        } else {
          setSuccess('Issue created successfully');
        }
        
        // Broadcast new issue to other participants
        if (meetingCode && broadcastIssueListUpdate) {
          broadcastIssueListUpdate({
            action: 'create',
            issue: savedIssue.data || savedIssue
          });
        }
      }
      
      // Only refresh and close dialog for manual saves
      if (!isAutoSave) {
        await fetchIssuesData();
        setShowIssueDialog(false);
        setEditingIssue(null);
      }
      
      return savedIssue; // Return the actual created/updated issue
    } catch (error) {
      console.error('Failed to save issue:', error);
      setError('Failed to save issue');
       throw error;
    }
  }, [user, teamId, editingIssue, issueTimeline, meetingCode, broadcastIssueListUpdate, setShortTermIssues, setLongTermIssues, setSuccess, setError, fetchIssuesData, setShowIssueDialog, setEditingIssue]);

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

  const handleSaveTodo = useCallback(async (todoData, options = {}) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      let savedTodo;
      if (editingTodo) {
        savedTodo = await todosService.updateTodo(editingTodo.id, {
          ...todoData,
          department_id: effectiveTeamId
        });
        // Only show success message for manual saves, not auto-saves
        if (!options.isAutoSave) {
          setSuccess('To-do updated successfully');
        }
        
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
          meeting_id: sessionId,
          ...todoData,
          organization_id: orgId,
          department_id: effectiveTeamId
        });
        // Only show success message for manual saves, not auto-saves
        if (!options.isAutoSave) {
          setSuccess('To-do created successfully');
        }
        
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
  }, [user, teamId, editingTodo, meetingCode, broadcastTodoUpdate, fetchTodosData, meetingStarted, fetchTodaysTodos, setSuccess, setError]);

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

      const orgId = user?.organizationId || user?.organization_id;
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

  // Todo context menu handlers
  const handleEditTodo = (todo) => {
    setEditingTodo(todo);
    setShowTodoDialog(true);
  };

  const handleDeleteTodo = async (todo) => {
    showConfirmation(
      'delete',
      'Delete To-Do',
      `Are you sure you want to delete "${todo.title}"? This action cannot be undone.`,
      async () => {
        try {
          const orgId = user?.organizationId || user?.organization_id;
          await todosService.deleteTodo(todo.id, orgId);
          await fetchTodosData();
      
      // Broadcast todo deletion to other participants
      if (meetingCode && broadcastTodoUpdate) {
        broadcastTodoUpdate({
          action: 'delete',
          todoId: todo.id
        });
        }
        } catch (error) {
          console.error('Failed to delete todo:', error);
          setError('Failed to delete to-do');
        }
      }
    );
  };

  const handleCreateLinkedIssue = async (todo) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      // Check if an issue already exists for this todo
      const issuesResponse = await issuesService.getIssues();
      const existingIssues = issuesResponse.data?.issues || issuesResponse.issues || issuesResponse;
      const linkedIssue = existingIssues.find(issue => issue.related_todo_id === todo.id);
      
      if (linkedIssue) {
        toast.error('An issue already exists for this to-do');
        return;
      }
      
      // Calculate if the todo is overdue
      const isOverdue = todo.due_date && parseDateLocal(todo.due_date) < new Date();
      const daysOverdue = isOverdue ? 
        Math.floor((new Date() - parseDateLocal(todo.due_date)) / (1000 * 60 * 60 * 24)) : 0;
      
      // Create issue data
      const issueData = {
        title: isOverdue ? `Overdue: ${todo.title}` : `Issue: ${todo.title}`,
        description: isOverdue ? 
          `This to-do is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue.\n\nOriginal due date: ${parseDateLocal(todo.due_date).toLocaleDateString()}\n\n${todo.description || ''}` :
          `Created from to-do: ${todo.title}\n\n${todo.description || ''}`,
        timeline: 'short_term',
        priority_level: isOverdue && daysOverdue > 7 ? 'high' : 'normal',
        teamId: effectiveTeamId,
        related_todo_id: todo.id
      };
      
      // Create the issue
      await issuesService.createIssue({ ...issueData, meeting_id: sessionId });
      
      // Refresh issues data
      await fetchIssuesData();
      
      toast.success('Linked issue created successfully');
      
      // Broadcast issue creation to other participants
      if (meetingCode && broadcastIssueListUpdate) {
        broadcastIssueListUpdate({
          action: 'create',
          message: 'Issue created from to-do'
        });
      }
      
    } catch (error) {
      console.error('Failed to create linked issue:', error);
      toast.error('Failed to create linked issue');
    }
  };

  const handleToggleTodoComplete = async (todo) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      await todosService.updateTodo(todo.id, {
        ...todo,
        organization_id: orgId,
        department_id: effectiveTeamId,
        completed: !todo.completed,
        status: !todo.completed ? 'completed' : 'pending'
      });
      await fetchTodosData();
      
      // Broadcast todo status update to other participants
      if (meetingCode && broadcastTodoUpdate) {
        broadcastTodoUpdate({
          action: 'status',
          todoId: todo.id,
          completed: !todo.completed,
          status: !todo.completed ? 'completed' : 'pending'
        });
      }
    } catch (error) {
      console.error('Failed to toggle todo:', error);
      setError('Failed to update to-do status');
    }
  };

  const handleReassignTodo = (todo) => {
    setEditingTodo(todo);
    setShowTodoDialog(true);
  };

  const handleChangeTodoDueDate = (todo) => {
    setEditingTodo(todo);
    setShowTodoDialog(true);
  };

  const handleChangeTodoPriority = async (todo, newPriority) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      await todosService.updateTodo(todo.id, {
        ...todo,
        organization_id: orgId,
        department_id: effectiveTeamId,
        priority: newPriority
      });
      await fetchTodosData();
      
      // Broadcast todo priority update to other participants
      if (meetingCode && broadcastTodoUpdate) {
        broadcastTodoUpdate({
          action: 'update',
          todoId: todo.id,
          todo: { ...todo, priority: newPriority }
        });
      }
    } catch (error) {
      console.error('Failed to change priority:', error);
      setError('Failed to update to-do priority');
    }
  };

  const handleDuplicateTodo = async (todo) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      await todosService.createTodo({
        ...todo,
        id: undefined,
        title: `${todo.title} (Copy)`,
        organization_id: orgId,
        department_id: effectiveTeamId
      });
      await fetchTodosData();
      
      // Broadcast todo creation to other participants
      if (meetingCode && broadcastTodoUpdate) {
        broadcastTodoUpdate({
          action: 'refresh'
        });
      }
    } catch (error) {
      console.error('Failed to duplicate todo:', error);
      setError('Failed to duplicate to-do');
    }
  };

  // Issue context menu handlers

  const handleMarkIssueSolved = async (issue) => {
    try {
      // Use 'closed' status - this is the correct value for solved issues
      await issuesService.updateIssue(issue.id, {
        status: 'closed'
      });
      await fetchIssuesData();
      
      // Broadcast issue update to other participants
      if (meetingCode && broadcastIssueListUpdate) {
        broadcastIssueListUpdate({
          action: 'solve',
          issueId: issue.id,
          issue: { ...issue, status: 'closed' }
        });
      }
    } catch (error) {
      console.error('Failed to mark issue solved:', error);
      setError('Failed to mark issue as solved');
    }
  };

  const handleVoteOnIssue = async (issue) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      await issuesService.toggleIssueVote(issue.id, orgId);
      await fetchIssuesData();
      
      // Broadcast vote update to other participants
      if (meetingCode && broadcastIssueListUpdate) {
        broadcastIssueListUpdate({
          action: 'vote',
          issueId: issue.id
        });
      }
    } catch (error) {
      console.error('Failed to vote on issue:', error);
      setError('Failed to vote on issue');
    }
  };

  const handleMoveIssueToLongTerm = async (issue) => {
    try {
      console.log('🔄 Moving issue to long-term:', issue.title);
      
      // Simple approach: Update via API and refetch data (like working IssuesPage)
      await issuesService.updateIssue(issue.id, { timeline: 'long_term' });
      
      console.log('✅ Issue moved to long-term, refreshing data...');
      
      // Refetch all data to ensure consistency
      await fetchIssuesData();
      
      console.log('✅ Issue successfully moved to long-term!');
      
    } catch (error) {
      console.error('❌ Failed to move issue:', error);
      setError('Failed to move issue to long-term');
    }
  };

  const handleMoveIssueToShortTerm = async (issue) => {
    try {
      console.log('🔄 Moving issue to short-term:', issue.title);
      
      // Simple approach: Update via API and refetch data (like working IssuesPage)
      await issuesService.updateIssue(issue.id, { timeline: 'short_term' });
      
      console.log('✅ Issue moved to short-term, refreshing data...');
      
      // Refetch all data to ensure consistency
      await fetchIssuesData();
      
      console.log('✅ Issue successfully moved to short-term!');
      
    } catch (error) {
      console.error('❌ Failed to move issue:', error);
      setError('Failed to move issue to short-term');
    }
  };

  const handleArchiveIssue = async (issue) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      await issuesService.updateIssue(issue.id, {
        ...issue,
        organization_id: orgId,
        department_id: effectiveTeamId,
        archived: true
      });
      await fetchIssuesData();
      
      // Broadcast issue archive to other participants
      if (meetingCode && broadcastIssueListUpdate) {
        broadcastIssueListUpdate({
          action: 'delete',
          issueId: issue.id
        });
      }
    } catch (error) {
      console.error('Failed to archive issue:', error);
      setError('Failed to archive issue');
    }
  };

  // Drag and drop handlers for issues
  const handleDragStart = (e, issue, index) => {
    setDraggedIssue(issue);
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedIssue(null);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex || !draggedIssue) {
      return;
    }

    const issues = shortTermIssues || [];
    // Reorder the issues
    const newIssues = [...issues];
    const [movedIssue] = newIssues.splice(draggedIndex, 1);
    newIssues.splice(dropIndex, 0, movedIssue);

    // Update priority ranks
    const updatedIssues = newIssues.map((issue, index) => ({
      ...issue,
      priority_rank: index
    }));

    // Update state optimistically
    setShortTermIssues(updatedIssues);
    
    // Reset drag state
    setDraggedIssue(null);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Call reorder handler
    if (handleReorderIssues) {
      try {
        await handleReorderIssues(updatedIssues);
      } catch (error) {
        console.error('Failed to reorder issues:', error);
        // Revert on error
        setShortTermIssues(issues);
      }
    }
  };

  // Create Issue from Priority/Rock
  const handleCreateIssueFromPriority = async (priority) => {
    try {
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      await issuesService.createIssue({
        title: priority.title,
        description: `Related to ${labels.priority_singular || 'Rock'}: ${priority.title}`,
        timeline: 'short_term',
        priority_level: 'normal',
        teamId: effectiveTeamId,
        department_id: effectiveTeamId
      });
      
      setSuccess(`Issue created successfully from ${labels.priority_singular || 'Rock'}`);
      await fetchIssuesData();
    } catch (error) {
      console.error('Failed to create issue from priority:', error);
      setError('Failed to create issue from priority');
    }
  };


  // Create Issue from To-Do
  const handleCreateIssueFromTodo = async (todo) => {
    try {
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      // Create the issue using issuesService directly
      await issuesService.createIssue({
        title: `Issue from To-Do: ${todo.title}`,
        description: `Related to to-do: ${todo.title}\n\n${todo.description || ''}`,
        timeline: 'short_term',
        priority_level: 'normal',
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

  // Move Issue to Another Team
  const handleMoveIssueToAnotherTeam = (issue) => {
    console.log('Opening move issue dialog for:', issue);
    setIssueToMove(issue);
    setMoveIssueDialogOpen(true);
  };

  // Handle successful issue move
  const handleIssueMovedSuccess = async (message) => {
    setSuccess(message || 'Issue moved to another team successfully');
    setMoveIssueDialogOpen(false);
    setIssueToMove(null);
    
    // Refresh issues to remove the moved issue from current team's list
    await fetchIssuesData();
    
    // Broadcast the update to other participants if in collaborative meeting
    if (meetingCode && broadcastIssueListUpdate) {
      broadcastIssueListUpdate({
        action: 'refresh'
      });
    }
  };

  // Move Priority to Another Team
  // const handleMovePriorityToAnotherTeam = (priority) => {
  //   console.log('Opening move priority dialog for:', priority);
  //   setPriorityToMove(priority);
  //   setMovePriorityDialogOpen(true);
  // };

  // Handle successful priority move
  // const handlePriorityMovedSuccess = async (message) => {
  //   setSuccess(message || 'Priority moved to another team successfully');
  //   setMovePriorityDialogOpen(false);
  //   setPriorityToMove(null);
  //   
  //   // Refresh priorities to remove the moved priority from current team's list
  //   await fetchPrioritiesData();
  //   
  //   // Broadcast the update to other participants if in collaborative meeting
  //   if (meetingCode && broadcastPriorityUpdate) {
  //     broadcastPriorityUpdate({
  //       action: 'refresh'
  //     });
  //   }
  // };

  // Priority handlers

  const handlePriorityStatusChange = async (priorityId, newStatus) => {
    // First update the priority status
    await handleUpdatePriority(priorityId, { status: newStatus });
    
    // If the priority is marked as off-track, create an issue
    if (newStatus === 'off-track' || newStatus === 'at-risk') {
      const priority = priorities.find(p => p.id === priorityId);
      if (priority) {
        try {
          const orgId = user?.organizationId || user?.organization_id;
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
          
          await issuesService.createIssue({ ...issueData, meeting_id: sessionId });
          
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



  const handleCreateDiscussionIssue = async (priority) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      // Ensure we have a valid title
      const priorityTitle = priority.title || priority.name || 'Untitled Priority';
      const ownerName = priority.owner?.name || 'Unassigned';
      const dueDate = priority.dueDate ? formatDateSafe(priority.dueDate, 'MMM dd, yyyy') : 'Not set';
      
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
      
      await issuesService.createIssue({ ...issueData, meeting_id: sessionId });
      
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
      const orgId = user?.organizationId || user?.organization_id;
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      
      await quarterlyPrioritiesService.archivePriority(orgId, effectiveTeamId, priorityId);
      
      // Remove from local state
      setPriorities(prev => prev.filter(p => p.id !== priorityId));
    } catch (error) {
      console.error('Failed to archive priority:', error);
    }
  };

  // Context Menu Handlers for Priorities
  const handleContextMenuEditPriority = (priority) => {
    setSelectedPriority(priority);
    setShowPriorityDialog(true);
  };

  const handleContextMenuChangeStatus = async (priority, newStatus) => {
    try {
      await handleUpdatePriority(priority.id, { status: newStatus });
      
      // If marked off-track, optionally create an issue
      if (newStatus === 'off-track' || newStatus === 'at-risk') {
        handlePriorityStatusChange(priority.id, newStatus);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleContextMenuAddMilestone = (priority) => {
    setSelectedPriority(priority);
    setShowPriorityDialog(true);
    // Could add a flag to focus on milestone tab
  };

  const handleContextMenuArchive = async (priority) => {
    // Set archive data and show confirmation dialog
    setArchiveData({ priorityId: priority.id, priorityTitle: priority.title });
    setShowArchiveDialog(true);
  };

  const confirmArchivePriority = async () => {
    const { priorityId, isBulk, count } = archiveData;
    setShowArchiveDialog(false);
    setArchiveData({ priorityId: null, priorityTitle: null, isBulk: false, count: 0 });
    
    if (isBulk) {
      // Handle bulk archive
      try {
        const orgId = user?.organizationId || user?.organization_id;
        const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
        const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
        await quarterlyPrioritiesService.archiveCompletedPriorities(orgId, effectiveTeamId);
        toast.success(`Successfully archived ${count} completed ${count === 1 ? 'priority' : 'priorities'}`);
        await fetchPrioritiesData();
      } catch (error) {
        console.error('Error archiving completed priorities:', error);
        toast.error('Failed to archive completed priorities');
      }
    } else {
      // Handle single priority archive
      await handleArchivePriority(priorityId);
    }
  };

  const handleContextMenuDelete = async (priority) => {
    // For now, archive is safer than delete
    await handleContextMenuArchive(priority);
  };

  const handleContextMenuDuplicate = async (priority) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      
      const priorityData = {
        title: `${priority.title} (Copy)`,
        description: priority.description,
        ownerId: priority.owner_id || priority.ownerId,
        dueDate: priority.due_date || priority.dueDate,
        isCompanyPriority: priority.is_company_priority || priority.priority_type === 'company',
        status: 'on-track',
        progress: 0
      };
      
      // Get current quarter and year
      const now = new Date();
      const currentQuarter = Math.floor((now.getMonth() / 3)) + 1;
      const currentYear = now.getFullYear();
      const quarter = `Q${currentQuarter}`;
      
      await quarterlyPrioritiesService.createPriority(orgId, effectiveTeamId, {
        ...priorityData,
        quarter,
        year: currentYear
      });
      await fetchPrioritiesData();
    } catch (error) {
      console.error('Failed to duplicate priority:', error);
    }
  };

  const handleCreateLinkedTodoFromRock = async (rock) => {
    // Immediate feedback to show function is called
    toast.loading('Creating to-do from Rock...', { id: 'create-todo-loading' });
    
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      
      // Default due date: end of quarter
      const today = new Date();
      const quarterEnd = new Date(today.getFullYear(), Math.ceil((today.getMonth() + 1) / 3) * 3, 0);
      
      // Create to-do data from rock
      const todoData = {
        title: rock.title || rock.name,
        description: `Action item from Rock: ${rock.title || rock.name}\n\n${rock.description || ''}`,
        due_date: quarterEnd.toISOString().split('T')[0],
        priority: 'high',
        related_priority_id: rock.id, // Link back to rock
        team_id: effectiveTeamId,
        assigned_to: rock.owner_id || user.id
      };
      
      // Create the to-do
      await todosService.createTodo({ ...todoData, meeting_id: sessionId });
      
      // Dismiss loading toast and show success
      toast.dismiss('create-todo-loading');
      toast.success('To-Do created successfully and linked to Rock');
      
      // Refresh todos list if needed
      await fetchTodosData();
      
      // Broadcast todo creation to other participants
      if (meetingCode && broadcastTodoUpdate) {
        broadcastTodoUpdate({
          action: 'create',
          message: 'To-Do created from Rock'
        });
      }
      
    } catch (error) {
      console.error('Failed to create linked to-do:', error);
      console.error('❌ [CreateLinkedTodo] Error details:', error?.response?.data);
      console.error('❌ [CreateLinkedTodo] Error status:', error?.response?.status);
      
      // Enhanced error messages based on specific error types
      let errorMessage = 'Failed to create to-do. Please try again.';
      
      if (error?.response?.status === 400) {
        errorMessage = `Failed to create to-do: ${error?.response?.data?.message || 'Invalid data provided'}`;
      } else if (error?.response?.status === 401) {
        errorMessage = 'Failed to create to-do: Authentication required. Please refresh and try again.';
      } else if (error?.response?.status === 403) {
        errorMessage = 'Failed to create to-do: You do not have permission to create to-dos.';
      } else if (error?.response?.status === 500) {
        errorMessage = 'Failed to create to-do: Server error. Please try again later.';
      } else if (error?.message) {
        errorMessage = `Failed to create to-do: ${error.message}`;
      }
      
      // Dismiss loading toast and show error
      toast.dismiss('create-todo-loading');
      toast.error(errorMessage);
    }
  };

  const handleCreateLinkedIssueFromRock = async (rock) => {
    console.log('🔴 CREATE ISSUE CLICKED', rock);
    console.log('🔍 [CreateLinkedIssue] Starting...', { rock });
    
    // Immediate feedback to show function is called
    toast.loading('Creating issue from Rock...', { id: 'create-issue-loading' });
    
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      
      console.log('🔍 [CreateLinkedIssue] Variables:', { orgId, teamId, cleanTeamId, effectiveTeamId, user });
      
      // Create issue data from rock
      const issueData = {
        title: `Issue: ${rock.title || rock.name}`,
        description: `Issue from Rock: ${rock.title || rock.name}\n\n${rock.description || ''}\n\nOwner: ${rock.owner_name || 'Unassigned'}`,
        timeline: 'short_term', // Meeting issues are typically short-term
        ownerId: rock.owner_id || rock.ownerId || user?.id, // Required field for issues
        related_priority_id: rock.id, // Link back to rock
        department_id: effectiveTeamId // Use department_id as per other successful calls
      };
      
      console.log('🔍 [CreateLinkedIssue] Issue data:', issueData);
      console.log('🔴 CALLING API', { orgId, teamId, issueData });
      console.log('🔍 [CreateLinkedIssue] Calling issuesService.createIssue...');
      
      // Create the issue
      const result = await issuesService.createIssue({ ...issueData, meeting_id: sessionId });
      
      console.log('✅ [CreateLinkedIssue] Success! Result:', result);
      console.log('🔴 SUCCESS');
      
      // Dismiss loading toast and show success
      toast.dismiss('create-issue-loading');
      toast.success('Issue created successfully and linked to Rock');
      
      // Refresh issues list
      console.log('🔄 [CreateLinkedIssue] Refreshing issues list...');
      await fetchIssuesData();
      
      // Broadcast issue creation to other participants
      if (meetingCode && broadcastIssueListUpdate) {
        console.log('📡 [CreateLinkedIssue] Broadcasting update...');
        broadcastIssueListUpdate({
          action: 'create',
          message: 'Issue created from Rock'
        });
      }
      
    } catch (error) {
      console.error('🔴 ERROR', error);
      console.error('❌ [CreateLinkedIssue] Error:', error);
      console.error('❌ [CreateLinkedIssue] Error details:', error?.response?.data);
      console.error('❌ [CreateLinkedIssue] Error status:', error?.response?.status);
      
      // Enhanced error messages based on specific error types
      let errorMessage = 'Failed to create issue. Please try again.';
      
      if (error?.response?.status === 400) {
        errorMessage = `Failed to create issue: ${error?.response?.data?.message || 'Invalid data provided'}`;
      } else if (error?.response?.status === 401) {
        errorMessage = 'Failed to create issue: Authentication required. Please refresh and try again.';
      } else if (error?.response?.status === 403) {
        errorMessage = 'Failed to create issue: You do not have permission to create issues.';
      } else if (error?.response?.status === 500) {
        errorMessage = 'Failed to create issue: Server error. Please try again later.';
      } else if (error?.message) {
        errorMessage = `Failed to create issue: ${error.message}`;
      }
      
      // Dismiss loading toast and show error
      toast.dismiss('create-issue-loading');
      toast.error(errorMessage);
    }
  };

  const handleEditMilestone = async (priorityId, milestoneId, updates) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      
      await quarterlyPrioritiesService.updateMilestone(orgId, effectiveTeamId, priorityId, milestoneId, updates);
      await fetchPrioritiesData();
    } catch (error) {
      console.error('Failed to edit milestone:', error);
    }
  };

  const handleDeleteMilestone = async (priorityId, milestoneId) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      
      if (!orgId || !effectiveTeamId) {
        throw new Error('Organization or team not found');
      }
      
      await quarterlyPrioritiesService.deleteMilestone(orgId, effectiveTeamId, priorityId, milestoneId);
      
      // Update local state instead of refetching
      const removeMilestone = (milestones) => 
        milestones?.filter(m => m.id !== milestoneId) || [];
      
      // Update priorities
      setPriorities(prev => prev.map(p => 
        p.id === priorityId 
          ? { ...p, milestones: removeMilestone(p.milestones) }
          : p
      ));
      
      // Update selectedPriority if this is the currently selected one
      if (selectedPriority?.id === priorityId) {
        setSelectedPriority(prev => ({
          ...prev,
          milestones: removeMilestone(prev.milestones)
        }));
      }
      
      // Calculate and update progress on the backend
      const currentPriority = priorities.find(p => p.id === priorityId);
      if (currentPriority) {
        const remainingMilestones = removeMilestone(currentPriority.milestones);
        const completedCount = remainingMilestones.filter(m => m.completed).length;
        const totalCount = remainingMilestones.length;
        const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        
        // Determine status based on actual milestone completion
        let newStatus = currentPriority.status;
        if (totalCount > 0) {
          if (currentPriority.status === 'complete' && completedCount < totalCount) {
            newStatus = 'on-track';
          } else if (completedCount === totalCount && totalCount > 0) {
            newStatus = 'complete';
          }
        }
        
        const updates = { progress: newProgress };
        if (newStatus !== currentPriority.status) {
          updates.status = newStatus;
        }
        await quarterlyPrioritiesService.updatePriority(orgId, effectiveTeamId, priorityId, updates);
        
        // Update local state with new progress and status
        setPriorities(prev => prev.map(p => 
          p.id === priorityId ? { ...p, progress: newProgress, status: newStatus } : p
        ));
        
        if (selectedPriority?.id === priorityId) {
          setSelectedPriority(prev => ({ ...prev, progress: newProgress, status: newStatus }));
        }
      }
      
      setSuccess('Milestone deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to delete milestone:', error);
      setError('Failed to delete milestone');
    }
  };

  const handleAddUpdate = async (priorityId, updateText, statusChange = null) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      
      if (!orgId || !effectiveTeamId) {
        throw new Error('Organization or team not found');
      }
      
      // Fix: Use correct method name
      const result = await quarterlyPrioritiesService.addPriorityUpdate(orgId, effectiveTeamId, priorityId, updateText, statusChange);
      
      // Ensure we have a valid result
      if (!result || !result.id) {
        console.error('Invalid update response - missing ID:', result);
        throw new Error('Failed to create update - no ID returned');
      }
      
      // Update local state immediately
      const newUpdate = {
        id: result.id,
        text: result.update_text || updateText,
        createdAt: result.created_at || new Date().toISOString(),
        createdBy: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || 'Unknown'
      };
      
      // Update selected priority if it's the one being viewed
      if (selectedPriority?.id === priorityId) {
        setSelectedPriority(prev => ({
          ...prev,
          updates: [newUpdate, ...(prev.updates || [])],
          status: statusChange || prev.status
        }));
      }
      
      // Update priorities in state
      setPriorities(prev => prev.map(p => 
        p.id === priorityId 
          ? { ...p, updates: [newUpdate, ...(p.updates || [])], status: statusChange || p.status }
          : p
      ));
    } catch (error) {
      console.error('Failed to add update:', error);
    }
  };

  const handleEditUpdate = async (priorityId, updateId, newText) => {
    try {
      const editText = window.prompt('Edit update:', newText);
      if (!editText || editText === newText) {
        return;
      }
      
      const orgId = user?.organizationId || user?.organization_id;
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      
      if (!orgId || !effectiveTeamId) {
        throw new Error('Organization or team not found');
      }
      
      // Fix: Use correct method name
      await quarterlyPrioritiesService.editPriorityUpdate(orgId, effectiveTeamId, priorityId, updateId, editText);
      
      // Update local state immediately
      const editUpdate = (updates) => 
        updates?.map(u => u.id === updateId ? { ...u, text: editText } : u) || [];
      
      // Update selected priority if it's the one being viewed
      if (selectedPriority?.id === priorityId) {
        setSelectedPriority(prev => ({
          ...prev,
          updates: editUpdate(prev.updates)
        }));
      }
      
      // Update priorities in state
      setPriorities(prev => prev.map(p => 
        p.id === priorityId 
          ? { ...p, updates: editUpdate(p.updates) }
          : p
      ));
    } catch (error) {
      console.error('Failed to edit update:', error);
    }
  };

  const handleDeleteUpdate = async (priorityId, updateId) => {
    showConfirmation(
      'delete',
      'Delete Update',
      'Are you sure you want to delete this update? This action cannot be undone.',
      async () => {
        try {
          const orgId = user?.organizationId || user?.organization_id;
          const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
          const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
          
          if (!orgId || !effectiveTeamId) {
            throw new Error('Organization or team not found');
          }
          
          // Fix: Use correct method name
          await quarterlyPrioritiesService.deletePriorityUpdate(orgId, effectiveTeamId, priorityId, updateId);
      
      // Update local state immediately
      const removeUpdate = (updates) => 
        updates?.filter(u => u.id !== updateId) || [];
      
      // Update selected priority if it's the one being viewed
      if (selectedPriority?.id === priorityId) {
        setSelectedPriority(prev => ({
          ...prev,
          updates: removeUpdate(prev.updates)
        }));
      }
      
      // Update priorities in state
      setPriorities(prev => prev.map(p => 
        p.id === priorityId 
          ? { ...p, updates: removeUpdate(p.updates) }
          : p
        ));
        } catch (error) {
          console.error('Failed to delete update:', error);
        }
      }
    );
  };

  const handleUploadAttachment = async (priorityId, file) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      
      await quarterlyPrioritiesService.uploadAttachment(orgId, effectiveTeamId, priorityId, file);
      await fetchPrioritiesData();
    } catch (error) {
      console.error('Failed to upload attachment:', error);
    }
  };

  const handleDeleteAttachment = async (priorityId, attachmentId) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
      const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
      
      await quarterlyPrioritiesService.deleteAttachment(orgId, effectiveTeamId, priorityId, attachmentId);
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
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      
      const response = await cascadingMessagesService.getAvailableTeams(orgId, effectiveTeamId);
      setAvailableTeams(response.data || []);
    } catch (error) {
      console.error('Failed to fetch available teams:', error);
    }
  };

  const fetchCascadedMessages = async () => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      
      // Use same logic as Dashboard - if no valid teamId from URL, fall back to user's first team
      let effectiveTeamId;
      if (!teamId || teamId === 'null' || teamId === 'undefined') {
        // No team in URL, use user's first team (same as Dashboard with no selectedDepartment)
        effectiveTeamId = user?.teams?.[0]?.id || getTeamId(user, 'individual');
      } else {
        effectiveTeamId = getEffectiveTeamId(teamId, user);
      }
      
      console.log('🔍 Fetching cascaded messages with:', {
        orgId,
        rawTeamId: teamId,
        effectiveTeamId,
        userTeams: user?.teams
      });
      
      const response = await cascadingMessagesService.getCascadingMessages(orgId, effectiveTeamId);
      console.log('📬 Cascaded messages response:', response);
      setCascadedMessages(response.data || []);
    } catch (error) {
      console.error('Failed to fetch cascaded messages:', error);
    }
  };


  // Pause/Resume handlers
  const handlePauseResume = async () => {
    console.log('🔴🔴🔴 PAUSE BUTTON CLICKED - DEEP DEBUG START 🔴🔴🔴');
    console.log('1️⃣ Initial State:', {
      sessionId,
      sessionLoading,
      isPaused,
      meetingStarted,
      loading,
      elapsedTime,
      meetingStartTime
    });
    
    console.log('2️⃣ User & Team Info:', {
      user: user ? {
        id: user.id,
        email: user.email,
        organizationId: user.organizationId || user.organization_id
      } : 'NO USER',
      teamId,
      effectiveTeamId: teamId ? getEffectiveTeamId(teamId, user) : 'NO TEAM'
    });
    
    // Check if sessionId exists
    if (!sessionId) {
      console.error('❌ NO SESSION ID - Cannot pause/resume');
      console.log('Session state:', { 
        sessionId, 
        sessionLoading,
        meetingStarted,
        'sessionStorage.meetingActive': sessionStorage.getItem('meetingActive'),
        'sessionStorage.meetingStartTime': sessionStorage.getItem('meetingStartTime')
      });
      setError('Meeting session not found. Please refresh the page.');
      return;
    }
    
    if (sessionLoading) {
      console.warn('⚠️ Session is still loading, cannot pause/resume yet');
      return;
    }
    
    const orgId = user?.organizationId || user?.organization_id;
    const effectiveTeamId = getEffectiveTeamId(teamId, user);
    
    console.log('3️⃣ About to call API:', {
      action: isPaused ? 'RESUME' : 'PAUSE',
      sessionId,
      orgId,
      effectiveTeamId,
      isPaused,
      API_URL: import.meta.env.VITE_API_URL
    });
    
    console.log('4️⃣ Setting loading to true...');
    setLoading(true);
    
    try {
      if (isPaused) {
        console.log('5️⃣ Calling RESUME API...');
        // Resume the session
        const result = await meetingSessionsService.resumeSession(orgId, effectiveTeamId, sessionId);
        console.log('✅ Resume API Response:', result);
        
        setIsPaused(false);
        setTotalPausedTime(result.session.total_paused_duration || 0);
        
        // Update elapsed time to the backend's calculated active duration
        // This ensures we continue from the correct time after resume
        if (result.session.active_duration_seconds !== undefined) {
          setElapsedTime(result.session.active_duration_seconds);
          console.log('⏱️ Resetting timer to active duration:', result.session.active_duration_seconds);
        }
        
        // Reset the section start time to NOW so section timer calculates correctly from resume point
        setCurrentSectionStartTime(Date.now());
        console.log('⏱️ Reset section start time to:', new Date().toISOString());
        
        console.log('6️⃣ State updated after resume:', { 
          isPaused: false, 
          totalPausedTime: result.session.total_paused_duration,
          elapsedTime: result.session.active_duration_seconds,
          currentSectionStartTime: new Date().toISOString()
        });
        
        // Broadcast resume to all participants
        if (broadcastIssueListUpdate) {
          broadcastIssueListUpdate({
            action: 'timer-resumed',
            resumedBy: user?.full_name || user?.email,
            timestamp: Date.now()
          });
        }
        
        setSuccess('Meeting resumed');
        console.log('7️⃣ Resume complete, setting loading to false');
        setLoading(false);
      } else {
        console.log('5️⃣ Calling PAUSE API...');
        
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
          console.log(`⏸️ Pausing section ${activeSection} at ${newCumulative} seconds`);
        }
        
        // Pause the session
        const result = await meetingSessionsService.pauseSession(orgId, effectiveTeamId, sessionId);
        console.log('✅ Pause API Response:', result);
        
        setIsPaused(true);
        console.log('6️⃣ State updated after pause:', { isPaused: true });
        
        // Broadcast pause to all participants
        if (broadcastIssueListUpdate) {
          broadcastIssueListUpdate({
            action: 'timer-paused',
            pausedBy: user?.full_name || user?.email,
            timestamp: Date.now()
          });
        }
        
        setSuccess('Meeting paused');
        console.log('7️⃣ Pause complete, setting loading to false');
        setLoading(false);
      }
    } catch (error) {
      console.error('❌❌❌ API CALL FAILED ❌❌❌');
      console.error('Full error object:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        sessionId,
        orgId,
        effectiveTeamId,
        isPaused,
        API_URL: import.meta.env.VITE_API_URL
      });
      setError('Failed to ' + (isPaused ? 'resume' : 'pause') + ' meeting');
      console.log('8️⃣ Error occurred, setting loading to false');
      setLoading(false);
    }
    
    console.log('🔴🔴🔴 PAUSE BUTTON HANDLER END 🔴🔴🔴');
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
  
  const toggleFullScreen = () => {
    if (isFullScreen) {
      // Exit full-screen
      sessionStorage.removeItem('hideSidebarTemp');
      setIsFullScreen(false);
      console.log('Exiting full-screen mode');
    } else {
      // Enter full-screen
      sessionStorage.setItem('hideSidebarTemp', 'true');
      setIsFullScreen(true);
      console.log('Entering full-screen mode');
    }
    // Trigger a re-render of Layout component (custom event, not storage)
    window.dispatchEvent(new Event('toggleSidebar'));
  };

  const getTimerColor = () => {
    const minutes = elapsedTime / 60;
    if (minutes >= 85) return 'text-red-600';
    if (minutes >= 80) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const handleSectionChange = async (sectionId) => {
    // Don't process if we're already on this section
    if (activeSection === sectionId) return;
    
    // Mark current section as completed when moving to next section
    const currentIndex = agendaItems.findIndex(item => item.id === activeSection);
    const nextIndex = agendaItems.findIndex(item => item.id === sectionId);
    if (nextIndex > currentIndex) {
      setCompletedSections(prev => new Set([...prev, activeSection]));
    }
    
    // Track section transition timing (Phase 2)
    if (currentSectionStartTime && activeSection) {
      // Save cumulative time for the current section
      const sessionTime = Math.floor((Date.now() - currentSectionStartTime) / 1000);
      const previousCumulative = sectionCumulativeTimes[activeSection] || 0;
      const newCumulative = previousCumulative + sessionTime;
      
      setSectionCumulativeTimes(prev => ({
        ...prev,
        [activeSection]: newCumulative
      }));
      
      // Update section timings
      if (sessionId) {
        const currentSectionConfig = agendaItems.find(item => item.id === activeSection);
        const currentSectionData = sectionTimings[activeSection] || {};
        
        setSectionTimings(prev => ({
          ...prev,
          [activeSection]: {
            ...currentSectionData,
            ended_at: new Date().toISOString(),
            actual: newCumulative, // Use cumulative time
            allocated: currentSectionConfig?.duration * 60 || 300,
            overrun: newCumulative > (currentSectionConfig?.duration * 60 || 300) 
              ? newCumulative - (currentSectionConfig?.duration * 60 || 300) 
              : 0
          }
        }));
        
        // Report section end to backend
        try {
          const orgId = user?.organizationId || user?.organization_id;
          const effectiveTeamId = getEffectiveTeamId(teamId, user);
          await meetingSessionsService.endSection(orgId, effectiveTeamId, sessionId, activeSection);
        } catch (error) {
          console.warn('Failed to record section end:', error);
        }
      }
    }
    
    // Start or resume the new section
    setActiveSection(sectionId);
    setError(null);
    setCurrentSectionStartTime(Date.now());
    
    // Resume from previous cumulative time if returning to this section
    const existingTime = sectionCumulativeTimes[sectionId] || 0;
    setSectionElapsedTime(existingTime);
    console.log(`📍 Resuming section ${sectionId} at ${existingTime} seconds`);
    
    // Initialize section timing data
    const newSectionConfig = agendaItems.find(item => item.id === sectionId);
    if (newSectionConfig) {
      setSectionConfig(newSectionConfig);
      setSectionTimings(prev => ({
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          started_at: new Date().toISOString(),
          allocated: newSectionConfig.duration * 60
        }
      }));
    }
    
    // Report section start to backend
    if (sessionId) {
      try {
        const orgId = user?.organizationId || user?.organization_id;
        const effectiveTeamId = getEffectiveTeamId(teamId, user);
        await meetingSessionsService.startSection(orgId, effectiveTeamId, sessionId, sectionId);
      } catch (error) {
        console.warn('Failed to record section start:', error);
      }
    }
    
    // Always fetch relevant data when switching sections to ensure fresh data
    console.log(`📍 Switching to section: ${sectionId}, fetching relevant data...`);
    
    switch(sectionId) {
      case 'scorecard':
        fetchScorecardData();
        break;
      case 'priorities':
        fetchPrioritiesData();
        break;
      case 'headlines':
        fetchHeadlines();
        fetchCascadedMessages();
        break;
      case 'todo-list':
        fetchTodosData();
        break;
      case 'issues':
        fetchIssuesData();
        break;
      case 'good-news':
        // Good news is managed locally during the meeting
        break;
      case 'conclude':
        // Conclude section doesn't need data fetch
        break;
      default:
        break;
    }
    
    // Emit navigation event if leader
    if (isLeader && navigateToSection) {
      navigateToSection(sectionId, Date.now());
    }
  };
  
  // Listen for section changes from leader
  useEffect(() => {
    const handleMeetingSectionChange = (event) => {
      const { section } = event.detail;
      if (section && !isLeader) {
        console.log('📍 Follower changing section to:', section);
        setActiveSection(section);
        
        // Always fetch data when following leader's navigation
        switch(section) {
          case 'scorecard':
            fetchScorecardData();
            break;
          case 'priorities':
            fetchPrioritiesData();
            break;
          case 'headlines':
            fetchHeadlines();
            fetchCascadedMessages();
            break;
          case 'todo-list':
            fetchTodosData();
            break;
          case 'issues':
            fetchIssuesData();
            break;
          default:
            break;
        }
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
      
      // Update the specific issue in both short-term and long-term lists
      if (issueData.issueId && issueData.status !== undefined) {
        setShortTermIssues(prev => 
          prev.map(issue => 
            issue.id === issueData.issueId ? { ...issue, status: issueData.status } : issue
          )
        );
        setLongTermIssues(prev => 
          prev.map(issue => 
            issue.id === issueData.issueId ? { ...issue, status: issueData.status } : issue
          )
        );
      } else {
        // Fallback to full refetch if issueData is incomplete
        fetchIssuesData();
      }
    };
    
    const handleTodoUpdate = (event) => {
      const { action, todoId, todo, status, completed } = event.detail;
      console.log('✅ Received todo update:', event.detail);
      
      if (action === 'create') {
        // Insert new todo in correct position sorted by due_date, then priority, then created_at
        setTodos(prev => {
          const newTodos = [...prev, todo];
          return newTodos.sort((a, b) => {
            // Sort by due_date first (ASC - earliest first)
            const dateA = a.due_date ? new Date(a.due_date) : new Date('9999-12-31');
            const dateB = b.due_date ? new Date(b.due_date) : new Date('9999-12-31');
            if (dateA.getTime() !== dateB.getTime()) {
              return dateA.getTime() - dateB.getTime();
            }
            
            // Then by priority (DESC - high priority first)
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const priorityA = priorityOrder[a.priority] || 0;
            const priorityB = priorityOrder[b.priority] || 0;
            if (priorityA !== priorityB) {
              return priorityB - priorityA;
            }
            
            // Finally by created_at (DESC - newest first)
            const createdA = new Date(a.created_at || 0);
            const createdB = new Date(b.created_at || 0);
            return createdB.getTime() - createdA.getTime();
          });
        });
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
        // Add new issue to the beginning of the appropriate list
        if (issue.timeline === 'short_term') {
          setShortTermIssues(prev => [issue, ...prev]);
        } else {
          setLongTermIssues(prev => [issue, ...prev]);
        }
      } else if (action === 'update' && issue) {
        // Update existing issue - replace entire issue with updated one
        console.log('📝 Updating issue:', issueId, 'with data:', issue);
        setShortTermIssues(prev => prev.map(i => i.id === issueId ? (issue.id ? issue : { ...i, ...issue }) : i));
        setLongTermIssues(prev => prev.map(i => i.id === issueId ? (issue.id ? issue : { ...i, ...issue }) : i));
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
        // Remove all closed/solved/resolved/completed issues for the specified timeline
        const isNotClosed = (i) => {
          return i.status !== 'closed' && i.status !== 'solved' && 
                 i.status !== 'resolved' && i.status !== 'completed';
        };
        
        if (timeline === 'short_term') {
          setShortTermIssues(prev => prev.filter(isNotClosed));
        } else if (timeline === 'long_term') {
          setLongTermIssues(prev => prev.filter(isNotClosed));
        }
      } else if (action === 'meeting-ended') {
        // Meeting has been concluded by presenter
        console.log('📍 Meeting ended by presenter');
        setSuccess('Meeting has been concluded by the presenter');
        
        // Set flag to prevent auto-rejoin
        meetingConcludedRef.current = true;
        hasJoinedRef.current = true; // Keep this true to prevent auto-join
        
        // Leave the collaborative meeting
        if (meetingCode && leaveMeeting) {
          console.log('🚪 Leaving meeting after facilitator concluded');
          leaveMeeting();
        }
        
        // Reset meeting state
        setMeetingStarted(false);
        setMeetingStartTime(null);
        setElapsedTime(0);
        setMeetingRating(null);
        setRatingSubmitted(false);
        setActiveSection('good-news');
        setCompletedSections(new Set());
        
        // Clear sessionStorage
        sessionStorage.removeItem('meetingActive');
        sessionStorage.removeItem('meetingStartTime');
        
        // Navigate to dashboard immediately
        console.log('🏠 Navigating to dashboard...');
        navigate('/dashboard');
        
        // Update UI
        window.dispatchEvent(new Event('meetingStateChanged'));
      } else if (action === 'scorecard-view-change') {
        // Update scorecard view when leader changes it
        const { viewType } = event.detail;
        console.log('📊 Scorecard view changed to:', viewType);
        setScorecardViewType(viewType);
      } else if (action === 'scorecard-rtl-change') {
        // Update RTL setting when leader changes it
        const { isRTL: newRTL } = event.detail;
        console.log('➡️ RTL setting changed to:', newRTL);
        setIsRTL(newRTL);
        localStorage.setItem('scorecardRTL', newRTL.toString());
      } else if (action === 'scroll-sync') {
        // Sync scroll position from leader using percentage
        const { scrollPercentage } = event.detail;
        if (isFollowing && scrollPercentage !== undefined) {
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          const targetScrollY = (scrollPercentage / 100) * maxScroll;
          console.log('📜 Syncing scroll to:', scrollPercentage.toFixed(1) + '%', '→', targetScrollY + 'px');
          window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
        }
      } else if (action === 'priority-expanded') {
        // Sync Rock expansion state from leader
        const { priorityId, expanded } = event.detail;
        if (isFollowing && priorityId !== undefined) {
          console.log('📂 Syncing Rock expansion:', priorityId, expanded ? 'expanded' : 'collapsed');
          setExpandedPriorities(prev => ({
            ...prev,
            [priorityId]: expanded
          }));
        }
      } else if (action === 'priority-updated') {
        // Update rock/priority status or other fields
        const { priorityId, updates } = event.detail;
        console.log('🎯 Priority updated:', priorityId, updates);
        setPriorities(prev => prev.map(p => p.id === priorityId ? { ...p, ...updates } : p));
      } else if (action === 'milestone-toggled') {
        // Update milestone completion status
        const { priorityId, milestoneId, completed } = event.detail;
        console.log('✅ Milestone toggled:', priorityId, milestoneId, completed);
        
        // Update local state with milestone change and recalculate progress
        setPriorities(prev => prev.map(p => {
          if (p.id !== priorityId) return p;
          
          const updatedMilestones = p.milestones?.map(m => 
            m.id === milestoneId ? { ...m, completed } : m
          ) || [];
          
          // Calculate new progress
          const completedCount = updatedMilestones.filter(m => m.completed).length;
          const totalCount = updatedMilestones.length;
          const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
          
          // Auto-update status based on milestone completion
          let newStatus = p.status;
          if (totalCount > 0) {
            if (completedCount === totalCount && totalCount > 0) {
              newStatus = 'complete';
            } else if (newStatus === 'complete' && completedCount < totalCount) {
              newStatus = 'on-track';
            }
          }
          
          return {
            ...p,
            milestones: updatedMilestones,
            progress: newProgress,
            status: newStatus
          };
        }));
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
        
        // Initialize section config when joining (Phase 2)
        if (!sectionConfig) {
          const firstSection = agendaItems[0];
          if (firstSection) {
            setSectionConfig(firstSection);
            setCurrentSectionStartTime(startTime);
            setSectionElapsedTime(0);
            setSectionTimings({
              [firstSection.id]: {
                started_at: new Date(startTime).toISOString(),
                allocated: firstSection.duration * 60
              }
            });
          }
        }
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
    
    const handleRatingUpdate = (event) => {
      console.log('📥 Received rating event:', {
        eventType: event.type,
        eventDetail: event.detail,
        hasDetail: !!event.detail
      });
      
      const { userId, userName, rating, totalParticipants, totalRatings, averageRating, allRatings } = event.detail;
      console.log('⭐ RATING UPDATE EVENT RECEIVED:', {
        userId,
        userName,
        rating,
        totalParticipants,
        totalRatings,
        averageRating,
        allRatings,
        allRatingsLength: allRatings?.length,
        currentUserId: user?.id,
        isLeader,
        currentParticipants: participants
      });
      
      // Update participant ratings from the server's complete list
      if (allRatings) {
        console.log('📊 Updating participant ratings:', allRatings);
        setParticipantRatings(allRatings);
      } else {
        console.warn('⚠️ No allRatings in event');
      }
      
      // Update average rating
      if (averageRating) {
        setRatingAverage(parseFloat(averageRating));
      }
      
      // Mark user's own rating as submitted
      if (userId === user?.id) {
        setMeetingRating(rating);
      }
      
      // Check if all participants have rated (for facilitator)
      if (totalRatings === totalParticipants && isLeader) {
        // Clear timeout since everyone has rated
        if (ratingTimeoutTimer) {
          clearTimeout(ratingTimeoutTimer);
          setRatingTimeoutTimer(null);
        }
        setShowSendSummaryTimeout(false);
      }
    };
    
    const handleSectionChangeFromLeader = (event) => {
      const { section, sectionStartTime } = event.detail;
      console.log('📍 Received section change from leader:', section);
      console.log('📍 Section start time from leader:', sectionStartTime);
      
      // Only follow if not the leader
      if (!isLeader) {
        setActiveSection(section);
        
        // Update section config when section changes (Phase 2)
        const newSectionConfig = agendaItems.find(item => item.id === section);
        if (newSectionConfig) {
          setSectionConfig(newSectionConfig);
          // Use the leader's section start time instead of local time
          setCurrentSectionStartTime(sectionStartTime || Date.now());
          setSectionElapsedTime(0);
        }
      }
    };
    
    window.addEventListener('meeting-vote-update', handleVoteUpdate);
    window.addEventListener('meeting-issue-update', handleIssueUpdate);
    window.addEventListener('meeting-todo-update', handleTodoUpdate);
    window.addEventListener('meeting-issue-list-update', handleIssueListUpdate);
    window.addEventListener('meeting-timer-update', handleTimerUpdate);
    window.addEventListener('meeting-notes-update', handleNotesUpdate);
    window.addEventListener('meeting-presenter-changed', handlePresenterChange);
    window.addEventListener('meeting-rating-update', handleRatingUpdate);
    window.addEventListener('meeting-section-change', handleSectionChangeFromLeader);
    
    // Real-time broadcast handlers
    const handleIssueCreated = (event) => {
      console.log('🔔 Real-time: Issue created by', event.detail.createdBy);
      fetchIssuesData();
    };
    
    const handleTodoCreated = (event) => {
      console.log('🔔 Real-time: Todo created by', event.detail.createdBy);
      fetchTodosData();
    };
    
    const handleHeadlineCreated = (event) => {
      console.log('🔔 Real-time: Headline created by', event.detail.createdBy);
      fetchHeadlines();
    };
    
    window.addEventListener('meeting-issue-created', handleIssueCreated);
    window.addEventListener('meeting-todo-created', handleTodoCreated);
    window.addEventListener('meeting-headline-created', handleHeadlineCreated);
    
    // Scroll sync handler
    const handleScrollSync = (event) => {
      const { scrollPercentage } = event.detail;
      if (isFollowing && scrollPercentage !== undefined) {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const targetScrollY = (scrollPercentage / 100) * maxScroll;
        console.log('📜 Syncing scroll to:', scrollPercentage.toFixed(1) + '%', '→', targetScrollY + 'px');
        window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
      }
    };
    
    window.addEventListener('meeting-scroll-sync', handleScrollSync);
    
    return () => {
      window.removeEventListener('meeting-vote-update', handleVoteUpdate);
      window.removeEventListener('meeting-issue-update', handleIssueUpdate);
      window.removeEventListener('meeting-todo-update', handleTodoUpdate);
      window.removeEventListener('meeting-issue-list-update', handleIssueListUpdate);
      window.removeEventListener('meeting-timer-update', handleTimerUpdate);
      window.removeEventListener('meeting-notes-update', handleNotesUpdate);
      window.removeEventListener('meeting-presenter-changed', handlePresenterChange);
      window.removeEventListener('meeting-rating-update', handleRatingUpdate);
      window.removeEventListener('meeting-section-change', handleSectionChangeFromLeader);
      window.removeEventListener('meeting-issue-created', handleIssueCreated);
      window.removeEventListener('meeting-todo-created', handleTodoCreated);
      window.removeEventListener('meeting-headline-created', handleHeadlineCreated);
      window.removeEventListener('meeting-scroll-sync', handleScrollSync);
      // Cleanup rating timeout timer
      if (ratingTimeoutTimer) {
        clearTimeout(ratingTimeoutTimer);
      }
    };
  }, [user?.id, isLeader, ratingTimeoutTimer]);

  // Scroll sync: Broadcast scroll position when leader scrolls
  useEffect(() => {
    if (!isLeader || !meetingCode) return;

    let scrollTimeout;
    const handleScroll = () => {
      // Throttle scroll events to avoid spam
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollY = window.scrollY || window.pageYOffset;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercentage = maxScroll > 0 ? (scrollY / maxScroll) * 100 : 0;
        
        if (broadcastIssueListUpdate) {
          broadcastIssueListUpdate({
            action: 'scroll-sync',
            scrollPercentage: scrollPercentage
          });
        }
      }, 100); // Throttle to 100ms
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isLeader, meetingCode, broadcastIssueListUpdate]);

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
                <div className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 shadow-sm font-medium">
                  5 minutes
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
                  <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                    5 minutes
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
                    className="rounded border-gray-300"
                    style={{
                      accentColor: themeColors.primary
                    }}
                  />
                  <span className="text-sm text-gray-600">Show Average</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showScorecardTotal}
                    onChange={(e) => setShowScorecardTotal(e.target.checked)}
                    className="rounded border-gray-300"
                    style={{
                      accentColor: themeColors.primary
                    }}
                  />
                  <span className="text-sm text-gray-600">Show Total</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <select
                    value={scorecardViewType}
                    onChange={(e) => {
                      const newView = e.target.value;
                      setScorecardViewType(newView);
                      // Broadcast scorecard view change to other participants
                      if (meetingCode && broadcastIssueListUpdate) {
                        broadcastIssueListUpdate({
                          action: 'scorecard-view-change',
                          viewType: newView
                        });
                      }
                    }}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                    style={{
                      accentColor: themeColors.primary
                    }}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <span className="text-sm text-gray-600">View</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRTL}
                    disabled={isFollowing}  // Disable when following leader
                    onChange={(e) => {
                      const newRTL = e.target.checked;
                      setIsRTL(newRTL);
                      localStorage.setItem('scorecardRTL', newRTL.toString());
                      // Broadcast RTL setting change to other participants
                      if (meetingCode && broadcastIssueListUpdate) {
                        broadcastIssueListUpdate({
                          action: 'scorecard-rtl-change',
                          isRTL: newRTL
                        });
                      }
                    }}
                    className="rounded border-gray-300"
                    style={{
                      accentColor: themeColors.primary
                    }}
                  />
                  <span className="text-sm text-gray-600">Right to Left</span>
                </label>
              </div>
            )}
            
            {scorecardMetrics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <BarChart3 className="w-12 h-12 text-gray-400 mb-3" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Scorecard Metrics</h3>
                <p className="text-sm text-gray-500 mb-4 max-w-md">
                  This team hasn't created any scorecard metrics yet. Scorecard metrics help track key performance indicators during meetings.
                </p>
              </div>
            ) : (
              <>
              {(() => {
                // Filter metrics by type based on selected view
                const filteredMetrics = scorecardMetrics.filter(m => m.type === scorecardViewType);
                console.log('Level 10 Scorecard - Passing data to ScorecardTableClean:', {
                  viewType: scorecardViewType,
                  totalMetrics: scorecardMetrics.length,
                  filteredMetrics: filteredMetrics.length,
                  weeklyScoresKeys: Object.keys(weeklyScores),
                  weeklyScoresData: weeklyScores,
                  sampleMetricId: filteredMetrics[0]?.id,
                  sampleMetricScores: filteredMetrics[0]?.id ? weeklyScores[filteredMetrics[0].id] : 'No metrics'
                });
                
                return (
                  <ScorecardTableClean 
                      metrics={filteredMetrics} 
                  weeklyScores={weeklyScores}
                  monthlyScores={monthlyScores}
                  weeklyNotes={weeklyNotes}
                  monthlyNotes={monthlyNotes}
                  type={scorecardViewType}
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
                  scorecardTimePeriodPreference={scorecardTimePeriodPreference}
                  />
                );
              })()}
              </>
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
                    <div className="flex items-center gap-4">
                      {priorities.length > 0 && (
                        <div className="text-center bg-white/50 rounded-xl px-4 py-2 border border-white/30">
                          <span className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                            {Math.round((priorities.filter(p => p.status === 'complete' || p.status === 'completed').length / priorities.length) * 100)}%
                          </span>
                          <p className="text-sm text-slate-600 font-medium">
                            {priorities.filter(p => p.status === 'complete' || p.status === 'completed').length} of {priorities.length} complete
                          </p>
                        </div>
                      )}
                      {(() => {
                        const completedCount = priorities.filter(p => p.status === 'complete' || p.status === 'completed').length;
                        return completedCount > 0 && (
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Set archive data for bulk operation and show confirmation dialog
                              setArchiveData({ 
                                priorityId: null, 
                                priorityTitle: null, 
                                isBulk: true, 
                                count: completedCount 
                              });
                              setShowArchiveDialog(true);
                            }}
                            className="bg-white/80 backdrop-blur-sm border border-orange-200 hover:bg-orange-50 hover:border-orange-300 transition-all"
                          >
                            <Archive className="mr-2 h-4 w-4 text-orange-600" />
                            Archive Completed ({completedCount})
                          </Button>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 shadow-sm font-medium">
                    5 minutes
                  </div>
                </div>
              </CardHeader>
            </Card>
            {priorities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Target className="w-12 h-12 text-gray-400 mb-3" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Quarterly Priorities</h3>
                <p className="text-sm text-gray-500 mb-4 max-w-md">
                  This team hasn't set any quarterly priorities yet. These are the most important goals for the quarter.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  // Combine all priorities (company and individual)
                  const allPriorities = priorities;
                  
                  // Use the rock grouping utility to support both display modes
                  const groupedRocks = groupRocksByPreference(allPriorities, rockDisplayPreference, teamMembers);
                  
                  if (allPriorities.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <Target className="w-12 h-12 text-gray-400 mb-3" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No {labels.priorities_label || 'Quarterly Priorities'}</h3>
                        <p className="text-sm text-gray-500 mb-4 max-w-md">
                          This team hasn't set any {labels.priorities_label?.toLowerCase() || 'quarterly priorities'} yet. These are the most important goals for the quarter.
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-6">
                      <div className="flex justify-end">
                        <Button 
                          variant="outline" 
                          className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90"
                          onClick={() => {
                            setSelectedPriority(null);
                            setShowPriorityDialog(true);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add {labels.priority_singular || 'Rock'}
                        </Button>
                      </div>
                      
                      {groupedRocks.displayMode === 'type' ? (
                        // Grouped by Type: Hybrid Structure
                        <div className="space-y-6">
                          {/* Company Rocks: Single flat list with owner names */}
                          {(() => {
                            const companyRocks = groupedRocks.sections.find(s => s.type === 'company');
                            if (!companyRocks || companyRocks.isEmpty) return null;
                            
                            // Create owner lookup for company rocks
                            const ownerLookup = teamMembers.reduce((acc, member) => {
                              acc[member.id] = member.name || member.first_name + ' ' + member.last_name || 'Unknown';
                              return acc;
                            }, {});
                            
                            return (
                              <Card key="company-rocks" className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 border-2 border-slate-100 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                        <span className="text-slate-700 font-semibold text-sm">🏢</span>
                                      </div>
                                      <div>
                                        <h3 className="text-lg font-bold text-slate-900">{getSectionHeader('company', 'eos')}</h3>
                                        <p className="text-sm text-slate-500">{companyRocks.rocks.length} {labels?.priority_singular || 'Rock'}{companyRocks.rocks.length !== 1 ? 's' : ''}</p>
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
                                      <div className="w-32 text-center">Owner</div>
                                      <div className="w-40 text-center">Milestone Progress</div>
                                      <div className="w-20 text-right">Due By</div>
                                      <div className="w-8"></div>
                                    </div>
                                    
                                    {/* Company Rock Rows */}
                                    {companyRocks.rocks.map(priority => {
                                      const isComplete = priority.status === 'complete' || priority.status === 'completed';
                                      const isOnTrack = priority.status === 'on-track';
                                      const completedMilestones = (priority.milestones || []).filter(m => m.completed).length;
                                      const totalMilestones = (priority.milestones || []).length;
                                      const isExpanded = expandedPriorities[priority.id];
                                      const ownerName = ownerLookup[priority.owner?.id] || priority.owner?.name || 'Unassigned';
                                      
                                      return (
                                        <div key={priority.id} className="border-b border-slate-100 last:border-0">
                                          {/* Main Rock Row */}
                                          <RockContextMenu
                                            priority={priority}
                                            onEdit={handleContextMenuEditPriority}
                                            onChangeStatus={handleContextMenuChangeStatus}
                                            onAddMilestone={handleContextMenuAddMilestone}
                                            onArchive={handleContextMenuArchive}
                                            onDuplicate={handleContextMenuDuplicate}
                                            onCreateLinkedTodo={handleCreateLinkedTodoFromRock}
                                            onCreateLinkedIssue={handleCreateLinkedIssueFromRock}
                                          >
                                              <div className="flex items-center px-3 py-3 hover:bg-slate-50 rounded-lg transition-colors group cursor-context-menu">
                                                {/* Expand Arrow */}
                                                <div className="w-8 flex items-center justify-center">
                                                  {totalMilestones > 0 ? (
                                                    <div 
                                                      className="cursor-pointer"
                                                      onClick={(e) => togglePriorityExpansion(priority.id, e)}
                                                    >
                                                      <ChevronRight 
                                                        className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                                                          isExpanded ? 'rotate-90' : ''
                                                        }`} 
                                                      />
                                                    </div>
                                                  ) : (
                                                    <div className="w-4 h-4" />
                                                  )}
                                                </div>
                                                
                                                {/* Status Indicator */}
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
                                                    setSelectedPriority(priority);
                                                    setShowPriorityDialog(true);
                                                  }}
                                                >
                                                  <span className={`font-medium ${isComplete ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                                    {priority.title}
                                                  </span>
                                                </div>
                                                
                                                {/* Owner */}
                                                <div className="w-32 text-center">
                                                  <span className="text-sm text-slate-600">{ownerName}</span>
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
                                                    <span className="text-sm text-slate-400">-</span>
                                                  )}
                                                </div>
                                                
                                                {/* Due Date */}
                                                <div className="w-20 text-right">
                                                  <span className="text-sm text-slate-600">
                                                    {priority.dueDate ? formatDateSafe(priority.dueDate, 'MMM d') : '-'}
                                                  </span>
                                                </div>
                                                
                                                {/* Actions */}
                                                <div className="w-8 flex items-center justify-center">
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => {
                                                      setSelectedPriority(priority);
                                                      setShowPriorityDialog(true);
                                                    }}
                                                  >
                                                    <Edit className="h-4 w-4 text-slate-400" />
                                                  </Button>
                                                </div>
                                              </div>
                                          </RockContextMenu>
                                          
                                          {/* Expanded Milestones Section */}
                                          {isExpanded && (
                                            <div className="ml-12 mr-4 mb-3 p-3 bg-slate-50 rounded-lg">
                                              {console.log('Expanded priority:', priority.id, 'Milestones:', priority.milestones)}
                                              <div className="space-y-2">
                                                {(priority.milestones || []).map((milestone) => (
                                                  <div key={milestone.id} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                                                    <input
                                                      type="checkbox"
                                                      checked={milestone.completed}
                                                      onChange={(e) => {
                                                        e.stopPropagation(); // Prevent event bubbling to parent containers
                                                        console.log('🔥 MILESTONE CHECKBOX CLICKED!', { priorityId: priority.id, milestoneId: milestone.id, checked: e.target.checked });
                                                        handleUpdateMilestone(priority.id, milestone.id, e.target.checked);
                                                      }}
                                                      className="flex-shrink-0 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                                    />
                                                    <span className={`text-sm flex-1 ${milestone.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                                      {milestone.title}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                      {milestone.dueDate ? formatDateSafe(milestone.dueDate, 'MMM d') : ''}
                                                    </span>
                                                  </div>
                                                ))}
                                                
                                                {/* Add milestone button section if no milestones */}
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
                                                    <Input
                                                      type="date"
                                                      value={newMilestone.dueDate}
                                                      onChange={(e) => setNewMilestone(prev => ({ ...prev, dueDate: e.target.value }))}
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
                            );
                          })()}
                          
                          {/* Individual Rocks: Person-grouped cards */}
                          {(() => {
                            const individualRocks = groupedRocks.sections.find(s => s.type === 'individual');
                            if (!individualRocks || individualRocks.isEmpty) return null;
                            
                            // Create owner lookup and group individual rocks by owner
                            const ownerLookup = teamMembers.reduce((acc, member) => {
                              acc[member.id] = member.name || member.first_name + ' ' + member.last_name || 'Unknown';
                              return acc;
                            }, {});
                            
                            const grouped = individualRocks.rocks.reduce((acc, rock) => {
                              const ownerId = rock.owner?.id || 'unassigned';
                              const ownerName = ownerLookup[ownerId] || rock.owner?.name || 'Unassigned';
                              
                              if (!acc[ownerId]) {
                                acc[ownerId] = {
                                  id: ownerId,
                                  name: ownerName,
                                  priorities: []
                                };
                              }
                              
                              acc[ownerId].priorities.push(rock);
                              return acc;
                            }, {});
                            
                            const owners = Object.values(grouped).sort((a, b) => {
                              if (a.id === 'unassigned') return 1;
                              if (b.id === 'unassigned') return -1;
                              return (a.name || "").localeCompare(b.name || "");
                            });
                            
                            return owners.map(owner => (
                              <Card key={owner.id} className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                  <div 
                                    className="flex items-center justify-between cursor-pointer hover:bg-slate-50 -mx-4 -my-2 px-4 py-2 rounded-lg transition-colors"
                                    onClick={() => toggleIndividualPriorities(owner.id)}
                                  >
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
                                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${
                                      expandedSections.individualPriorities[owner.id] ? 'rotate-180' : ''
                                    }`} />
                                  </div>
                                </CardHeader>
                                {expandedSections.individualPriorities[owner.id] && (
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
                                          <RockContextMenu
                                            priority={priority}
                                            onEdit={handleContextMenuEditPriority}
                                            onChangeStatus={handleContextMenuChangeStatus}
                                            onAddMilestone={handleContextMenuAddMilestone}
                                            onArchive={handleContextMenuArchive}
                                            onDuplicate={handleContextMenuDuplicate}
                                            onCreateLinkedTodo={handleCreateLinkedTodoFromRock}
                                            onCreateLinkedIssue={handleCreateLinkedIssueFromRock}
                                          >
                                              <div className="flex items-center px-3 py-3 hover:bg-slate-50 rounded-lg transition-colors group cursor-context-menu">
                                                {/* Expand Arrow */}
                                                <div className="w-8 flex items-center justify-center">
                                                  {totalMilestones > 0 ? (
                                                    <div 
                                                      className="cursor-pointer"
                                                      onClick={(e) => togglePriorityExpansion(priority.id, e)}
                                                    >
                                                      <ChevronRight 
                                                        className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                                                          isExpanded ? 'rotate-90' : ''
                                                        }`} 
                                                      />
                                                    </div>
                                                  ) : (
                                                    <div className="w-4 h-4" />
                                                  )}
                                                </div>
                                                
                                                {/* Status Indicator */}
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
                                                    setSelectedPriority(priority);
                                                    setShowPriorityDialog(true);
                                                  }}
                                                >
                                                  <span className={`font-medium ${isComplete ? 'line-through text-slate-400' : 'text-slate-900'}`}>
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
                                                    <span className="text-sm text-slate-400">-</span>
                                                  )}
                                                </div>
                                                
                                                {/* Due Date */}
                                                <div className="w-20 text-right">
                                                  <span className="text-sm text-slate-600">
                                                    {priority.dueDate ? formatDateSafe(priority.dueDate, 'MMM d') : '-'}
                                                  </span>
                                                </div>
                                                
                                                {/* Actions */}
                                                <div className="w-8 flex items-center justify-center">
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => {
                                                      setSelectedPriority(priority);
                                                      setShowPriorityDialog(true);
                                                    }}
                                                  >
                                                    <Edit className="h-4 w-4 text-slate-400" />
                                                  </Button>
                                                </div>
                                              </div>
                                          </RockContextMenu>
                                          
                                          {/* Expanded Milestones Section */}
                                          {isExpanded && (
                                            <div className="ml-12 mr-4 mb-3 p-3 bg-slate-50 rounded-lg">
                                              {console.log('Expanded priority:', priority.id, 'Milestones:', priority.milestones)}
                                              <div className="space-y-2">
                                                {(priority.milestones || []).map((milestone) => (
                                                  <div key={milestone.id} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                                                    <input
                                                      type="checkbox"
                                                      checked={milestone.completed}
                                                      onChange={(e) => {
                                                        e.stopPropagation(); // Prevent event bubbling to parent containers
                                                        console.log('🔥 MILESTONE CHECKBOX CLICKED!', { priorityId: priority.id, milestoneId: milestone.id, checked: e.target.checked });
                                                        handleUpdateMilestone(priority.id, milestone.id, e.target.checked);
                                                      }}
                                                      className="flex-shrink-0 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                                    />
                                                    <span className={`text-sm flex-1 ${milestone.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                                      {milestone.title}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                      {milestone.dueDate ? formatDateSafe(milestone.dueDate, 'MMM d') : ''}
                                                    </span>
                                                  </div>
                                                ))}
                                                
                                                {/* Add milestone button section if no milestones */}
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
                                                    <Input
                                                      type="date"
                                                      value={newMilestone.dueDate}
                                                      onChange={(e) => setNewMilestone(prev => ({ ...prev, dueDate: e.target.value }))}
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
                                )}
                              </Card>
                            ));
                          })()}
                        </div>
                      ) : (
                        // Grouped by Owner: Use existing owner-based grouping
                        Object.values(groupedRocks.byOwner || {}).sort((a, b) => {
                          if (a.id === 'unassigned') return 1;
                          if (b.id === 'unassigned') return -1;
                          return (a.name || "").localeCompare(b.name || "");
                        }).map(owner => (
                          <Card key={owner.id} className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-3">
                              <div 
                                className="flex items-center justify-between cursor-pointer hover:bg-slate-50 -mx-4 -my-2 px-4 py-2 rounded-lg transition-colors"
                                onClick={() => toggleIndividualPriorities(owner.id)}
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10 border-2 border-slate-100">
                                    <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 font-semibold">
                                      {owner.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h3 className="text-lg font-bold text-slate-900">{owner.name}</h3>
                                    <p className="text-sm text-slate-500">{owner.rocks.length} {labels?.priority_singular || 'Rock'}{owner.rocks.length !== 1 ? 's' : ''}</p>
                                  </div>
                                </div>
                                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${
                                  expandedSections.individualPriorities[owner.id] ? 'rotate-180' : ''
                                }`} />
                              </div>
                            </CardHeader>
                            {expandedSections.individualPriorities[owner.id] && (
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
                                {owner.rocks.map(priority => {
                                const isComplete = priority.status === 'complete' || priority.status === 'completed';
                                const isOnTrack = priority.status === 'on-track';
                                const completedMilestones = (priority.milestones || []).filter(m => m.completed).length;
                                const totalMilestones = (priority.milestones || []).length;
                                const isExpanded = expandedPriorities[priority.id];
                                
                                return (
                                  <div key={priority.id} className="border-b border-slate-100 last:border-0">
                                    {/* Main Rock Row */}
                                    <RockContextMenu
                                      priority={priority}
                                      onEdit={handleContextMenuEditPriority}
                                      onChangeStatus={handleContextMenuChangeStatus}
                                      onAddMilestone={handleContextMenuAddMilestone}
                                      onArchive={handleContextMenuArchive}
                                      onDelete={handleContextMenuDelete}
                                      onDuplicate={handleContextMenuDuplicate}
                                      onCreateLinkedTodo={handleCreateLinkedTodoFromRock}
                                      onCreateLinkedIssue={handleCreateLinkedIssueFromRock}
                                    >
                                        <div className="flex items-center px-3 py-3 hover:bg-slate-50 rounded-lg transition-colors group cursor-context-menu">
                                      {/* Expand Arrow - Only show if there are milestones */}
                                      <div className="w-8 flex items-center justify-center">
                                        {totalMilestones > 0 ? (
                                          <div 
                                            className="cursor-pointer"
                                            onClick={(e) => togglePriorityExpansion(priority.id, e)}
                                          >
                                            <ChevronRight 
                                              className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                                                isExpanded ? 'rotate-90' : ''
                                              }`} 
                                            />
                                          </div>
                                        ) : (
                                          <div className="w-4 h-4" /> /* Empty space to maintain alignment */
                                        )}
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
                                          setSelectedPriority(priority);
                                          setShowPriorityDialog(true);
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
                                          <span className="text-sm text-slate-400">-</span>
                                        )}
                                      </div>
                                      
                                      {/* Due Date */}
                                      <div className="w-20 text-right">
                                        <span className="text-sm text-slate-600">
                                          {priority.dueDate ? formatDateSafe(priority.dueDate, 'MMM d') : '-'}
                                        </span>
                                      </div>
                                      
                                      {/* Actions */}
                                      <div className="w-8 flex items-center justify-center">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={() => {
                                            setSelectedPriority(priority);
                                            setShowPriorityDialog(true);
                                          }}
                                        >
                                          <Edit className="h-4 w-4 text-slate-400" />
                                        </Button>
                                      </div>
                                        </div>
                                    </RockContextMenu>
                                    
                                    {/* Expanded Milestones Section - MOVED OUTSIDE ContextMenu */}
                                    {isExpanded && (
                                      <div className="ml-12 mr-4 mb-3 p-3 bg-slate-50 rounded-lg">
                                        {console.log('Expanded priority:', priority.id, 'Milestones:', priority.milestones)}
                                        <div className="space-y-2">
                                          {(priority.milestones || []).map((milestone) => (
                                            <div key={milestone.id} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                                              <input
                                                type="checkbox"
                                                checked={milestone.completed}
                                                onChange={(e) => {
                                                  e.stopPropagation(); // Prevent event bubbling to parent containers
                                                  console.log('🔥 MILESTONE CHECKBOX CLICKED!', { priorityId: priority.id, milestoneId: milestone.id, checked: e.target.checked });
                                                  handleUpdateMilestone(priority.id, milestone.id, e.target.checked);
                                                }}
                                                className="flex-shrink-0 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                              />
                                              <span className={`text-sm flex-1 ${milestone.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                                {milestone.title}
                                              </span>
                                              <span className="text-xs text-slate-500">
                                                {milestone.dueDate ? formatDateSafe(milestone.dueDate, 'MMM d') : ''}
                                              </span>
                                            </div>
                                          ))}
                                          
                                          {/* Add milestone button section if no milestones */}
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
                                              <Input
                                                type="date"
                                                value={newMilestone.dueDate}
                                                onChange={(e) => setNewMilestone(prev => ({ ...prev, dueDate: e.target.value }))}
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
                          )}
                        </Card>
                        ))
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        );

      case 'headlines':
        const orgId = user?.organizationId || user?.organization_id;
        return (
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                    <div className="p-2 rounded-xl" style={{ background: `linear-gradient(135deg, ${themeColors.primary}20 0%, ${themeColors.secondary}20 100%)` }}>
                      <Newspaper className="h-5 w-5" style={{ color: themeColors.primary }} />
                    </div>
                    Customer & Employee Headlines
                  </CardTitle>
                  <CardDescription className="mt-2 text-slate-600 font-medium">Share important updates</CardDescription>
                </div>
                <div className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 shadow-sm font-medium">
                  5 minutes
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 px-6 pb-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-slate-600 text-lg leading-relaxed">
                    Share critical information about customers and employees that the team needs to know.
                  </p>
                  <div className="flex items-center gap-3">
                    {/* Add Headline Button */}
                    <Button
                      onClick={() => setShowHeadlineDialog(true)}
                      variant="outline"
                      className="text-white border-0 hover:opacity-90 transition-opacity flex items-center gap-2"
                      style={{
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add Headline
                    </Button>
                    
                    {/* Send Cascading Message Button */}
                    <Button
                      onClick={() => setShowCascadeDialog(true)}
                      variant="outline"
                      className="text-white border-0 hover:opacity-90 transition-opacity flex items-center gap-2"
                      style={{
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                      }}
                    >
                      <Send className="h-4 w-4" />
                      Send Cascading Message
                    </Button>
                    {(headlines.customer.length > 0 || headlines.employee.length > 0) && (
                    <Button
                      variant="outline"
                      className="text-white border-0 hover:opacity-90 transition-opacity"
                      style={{
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                      }}
                      onClick={async () => {
                        try {
                          const totalCount = headlines.customer.length + headlines.employee.length;
                          const effectiveTeamId = getEffectiveTeamId(teamId, user);
                          await headlinesService.archiveHeadlines(effectiveTeamId);
                          await fetchHeadlines();
                          setSuccess(`Successfully archived ${totalCount} headline${totalCount !== 1 ? 's' : ''}`);
                        } catch (error) {
                          console.error('Failed to archive headlines:', error);
                          setError('Failed to archive headlines');
                        }
                      }}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archive Headlines ({headlines.customer.length + headlines.employee.length})
                    </Button>
                  )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Headlines */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <div className="p-1.5 rounded-lg" style={{ background: `linear-gradient(135deg, ${themeColors.primary}15 0%, ${themeColors.secondary}15 100%)` }}>
                        <Users className="h-4 w-4" style={{ color: themeColors.primary }} />
                      </div>
                      Customer Headlines ({headlines.customer.length})
                    </h4>
                    {headlines.customer.length > 0 ? (
                      <div className="space-y-2">
                        {headlines.customer.map(headline => (
                          <HeadlineItem
                            key={headline.id}
                            headline={headline}
                            teamId={teamId}
                            orgId={orgId}
                            onIssueCreated={fetchIssuesData}
                            themeColors={themeColors}
                            type="Customer"
                            showEditDelete={false}
                            user={user}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">No customer headlines</p>
                    )}
                  </div>

                  {/* Employee Headlines */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <div className="p-1.5 rounded-lg" style={{ background: `linear-gradient(135deg, ${themeColors.primary}15 0%, ${themeColors.secondary}15 100%)` }}>
                        <Building2 className="h-4 w-4" style={{ color: themeColors.primary }} />
                      </div>
                      Employee Headlines ({headlines.employee.length})
                    </h4>
                    {headlines.employee.length > 0 ? (
                      <div className="space-y-2">
                        {headlines.employee.map(headline => (
                          <HeadlineItem
                            key={headline.id}
                            headline={headline}
                            teamId={teamId}
                            orgId={orgId}
                            onIssueCreated={fetchIssuesData}
                            themeColors={themeColors}
                            type="Employee"
                            showEditDelete={false}
                            user={user}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">No employee headlines</p>
                    )}
                  </div>
                </div>

                {/* Cascading Messages from Other Teams */}
                {cascadedMessages.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <div className="p-1.5 rounded-lg" style={{ background: `linear-gradient(135deg, ${themeColors.primary}15 0%, ${themeColors.secondary}15 100%)` }}>
                          <MessageSquare className="h-4 w-4" style={{ color: themeColors.primary }} />
                        </div>
                        Cascading Messages from Other Teams ({cascadedMessages.length})
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-white border-0 hover:opacity-90 transition-opacity"
                        style={{
                          background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                        }}
                        onClick={async () => {
                          try {
                            const orgId = user?.organizationId || user?.organization_id;
                            const effectiveTeamId = getEffectiveTeamId(teamId, user);
                            await cascadingMessagesService.archiveCascadingMessages(orgId, effectiveTeamId);
                            await fetchCascadedMessages();
                            setSuccess(`Successfully archived ${cascadedMessages.length} cascading message${cascadedMessages.length !== 1 ? 's' : ''}`);
                          } catch (error) {
                            console.error('Failed to archive cascading messages:', error);
                            setError('Failed to archive cascading messages');
                          }
                        }}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Archive Messages ({cascadedMessages.length})
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {cascadedMessages.map(message => (
                        <div key={message.id} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                          <p className="text-sm font-medium text-slate-900 leading-relaxed">{message.message}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-xs text-slate-600">
                              From: {message.from_team_name || 'Unknown Team'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {format(new Date(message.created_at), 'MMM d, h:mm a')}
                            </p>
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

      case 'todo-list':
        return (
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                    <div className="p-2 rounded-xl" style={{ background: `linear-gradient(135deg, ${themeColors.primary}20 0%, ${themeColors.secondary}20 100%)` }}>
                      <ListTodo className="h-5 w-5" style={{ color: themeColors.primary }} />
                    </div>
                    To-do List Review
                  </CardTitle>
                  <CardDescription className="mt-2 text-slate-600 font-medium">Review action items</CardDescription>
                </div>
                <div className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 shadow-sm font-medium">
                  5 minutes
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 px-6 pb-6">
              {(() => {
                // Group todos by assignee like priorities are grouped by owner
                const todosByAssignee = {};
                
                todos.forEach(todo => {
                  // Handle multi-assignee todos
                  if (todo.assignees && todo.assignees.length > 0) {
                    // For multi-assignee todos, add to each assignee's group
                    todo.assignees.forEach(assignee => {
                      const assigneeId = assignee.user_id || assignee.id;
                      const assigneeName = `${assignee.first_name} ${assignee.last_name}`;
                      
                      if (!todosByAssignee[assigneeId]) {
                        todosByAssignee[assigneeId] = {
                          id: assigneeId,
                          name: assigneeName,
                          todos: []
                        };
                      }
                      todosByAssignee[assigneeId].todos.push({
                        ...todo,
                        isMultiAssignee: todo.assignees.length > 1,
                        allAssignees: todo.assignees
                      });
                    });
                  } else {
                    // Handle single assignee todos (backward compatibility)
                    const assigneeId = todo.assigned_to?.id || 'unassigned';
                    const assigneeName = todo.assigned_to ? 
                      `${todo.assigned_to.first_name} ${todo.assigned_to.last_name}` : 
                      'Unassigned';
                    
                    if (!todosByAssignee[assigneeId]) {
                      todosByAssignee[assigneeId] = {
                        id: assigneeId,
                        name: assigneeName,
                        todos: []
                      };
                    }
                    todosByAssignee[assigneeId].todos.push(todo);
                  }
                });
                
                // Convert to array and sort by name
                const assignees = Object.values(todosByAssignee).sort((a, b) => {
                  if (a.id === 'unassigned') return 1;
                  if (b.id === 'unassigned') return -1;
                  return (a.name || "").localeCompare(b.name || "");
                });
                
                if (todos.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <CheckSquare className="w-12 h-12 text-gray-400 mb-3" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No To-Dos</h3>
                      <p className="text-sm text-gray-500 mb-4 max-w-md">
                        This team doesn't have any to-dos yet. To-dos are action items that need to be completed.
                      </p>
                    </div>
                  );
                }
                
                const completedCount = todos.filter(todo => todo.status === 'complete' || todo.status === 'completed').length;
                
                return (
                  <div className="space-y-6">
                    {completedCount > 0 && (
                      <div className="flex justify-end">
                        <Button 
                          variant="outline" 
                          className="text-white border-0 hover:opacity-90 transition-opacity"
                          style={{
                            background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                          }}
                           onClick={async () => {
                             try {
                               const count = completedCount;
                               await todosService.archiveDoneTodos();
                               await fetchTodosData();
                               setSuccess(`Successfully archived ${count} completed to-do${count !== 1 ? 's' : ''}`);
                               
                               // Broadcast archive-done action to other meeting participants
                               if (meetingCode && broadcastTodoUpdate) {
                                 broadcastTodoUpdate({
                                   action: 'archive-done'
                                 });
                               }
                             } catch (error) {
                               console.error('Failed to archive todos:', error);
                               setError('Failed to archive completed to-dos');
                             }
                           }}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive Done ({completedCount})
                        </Button>
                      </div>
                    )}
                    
                    {assignees.map(assignee => (
                      <Card key={assignee.id} className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                          <div 
                            className="flex items-center justify-between cursor-pointer hover:bg-slate-50 -mx-4 -my-2 px-4 py-2 rounded-lg transition-colors"
                            onClick={() => toggleTodoAssignees(assignee.id)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-slate-100">
                                <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 font-semibold">
                                  {assignee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="text-lg font-bold text-slate-900">{assignee.name}</h3>
                                <p className="text-sm text-slate-500">{assignee.todos.length} To-Do{assignee.todos.length !== 1 ? 's' : ''}</p>
                              </div>
                            </div>
                            <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${
                              expandedSections.todoAssignees[assignee.id] ? 'rotate-180' : ''
                            }`} />
                          </div>
                        </CardHeader>
                        {expandedSections.todoAssignees[assignee.id] && (
                        <CardContent className="pt-0">
                          <div className="space-y-1">
                            {/* Header Row */}
                            <div className="flex items-center px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100">
                              <div className="w-10">Status</div>
                              <div className="flex-1 ml-3">Title</div>
                              <div className="w-20 text-right">Due Date</div>
                              <div className="w-8"></div>
                            </div>
                            
                            {/* To-Do Rows */}
                            {assignee.todos.map((todo, index) => {
                              const isComplete = todo.status === 'complete' || todo.status === 'completed';
                              const isExpanded = expandedPriorities[todo.id]; // Reuse expansion state
                              const overdue = isOverdue(todo);
                              
                              return (
                                <TodoContextMenu
                                  key={todo.id}
                                  todo={todo}
                                  onEdit={handleEditTodo}
                                  onDelete={handleDeleteTodo}
                                  onToggleComplete={handleToggleTodoComplete}
                                  onReassign={handleReassignTodo}
                                  onChangeDueDate={handleChangeTodoDueDate}
                                  onChangePriority={handleChangeTodoPriority}
                                  onDuplicate={handleDuplicateTodo}
                                  onCreateLinkedIssue={handleCreateLinkedIssue}
                                  hidePriorityOptions={true}
                                  hideDeleteOption={true}
                                >
                                  <div className={`border-b border-slate-100 last:border-0 cursor-context-menu transition-colors rounded ${
                                    overdue ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
                                  }`}>
                                    {/* Main To-Do Row */}
                                    <div className="flex items-center px-3 py-3 group">
                                      {/* Status Indicator */}
                                      <div className="w-10 flex items-center relative">
                                        <div 
                                          className="flex items-center justify-center w-7 h-7 rounded-full cursor-pointer hover:scale-110 transition-transform"
                                          style={{
                                            backgroundColor: isComplete ? themeColors.primary + '20' : 
                                                           todo.status === 'in-progress' ? themeColors.primary : 
                                                           'transparent',
                                            border: `2px solid ${isComplete ? themeColors.primary : '#E2E8F0'}`
                                          }}
                                          onContextMenu={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                          }}
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            
                                            try {
                                              const newStatus = isComplete ? 'incomplete' : 'complete';
                                              await todosService.updateTodo(todo.id, { status: newStatus });
                                              
                                              // Update local state immediately instead of refetching
                                              setTodos(prevTodos => 
                                                prevTodos.map(t => {
                                                  if (t.id !== todo.id) return t;
                                                  
                                                  // For multi-assignee todos, update the specific assignee's completion
                                                  if (todo._currentAssignee && t.assignees) {
                                                    const updatedAssignees = t.assignees.map(assignee => 
                                                      assignee.id === todo._currentAssignee.id
                                                        ? { ...assignee, completed: !isComplete, completed_at: !isComplete ? new Date().toISOString() : null }
                                                        : assignee
                                                    );
                                                    return { ...t, assignees: updatedAssignees };
                                                  }
                                                  
                                                  // For single-assignee todos, update the main status
                                                  return { ...t, status: newStatus };
                                                })
                                              );
                                              
                                              // Broadcast update to other meeting participants
                                              if (meetingCode && broadcastTodoUpdate) {
                                                broadcastTodoUpdate({
                                                  action: 'status',
                                                  todoId: todo.id,
                                                  status: newStatus,
                                                  completed: newStatus === 'complete',
                                                  assigneeId: todo._currentAssignee?.id
                                                });
                                              }
                                            } catch (error) {
                                              console.error('Failed to update todo status:', error);
                                            }
                                          }}
                                        >
                                          {isComplete ? (
                                            <CheckCircle className="h-4 w-4" style={{ color: themeColors.primary }} />
                                          ) : (
                                            <div className="w-4 h-4" /> /* Empty space - just the circle border */
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Title */}
                                      <div 
                                        className="flex-1 ml-3 cursor-pointer"
                                        onClick={() => {
                                          setEditingTodo(todo);
                                          setShowTodoDialog(true);
                                        }}
                                      >
                                        <div className={`font-semibold text-slate-900 leading-tight ${isComplete ? 'line-through opacity-75' : ''}`}>
                                          {todo.title}
                                          {todo.isMultiAssignee && (
                                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                              Also: {todo.allAssignees
                                                .filter(a => (a.user_id || a.id) !== assignee.id)
                                                .map(a => `${a.first_name} ${a.last_name[0]}.`)
                                                .join(', ')}
                                            </span>
                                          )}
                                        </div>
                                        {todo.description && (
                                          <p className="text-sm text-slate-600 mt-1 line-clamp-1">
                                            {todo.description}
                                          </p>
                                        )}
                                      </div>
                                      
                                      {/* Due Date */}
                                      <div className="w-20 text-right">
                                        {todo.due_date && (
                                          <span className="text-sm text-slate-600">
                                            {formatDateSafe(todo.due_date, 'MMM d')}
                                          </span>
                                        )}
                                      </div>
                                      
                                      {/* Actions */}
                                      <div className="w-8 flex items-center justify-center">
                                        <button
                                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 rounded"
                                          onClick={() => {
                                            setEditingTodo(todo);
                                            setShowTodoDialog(true);
                                          }}
                                        >
                                          <Edit className="h-3 w-3 text-slate-600" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </TodoContextMenu>
                              );
                            })}
                          </div>
                        </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        );

      case 'issues':
        return (
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                    <div className="p-2 rounded-xl" style={{ background: `linear-gradient(135deg, ${themeColors.primary}20 0%, ${themeColors.secondary}20 100%)` }}>
                      <AlertTriangle className="h-5 w-5" style={{ color: themeColors.primary }} />
                    </div>
                    Identify Discuss Solve
                  </CardTitle>
                  <CardDescription className="mt-2 text-slate-600 font-medium">Solve the most important issues</CardDescription>
                </div>
                <div className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 shadow-sm font-medium">
                  60 minutes
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 px-6 pb-6">
              <div className="border border-white/30 bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4 shadow-sm">
                <p className="text-slate-700 text-center">
                  <span className="font-semibold">Quick voting:</span> Everyone votes on the most important issues. Then discuss and solve the top-voted issues together.
                </p>
              </div>
              
              {/* Timeline Tabs and Send Cascading Message Button */}
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-2 inline-flex shadow-sm">
                  <div className="flex gap-1">
                  <button
                    onClick={() => setIssueTimeline('short_term')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                      issueTimeline === 'short_term'
                        ? 'text-white shadow-lg'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    style={{
                      ...(issueTimeline === 'short_term' ? {
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                      } : {})
                    }}
                  >
                    <Target className="h-4 w-4" />
                    Short Term
                    <span className="text-sm opacity-80">({shortTermIssues?.length || 0})</span>
                  </button>
                  <button
                    onClick={() => setIssueTimeline('long_term')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                      issueTimeline === 'long_term'
                        ? 'text-white shadow-lg'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    style={{
                      ...(issueTimeline === 'long_term' ? {
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.accent} 100%)`
                      } : {})
                    }}
                  >
                    <TrendingUp className="h-4 w-4" />
                    Long Term
                    <span className="text-sm opacity-80">({longTermIssues?.length || 0})</span>
                  </button>
                  </div>
                </div>
                
                {/* Send Cascading Message Button */}
                <Button
                  onClick={() => setShowCascadeDialog(true)}
                  variant="outline"
                  className="text-white border-0 hover:opacity-90 transition-opacity flex items-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                  }}
                >
                  <Send className="h-4 w-4" />
                  Send Cascading Message
                </Button>
              </div>

{(() => {
                const issues = issueTimeline === 'short_term' ? (shortTermIssues || []) : (longTermIssues || []);

                if (issues.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <AlertCircle className="w-12 h-12 text-gray-400 mb-3" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No Issues</h3>
                      <p className="text-sm text-gray-500 mb-4 max-w-md">
                        This team doesn't have any issues to discuss. Issues are problems or challenges that need to be identified, discussed, and solved.
                      </p>
                    </div>
                  );
                }

                const closedCount = issues.filter(issue => 
                  issue.status === 'solved' || issue.status === 'completed' || 
                  issue.status === 'closed' || issue.status === 'resolved'
                ).length;
                
                return (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-slate-600">
                        <GripVertical className="h-4 w-4 inline mr-2 text-slate-400" />
                        Drag to reorder by priority
                      </p>
                      {closedCount > 0 && (
                        <Button 
                          variant="outline" 
                          className="text-white border-0 hover:opacity-90 transition-opacity"
                          style={{
                            background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                          }}
                          onClick={async () => {
                            try {
                              const count = closedCount;
                              await issuesService.archiveClosedIssues(issueTimeline);
                              await fetchIssuesData();
                              setSuccess(`Successfully archived ${count} closed issue${count !== 1 ? 's' : ''}`);
                              
                              // Broadcast archive-closed action to other meeting participants
                              if (meetingCode && broadcastIssueListUpdate) {
                                broadcastIssueListUpdate({
                                  action: 'archive-closed',
                                  timeline: issueTimeline
                                });
                              }
                            } catch (error) {
                              console.error('Failed to archive issues:', error);
                              setError('Failed to archive closed issues');
                            }
                          }}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive Solved ({closedCount})
                        </Button>
                      )}
                    </div>
                    
                    <Card className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow">
                      <CardContent className="p-0">
                        <div className="space-y-1">
                          {/* Header Row */}
                          <div className="flex items-center px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                            <div className="w-8">Drag</div>
                            <div className="w-10 ml-2">Status</div>
                            <div className="w-8 ml-2">#</div>
                            <div className="flex-1 ml-3">Issue</div>
                            <div className="w-32 text-center">Owner</div>
                            <div className="w-24 text-center">Created</div>
                            <div className="w-20 text-center">Votes</div>
                            <div className="w-8"></div>
                          </div>
                          
                          {/* Issue Rows */}
                          {issues.map((issue, index) => {
                            const isSolved = issue.status === 'solved' || issue.status === 'completed' || issue.status === 'closed' || issue.status === 'resolved';
                            const isExpanded = expandedPriorities[issue.id];
                            const isDragging = draggedIndex === index;
                            const isDragOver = dragOverIndex === index;
                            const isTopThree = index < 3;  // Top 3 issues get blue border
                            
                            return (
                              <IssueContextMenu
                                key={issue.id}
                                issue={issue}
                                onEdit={handleEditIssue}
                                onMarkSolved={handleMarkIssueSolved}
                                onCreateTodo={handleCreateTodoFromIssue}
                                onVote={handleVoteOnIssue}
                                onMoveToLongTerm={issueTimeline === 'short_term' ? handleMoveIssueToLongTerm : undefined}
                                onMoveToShortTerm={issueTimeline === 'long_term' ? handleMoveIssueToShortTerm : undefined}
                                onMoveToAnotherTeam={handleMoveIssueToAnotherTeam}
                                onArchive={handleArchiveIssue}
                                currentUserId={user?.id}
                              >
                                <div 
                                  className="border-b border-slate-100 last:border-0 cursor-context-menu hover:bg-gray-50 transition-colors rounded"
                                  style={{
                                    borderLeftWidth: isTopThree ? '4px' : '0px',
                                    borderLeftColor: isTopThree ? '#3B82F6' : 'transparent',
                                    borderLeftStyle: 'solid'
                                  }}
                                >
                                  {/* Main Issue Row */}
                                  <div 
                                    className={`flex items-center px-3 py-3 group ${
                                      isDragging ? 'opacity-50' : ''
                                    } ${isDragOver ? 'ring-2 ring-blue-400' : ''}`}
                                    onDragOver={handleDragOver}
                                    onDragEnter={(e) => handleDragEnter(e, index)}
                                    onDrop={(e) => handleDrop(e, index)}
                                  >
                                    {/* Drag Handle */}
                                    <div 
                                      className="w-8 flex items-center justify-center cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
                                      draggable="true"
                                      onDragStart={(e) => handleDragStart(e, issue, index)}
                                      onDragEnd={handleDragEnd}
                                    >
                                      <GripVertical className="h-4 w-4 text-slate-400" />
                                    </div>
                                    
                                    {/* Status Checkbox */}
                                    <div className="w-10 ml-2 flex items-center relative">
                                      <div 
                                        className="flex items-center justify-center w-7 h-7 rounded-full cursor-pointer hover:scale-110 transition-transform"
                                        style={{
                                          backgroundColor: isSolved ? themeColors.primary + '20' : 'transparent',
                                          border: `2px solid ${isSolved ? themeColors.primary : '#E2E8F0'}`
                                        }}
                                        onClick={async () => {
                                          try {
                                            const newStatus = isSolved ? 'open' : 'closed';
                                            await handleStatusChange(issue.id, newStatus);
                                          } catch (error) {
                                            console.error('Failed to update issue status:', error);
                                          }
                                        }}
                                      >
                                        {isSolved ? (
                                          <CheckCircle className="h-4 w-4" style={{ color: themeColors.primary }} />
                                        ) : null}
                                      </div>
                                    </div>
                                    
                                    {/* Issue Number */}
                                    <div className="w-8 ml-2 text-sm font-medium text-slate-600">
                                      {index + 1}.
                                    </div>
                                    
                                    {/* Issue Title */}
                                    <div className="flex-1 ml-3">
                                      <div className="flex items-center">
                                        <div 
                                          className={`flex-1 font-semibold text-slate-900 leading-tight cursor-pointer hover:text-blue-600 transition-colors ${
                                            isSolved ? 'line-through opacity-75' : ''
                                          }`}
                                          onClick={() => {
                                            setEditingIssue(issue);
                                            setShowIssueDialog(true);
                                          }}
                                        >
                                          {issue.title}
                                          {issue.attachments && issue.attachments.length > 0 && (
                                            <Paperclip className="h-4 w-4 inline ml-2 text-slate-400" />
                                          )}
                                        </div>
                                        {issue.description && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              togglePriorityExpansion(issue.id, e);
                                            }}
                                            className="ml-2 p-1 hover:bg-slate-100 rounded transition-colors"
                                          >
                                            <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Owner */}
                                    <div className="w-32 text-center">
                                      <span className="text-sm text-slate-600">
                                        {issue.owner_name || issue.owner || 'Unassigned'}
                                      </span>
                                    </div>
                                    
                                    {/* Created Date */}
                                    <div className="w-24 text-center">
                                      <span className="text-sm text-slate-600">
                                        {new Date(issue.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </span>
                                    </div>
                                    
                                    {/* Voting */}
                                    <div className="w-20 text-center">
                                      <button
                                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors mx-auto"
                                        onClick={() => handleVote(issue.id, !issue.user_has_voted)}
                                      >
                                        <ThumbsUp className="h-3 w-3 text-slate-600" />
                                        <span className="text-xs font-medium text-slate-700">
                                          {issue.vote_count || 0}
                                        </span>
                                      </button>
                                    </div>
                                    
                                    {/* Actions */}
                                    <div className="w-8 flex items-center justify-center">
                                      <button
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 rounded"
                                        onClick={() => handleEditIssue(issue)}
                                      >
                                        <Edit className="h-3 w-3 text-slate-600" />
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* Expanded Details */}
                                  {isExpanded && issue.description && (
                                    <div className="px-16 pb-3">
                                      <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                                        {issue.description}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </IssueContextMenu>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
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
                    
                    // Sort todos based on selection
                    const sortedTodos = [...openTodos].sort((a, b) => {
                      if (todoSortBy === 'due_date') {
                        if (!a.due_date && !b.due_date) return 0;
                        if (!a.due_date) return 1;
                        if (!b.due_date) return -1;
                        return new Date(a.due_date) - new Date(b.due_date);
                      } else if (todoSortBy === 'assignee') {
                        const aName = a.assigned_to ? `${a.assigned_to.first_name} ${a.assigned_to.last_name}` : 'Unassigned';
                        const bName = b.assigned_to ? `${b.assigned_to.first_name} ${b.assigned_to.last_name}` : 'Unassigned';
                        return (aName || "").localeCompare(bName || "");
                      }
                      return 0;
                    });
                    
                    // Group by assignee if sorting by assignee
                    if (todoSortBy === 'assignee') {
                      const todosByAssignee = sortedTodos.reduce((acc, todo) => {
                        // Handle multi-assignee todos
                        if (todo.assignees && todo.assignees.length > 0) {
                          todo.assignees.forEach(assignee => {
                            const assigneeName = `${assignee.first_name} ${assignee.last_name}`;
                            if (!acc[assigneeName]) {
                              acc[assigneeName] = [];
                            }
                            acc[assigneeName].push({
                              ...todo,
                              isMultiAssignee: todo.assignees.length > 1,
                              allAssignees: todo.assignees
                            });
                          });
                        } else {
                          // Handle single assignee todos (backward compatibility)
                          const assigneeName = todo.assigned_to ? 
                            `${todo.assigned_to.first_name} ${todo.assigned_to.last_name}` : 
                            'Unassigned';
                          if (!acc[assigneeName]) {
                            acc[assigneeName] = [];
                          }
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
                                  key={todo.id} 
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
                                          isOverdue(todo.due_date) ? 'text-red-600' : 'text-blue-600'
                                        }`}>
                                          Due: {formatDateSafe(todo.due_date, 'MMM d, yyyy')}
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
                    
                    // Regular list view for other sort options
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
                                {/* Handle multi-assignee display */}
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
                                    isOverdue(todo.due_date) ? 'text-red-600' : 'text-blue-600'
                                  }`}>
                                    Due: {formatDateSafe(todo.due_date, 'MMM d, yyyy')}
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

                {/* Meeting Rating */}
                <div className="border border-white/30 p-4 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm">
                  <h4 className="font-medium mb-2 text-slate-900">Rate this meeting</h4>
                  <p className="text-sm text-slate-600 mb-3">How productive was this meeting?</p>
                  {/* Large Value Display */}
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-slate-800 mb-1">
                      {meetingRating ? meetingRating.toFixed(1) : "5.0"}
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
                          console.log('📊 Rating slider changed:', rating);
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
                      {/* Custom thumb styling via CSS */}
                      <style jsx>{`
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
                          console.log('📊 Rating submitted:', {
                            rating: meetingRating,
                            userId: user?.id,
                            userName: `${user?.firstName} ${user?.lastName}`,
                            meetingCode
                          });
                          
                          setRatingSubmitted(true);
                          
                          // Broadcast rating if in collaborative meeting
                          if (meetingCode && broadcastRating) {
                            const ratingData = {
                              userId: user?.id,
                              userName: `${user?.firstName} ${user?.lastName}`,
                              rating: meetingRating
                            };
                            console.log('🎯 Submitting rating via socket:', {
                              meetingCode,
                              ratingData
                            });
                            broadcastRating(ratingData);
                            
                            // Start 2-minute timeout for facilitator if this is the first rating
                            if (isLeader && participantRatings.length === 0 && !ratingTimeoutTimer) {
                              const timer = setTimeout(() => {
                                setShowSendSummaryTimeout(true);
                              }, 120000); // 2 minutes
                              setRatingTimeoutTimer(timer);
                            }
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
                          Rating Status ({participantRatings.length} of {participants.length} completed)
                        </h5>
                        {ratingAverage > 0 && (
                          <span className="text-sm font-medium text-blue-600">
                            Average: {ratingAverage.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {participants.map((participant) => {
                          // More flexible matching - check both userId and id fields
                          const hasRated = participantRatings.some(r => 
                            String(r.userId) === String(participant.id) || 
                            String(r.userId) === String(participant.userId)
                          );
                          const rating = participantRatings.find(r => 
                            String(r.userId) === String(participant.id) || 
                            String(r.userId) === String(participant.userId)
                          )?.rating;
                          
                          console.log('🔍 Participant rating check:', {
                            participantId: participant.id,
                            participantUserId: participant.userId,
                            hasRated,
                            rating,
                            ratingsUserIds: participantRatings.map(r => r.userId)
                          });
                          
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
                    </div>
                  )}
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
                    style={{ 
                      focusRingColor: themeColors.primary,
                      focusBorderColor: themeColors.primary
                    }}
                    rows={3}
                    placeholder="Enter any messages to cascade to other teams..."
                    value={cascadeMessage}
                    onChange={(e) => {
                      setCascadeMessage(e.target.value);
                      // Load teams if not already loaded
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

                {/* Conclude Meeting Button - Only for Facilitator */}
                <div className="flex justify-center">
                  {/* Debug logging removed for cleaner console */}
                  {/* Show button if: no collaborative meeting OR user is the leader */}
                  {!meetingCode || (meetingCode && isLeader) ? (
                    <div className="text-center space-y-3">
                      {/* Warning message when recording is active */}
                      {aiRecordingState.isRecording && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-2 text-yellow-800 font-medium mb-1">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Recording is still active
                          </div>
                          <p className="text-yellow-700 text-sm">
                            Please click "Stop Recording" first to generate the AI summary and include it in your meeting recap.
                          </p>
                        </div>
                      )}
                      
                      {showSendSummaryTimeout && isLeader && (
                        <div className="text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
                          Not all participants have rated. You can still send the summary.
                        </div>
                      )}
                      
                      <Button
                        type="button"
                        className={`shadow-lg hover:shadow-xl transition-all duration-200 text-white font-medium py-3 px-6 ${
                          aiRecordingState.isRecording 
                            ? "bg-gray-400 cursor-not-allowed opacity-50" 
                            : ""
                        }`}
                        style={{
                          background: aiRecordingState.isRecording 
                            ? undefined 
                            : `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                        }}
                        onClick={(e) => {
                          console.log('🔴 MAIN CONCLUDE BUTTON CLICKED', {
                            timestamp: new Date().toISOString(),
                            event: e,
                            target: e.target,
                            currentTarget: e.currentTarget,
                            aiRecordingState,
                            disabled: aiRecordingState.isRecording,
                            meetingCode,
                            isLeader,
                            sessionId,
                            user: user ? { id: user.id, email: user.email } : null,
                            showConcludeDialog
                          });
                          
                          console.log('🔴 [1.5] Button state check:', {
                            buttonDisabled: aiRecordingState.isRecording,
                            hasAccessToButton: !meetingCode || (meetingCode && isLeader),
                            currentDialogState: showConcludeDialog
                          });
                          
                          e.preventDefault();
                          e.stopPropagation();
                          
                          console.log('🔴 [2] Event handling complete, checking AI recording state');
                          if (!aiRecordingState.isRecording) {
                            console.log('🔴 [3] AI not recording - opening conclude dialog');
                            setShowConcludeDialog(true);
                            console.log('🔴 [4] Dialog state set to true');
                          } else {
                            console.log('🔴 [3] AI IS RECORDING - button should be disabled');
                          }
                        }}
                        disabled={aiRecordingState.isRecording}
                      >
                        {aiRecordingState.isRecording ? (
                          <>
                            <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Stop Recording First
                          </>
                        ) : (
                          <>
                            <CheckSquare className="mr-2 h-5 w-5" />
                            Conclude Meeting
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
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const confirmConcludeMeeting = async (e) => {
    console.log('🟠 [1] CONFIRM CONCLUDE MEETING HANDLER ENTERED', {
      timestamp: new Date().toISOString(),
      event: e,
      eventType: e?.type,
      target: e?.target,
      currentTarget: e?.currentTarget
    });
    
    // CRITICAL: Prevent any form submission or page reload
    if (e) {
      console.log('🟠 [2] Event exists - calling preventDefault');
      e.preventDefault();
      console.log('🟠 [3] Calling stopPropagation');
      e.stopPropagation();
      console.log('🟠 [4] Event handling complete');
    } else {
      console.log('🟠 [2] No event parameter passed');
    }
    
    console.log('🟠 [5] Closing conclude dialog');
    setShowConcludeDialog(false);
    console.log('🟠 [6] Dialog closed, entering try block');
    try {
      // Note: AI recording stop is now handled automatically by the backend during meeting conclusion
                        // Send cascading message if there is one
                        if (cascadeMessage.trim() && (cascadeToAll || selectedTeams.length > 0)) {
                          const orgId = user?.organizationId || user?.organization_id;
                          const effectiveTeamId = getEffectiveTeamId(teamId, user);
                          const teamIds = cascadeToAll ? availableTeams.map(t => t.id) : selectedTeams;
                          
                          await cascadingMessagesService.createCascadingMessage(orgId, effectiveTeamId, {
                            message: cascadeMessage,
                            recipientTeamIds: teamIds,
                            allTeams: cascadeToAll
                          });
                        }
                        
                        // Archive completed items if requested
                        if (archiveCompleted) {
                          const orgId = user?.organizationId || user?.organization_id;
                          const effectiveTeamId = getEffectiveTeamId(teamId, user);
                          
                          // Archive completed todos
                          try {
                            await todosService.archiveDoneTodos();
                          } catch (error) {
                            console.error('Failed to archive todos:', error);
                          }
                          
                          // Archive solved issues
                          const solvedIssues = [...(shortTermIssues || []), ...(longTermIssues || [])]
                            .filter(i => i.status === 'closed' || i.status === 'resolved' || i.status === 'solved' || i.status === 'completed');
                          for (const issue of solvedIssues) {
                            try {
                              await issuesService.archiveIssue(issue.id);
                            } catch (error) {
                              console.error('Failed to archive issue:', error);
                            }
                          }
                        }
                        
                        // CRITICAL FIX: Always conclude meeting in database, regardless of email option
                        console.log('🔍 [Frontend] About to conclude meeting in database...');
                        const orgId = user?.organizationId || user?.organization_id;
                        const effectiveTeamId = getEffectiveTeamId(teamId, user);
                        
                        // Combine all issues for the meeting summary
                        const allIssues = [...(shortTermIssues || []), ...(longTermIssues || [])];
                        
                        // Calculate meeting duration
                        let durationMinutes;
                        if (elapsedTime > 0) {
                          // Use timer if it was running
                          durationMinutes = Math.floor(elapsedTime / 60);
                        } else if (meetingStartTime) {
                          // Calculate from meeting start time if timer wasn't started
                          const now = Date.now();
                          const actualDuration = Math.floor((now - meetingStartTime) / 1000 / 60);
                          durationMinutes = actualDuration;
                        } else {
                          // Fallback: estimate based on typical meeting length (30 minutes)
                          durationMinutes = 30;
                        }
                        
                        // Include participant ratings and average
                        const allParticipantRatings = meetingCode ? 
                          participants.map(p => {
                            const rating = participantRatings.find(r => r.userId === p.id);
                            return {
                              userId: p.id,
                              userName: p.name,
                              rating: rating ? rating.rating : null
                            };
                          }) : [];
                        
                        // Calculate average rating from participant ratings
                        const validRatings = allParticipantRatings.filter(r => r.rating > 0);
                        const averageRating = validRatings.length > 0 
                          ? validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length
                          : meetingRating || 8;
                        
                        // Prepare comprehensive meeting data
                        const meetingData = {
                          meetingType: 'Level 10 Meeting',
                          duration: durationMinutes,
                          rating: averageRating,
                          individualRatings: allParticipantRatings,
                          summary: `Meeting completed with ${allIssues.length} issues tracked and meeting activities recorded.`,
                          attendees: allParticipantRatings.map(r => r.userName).filter(Boolean),
                          todos: {
                            completed: todos.filter(todo => todo.completed),
                            added: todos.filter(todo => !todo.id)
                          },
                          issues: {
                            discussed: allIssues,
                            created: allIssues.filter(issue => !issue.id)
                          },
                          notes: cascadeMessage || '',
                          cascadingMessage: cascadeMessage
                        };
                        
                        // ALWAYS conclude the meeting session in database
                        console.log('🟠 [7] About to conclude meeting in database');
                        console.log('🟠 [8] Current state check:', {
                          sessionId,
                          sendSummaryEmail,
                          hasMeetingData: !!meetingData,
                          orgId,
                          effectiveTeamId,
                          userObject: user
                        });
                        
                        let emailResult = null;
                        try {
                          console.log('🟠 [9] Entering service call try block');
                          console.log('🔍 [Frontend] Calling meetingsService.concludeMeeting...');
                          console.log('🔍 [Frontend] sessionId:', sessionId, 'sendSummaryEmail:', sendSummaryEmail);
                          console.log('🔍 [Frontend] meetingData:', meetingData);
                          
                          if (!sessionId) {
                            console.error('🔴 NO SESSION ID - throwing error');
                            throw new Error('No active session ID found - cannot conclude meeting');
                          }
                          
                          console.log('🟠 [10] About to call meetingsService.concludeMeeting');
                          console.log('🟠 [11] Service call parameters:', {
                            orgId,
                            effectiveTeamId,
                            sessionId,
                            sendSummaryEmail,
                            meetingDataKeys: Object.keys(meetingData || {})
                          });
                          
                          emailResult = await meetingsService.concludeMeeting(orgId, effectiveTeamId, sessionId, sendSummaryEmail, meetingData);
                          console.log('🟠 [12] Service call completed successfully');
                          console.log('✅ [Frontend] Meeting concluded successfully:', emailResult);
                        } catch (emailError) {
                          console.error('❌ [Frontend] Failed to conclude meeting:', emailError);
                          
                          // Check if error is "already concluded" - this is actually SUCCESS
                          const errorMessage = emailError?.message || emailError?.toString() || '';
                          const isAlreadyConcluded = errorMessage.includes('No active meeting found') || 
                                                     errorMessage.includes('already concluded') ||
                                                     errorMessage.includes('404');
                          
                          if (isAlreadyConcluded) {
                            console.log('✅ Meeting was already concluded - treating as success');
                            // Don't throw - let the success flow continue
                            emailResult = { success: true, alreadyConcluded: true };
                          } else {
                            // Re-throw for real errors
                            throw emailError;
                          }
                        }
                        
                        // Build success message based on what actually happened
                        let emailMessage = '';
                        if (sendSummaryEmail) {
                          if (emailResult?.emailsSent > 0) {
                            emailMessage = `Summary email sent to ${emailResult.emailsSent} participant${emailResult.emailsSent !== 1 ? 's' : ''}.`;
                          } else if (emailResult?.error) {
                            emailMessage = `Meeting concluded but email failed: ${emailResult.error}`;
                          } else {
                            emailMessage = 'Meeting concluded but no team members found for email.';
                          }
                        }
                        // Show toast with appropriate message based on AI recording state
                        const archiveMessage = archiveCompleted ? 'Completed items archived.' : '';
                        const baseMessage = `Meeting concluded successfully! ${emailMessage} ${archiveMessage}`.trim();
                        
                        toast.success(aiRecordingState.isRecording 
                          ? "Meeting concluded - AI summary included!" 
                          : baseMessage, {
                          description: aiRecordingState.isRecording
                            ? "Your AI summary has been included in the meeting recap email"
                            : "Great job! All data has been saved.",
                          duration: 5000
                        });
                        
                        // Clear form after success
                        setCascadeMessage('');
                        setSelectedTeams([]);
                        setCascadeToAll(false);
                        setMeetingRating(null);
                        setRatingSubmitted(false);
                        
                        // End the database session FIRST and wait for completion
                        // This prevents the old session from being resumed if leader immediately starts new meeting
                        if (sessionId) {
                          const orgId = user?.organizationId || user?.organization_id;
                          const effectiveTeamId = getEffectiveTeamId(teamId, user);
                          console.log('🔚 Ending database session before leaving meeting...');
                          await meetingSessionsService.endSession(orgId, effectiveTeamId, sessionId)
                            .catch(err => console.error('Failed to end meeting session:', err));
                          console.log('✅ Database session ended successfully');
                        }
                        
                        // Broadcast meeting end to all participants
                        if (meetingCode && broadcastIssueListUpdate) {
                          if (process.env.NODE_ENV === 'development') {
                            console.log('📢 Broadcasting meeting end to all participants');
                          }
                          broadcastIssueListUpdate({
                            action: 'meeting-ended',
                            message: 'Meeting has been concluded by the facilitator'
                          });
                        }
                        
                        // Mark meeting as concluded to prevent auto-rejoin
                        meetingConcludedRef.current = true;
                        
                        // Emit conclude-meeting event to backend to delete meeting
                        if (meetingCode && concludeMeeting) {
                          console.log('🏁 Concluding meeting in backend...');
                          concludeMeeting();
                        }
                        
                        // Leave the collaborative meeting if active
                        // Call immediately (not in setTimeout) to ensure socket event is sent before navigation
                        if (meetingCode && leaveMeeting) {
                          console.log('🚪 Leaving meeting immediately to ensure cleanup...');
                          leaveMeeting();
                          // Small delay to ensure socket event is sent
                          await new Promise(resolve => setTimeout(resolve, 200));
                          console.log('✅ Leave meeting event sent');
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
                        console.log('🟠 [13] Setting up navigation timeout');
                        setTimeout(() => {
                          try {
                            console.log('🟠 [14] Timeout triggered - about to navigate');
                            console.log('🚀 Navigating to dashboard after successful meeting conclusion');
                            navigate('/dashboard');
                            console.log('🟠 [15] Navigate function called successfully');
                          } catch (navError) {
                            console.error('🔴 Navigation error:', navError);
                            console.log('🟠 [16] Using fallback redirect');
                            // Fallback: hard redirect if navigate fails
                            window.location.href = '/dashboard';
                          }
                        }, 1500); // Brief delay to show success message
                        console.log('🟠 [17] Navigation timeout set, function should complete');
    } catch (error) {
      console.error('Failed to conclude meeting:', error);
      setError('Failed to conclude meeting. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      {/* Success and Error Alerts */}
      {success && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2">
          <Alert className="bg-green-50 border-green-200 max-w-md">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {error && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2">
          <Alert className="bg-red-50 border-red-200 max-w-md">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      <div className="relative max-w-7xl mx-auto p-8 pb-32">
        {/* Meeting Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {labels?.weekly_meeting_label || 'Level 10 Meeting'}
              </h1>
              <p className="text-slate-600 mt-1">{getMeetingDescription()}</p>
            </div>
            <div className="flex items-center gap-4">
              {currentTeam && (
                <div className="text-right">
                  <p className="text-sm text-slate-600">Team</p>
                  <p className="font-semibold text-slate-900">{currentTeam.name}</p>
                </div>
              )}
            </div>
          </div>
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
            onClaimPresenter={claimPresenter}
            onBroadcastRating={broadcastRating}
            meetingStartTime={meetingStartTime}
            meetingStarted={meetingStarted}
            isFollowing={isFollowing}
            toggleFollow={toggleFollow}
          />
        )}

        {/* AI Meeting Assistant Controls */}
        {(() => {
          const orgId = user?.organizationId || user?.organization_id;
          console.log('🔍 AI Controls Check:', { 
            currentOrganizationId: orgId, 
            teamId: teamId,
            shouldRender: !!(orgId && teamId)
          });
          return orgId && teamId;
        })() && (
          <div className="mb-6">
            <MeetingAIRecordingControls
              meetingId={`${teamId}-${Date.now()}`} // Generate a meeting ID - in real app this would come from backend
              organizationId={user?.organizationId || user?.organization_id}
              onTranscriptionStarted={() => {
                console.log('AI transcription started');
              }}
              onTranscriptionStopped={() => {
                setTranscriptionCompleted(true);
                // Don't auto-open modal - let user click button when ready
              }}
              onRecordingStateChange={setAiRecordingState}
            />
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm p-2">
          <div className="flex space-x-1 overflow-x-auto">
            {agendaItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              const isCompleted = completedSections.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    // Handle section change with timing updates
                    handleSectionChange(item.id);
                  }}
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
                  <span className={`text-xs ${isActive ? 'text-white/80' : isCompleted ? 'text-green-600' : 'text-slate-400'}`}>
                    {item.duration}m
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        {renderContent()}
        
        {/* Floating Action Buttons - Positioned to align with main content edge */}
        <div className="fixed z-40 flex flex-col gap-4" style={{
          right: 'calc((100vw - min(80rem, 100vw - 4rem)) / 2 - 11rem)',
          top: '30rem'
        }}>
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
              <AlertTriangle className="h-6 w-6" />
            </Button>
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-100">
              Add Issue
            </div>
          </div>
          
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
              <ListTodo className="h-6 w-6" />
            </Button>
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-100">
              Add To-Do
            </div>
          </div>
          
          {/* Add Headline Button */}
          <div className="relative group">
            <Button
              onClick={() => {
                setShowHeadlineDialog(true);
              }}
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 text-white"
              style={{
                background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
              }}
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-100">
              Add Headline
            </div>
          </div>
        </div>
        
        {/* Dialog Components */}
        <IssueDialog
          open={showIssueDialog}
          onClose={() => {
            setShowIssueDialog(false);
            setEditingIssue(null);
          }}
          issue={editingIssue}
          teamMembers={teamMembers || []}
          teamId={teamId}
          onTimelineChange={handleTimelineChange}
          onCreateTodo={handleCreateTodoFromIssue}
          onSave={handleSaveIssue}
        />
        
        <TodoDialog
          open={showTodoDialog}
          onOpenChange={setShowTodoDialog}
          todo={editingTodo}
          todoFromIssue={todoFromIssue}
          teamMembers={teamMembers || []}
          teamId={teamId}
          onSave={async (todoData, options = {}) => {
            const { isAutoSave = false } = options;
            
            try {
              const effectiveTeamId = getEffectiveTeamId(teamId, user);
              const todoDataWithOrgInfo = {
                ...todoData,
                organization_id: user?.organizationId || user?.organization_id,
                team_id: effectiveTeamId,
                department_id: effectiveTeamId
              };

              let savedTodo;
              if (editingTodo) {
                savedTodo = await todosService.updateTodo(editingTodo.id, todoDataWithOrgInfo);
              } else {
                savedTodo = await todosService.createTodo(todoDataWithOrgInfo);
              }
              
              // Only refresh and close dialog for manual saves
              if (!isAutoSave) {
                setShowTodoDialog(false);
                setEditingTodo(null);
                setTodoFromIssue(null);
                setSuccess('To-do saved successfully');
                
                // Refresh todos after save
                await fetchTodosData();
                
                // Broadcast todo update to other participants
                if (meetingCode && broadcastTodoUpdate) {
                  broadcastTodoUpdate({
                    action: 'refresh'
                  });
                }
              } else {
                // For auto-save, optimistically update local state
                if (editingTodo) {
                  // Update existing todo
                  setTodos(prev => prev.map(t => t.id === editingTodo.id ? savedTodo : t));
                } else {
                  // Add new todo
                  setTodos(prev => [...prev, savedTodo]);
                }
                
                // Broadcast to other participants
                if (meetingCode && broadcastTodoUpdate) {
                  broadcastTodoUpdate({
                    action: 'refresh'
                  });
                }
              }
              
              return savedTodo;
            } catch (error) {
              console.error('Failed to save todo:', error);
              if (!isAutoSave) {
                setError('Failed to save to-do');
              }
            }
          }}
        />
        
        <HeadlineDialog
          open={showHeadlineDialog}
          onOpenChange={(open) => {
            setShowHeadlineDialog(open);
            if (!open) setEditingHeadline(null);
          }}
          headline={editingHeadline}
          onSave={async (headlineData) => {
            try {
              const effectiveTeamId = getEffectiveTeamId(teamId, user);
              await headlinesService.createHeadline({
                ...headlineData,
                teamId: effectiveTeamId,
                meeting_id: sessionId  // Link headline to current meeting session
              });
              await fetchHeadlines();
              setShowHeadlineDialog(false);
              setEditingHeadline(null);
              setSuccess('Headline saved successfully');
            } catch (error) {
              console.error('Failed to save headline:', error);
              setError('Failed to save headline');
            }
          }}
        />
        
        {/* Cascading Message Dialog */}
        <CascadingMessageDialog
          open={showCascadeDialog}
          onOpenChange={setShowCascadeDialog}
          onSave={async (messageData) => {
            try {
              const effectiveTeamId = getEffectiveTeamId(teamId, user);
              await cascadingMessagesService.createCascadingMessage(
                orgId,
                effectiveTeamId,
                messageData
              );
              setSuccess('Cascading message sent successfully!');
              setTimeout(() => setSuccess(null), 3000);
            } catch (error) {
              console.error('Failed to send cascading message:', error);
              setError('Failed to send cascading message');
              setTimeout(() => setError(null), 3000);
            }
          }}
        />

        {showPriorityDialog && (
          <PriorityDialog
            open={showPriorityDialog}
            onOpenChange={(open) => {
              if (!open) {
                setShowPriorityDialog(false);
                setSelectedPriority(null);
              }
            }}
            priority={selectedPriority}
            teamMembers={teamMembers || []}
            teamId={teamId}
            onToggleMilestone={handleToggleMilestone}
            onAddMilestone={async (priorityId, milestoneData) => {
              try {
                console.log('🔧 [Modal Milestone] Adding milestone:', { priorityId, milestoneData });
                const orgId = user?.organizationId || user?.organization_id;
                const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
                const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
                
                if (!orgId || !effectiveTeamId) {
                  throw new Error('Missing organization ID or team ID');
                }
                
                const milestone = await quarterlyPrioritiesService.createMilestone(orgId, effectiveTeamId, priorityId, {
                  title: milestoneData.title,
                  dueDate: milestoneData.dueDate || format(addDays(new Date(), 30), 'yyyy-MM-dd'),
                  ownerId: milestoneData.ownerId
                });
                
                console.log('✅ [Modal Milestone] Created milestone:', milestone);
                
                // Update local state
                setPriorities(prev => prev.map(priority => 
                  priority.id === priorityId 
                    ? {
                        ...priority,
                        milestones: [...(priority.milestones || []), milestone]
                      }
                    : priority
                ));
                
                // Success feedback
                toast.success('Milestone added successfully');
                
                // Broadcast update to meeting participants
                if (broadcastIssueListUpdate) {
                  broadcastIssueListUpdate({
                    action: 'milestone-added',
                    priorityId,
                    milestone
                  });
                }
                
                return milestone;
              } catch (error) {
                console.error('❌ [Modal Milestone] Failed to add milestone:', error);
                toast.error(`Failed to add milestone: ${error.message}`);
                throw error;
              }
            }}
            onSave={async (priorityData) => {
              try {
                const orgId = user?.organizationId || user?.organization_id;
                const cleanTeamId = (teamId === 'null' || teamId === 'undefined') ? null : teamId;
                const effectiveTeamId = getEffectiveTeamId(cleanTeamId, user);
                
                if (selectedPriority) {
                  await quarterlyPrioritiesService.updatePriority(orgId, effectiveTeamId, selectedPriority.id, priorityData);
                } else {
                  await quarterlyPrioritiesService.createPriority({
                    ...priorityData,
                    teamId: effectiveTeamId
                  });
                }
                await fetchPrioritiesData();
                setShowPriorityDialog(false);
                setSelectedPriority(null);
                setSuccess('Priority saved successfully');
              } catch (error) {
                console.error('Failed to save priority:', error);
                setError('Failed to save priority');
              }
            }}
          />
        )}
        
        {moveIssueDialogOpen && issueToMove && (
          <MoveIssueDialog
            isOpen={moveIssueDialogOpen}
            onClose={() => {
              setMoveIssueDialogOpen(false);
              setIssueToMove(null);
            }}
            issue={issueToMove}
            onSuccess={handleIssueMovedSuccess}
          />
        )}

        {/* {movePriorityDialogOpen && priorityToMove && (
          <MovePriorityDialog
            isOpen={movePriorityDialogOpen}
            onClose={() => {
              setMovePriorityDialogOpen(false);
              setPriorityToMove(null);
            }}
            priority={priorityToMove}
            onSuccess={handlePriorityMovedSuccess}
          />
        )} */}
        
        {/* Metric Trend Chart Modal */}
        <MetricTrendChart
          isOpen={chartModal.isOpen}
          onClose={() => setChartModal({ isOpen: false, metric: null, metricId: null })}
          metric={chartModal.metric}
          metricId={chartModal.metricId}
          orgId={user?.organizationId || user?.organization_id}
          teamId={getEffectiveTeamId(teamId, user)}
        />
      </div>
      
      {/* Floating Timer Widget (Phase 2) - Now the primary timer */}
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

      {/* Archive Confirmation Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Archive className="h-5 w-5" />
              Warning
            </DialogTitle>
            <DialogDescription className="pt-2">
              <div className="space-y-3">
                <p className="text-sm text-gray-600 font-medium">
                  Best Practice is to Archive priorities at the Quarterly Review Meeting.
                </p>
                <p className="text-sm text-gray-700">
                  {archiveData.isBulk 
                    ? `Are you sure you want to archive ${archiveData.count} completed ${archiveData.count === 1 ? 'priority' : 'priorities'}?`
                    : archiveData.priorityTitle 
                      ? `Are you sure you want to archive "${archiveData.priorityTitle}"?`
                      : 'Are you sure you want to archive this priority?'
                  }
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowArchiveDialog(false);
                setArchiveData({ priorityId: null, priorityTitle: null, isBulk: false, count: 0 });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmArchivePriority}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive Priority
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conclude Meeting Dialog */}
      <Dialog open={showConcludeDialog} onOpenChange={setShowConcludeDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckSquare className="h-5 w-5" />
              Conclude Meeting
            </DialogTitle>
            <DialogDescription className="pt-2">
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  Are you ready to conclude the meeting? This will end the session for all participants.
                </p>
                {(cascadeMessage.trim() && (cascadeToAll || selectedTeams.length > 0)) && (
                  <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    📢 Your cascading message will be sent to selected teams.
                  </p>
                )}
                {archiveCompleted && (
                  <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
                    📦 Completed items will be archived.
                  </p>
                )}
                {sendSummaryEmail && (
                  <p className="text-sm text-purple-600 bg-purple-50 p-3 rounded-lg border border-purple-200">
                    📧 Meeting summary will be emailed to participants.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConcludeDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                console.log('🟢 DIALOG CONCLUDE BUTTON CLICKED', {
                  timestamp: new Date().toISOString(),
                  event: e,
                  target: e.target,
                  currentTarget: e.currentTarget,
                  buttonText: e.target.textContent,
                  dialogOpen: showConcludeDialog
                });
                
                console.log('🟢 [2] About to call confirmConcludeMeeting');
                confirmConcludeMeeting(e);
                console.log('🟢 [3] confirmConcludeMeeting called');
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckSquare className="mr-2 h-4 w-4" />
              Conclude Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* AI Summary Dialog */}
      <Dialog open={showAISummary} onOpenChange={setShowAISummary}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <MeetingAISummaryPanel
            meetingId={`${teamId}-${Date.now()}`} // Same meeting ID as used in controls
            organizationId={user?.organizationId || user?.organization_id}
            onClose={() => setShowAISummary(false)}
          />
        </DialogContent>
      </Dialog>


      {/* Confirmation Dialog for Delete/Remove actions */}
      <ConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        type={confirmDialog.type}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        loading={confirmDialog.loading}
      />
    </div>
  );
}; 

export default WeeklyAccountabilityMeetingPage;
