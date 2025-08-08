import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Edit,
  BarChart3,
  TrendingUp
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
    <Card className="overflow-hidden bg-white shadow-sm border border-gray-200">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 py-4 px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            Scorecard Metrics
          </CardTitle>
          <div className="text-sm text-gray-600">
            {metrics.length} {metrics.length === 1 ? 'metric' : 'metrics'}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="sticky left-0 z-10 bg-white text-left px-4 py-3 font-semibold text-gray-700 text-sm min-w-[200px] border-r border-gray-200">
                  Metric
                </th>
                <th className="text-center px-3 py-3 font-semibold text-gray-700 text-sm w-24 border-r border-gray-200">
                  Owner
                </th>
                <th className="text-center px-3 py-3 font-semibold text-gray-700 text-sm w-24 border-r border-gray-200">
                  Goal
                </th>
                
                {/* Total and Average columns for RTL */}
                {isRTL && (
                  <>
                    {showTotal && (
                      <th className="text-center px-3 py-3 font-semibold text-gray-700 text-sm w-20 bg-gray-50 border-r border-gray-200">
                        Total
                      </th>
                    )}
                    <th className="text-center px-3 py-3 font-semibold text-gray-700 text-sm w-20 bg-blue-50 border-r border-gray-200">
                      Average
                    </th>
                  </>
                )}
                
                {/* Week columns */}
                {weekLabels.map((label, index) => {
                  const originalIndex = isRTL ? weekLabelsOriginal.length - 1 - index : index;
                  const isCurrentWeek = originalIndex === weekLabelsOriginal.length - 1;
                  return (
                    <th key={weekDates[index]} className={`text-center px-2 py-3 font-medium text-xs w-20 ${
                      isCurrentWeek 
                        ? 'bg-indigo-50 text-indigo-900 border-x-2 border-indigo-200' 
                        : 'text-gray-600 border-r border-gray-100'
                    }`}>
                      <div className="flex flex-col items-center">
                        {isCurrentWeek && (
                          <span className="text-[10px] font-semibold text-indigo-600 mb-1 uppercase tracking-wider">Current</span>
                        )}
                        <span className="font-medium">{label}</span>
                      </div>
                    </th>
                  );
                })}
                
                {/* Average and Total columns for LTR */}
                {!isRTL && (
                  <>
                    <th className="text-center px-3 py-3 font-semibold text-gray-700 text-sm w-20 bg-blue-50 border-l border-gray-200">
                      Average
                    </th>
                    {showTotal && (
                      <th className="text-center px-3 py-3 font-semibold text-gray-700 text-sm w-20 bg-gray-50 border-l border-gray-200">
                        Total
                      </th>
                    )}
                  </>
                )}
                
                {!readOnly && <th className="w-24 border-l border-gray-200"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {metrics.map((metric, metricIndex) => {
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
                  <tr key={metric.id} className={`hover:bg-gray-50 group transition-colors ${
                    metricIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  }`}>
                    {/* Metric name column - sticky */}
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-3 border-r border-gray-200">
                      <div className="font-medium text-gray-900 text-sm">{metric.name}</div>
                      {metric.description && (
                        <div className="text-xs text-gray-500 mt-0.5">{metric.description}</div>
                      )}
                    </td>
                    
                    {/* Owner column */}
                    <td className="px-3 py-3 text-center border-r border-gray-200">
                      <div className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                        {metric.ownerName || metric.owner || '-'}
                      </div>
                    </td>
                    
                    {/* Goal column */}
                    <td className="px-3 py-3 text-center border-r border-gray-200">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-indigo-50 text-xs font-semibold text-indigo-700">
                        {formatGoal(metric.goal, metric.value_type, metric.comparison_operator)}
                      </span>
                    </td>
                    
                    {/* Total and Average columns for RTL */}
                    {isRTL && (
                      <>
                        {showTotal && (
                          <td className="px-3 py-3 text-center bg-gray-50 border-r border-gray-200">
                            {total !== null ? (
                              <span className="font-semibold text-sm text-gray-700">
                                {formatValue(total, metric.value_type)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        )}
                        <td className="px-3 py-3 text-center bg-blue-50 border-r border-gray-200">
                          {average !== null ? (
                            <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-semibold ${
                              avgGoalMet 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
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
                    {weekDates.map((weekDate, index) => {
                      const score = weeklyScores[metric.id]?.[weekDate];
                      const goalMet = score && isGoalMet(score, metric.goal, metric.comparison_operator);
                      const originalIndex = isRTL ? weekLabelsOriginal.length - 1 - index : index;
                      const isCurrentWeek = originalIndex === weekLabelsOriginal.length - 1;
                      
                      return (
                        <td key={weekDate} className={`px-2 py-3 text-center ${
                          isCurrentWeek 
                            ? 'bg-indigo-50/50 border-x-2 border-indigo-100' 
                            : 'border-r border-gray-100'
                        }`}>
                          {readOnly ? (
                            score ? (
                              <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-semibold ${
                                goalMet
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {formatValue(score, metric.value_type)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )
                          ) : (
                            <button
                              onClick={() => onScoreEdit && onScoreEdit(metric, weekDate)}
                              className={`w-full py-1 px-2 rounded-md text-xs font-semibold transition-all ${
                                score
                                  ? goalMet
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200 hover:shadow-sm'
                                    : 'bg-red-100 text-red-700 hover:bg-red-200 hover:shadow-sm'
                                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
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
                        <td className="px-3 py-3 text-center bg-blue-50 border-l border-gray-200">
                          {average !== null ? (
                            <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-semibold ${
                              avgGoalMet 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {metric.value_type === 'number' ? Math.round(average) : formatValue(average, metric.value_type)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        {showTotal && (
                          <td className="px-3 py-3 text-center bg-gray-50 border-l border-gray-200">
                            {total !== null ? (
                              <span className="font-semibold text-sm text-gray-700">
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
                      <td className="px-3 py-3 border-l border-gray-200">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onChartOpen && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onChartOpen(metric)}
                              className="h-8 w-8 p-0 hover:bg-indigo-50"
                            >
                              <BarChart3 className="h-4 w-4 text-indigo-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Handle edit action
                              console.log('Edit metric:', metric);
                            }}
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                          >
                            <Edit className="h-4 w-4 text-gray-600" />
                          </Button>
                        </div>
                      </td>
                    )}
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