import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, AlertTriangle, Plus, BarChart3, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { issuesService } from '../../services/issuesService';
import { useAuthStore } from '../../stores/authStore';
import MetricTrendChart from './MetricTrendChart';

const ScorecardTable = ({ metrics, weeklyScores, readOnly = false, onIssueCreated, isRTL = false, showTotal = true, departmentId }) => {
  const { user } = useAuthStore();
  const [creatingIssue, setCreatingIssue] = useState({});
  const [chartModal, setChartModal] = useState({ isOpen: false, metric: null, metricId: null });
  // Get week start date for a given date (Monday)
  const getWeekStartDate = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  };

  // Get the last 10 weeks
  const getWeekDates = () => {
    const weeks = [];
    const today = new Date();
    
    for (let i = 9; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (i * 7));
      const mondayOfWeek = getWeekStartDate(weekStart);
      
      // Store the week identifier in ISO format for consistent storage
      weeks.push(mondayOfWeek.toISOString().split('T')[0]);
    }
    
    return weeks;
  };

  const weekDatesOriginal = getWeekDates();
  const weekLabelsOriginal = weekDatesOriginal.map((date, index) => {
    const d = new Date(date);
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    return `${month} ${day}`;
  });
  
  const weekDates = isRTL ? [...weekDatesOriginal].reverse() : weekDatesOriginal;
  const weekLabels = isRTL ? [...weekLabelsOriginal].reverse() : weekLabelsOriginal;

  // Format goal based on value type and comparison operator
  const formatGoal = (goal, valueType, comparisonOperator) => {
    if (!goal && goal !== 0) return 'No goal';
    
    let formattedValue;
    if (valueType === 'number') {
      formattedValue = Math.round(parseFloat(goal)).toString();
    } else {
      switch (valueType) {
        case 'percentage':
          formattedValue = `${Math.round(parseFloat(goal))}%`;
          break;
        case 'currency':
          formattedValue = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(parseFloat(goal));
          break;
        case 'decimal':
          formattedValue = parseFloat(goal).toFixed(2);
          break;
        default:
          formattedValue = Math.round(parseFloat(goal)).toString();
      }
    }
    
    // Add comparison operator
    switch (comparisonOperator) {
      case 'greater_equal':
        return `≥ ${formattedValue}`;
      case 'less_equal':
        return `≤ ${formattedValue}`;
      case 'equal':
        return `= ${formattedValue}`;
      default:
        return `≥ ${formattedValue}`; // Default to >= if not specified
    }
  };

  // Format value based on type
  const formatValue = (value, valueType) => {
    if (value === null || value === undefined || value === '') return '-';
    switch (valueType) {
      case 'percentage':
        return `${value}%`;
      case 'currency':
        return `$${parseFloat(value).toLocaleString()}`;
      case 'decimal':
        return parseFloat(value).toFixed(2);
      default:
        return value;
    }
  };

  // Check if goal is met based on comparison operator
  const isGoalMet = (value, goal, comparisonOperator) => {
    if (!value || !goal) return false;
    const numValue = parseFloat(value);
    const numGoal = parseFloat(goal);
    
    switch (comparisonOperator) {
      case '>=':
      case 'greater_equal':
        return numValue >= numGoal;
      case '<=':
      case 'less_equal':
        return numValue <= numGoal;
      case '>':
      case 'greater':
        return numValue > numGoal;
      case '<':
      case 'less':
        return numValue < numGoal;
      case '=':
      case 'equal':
        return numValue === numGoal;
      default:
        return numValue >= numGoal;
    }
  };

  const handleCreateIssue = async (metric, actualValue) => {
    try {
      setCreatingIssue(prev => ({ ...prev, [metric.id]: true }));
      
      const issueData = {
        title: `${metric.name} - Off Track`,
        description: `Metric "${metric.name}" is off track. Current: ${formatValue(actualValue, metric.value_type)}, Goal: ${formatGoal(metric.goal, metric.value_type, metric.comparison_operator)}`,
        timeline: 'short_term',
        ownerId: metric.ownerId || metric.owner_id || null,
        department_id: departmentId
      };
      
      console.log('Creating issue with data:', issueData);
      await issuesService.createIssue(issueData);
      
      // Show success feedback
      if (onIssueCreated) {
        onIssueCreated(`Issue created for ${metric.name}`);
      }
      
      setCreatingIssue(prev => ({ ...prev, [metric.id]: false }));
    } catch (error) {
      console.error('Failed to create issue:', error);
      setCreatingIssue(prev => ({ ...prev, [metric.id]: false }));
      alert('Failed to create issue. Please try again.');
    }
  };

  return (
    <>
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white">
        <CardTitle className="flex items-center text-xl">
          <Target className="mr-2 h-6 w-6" />
          Weekly Scorecard
        </CardTitle>
        <CardDescription className="text-indigo-100">
          Track performance over the past 10 weeks
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-center p-2 font-semibold text-gray-700 w-16">Owner</th>
                <th className="text-left p-2 font-semibold text-gray-700 w-48">Metric</th>
                <th className="text-center p-2 font-semibold text-gray-700 w-12">Chart</th>
                <th className="text-center p-2 font-semibold text-gray-700 w-20">Goal</th>
                {isRTL && (
                  <>
                    {showTotal && <th className="text-center p-2 font-semibold text-gray-700 w-20 bg-gray-100">Total</th>}
                    <th className="text-center p-2 font-semibold text-gray-700 w-20 bg-gray-100">Average</th>
                  </>
                )}
                {weekLabels.map((label, index) => {
                  // Current week is always the last in original order (most recent date)
                  const originalIndex = isRTL ? weekLabels.length - 1 - index : index;
                  const isCurrentWeek = originalIndex === weekLabelsOriginal.length - 1;
                  return (
                    <th key={weekDates[index]} className={`text-center p-2 font-semibold text-xs w-16 ${
                      isCurrentWeek ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700'
                    }`}>
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-normal text-gray-500 mb-1">
                          {isCurrentWeek ? 'Current' : ''}
                        </span>
                        <span>{label}</span>
                      </div>
                    </th>
                  );
                })}
                {!isRTL && (
                  <>
                    <th className="text-center p-2 font-semibold text-gray-700 w-20 bg-gray-100">Average</th>
                    {showTotal && <th className="text-center p-2 font-semibold text-gray-700 w-20 bg-gray-100">Total</th>}
                  </>
                )}
                {!readOnly && <th className="text-center p-2 font-semibold text-gray-700 w-20">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {metrics.length === 0 ? (
                <tr>
                  <td colSpan={weekLabels.length + (showTotal ? 7 : 6) + (readOnly ? 0 : 1)} className="text-center p-8 text-gray-500">
                    No metrics defined. {!readOnly && 'Click "Add Metric" to get started.'}
                  </td>
                </tr>
              ) : (
                metrics.map(metric => (
                  <tr key={metric.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-center text-sm">{metric.ownerName || metric.owner || '-'}</td>
                    <td className="p-2 font-medium text-sm">{metric.name}</td>
                    <td className="p-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-blue-100"
                        onClick={() => setChartModal({ isOpen: true, metric, metricId: metric.id })}
                        title="View 3-week moving trend chart"
                      >
                        <BarChart3 className="h-4 w-4 text-blue-600" />
                      </Button>
                    </td>
                    <td className="p-2 text-center font-semibold text-indigo-600 text-sm">
                      {formatGoal(metric.goal, metric.value_type, metric.comparison_operator)}
                    </td>
                    
                    {/* Total and Average columns for RTL */}
                    {isRTL && (
                      <>
                        {/* Total column */}
                        {showTotal && (
                          <td className="p-2 text-center bg-gray-50 font-semibold text-sm">
                          {(() => {
                            // Always use original order for calculations
                            const scores = weekDatesOriginal
                              .map(weekDate => weeklyScores[metric.id]?.[weekDate])
                              .filter(score => score !== undefined && score !== null && score !== '');
                            
                            if (scores.length === 0) return '-';
                            
                            const total = scores.reduce((sum, score) => sum + parseFloat(score), 0);
                            
                            return (
                              <span className="text-gray-700">
                                {formatValue(total, metric.value_type)}
                              </span>
                            );
                          })()}
                          </td>
                        )}
                        {/* Average column */}
                        <td className="p-4 text-center bg-gray-50 font-semibold text-sm">
                          {(() => {
                            // Always use original order for calculations
                            const scores = weekDatesOriginal
                              .map(weekDate => weeklyScores[metric.id]?.[weekDate])
                              .filter(score => score !== undefined && score !== null && score !== '');
                            
                            if (scores.length === 0) return '-';
                            
                            const average = scores.reduce((sum, score) => sum + parseFloat(score), 0) / scores.length;
                            const roundedAverage = Math.ceil(average);
                            const avgGoalMet = isGoalMet(roundedAverage, metric.goal, metric.comparison_operator);
                            
                            return (
                              <span className={`px-2 py-1 rounded ${
                                avgGoalMet ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {formatValue(roundedAverage, metric.value_type)}
                              </span>
                            );
                          })()}
                        </td>
                      </>
                    )}
                    
                    {/* Week columns */}
                    {weekDates.map((weekDate, index) => {
                      const score = weeklyScores[metric.id]?.[weekDate];
                      const goalMet = score && isGoalMet(score, metric.goal, metric.comparison_operator);
                      // Current week is always the last in original order
                      const originalIndex = isRTL ? weekDates.length - 1 - index : index;
                      const isCurrentWeek = originalIndex === weekDatesOriginal.length - 1;
                      const showCreateIssue = isCurrentWeek && score && !goalMet;
                      
                      // Debug current week detection
                      if (metric === metrics[0]) {
                        console.log('Scorecard week debug:', {
                          metricName: metric.name,
                          weekDate,
                          index,
                          originalIndex,
                          isCurrentWeek,
                          isRTL,
                          weekDatesLength: weekDates.length,
                          score,
                          goalMet,
                          showCreateIssue,
                          lastWeekIndex: weekDatesOriginal.length - 1
                        });
                      }
                      
                      return (
                        <td key={weekDate} className="p-2 text-center group relative">
                          {score !== undefined && score !== null && score !== '' ? (
                            <div className="relative inline-block">
                              <span className={`inline-block px-2 py-1 rounded text-sm ${
                                goalMet 
                                  ? 'bg-green-100 text-green-800' 
                                  : showCreateIssue 
                                    ? 'bg-red-100 text-red-800 cursor-pointer hover:bg-red-200 transition-colors border-2 border-transparent hover:border-red-300' 
                                    : 'bg-red-100 text-red-800'
                              }`}>
                                {formatValue(score, metric.value_type)}
                                {showCreateIssue && (
                                  <Plus className="inline-block h-3 w-3 ml-1 opacity-50" />
                                )}
                              </span>
                              {showCreateIssue && (
                                <button
                                  className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 h-8 px-2 bg-red-600 hover:bg-red-700 text-white text-xs flex items-center gap-1 shadow-lg rounded transform hover:scale-105"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCreateIssue(metric, score);
                                  }}
                                  disabled={creatingIssue[metric.id]}
                                  title="Create issue for off-track metric"
                                >
                                  {creatingIssue[metric.id] ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Plus className="h-3 w-3" />
                                      <span className="font-semibold">Issue</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      );
                    })}
                    
                    {/* Total and Average columns for LTR */}
                    {!isRTL && (
                      <>
                        {/* Average column */}
                        <td className="p-4 text-center bg-gray-50 font-semibold text-sm">
                          {(() => {
                            // Always use original order for calculations
                            const scores = weekDatesOriginal
                              .map(weekDate => weeklyScores[metric.id]?.[weekDate])
                              .filter(score => score !== undefined && score !== null && score !== '');
                            
                            if (scores.length === 0) return '-';
                            
                            const average = scores.reduce((sum, score) => sum + parseFloat(score), 0) / scores.length;
                            const roundedAverage = Math.ceil(average);
                            const avgGoalMet = isGoalMet(roundedAverage, metric.goal, metric.comparison_operator);
                            
                            return (
                              <span className={`px-2 py-1 rounded ${
                                avgGoalMet ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {formatValue(roundedAverage, metric.value_type)}
                              </span>
                            );
                          })()}
                        </td>
                        {/* Total column */}
                        {showTotal && (
                          <td className="p-2 text-center bg-gray-50 font-semibold text-sm">
                          {(() => {
                            // Always use original order for calculations
                            const scores = weekDatesOriginal
                              .map(weekDate => weeklyScores[metric.id]?.[weekDate])
                              .filter(score => score !== undefined && score !== null && score !== '');
                            
                            if (scores.length === 0) return '-';
                            
                            const total = scores.reduce((sum, score) => sum + parseFloat(score), 0);
                            
                            return (
                              <span className="text-gray-700">
                                {formatValue(total, metric.value_type)}
                              </span>
                            );
                          })()}
                          </td>
                        )}
                      </>
                    )}
                    {/* Actions column - only show when not readOnly */}
                    {!readOnly && (
                      <td className="p-2 text-center">
                        <Button 
                          size="sm"
                          variant="ghost"
                          onClick={() => console.log('Edit metric', metric.id)}
                        >
                          Edit
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
    
    {/* Metric Trend Chart Modal */}
    <MetricTrendChart
      isOpen={chartModal.isOpen}
      onClose={() => setChartModal({ isOpen: false, metric: null, metricId: null })}
      metric={chartModal.metric}
      metricId={chartModal.metricId}
      orgId={user?.organizationId}
      teamId={user?.teamId || '00000000-0000-0000-0000-000000000000'}
    />
  </>
  );
};

export default ScorecardTable;