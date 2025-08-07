import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Edit,
  BarChart3
} from 'lucide-react';

const ScorecardTableClean = ({ 
  metrics = [], 
  weeklyScores = {}, 
  readOnly = false,
  isRTL = false,
  showTotal = true,
  departmentId,
  onIssueCreated,
  onScoreEdit,
  onChartOpen
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

  const { labels: weekLabelsOriginal, weekDates: weekDatesOriginal } = getWeekLabels();
  const weekLabels = isRTL ? [...weekLabelsOriginal].reverse() : weekLabelsOriginal;
  const weekDates = isRTL ? [...weekDatesOriginal].reverse() : weekDatesOriginal;

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

  if (metrics.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">No scorecard metrics found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700 w-48">Metric</th>
              <th className="text-center px-2 py-3 font-medium text-gray-700 w-24">Owner</th>
              <th className="text-center px-2 py-3 font-medium text-gray-700 w-20">Goal</th>
              {isRTL && (
                <>
                  {showTotal && <th className="text-center px-2 py-3 font-medium text-gray-700 w-20 bg-gray-100">Total</th>}
                  <th className="text-center px-2 py-3 font-medium text-gray-700 w-20 bg-gray-100">Average</th>
                </>
              )}
              {weekLabels.map((label, index) => {
                const originalIndex = isRTL ? weekLabels.length - 1 - index : index;
                const isCurrentWeek = originalIndex === weekLabelsOriginal.length - 1;
                return (
                  <th key={weekDates[index]} className={`text-center px-2 py-3 font-medium text-xs w-16 ${
                    isCurrentWeek ? 'text-gray-900 bg-gray-100' : 'text-gray-600'
                  }`}>
                    <div className="flex flex-col items-center">
                      {isCurrentWeek && (
                        <span className="text-xs font-normal text-gray-500 mb-1">Current</span>
                      )}
                      <span>{label}</span>
                    </div>
                  </th>
                );
              })}
              {!isRTL && (
                <>
                  <th className="text-center px-2 py-3 font-medium text-gray-700 w-20 bg-gray-100">Average</th>
                  {showTotal && <th className="text-center px-2 py-3 font-medium text-gray-700 w-20 bg-gray-100">Total</th>}
                </>
              )}
              {!readOnly && <th className="w-20"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {metrics.map((metric) => {
              const scores = weekDatesOriginal
                .map(weekDate => weeklyScores[metric.id]?.[weekDate])
                .filter(score => score !== undefined && score !== null && score !== '');
              
              const average = scores.length > 0 
                ? scores.reduce((sum, score) => sum + parseFloat(score), 0) / scores.length 
                : null;
              const total = scores.length > 0
                ? scores.reduce((sum, score) => sum + parseFloat(score), 0)
                : null;
              const avgGoalMet = average !== null && isGoalMet(average, metric.goal, metric.comparison_operator);
              
              return (
                <tr key={metric.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{metric.name}</div>
                    {metric.description && (
                      <div className="text-xs text-gray-500 mt-1">{metric.description}</div>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center text-sm text-gray-600">
                    {metric.ownerName || metric.owner}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className="text-sm font-medium text-gray-900">
                      {formatGoal(metric.goal, metric.value_type, metric.comparison_operator)}
                    </span>
                  </td>
                  
                  {/* Total and Average columns for RTL */}
                  {isRTL && (
                    <>
                      {showTotal && (
                        <td className="px-2 py-3 text-center bg-gray-50">
                          {total !== null ? (
                            <span className="font-medium text-sm text-gray-700">
                              {formatValue(total, metric.value_type)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      )}
                      <td className="px-2 py-3 text-center bg-gray-50">
                        {average !== null ? (
                          <span className={`font-medium text-sm ${
                            avgGoalMet ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {metric.value_type === 'number' ? Math.round(average) : formatValue(average, metric.value_type)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </>
                  )}
                  
                  {/* Week columns */}
                  {weekDates.map((weekDate) => {
                    const score = weeklyScores[metric.id]?.[weekDate];
                    const goalMet = score && isGoalMet(score, metric.goal, metric.comparison_operator);
                    
                    return (
                      <td key={weekDate} className="px-2 py-3 text-center">
                        {readOnly ? (
                          <span className={`text-sm font-medium ${
                            score
                              ? goalMet
                                ? 'text-green-700'
                                : 'text-red-700'
                              : 'text-gray-400'
                          }`}>
                            {score ? formatValue(score, metric.value_type) : '-'}
                          </span>
                        ) : (
                          <button
                            onClick={() => onScoreEdit && onScoreEdit(metric, weekDate)}
                            className={`w-full py-1 px-2 rounded text-sm font-medium transition-colors ${
                              score
                                ? goalMet
                                  ? 'text-green-700 hover:bg-green-50'
                                  : 'text-red-700 hover:bg-red-50'
                                : 'text-gray-400 hover:bg-gray-100'
                            }`}
                          >
                            {score ? formatValue(score, metric.value_type) : '-'}
                          </button>
                        )}
                      </td>
                    );
                  })}
                  
                  {/* Average and Total columns for LTR */}
                  {!isRTL && (
                    <>
                      <td className="px-2 py-3 text-center bg-gray-50">
                        {average !== null ? (
                          <span className={`font-medium text-sm ${
                            avgGoalMet ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {metric.value_type === 'number' ? Math.round(average) : formatValue(average, metric.value_type)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      {showTotal && (
                        <td className="px-2 py-3 text-center bg-gray-50">
                          {total !== null ? (
                            <span className="font-medium text-sm text-gray-700">
                              {formatValue(total, metric.value_type)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      )}
                    </>
                  )}
                  
                  {/* Actions */}
                  {!readOnly && (
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onChartOpen && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                            onClick={() => onChartOpen(metric)}
                          >
                            <BarChart3 className="h-4 w-4 text-gray-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScorecardTableClean;