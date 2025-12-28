import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { format, addDays } from 'date-fns';
import MeetingBar from '../components/meeting/MeetingBar';
import useMeeting from '../hooks/useMeeting';
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
  Edit,
  Heart,
  ClipboardCheck,
  Grid,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PriorityCard from '../components/priorities/PriorityCardClean';
import PriorityDialog from '../components/priorities/PriorityDialog';
import IssuesListClean from '../components/issues/IssuesListClean';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { meetingsService } from '../services/meetingsService';
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

// Define Annual Planning Meeting sections outside component for stability
const ANNUAL_PLANNING_SECTIONS = [
  // DAY 1
  { id: 'check-in-day1', name: '📅 Day 1: Check-In', icon: Heart, day: 1 },
  { id: 'review-previous', name: 'Review Previous Year/Quarterly Rocks', icon: Calendar, day: 1 },
  { id: 'team-health', name: 'Team Health', icon: Activity, day: 1 },
  { id: 'org-checkup', name: 'Organizational Checkup', icon: ClipboardCheck, day: 1 },
  { id: 'swot', name: 'S.W.O.T. Analysis/Issues List', icon: Grid, day: 1 },
  { id: 'vto', name: 'V/TO™', icon: Target, day: 1 },
  { id: 'three-year', name: '3-Year Picture™', icon: TrendingUp, day: 1 },
  
  // DAY 2
  { id: 'check-in-day2', name: '📅 Day 2: Check-In', icon: Heart, day: 2 },
  { id: 'review-issues', name: 'Review Issues List/3-Year Picture™', icon: FileText, day: 2 },
  { id: 'one-year-plan', name: '1-Year Plan', icon: Calendar, day: 2 },
  { id: 'quarterly-rocks', name: 'Establish Quarterly Rocks', icon: Target, day: 2 },
  { id: 'ids', name: 'IDS', icon: AlertCircle, day: 2 },
  { id: 'next-steps', name: 'Next Steps/Conclude', icon: CheckCircle, day: 2 }
];

