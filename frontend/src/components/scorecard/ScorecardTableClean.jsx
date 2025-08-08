import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Edit,
  BarChart3,
  GripVertical,
  Trash2
} from 'lucide-react';

const ScorecardTableClean = ({ 
  metrics = [], 
  weeklyScores = {}, 
  monthlyScores = {},
  type = 'weekly', // 'weekly' or 'monthly'
  readOnly = false,
  isRTL = false,
  showTotal = true,
  departmentId,
  onIssueCreated,
  onScoreEdit,
  onChartOpen,
  onMetricUpdate,
  onMetricDelete
}) => {
  // Get week start date for a given date
  const getWeekStartDate = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  // Format date as "MMM D"
  const formatWeekLabel = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  // Get week labels for the past 10 weeks
  const getWeekLabels = () => {
    const labels = [];
    const weekDates = [];
    const today = new Date();
    
    for (let i = 9; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (i * 7));
      const mondayOfWeek = getWeekStartDate(weekStart);
      
      labels.push(formatWeekLabel(mondayOfWeek));
      weekDates.push(mondayOfWeek.toISOString().split('T')[0]);
    }
    
    return { labels, weekDates };
  };

  // Get month labels for the past 12 months
  const getMonthLabels = () => {
    const labels = [];
    const monthDates = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthLabel = date.toLocaleString('default', { month: 'short' }).toUpperCase();
      const yearLabel = date.getFullYear().toString().slice(-2);
      labels.push(`${monthLabel} ${yearLabel}`);
      monthDates.push(date.toISOString().split('T')[0]);
    }
    
    return { labels, monthDates };
  };

  const isWeekly = type === 'weekly';
  const { labels: weekLabelsOriginal, weekDates: weekDatesOriginal } = isWeekly ? getWeekLabels() : { labels: [], weekDates: [] };
  const { labels: monthLabelsOriginal, monthDates: monthDatesOriginal } = !isWeekly ? getMonthLabels() : { labels: [], monthDates: [] };
  
  const periodLabelsOriginal = isWeekly ? weekLabelsOriginal : monthLabelsOriginal;
  const periodDatesOriginal = isWeekly ? weekDatesOriginal : monthDatesOriginal;
  const periodLabels = isRTL ? [...periodLabelsOriginal].reverse() : periodLabelsOriginal;
  const periodDates = isRTL ? [...periodDatesOriginal].reverse() : periodDatesOriginal;
  
  const scores = isWeekly ? weeklyScores : monthlyScores;

  // Helper functions for value formatting and goal achievement
  const formatValue = (value, valueType) => {
    if (!value && value !== 0) return '-';
    
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
    
    let formattedValue;
    if (valueType === 'number') {
      formattedValue = Math.round(parseFloat(goal)).toString();
    } else {
      formattedValue = formatValue(goal, valueType);
    }
    
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

  const isGoalMet = (score, goal, comparisonOperator) => {
    if (!score || !goal) return false;
    
    const scoreVal = parseFloat(score);
    const goalVal = parseFloat(goal);
    
    switch (comparisonOperator) {
      case 'less_equal':
        return scoreVal <= goalVal;
      case 'equal':
        return scoreVal === goalVal;
      case 'greater_equal':
      default:
        return scoreVal >= goalVal;
    }
  };

  return (
    <Card className="transition-all bg-white border border-gray-200">
      <CardHeader className="bg-white border-b border-gray-200">
        <CardTitle className="text-lg">All Metrics</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="text-center p-2 font-semibold text-gray-700 w-8"></th>
                <th className="text-center p-2 font-semibold text-gray-700 w-16">Owner</th>
                <th className="text-left p-2 font-semibold text-gray-700 w-48">Metric</th>
                <th className="text-center p-2 font-semibold text-gray-700 w-12">Chart</th>
                <th className="text-center p-2 font-semibold text-gray-700 w-20">Goal</th>
                
                <th className="text-center p-2 font-semibold text-gray-700 w-20 border-l border-gray-200">Average</th>
                
                {/* Week columns */}
                {periodLabels.map((label, index) => {
                  const originalIndex = isRTL ? periodLabelsOriginal.length - 1 - index : index;
                  const isCurrentPeriod = originalIndex === periodLabelsOriginal.length - 1;
                  return (
                    <th key={periodDates[index]} className={`text-center p-2 font-semibold text-xs w-20 ${
                      isCurrentPeriod ? 'text-gray-900 bg-gray-50 border-2 border-gray-300' : 'text-gray-700'
                    }`}>
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-normal text-gray-500 mb-1">
                          {isCurrentPeriod ? 'Current' : ''}
                        </span>
                        <span>{label}</span>
                      </div>
                    </th>
                  );
                })}
                
                {showTotal && <th className="text-center p-2 font-semibold text-gray-700 w-20 border-l border-gray-200">Total</th>}
                <th className="text-center p-2 font-semibold text-gray-700 w-12">Actions</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric, metricIndex) => {
                const metricScores = periodDatesOriginal
                  .map(periodDate => scores[metric.id]?.[periodDate])
                  .filter(score => score !== undefined && score !== null && score !== '');
                
                const average = metricScores.length > 0 
                  ? metricScores.reduce((sum, score) => sum + parseFloat(score), 0) / metricScores.length 
                  : null;
                const total = metricScores.length > 0
                  ? metricScores.reduce((sum, score) => sum + parseFloat(score), 0)
                  : null;
                const avgGoalMet = average !== null && isGoalMet(average, metric.goal, metric.comparison_operator);
                
                return (
                  <tr key={metric.id} className="border-b hover:bg-gray-50">
                    <td className="text-center p-2 w-8">
                      <GripVertical className="h-4 w-4 text-gray-400 cursor-move mx-auto" />
                    </td>
                    <td className="text-center p-2 w-16 text-sm">
                      {metric.ownerName || metric.owner || '-'}
                    </td>
                    <td className="text-left p-2 font-medium w-48">{metric.name}</td>
                    <td className="text-center p-2 w-12">
                      <Button
                        onClick={() => onChartOpen && onChartOpen(metric)}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-gray-100 mx-auto"
                      >
                        <BarChart3 className="h-4 w-4 text-gray-600" />
                      </Button>
                    </td>
                    <td className="text-center p-2 w-20 font-semibold text-gray-700 text-sm">{formatGoal(metric.goal, metric.value_type, metric.comparison_operator)}</td>
                    
                    {/* Average column */}
                    <td className="p-2 text-center bg-white border-l border-gray-200 font-semibold text-sm w-20">
                      {average !== null ? (
                        <span className={`px-2 py-1 rounded ${
                          avgGoalMet ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {metric.value_type === 'number' ? Math.round(average) : formatValue(average, metric.value_type)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    
                    {/* Period columns */}
                    {periodDates.map((periodDate, index) => {
                      const score = scores[metric.id]?.[periodDate];
                      const goalMet = score && isGoalMet(score, metric.goal, metric.comparison_operator);
                      const originalIndex = isRTL ? periodLabelsOriginal.length - 1 - index : index;
                      const isCurrentPeriod = originalIndex === periodLabelsOriginal.length - 1;
                      
                      return (
                        <td key={periodDate} className={`p-2 text-center w-20 ${isCurrentPeriod ? 'bg-gray-50 border-2 border-gray-300' : ''}`}>
                          <button
                            onClick={() => onScoreEdit && onScoreEdit(metric, periodDate)}
                            className={`w-full px-2 py-1 rounded text-sm font-medium transition-colors
                              ${score ? (goalMet ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200') : (isCurrentPeriod ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}`}
                          >
                            {score ? formatValue(score, metric.value_type) : '-'}
                          </button>
                        </td>
                      );
                    })}
                    
                    {showTotal && (
                      <td className="p-2 text-center font-semibold w-20 bg-white border-l border-gray-200">
                        {Math.round(Object.values(scores[metric.id] || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0))}
                      </td>
                    )}
                    <td className="text-center p-2 w-12">
                      <div className="flex justify-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => onMetricUpdate && onMetricUpdate(metric)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => onMetricDelete && onMetricDelete(metric.id)}
                        >
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScorecardTableClean;