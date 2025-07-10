import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    // If EOSI user and not impersonating, redirect to EOSI dashboard
    if (user?.isEOSI && localStorage.getItem('eosiImpersonating') !== 'true') {
      navigate('/eosi');
    }
  }, [user, navigate]);

  // Mock data - in a real app, this would come from API calls
  const stats = {
    rocksCompleted: 3,
    totalRocks: 5,
    rocksProgress: 60,
    meetingsThisWeek: 2,
    overdueItems: 4,
    issuesOpen: 12
  };

  const recentRocks = [
    {
      id: 1,
      title: 'Implement new CRM system',
      owner: 'John Doe',
      status: 'on-track',
      progress: 75,
      dueDate: '2025-03-31'
    },
    {
      id: 2,
      title: 'Launch marketing campaign',
      owner: 'Jane Smith',
      status: 'at-risk',
      progress: 45,
      dueDate: '2025-03-15'
    },
    {
      id: 3,
      title: 'Hire 3 new developers',
      owner: 'Mike Johnson',
      status: 'complete',
      progress: 100,
      dueDate: '2025-02-28'
    }
  ];

  const upcomingMeetings = [
    {
      id: 1,
      title: 'Weekly L10 Meeting',
      date: '2025-01-09',
      time: '09:00 AM',
      attendees: 8
    },
    {
      id: 2,
      title: 'Quarterly Planning',
      date: '2025-01-15',
      time: '02:00 PM',
      attendees: 12
    }
  ];

  const recentTodos = [
    {
      id: 1,
      title: 'Review Q4 performance metrics',
      assignee: 'You',
      dueDate: '2025-01-10',
      priority: 'high'
    },
    {
      id: 2,
      title: 'Update team accountability chart',
      assignee: 'Sarah Wilson',
      dueDate: '2025-01-12',
      priority: 'medium'
    },
    {
      id: 3,
      title: 'Prepare monthly scorecard data',
      assignee: 'You',
      dueDate: '2025-01-15',
      priority: 'low'
    }
  ];

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

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-blue-100">
          Here's what's happening with your EOS implementation today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rocks Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rocksCompleted}/{stats.totalRocks}</div>
            <Progress value={stats.rocksProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.rocksProgress}% complete this quarter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meetings This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.meetingsThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              2 more than last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdueItems}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingDown className="inline h-3 w-3 mr-1" />
              Needs attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.issuesOpen}</div>
            <p className="text-xs text-muted-foreground">
              3 high priority
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Rocks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Rocks</CardTitle>
                <CardDescription>Your quarterly goals progress</CardDescription>
              </div>
              <Link to="/rocks">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRocks.map((rock) => (
                <div key={rock.id} className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(rock.status)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {rock.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {rock.owner} • Due {new Date(rock.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {rock.progress}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Meetings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Meetings</CardTitle>
                <CardDescription>Your scheduled EOS meetings</CardDescription>
              </div>
              <Link to="/meetings">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingMeetings.map((meeting) => (
                <div key={meeting.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {meeting.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(meeting.date).toLocaleDateString()} at {meeting.time}
                    </p>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="h-4 w-4 mr-1" />
                    {meeting.attendees}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent To-Dos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent To-Dos</CardTitle>
                <CardDescription>Your action items and tasks</CardDescription>
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
              {recentTodos.map((todo) => (
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
                      {todo.assignee} • Due {new Date(todo.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={getPriorityColor(todo.priority)}>
                    {todo.priority}
                  </Badge>
                </div>
              ))}
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
              <Link to="/rocks">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Rock
                </Button>
              </Link>
              <Link to="/meetings">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Meeting
                </Button>
              </Link>
              <Link to="/todos">
                <Button variant="outline" className="w-full justify-start">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Add To-Do
                </Button>
              </Link>
              <Link to="/scorecard">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Update Scorecard
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

