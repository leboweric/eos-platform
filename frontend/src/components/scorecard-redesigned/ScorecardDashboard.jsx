import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap,
  Award,
  Activity,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ScorecardDashboard = ({ 
  metrics = [],
  scores = {},
  periods = [],
  type = 'weekly',
  currentPeriod,
  onBulkUpdate,
  onViewMetric 
}) => {
  // Calculate dashboard insights
  const getDashboardInsights = () => {
    const insights = {
      totalMetrics: metrics.length,
      metricsWithData: 0,
      onTrackMetrics: 0,
      needsAttention: 0,
      missingData: 0,
      trending: { up: 0, down: 0, stable: 0 },
      topPerformers: [],
      needsUpdate: []
    };

    metrics.forEach(metric => {
      const metricScores = scores[metric.id] || {};
      const currentScore = metricScores[currentPeriod];
      const values = periods.slice(-5).map(p => metricScores[p]).filter(v => v !== null && v !== undefined);

      // Data availability
      if (currentScore) {
        insights.metricsWithData++;
      } else {
        insights.missingData++;
        insights.needsUpdate.push(metric);
      }

      // Goal achievement
      if (currentScore && metric.goal) {
        const isOnTrack = isGoalMet(currentScore, metric.goal, metric.comparison_operator);
        if (isOnTrack) {
          insights.onTrackMetrics++;
        } else {
          insights.needsAttention++;
        }

        // Performance calculation for ranking
        const goalAchievement = (parseFloat(currentScore) / parseFloat(metric.goal)) * 100;
        insights.topPerformers.push({
          metric,
          score: currentScore,
          achievement: goalAchievement,
          isOnTrack
        });
      }

      // Trend analysis
      if (values.length >= 2) {
        const current = parseFloat(values[values.length - 1]);
        const previous = parseFloat(values[values.length - 2]);
        const change = ((current - previous) / previous) * 100;
        
        if (Math.abs(change) >= 5) {
          if (change > 0) insights.trending.up++;
          else insights.trending.down++;
        } else {
          insights.trending.stable++;
        }
      }
    });

    // Sort top performers
    insights.topPerformers.sort((a, b) => b.achievement - a.achievement);

    return insights;
  };

  const isGoalMet = (score, goal, comparisonOperator) => {
    if (!score || !goal) return false;
    
    const scoreVal = parseFloat(score);
    const goalVal = parseFloat(goal);
    
    switch (comparisonOperator) {
      case 'greater_equal': return scoreVal >= goalVal;
      case 'less_equal': return scoreVal <= goalVal;
      case 'equal': return Math.abs(scoreVal - goalVal) < 0.01;
      default: return scoreVal >= goalVal;
    }
  };

  const formatValue = (value, valueType) => {
    if (!value && value !== 0) return '—';
    
    const numValue = parseFloat(value);
    switch (valueType) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(numValue);
      case 'percentage':
        return `${Math.round(numValue)}%`;
      default:
        return Math.round(numValue).toString();
    }
  };

  const insights = getDashboardInsights();
  const onTrackPercentage = insights.totalMetrics > 0 
    ? Math.round((insights.onTrackMetrics / insights.metricsWithData) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Overall Performance */}
        <Card className="border-2 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Performance</p>
                <div className="flex items-baseline space-x-2">
                  <p className={`text-2xl font-bold ${
                    onTrackPercentage >= 80 ? 'text-green-600' : 
                    onTrackPercentage >= 60 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {onTrackPercentage}%
                  </p>
                  <p className="text-xs text-gray-500">on track</p>
                </div>
                <Progress 
                  value={onTrackPercentage} 
                  className={`mt-2 h-2 ${
                    onTrackPercentage >= 80 ? '[&>div]:bg-green-500' :
                    onTrackPercentage >= 60 ? '[&>div]:bg-blue-500' : '[&>div]:bg-red-500'
                  }`}
                />
              </div>
              <div className={`p-3 rounded-full ${
                onTrackPercentage >= 80 ? 'bg-green-100' :
                onTrackPercentage >= 60 ? 'bg-blue-100' : 'bg-red-100'
              }`}>
                <Target className={`h-6 w-6 ${
                  onTrackPercentage >= 80 ? 'text-green-600' :
                  onTrackPercentage >= 60 ? 'text-blue-600' : 'text-red-600'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trending Up */}
        <Card className="hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Trending Up</p>
                <p className="text-2xl font-bold text-green-600">{insights.trending.up}</p>
                <p className="text-xs text-gray-500 mt-1">metrics improving</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Needs Attention */}
        <Card className={`hover:shadow-lg transition-all duration-200 ${
          insights.needsAttention > 0 ? 'ring-2 ring-orange-200 border-orange-200' : ''
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Needs Attention</p>
                <p className="text-2xl font-bold text-red-600">{insights.needsAttention}</p>
                <p className="text-xs text-gray-500 mt-1">below goals</p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            {insights.needsAttention > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3 text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
              >
                Review Metrics
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Missing Updates */}
        <Card className={`hover:shadow-lg transition-all duration-200 ${
          insights.missingData > 0 ? 'ring-2 ring-blue-200 border-blue-200' : ''
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Missing Data</p>
                <p className="text-2xl font-bold text-blue-600">{insights.missingData}</p>
                <p className="text-xs text-gray-500 mt-1">need updates</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            {insights.missingData > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() => onBulkUpdate(insights.needsUpdate)}
              >
                Bulk Update
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Insights */}
      {(insights.topPerformers.length > 0 || insights.needsUpdate.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performers */}
          {insights.topPerformers.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-yellow-600" />
                  <CardTitle className="text-lg">Top Performers</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.topPerformers.slice(0, 3).map((performer, index) => (
                    <div 
                      key={performer.metric.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => onViewMetric(performer.metric)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{performer.metric.name}</p>
                          <p className="text-xs text-gray-600">{performer.metric.ownerName || performer.metric.owner}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {formatValue(performer.score, performer.metric.value_type)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {performer.achievement.toFixed(0)}% of goal
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.missingData > 0 && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-auto p-4 border-blue-200 hover:bg-blue-50"
                    onClick={() => onBulkUpdate(insights.needsUpdate)}
                  >
                    <div className="flex items-center space-x-3 w-full">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-medium text-sm">Update Missing Data</p>
                        <p className="text-xs text-gray-600">
                          {insights.missingData} metrics need {type} values
                        </p>
                      </div>
                    </div>
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto p-4 border-gray-200 hover:bg-gray-50"
                  onClick={() => window.open('#', '_blank')}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <BarChart3 className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-sm">View Analytics</p>
                      <p className="text-xs text-gray-600">
                        Detailed performance trends and insights
                      </p>
                    </div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto p-4 border-gray-200 hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Activity className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-sm">Export Report</p>
                      <p className="text-xs text-gray-600">
                        Download {type} performance summary
                      </p>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Period Summary */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-100 rounded-full">
                <Target className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-indigo-900">
                  {type === 'weekly' ? 'Week' : 'Month'} Performance Summary
                </h3>
                <p className="text-sm text-indigo-700">
                  {insights.onTrackMetrics} of {insights.metricsWithData} metrics on track • 
                  {insights.trending.up} trending up • 
                  {insights.needsAttention} need attention
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-indigo-600 font-medium">Current Period</p>
              <p className="text-xs text-indigo-500">
                {currentPeriod ? new Date(currentPeriod).toLocaleDateString() : 'No period selected'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScorecardDashboard;