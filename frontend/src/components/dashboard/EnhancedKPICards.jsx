import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  Clock, 
  MessageSquare, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Plus,
  ArrowRight,
  Zap,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';

const EnhancedKPICards = ({ 
  stats, 
  isOnLeadershipTeam = false,
  onQuickAction 
}) => {
  const kpiCards = [
    {
      id: 'priorities',
      title: isOnLeadershipTeam ? 'Company Priorities' : 'Your Priorities',
      value: `${stats.prioritiesCompleted}/${stats.totalPriorities}`,
      subtitle: `${stats.prioritiesProgress}% Complete`,
      progress: stats.prioritiesProgress,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: stats.prioritiesProgress >= 80 ? 'border-green-200' : stats.prioritiesProgress >= 60 ? 'border-blue-200' : 'border-orange-200',
      trend: stats.prioritiesProgress >= 70 ? 'up' : stats.prioritiesProgress >= 40 ? 'stable' : 'down',
      trendValue: '+12%',
      insight: stats.prioritiesProgress >= 80 ? 'Great progress!' : stats.prioritiesProgress >= 60 ? 'On track' : 'Needs attention',
      action: {
        label: 'Add Priority',
        icon: Plus,
        link: '/quarterly-priorities'
      },
      urgentCount: stats.totalPriorities - stats.prioritiesCompleted > 0 ? stats.totalPriorities - stats.prioritiesCompleted : 0
    },
    {
      id: 'overdue',
      title: 'Overdue Items',
      value: stats.overdueItems,
      subtitle: 'Need immediate attention',
      icon: Clock,
      color: stats.overdueItems > 0 ? 'text-red-600' : 'text-green-600',
      bgColor: stats.overdueItems > 0 ? 'bg-red-50' : 'bg-green-50',
      borderColor: stats.overdueItems > 0 ? 'border-red-200' : 'border-green-200',
      trend: stats.overdueItems > 5 ? 'down' : stats.overdueItems > 2 ? 'stable' : 'up',
      trendValue: stats.overdueItems > 0 ? `${stats.overdueItems} overdue` : 'All current',
      insight: stats.overdueItems === 0 ? 'Excellent!' : stats.overdueItems <= 2 ? 'Manageable' : 'Critical',
      action: {
        label: stats.overdueItems > 0 ? 'Review Items' : 'Add Todo',
        icon: stats.overdueItems > 0 ? AlertTriangle : Plus,
        link: '/todos'
      },
      isAlert: stats.overdueItems > 0,
      urgentCount: stats.overdueItems
    },
    {
      id: 'issues',
      title: 'Active Issues',
      value: stats.totalShortTermIssues,
      subtitle: 'Short-term issues',
      icon: MessageSquare,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      trend: stats.totalShortTermIssues > 3 ? 'down' : 'stable',
      trendValue: `${stats.totalShortTermIssues} active`,
      insight: stats.totalShortTermIssues === 0 ? 'Clear sailing!' : stats.totalShortTermIssues <= 3 ? 'Normal' : 'High volume',
      action: {
        label: 'View Issues',
        icon: ArrowRight,
        link: '/issues'
      },
      urgentCount: stats.totalShortTermIssues
    }
  ];

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down': return <TrendingDown className="h-3 w-3 text-red-600" />;
      default: return <div className="w-3 h-3 rounded-full bg-yellow-400" />;
    }
  };

  const getInsightColor = (insight) => {
    if (insight.includes('Excellent') || insight.includes('Great')) return 'text-green-700 bg-green-100';
    if (insight.includes('Critical') || insight.includes('attention')) return 'text-red-700 bg-red-100';
    if (insight.includes('High volume')) return 'text-orange-700 bg-orange-100';
    return 'text-blue-700 bg-blue-100';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {kpiCards.map((card) => (
        <Card 
          key={card.id} 
          className={`transition-all duration-200 hover:shadow-lg ${card.borderColor} ${
            card.isAlert ? 'ring-2 ring-red-200 shadow-lg' : 'hover:shadow-md'
          }`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {card.title}
                  </CardTitle>
                  {card.urgentCount > 0 && (
                    <Badge variant="destructive" className="text-xs mt-1">
                      {card.urgentCount} urgent
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-1 text-xs">
                {getTrendIcon(card.trend)}
                <span className="text-gray-500">{card.trendValue}</span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Main metric */}
              <div>
                <div className={`text-2xl font-bold ${card.color} mb-1`}>
                  {card.value}
                </div>
                <p className="text-sm text-gray-600">{card.subtitle}</p>
              </div>

              {/* Progress bar for priorities */}
              {card.id === 'priorities' && (
                <div className="space-y-2">
                  <Progress 
                    value={card.progress} 
                    className="h-2" 
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>This Quarter</span>
                    <span>{card.progress}%</span>
                  </div>
                </div>
              )}

              {/* Insight badge */}
              <div className="flex items-center justify-between">
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getInsightColor(card.insight)}`}
                >
                  {card.insight}
                </Badge>
                
                {/* Quick action */}
                <Link to={card.action.link}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs hover:bg-gray-100"
                  >
                    <card.action.icon className="h-3 w-3 mr-1" />
                    {card.action.label}
                  </Button>
                </Link>
              </div>

              {/* Special alerts */}
              {card.isAlert && card.urgentCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-xs text-red-700 font-medium">
                      Immediate attention needed
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default EnhancedKPICards;