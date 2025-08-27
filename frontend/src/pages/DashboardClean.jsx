import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { getTeamId } from '../utils/teamUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { quarterlyPrioritiesService } from '../services/quarterlyPrioritiesService';
import { todosService } from '../services/todosService';
import { issuesService } from '../services/issuesService';
import { organizationService } from '../services/organizationService';
import { getOrgTheme, saveOrgTheme } from '../utils/themeUtils';
import { businessBlueprintService } from '../services/businessBlueprintService';
import { getRevenueLabel } from '../utils/revenueUtils';
import TodosList from '../components/todos/TodosListClean';
import TodoDialog from '../components/todos/TodoDialog';
import IssueDialog from '../components/issues/IssueDialog';
import HeadlineDialog from '../components/headlines/HeadlineDialog';
import { headlinesService } from '../services/headlinesService';
import { useSelectedTodos } from '../contexts/SelectedTodosContext';
import { useTerminology } from '../contexts/TerminologyContext';
import PriorityCardClean from '../components/priorities/PriorityCardClean';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  AlertCircle,
  CheckSquare,
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
  ChartBar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const DashboardClean = () => {
  const { user, isOnLeadershipTeam } = useAuthStore();
  const { labels } = useTerminology();
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
      
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      
      // For dashboard, fetch priorities from user's actual department team, not leadership
      let userDepartmentId = null;
      let teamIdForPriorities = null;
      
      if (user?.teams && user.teams.length > 0) {
        // Find the user's actual department team (non-leadership)
        const nonLeadershipTeam = user.teams.find(team => !team.is_leadership_team);
        if (nonLeadershipTeam) {
          userDepartmentId = nonLeadershipTeam.id;
          teamIdForPriorities = nonLeadershipTeam.id;
        } else {
          // If user is only on leadership team, use that
          const leadershipTeam = user.teams.find(team => team.is_leadership_team);
          if (leadershipTeam) {
            userDepartmentId = leadershipTeam.id;
            teamIdForPriorities = leadershipTeam.id;
          } else {
            // Fallback to first team
            userDepartmentId = user.teams[0].id;
            teamIdForPriorities = user.teams[0].id;
          }
        }
      } else {
        // Fallback to leadership team ID if no teams found
        teamIdForPriorities = getTeamId(user, 'leadership');
      }
      
      console.log('Dashboard fetching priorities with teamId:', teamIdForPriorities, 'userDepartmentId:', userDepartmentId);
      
      const [prioritiesResponse, todosResponse, issuesResponse, orgResponse, blueprintResponse] = await Promise.all([
        quarterlyPrioritiesService.getCurrentPriorities(orgId, teamIdForPriorities),
        todosService.getTodos(null, null, true, userDepartmentId),
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
      
      // Get user's priorities (including company priorities they own)
      const userPriorities = [];
      
      console.log('Dashboard Priorities Response:', {
        hasCompanyPriorities: !!prioritiesResponse.companyPriorities,
        companyPrioritiesCount: prioritiesResponse.companyPriorities?.length || 0,
        teamMemberPrioritiesKeys: Object.keys(prioritiesResponse.teamMemberPriorities || {}),
        userId: user.id,
        userEmail: user.email
      });
      
      if (prioritiesResponse.companyPriorities) {
        // Include company priorities owned by the user
        const userCompanyPriorities = prioritiesResponse.companyPriorities.filter(p => {
          // Check both owner.id and owner_id for compatibility
          const ownerId = p.owner?.id || p.owner_id;
          const isOwner = ownerId === user.id;
          console.log(`Priority "${p.title}" - ownerId: ${ownerId}, userId: ${user.id}, isOwner: ${isOwner}`);
          return isOwner;
        });
        console.log('User Company Priorities:', userCompanyPriorities.map(p => ({
          title: p.title,
          ownerId: p.owner?.id || p.owner_id,
          status: p.status
        })));
        userPriorities.push(...userCompanyPriorities);
      }
      
      if (prioritiesResponse.teamMemberPriorities?.[user.id]) {
        const memberPriorities = prioritiesResponse.teamMemberPriorities[user.id].priorities;
        console.log('User Individual Priorities:', memberPriorities.map(p => ({
          title: p.title,
          status: p.status
        })));
        userPriorities.push(...memberPriorities);
      }
      
      console.log('Total user priorities found:', userPriorities.length);
      
      // Calculate priorities stats
      let completedPriorities, totalPriorities, prioritiesProgress;
      
      if (isOnLeadershipTeam()) {
        const companyPriorities = prioritiesResponse.companyPriorities || [];
        completedPriorities = companyPriorities.filter(p => p.status === 'complete').length;
        totalPriorities = companyPriorities.length;
        prioritiesProgress = totalPriorities > 0 ? Math.round((completedPriorities / totalPriorities) * 100) : 0;
      } else {
        completedPriorities = userPriorities.filter(p => p.status === 'complete').length;
        totalPriorities = userPriorities.length;
        prioritiesProgress = totalPriorities > 0 ? Math.round((completedPriorities / totalPriorities) * 100) : 0;
      }
      
      // Process todos
      const allTodos = todosResponse.data.todos || [];
      
      const userTodos = allTodos.filter(todo => {
        const assignedToId = todo.assignedTo?.id || todo.assigned_to?.id || todo.assigned_to_id;
        const isAssignedToUser = assignedToId === user.id;
        const isNotCompleted = todo.status !== 'completed' && todo.status !== 'complete';
        return isAssignedToUser && isNotCompleted;
      });
      
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
        priorities: userPriorities, // Show all user priorities, not just 5
        todos: userTodos.slice(0, 5),
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
        const updatedPriority = userPriorities.find(p => p.id === selectedPriority.id);
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
      await fetchDashboardData();
    } catch (error) {
      console.error('Failed to toggle milestone:', error);
    }
  };

  const handleAddUpdate = async (priorityId, updateText) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getTeamId(user);
      
      await quarterlyPrioritiesService.createUpdate(orgId, teamId, priorityId, { text: updateText });
      await fetchDashboardData();
    } catch (error) {
      console.error('Failed to add update:', error);
    }
  };

  const handleEditUpdate = async (priorityId, updateId, newText) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getTeamId(user);
      
      await quarterlyPrioritiesService.updateUpdate(orgId, teamId, priorityId, updateId, { text: newText });
      await fetchDashboardData();
    } catch (error) {
      console.error('Failed to edit update:', error);
    }
  };

  const handleDeleteUpdate = async (priorityId, updateId) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getTeamId(user);
      
      await quarterlyPrioritiesService.deleteUpdate(orgId, teamId, priorityId, updateId);
      await fetchDashboardData();
    } catch (error) {
      console.error('Failed to delete update:', error);
    }
  };

  const handleStatusChange = async (priorityId, newStatus) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getTeamId(user);
      
      await quarterlyPrioritiesService.updatePriority(orgId, teamId, priorityId, { status: newStatus });
      await fetchDashboardData();
    } catch (error) {
      console.error('Failed to change priority status:', error);
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
            {format(new Date(), 'EEEE, MMMM d')} • Your command center awaits
          </p>
        </div>

        {/* Enhanced Predictions Section - Only for Leadership */}
        {isOnLeadershipTeam() && (
          <div className="mb-8 p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                     style={{
                       background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                     }}>
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Annual Predictions
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingPredictions(!editingPredictions)}
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
              >
                {editingPredictions ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
              </Button>
            </div>

            {editingPredictions ? (
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <Label className="text-sm text-gray-600">{getRevenueLabel(organization)} (in millions)</Label>
                  <div className="mt-2 space-y-2">
                    <div>
                      <Label className="text-xs text-gray-500">Current</Label>
                      <div className="flex items-center">
                        <span className="text-sm mr-1">$</span>
                        <Input
                          type="number"
                          step="0.001"
                          value={predictions?.revenue?.current || 0}
                          onChange={(e) => setPredictions({
                            ...predictions,
                            revenue: { ...predictions.revenue, current: parseFloat(e.target.value) || 0 }
                          })}
                          className="h-8"
                          placeholder="0.635"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Target</Label>
                      <div className="flex items-center">
                        <span className="text-sm mr-1">$</span>
                        <Input
                          type="number"
                          step="0.001"
                          value={predictions?.revenue?.target || 0}
                          onChange={(e) => setPredictions({
                            ...predictions,
                            revenue: { ...predictions.revenue, target: parseFloat(e.target.value) || 0 }
                          })}
                          className="h-8"
                          placeholder="10.5"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Profit Margin</Label>
                  <div className="mt-2 space-y-2">
                    <div>
                      <Label className="text-xs text-gray-500">Current %</Label>
                      <div className="flex items-center">
                        <Input
                          type="number"
                          step="0.1"
                          value={predictions?.profit?.current || 0}
                          onChange={(e) => setPredictions({
                            ...predictions,
                            profit: { ...predictions.profit, current: parseFloat(e.target.value) || 0 }
                          })}
                          className="h-8"
                        />
                        <span className="text-sm ml-1">%</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Target %</Label>
                      <div className="flex items-center">
                        <Input
                          type="number"
                          step="0.1"
                          value={predictions?.profit?.target || 0}
                          onChange={(e) => setPredictions({
                            ...predictions,
                            profit: { ...predictions.profit, target: parseFloat(e.target.value) || 0 }
                          })}
                          className="h-8"
                        />
                        <span className="text-sm ml-1">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Measurables</Label>
                  <div className="mt-2 space-y-2">
                    <div>
                      <Label className="text-xs text-gray-500">On Track</Label>
                      <Input
                        type="number"
                        value={predictions?.measurables?.onTrack || 0}
                        onChange={(e) => setPredictions({
                          ...predictions,
                          measurables: { ...predictions.measurables, onTrack: parseInt(e.target.value) || 0 }
                        })}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Total</Label>
                      <Input
                        type="number"
                        value={predictions?.measurables?.total || 0}
                        onChange={(e) => setPredictions({
                          ...predictions,
                          measurables: { ...predictions.measurables, total: parseInt(e.target.value) || 0 }
                        })}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-6">
                <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/50">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <p className="text-sm font-medium text-green-900">{getRevenueLabel(organization)}</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-green-900">
                      {formatRevenue(predictions?.revenue?.current || 0)}
                    </span>
                    <span className="text-sm text-green-700">
                      / {formatRevenue(predictions?.revenue?.target || 0)}
                    </span>
                  </div>
                  
                  {/* Revenue Progress Bar */}
                  {predictions?.revenue?.target > 0 && (
                    <div className="mt-3">
                      <div className="w-full bg-green-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-green-400 to-green-600"
                          style={{ 
                            width: `${Math.min(100, Math.round((predictions?.revenue?.current / predictions?.revenue?.target) * 100))}%`
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-green-700">
                          {Math.round((predictions?.revenue?.current / predictions?.revenue?.target) * 100)}% of target
                        </span>
                        {(predictions?.revenue?.current / predictions?.revenue?.target) >= 1 && (
                          <span className="text-xs text-green-600 font-medium">Target achieved! ✨</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50">
                  <div className="flex items-center gap-2 mb-3">
                    <ChartBar className="h-5 w-5 text-blue-600" />
                    <p className="text-sm font-medium text-blue-900">Profit Margin</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-blue-900">
                      {(predictions?.profit?.current || 0).toFixed(1)}%
                    </span>
                    <span className="text-sm text-blue-700">
                      / {(predictions?.profit?.target || 0).toFixed(1)}%
                    </span>
                  </div>
                  
                  {/* Profit Progress Bar */}
                  {predictions?.profit?.target > 0 && (
                    <div className="mt-3">
                      <div className="w-full bg-blue-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                          style={{ 
                            width: `${Math.min(100, Math.round((predictions?.profit?.current / predictions?.profit?.target) * 100))}%`
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-blue-700">
                          {Math.round((predictions?.profit?.current / predictions?.profit?.target) * 100)}% of target
                        </span>
                        {(predictions?.profit?.current / predictions?.profit?.target) >= 1 && (
                          <span className="text-xs text-blue-600 font-medium">On target! 🎯</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-5 w-5 text-purple-600" />
                    <p className="text-sm font-medium text-purple-900">Measurables on track</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-purple-900">
                      {predictions?.measurables?.onTrack || 0}
                    </span>
                    <span className="text-sm text-purple-700">
                      / {predictions?.measurables?.total || 0}
                    </span>
                  </div>
                  
                  {/* Measurables Progress Bar */}
                  {predictions?.measurables?.total > 0 && (
                    <div className="mt-3">
                      <div className="w-full bg-purple-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-purple-400 to-purple-600"
                          style={{ 
                            width: `${Math.min(100, Math.round((predictions?.measurables?.onTrack / predictions?.measurables?.total) * 100))}%` 
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-purple-700">
                          {Math.round((predictions?.measurables?.onTrack / predictions?.measurables?.total) * 100)}% on track
                        </span>
                        {(predictions?.measurables?.onTrack / predictions?.measurables?.total) >= 0.9 && (
                          <span className="text-xs text-purple-600 font-medium">Excellent! 🔥</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {editingPredictions && (
              <div className="flex justify-end mt-4">
                <Button onClick={handleSavePredictions} size="sm" className="bg-gray-900 hover:bg-gray-800">
                  Save Predictions
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity"
                 style={{
                   background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                 }}></div>
            <div className="relative">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                     style={{
                       background: `linear-gradient(135deg, ${themeColors.primary}20 0%, ${themeColors.secondary}20 100%)`
                     }}>
                  <Target className="h-5 w-5" style={{ color: themeColors.primary }} />
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ 
                color: dashboardData.stats.prioritiesCompleted === dashboardData.stats.totalPriorities && dashboardData.stats.totalPriorities > 0 
                  ? themeColors.primary 
                  : '#111827'
              }}>
                {dashboardData.stats.prioritiesCompleted}/{dashboardData.stats.totalPriorities}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                {isOnLeadershipTeam() ? `Company ${labels.priorities_label}` : `Your ${labels.priorities_label}`}
              </p>
              {dashboardData.stats.prioritiesProgress >= 80 && (
                <div className="flex items-center justify-center mt-2">
                  <span className="text-xs font-medium text-green-600">Great progress! ✨</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
              </div>
              <p className={`text-3xl font-bold ${
                dashboardData.stats.overdueItems > 0 ? 'text-red-600' : 'text-slate-900'
              }`}>
                {dashboardData.stats.overdueItems}
              </p>
              <p className="text-sm text-slate-600 mt-1">Overdue Items</p>
              {dashboardData.stats.overdueItems === 0 && (
                <div className="flex items-center justify-center mt-2">
                  <span className="text-xs font-medium text-green-600">All on track! 🎯</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity"
                 style={{
                   background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.accent} 100%)`
                 }}></div>
            <div className="relative">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                     style={{
                       background: `linear-gradient(135deg, ${themeColors.primary}20 0%, ${themeColors.accent}20 100%)`
                     }}>
                  <Activity className="h-5 w-5" style={{ color: themeColors.primary }} />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {dashboardData.stats.totalShortTermIssues}
              </p>
              <p className="text-sm text-slate-600 mt-1">Open {labels.issues_label}</p>
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
                  Your {labels.priorities_label}
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
              <div className="text-center py-8 px-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200">
                <p className="text-slate-600 mb-3">No priorities assigned</p>
                <Link to="/quarterly-priorities">
                  <Button 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all transform hover:scale-[1.02]"
                    size="sm"
                  >
                    View {labels.priorities_label}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.priorities.map((priority) => (
                  <div 
                    key={priority.id} 
                    className="group p-4 bg-white/60 rounded-xl border border-slate-200 hover:shadow-md transition-all cursor-pointer hover:scale-[1.01]"
                    onClick={() => {
                      setSelectedPriority(priority);
                      setShowPriorityDialog(true);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-12 rounded-full" style={getStatusStyle(priority.status)} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate group-hover:text-slate-950">
                          {priority.title}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {priority.owner?.name || 'Unassigned'} • Due {priority.dueDate ? format(new Date(priority.dueDate), 'MMM d') : 'No date'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium" style={{ color: themeColors.primary }}>
                          {priority.status === 'complete' ? 100 : (priority.progress || 0)}%
                        </span>
                        {priority.progress > 0 && (
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${priority.status === 'complete' ? 100 : (priority.progress || 0)}%`,
                                background: `linear-gradient(90deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
                  Your {labels.todos_label}
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
              <div className="text-center py-8 px-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200">
                <p className="text-slate-600 mb-3">No to-dos assigned</p>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all transform hover:scale-[1.02]"
                  size="sm" 
                  onClick={handleCreateTodo}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create To-Do
                </Button>
              </div>
            ) : (
              <TodosList
                todos={dashboardData.todos}
                onEdit={handleEditTodo}
                onDelete={() => {}}
                onUpdate={fetchDashboardData}
                showCompleted={false}
                hideViewToggle={true}
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
              const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
              
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
              
              if (editingTodo) {
                await todosService.updateTodo(editingTodo.id, todoDataWithOrgInfo);
              } else {
                await todosService.createTodo(todoDataWithOrgInfo);
              }
              await fetchDashboardData();
              setShowTodoDialog(false);
              setEditingTodo(null);
              return true; // Indicate success
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
              const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
              
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
              
              if (editingIssue) {
                await issuesService.updateIssue(editingIssue.id, issueDataWithOrgInfo);
              } else {
                console.log('Creating issue with data:', issueDataWithOrgInfo);
                const createdIssue = await issuesService.createIssue(issueDataWithOrgInfo);
                console.log('Issue created successfully:', createdIssue);
                console.log('Created issue ID:', createdIssue?.id);
                console.log('Created issue title:', createdIssue?.title);
              }
              await fetchDashboardData();
              setShowIssueDialog(false);
              setEditingIssue(null);
              return true;
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
        <Dialog open={showPriorityDialog} onOpenChange={setShowPriorityDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedPriority && (
              <PriorityCardClean
                priority={selectedPriority}
                isCompany={false}
                isArchived={false}
                onUpdate={handleUpdatePriority}
                onArchive={handleArchivePriority}
                onAddMilestone={handleAddMilestone}
                onEditMilestone={handleEditMilestone}
                onDeleteMilestone={handleDeleteMilestone}
                onToggleMilestone={handleToggleMilestone}
                onAddUpdate={handleAddUpdate}
                onEditUpdate={handleEditUpdate}
                onDeleteUpdate={handleDeleteUpdate}
                onStatusChange={handleStatusChange}
                onUploadAttachment={handleUploadAttachment}
                onDownloadAttachment={handleDownloadAttachment}
                onDeleteAttachment={handleDeleteAttachment}
                teamMembers={dashboardData.teamMembers || []}
                readOnly={false}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DashboardClean;