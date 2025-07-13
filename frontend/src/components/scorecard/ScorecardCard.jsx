import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  User
} from 'lucide-react';

const ScorecardCard = ({ metric, weeklyScore, readOnly = false }) => {
  // Format value based on type
  const formatValue = (value, type) => {
    if (value === null || value === undefined) return '-';
    switch (type) {
      case 'percentage':
        return `${value}%`;
      case 'currency':
        return `$${parseFloat(value).toLocaleString()}`;
      case 'decimal':
        return parseFloat(value).toFixed(2);
      default:
        return value.toString();
    }
  };

  // Check if goal is met based on comparison operator
  const isGoalMet = (value, goal, operator) => {
    if (!value || !goal) return false;
    const numValue = parseFloat(value);
    const numGoal = parseFloat(goal);
    
    switch (operator) {
      case '>=':
        return numValue >= numGoal;
      case '<=':
        return numValue <= numGoal;
      case '>':
        return numValue > numGoal;
      case '<':
        return numValue < numGoal;
      case '=':
        return numValue === numGoal;
      default:
        return numValue >= numGoal;
    }
  };

  const currentScore = weeklyScore || null;
  const hasScore = currentScore !== null && currentScore !== undefined && currentScore !== '';
  const goalMet = hasScore ? isGoalMet(currentScore, metric.goal, metric.comparison_operator) : false;

  return (
    <Card className={`${hasScore && !goalMet ? 'border-red-200' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-medium text-lg">{metric.name || metric.metric_name || 'Unnamed Metric'}</h3>
            {metric.unit_of_measure && (
              <p className="text-sm text-gray-500">{metric.unit_of_measure}</p>
            )}
            {(metric.owner_name || metric.ownerId) && (
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                <User className="h-3 w-3" />
                <span>{metric.owner_name || 'Assigned'}</span>
              </div>
            )}
          </div>
          {hasScore && (
            <div className={`p-2 rounded-full ${goalMet ? 'bg-green-100' : 'bg-red-100'}`}>
              {goalMet ? (
                <TrendingUp className={`h-5 w-5 text-green-600`} />
              ) : (
                <TrendingDown className={`h-5 w-5 text-red-600`} />
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-500">Goal</p>
            <p className="text-lg font-semibold">{formatValue(metric.goal, metric.value_type)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">This Week</p>
            <p className={`text-lg font-semibold ${hasScore ? (goalMet ? 'text-green-600' : 'text-red-600') : 'text-gray-400'}`}>
              {hasScore ? formatValue(currentScore, metric.value_type) : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Frequency</p>
            <p className="text-sm font-medium text-gray-600">{metric.frequency || 'Weekly'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScorecardCard;