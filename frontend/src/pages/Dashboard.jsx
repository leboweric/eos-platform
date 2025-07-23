import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { getTeamId } from '../utils/teamUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { quarterlyPrioritiesService } from '../services/quarterlyPrioritiesService';
import { todosService } from '../services/todosService';
import { issuesService } from '../services/issuesService';
import {
  Target,
  CheckSquare,
  BarChart3,
  Calendar,
  ClipboardList,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Plus,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user, isOnLeadershipTeam } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    priorities: [],
    todos: [],
    issues: [],
    stats: {
      prioritiesCompleted: 0,
      totalPriorities: 0,
      prioritiesProgress: 0,
      overdueItems: 0,
      totalShortTermIssues: 0
    }
  });
  
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
      
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = getTeamId(user, 'leadership');
      
      console.log('Dashboard: Fetching data with:', { orgId, teamId, user });
      
      // Get user's department ID for filtering
      const userDepartmentId = user?.teamId || user?.team_id;
      
      // Fetch all data in parallel
      const [prioritiesResponse, todosResponse, issuesResponse] = await Promise.all([
        quarterlyPrioritiesService.getCurrentPriorities(orgId, teamId),
        todosService.getTodos(null, null, true, userDepartmentId), // Filter by user's department
        issuesService.getIssues(null, false, userDepartmentId) // Filter by user's department
      ]);
      
      console.log('Dashboard: Priorities response:', prioritiesResponse);
      
      // Get user's priorities for the "Your Priorities" section
      const userPriorities = [];
      if (prioritiesResponse.companyPriorities) {
        userPriorities.push(...prioritiesResponse.companyPriorities.filter(p => p.owner?.id === user.id));
      }
      if (prioritiesResponse.teamMemberPriorities?.[user.id]) {
        userPriorities.push(...prioritiesResponse.teamMemberPriorities[user.id].priorities);
      }
      
      // Calculate priorities stats based on user role
      let completedPriorities, totalPriorities, prioritiesProgress;
      
      if (isOnLeadershipTeam()) {
        // For leadership: show company priorities progress
        const companyPriorities = prioritiesResponse.companyPriorities || [];
        completedPriorities = companyPriorities.filter(p => p.status === 'complete').length;
        totalPriorities = companyPriorities.length;
        prioritiesProgress = totalPriorities > 0 ? Math.round((completedPriorities / totalPriorities) * 100) : 0;
      } else {
        // For non-leadership: show individual priorities progress
        completedPriorities = userPriorities.filter(p => p.status === 'complete').length;
        totalPriorities = userPriorities.length;
        prioritiesProgress = totalPriorities > 0 ? Math.round((completedPriorities / totalPriorities) * 100) : 0;
      }
      
      // Process todos - only user's todos
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
      }).length;
      
      // Process issues - count short term issues
      const shortTermIssues = issuesResponse.data.issues.filter(issue => 
        issue.timeline === 'short_term' && issue.status === 'open'
      );
      
      setDashboardData({
        priorities: userPriorities.slice(0, 5), // Show first 5
        todos: userTodos.slice(0, 5), // Show first 5
        issues: shortTermIssues,
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
        return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-blue-100">
          Here's what's happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isOnLeadershipTeam() ? 'Company Priorities Progress' : 'Your Priorities Progress'}
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.prioritiesCompleted}/{dashboardData.stats.totalPriorities}</div>
            <Progress value={dashboardData.stats.prioritiesProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {dashboardData.stats.prioritiesProgress}% complete this quarter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue To Dos</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dashboardData.stats.overdueItems}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingDown className="inline h-3 w-3 mr-1" />
              Needs attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.totalShortTermIssues}</div>
            <p className="text-xs text-muted-foreground">
              Short term issues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your Priorities */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Priorities</CardTitle>
                <CardDescription>Priorities assigned to you</CardDescription>
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
            <div className="space-y-4">
              {dashboardData.priorities.length === 0 ? (
                <p className="text-sm text-gray-500">No priorities assigned to you</p>
              ) : (
                dashboardData.priorities.map((priority) => (
                  <div key={priority.id} className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(priority.status)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {priority.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {priority.owner?.name || 'Unassigned'} • Due {priority.dueDate ? new Date(priority.dueDate).toLocaleDateString() : 'No due date'}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {priority.progress}%
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* To Dos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>To Dos</CardTitle>
                <CardDescription>Your assigned action items</CardDescription>
              </div>
              <Link to="/todos">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.todos.length === 0 ? (
                <p className="text-sm text-gray-500">No to-dos assigned to you</p>
              ) : (
                dashboardData.todos.map((todo) => (
                  <div key={todo.id} className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {todo.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {todo.assignedTo?.name || todo.assigned_to?.first_name || 'You'} • Due {todo.due_date ? new Date(todo.due_date).toLocaleDateString() : 'No due date'}
                      </p>
                    </div>
                    <Badge variant={getPriorityColor(todo.priority)}>
                      {todo.priority}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/quarterly-priorities">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Priority
                </Button>
              </Link>
              <Link to="/todos">
                <Button variant="outline" className="w-full justify-start">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Add To-Do
                </Button>
              </Link>
              <Link to="/issues">
                <Button variant="outline" className="w-full justify-start">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Add an Issue
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;