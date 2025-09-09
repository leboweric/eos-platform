import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { format } from 'date-fns';
import MeetingBar from '../components/meeting/MeetingBar';
import useMeeting from '../hooks/useMeeting';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PriorityCard from '../components/priorities/PriorityCardClean';
import PriorityDialog from '../components/priorities/PriorityDialog';
import IssuesListClean from '../components/issues/IssuesListClean';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { meetingsService } from '../services/meetingsService';
import { FileText, GitBranch, Smile, BarChart, Newspaper, ArrowLeftRight } from 'lucide-react';
import { quarterlyPrioritiesService } from '../services/quarterlyPrioritiesService';
import { issuesService } from '../services/issuesService';
import { organizationService } from '../services/organizationService';
import { getOrgTheme, saveOrgTheme, hexToRgba } from '../utils/themeUtils';
import { useTerminology } from '../contexts/TerminologyContext';
import { getEffectiveTeamId } from '../utils/teamUtils';
import IssueDialog from '../components/issues/IssueDialog';
import TodoDialog from '../components/todos/TodoDialog';
import { todosService } from '../services/todosService';
import TwoPagePlanView from '../components/vto/TwoPagePlanView';

const QuarterlyPlanningMeetingPage = () => {
  const { user } = useAuthStore();
  const { teamId } = useParams();
  const navigate = useNavigate();
  
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
      console.warn('Will redirect to /meetings in 100ms');
      // Don't immediately redirect - let the route settle first
      setTimeout(() => {
        console.log('Redirecting to /meetings due to invalid teamId');
        navigate('/meetings');
      }, 100);
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
    syncTimer,
    updateNotes,
    claimPresenter,
    activeMeetings 
  } = useMeeting();
  const { labels } = useTerminology();
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
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [meetingStartTime, setMeetingStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [meetingRating, setMeetingRating] = useState(null);
  const [participantRatings, setParticipantRatings] = useState({}); // Store ratings by participant
  
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
  
  // Priority dialog states
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  
  // Theme state
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });

  // Get framework-specific quarterly planning agenda
  const getQuarterlyAgendaItems = () => {
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
  
  const agendaItems = getQuarterlyAgendaItems();

  // Fetch organization theme
  useEffect(() => {
    fetchOrganizationTheme();
    
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, [user?.organizationId]);
  
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

  // Auto-start meeting on component mount
  useEffect(() => {
    setMeetingStarted(true);
    setMeetingStartTime(Date.now());
  }, []);
  
  // Join meeting when page loads
  const hasJoinedRef = useRef(false);
  const hasCheckedMeetingsRef = useRef(false);
  
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
    
    const meetingRoom = `${teamId}-quarterly-planning`;
    
    // Wait a bit for active meetings to load if we haven't checked yet
    if (!hasCheckedMeetingsRef.current && (!activeMeetings || Object.keys(activeMeetings).length === 0)) {
      console.log('🎬 Waiting for active meetings to load...');
      hasCheckedMeetingsRef.current = true;
      // Wait 500ms for active meetings to populate
      setTimeout(() => {
        if (!hasJoinedRef.current && !meetingCode) {
          const existingMeeting = activeMeetings?.[meetingRoom];
          const hasParticipants = existingMeeting?.participantCount > 0;
          
          console.log('🚀 Quarterly Planning auto-joining meeting room after delay:', meetingRoom);
          console.log('📡 Active meetings:', activeMeetings);
          console.log('📡 Existing meeting:', existingMeeting);
          console.log('👥 Existing meeting found:', hasParticipants ? 'Yes, joining as participant' : 'No, joining as leader');
          
          hasJoinedRef.current = true;
          joinMeeting(meetingRoom, !hasParticipants);
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
    }
  }, [teamId, isConnected, joinMeeting, meetingCode, activeMeetings]);
  
  // Listen for section changes from leader
  useEffect(() => {
    const handleMeetingSectionChange = (event) => {
      const { section } = event.detail;
      if (section && !isLeader) {
        console.log('📍 Follower changing section to:', section);
        setActiveSection(section);
        
        // Fetch data for the new section
        switch(section) {
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
    // Calculate average rating from all participant ratings
    const ratings = Object.values(participantRatings);
    if (ratings.length === 0 || !ratings.every(r => r.rating > 0)) {
      setError('All participants must rate the meeting before concluding');
      return;
    }
    
    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
      const duration = Math.floor((Date.now() - meetingStartTime) / 60000); // in minutes
      
      await meetingsService.concludeMeeting(orgId, effectiveTeamId, {
        meetingType: 'quarterly_planning',
        duration,
        rating: Math.round(averageRating), // Use average rating
        individualRatings: participantRatings, // Include individual ratings
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
    if (activeSection === 'review-quarterly-rocks' || activeSection === 'establish-quarterly-rocks') {
      fetchPrioritiesData();
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

  // Update selectedPriority when priorities change
  useEffect(() => {
    if (selectedPriority && priorities.length > 0) {
      const updatedPriority = priorities.find(p => p.id === selectedPriority.id);
      if (updatedPriority) {
        setSelectedPriority(updatedPriority);
      }
    }
  }, [priorities]);

  const fetchPrioritiesData = async () => {
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

  const handleUpdatePriority = async (priorityId, updates) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
      
      await quarterlyPrioritiesService.updatePriority(orgId, effectiveTeamId, priorityId, updates);
      
      // Update local state
      setPriorities(prev => 
        prev.map(p => p.id === priorityId ? { ...p, ...updates } : p)
      );
      
      setSuccess('Priority updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to update priority:', error);
      setError('Failed to update priority');
      setTimeout(() => setError(null), 3000);
    }
  };

  const fetchIssuesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
      
      const response = await issuesService.getIssues(null, false, effectiveTeamId);
      // Sort issues by vote count (highest first)
      const sortedIssues = (response.data.issues || []).sort((a, b) => 
        (b.vote_count || 0) - (a.vote_count || 0)
      );
      setIssues(sortedIssues);
      
      // Split into short-term and long-term
      const shortTerm = sortedIssues.filter(issue => issue.timeline === 'short_term');
      const longTerm = sortedIssues.filter(issue => issue.timeline === 'long_term');
      setShortTermIssues(shortTerm);
      setLongTermIssues(longTerm);
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
      setError('Failed to load issues');
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
      const response = await todosService.getTodos(null, null, true, effectiveTeamId);
      setTeamMembers(response.data.teamMembers || []);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };
  
  // Issue handlers
  const handleEditIssue = (issue) => {
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
      await issuesService.updateIssue(issueId, { status: newStatus });
      await fetchIssuesData();
    } catch (error) {
      console.error('Failed to update issue status:', error);
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
      const todoData = {
        title: issue.title,
        description: issue.description,
        priority: issue.priority_level || 'medium',
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

  const fetchTodosData = async () => {
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

  const handleAddTodo = () => {
    setEditingTodo(null);
    setShowTodoDialog(true);
  };

  const handleCreatePriority = async () => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
      
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
      setSuccess(`${labels?.priority_singular || 'Priority'} created successfully`);
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
      
      // Broadcast vote to other participants
      if (meetingCode && broadcastVote) {
        const updatedIssue = issues.find(i => i.id === issueId);
        if (updatedIssue) {
          broadcastVote(issueId, updatedIssue.vote_count, user?.id);
        }
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
      setError(`Failed to load ${labels?.business_blueprint_label || '2-Page Plan'}`);
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
    
    // Emit navigation event if leader
    if (isLeader && navigateToSection) {
      navigateToSection(sectionId);
    }
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
          <Card className="border-0 shadow-sm">
            <CardHeader className="rounded-t-lg" style={{ backgroundColor: hexToRgba(themeColors.accent, 0.05) }}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Building2 className="h-5 w-5" style={{ color: themeColors.primary }} />
                    EOS Tools
                  </CardTitle>
                  <CardDescription className="mt-1">Review Accountability Chart & Scorecard (1 hour)</CardDescription>
                </div>
                <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
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
                      onClick={() => navigate('/accountability')}
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
                      onClick={() => navigate('/scorecard')}
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
            <Card className="border-0 shadow-sm">
              <CardHeader className="rounded-t-lg" style={{ 
                background: `linear-gradient(to right, ${hexToRgba(themeColors.accent, 0.1)}, ${hexToRgba(themeColors.primary, 0.1)})`
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <AlertTriangle className="h-5 w-5" style={{ color: themeColors.primary }} />
                      Identify Discuss Solve
                    </CardTitle>
                    <CardDescription className="mt-1">Solve the most important Issue(s) (3 hours)</CardDescription>
                  </div>
                  <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
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
          <Card className="border-0 shadow-sm">
            <CardHeader className="rounded-t-lg" style={{ backgroundColor: hexToRgba(themeColors.accent, 0.05) }}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <ClipboardList className="h-5 w-5" style={{ color: themeColors.primary }} />
                    Next Steps
                  </CardTitle>
                  <CardDescription className="mt-1">Who, what, when (7 minutes)</CardDescription>
                </div>
                <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
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
          <Card className="border-0 shadow-sm">
            <CardHeader className="rounded-t-lg" style={{ backgroundColor: hexToRgba(themeColors.accent, 0.05) }}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Target className="h-5 w-5" style={{ color: themeColors.primary }} />
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
          <Card>
            <CardHeader style={{ backgroundColor: hexToRgba(themeColors.accent, 0.03) }}>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" style={{ color: themeColors.primary }} />
                Team Check-In
              </CardTitle>
              <CardDescription>Connect as a team before diving into business (15 minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Go around the room and have each team member share:
                </p>
                <div className="space-y-4">
                  <div className="border-l-4 pl-4" style={{ borderColor: themeColors.accent }}>
                    <h4 className="font-medium">1. Bests</h4>
                    <p className="text-sm text-gray-600">Personal and professional Best from the last 90 days</p>
                  </div>
                  <div className="border-l-4 pl-4" style={{ borderColor: themeColors.accent }}>
                    <h4 className="font-medium">2. Update</h4>
                    <p className="text-sm text-gray-600">What's working/not working?</p>
                  </div>
                  <div className="border-l-4 pl-4" style={{ borderColor: themeColors.accent }}>
                    <h4 className="font-medium">3. Expectations for this session</h4>
                    <p className="text-sm text-gray-600">What do you hope to accomplish in this meeting?</p>
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
                    {priorities.length > 0 && (
                      <div className="text-center bg-white/50 rounded-xl px-4 py-2 border border-white/30">
                        <span className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                          {Math.round((priorities.filter(p => p.status === 'complete' || p.status === 'completed' || p.progress === 100).length / priorities.length) * 100)}%
                        </span>
                        <p className="text-sm text-slate-600 font-medium">
                          {priorities.filter(p => p.status === 'complete' || p.status === 'completed' || p.progress === 100).length} of {priorities.length} complete
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 shadow-sm font-medium">
                    30 minutes
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
                    <span className="font-bold">Quick Status Check:</span> Each Rock owner reports "on-track" or "off-track" status
                  </p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3 justify-center">
                  {priorities.filter(p => p.status === 'complete').length > 0 && (
                    <Button
                      onClick={async () => {
                        try {
                          const orgId = user?.organizationId || user?.organization_id;
                          const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
                          
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
                          const orgId = user?.organizationId || user?.organization_id;
                          const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
                          
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
                
                {/* Company {labels?.priorities_label || 'Priorities'} Section */}
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
                            Company {labels?.priorities_label || 'Priorities'}
                          </h3>
                          <Badge className="border" style={{
                            backgroundColor: `${themeColors.primary}15`,
                            color: themeColors.primary,
                            borderColor: `${themeColors.primary}30`
                          }}>
                            {companyPriorities.length}
                          </Badge>
                        </div>
                      </div>
                      {expandedSections.companyPriorities && (
                        <div className="space-y-4 ml-7 mt-4 p-4 bg-slate-50/50 rounded-xl">
                          {companyPriorities.map(priority => {
                            const isComplete = priority.status === 'complete' || priority.status === 'completed' || priority.progress === 100;
                            const daysUntil = !isComplete ? getDaysUntilDue(priority.dueDate || priority.due_date) : null;
                            const displayProgress = isComplete ? 100 : (priority.progress || 0);
                            
                            // Calculate overdue milestones for this priority
                            const overdueMilestones = (priority.milestones || []).filter(
                              m => !m.completed && getDaysUntilDue(m.dueDate) < 0
                            );
                            
                            return (
                              <Card 
                                key={priority.id}
                                className={`max-w-5xl transition-all duration-300 shadow-md hover:shadow-xl hover:scale-[1.01] cursor-pointer ${
                                  isComplete 
                                    ? 'border-slate-200' 
                                    : priority.status === 'off-track'
                                    ? 'bg-gradient-to-r from-red-50/80 to-rose-50/80 border-red-200'
                                    : 'bg-white border-slate-200'
                                }`}
                                style={{
                                  backgroundColor: isComplete ? `${themeColors.primary}10` : undefined
                                }}
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
                                          <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: themeColors.primary }} />
                                        ) : (
                                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={getStatusDotColor(priority.status)} />
                                        )}
                                        <h3 className={`text-lg font-semibold break-words ${
                                          isComplete 
                                            ? 'line-through' 
                                            : 'text-gray-900'
                                        }`} style={isComplete ? { color: themeColors.primary, textDecorationColor: themeColors.primary } : {}}>
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
                                          <span 
                                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                                              daysUntil < 0 ? 'bg-red-100 text-red-700' :
                                              daysUntil <= 7 ? 'bg-yellow-100 text-yellow-700' :
                                              'text-white'
                                            }`}
                                            style={{
                                              backgroundColor: daysUntil > 7 ? themeColors.primary : undefined,
                                              opacity: daysUntil > 7 ? 0.9 : undefined
                                            }}
                                          >
                                            {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` :
                                             daysUntil === 0 ? 'Due today' :
                                             `${daysUntil} days left`}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <div className="text-right">
                                        <div className="text-2xl font-bold" style={{ color: themeColors.primary }}>
                                          {displayProgress}%
                                        </div>
                                        <Progress value={displayProgress} className="w-24 h-2" />
                                      </div>
                                      {/* Overdue milestone badge */}
                                      {overdueMilestones.length > 0 && (
                                        <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300">
                                          {overdueMilestones.length} Overdue Milestone{overdueMilestones.length > 1 ? 's' : ''}
                                        </Badge>
                                      )}
                                      {/* Status badge underneath progress bar */}
                                      <Badge 
                                        className={`${
                                          isComplete ? 'text-white' :
                                          priority.status === 'off-track' ? 'bg-red-100 text-red-800 border-red-200' :
                                          'text-white'
                                        }`}
                                        style={{
                                          backgroundColor: isComplete || priority.status === 'on-track' ? themeColors.primary : undefined,
                                          borderColor: isComplete || priority.status === 'on-track' ? themeColors.primary : undefined,
                                          opacity: isComplete || priority.status === 'on-track' ? 0.9 : undefined
                                        }}
                                      >
                                        {isComplete ? 'Complete' :
                                         priority.status === 'off-track' ? 'Off Track' : 'On Track'}
                                      </Badge>
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
                
                {/* Individual {labels?.priorities_label || 'Priorities'} Section */}
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
                          Individual {labels?.priorities_label || 'Priorities'}
                        </h3>
                        <Badge className="border" style={{
                          backgroundColor: `${themeColors.primary}15`,
                          color: themeColors.primary,
                          borderColor: `${themeColors.primary}30`
                        }}>
                          {individualPriorities.length}
                        </Badge>
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
                                {ownerPriorities.map(priority => {
                                  const isComplete = priority.status === 'complete' || priority.status === 'completed' || priority.progress === 100;
                                  const daysUntil = !isComplete ? getDaysUntilDue(priority.dueDate || priority.due_date) : null;
                                  const displayProgress = isComplete ? 100 : (priority.progress || 0);
                                  
                                  // Calculate overdue milestones for this priority
                                  const overdueMilestones = (priority.milestones || []).filter(
                                    m => !m.completed && !m.is_complete && getDaysUntilDue(m.dueDate || m.due_date) < 0
                                  );
                                  
                                  return (
                                    <Card 
                                      key={priority.id}
                                      className={`max-w-5xl transition-all duration-300 shadow-md hover:shadow-xl hover:scale-[1.01] cursor-pointer ${
                                        isComplete 
                                          ? 'border-slate-200' 
                                          : priority.status === 'off-track'
                                          ? 'bg-gradient-to-r from-red-50/80 to-rose-50/80 border-red-200'
                                          : 'bg-white border-slate-200'
                                      }`}
                                      style={{
                                        backgroundColor: isComplete ? `${themeColors.primary}10` : undefined
                                      }}
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
                                                <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: themeColors.primary }} />
                                              ) : (
                                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={getStatusDotColor(priority.status)} />
                                              )}
                                              <h3 className={`text-lg font-semibold break-words ${
                                                isComplete 
                                                  ? 'line-through' 
                                                  : 'text-gray-900'
                                              }`} style={isComplete ? { color: themeColors.primary, textDecorationColor: themeColors.primary } : {}}>
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
                                                Due {priority.dueDate || priority.due_date ? format(new Date(priority.dueDate || priority.due_date), 'MMM d') : 'No date'}
                                              </span>
                                              {daysUntil !== null && (
                                                <span 
                                                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                    daysUntil < 0 ? 'bg-red-100 text-red-700' :
                                                    daysUntil <= 7 ? 'bg-yellow-100 text-yellow-700' :
                                                    'text-white'
                                                  }`}
                                                  style={{
                                                    backgroundColor: daysUntil > 7 ? themeColors.primary : undefined,
                                                    opacity: daysUntil > 7 ? 0.9 : undefined
                                                  }}
                                                >
                                                  {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` :
                                                   daysUntil === 0 ? 'Due today' :
                                                   `${daysUntil} days left`}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex flex-col items-end gap-2">
                                            <div className="text-right">
                                              <div className="text-2xl font-bold" style={{ color: themeColors.primary }}>
                                                {displayProgress}%
                                              </div>
                                              <Progress value={displayProgress} className="w-24 h-2" />
                                            </div>
                                            {/* Overdue milestone badge */}
                                            {overdueMilestones.length > 0 && (
                                              <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300">
                                                {overdueMilestones.length} Overdue Milestone{overdueMilestones.length > 1 ? 's' : ''}
                                              </Badge>
                                            )}
                                            {/* Status badge underneath progress bar */}
                                            <Badge 
                                              className={`${
                                                isComplete ? 'text-white' :
                                                priority.status === 'off-track' ? 'bg-red-100 text-red-800 border-red-200' :
                                                'text-white'
                                              }`}
                                              style={{
                                                backgroundColor: isComplete || priority.status === 'on-track' ? themeColors.primary : undefined,
                                                borderColor: isComplete || priority.status === 'on-track' ? themeColors.primary : undefined,
                                                opacity: isComplete || priority.status === 'on-track' ? 0.9 : undefined
                                              }}
                                            >
                                              {isComplete ? 'Complete' :
                                               priority.status === 'off-track' ? 'Off Track' : 'On Track'}
                                            </Badge>
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
            <Card className="border-0 shadow-sm">
              <CardHeader className="rounded-t-lg" style={{ backgroundColor: hexToRgba(themeColors.accent, 0.05) }}>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <ClipboardList className="h-5 w-5" style={{ color: themeColors.primary }} />
                      V/TO
                    </CardTitle>
                    <CardDescription className="mt-1">Review and update Vision/Traction Organizer (1 hour)</CardDescription>
                  </div>
                  <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
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
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ListChecks className="h-5 w-5" style={{ color: themeColors.primary }} />
                      Set {labels?.priorities_label || 'Quarterly Priorities'}
                    </CardTitle>
                    <CardDescription>Define 3-7 priorities for the upcoming quarter (2 hours)</CardDescription>
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
                    <span className="font-semibold">Priority Setting:</span> Each priority should be SMART (Specific, Measurable, Achievable, Relevant, Time-bound). Limit to 3-7 priorities total.
                  </p>
                </div>
                {/* Company {labels?.priorities_label || 'Priorities'} Section */}
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
                            Company {labels?.priorities_label || 'Priorities'} ({companyPriorities.length})
                          </h3>
                        </div>
                      </div>
                      {expandedSections.companyPriorities && (
                        <div className="space-y-4 ml-7 mt-4">
                          {(companyPriorities || []).map(priority => {
                            const isComplete = priority.status === 'complete' || priority.status === 'completed' || priority.progress === 100;
                            const daysUntil = !isComplete ? getDaysUntilDue(priority.dueDate || priority.due_date) : null;
                            const displayProgress = isComplete ? 100 : (priority.progress || 0);
                            
                            // Calculate overdue milestones for this priority
                            const overdueMilestones = (priority.milestones || []).filter(
                              m => !m.completed && !m.is_complete && getDaysUntilDue(m.dueDate || m.due_date) < 0
                            );
                            
                            return (
                              <Card 
                                key={priority.id}
                                className={`max-w-5xl transition-all duration-300 shadow-md hover:shadow-xl hover:scale-[1.01] ${
                                  isComplete 
                                    ? 'border-slate-200' 
                                    : priority.status === 'off-track'
                                    ? 'bg-gradient-to-r from-red-50/80 to-rose-50/80 border-red-200'
                                    : 'bg-white border-slate-200'
                                }`}
                                style={{
                                  backgroundColor: isComplete ? `${themeColors.primary}10` : undefined
                                }}
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
                                          <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: themeColors.primary }} />
                                        ) : (
                                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={getStatusDotColor(priority.status)} />
                                        )}
                                        <h3 className={`text-lg font-semibold break-words ${
                                          isComplete 
                                            ? 'line-through' 
                                            : 'text-gray-900'
                                        }`} style={isComplete ? { color: themeColors.primary, textDecorationColor: themeColors.primary } : {}}>
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
                                          Due {priority.dueDate || priority.due_date ? format(new Date(priority.dueDate || priority.due_date), 'MMM d') : 'No date'}
                                        </span>
                                        {daysUntil !== null && (
                                          <span 
                                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                                              daysUntil < 0 ? 'bg-red-100 text-red-700' :
                                              daysUntil <= 7 ? 'bg-yellow-100 text-yellow-700' :
                                              'text-white'
                                            }`}
                                            style={{
                                              backgroundColor: daysUntil > 7 ? themeColors.primary : undefined,
                                              opacity: daysUntil > 7 ? 0.9 : undefined
                                            }}
                                          >
                                            {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` :
                                             daysUntil === 0 ? 'Due today' :
                                             `${daysUntil} days left`}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <div className="text-right">
                                        <div className="text-2xl font-bold" style={{ color: themeColors.primary }}>
                                          {displayProgress}%
                                        </div>
                                        <Progress value={displayProgress} className="w-24 h-2" />
                                      </div>
                                      {/* Overdue milestone badge */}
                                      {overdueMilestones.length > 0 && (
                                        <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300">
                                          {overdueMilestones.length} Overdue Milestone{overdueMilestones.length > 1 ? 's' : ''}
                                        </Badge>
                                      )}
                                      {/* Status badge underneath progress bar */}
                                      <Badge 
                                        className={`${
                                          isComplete ? 'text-white' :
                                          priority.status === 'off-track' ? 'bg-red-100 text-red-800 border-red-200' :
                                          'text-white'
                                        }`}
                                        style={{
                                          backgroundColor: isComplete || priority.status === 'on-track' ? themeColors.primary : undefined,
                                          borderColor: isComplete || priority.status === 'on-track' ? themeColors.primary : undefined,
                                          opacity: isComplete || priority.status === 'on-track' ? 0.9 : undefined
                                        }}
                                      >
                                        {isComplete ? 'Complete' :
                                         priority.status === 'off-track' ? 'Off Track' : 'On Track'}
                                      </Badge>
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
                
                {/* Individual {labels?.priorities_label || 'Priorities'} Section */}
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
                          Individual {labels?.priorities_label || 'Priorities'}
                        </h3>
                        <Badge className="border" style={{
                          backgroundColor: `${themeColors.primary}15`,
                          color: themeColors.primary,
                          borderColor: `${themeColors.primary}30`
                        }}>
                          {individualPriorities.length}
                        </Badge>
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
                                {ownerPriorities.map(priority => {
                                  const isComplete = priority.status === 'complete' || priority.status === 'completed' || priority.progress === 100;
                                  const daysUntil = !isComplete ? getDaysUntilDue(priority.dueDate || priority.due_date) : null;
                                  const displayProgress = isComplete ? 100 : (priority.progress || 0);
                                  
                                  // Calculate overdue milestones for this priority
                                  const overdueMilestones = (priority.milestones || []).filter(
                                    m => !m.completed && !m.is_complete && getDaysUntilDue(m.dueDate || m.due_date) < 0
                                  );
                                  
                                  return (
                                    <Card 
                                      key={priority.id}
                                      className={`max-w-5xl transition-all duration-300 shadow-md hover:shadow-xl hover:scale-[1.01] cursor-pointer ${
                                        isComplete 
                                          ? 'border-slate-200' 
                                          : priority.status === 'off-track'
                                          ? 'bg-gradient-to-r from-red-50/80 to-rose-50/80 border-red-200'
                                          : 'bg-white border-slate-200'
                                      }`}
                                      style={{
                                        backgroundColor: isComplete ? `${themeColors.primary}10` : undefined
                                      }}
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
                                                <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: themeColors.primary }} />
                                              ) : (
                                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={getStatusDotColor(priority.status)} />
                                              )}
                                              <h3 className={`text-lg font-semibold break-words ${
                                                isComplete 
                                                  ? 'line-through' 
                                                  : 'text-gray-900'
                                              }`} style={isComplete ? { color: themeColors.primary, textDecorationColor: themeColors.primary } : {}}>
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
                                                Due {priority.dueDate || priority.due_date ? format(new Date(priority.dueDate || priority.due_date), 'MMM d') : 'No date'}
                                              </span>
                                              {daysUntil !== null && (
                                                <span 
                                                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                    daysUntil < 0 ? 'bg-red-100 text-red-700' :
                                                    daysUntil <= 7 ? 'bg-yellow-100 text-yellow-700' :
                                                    'text-white'
                                                  }`}
                                                  style={{
                                                    backgroundColor: daysUntil > 7 ? themeColors.primary : undefined,
                                                    opacity: daysUntil > 7 ? 0.9 : undefined
                                                  }}
                                                >
                                                  {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` :
                                                   daysUntil === 0 ? 'Due today' :
                                                   `${daysUntil} days left`}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex flex-col items-end gap-2">
                                            <div className="text-right">
                                              <div className="text-2xl font-bold" style={{ color: themeColors.primary }}>
                                                {displayProgress}%
                                              </div>
                                              <Progress value={displayProgress} className="w-24 h-2" />
                                            </div>
                                            {/* Overdue milestone badge */}
                                            {overdueMilestones.length > 0 && (
                                              <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300">
                                                {overdueMilestones.length} Overdue Milestone{overdueMilestones.length > 1 ? 's' : ''}
                                              </Badge>
                                            )}
                                            {/* Status badge underneath progress bar */}
                                            <Badge 
                                              className={`${
                                                isComplete ? 'text-white' :
                                                priority.status === 'off-track' ? 'bg-red-100 text-red-800 border-red-200' :
                                                'text-white'
                                              }`}
                                              style={{
                                                backgroundColor: isComplete || priority.status === 'on-track' ? themeColors.primary : undefined,
                                                borderColor: isComplete || priority.status === 'on-track' ? themeColors.primary : undefined,
                                                opacity: isComplete || priority.status === 'on-track' ? 0.9 : undefined
                                              }}
                                            >
                                              {isComplete ? 'Complete' :
                                               priority.status === 'off-track' ? 'Off Track' : 'On Track'}
                                            </Badge>
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

      case 'issues':
        return (
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="rounded-t-lg" style={{ 
                background: `linear-gradient(to right, ${hexToRgba(themeColors.accent, 0.1)}, ${hexToRgba(themeColors.primary, 0.1)})`
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <AlertTriangle className="h-5 w-5" style={{ color: themeColors.primary }} />
                      Identify Discuss Solve
                    </CardTitle>
                    <CardDescription className="mt-1">Solve the most important Issue(s)</CardDescription>
                  </div>
                  <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                    180 minutes
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
                          Short Term ({issues.filter(i => i.timeline === 'short_term').length})
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
                          Long Term ({issues.filter(i => i.timeline === 'long_term').length})
                        </TabsTrigger>
                      </TabsList>
                      
                      <div className="flex gap-2">
                        {(() => {
                          const currentIssues = issues.filter(i => i.timeline === issueTimeline);
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
                      {(() => {
                        const shortTermIssues = issues.filter(i => i.timeline === 'short_term');
                        return shortTermIssues.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-gray-500">No short-term issues found.</p>
                          </div>
                        ) : (
                          <IssuesListClean
                            issues={shortTermIssues}
                            onEdit={(issue) => {
                              setEditingIssue(issue);
                              setShowIssueDialog(true);
                            }}
                            onStatusChange={async (issueId, newStatus) => {
                              try {
                                setIssues(prev => 
                                  prev.map(issue => 
                                    issue.id === issueId ? { ...issue, status: newStatus } : issue
                                  )
                                );
                                await issuesService.updateIssue(issueId, { status: newStatus });
                              } catch (error) {
                                console.error('Failed to update status:', error);
                                await fetchIssuesData();
                              }
                            }}
                            onTimelineChange={async (issueId, newTimeline) => {
                              try {
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
                                await fetchIssuesData();
                              }
                            }}
                            onArchive={async (issueId) => {
                              try {
                                setIssues(prev => prev.filter(issue => issue.id !== issueId));
                                await issuesService.archiveIssue(issueId);
                                setSuccess('Issue archived');
                              } catch (error) {
                                console.error('Failed to archive:', error);
                                setError('Failed to archive issue');
                                await fetchIssuesData();
                              }
                            }}
                            onVote={handleVote}
                            teamMembers={teamMembers}
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
                        );
                      })()}
                    </TabsContent>
                    
                    <TabsContent value="long_term" className="mt-0">
                      {(() => {
                        const longTermIssues = issues.filter(i => i.timeline === 'long_term');
                        return longTermIssues.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-gray-500">No long-term issues found.</p>
                          </div>
                        ) : (
                          <IssuesListClean
                            issues={longTermIssues}
                            onEdit={(issue) => {
                              setEditingIssue(issue);
                              setShowIssueDialog(true);
                            }}
                            onStatusChange={async (issueId, newStatus) => {
                              try {
                                setIssues(prev => 
                                  prev.map(issue => 
                                    issue.id === issueId ? { ...issue, status: newStatus } : issue
                                  )
                                );
                                await issuesService.updateIssue(issueId, { status: newStatus });
                              } catch (error) {
                                console.error('Failed to update status:', error);
                                await fetchIssuesData();
                              }
                            }}
                            onTimelineChange={async (issueId, newTimeline) => {
                              try {
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
                                await fetchIssuesData();
                              }
                            }}
                            onArchive={async (issueId) => {
                              try {
                                setIssues(prev => prev.filter(issue => issue.id !== issueId));
                                await issuesService.archiveIssue(issueId);
                                setSuccess('Issue archived');
                              } catch (error) {
                                console.error('Failed to archive:', error);
                                setError('Failed to archive issue');
                                await fetchIssuesData();
                              }
                            }}
                            onVote={handleVote}
                            teamMembers={teamMembers}
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
                        );
                      })()}
                    </TabsContent>
                  </Tabs>
                </div>
              </CardContent>
            </Card>
            
            {/* Add Priority Dialog */}
            <Dialog open={showAddPriority} onOpenChange={setShowAddPriority}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New {labels?.priority_singular || 'Priority'}</DialogTitle>
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
                          {Array.isArray(teamMembers) && teamMembers.map(member => (
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
                  8 minutes
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
                                             todo.priority === 'medium' ? themeColors.primary : 
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
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 mb-4"
                    style={{
                      '--tw-ring-color': themeColors.primary,
                      '--tw-border-opacity': 1
                    }}
                    rows="4"
                    placeholder="Enter key messages to cascade..."
                  />
                </div>

                {/* Meeting Rating */}
                <div className="border border-gray-200 p-4 rounded-lg bg-white">
                  <h4 className="font-medium mb-3 text-gray-900 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Rate This Meeting
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    How effective was this meeting? (1-10)
                  </p>
                </div>

                {/* Conclude Button */}
                <div className="flex justify-center pt-4">
                  <Button 
                    onClick={concludeMeeting}
                    size="lg"
                    className="px-8 shadow-lg hover:shadow-xl transition-all duration-200"
                    style={{
                      background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                    }}
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Conclude Quarterly Planning
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
                {activeSection === 'conclude' && (
                  <Button
                    onClick={concludeMeeting}
                    className="text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                    style={{
                      background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.filter = 'brightness(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = 'brightness(1)';
                    }}
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

        {/* Tabs Navigation */}
        <Tabs value={activeSection} onValueChange={handleSectionChange} className="space-y-8">
          <TabsList className="w-full grid grid-cols-4 lg:grid-cols-8 gap-2 h-auto p-2 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-lg">
            {agendaItems.map((item) => {
              const Icon = item.icon;
              const currentIndex = agendaItems.findIndex(i => i.id === activeSection);
              const itemIndex = agendaItems.findIndex(i => i.id === item.id);
              const isCompleted = itemIndex < currentIndex;
              const isActive = activeSection === item.id;
              
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
                    isActive ? 'text-white' : 'text-slate-600'
                  }`} style={isCompleted && !isActive ? { color: themeColors.primary } : {}} />
                  <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-slate-700'}`}>{item.label}</span>
                  {item.duration && <span className={`text-xs ${isActive ? 'text-white/80' : 'text-slate-500'}`}>{item.duration}m</span>}
                  {isCompleted && (
                    <CheckCircle className="h-3 w-3" style={{ color: themeColors.primary }} />
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

        {/* Meeting Rating Dialog for Conclude */}
        {activeSection === 'conclude' && (
          <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6">
            <h3 className="text-lg font-bold mb-4 text-slate-900">Rate This Meeting</h3>
            
            {/* Individual Participant Ratings */}
            {participants.length > 0 ? (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-3">
                  Each participant rates the meeting:
                </label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {participants.map(participant => {
                    const isCurrentUser = participant.id === user?.id;
                    const rating = participantRatings[participant.id];
                    
                    return (
                      <div key={participant.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <span className={`text-sm ${isCurrentUser ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                          {participant.name}{isCurrentUser ? ' (You)' : ''}:
                        </span>
                        {isCurrentUser ? (
                          <div className="flex gap-1">
                            {[...Array(10)].map((_, i) => (
                              <Button
                                key={i + 1}
                                variant={rating?.rating === i + 1 ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  const ratingValue = i + 1;
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
                                }}
                                style={rating?.rating === i + 1 ? {
                                  backgroundColor: themeColors.primary,
                                  color: 'white'
                                } : {}}
                              >
                                {i + 1}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <span className={`text-sm font-medium ${rating ? 'text-gray-900' : 'text-gray-400'}`}>
                            {rating ? rating.rating : 'Waiting...'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Calculate and show average if there are ratings */}
                {Object.keys(participantRatings).length > 0 && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Average Rating:</span>
                      <span className="text-xl font-bold" style={{ color: themeColors.primary }}>
                        {(Object.values(participantRatings).reduce((sum, r) => sum + r.rating, 0) / Object.values(participantRatings).length).toFixed(1)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Fallback for single user (not in a meeting) */
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Your Rating:
                </label>
                <div className="flex gap-2">
                  {[...Array(10)].map((_, i) => (
                    <Button
                      key={i + 1}
                      variant={meetingRating === i + 1 ? 'default' : 'outline'}
                      size="sm"
                      className="w-10 h-10"
                      onClick={() => {
                        const rating = i + 1;
                        setMeetingRating(rating);
                        // Store as single participant rating
                        setParticipantRatings({
                          [user?.id]: {
                            userId: user?.id,
                            userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'You',
                            rating: rating
                          }
                        });
                      }}
                      style={meetingRating === i + 1 ? {
                        backgroundColor: themeColors.primary,
                        color: 'white'
                      } : {}}
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
            await quarterlyPrioritiesService.addMilestone(orgId, effectiveTeamId, priorityId, milestone);
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
        />

        {/* Add Priority Dialog */}
        <Dialog open={showAddPriority} onOpenChange={setShowAddPriority}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New {labels?.priority_singular || 'Priority'}</DialogTitle>
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
              
              // Only refresh issues data if we're on the issues section
              if (activeSection === 'issues') {
                await fetchIssuesData();
              }
              
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
        
        {/* Meeting Collaboration Bar */}
        <MeetingBar />
      </div>
    </div>
  );
};

export default QuarterlyPlanningMeetingPage;