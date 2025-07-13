import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, AlertTriangle, Plus } from 'lucide-react';
import { useState } from 'react';
import { issuesService } from '../../services/issuesService';
import { useAuthStore } from '../../stores/authStore';

const ScorecardTable = ({ metrics, weeklyScores, readOnly = false, onIssueCreated }) => {
  const { user } = useAuthStore();
  const [creatingIssue, setCreatingIssue] = useState({});
  // Get the last 12 weeks
  const getWeekDates = () => {
    const weeks = [];
    const today = new Date();
    const currentWeek = new Date(today);
    currentWeek.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
    
    for (let i = 11; i >= 0; i--) {
      const week = new Date(currentWeek);
      week.setDate(currentWeek.getDate() - (i * 7));
      weeks.push(week.toISOString().split('T')[0]);
    }
    
    return weeks;
  };

  const weekDates = getWeekDates();
  const weekLabels = weekDates.map((date, index) => {
    const d = new Date(date);
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    return `${month} ${day}`;
  });

  // Format goal based on value type
  const formatGoal = (goal, valueType) => {
    if (!goal) return '-';
    switch (valueType) {
      case 'percentage':
        return `${goal}%`;
      case 'currency':
        return `$${parseFloat(goal).toLocaleString()}`;
      case 'decimal':
        return parseFloat(goal).toFixed(2);
      default:
        return goal;
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
        description: `Metric "${metric.name}" is off track. Current: ${formatValue(actualValue, metric.value_type)}, Goal: ${formatGoal(metric.goal, metric.value_type)}`,
        category: 'short-term',
        priority: 'high',
        assignedToId: metric.ownerId || user?.id
      };
      
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
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white">
        <CardTitle className="flex items-center text-xl">
          <Target className="mr-2 h-6 w-6" />
          Weekly Scorecard
        </CardTitle>
        <CardDescription className="text-indigo-100">
          Track performance over the past 12 weeks
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-700 min-w-[200px]">Metric</th>
                <th className="text-center p-4 font-semibold text-gray-700 min-w-[100px]">Goal</th>
                <th className="text-center p-4 font-semibold text-gray-700 min-w-[150px]">Owner</th>
                {weekLabels.map((label, index) => {
                  const isCurrentWeek = index === weekLabels.length - 1;
                  return (
                    <th key={weekDates[index]} className={`text-center p-4 font-semibold min-w-[80px] ${
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
                <th className="text-center p-4 font-semibold text-gray-700 min-w-[100px] bg-gray-100">Average</th>
                <th className="text-center p-4 font-semibold text-gray-700 min-w-[100px] bg-gray-100">Total</th>
              </tr>
            </thead>
            <tbody>
              {metrics.length === 0 ? (
                <tr>
                  <td colSpan={weekLabels.length + 5} className="text-center p-8 text-gray-500">
                    No metrics defined. {!readOnly && 'Click "Add Metric" to get started.'}
                  </td>
                </tr>
              ) : (
                metrics.map(metric => (
                  <tr key={metric.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{metric.name}</td>
                    <td className="p-4 text-center font-semibold text-indigo-600">
                      {formatGoal(metric.goal, metric.value_type)}
                    </td>
                    <td className="p-4 text-center">{metric.ownerName || metric.owner || '-'}</td>
                    {weekDates.map((weekDate, index) => {
                      const score = weeklyScores[metric.id]?.[weekDate];
                      const goalMet = score && isGoalMet(score, metric.goal, metric.comparison_operator);
                      const isCurrentWeek = index === weekDates.length - 1;
                      const showCreateIssue = !readOnly && isCurrentWeek && score && !goalMet;
                      
                      return (
                        <td key={weekDate} className="p-4 text-center">
                          {score !== undefined && score !== null && score !== '' ? (
                            <div className="inline-flex items-center gap-1">
                              <span className={`inline-block px-2 py-1 rounded ${
                                goalMet 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {formatValue(score, metric.value_type)}
                              </span>
                              {showCreateIssue && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 hover:bg-red-100"
                                  onClick={() => handleCreateIssue(metric, score)}
                                  disabled={creatingIssue[metric.id]}
                                  title="Create issue for off-track metric"
                                >
                                  {creatingIssue[metric.id] ? (
                                    <span className="animate-spin">⏳</span>
                                  ) : (
                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                  )}
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      );
                    })}
                    {/* Average column */}
                    <td className="p-4 text-center bg-gray-50 font-semibold">
                      {(() => {
                        const scores = weekDates
                          .map(weekDate => weeklyScores[metric.id]?.[weekDate])
                          .filter(score => score !== undefined && score !== null && score !== '');
                        
                        if (scores.length === 0) return '-';
                        
                        const average = scores.reduce((sum, score) => sum + parseFloat(score), 0) / scores.length;
                        const avgGoalMet = isGoalMet(average, metric.goal, metric.comparison_operator);
                        
                        return (
                          <span className={`px-2 py-1 rounded ${
                            avgGoalMet ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {formatValue(average, metric.value_type)}
                          </span>
                        );
                      })()}
                    </td>
                    {/* Total column */}
                    <td className="p-4 text-center bg-gray-50 font-semibold">
                      {(() => {
                        const scores = weekDates
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </CardContent>
    </Card>
  );
};

export default ScorecardTable;