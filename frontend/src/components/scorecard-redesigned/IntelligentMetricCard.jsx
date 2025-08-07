import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Target, 
  Edit, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Calendar,
  Zap
} from 'lucide-react';

const IntelligentMetricCard = ({
  metric,
  scores = {},
  periods = [],
  type = 'weekly', // weekly, monthly
  onScoreUpdate,
  onMetricEdit,
  onChartView,
  currentPeriod,
  isNeedsAttention = false,
  insights = null
}) => {
  const [isQuickEdit, setIsQuickEdit] = useState(false);
  const [quickValue, setQuickValue] = useState('');

  // Calculate trend and performance data
  const getPerformanceData = () => {
    const metricScores = scores[metric.id] || {};
    const values = periods.map(period => {
      const score = metricScores[period];
      return score ? parseFloat(score) : null;
    }).filter(v => v !== null);

    if (values.length < 2) {
      return {
        trend: 'stable',
        trendPercentage: 0,
        currentValue: values[values.length - 1] || 0,
        previousValue: 0,
        average: values[0] || 0,
        completion: 0,
        isOnTrack: true
      };
    }

    const currentValue = values[values.length - 1];
    const previousValue = values[values.length - 2];
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const goal = parseFloat(metric.goal) || 0;

    // Determine trend
    let trend = 'stable';
    let trendPercentage = 0;

    if (currentValue !== previousValue) {
      trendPercentage = previousValue > 0 
        ? ((currentValue - previousValue) / previousValue) * 100 
        : 100;
      
      if (Math.abs(trendPercentage) >= 5) {
        trend = currentValue > previousValue ? 'up' : 'down';
      }
    }

    // Goal achievement
    const isOnTrack = goal > 0 ? isGoalMet(currentValue, goal, metric.comparison_operator) : true;
    const completion = goal > 0 ? Math.min((currentValue / goal) * 100, 100) : 100;

    return {
      trend,
      trendPercentage: Math.abs(trendPercentage),
      currentValue,
      previousValue,
      average,
      completion,
      isOnTrack,
      values
    };
  };

  const isGoalMet = (score, goal, comparisonOperator) => {
    if (!score || !goal) return false;
    
    const scoreVal = parseFloat(score);
    const goalVal = parseFloat(goal);
    
    switch (comparisonOperator) {
      case 'greater_equal':
        return scoreVal >= goalVal;
      case 'less_equal':
        return scoreVal <= goalVal;
      case 'equal':
        return Math.abs(scoreVal - goalVal) < 0.01;
      default:
        return scoreVal >= goalVal;
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

  const formatGoal = (goal, valueType, comparisonOperator) => {
    if (!goal && goal !== 0) return 'No goal';
    
    let formattedValue = formatValue(goal, valueType);
    
    switch (comparisonOperator) {
      case 'greater_equal':
        return `≥ ${formattedValue}`;
      case 'less_equal':
        return `≤ ${formattedValue}`;
      case 'equal':
        return `= ${formattedValue}`;
      default:
        return `≥ ${formattedValue}`;
    }
  };

  const getTrendIcon = (trend, isPositive) => {
    if (trend === 'stable') return <Minus className="h-3 w-3 text-gray-500" />;
    if (trend === 'up') return <TrendingUp className={`h-3 w-3 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />;
    return <TrendingDown className={`h-3 w-3 ${isPositive ? 'text-red-600' : 'text-green-600'}`} />;
  };

  const getUserInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleQuickUpdate = () => {
    if (quickValue && currentPeriod) {
      onScoreUpdate(metric, currentPeriod, quickValue);
      setQuickValue('');
      setIsQuickEdit(false);
    }
  };

  const performance = getPerformanceData();
  const currentScore = scores[metric.id]?.[currentPeriod];

  // Simple sparkline component
  const Sparkline = ({ values, width = 60, height = 20 }) => {
    if (values.length < 2) return <div className={`w-[${width}px] h-[${height}px] bg-gray-100 rounded`} />;

    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    const points = values.map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    const isPositiveTrend = values[values.length - 1] >= values[0];

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={isPositiveTrend ? '#10b981' : '#ef4444'}
          strokeWidth="1.5"
          className="drop-shadow-sm"
        />
        {values.map((value, index) => {
          const x = (index / (values.length - 1)) * width;
          const y = height - ((value - min) / range) * height;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="1.5"
              fill={index === values.length - 1 ? '#3b82f6' : isPositiveTrend ? '#10b981' : '#ef4444'}
              className="drop-shadow-sm"
            />
          );
        })}
      </svg>
    );
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-lg ${
      isNeedsAttention ? 'ring-2 ring-orange-200 border-orange-200 bg-orange-50/30' : 
      !performance.isOnTrack ? 'ring-1 ring-red-100 border-red-100' : 
      'hover:shadow-md border-gray-200'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* Owner Avatar */}
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                {getUserInitials(metric.ownerName || metric.owner)}
              </AvatarFallback>
            </Avatar>
            
            {/* Metric Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <CardTitle className="text-base font-semibold truncate">
                  {metric.name}
                </CardTitle>
                {isNeedsAttention && (
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs flex-shrink-0">
                    <Clock className="h-3 w-3 mr-1" />
                    Update
                  </Badge>
                )}
              </div>
              
              {/* Owner & Goal */}
              <div className="flex items-center space-x-3 text-xs text-gray-600">
                <span>{metric.ownerName || metric.owner}</span>
                <span>•</span>
                <span className="font-medium text-indigo-600">
                  {formatGoal(metric.goal, metric.value_type, metric.comparison_operator)}
                </span>
              </div>
              
              {/* Data Source */}
              {metric.description && (
                <div className="text-xs text-gray-500 mt-1 truncate">
                  {metric.description}
                </div>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onChartView(metric)}
              title="View trend chart"
            >
              <BarChart3 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onMetricEdit(metric)}
              title="Edit metric"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Current Value & Trend */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Current Value */}
              <div className="flex items-baseline space-x-2">
                <span className={`text-2xl font-bold ${
                  performance.isOnTrack ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatValue(performance.currentValue, metric.value_type)}
                </span>
                {performance.trend !== 'stable' && (
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(
                      performance.trend, 
                      metric.comparison_operator === 'greater_equal' ? performance.trend === 'up' : performance.trend === 'down'
                    )}
                    <span className="text-xs font-medium text-gray-600">
                      {performance.trendPercentage.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Sparkline */}
            {performance.values.length >= 2 && (
              <div className="flex items-center space-x-2">
                <Sparkline values={performance.values} />
                <span className="text-xs text-gray-500">
                  {type === 'weekly' ? `${performance.values.length}w` : `${performance.values.length}m`}
                </span>
              </div>
            )}
          </div>

          {/* Goal Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Goal Progress</span>
              <span className={`font-medium ${performance.isOnTrack ? 'text-green-600' : 'text-red-600'}`}>
                {performance.completion.toFixed(0)}%
              </span>
            </div>
            <Progress 
              value={performance.completion} 
              className={`h-2 ${
                performance.isOnTrack ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'
              }`}
            />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Avg: {formatValue(performance.average, metric.value_type)}</span>
              {performance.isOnTrack ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>On Track</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Needs Attention</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Update */}
          <div className="pt-2 border-t border-gray-100">
            {isQuickEdit ? (
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={quickValue}
                  onChange={(e) => setQuickValue(e.target.value)}
                  placeholder={`${type === 'weekly' ? 'Weekly' : 'Monthly'} value`}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleQuickUpdate()}
                />
                <Button size="sm" onClick={handleQuickUpdate} className="h-7">
                  <CheckCircle className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsQuickEdit(false)} className="h-7">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-600">
                  Current {type}: {currentScore ? formatValue(currentScore, metric.value_type) : 'No data'}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsQuickEdit(true)}
                  className="h-7 text-xs"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Update
                </Button>
              </div>
            )}
          </div>

          {/* Insights */}
          {insights && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-start space-x-2">
                <Zap className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-gray-700">{insights}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default IntelligentMetricCard;