import { useEffect, useState, Component } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { getTeamId } from '../utils/teamUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { quarterlyPrioritiesService } from '../services/quarterlyPrioritiesService';
import { todosService } from '../services/todosService';
import { issuesService } from '../services/issuesService';
import { organizationService } from '../services/organizationService';
import { useSelectedTodos } from '../contexts/SelectedTodosContext';
import {
  Loader2,
  AlertCircle,
  ArrowRight,
  Plus,
  Target,
  ClipboardList,
  Calendar,
  TrendingUp,
  CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Import redesigned components
import WelcomeHero from '../components/dashboard/WelcomeHero';
import EnhancedKPICards from '../components/dashboard/EnhancedKPICards';
import TodaysFocus from '../components/dashboard/TodaysFocus';
import SmartInsights from '../components/dashboard/SmartInsights';
import ContextualQuickActions from '../components/dashboard/ContextualQuickActions';

// Import original components for backward compatibility
import TodosList from '../components/todos/TodosList';
import TodoDialog from '../components/todos/TodoDialog';

// Error Boundary Component (unchanged)
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>An error occurred loading the dashboard.</p>
                <p className="text-sm">Error: {this.state.error?.message}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  size="sm"
                  variant="outline"
                >
                  Refresh Page
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

const DashboardRedesigned = () => {
  const { user, isOnLeadershipTeam } = useAuthStore();
  const navigate = useNavigate();
  
  // Core data state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [predictions, setPredictions] = useState({
    revenue: { target: 0, current: 0 },
    profit: { target: 0, current: 0 },
    measurables: { onTrack: 0, total: 0 }
  });
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState({
    priorities: [],
    todos: [],
    overdueTodos: [],
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
  
  // Dialog states (for backward compatibility)
  const [showTodoDialog, setShowTodoDialog] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);

  useEffect(() => {
    // If consultant user and not impersonating, redirect to consultant dashboard
    if (user?.isConsultant && localStorage.getItem('consultantImpersonating') !== 'true') {
      navigate('/consultant');
    } else if (user) {
      fetchDashboardData();
    }
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = getTeamId(user, 'leadership');
      
      // Get user's department ID for filtering
      let userDepartmentId = null;
      if (user?.teams && user.teams.length > 0) {
        const nonLeadershipTeam = user.teams.find(team => !team.is_leadership_team);
        if (nonLeadershipTeam) {
          userDepartmentId = nonLeadershipTeam.id;
        } else {
          userDepartmentId = user.teams[0].id;
        }
      }
      
      // Fetch all data in parallel
      const [prioritiesResponse, todosResponse, issuesResponse, orgResponse] = await Promise.all([
        quarterlyPrioritiesService.getCurrentPriorities(orgId, teamId),
        todosService.getTodos(null, null, true, userDepartmentId),
        issuesService.getIssues(null, false, userDepartmentId),
        isOnLeadershipTeam() ? organizationService.getOrganization() : Promise.resolve(null)
      ]);
      
      // Set organization data if leadership team
      if (orgResponse) {
        setOrganization(orgResponse.data || orgResponse);
      }
      
      // Set predictions if available
      if (prioritiesResponse.predictions) {
        setPredictions(prioritiesResponse.predictions);
      }
      
      // Get user's priorities
      const userPriorities = [];
      if (prioritiesResponse.companyPriorities) {
        userPriorities.push(...prioritiesResponse.companyPriorities.filter(p => p.owner?.id === user.id));
      }
      if (prioritiesResponse.teamMemberPriorities?.[user.id]) {
        userPriorities.push(...prioritiesResponse.teamMemberPriorities[user.id].priorities);
      }
      
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
      const userTodos = todosResponse.data.todos.filter(todo => {
        const assignedToId = todo.assignedTo?.id || todo.assigned_to?.id || todo.assigned_to_id;
        const isAssignedToUser = assignedToId === user.id;
        const isNotCompleted = todo.status !== 'completed' && todo.status !== 'complete';
        return isAssignedToUser && isNotCompleted;
      });
      
      // Calculate overdue todos
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const overdueTodos = userTodos.filter(todo => {
        if (!todo.due_date) return false;
        const dueDate = new Date(todo.due_date);
        return dueDate < today;
      });
      
      // Process issues
      const shortTermIssues = issuesResponse.data.issues.filter(issue => 
        issue.timeline === 'short_term' && issue.status === 'open'
      );
      
      setDashboardData({
        priorities: userPriorities,
        todos: userTodos.slice(0, 10), // More todos for Today's Focus
        overdueTodos: overdueTodos,
        issues: shortTermIssues,
        teamMembers: todosResponse.data.teamMembers || [],
        stats: {
          prioritiesCompleted: completedPriorities,
          totalPriorities: totalPriorities,
          prioritiesProgress: prioritiesProgress,
          overdueItems: overdueTodos.length,
          totalShortTermIssues: shortTermIssues.length
        }
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTodo = async (todoId, updates) => {
    try {
      await todosService.updateTodo(todoId, updates);
      await fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to update todo:', error);
    }
  };

  const quickActions = [
    {
      label: 'Add Priority',
      icon: Target,
      link: '/quarterly-priorities'
    },
    {
      label: 'Add Todo',
      icon: Plus,
      link: '/todos'
    },
    {
      label: 'View Calendar',
      icon: Calendar,
      link: '/meetings'
    }
  ];

  // Loading state with skeletons
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Hero skeleton */}
        <Skeleton className="h-48 w-full rounded-xl" />
        
        {/* KPI cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        
        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            onClick={fetchDashboardData} 
            size="sm"
            variant="outline"
            className="ml-2"
          >
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Hero Section */}
      <WelcomeHero
        user={user}
        stats={dashboardData.stats}
        isOnLeadershipTeam={isOnLeadershipTeam()}
        quickActions={quickActions}
      />

      {/* Enhanced KPI Cards */}
      <EnhancedKPICards
        stats={dashboardData.stats}
        isOnLeadershipTeam={isOnLeadershipTeam()}
      />

      {/* Predictions Card - Only show for Leadership Team */}
      {isOnLeadershipTeam() && (
        <Card className="border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <CardTitle>Quarterly Predictions</CardTitle>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Leadership View
              </Badge>
            </div>
            <CardDescription>
              Revenue, profit and measurables forecasts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  ${((predictions?.revenue?.current || 0) / 1000000).toFixed(1)}M
                </div>
                <div className="text-sm text-gray-600">Revenue Progress</div>
                <div className="text-xs text-gray-500 mt-1">
                  Target: ${((predictions?.revenue?.target || 0) / 1000000).toFixed(1)}M
                </div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {(predictions?.profit?.current || 0).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Profit Margin</div>
                <div className="text-xs text-gray-500 mt-1">
                  Target: {(predictions?.profit?.target || 0).toFixed(1)}%
                </div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {predictions?.measurables?.onTrack || 0}/{predictions?.measurables?.total || 0}
                </div>
                <div className="text-sm text-gray-600">Measurables</div>
                <div className="text-xs text-gray-500 mt-1">On track</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Focus - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <TodaysFocus
            priorities={dashboardData.priorities}
            todos={dashboardData.todos}
            overdueTodos={dashboardData.overdueTodos}
            onUpdateTodo={handleUpdateTodo}
          />
        </div>

        {/* Smart Insights */}
        <div className="lg:col-span-1">
          <SmartInsights
            priorities={dashboardData.priorities}
            todos={dashboardData.todos}
            stats={dashboardData.stats}
            user={user}
          />
        </div>
      </div>

      {/* Secondary Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Quick Actions */}
        <ContextualQuickActions
          user={user}
          stats={dashboardData.stats}
          isOnLeadershipTeam={isOnLeadershipTeam()}
        />

        {/* Recent Priorities */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-blue-600" />
                <CardTitle>Your Priorities</CardTitle>
              </div>
              <Link to="/quarterly-priorities">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.priorities.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 mb-4">No priorities set yet</p>
                  <Link to="/quarterly-priorities">
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Priority
                    </Button>
                  </Link>
                </div>
              ) : (
                dashboardData.priorities.slice(0, 5).map((priority) => (
                  <div key={priority.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className={`w-3 h-3 rounded-full ${
                      priority.status === 'complete' ? 'bg-green-500' :
                      priority.status === 'on-track' ? 'bg-blue-500' :
                      priority.status === 'off-track' ? 'bg-red-500' : 'bg-gray-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {priority.title}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <span>{priority.progress}% complete</span>
                        <span>•</span>
                        <span>{priority.dueDate ? new Date(priority.dueDate).toLocaleDateString() : 'No due date'}</span>
                      </div>
                    </div>
                    <Badge 
                      variant={priority.status === 'complete' ? 'default' : priority.status === 'on-track' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {priority.status.replace('-', ' ')}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Todo Dialog - keeping for backward compatibility */}
      <TodoDialog
        open={showTodoDialog}
        onOpenChange={setShowTodoDialog}
        todo={editingTodo}
        teamMembers={dashboardData.teamMembers || []}
        onSave={async (todoData) => {
          try {
            await todosService.updateTodo(editingTodo.id, todoData);
            await fetchDashboardData();
            setShowTodoDialog(false);
            setEditingTodo(null);
          } catch (error) {
            console.error('Failed to update todo:', error);
          }
        }}
      />
    </div>
  );
};

// Wrap with Error Boundary
const DashboardRedesignedWithErrorBoundary = () => (
  <ErrorBoundary>
    <DashboardRedesigned />
  </ErrorBoundary>
);

export default DashboardRedesignedWithErrorBoundary;