function AnnualPlanningMeetingPage() {
  const { user } = useAuthStore();
  const { teamId } = useParams();
  const navigate = useNavigate();
  
  // Debug mount/unmount
  useEffect(() => {
    console.log('🎯 AnnualPlanningMeetingPage MOUNTED with teamId:', teamId);
    return () => {
      console.log('🔚 AnnualPlanningMeetingPage UNMOUNTING with teamId:', teamId);
    };
  }, []);
  
  // Meeting state
  const [activeSection, setActiveSection] = useState('check-in-day1');
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [meetingStartTime, setMeetingStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Theme and UI state
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  
  // Data state
  const [priorities, setPriorities] = useState([]);
  const [issues, setIssues] = useState([]);
  const [todos, setTodos] = useState([]);
  const [blueprintData, setBlueprintData] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog state
  const [showAddPriority, setShowAddPriority] = useState(false);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [showTodoDialog, setShowTodoDialog] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [editingTodo, setEditingTodo] = useState(null);
  
  // Form state
  const [priorityForm, setPriorityForm] = useState({
    title: '',
    description: '',
    ownerId: '',
    dueDate: '',
    isCompanyPriority: false
  });
  
  // Meeting collaboration
  const { 
    isConnected, 
    joinMeeting, 
    meetingCode, 
    isLeader, 
    participants,
    activeMeetings,
    broadcastSectionChange,
    broadcastMeetingUpdate,
    broadcastIssueListUpdate,
    broadcastPriorityUpdate,
    broadcastTodoListUpdate
  } = useMeeting();
  
  const { labels } = useTerminology();
  const hasJoinedRef = useRef(false);
  const hasCheckedMeetingsRef = useRef(false);

  // Use the sections defined outside component for stability
  const sections = ANNUAL_PLANNING_SECTIONS;

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

  // Auto-start meeting on component mount
  useEffect(() => {
    console.log('[AnnualPlanning] Component mounted');
    console.log('[AnnualPlanning] Team ID:', teamId);
    console.log('[AnnualPlanning] User:', user?.organizationId || user?.organization_id);
    
    setMeetingStarted(true);
    setMeetingStartTime(Date.now());
    
    // Load initial data with comprehensive error handling
    const loadInitialData = async () => {
      try {
        setLoading(true);
        console.log('[AnnualPlanning] Starting data fetch...');
        
        await Promise.all([
          fetchPrioritiesData(),
          fetchIssuesData(),
          fetchTodosData(),
          fetchVtoData(),
          fetchTeamMembers()
        ]);
        
        console.log('[AnnualPlanning] All data loaded successfully');
      } catch (error) {
        console.error('[AnnualPlanning] Error loading initial data:', error);
        setError('Failed to load meeting data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [teamId]);
  
  // Auto-join meeting when component mounts
  useEffect(() => {
    // Validate teamId before attempting to join
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
    const orgId = user?.organizationId || user?.organization_id;
    const meetingRoom = `${orgId}-${teamId}-annual-planning`;
    
    // Wait a bit for active meetings to load if we haven't checked yet
    if (!hasCheckedMeetingsRef.current && (!activeMeetings || Object.keys(activeMeetings).length === 0)) {
      console.log('🎬 Waiting for active meetings to load...');
      hasCheckedMeetingsRef.current = true;
      // Wait 500ms for active meetings to populate
      setTimeout(() => {
        if (!hasJoinedRef.current && !meetingCode) {
          const existingMeeting = activeMeetings?.[meetingRoom];
          const hasParticipants = existingMeeting?.participantCount > 0;
          
          console.log('🚀 Annual Planning auto-joining meeting room after delay:', meetingRoom);
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
      
      console.log('🚀 Annual Planning auto-joining meeting room on page load:', meetingRoom);
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
        
        // Always fetch data when following leader's navigation
        switch(section) {
          case 'review-previous':
          case 'quarterly-rocks':
            fetchPrioritiesData();
            break;
          case 'swot':
          case 'ids':
          case 'review-issues':
            fetchIssuesData();
            break;
          case 'vto':
          case 'three-year':
          case 'one-year-plan':
            fetchVtoData();
            break;
          default:
            break;
        }
      }
    };
    
    window.addEventListener('meeting-section-change', handleMeetingSectionChange);
    return () => window.removeEventListener('meeting-section-change', handleMeetingSectionChange);
  }, [isLeader]);

  // Data fetching functions
  async function fetchPrioritiesData() {
    try {
      console.log('[AnnualPlanning] Fetching priorities...');
      const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
      const response = await quarterlyPrioritiesService.getCurrentPriorities(effectiveTeamId);
      const prioritiesData = response || [];
      console.log('[AnnualPlanning] Priorities loaded:', prioritiesData.length);
      setPriorities(prioritiesData);
    } catch (error) {
      console.error('[AnnualPlanning] Failed to fetch priorities:', error);
      setPriorities([]);
      throw error; // Re-throw to be caught by Promise.all
    }
  }

  async function fetchIssuesData() {
    try {
      console.log('[AnnualPlanning] Fetching issues...');
      const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
      const response = await issuesService.getIssues(effectiveTeamId);
      const issuesData = response?.data?.issues || response?.issues || response || [];
      console.log('[AnnualPlanning] Issues loaded:', issuesData.length);
      setIssues(issuesData);
    } catch (error) {
      console.error('[AnnualPlanning] Failed to fetch issues:', error);
      setIssues([]);
      throw error; // Re-throw to be caught by Promise.all
    }
  }

  async function fetchTodosData() {
    try {
      console.log('[AnnualPlanning] Fetching todos...');
      const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
      const response = await todosService.getTodos(null, null, false, effectiveTeamId);
      
      if (response && response.data && Array.isArray(response.data.todos)) {
        const openTodos = response.data.todos.filter(
          todo => todo.status !== 'complete' && todo.status !== 'completed' && todo.status !== 'cancelled'
        );
        console.log('[AnnualPlanning] Todos loaded:', openTodos.length);
        setTodos(openTodos);
      } else {
        console.warn('[AnnualPlanning] Invalid todos response structure:', response);
        setTodos([]);
      }
    } catch (error) {
      console.error('[AnnualPlanning] Failed to fetch todos:', error);
      setTodos([]);
      throw error; // Re-throw to be caught by Promise.all
    }
  }

  async function fetchVtoData() {
    try {
      console.log('[AnnualPlanning] Fetching VTO data...');
      const response = await businessBlueprintService.getBusinessBlueprint();
      console.log('[AnnualPlanning] VTO data loaded:', response ? 'Yes' : 'No');
      setBlueprintData(response || null);
    } catch (error) {
      console.error('[AnnualPlanning] Failed to fetch VTO data:', error);
      setBlueprintData(null);
      throw error; // Re-throw to be caught by Promise.all
    }
  }

  async function fetchTeamMembers() {
    try {
      console.log('[AnnualPlanning] Fetching team members...');
      const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
      const response = await teamsService.getTeamMembers(effectiveTeamId);
      const membersData = response?.data || response || [];
      console.log('[AnnualPlanning] Team members loaded:', membersData.length);
      setTeamMembers(membersData);
    } catch (error) {
      console.error('[AnnualPlanning] Failed to fetch team members:', error);
      setTeamMembers([]);
      throw error; // Re-throw to be caught by Promise.all
    }
  }

  // Event handlers
  const handleSectionChange = (newSection) => {
    setActiveSection(newSection);
    if (isLeader && broadcastSectionChange) {
      broadcastSectionChange(newSection);
    }
  };

  const handleToggleTodo = async (todoId) => {
    try {
      const todo = (todos || []).find(t => t.id === todoId);
      if (!todo) {
        console.error('Todo not found:', todoId);
        return;
      }
      
      const newStatus = todo.completed ? 'open' : 'completed';
      
      await todosService.updateTodo(todoId, { status: newStatus });
      
      setTodos(prev => (prev || []).map(t => 
        t.id === todoId ? { ...t, completed: !t.completed, status: newStatus } : t
      ));
      
      if (broadcastTodoListUpdate) {
        broadcastTodoListUpdate({
          action: 'status',
          todoId,
          status: newStatus,
          completed: !todo.completed
        });
      }
    } catch (error) {
      console.error('[AnnualPlanning] Failed to update todo:', error);
      setError('Failed to update todo');
    }
  };

  // Clear alerts
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Error boundary for critical errors
  if (error && loading === false) {
    return (
      <div 
        className="min-h-screen p-6 flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, 
            rgb(248, 250, 252) 0%, 
            rgb(239, 246, 255, 0.3) 50%, 
            rgb(238, 242, 255, 0.3) 100%)`
        }}
      >
        <div className="text-center max-w-md">
          <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Failed to Load Meeting</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()}
            className="text-white"
            style={{
              background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  // Loading state for initial data fetch
  if (loading) {
    return (
      <div 
        className="min-h-screen p-6 flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, 
            rgb(248, 250, 252) 0%, 
            rgb(239, 246, 255, 0.3) 50%, 
            rgb(238, 242, 255, 0.3) 100%)`
        }}
      >
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: themeColors.primary }} />
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Loading Annual Planning Meeting...</h2>
          <p className="text-gray-600">Preparing your data and meeting room</p>
        </div>
      </div>
    );
  }

  // Get current section
  const currentSection = sections.find(s => s.id === activeSection) || sections[0];

  // Render section content
  const renderSectionContent = () => {
    const cardClassName = "bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl";
    const headerClassName = "bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20 rounded-t-2xl";

    switch (activeSection) {
      case 'check-in-day1':
        return (
          <Card className={cardClassName}>
            <CardHeader className={headerClassName}>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" style={{ color: themeColors.primary }} />
                Day 1: Check-In
              </CardTitle>
              <CardDescription>Personal and professional connection to start the annual planning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <p className="text-gray-700 leading-relaxed">
                  Welcome to your Annual Planning Meeting! Start Day 1 by connecting as a team.
                </p>
                
                <div className="p-6 rounded-xl border" style={{ 
                  backgroundColor: hexToRgba(themeColors.accent, 0.03),
                  borderColor: hexToRgba(themeColors.accent, 0.2)
                }}>
                  <h4 className="font-semibold text-lg mb-4 text-gray-900">Go around the room and share:</h4>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div>
                        <span className="font-medium text-gray-700">Personal Best:</span>
                        <p className="text-sm text-gray-600">What was your best personal moment this year?</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <span className="font-medium text-gray-700">Professional Best:</span>
                        <p className="text-sm text-gray-600">What was your biggest professional win this year?</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Target className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <span className="font-medium text-gray-700">Goals for this session:</span>
                        <p className="text-sm text-gray-600">What do you hope to accomplish in these two days?</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Facilitator Note:</strong> Allow 5-10 minutes per person. This sets the tone for the entire session.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'review-previous':
        if (loading) {
          return (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          );
        }
        
        return (
          <Card className={cardClassName}>
            <CardHeader className={headerClassName}>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" style={{ color: themeColors.primary }} />
                Review Previous Year/Quarterly Rocks
              </CardTitle>
              <CardDescription>Celebrate wins and learn from the past year</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <p className="text-gray-700">
                  Review all rocks/priorities from the previous year and last quarter. Celebrate successes and identify learnings.
                </p>
                
                {(priorities || []).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No priorities found to review.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Current Priorities to Review:</h4>
                    <div className="grid gap-4">
                      {(priorities || []).map((priority) => (
                        <PriorityCard
                          key={priority.id}
                          priority={priority}
                          onEdit={() => {}}
                          onDelete={() => {}}
                          onStatusChange={() => {}}
                          teamMembers={teamMembers || []}
                          readOnly={true}
                          showProgress={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 text-green-900">Discussion Questions:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Which rocks were completed successfully? What made them successful?</li>
                    <li>• Which rocks weren't completed? What got in the way?</li>
                    <li>• What patterns do we see across the year?</li>
                    <li>• What would we do differently?</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'team-health':
        return (
          <Card className={cardClassName}>
            <CardHeader className={headerClassName}>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" style={{ color: themeColors.primary }} />
                Team Health
              </CardTitle>
              <CardDescription>Assess how well the team is functioning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <p className="text-gray-700">
                  Rate your team's health in key areas. Use a scale of 1-10 for each category.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'Communication', icon: MessageSquare },
                    { name: 'Trust', icon: Heart },
                    { name: 'Conflict Resolution', icon: AlertTriangle },
                    { name: 'Commitment', icon: Target },
                    { name: 'Accountability', icon: CheckSquare },
                    { name: 'Results Focus', icon: TrendingUp }
                  ].map((category) => (
                    <div key={category.name} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <category.icon className="w-4 h-4 text-gray-600" />
                        <h4 className="font-medium">{category.name}</h4>
                      </div>
                      <div className="flex gap-1">
                        {[1,2,3,4,5,6,7,8,9,10].map(num => (
                          <div
                            key={num}
                            className="w-6 h-6 border rounded text-xs flex items-center justify-center cursor-pointer hover:bg-blue-100"
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Discussion:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Where are our biggest gaps?</li>
                    <li>• What specific behaviors need to change?</li>
                    <li>• How will we improve our lowest scores?</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'org-checkup':
        return (
          <Card className={cardClassName}>
            <CardHeader className={headerClassName}>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" style={{ color: themeColors.primary }} />
                Organizational Checkup
              </CardTitle>
              <CardDescription>Assess the overall health of the organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <p className="text-gray-700">
                  Take the organizational pulse. Rate each area on a scale of 1-10.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'Vision Clarity', description: 'Everyone knows where we\'re going' },
                    { name: 'Data-Driven', description: 'We make decisions based on metrics' },
                    { name: 'Process Adherence', description: 'We follow our documented processes' },
                    { name: 'Traction', description: 'We execute on our priorities' },
                    { name: 'People Management', description: 'Right people in right seats' },
                    { name: 'Issue Resolution', description: 'We solve problems quickly' }
                  ].map((item) => (
                    <div key={item.name} className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-1">{item.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                      <div className="flex gap-1">
                        {[1,2,3,4,5,6,7,8,9,10].map(num => (
                          <div
                            key={num}
                            className="w-6 h-6 border rounded text-xs flex items-center justify-center cursor-pointer hover:bg-blue-100"
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 text-red-900">Areas for Improvement:</h4>
                  <p className="text-sm text-red-800">
                    Focus on the lowest scoring areas. These become issues to solve in your Issues List.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'swot':
        return (
          <Card className={cardClassName}>
            <CardHeader className={headerClassName}>
              <CardTitle className="flex items-center gap-2">
                <Grid className="w-5 h-5" style={{ color: themeColors.primary }} />
                S.W.O.T. Analysis/Issues List
              </CardTitle>
              <CardDescription>Analyze Strengths, Weaknesses, Opportunities, and Threats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">Strengths</h4>
                    <p className="text-sm text-green-800 mb-2">What do we do well?</p>
                    <div className="space-y-2">
                      {/* Strengths would be listed here */}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-semibold text-red-900 mb-2">Weaknesses</h4>
                    <p className="text-sm text-red-800 mb-2">What could we improve?</p>
                    <div className="space-y-2">
                      {/* Weaknesses would be listed here */}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Opportunities</h4>
                    <p className="text-sm text-blue-800 mb-2">What possibilities exist?</p>
                    <div className="space-y-2">
                      {/* Opportunities would be listed here */}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 mb-2">Threats</h4>
                    <p className="text-sm text-yellow-800 mb-2">What could hurt us?</p>
                    <div className="space-y-2">
                      {/* Threats would be listed here */}
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Current Issues List:</h4>
                  {(issues || []).length === 0 ? (
                    <p className="text-gray-500">No issues to display.</p>
                  ) : (
                    <IssuesListClean
                      issues={issues || []}
                      onEdit={() => {}}
                      onSave={() => {}}
                      teamMembers={teamMembers || []}
                      readOnly={true}
                      compactGrid={true}
                    />
                  )}
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-800">
                    <strong>Note:</strong> Turn SWOT items into specific issues that need to be solved. These will feed into your Issues List for IDS sessions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'vto':
        return (
          <Card className={cardClassName}>
            <CardHeader className={headerClassName}>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" style={{ color: themeColors.primary }} />
                V/TO™
              </CardTitle>
              <CardDescription>Review and update your Vision/Traction Organizer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {blueprintData ? (
                  <TwoPagePlanView
                    blueprintData={blueprintData}
                    readOnly={false}
                    onUpdate={fetchVtoData}
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No VTO data found. Create your Vision/Traction Organizer first.</p>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/business-blueprint')}
                      className="mt-4"
                    >
                      Create V/TO™
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'three-year':
        return (
          <Card className={cardClassName}>
            <CardHeader className={headerClassName}>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" style={{ color: themeColors.primary }} />
                3-Year Picture™
              </CardTitle>
              <CardDescription>Define what success looks like in 3 years</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <p className="text-gray-700">
                  Paint a clear picture of what your organization will look like in 3 years.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Revenue Target</h4>
                      <p className="text-sm text-blue-800">What will our annual revenue be?</p>
                      <Input 
                        placeholder="e.g., $10M"
                        className="mt-2"
                      />
                    </div>
                    
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2">Profit Target</h4>
                      <p className="text-sm text-green-800">What will our annual profit be?</p>
                      <Input 
                        placeholder="e.g., $2M"
                        className="mt-2"
                      />
                    </div>
                    
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-2">Team Size</h4>
                      <p className="text-sm text-purple-800">How many people will we have?</p>
                      <Input 
                        placeholder="e.g., 25 employees"
                        className="mt-2"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h4 className="font-semibold text-yellow-900 mb-2">Market Position</h4>
                      <p className="text-sm text-yellow-800">Where will we be in our market?</p>
                      <Textarea 
                        placeholder="e.g., Top 3 provider in our region..."
                        className="mt-2"
                        rows={3}
                      />
                    </div>
                    
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <h4 className="font-semibold text-indigo-900 mb-2">Culture & Values</h4>
                      <p className="text-sm text-indigo-800">What will our culture feel like?</p>
                      <Textarea 
                        placeholder="e.g., Collaborative, innovative, customer-focused..."
                        className="mt-2"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">3-Year Picture Summary</h4>
                  <Textarea 
                    placeholder="In 3 years, we will be..."
                    rows={4}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'check-in-day2':
        return (
          <Card className={cardClassName}>
            <CardHeader className={headerClassName}>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" style={{ color: themeColors.primary }} />
                Day 2: Check-In
              </CardTitle>
              <CardDescription>Reconnect and prepare for Day 2 planning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <p className="text-gray-700 leading-relaxed">
                  Welcome to Day 2! Check in on energy levels and readiness for the planning work ahead.
                </p>
                
                <div className="p-6 rounded-xl border" style={{ 
                  backgroundColor: hexToRgba(themeColors.accent, 0.03),
                  borderColor: hexToRgba(themeColors.accent, 0.2)
                }}>
                  <h4 className="font-semibold text-lg mb-4 text-gray-900">Quick check-in questions:</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Activity className="h-5 w-5 text-green-500 mt-0.5" />
                      <span className="text-gray-700">Energy level (1-10) and what you need to be at your best today</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-blue-500 mt-0.5" />
                      <span className="text-gray-700">One key insight from yesterday's discussions</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Target className="h-5 w-5 text-purple-500 mt-0.5" />
                      <span className="text-gray-700">Your focus priority for today's planning work</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-orange-800">
                    <strong>Day 2 Agenda:</strong> We'll review issues, create the 1-Year Plan, establish Q1 Rocks, and solve critical issues through IDS.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'review-issues':
        return (
          <Card className={cardClassName}>
            <CardHeader className={headerClassName}>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" style={{ color: themeColors.primary }} />
                Review Issues List/3-Year Picture™
              </CardTitle>
              <CardDescription>Prioritize issues and confirm 3-year vision</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-4">Issues to Address:</h4>
                    {(issues || []).length === 0 ? (
                      <p className="text-gray-500">No issues to review.</p>
                    ) : (
                      <IssuesListClean
                        issues={issues || []}
                        onEdit={() => {}}
                        onSave={() => {}}
                        teamMembers={teamMembers || []}
                        readOnly={true}
                        compactGrid={true}
                      />
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-4">3-Year Picture™ Confirmation:</h4>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800 mb-2">
                        Review yesterday's 3-Year Picture™. Does it still feel right?
                      </p>
                      <ul className="space-y-1 text-sm">
                        <li>• Are the revenue/profit targets realistic?</li>
                        <li>• Does the team size make sense?</li>
                        <li>• Is the market position achievable?</li>
                        <li>• Does the culture description resonate?</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Prioritization:</h4>
                  <p className="text-sm text-yellow-800">
                    Which issues MUST be solved this year to achieve the 3-Year Picture™? These become your focus areas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'one-year-plan':
        return (
          <Card className={cardClassName}>
            <CardHeader className={headerClassName}>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" style={{ color: themeColors.primary }} />
                1-Year Plan
              </CardTitle>
              <CardDescription>Create specific targets for the coming year</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <p className="text-gray-700">
                  Break down your 3-Year Picture™ into specific, measurable 1-year targets.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2">Revenue</h4>
                      <Input placeholder="Annual revenue target" />
                    </div>
                    
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Profit</h4>
                      <Input placeholder="Annual profit target" />
                    </div>
                    
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-2">Key Measurables</h4>
                      <Textarea 
                        placeholder="3-7 key metrics to track (customers, units, etc.)"
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h4 className="font-semibold text-yellow-900 mb-2">Strategic Initiatives</h4>
                      <Textarea 
                        placeholder="3-7 major projects/initiatives for the year"
                        rows={4}
                      />
                    </div>
                    
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <h4 className="font-semibold text-indigo-900 mb-2">People Plan</h4>
                      <Textarea 
                        placeholder="Hiring, organizational structure changes"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Success Metrics:</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    How will we know we've had a successful year?
                  </p>
                  <Textarea 
                    placeholder="Define 3-5 specific success criteria..."
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'quarterly-rocks':
        return (
          <Card className={cardClassName}>
            <CardHeader className={headerClassName}>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" style={{ color: themeColors.primary }} />
                Establish Quarterly Rocks
              </CardTitle>
              <CardDescription>Set 3-7 priorities for Q1 to start the year strong</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <p className="text-gray-700">
                  Based on your 1-Year Plan, what are the 3-7 most important things to accomplish in Q1?
                </p>
                
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Q1 Rocks/Priorities:</h4>
                  <Button
                    onClick={() => setShowAddPriority(true)}
                    className="text-white"
                    style={{
                      background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Q1 Rock
                  </Button>
                </div>
                
                {(priorities || []).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No Q1 rocks defined yet. Add your first priority above.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {(priorities || []).map((priority) => (
                      <PriorityCard
                        key={priority.id}
                        priority={priority}
                        onEdit={() => {}}
                        onDelete={() => {}}
                        onStatusChange={() => {}}
                        teamMembers={teamMembers || []}
                        readOnly={false}
                        showProgress={true}
                      />
                    ))}
                  </div>
                )}
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Rock Guidelines:</h4>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• 3-7 rocks maximum</li>
                    <li>• Specific and measurable</li>
                    <li>• Achievable in 90 days</li>
                    <li>• Clear owner assigned</li>
                    <li>• Moves you toward 1-Year Plan</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'ids':
        return (
          <Card className={cardClassName}>
            <CardHeader className={headerClassName}>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" style={{ color: themeColors.primary }} />
                IDS (Identify, Discuss, Solve)
              </CardTitle>
              <CardDescription>Solve the most critical issues blocking your success</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <p className="text-gray-700">
                  Use the IDS process to solve your highest priority issues. Focus on the top 3-5 issues that could derail your annual plan.
                </p>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-900 mb-2">IDS Process:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <h5 className="font-medium text-orange-900">Identify</h5>
                      <p className="text-orange-800">What exactly is the issue?</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-orange-900">Discuss</h5>
                      <p className="text-orange-800">Share all relevant information</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-orange-900">Solve</h5>
                      <p className="text-orange-800">Create action steps with ownership</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-4">Issues to Solve:</h4>
                  {(issues || []).length === 0 ? (
                    <p className="text-gray-500">No issues to solve.</p>
                  ) : (
                    <IssuesListClean
                      issues={issues || []}
                      onEdit={() => {}}
                      onSave={() => {}}
                      teamMembers={teamMembers || []}
                      readOnly={false}
                      showVoting={true}
                      enableDragDrop={true}
                    />
                  )}
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-900 mb-2">Focus Areas:</h4>
                  <p className="text-sm text-red-800">
                    Prioritize issues that could prevent you from achieving your Q1 rocks or 1-year plan. 
                    Don't try to solve everything - focus on the vital few.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'next-steps':
        return (
          <Card className={cardClassName}>
            <CardHeader className={headerClassName}>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" style={{ color: themeColors.primary }} />
                Next Steps / Conclude
              </CardTitle>
              <CardDescription>Review accomplishments and establish next steps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Review what was accomplished and establish next steps.
                </p>

                {/* Accomplishments */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 text-green-900">✓ What We Accomplished:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Reviewed last year's performance</li>
                    <li>• Assessed organizational health</li>
                    <li>• Completed SWOT analysis</li>
                    <li>• Refreshed V/TO™ and 3-Year Picture™</li>
                    <li>• Created 1-Year Plan</li>
                    <li>• Established Q1 Rocks</li>
                    <li>• Solved critical issues through IDS</li>
                  </ul>
                </div>

                {/* Action Items */}
                <div>
                  <h4 className="font-semibold mb-2">Action Items</h4>
                  <div className="space-y-2">
                    {(todos || []).map(todo => (
                      <div key={todo.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => handleToggleTodo(todo.id)}
                          className="rounded"
                        />
                        <span className={todo.completed ? 'line-through text-gray-500' : ''}>
                          {todo.title}
                        </span>
                        {todo.owner_name && (
                          <span className="text-sm text-gray-500">({todo.owner_name})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Communication Plan */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Communication Plan:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• How will we communicate this plan to the team?</li>
                    <li>• Who needs to know what?</li>
                    <li>• What's our rollout timeline?</li>
                  </ul>
                </div>

                {/* Rate the Meeting */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Rate This Meeting (1-10):</h4>
                  <p className="text-sm text-gray-600">
                    Everyone shares their rating and one thing to improve for next year's planning.
                  </p>
                </div>

                {/* Next Quarterly Meeting */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">📅 Next Meeting:</h4>
                  <p className="text-sm">
                    Q1 Quarterly Planning Meeting - Review Q1 rocks and plan Q2
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card className={cardClassName}>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">Section content not yet implemented.</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div 
      className="min-h-screen p-6"
      style={{
        background: `linear-gradient(135deg, 
          rgb(248, 250, 252) 0%, 
          rgb(239, 246, 255, 0.3) 50%, 
          rgb(238, 242, 255, 0.3) 100%)`
      }}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Alerts */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Meeting Bar */}
        <MeetingBar
          meetingType="annual-planning"
          sections={sections}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          isLeader={isLeader}
          participants={participants}
          meetingStarted={meetingStarted}
          elapsedTime={elapsedTime}
          themeColors={themeColors}
          showTimer={false} // No timer for annual planning
        />

        {/* Section Content */}
        {renderSectionContent()}

        {/* Priority Dialog */}
        <Dialog open={showAddPriority} onOpenChange={setShowAddPriority}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Q1 Rock</DialogTitle>
              <DialogDescription>
                Create a new quarterly priority to accomplish in Q1.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={priorityForm.title}
                  onChange={(e) => setPriorityForm({ ...priorityForm, title: e.target.value })}
                  placeholder="Clear, specific rock title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={priorityForm.description}
                  onChange={(e) => setPriorityForm({ ...priorityForm, description: e.target.value })}
                  placeholder="Additional details about this rock"
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
                      {(teamMembers || []).map((member) => (
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
                onClick={async () => {
                  try {
                    const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
                    await quarterlyPrioritiesService.createPriority({
                      ...priorityForm,
                      teamId: effectiveTeamId,
                      organizationId: user?.organizationId || user?.organization_id
                    });
                    setShowAddPriority(false);
                    setPriorityForm({
                      title: '',
                      description: '',
                      ownerId: '',
                      dueDate: '',
                      isCompanyPriority: false
                    });
                    setSuccess('Rock created successfully');
                    await fetchPrioritiesData();
                  } catch (error) {
                    console.error('Failed to create priority:', error);
                    setError('Failed to create rock');
                  }
                }}
                disabled={!priorityForm.title || !priorityForm.ownerId || !priorityForm.dueDate}
                className="text-white"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                }}
              >
                Create Rock
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
          onSave={async (issueData) => {
            try {
              const effectiveTeamId = teamId || getEffectiveTeamId(teamId, user);
              
              if (editingIssue) {
                await issuesService.updateIssue(editingIssue.id, issueData);
              } else {
                await issuesService.createIssue({
                  ...issueData,
                  teamId: effectiveTeamId
                });
              }
              
              await fetchIssuesData();
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
              await fetchTodosData();
              return true;
            } catch (error) {
              console.error('Failed to save todo:', error);
              throw error;
            }
          }}
        />
        
        {/* Floating Action Buttons */}
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
              <ListTodo className="h-6 w-6" />
            </Button>
            <div className="absolute right-16 top-1/2 transform -translate-y-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
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
                background: `linear-gradient(135deg, ${themeColors.secondary} 0%, ${themeColors.accent} 100%)`
              }}
            >
              <AlertTriangle className="h-6 w-6" />
            </Button>
            <div className="absolute right-16 top-1/2 transform -translate-y-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Add Issue
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnnualPlanningMeetingPage;