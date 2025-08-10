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
import { businessBlueprintService } from '../services/businessBlueprintService';
import { getRevenueLabel } from '../utils/revenueUtils';
import TodosList from '../components/todos/TodosListClean';
import TodoDialog from '../components/todos/TodoDialog';
import IssueDialog from '../components/issues/IssueDialog';
import HeadlineDialog from '../components/headlines/HeadlineDialog';
import { headlinesService } from '../services/headlinesService';
import { useSelectedTodos } from '../contexts/SelectedTodosContext';
import {
  AlertCircle,
  CheckSquare,
  Edit,
  X,
  ArrowRight,
  Plus,
  Calendar,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const DashboardClean = () => {
  const { user, isOnLeadershipTeam } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState(null);
  const [showTodoDialog, setShowTodoDialog] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [showHeadlineDialog, setShowHeadlineDialog] = useState(false);
  const [predictions, setPredictions] = useState({
    revenue: { target: 0, current: 0 },
    profit: { target: 0, current: 0 },
    measurables: { onTrack: 0, total: 0 }
  });
  const [editingPredictions, setEditingPredictions] = useState(false);
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
    }
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
  const createIssuesForOverdueTodos = async (todos, userDepartmentId) => {
    try {
      // Get todos that are overdue
      const overdueTodos = todos.filter(todo => 
        isOverdue(todo) && 
        todo.status !== 'complete' &&
        todo.status !== 'cancelled'
      );

      if (overdueTodos.length === 0) return;

      for (const todo of overdueTodos) {
        try {
          const dueDate = new Date(todo.due_date).toLocaleDateString();
          const assigneeName = todo.assigned_to 
            ? `${todo.assigned_to.first_name} ${todo.assigned_to.last_name}`
            : 'Unassigned';
          
          // Calculate how many days overdue
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dueDateObj = new Date(todo.due_date);
          dueDateObj.setHours(0, 0, 0, 0);
          const daysOverdue = Math.floor((today - dueDateObj) / (1000 * 60 * 60 * 24));

          const issueData = {
            title: `Overdue: ${todo.title}`,
            description: `This to-do is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue and needs immediate attention.\n\nOriginal due date: ${dueDate}\nAssigned to: ${assigneeName}\n\nDescription:\n${todo.description || 'No description provided'}`,
            timeline: 'short_term',
            ownerId: todo.assigned_to?.id || null,
            department_id: userDepartmentId || todo.team_id,
            priority_level: 'high',
            related_todo_id: todo.id
          };
          
          await issuesService.createIssue(issueData);
        } catch (error) {
          // If it's a duplicate error (unique constraint violation), that's okay - just skip
          if (error.response?.status === 409 || error.response?.data?.message?.includes('duplicate') || error.response?.data?.message?.includes('unique')) {
            console.log(`Issue already exists for todo: ${todo.title}`);
          } else {
            console.error(`Failed to create issue for overdue todo: ${todo.title}`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to create issues for overdue todos:', error);
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
        businessBlueprintService.getBusinessBlueprint()
      ]);
      
      if (orgResponse) {
        setOrganization(orgResponse.data || orgResponse);
      }
      
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
        setPredictions(prioritiesResponse.predictions);
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
      
      // Automatically create issues for overdue todos
      await createIssuesForOverdueTodos(allTodos, userDepartmentId);
      
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
      
      const shortTermIssues = issuesResponse.data.issues.filter(issue => 
        issue.timeline === 'short_term' && issue.status === 'open'
      );
      
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
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete':
        return 'bg-green-500';
      case 'on-track':
        return 'bg-blue-500';
      case 'at-risk':
        return 'bg-yellow-500';
      case 'off-track':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Clean Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {format(new Date(), 'EEEE, MMMM d')} • Here's your overview
          </p>
        </div>

        {/* Predictions Section - Only for Leadership */}
        {isOnLeadershipTeam() && (
          <div className="mb-8 pb-8 border-b border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">
                Annual Predictions
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingPredictions(!editingPredictions)}
                className="text-gray-500 hover:text-gray-700"
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
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold text-gray-900">
                      {formatRevenue(predictions?.revenue?.current || 0)}
                    </span>
                    <span className="text-sm text-gray-500">
                      / {formatRevenue(predictions?.revenue?.target || 0)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{getRevenueLabel(organization)}</p>
                  
                  {/* Revenue Progress Bar */}
                  {predictions?.revenue?.target > 0 && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            (predictions?.revenue?.current / predictions?.revenue?.target) >= 0.9 
                              ? 'bg-green-500' 
                              : (predictions?.revenue?.current / predictions?.revenue?.target) >= 0.7 
                                ? 'bg-blue-500' 
                                : (predictions?.revenue?.current / predictions?.revenue?.target) >= 0.5 
                                  ? 'bg-yellow-500' 
                                  : 'bg-red-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, Math.round((predictions?.revenue?.current / predictions?.revenue?.target) * 100))}%` 
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-500">
                          {Math.round((predictions?.revenue?.current / predictions?.revenue?.target) * 100)}% of target
                        </span>
                        {(predictions?.revenue?.current / predictions?.revenue?.target) >= 1 && (
                          <span className="text-xs text-green-600 font-medium">Target achieved!</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold text-gray-900">
                      {(predictions?.profit?.current || 0).toFixed(1)}%
                    </span>
                    <span className="text-sm text-gray-500">
                      / {(predictions?.profit?.target || 0).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Profit Margin</p>
                  
                  {/* Profit Progress Bar */}
                  {predictions?.profit?.target > 0 && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            (predictions?.profit?.current / predictions?.profit?.target) >= 0.9 
                              ? 'bg-green-500' 
                              : (predictions?.profit?.current / predictions?.profit?.target) >= 0.7 
                                ? 'bg-blue-500' 
                                : (predictions?.profit?.current / predictions?.profit?.target) >= 0.5 
                                  ? 'bg-yellow-500' 
                                  : 'bg-red-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, Math.round((predictions?.profit?.current / predictions?.profit?.target) * 100))}%` 
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-500">
                          {Math.round((predictions?.profit?.current / predictions?.profit?.target) * 100)}% of target
                        </span>
                        {(predictions?.profit?.current / predictions?.profit?.target) >= 1 && (
                          <span className="text-xs text-green-600 font-medium">On target!</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold text-gray-900">
                      {predictions?.measurables?.onTrack || 0}
                    </span>
                    <span className="text-sm text-gray-500">
                      / {predictions?.measurables?.total || 0}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Measurables on track</p>
                  
                  {/* Measurables Progress Bar */}
                  {predictions?.measurables?.total > 0 && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            (predictions?.measurables?.onTrack / predictions?.measurables?.total) >= 0.9 
                              ? 'bg-green-500' 
                              : (predictions?.measurables?.onTrack / predictions?.measurables?.total) >= 0.7 
                                ? 'bg-blue-500' 
                                : (predictions?.measurables?.onTrack / predictions?.measurables?.total) >= 0.5 
                                  ? 'bg-yellow-500' 
                                  : 'bg-red-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, Math.round((predictions?.measurables?.onTrack / predictions?.measurables?.total) * 100))}%` 
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-500">
                          {Math.round((predictions?.measurables?.onTrack / predictions?.measurables?.total) * 100)}% on track
                        </span>
                        {(predictions?.measurables?.onTrack / predictions?.measurables?.total) >= 0.9 && (
                          <span className="text-xs text-green-600 font-medium">Excellent!</span>
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

        {/* Clean Stats Grid */}
        <div className="grid grid-cols-3 gap-8 mb-8 text-center">
          <div>
            <p className="text-3xl font-semibold text-gray-900">
              {dashboardData.stats.prioritiesCompleted}/{dashboardData.stats.totalPriorities}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {isOnLeadershipTeam() ? 'Company Priorities' : 'Your Priorities'}
            </p>
            {dashboardData.stats.prioritiesProgress >= 80 && (
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-2" title="Great progress!" />
            )}
          </div>
          
          <div>
            <p className={`text-3xl font-semibold ${
              dashboardData.stats.overdueItems > 0 ? 'text-red-600' : 'text-gray-900'
            }`}>
              {dashboardData.stats.overdueItems}
            </p>
            <p className="text-sm text-gray-500 mt-1">Overdue Items</p>
          </div>
          
          <div>
            <p className="text-3xl font-semibold text-gray-900">
              {dashboardData.stats.totalShortTermIssues}
            </p>
            <p className="text-sm text-gray-500 mt-1">Open Issues</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Priorities Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Your Priorities</h2>
              <Link 
                to="/quarterly-priorities" 
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            
            {dashboardData.priorities.length === 0 ? (
              <div className="text-center py-8 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-500">No priorities assigned</p>
                <Link to="/quarterly-priorities">
                  <Button variant="outline" size="sm" className="mt-3">
                    View Priorities
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.priorities.map((priority) => (
                  <div key={priority.id} className="flex items-center gap-3 group">
                    <div className={`w-1 h-12 rounded ${getStatusColor(priority.status)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {priority.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {priority.owner?.name || 'Unassigned'} • Due {priority.dueDate ? format(new Date(priority.dueDate), 'MMM d') : 'No date'}
                      </p>
                    </div>
                    <span className="text-sm text-gray-500">{priority.progress || 0}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* To-Dos Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Your To-Dos</h2>
              <Link 
                to="/todos" 
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            
            {dashboardData.todos.length === 0 ? (
              <div className="text-center py-8 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-500">No to-dos assigned</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
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
              />
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Quick Links</h3>
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-gray-600"
              onClick={() => {
                setEditingIssue(null);
                setShowIssueDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Issue
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-gray-600"
              onClick={() => {
                setEditingTodo(null);
                setShowTodoDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add To Do
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-gray-600"
              onClick={() => setShowHeadlineDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
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
              const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
              
              const todoDataWithOrgInfo = {
                ...todoData,
                organization_id: orgId,
                team_id: teamId,
                department_id: teamId
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
          onSave={async (issueData) => {
            try {
              const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
              const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
              
              const issueDataWithOrgInfo = {
                ...issueData,
                organization_id: orgId,
                department_id: teamId
              };
              
              if (editingIssue) {
                await issuesService.updateIssue(editingIssue.id, issueDataWithOrgInfo);
              } else {
                await issuesService.createIssue(issueDataWithOrgInfo);
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
            const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
            await headlinesService.createHeadline({
              ...headlineData,
              teamId: teamId
            });
            // Success is handled in the dialog component
          }}
        />
      </div>
    </div>
  );
};

export default DashboardClean;