import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { getTeamId } from '../utils/teamUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { quarterlyPrioritiesService } from '../services/quarterlyPrioritiesService';
import { todosService } from '../services/todosService';
import { issuesService } from '../services/issuesService';
import { organizationService } from '../services/organizationService';
import { getOrgTheme, saveOrgTheme, hexToRgba } from '../utils/themeUtils';
import { businessBlueprintService } from '../services/businessBlueprintService';
import { getRevenueLabel } from '../utils/revenueUtils';
import TodosList from '../components/todos/TodosListClean';
import TodoDialog from '../components/todos/TodoDialog';
import IssueDialog from '../components/issues/IssueDialog';
import HeadlineDialog from '../components/headlines/HeadlineDialog';
import { headlinesService } from '../services/headlinesService';
import { useSelectedTodos } from '../contexts/SelectedTodosContext';
import { useTerminology } from '../contexts/TerminologyContext';
import { useDepartment } from '../contexts/DepartmentContext';
import PriorityDialog from '../components/priorities/PriorityDialog';
import {
  AlertCircle,
  CheckSquare,
  CheckCircle,
  Edit,
  X,
  ArrowRight,
  Plus,
  Calendar,
  Loader2,
  TrendingUp,
  DollarSign,
  Target,
  Sparkles,
  Activity,
  Users,
  ChartBar,
  User,
  Users2,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const DashboardClean = () => {
  const { user, isOnLeadershipTeam } = useAuthStore();
  
  // Utility function to calculate days until due
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
  const { labels } = useTerminology();
  const { selectedDepartment } = useDepartment();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState(null);
  const [showTodoDialog, setShowTodoDialog] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [showHeadlineDialog, setShowHeadlineDialog] = useState(false);
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [viewMode, setViewMode] = useState('my-items'); // 'my-items' or 'team-view'
  const [predictions, setPredictions] = useState({
    revenue: { target: 0, current: 0 },
    profit: { target: 0, current: 0 },
    measurables: { onTrack: 0, total: 0 }
  });
  const [editingPredictions, setEditingPredictions] = useState(false);
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  const [dashboardData, setDashboardData] = useState({
    priorities: [],
    todos: [],
    issues: [],
    teamMembers: [],
    stats: {
      prioritiesCompleted: 0,
      totalPriorities: 0,
      prioritiesProgress: 0,
      overdueItems: 0,
      totalShortTermIssues: 0
    }
  });
  
  // Re-fetch data when view mode or department changes
  useEffect(() => {
    if (user && selectedDepartment) {
      console.log('Dashboard useEffect triggered - viewMode:', viewMode, 'selectedDepartment:', selectedDepartment?.id);
      fetchDashboardData();
    }
  }, [viewMode, selectedDepartment, user]);
  
  useEffect(() => {
    if (user?.isConsultant && localStorage.getItem('consultantImpersonating') !== 'true') {
      navigate('/consultant');
    } else if (user) {
      fetchDashboardData();
      fetchOrganizationTheme();
      
      // Retry fetching business blueprint after a short delay if initial load fails
      // This helps with timing issues on initial login
      const retryTimer = setTimeout(() => {
        if (predictions?.revenue?.target === 0) {
          console.log('Dashboard - Retrying business blueprint fetch for predictions...');
          businessBlueprintService.getBusinessBlueprint()
            .then(blueprintResponse => {
              if (blueprintResponse?.oneYearPlan) {
                const oneYearPlan = blueprintResponse.oneYearPlan;
                let targetRevenue = 0;
                
                if (oneYearPlan.revenueStreams && oneYearPlan.revenueStreams.length > 0) {
                  targetRevenue = oneYearPlan.revenueStreams.reduce((sum, stream) => {
                    return sum + (parseFloat(stream.revenue_target) || 0);
                  }, 0);
                } else if (oneYearPlan.revenue) {
                  targetRevenue = parseFloat(oneYearPlan.revenue) || 0;
                }
                
                if (targetRevenue > 0) {
                  console.log('Dashboard - Retry successful, updating predictions with revenue:', targetRevenue);
                  setPredictions(prev => ({
                    ...prev,
                    revenue: {
                      ...prev.revenue,
                      target: targetRevenue
                    },
                    profit: {
                      ...prev.profit,
                      target: parseFloat(oneYearPlan.profit) || prev?.profit?.target || 0
                    }
                  }));
                }
              }
            })
            .catch(err => {
              console.error('Dashboard - Retry failed for business blueprint:', err);
            });
        }
      }, 2000);
      
      return () => clearTimeout(retryTimer);
    }
    
    // Listen for theme changes
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, [user, navigate]);

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

  // Automatically create issues for overdue todos

  const fetchOrganizationTheme = async () => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      
      // First check localStorage (org-specific)
      const savedTheme = getOrgTheme(orgId);
      if (savedTheme) {
        setThemeColors(savedTheme);
        return;
      }
      
      // Fetch from API
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
      // Use default colors on error
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const orgId = user?.organizationId || user?.organization_id;
      
      // Use the selected department from context for fetching data
      let teamIdForPriorities = selectedDepartment?.id;
      let userDepartmentId = selectedDepartment?.id;
      
      // If no department selected, fallback to leadership team
      if (!teamIdForPriorities) {
        const leadershipTeam = user?.teams?.find(team => team.is_leadership_team);
        if (leadershipTeam) {
          teamIdForPriorities = leadershipTeam.id;
          userDepartmentId = leadershipTeam.id;
        } else {
          // Fallback to leadership team ID if no teams found
          teamIdForPriorities = getTeamId(user, 'leadership');
          userDepartmentId = teamIdForPriorities;
        }
      }
      
      console.log('Dashboard fetching priorities with teamId:', teamIdForPriorities, 'userDepartmentId:', userDepartmentId, 'selectedDepartment:', selectedDepartment);
      
      // In team view mode, fetch all todos regardless of assignment
      const fetchAllForTeam = viewMode === 'team-view';
      
      const [prioritiesResponse, todosResponse, issuesResponse, orgResponse, blueprintResponse] = await Promise.all([
        quarterlyPrioritiesService.getCurrentPriorities(orgId, teamIdForPriorities),
        todosService.getTodos(null, null, fetchAllForTeam, userDepartmentId),
        issuesService.getIssues(null, false, userDepartmentId),
        isOnLeadershipTeam() ? organizationService.getOrganization() : Promise.resolve(null),
        businessBlueprintService.getBusinessBlueprint().catch(err => {
          console.error('Failed to fetch business blueprint:', err);
          return null;
        })
      ]);
      
      if (orgResponse) {
        setOrganization(orgResponse.data || orgResponse);
      }
      
      // Debug logging for blueprint response
      console.log('Dashboard - Blueprint Response:', blueprintResponse);
      console.log('Dashboard - One Year Plan:', blueprintResponse?.oneYearPlan);
      
      // Use 1-Year Plan data for predictions if available
      if (blueprintResponse?.oneYearPlan) {
        const oneYearPlan = blueprintResponse.oneYearPlan;
        
        // Calculate total revenue from revenue streams or use the revenue field
        let targetRevenue = 0;
        if (oneYearPlan.revenueStreams && oneYearPlan.revenueStreams.length > 0) {
          targetRevenue = oneYearPlan.revenueStreams.reduce((sum, stream) => {
            return sum + (parseFloat(stream.revenue_target) || 0);
          }, 0);
        } else if (oneYearPlan.revenue) {
          targetRevenue = parseFloat(oneYearPlan.revenue) || 0;
        }
        
        console.log('Dashboard - Calculated target revenue:', targetRevenue);
        
        setPredictions(prev => ({
          ...prev,
          revenue: {
            target: targetRevenue,
            current: prev?.revenue?.current || prioritiesResponse.predictions?.revenue?.current || 0
          },
          profit: {
            target: parseFloat(oneYearPlan.profit) || prev?.profit?.target || 0,
            current: prev?.profit?.current || prioritiesResponse.predictions?.profit?.current || 0
          },
          measurables: prev?.measurables || prioritiesResponse.predictions?.measurables || { onTrack: 0, total: 0 }
        }));
      } else if (prioritiesResponse.predictions) {
        console.log('Dashboard - Using priorities predictions:', prioritiesResponse.predictions);
        setPredictions(prioritiesResponse.predictions);
      } else {
        console.log('Dashboard - No predictions data available');
      }
      
      // Get priorities based on view mode
      let displayPriorities = [];
      let allPriorities = [];
      
      // Collect all priorities from the response
      if (prioritiesResponse.companyPriorities) {
        allPriorities.push(...prioritiesResponse.companyPriorities);
      }
      
      if (prioritiesResponse.teamMemberPriorities) {
        Object.entries(prioritiesResponse.teamMemberPriorities).forEach(([memberId, memberData]) => {
          if (memberData.priorities) {
            allPriorities.push(...memberData.priorities);
          }
        });
      }
      
      // If no priorities in expected structure, check if priorities are in a flat array
      if (allPriorities.length === 0 && Array.isArray(prioritiesResponse)) {
        allPriorities = prioritiesResponse;
      } else if (allPriorities.length === 0 && prioritiesResponse.priorities) {
        allPriorities = prioritiesResponse.priorities;
      }
      
      console.log('Dashboard - All priorities collected:', {
        count: allPriorities.length,
        viewMode: viewMode,
        selectedDepartmentId: selectedDepartment?.id,
        userId: user.id
      });
      
      if (viewMode === 'team-view') {
        // In team view, show all priorities for the selected team
        displayPriorities = allPriorities;
      } else {
        // In my items view, show only user's priorities
        displayPriorities = allPriorities.filter(p => {
          // Check multiple owner field formats
          const ownerId = p.owner?.id || p.owner_id || p.assigned_to_id;
          const isOwner = ownerId === user.id;
          console.log(`Priority "${p.title}" - ownerId: ${ownerId}, userId: ${user.id}, isOwner: ${isOwner}`);
          return isOwner;
        });
        console.log('User priorities filtered:', displayPriorities.length);
      }
      
      console.log('Total priorities found:', displayPriorities.length, 'for view:', viewMode);
      
      // Calculate priorities stats
      const completedPriorities = displayPriorities.filter(p => 
        p.status === 'complete' || p.status === 'completed'
      ).length;
      const totalPriorities = displayPriorities.length;
      const prioritiesProgress = totalPriorities > 0 ? Math.round((completedPriorities / totalPriorities) * 100) : 0;
      
      // Process todos
      const allTodos = todosResponse.data.todos || [];
      
      let displayTodos;
      if (viewMode === 'team-view') {
        // In team view, show all active todos
        displayTodos = allTodos.filter(todo => 
          todo.status !== 'completed' && todo.status !== 'complete'
        );
      } else {
        // In my items view, show only user's todos
        displayTodos = allTodos.filter(todo => {
          const assignedToId = todo.assignedTo?.id || todo.assigned_to?.id || todo.assigned_to_id;
          const isAssignedToUser = assignedToId === user.id;
          const isNotCompleted = todo.status !== 'completed' && todo.status !== 'complete';
          return isAssignedToUser && isNotCompleted;
        });
      }
      
      const userTodos = displayTodos;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const overdueTodos = userTodos.filter(todo => {
        if (!todo.due_date) return false;
        const dueDate = new Date(todo.due_date);
        return dueDate < today;
      }).length;
      
      console.log('Issues response:', issuesResponse.data);
      // Temporarily show ALL issues to debug
      const allIssues = issuesResponse.data.issues || [];
      console.log('All issues:', allIssues);
      console.log('Issue titles:', allIssues.map(i => ({ id: i.id, title: i.title, status: i.status, timeline: i.timeline, archived: i.archived })));
      const shortTermIssues = allIssues.filter(issue => 
        issue.timeline === 'short_term' && issue.status === 'open'
      );
      console.log('Filtered short-term open issues:', shortTermIssues);
      
      setDashboardData({
        priorities: displayPriorities,
        todos: viewMode === 'team-view' ? userTodos : userTodos.slice(0, 5),
        issues: shortTermIssues,
        teamMembers: todosResponse.data.teamMembers || [],
        stats: {
          prioritiesCompleted: completedPriorities,
          totalPriorities: totalPriorities,
          prioritiesProgress: prioritiesProgress,
          overdueItems: overdueTodos,
          totalShortTermIssues: shortTermIssues.length
        }
      });

      // Update selected priority if it's currently open
      if (selectedPriority) {
        const updatedPriority = displayPriorities.find(p => p.id === selectedPriority.id);
        if (updatedPriority) {
          setSelectedPriority(updatedPriority);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'complete':
        return { backgroundColor: themeColors.primary };
      case 'on-track':
        return { backgroundColor: themeColors.accent };
      case 'at-risk':
        return { backgroundColor: '#FBBF24' }; // Keep yellow for warning
      case 'off-track':
        return { backgroundColor: '#EF4444' }; // Keep red for danger
      default:
        return { backgroundColor: '#9CA3AF' };
    }
  };

  const formatRevenue = (value) => {
    if (!value || value === 0) return '$0';
    
    // The value is stored in millions, convert to actual amount
    const actualValue = value * 1000000;
    
    if (actualValue >= 1000000) {
      // For millions, show 1 decimal place
      const millions = actualValue / 1000000;
      return `$${millions.toFixed(1)}M`;
    } else if (actualValue >= 1000) {
      // For thousands, show 1 decimal place
      const thousands = actualValue / 1000;
      return `$${thousands.toFixed(1)}K`;
    } else {
      return `$${actualValue.toFixed(0)}`;
    }
  };

  const getCurrentPeriodDisplay = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    return `Q${currentQuarter} ${currentYear}`;
  };

  const handleSavePredictions = async () => {
    try {
      const orgId = user?.organizationId;
      const teamId = getTeamId(user, 'leadership');
      
      if (!orgId || !teamId) {
        console.error('Missing orgId or teamId for predictions update');
        return;
      }
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
      const quarter = `Q${currentQuarter}`;
      
      await quarterlyPrioritiesService.updatePredictions(orgId, teamId, {
        quarter,
        year: currentYear,
        revenue: predictions.revenue,
        profit: predictions.profit,
        measurables: predictions.measurables
      });
      
      setEditingPredictions(false);
    } catch (err) {
      console.error('Failed to save predictions:', err);
    }
  };

  const handleEditTodo = (todo) => {
    setEditingTodo(todo);
    setShowTodoDialog(true);
  };
  
  const handleTodoStatusChange = async (todo, isCompleted) => {
    try {
      const newStatus = isCompleted ? 'complete' : 'incomplete';
      await todosService.updateTodo(todo.id, { status: newStatus });
      await fetchDashboardData();
    } catch (error) {
      console.error('Failed to update todo status:', error);
    }
  };

  const handleCreateTodo = () => {
    setEditingTodo(null);
    setShowTodoDialog(true);
  };

  // Priority handlers
  const handleUpdatePriority = async (priorityId, updates) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getTeamId(user);
      
      await quarterlyPrioritiesService.updatePriority(orgId, teamId, priorityId, updates);
      await fetchDashboardData();
      // Update the selected priority if it's being edited
      if (selectedPriority?.id === priorityId) {
        setSelectedPriority(prev => ({ ...prev, ...updates }));
      }
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  const handleAddMilestone = async (priorityId, milestone) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getTeamId(user);
      
      await quarterlyPrioritiesService.createMilestone(orgId, teamId, priorityId, milestone);
      await fetchDashboardData();
    } catch (error) {
      console.error('Failed to add milestone:', error);
    }
  };

  const handleEditMilestone = async (priorityId, milestoneId, updates) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getTeamId(user);
      
      await quarterlyPrioritiesService.updateMilestone(orgId, teamId, priorityId, milestoneId, updates);
      await fetchDashboardData();
    } catch (error) {
      console.error('Failed to update milestone:', error);
    }
  };

  const handleDeleteMilestone = async (priorityId, milestoneId) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getTeamId(user);
      
      await quarterlyPrioritiesService.deleteMilestone(orgId, teamId, priorityId, milestoneId);
      await fetchDashboardData();
    } catch (error) {
      console.error('Failed to delete milestone:', error);
    }
  };

  const handleToggleMilestone = async (priorityId, milestoneId, completed) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getTeamId(user);
      
      await quarterlyPrioritiesService.updateMilestone(orgId, teamId, priorityId, milestoneId, { completed });
      
      // Update local state
      setDashboardData(prev => ({
        ...prev,
        priorities: prev.priorities?.map(p => 
          p.id === priorityId 
            ? {
                ...p,
                milestones: p.milestones?.map(m => 
                  m.id === milestoneId ? { ...m, completed } : m
                ) || []
              }
            : p
        ) || []
      }));
      
      // Update selected priority if it's the one being viewed
      if (selectedPriority?.id === priorityId) {
        setSelectedPriority(prev => ({
          ...prev,
          milestones: prev.milestones?.map(m => 
            m.id === milestoneId ? { ...m, completed } : m
          ) || []
        }));
      }
    } catch (error) {
      console.error('Failed to toggle milestone:', error);
    }
  };

  const handleAddUpdate = async (priorityId, updateText) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getTeamId(user);
      
      // Fix: Call the correct method name
      const response = await quarterlyPrioritiesService.addPriorityUpdate(orgId, teamId, priorityId, updateText);
      
      // Update local state with the new update
      const newUpdate = {
        id: response.id || Date.now(),
        text: response.update_text || updateText,
        createdAt: response.created_at || new Date().toISOString(),
        authorName: user?.name || 'You'
      };
      
      setDashboardData(prev => ({
        ...prev,
        priorities: prev.priorities?.map(p => 
          p.id === priorityId 
            ? { ...p, updates: [...(p.updates || []), newUpdate] }
            : p
        ) || []
      }));
      
      // Update selected priority if it's the one being viewed
      if (selectedPriority?.id === priorityId) {
        setSelectedPriority(prev => ({
          ...prev,
          updates: [...(prev.updates || []), newUpdate]
        }));
      }
    } catch (error) {
      console.error('Failed to add update:', error);
    }
  };

  const handleEditUpdate = async (priorityId, updateId, newText) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getTeamId(user);
      
      // Fix: Call the correct method name
      await quarterlyPrioritiesService.editPriorityUpdate(orgId, teamId, priorityId, updateId, newText);
      
      // Update local state immediately
      if (selectedPriority?.id === priorityId) {
        setSelectedPriority(prev => ({
          ...prev,
          updates: prev.updates?.map(u => 
            u.id === updateId ? { ...u, text: newText } : u
          ) || []
        }));
      }
      
      // Update the dashboardData priorities
      setDashboardData(prev => ({
        ...prev,
        priorities: prev.priorities.map(p => 
          p.id === priorityId 
            ? { ...p, updates: p.updates?.map(u => 
                u.id === updateId ? { ...u, text: newText } : u
              ) || [] }
            : p
        )
      }));
    } catch (error) {
      console.error('Failed to edit update:', error);
    }
  };

  const handleDeleteUpdate = async (priorityId, updateId) => {
    try {
      if (!window.confirm('Are you sure you want to delete this update?')) {
        return;
      }
      
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getTeamId(user);
      
      // Fix: Call the correct method name
      await quarterlyPrioritiesService.deletePriorityUpdate(orgId, teamId, priorityId, updateId);
      
      // Update local state to reflect deletion immediately
      if (selectedPriority?.id === priorityId) {
        setSelectedPriority(prev => ({
          ...prev,
          updates: prev.updates?.filter(u => u.id !== updateId) || []
        }));
      }
      
      // Update the dashboardData priorities
      setDashboardData(prev => ({
        ...prev,
        priorities: prev.priorities.map(p => 
          p.id === priorityId 
            ? { ...p, updates: p.updates?.filter(u => u.id !== updateId) || [] }
            : p
        )
      }));
    } catch (error) {
      console.error('Failed to delete update:', error);
    }
  };

  const handleStatusChange = async (priorityId, newStatus) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getTeamId(user);
      
      await quarterlyPrioritiesService.updatePriority(orgId, teamId, priorityId, { status: newStatus });
      
      // Update local state instead of refetching to prevent flashing
      setDashboardData(prev => ({
        ...prev,
        priorities: prev.priorities?.map(p => 
          p.id === priorityId ? { ...p, status: newStatus } : p
        ) || []
      }));
      
      // Update selected priority if it's the one being viewed
      if (selectedPriority?.id === priorityId) {
        setSelectedPriority(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      console.error('Failed to change priority status:', error);
      // Revert on error
      await fetchDashboardData();
    }
  };

  const handleArchivePriority = async (priorityId) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getTeamId(user);
      
      await quarterlyPrioritiesService.archivePriority(orgId, teamId, priorityId);
      await fetchDashboardData();
      setShowPriorityDialog(false);
    } catch (error) {
      console.error('Failed to archive priority:', error);
    }
  };

  const handleUploadAttachment = async (priorityId, file) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getTeamId(user);
      
      await quarterlyPrioritiesService.uploadAttachment(orgId, teamId, priorityId, file);
      await fetchDashboardData();
    } catch (error) {
      console.error('Failed to upload attachment:', error);
    }
  };

  const handleDownloadAttachment = async (priorityId, attachmentId) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getTeamId(user);
      
      await quarterlyPrioritiesService.downloadAttachment(orgId, teamId, priorityId, attachmentId);
    } catch (error) {
      console.error('Failed to download attachment:', error);
    }
  };

  const handleDeleteAttachment = async (priorityId, attachmentId) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getTeamId(user);
      
      await quarterlyPrioritiesService.deleteAttachment(orgId, teamId, priorityId, attachmentId);
      await fetchDashboardData();
    } catch (error) {
      console.error('Failed to delete attachment:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Enhanced Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
                   style={{
                     background: `linear-gradient(135deg, ${themeColors.primary}15 0%, ${themeColors.secondary}15 100%)`,
                     color: themeColors.primary
                   }}>
                <Sparkles className="h-4 w-4" />
                ADAPTIVE EXECUTION PLATFORM
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                Welcome back, {user?.firstName}
              </h1>
              <p className="text-slate-600 mt-2">
                {format(new Date(), 'EEEE, MMMM d')}
              </p>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-xl p-1 shadow-sm border border-white/50">
              <Button
                variant={viewMode === 'my-items' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('my-items')}
                className={`rounded-lg transition-all ${viewMode === 'my-items' ? '' : 'hover:bg-slate-100'}`}
                style={viewMode === 'my-items' ? {
                  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                } : {}}
              >
                <User className="h-4 w-4 mr-2" />
                My Items
              </Button>
              <Button
                variant={viewMode === 'team-view' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('team-view')}
                className={`rounded-lg transition-all ${viewMode === 'team-view' ? '' : 'hover:bg-slate-100'}`}
                style={viewMode === 'team-view' ? {
                  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                } : {}}
              >
                <Users2 className="h-4 w-4 mr-2" />
                Team View
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Enhanced Priorities Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                     style={{
                       background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                     }}>
                  <Target className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {viewMode === 'team-view' ? `All Team ${labels.priorities_label}` : `Your ${labels.priorities_label}`}
                  {dashboardData.priorities.length > 0 && (() => {
                    const completed = dashboardData.priorities.filter(p => 
                      p.status === 'complete' || p.status === 'completed' || p.progress === 100
                    ).length;
                    const total = dashboardData.priorities.length;
                    const percentage = Math.round((completed / total) * 100);
                    return (
                      <span className="ml-3 text-sm font-normal text-slate-600">
                        {completed}/{total} ({percentage}%)
                      </span>
                    );
                  })()}
                </h2>
              </div>
              <Link 
                to="/quarterly-priorities" 
                className="text-sm font-medium flex items-center gap-1 transition-all rounded-lg px-3 py-1.5 hover:bg-slate-100"
                style={{ color: themeColors.primary }}
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            
            {dashboardData.priorities.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-slate-200" style={{
                background: `linear-gradient(135deg, ${hexToRgba(themeColors.primary, 0.05)} 0%, ${hexToRgba(themeColors.secondary, 0.05)} 100%)`
              }}>
                <p className="text-slate-600 mb-3">No priorities assigned</p>
                <Button 
                  className="text-white rounded-lg transition-all transform hover:scale-[1.02]"
                  size="sm"
                  style={{
                    background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = 'brightness(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = 'brightness(1)';
                  }}
                  onClick={() => {
                    setSelectedPriority(null);
                    setShowPriorityDialog(true);
                  }}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add {labels.priority_singular}
                </Button>
              </div>
            ) : viewMode === 'team-view' ? (
              // Team View: Group by owner
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {(() => {
                  // Group priorities by owner
                  const groupedPriorities = dashboardData.priorities.reduce((groups, priority) => {
                    const ownerName = priority.owner?.name || 'Unassigned';
                    if (!groups[ownerName]) {
                      groups[ownerName] = [];
                    }
                    groups[ownerName].push(priority);
                    return groups;
                  }, {});
                  
                  return Object.entries(groupedPriorities).map(([ownerName, priorities]) => (
                    <div key={ownerName} className="space-y-2">
                      <h3 className="text-sm font-semibold text-slate-700 px-2">
                        {ownerName} ({priorities.length})
                      </h3>
                      {priorities.map((priority) => {
                        const isComplete = priority.status === 'complete' || 
                                         priority.status === 'completed' || 
                                         priority.progress === 100;
                        
                        // Calculate overdue milestones
                        const overdueMilestones = (priority.milestones || []).filter(
                          m => !m.completed && getDaysUntilDue(m.dueDate) < 0
                        );
                        
                        return (
                          <div 
                            key={priority.id} 
                            className={`group p-3 rounded-lg border transition-all cursor-pointer hover:scale-[1.01] ml-4 ${
                              isComplete 
                                ? 'bg-gradient-to-r from-green-50/80 to-emerald-50/80 border-green-200 hover:shadow-lg' 
                                : priority.status === 'off-track'
                                ? 'bg-white/60 border-red-200 hover:shadow-md'
                                : 'bg-white/60 border-slate-200 hover:shadow-md'
                            }`}
                            onClick={() => {
                              setSelectedPriority(priority);
                              setShowPriorityDialog(true);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              {isComplete ? (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
                                  <CheckCircle className="h-4 w-4 text-white" />
                                </div>
                              ) : (
                                <div className="w-1.5 h-8 rounded-full" style={getStatusStyle(priority.status)} />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${
                                  isComplete 
                                    ? 'text-green-900 line-through decoration-green-400' 
                                    : 'text-slate-900 group-hover:text-slate-950'
                                }`}>
                                  {priority.title}
                                </p>
                                <p className={`text-xs mt-0.5 ${
                                  isComplete ? 'text-green-700' : 'text-slate-600'
                                }`}>
                                  Due {priority.dueDate ? format(new Date(priority.dueDate), 'MMM d') : 'No date'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Overdue milestone indicator */}
                                {overdueMilestones.length > 0 && !isComplete && (
                                  <div className="flex items-center gap-1 group/tooltip relative">
                                    <div className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                                      {overdueMilestones.length}
                                    </div>
                                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover/tooltip:block z-50">
                                      <div className="bg-slate-900 text-white text-xs rounded-lg py-1.5 px-2.5 whitespace-nowrap">
                                        {overdueMilestones.length} overdue milestone{overdueMilestones.length > 1 ? 's' : ''}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {isComplete ? (
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-green-100 text-green-800 border-green-200 px-1.5 py-0.5 text-xs font-semibold">
                                      ✓
                                    </Badge>
                                    <span className="text-xs text-green-600 font-medium">100%</span>
                                  </div>
                                ) : (
                                  <span className="text-xs font-medium" style={{ color: themeColors.primary }}>
                                    {priority.progress || 0}%
                                  </span>
                                )}
                              }
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            ) : (
              // My Items View: Flat list
              <div className="space-y-3">
                {dashboardData.priorities.map((priority) => {
                  // Check multiple ways a priority might be marked as complete
                  const isComplete = priority.status === 'complete' || 
                                     priority.status === 'completed' || 
                                     priority.progress === 100;
                  
                  // Calculate overdue milestones
                  const overdueMilestones = (priority.milestones || []).filter(
                    m => !m.completed && getDaysUntilDue(m.dueDate) < 0
                  );
                  
                  console.log('Priority status check:', { 
                    title: priority.title, 
                    status: priority.status, 
                    progress: priority.progress, 
                    isComplete 
                  });
                  return (
                    <div 
                      key={priority.id} 
                      className={`group p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] ${
                        isComplete 
                          ? 'bg-gradient-to-r from-green-50/80 to-emerald-50/80 border-green-200 hover:shadow-lg' 
                          : priority.status === 'off-track'
                          ? 'bg-white/60 border-red-200 hover:shadow-md'
                          : 'bg-white/60 border-slate-200 hover:shadow-md'
                      }`}
                      onClick={() => {
                        setSelectedPriority(priority);
                        setShowPriorityDialog(true);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {isComplete ? (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
                            <CheckCircle className="h-5 w-5 text-white" />
                          </div>
                        ) : (
                          <div className="w-2 h-12 rounded-full" style={getStatusStyle(priority.status)} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${
                            isComplete 
                              ? 'text-green-900 line-through decoration-green-400' 
                              : 'text-slate-900 group-hover:text-slate-950'
                          }`}>
                            {priority.title}
                          </p>
                          <p className={`text-xs mt-1 ${
                            isComplete ? 'text-green-700' : 'text-slate-600'
                          }`}>
                            {priority.owner?.name || 'Unassigned'} • Due {priority.dueDate ? format(new Date(priority.dueDate), 'MMM d') : 'No date'}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          {/* Overdue milestone indicator */}
                          {overdueMilestones.length > 0 && !isComplete && (
                            <div className="flex items-center gap-1 group/tooltip relative">
                              <div className="w-6 h-6 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
                                {overdueMilestones.length}
                              </div>
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                              {/* Tooltip */}
                              <div className="absolute bottom-full right-0 mb-2 hidden group-hover/tooltip:block z-50">
                                <div className="bg-slate-900 text-white text-xs rounded-lg py-1.5 px-2.5 whitespace-nowrap">
                                  {overdueMilestones.length} overdue milestone{overdueMilestones.length > 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                          )}
                          <div>
                            {isComplete ? (
                              <div className="flex flex-col items-end gap-1">
                                <Badge className="bg-green-100 text-green-800 border-green-200 px-2 py-0.5 text-xs font-semibold">
                                  ✓ Complete
                                </Badge>
                                <span className="text-xs text-green-600 font-medium">100%</span>
                              </div>
                            ) : (
                              <>
                                <span className="text-sm font-medium" style={{ color: themeColors.primary }}>
                                  {priority.progress || 0}%
                                </span>
                                {priority.progress > 0 && (
                                  <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                    <div 
                                      className="h-full rounded-full transition-all"
                                      style={{ 
                                        width: `${priority.progress || 0}%`,
                                        background: `linear-gradient(90deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                                      }}
                                    />
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Enhanced To-Dos Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                     style={{
                       background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                     }}>
                  <CheckSquare className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {viewMode === 'team-view' ? `All Team ${labels.todos_label}` : `Your ${labels.todos_label}`}
                </h2>
              </div>
              <Link 
                to="/todos" 
                className="text-sm font-medium flex items-center gap-1 transition-all rounded-lg px-3 py-1.5 hover:bg-slate-100"
                style={{ color: themeColors.primary }}
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            
            {dashboardData.todos.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-slate-200" style={{
                background: `linear-gradient(135deg, ${hexToRgba(themeColors.primary, 0.05)} 0%, ${hexToRgba(themeColors.secondary, 0.05)} 100%)`
              }}>
                <p className="text-slate-600 mb-3">No to-dos assigned</p>
                <Button 
                  className="text-white rounded-lg transition-all transform hover:scale-[1.02]"
                  size="sm" 
                  style={{
                    background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = 'brightness(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = 'brightness(1)';
                  }}
                  onClick={handleCreateTodo}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create To-Do
                </Button>
              </div>
            ) : viewMode === 'team-view' ? (
              // Team View: Group by assignee but use TodosList for rendering
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {(() => {
                  // Group todos by assignee
                  const groupedTodos = dashboardData.todos.reduce((groups, todo) => {
                    // Get assignee name from various possible structures
                    let assigneeName = 'Unassigned';
                    if (todo.assignedTo) {
                      assigneeName = todo.assignedTo.name || 
                        `${todo.assignedTo.first_name || ''} ${todo.assignedTo.last_name || ''}`.trim() ||
                        'Unassigned';
                    } else if (todo.assigned_to) {
                      assigneeName = todo.assigned_to.name || 
                        `${todo.assigned_to.first_name || ''} ${todo.assigned_to.last_name || ''}`.trim() ||
                        'Unassigned';
                    }
                    
                    if (!groups[assigneeName]) {
                      groups[assigneeName] = [];
                    }
                    groups[assigneeName].push(todo);
                    return groups;
                  }, {});
                  
                  return Object.entries(groupedTodos).map(([assigneeName, todos]) => (
                    <div key={assigneeName} className="space-y-2">
                      <h3 className="text-sm font-semibold text-slate-700 px-2">
                        {assigneeName} ({todos.length})
                      </h3>
                      <div className="ml-4">
                        <TodosList
                          todos={todos}
                          onEdit={handleEditTodo}
                          onDelete={() => {}}
                          onUpdate={fetchDashboardData}
                          onStatusChange={async (todoId, isCompleted) => {
                            // Find the todo from all todos, not just the grouped subset
                            const todo = dashboardData.todos.find(t => t.id === todoId) || todos.find(t => t.id === todoId);
                            if (todo) {
                              await handleTodoStatusChange(todo, isCompleted);
                            }
                          }}
                          showCompleted={false}
                          hideViewToggle={true}
                          hideSortOptions={true}
                          hideAssignee={true}
                        />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              // My Items View: Use TodosList component
              <TodosList
                todos={dashboardData.todos}
                onEdit={handleEditTodo}
                onDelete={() => {}}
                onUpdate={fetchDashboardData}
                onStatusChange={async (todoId, isCompleted) => {
                  const todo = dashboardData.todos.find(t => t.id === todoId);
                  if (todo) {
                    await handleTodoStatusChange(todo, isCompleted);
                  }
                }}
                showCompleted={false}
                hideViewToggle={true}
                hideSortOptions={true}
              />
            )}
          </div>
        </div>

        {/* Enhanced Quick Actions */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-4 w-4" style={{ color: themeColors.primary }} />
            <h3 className="text-sm font-semibold text-slate-700">Quick Actions</h3>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button 
              className="bg-white/80 backdrop-blur-sm border border-slate-200 hover:shadow-md hover:scale-[1.02] transition-all rounded-lg"
              variant="outline" 
              size="sm" 
              onClick={() => {
                setEditingIssue(null);
                setShowIssueDialog(true);
              }}
            >
              <AlertCircle className="mr-2 h-4 w-4" style={{ color: themeColors.primary }} />
              Add Issue
            </Button>
            <Button 
              className="bg-white/80 backdrop-blur-sm border border-slate-200 hover:shadow-md hover:scale-[1.02] transition-all rounded-lg"
              variant="outline" 
              size="sm" 
              onClick={() => {
                setEditingTodo(null);
                setShowTodoDialog(true);
              }}
            >
              <CheckSquare className="mr-2 h-4 w-4" style={{ color: themeColors.primary }} />
              Add To Do
            </Button>
            <Button 
              className="bg-white/80 backdrop-blur-sm border border-slate-200 hover:shadow-md hover:scale-[1.02] transition-all rounded-lg"
              variant="outline" 
              size="sm" 
              onClick={() => setShowHeadlineDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" style={{ color: themeColors.primary }} />
              Add Headline
            </Button>
          </div>
        </div>

        {/* Todo Dialog */}
        <TodoDialog
          open={showTodoDialog}
          onOpenChange={setShowTodoDialog}
          todo={editingTodo}
          teamMembers={dashboardData.teamMembers || []}
          onSave={async (todoData) => {
            try {
              // Add organization_id and team_id if not present
              const orgId = user?.organizationId || user?.organization_id;
              
              // Get the user's actual department/team ID (same logic as fetchDashboardData)
              let userTeamId = null;
              if (user?.teams && user.teams.length > 0) {
                const nonLeadershipTeam = user.teams.find(team => !team.is_leadership_team);
                if (nonLeadershipTeam) {
                  userTeamId = nonLeadershipTeam.id;
                } else {
                  const leadershipTeam = user.teams.find(team => team.is_leadership_team);
                  userTeamId = leadershipTeam ? leadershipTeam.id : user.teams[0].id;
                }
              }
              
              const todoDataWithOrgInfo = {
                ...todoData,
                organization_id: orgId,
                team_id: userTeamId,
                department_id: userTeamId
              };
              
              let savedTodo;
              if (editingTodo) {
                savedTodo = await todosService.updateTodo(editingTodo.id, todoDataWithOrgInfo);
              } else {
                const createdTodo = await todosService.createTodo(todoDataWithOrgInfo);
                savedTodo = createdTodo;
              }
              await fetchDashboardData();
              setShowTodoDialog(false);
              setEditingTodo(null);
              return savedTodo; // Return the todo so attachments can be uploaded
            } catch (error) {
              console.error('Failed to save todo:', error);
              // Don't close the dialog on error
              throw error; // Re-throw to let TodoDialog handle it
            }
          }}
        />

        {/* Issue Dialog */}
        <IssueDialog
          open={showIssueDialog}
          onClose={() => setShowIssueDialog(false)}
          issue={editingIssue}
          teamMembers={dashboardData.teamMembers || []}
          timeline="short_term"
          onSave={async (issueData) => {
            try {
              const orgId = user?.organizationId || user?.organization_id;
              
              // Get the user's actual department/team ID (same logic as fetchDashboardData)
              let userTeamId = null;
              if (user?.teams && user.teams.length > 0) {
                const nonLeadershipTeam = user.teams.find(team => !team.is_leadership_team);
                if (nonLeadershipTeam) {
                  userTeamId = nonLeadershipTeam.id;
                } else {
                  const leadershipTeam = user.teams.find(team => team.is_leadership_team);
                  userTeamId = leadershipTeam ? leadershipTeam.id : user.teams[0].id;
                }
              }
              
              const issueDataWithOrgInfo = {
                ...issueData,
                organization_id: orgId,
                department_id: userTeamId,
                timeline: issueData.timeline || 'short_term'
              };
              
              let savedIssue;
              if (editingIssue) {
                savedIssue = await issuesService.updateIssue(editingIssue.id, issueDataWithOrgInfo);
              } else {
                console.log('Creating issue with data:', issueDataWithOrgInfo);
                const createdIssue = await issuesService.createIssue(issueDataWithOrgInfo);
                console.log('Issue created successfully:', createdIssue);
                console.log('Created issue ID:', createdIssue?.id);
                console.log('Created issue title:', createdIssue?.title);
                savedIssue = createdIssue;
              }
              await fetchDashboardData();
              setShowIssueDialog(false);
              setEditingIssue(null);
              return savedIssue; // Return the issue so attachments can be uploaded
            } catch (error) {
              console.error('Failed to save issue:', error);
              throw error;
            }
          }}
        />

        {/* Headline Dialog */}
        <HeadlineDialog
          open={showHeadlineDialog}
          onOpenChange={setShowHeadlineDialog}
          onSave={async (headlineData) => {
            // Get the user's actual department/team ID (same logic as fetchDashboardData)
            let userTeamId = null;
            if (user?.teams && user.teams.length > 0) {
              const nonLeadershipTeam = user.teams.find(team => !team.is_leadership_team);
              if (nonLeadershipTeam) {
                userTeamId = nonLeadershipTeam.id;
              } else {
                const leadershipTeam = user.teams.find(team => team.is_leadership_team);
                userTeamId = leadershipTeam ? leadershipTeam.id : user.teams[0].id;
              }
            }
            
            await headlinesService.createHeadline({
              ...headlineData,
              teamId: userTeamId
            });
            // Success is handled in the dialog component
          }}
        />

        {/* Priority Dialog */}
        <PriorityDialog
          open={showPriorityDialog}
          onOpenChange={setShowPriorityDialog}
          priority={selectedPriority}
          teamMembers={dashboardData.teamMembers || []}
          onUpdate={handleUpdatePriority}
          onAddMilestone={handleAddMilestone}
          onEditMilestone={handleEditMilestone}
          onDeleteMilestone={handleDeleteMilestone}
          onToggleMilestone={handleToggleMilestone}
          onAddUpdate={handleAddUpdate}
          onEditUpdate={handleEditUpdate}
          onDeleteUpdate={handleDeleteUpdate}
          onUploadAttachment={handleUploadAttachment}
          onDownloadAttachment={handleDownloadAttachment}
          onDeleteAttachment={handleDeleteAttachment}
          onArchive={handleArchivePriority}
        />
      </div>
    </div>
  );
};

export default DashboardClean;