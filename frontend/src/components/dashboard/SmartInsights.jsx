import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain,
  TrendingUp,
  Trophy,
  AlertTriangle,
  Target,
  Clock,
  CheckCircle,
  Lightbulb,
  X,
  ArrowRight,
  Calendar,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

const SmartInsights = ({ 
  priorities = [], 
  todos = [], 
  stats = {},
  user = {},
  onDismissInsight 
}) => {
  const [dismissedInsights, setDismissedInsights] = useState(new Set());

  const generateInsights = () => {
    const insights = [];
    const now = new Date();

    // Achievement celebrations
    if (stats.prioritiesProgress >= 100) {
      insights.push({
        id: 'quarter-complete',
        type: 'celebration',
        title: '🎉 Quarter Complete!',
        message: 'Congratulations! You\'ve completed all your quarterly priorities.',
        priority: 'high',
        icon: Trophy,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        action: { label: 'Set New Goals', link: '/quarterly-priorities' }
      });
    } else if (stats.prioritiesProgress >= 80) {
      insights.push({
        id: 'great-progress',
        type: 'celebration',
        title: '🔥 Excellent Progress!',
        message: `You're at ${stats.prioritiesProgress}% completion. Keep up the great work!`,
        priority: 'medium',
        icon: TrendingUp,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        action: null
      });
    }

    // Performance insights
    const overduePriorities = priorities.filter(p => {
      const dueDate = new Date(p.dueDate);
      return dueDate < now && p.status !== 'complete';
    });

    if (overduePriorities.length > 0) {
      insights.push({
        id: 'overdue-priorities',
        type: 'alert',
        title: '⚠️ Priorities Need Attention',
        message: `${overduePriorities.length} priorities are past their due date.`,
        priority: 'high',
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        action: { label: 'Review Priorities', link: '/quarterly-priorities' }
      });
    }

    // Proactive suggestions
    const atRiskPriorities = priorities.filter(p => {
      const dueDate = new Date(p.dueDate);
      const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= 7 && daysUntilDue > 0 && p.progress < 80;
    });

    if (atRiskPriorities.length > 0) {
      insights.push({
        id: 'at-risk-priorities',
        type: 'suggestion',
        title: '🎯 Priorities at Risk',
        message: `${atRiskPriorities.length} priorities are due soon and may need extra focus.`,
        priority: 'medium',
        icon: Target,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        action: { label: 'Review & Update', link: '/quarterly-priorities' }
      });
    }

    // Productivity insights
    if (stats.overdueItems === 0 && stats.totalShortTermIssues === 0) {
      insights.push({
        id: 'productivity-streak',
        type: 'celebration',
        title: '⚡ Productivity Streak!',
        message: 'No overdue items or urgent issues. You\'re in the zone!',
        priority: 'low',
        icon: Zap,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        action: null
      });
    }

    // Weekly patterns
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 1) { // Monday
      const upcomingDeadlines = priorities.filter(p => {
        const dueDate = new Date(p.dueDate);
        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= 7 && daysUntilDue > 0;
      });

      if (upcomingDeadlines.length > 0) {
        insights.push({
          id: 'weekly-planning',
          type: 'suggestion',
          title: '📅 Week Ahead Planning',
          message: `You have ${upcomingDeadlines.length} priorities due this week. Consider planning your week.`,
          priority: 'medium',
          icon: Calendar,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          action: { label: 'Plan Week', link: '/quarterly-priorities' }
        });
      }
    }

    // Milestone suggestions
    const prioritiesWithoutMilestones = priorities.filter(p => 
      p.status !== 'complete' && (!p.milestones || p.milestones.length === 0)
    );

    if (prioritiesWithoutMilestones.length > 0) {
      insights.push({
        id: 'add-milestones',
        type: 'tip',
        title: '💡 Break Down Your Goals',
        message: `${prioritiesWithoutMilestones.length} priorities could benefit from milestones to track progress.`,
        priority: 'low',
        icon: Lightbulb,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
        action: { label: 'Add Milestones', link: '/quarterly-priorities' }
      });
    }

    return insights
      .filter(insight => !dismissedInsights.has(insight.id))
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 3); // Show max 3 insights
  };

  const handleDismiss = (insightId) => {
    setDismissedInsights(prev => new Set([...prev, insightId]));
    onDismissInsight?.(insightId);
  };

  const getInsightStyle = (type) => {
    switch (type) {
      case 'celebration':
        return 'bg-gradient-to-r from-green-50 to-blue-50 border-green-200';
      case 'alert':
        return 'bg-red-50 border-red-200';
      case 'suggestion':
        return 'bg-orange-50 border-orange-200';
      case 'tip':
        return 'bg-indigo-50 border-indigo-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const insights = generateInsights();

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-200">
            <Brain className="h-5 w-5 text-purple-600" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">Smart Insights</CardTitle>
          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
            {insights.length} new
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight) => (
            <Alert 
              key={insight.id} 
              className={`${getInsightStyle(insight.type)} transition-all duration-200 hover:shadow-sm`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`p-2 rounded-xl ${insight.bgColor} flex-shrink-0 shadow-sm`}>
                    <insight.icon className={`h-4 w-4 ${insight.color}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <AlertDescription>
                      <div className="space-y-2">
                        <h4 className="font-bold text-sm text-slate-900">
                          {insight.title}
                        </h4>
                        <p className="text-sm text-gray-700">
                          {insight.message}
                        </p>
                        
                        {insight.action && (
                          <div className="pt-2">
                            <Link to={insight.action.link}>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-xs"
                              >
                                {insight.action.label}
                                <ArrowRight className="ml-1 h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
                  onClick={() => handleDismiss(insight.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </Alert>
          ))}
          
          {/* Summary insight */}
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-3 w-3" />
                <span>Based on your activity patterns</span>
              </div>
              <span className="text-purple-600">AI-powered insights</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartInsights;