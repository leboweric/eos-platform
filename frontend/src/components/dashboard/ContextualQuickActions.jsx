import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus,
  Target,
  ClipboardList,
  AlertCircle,
  Calendar,
  Users,
  BarChart3,
  FileText,
  Settings,
  Zap,
  Clock,
  TrendingUp,
  MessageSquare,
  CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ContextualQuickActions = ({ 
  user = {}, 
  stats = {}, 
  isOnLeadershipTeam = false,
  upcomingMeetings = [],
  recentActivity = []
}) => {
  // Generate contextual actions based on user state and data
  const getContextualActions = () => {
    const actions = [];

    // Priority-based actions
    if (stats.totalPriorities === 0) {
      actions.push({
        id: 'first-priority',
        title: 'Set Your First Priority',
        description: 'Start by setting quarterly goals',
        icon: Target,
        link: '/quarterly-priorities',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        category: 'getting-started',
        priority: 'high'
      });
    } else if (stats.prioritiesProgress < 50) {
      actions.push({
        id: 'review-priorities',
        title: 'Review Priority Progress',
        description: 'Update progress and add milestones',
        icon: Target,
        link: '/quarterly-priorities',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        category: 'priorities',
        priority: 'high'
      });
    } else if (stats.prioritiesProgress >= 80) {
      actions.push({
        id: 'plan-next-quarter',
        title: 'Plan Next Quarter',
        description: 'You\'re almost done - plan ahead!',
        icon: Calendar,
        link: '/quarterly-priorities',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        category: 'planning',
        priority: 'medium'
      });
    }

    // Todo-based actions
    if (stats.overdueItems > 0) {
      actions.push({
        id: 'clear-overdue',
        title: 'Clear Overdue Items',
        description: `${stats.overdueItems} items need attention`,
        icon: Clock,
        link: '/todos',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        category: 'urgent',
        priority: 'high',
        badge: stats.overdueItems
      });
    } else {
      actions.push({
        id: 'add-todo',
        title: 'Add New To-Do',
        description: 'Capture your next action item',
        icon: Plus,
        link: '/todos',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        category: 'productivity',
        priority: 'medium'
      });
    }

    // Issue-based actions
    if (stats.totalShortTermIssues > 0) {
      actions.push({
        id: 'resolve-issues',
        title: 'Address Open Issues',
        description: `${stats.totalShortTermIssues} issues to discuss`,
        icon: MessageSquare,
        link: '/issues',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        category: 'issues',
        priority: 'medium',
        badge: stats.totalShortTermIssues
      });
    }

    // Leadership-specific actions
    if (isOnLeadershipTeam) {
      actions.push({
        id: 'team-scorecard',
        title: 'Review Team Scorecard',
        description: 'Check team metrics and KPIs',
        icon: BarChart3,
        link: '/scorecard',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        category: 'leadership',
        priority: 'medium'
      });

      actions.push({
        id: 'schedule-meeting',
        title: 'Schedule Team Meeting',
        description: 'Weekly accountability meeting',
        icon: Users,
        link: '/meetings',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        category: 'leadership',
        priority: 'low'
      });
    }

    // General productivity actions
    actions.push({
      id: 'document-repo',
      title: 'Access Documents',
      description: 'View company documents',
      icon: FileText,
      link: '/documents',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      category: 'resources',
      priority: 'low'
    });

    // Smart suggestions based on patterns
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 1) { // Monday
      actions.push({
        id: 'weekly-planning',
        title: 'Plan Your Week',
        description: 'Set priorities for the week ahead',
        icon: Calendar,
        link: '/quarterly-priorities',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        category: 'planning',
        priority: 'medium'
      });
    }

    if (dayOfWeek === 5) { // Friday
      actions.push({
        id: 'weekly-review',
        title: 'Weekly Review',
        description: 'Reflect on accomplishments',
        icon: CheckCircle,
        link: '/quarterly-priorities',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        category: 'reflection',
        priority: 'low'
      });
    }

    return actions
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 6); // Show max 6 actions
  };

  const getWorkflowSuggestions = () => {
    const suggestions = [];

    // Meeting preparation
    if (upcomingMeetings.length > 0) {
      suggestions.push({
        id: 'meeting-prep',
        title: 'Prepare for Meetings',
        description: `${upcomingMeetings.length} meetings this week`,
        icon: Users,
        actions: [
          { label: 'Review Agenda', link: '/meetings' },
          { label: 'Update Progress', link: '/quarterly-priorities' }
        ]
      });
    }

    // End of quarter workflow
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    const quarterEndMonth = currentQuarter * 3 - 1;
    const quarterEnd = new Date(now.getFullYear(), quarterEndMonth + 1, 0);
    const daysToQuarterEnd = Math.ceil((quarterEnd - now) / (1000 * 60 * 60 * 24));

    if (daysToQuarterEnd <= 30 && daysToQuarterEnd > 0) {
      suggestions.push({
        id: 'quarter-end',
        title: 'Quarter End Preparation',
        description: `${daysToQuarterEnd} days until quarter end`,
        icon: Target,
        actions: [
          { label: 'Review Priorities', link: '/quarterly-priorities' },
          { label: 'Plan Next Quarter', link: '/quarterly-priorities' }
        ]
      });
    }

    return suggestions;
  };

  const actions = getContextualActions();
  const workflows = getWorkflowSuggestions();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-purple-600" />
            <CardTitle>Quick Actions</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            Smart suggestions
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Workflow suggestions */}
          {workflows.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Suggested Workflows</h4>
              {workflows.map((workflow) => (
                <div key={workflow.id} className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-white rounded-lg">
                      <workflow.icon className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-sm text-gray-900">{workflow.title}</h5>
                      <p className="text-xs text-gray-600 mt-1">{workflow.description}</p>
                      <div className="flex space-x-2 mt-2">
                        {workflow.actions.map((action, index) => (
                          <Link key={index} to={action.link}>
                            <Button variant="outline" size="sm" className="text-xs h-6">
                              {action.label}
                            </Button>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Regular actions */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Quick Actions</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {actions.map((action) => (
                <Link key={action.id} to={action.link}>
                  <Button 
                    variant="outline" 
                    className={`w-full justify-start h-auto p-3 border-2 hover:shadow-sm transition-all duration-200 ${
                      action.priority === 'high' ? 'border-orange-200 bg-orange-50/50' :
                      action.priority === 'medium' ? 'border-blue-200 bg-blue-50/50' :
                      'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3 w-full">
                      <div className={`p-2 rounded-lg ${action.bgColor} flex-shrink-0`}>
                        <action.icon className={`h-4 w-4 ${action.color}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm text-gray-900">
                            {action.title}
                          </span>
                          {action.badge && (
                            <Badge variant="destructive" className="text-xs h-5">
                              {action.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {/* Performance tip */}
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-2 text-xs text-gray-600">
              <TrendingUp className="h-3 w-3" />
              <span>Actions are personalized based on your activity and goals</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContextualQuickActions;