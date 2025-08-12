import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Edit,
  BarChart3,
  GripVertical,
  Trash2,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { organizationService } from '../../services/organizationService';
import { getOrgTheme, saveOrgTheme } from '../../utils/themeUtils';

const ScorecardTableClean = ({ 
  metrics = [], 
  weeklyScores = {}, 
  monthlyScores = {},
  type = 'weekly', // 'weekly' or 'monthly'
  readOnly = false,
  isRTL = false,
  showTotal = true,
  showAverage = true, // New prop to control average column
  departmentId,
  onIssueCreated,
  onScoreEdit,
  onChartOpen,
  onMetricUpdate,
  onMetricDelete,
  onAddIssue, // New prop for adding metric issues
  noWrapper = false, // Add prop to disable Card wrapper
  maxPeriods = 10, // Control how many weeks/months to show
  meetingMode = false // New prop for meeting display mode
}) => {
  const { user } = useAuthStore();
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });

  useEffect(() => {
    fetchOrganizationTheme();
    
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    const handleOrgChange = () => {
      fetchOrganizationTheme();
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    window.addEventListener('organizationChanged', handleOrgChange);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
      window.removeEventListener('organizationChanged', handleOrgChange);
    };
  }, [user?.organizationId, user?.organization_id]);

  const fetchOrganizationTheme = async () => {
    try {
      const orgId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
      const orgData = await organizationService.getOrganization();
      
      if (orgData) {
        const theme = {
          primary: orgData.theme_primary_color || '#3B82F6',
          secondary: orgData.theme_secondary_color || '#1E40AF',
          accent: orgData.theme_accent_color || '#60A5FA'
        };
        setThemeColors(theme);
        saveOrgTheme(orgId, theme);
      } else {
        const savedTheme = getOrgTheme(orgId);
        if (savedTheme) {
          setThemeColors(savedTheme);
        }
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
      const orgId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
      const savedTheme = getOrgTheme(orgId);
      if (savedTheme) {
        setThemeColors(savedTheme);
      }
    }
  };
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

  // Get week labels for the past N weeks
  const getWeekLabels = () => {
    const labels = [];
    const weekDates = [];
    const today = new Date();
    const weeksToShow = Math.min(maxPeriods, 10); // Cap at 10 weeks max
    
    for (let i = weeksToShow - 1; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (i * 7));
      const mondayOfWeek = getWeekStartDate(weekStart);
      
      labels.push(formatWeekLabel(mondayOfWeek));
      weekDates.push(mondayOfWeek.toISOString().split('T')[0]);
    }
    
    return { labels, weekDates };
  };

  // Get month labels for the past N months
  const getMonthLabels = () => {
    const labels = [];
    const monthDates = [];
    const today = new Date();
    const monthsToShow = Math.min(maxPeriods, 12); // Cap at 12 months max
    
    for (let i = monthsToShow - 1; i >= 0; i--) {
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
    if (value === null || value === undefined || value === '') return '-';
    
    // Additional debug for currency values showing as $NaN
    if (valueType === 'currency' && (typeof value === 'object' || typeof value === 'string')) {
      console.error('formatValue: Currency formatting issue', { 
        value, 
        valueType, 
        typeOfValue: typeof value,
        stringified: JSON.stringify(value)
      });
    }
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      console.error('formatValue: NaN detected', { 
        value, 
        valueType, 
        typeOfValue: typeof value,
        stringified: JSON.stringify(value)
      });
      return '-';
    }
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
      case 'greater':
        return `> ${formattedValue}`;
      case 'greater_equal':
        return `≥ ${formattedValue}`;
      case 'less':
        return `< ${formattedValue}`;  
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
      case 'greater':
        return scoreVal > goalVal;
      case 'greater_equal':
        return scoreVal >= goalVal;
      case 'less':
        return scoreVal < goalVal;
      case 'less_equal':
        return scoreVal <= goalVal;
      case 'equal':
        return scoreVal === goalVal;
      default:
        return scoreVal >= goalVal;
    }
  };

  const tableContent = (
    <div className={noWrapper ? "w-full" : "overflow-x-auto"}>
      <table className="w-full">
            <thead className={meetingMode ? "bg-gray-50" : "bg-white border-b border-gray-200"}>
              <tr>
                {!meetingMode && <th className="w-4"></th>}
                <th className={'text-left font-medium text-gray-700 ' + (meetingMode ? 'px-3 py-2 text-sm' : 'px-1 text-[10px]')}>
                  {meetingMode ? 'Metric / Owner' : 'Owner'}
                </th>
                {!meetingMode && <th className="text-left px-1 text-xs font-medium text-gray-700">Metric</th>}
                <th className={meetingMode ? "w-8" : "w-6"}></th>
                <th className={'text-center font-medium text-gray-600 ' + (meetingMode ? 'px-2 py-2 text-sm' : 'px-1 text-[10px]')}>Goal</th>
                
                {showAverage ? (
                  <th className={'text-center font-medium text-gray-700 ' + (meetingMode ? 'px-2 py-2 text-sm bg-gray-100' : 'px-1 text-[10px] border-l border-gray-200')}>
                    13w Avg
                  </th>
                ) : null}
                
                {/* Week columns */}
                {periodLabels.map((label, index) => {
                  const originalIndex = isRTL ? periodLabelsOriginal.length - 1 - index : index;
                  const isCurrentPeriod = originalIndex === periodLabelsOriginal.length - 1;
                  return (
                    <th key={periodDates[index]} className={'text-center ' + (meetingMode ? 'px-2 py-2' : 'px-1') + ' ' + 
                      (isCurrentPeriod ? (meetingMode ? 'bg-blue-50 font-semibold' : 'bg-gray-50 border-2 border-gray-300') : '')
                    }>
                      <div className="flex flex-col items-center">
                        <span className={'font-medium text-gray-600 ' + (meetingMode ? 'text-xs' : 'text-[10px]')}>{label}</span>
                      </div>
                    </th>
                  );
                })}
                {showTotal && (
                  <th className={'text-center font-semibold text-gray-700 ' + (meetingMode ? 'px-2 py-2 text-sm bg-gray-100' : 'p-1 text-xs border-l border-gray-200')}>
                    Total
                  </th>
                )}
                {!meetingMode && <th className="text-center p-1 font-semibold text-gray-700 text-xs">Actions</th>}
                {meetingMode && onAddIssue && <th className="text-center px-2 py-2 text-sm font-medium text-gray-700">Action</th>}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric, metricIndex) => {
                // Calculate average based on last 13 weeks of data
                const getLast13WeeksScores = () => {
                  const thirteenWeekDates = [];
                  const today = new Date();
                  
                  // Generate dates for the last 13 weeks
                  for (let i = 12; i >= 0; i--) {
                    const weekStart = new Date(today);
                    weekStart.setDate(today.getDate() - (i * 7));
                    const mondayOfWeek = getWeekStartDate(weekStart);
                    thirteenWeekDates.push(mondayOfWeek.toISOString().split('T')[0]);
                  }
                  
                  return thirteenWeekDates
                    .map(date => {
                      const scoreData = scores[metric.id]?.[date];
                      return (typeof scoreData === 'object' && scoreData !== null) ? scoreData?.value : scoreData;
                    })
                    .filter(score => score !== undefined && score !== null && score !== '');
                };
                
                const averageScores = type === 'weekly' ? getLast13WeeksScores() : 
                  // For monthly, use visible periods for average
                  periodDates
                    .map(periodDate => {
                      const scoreData = scores[metric.id]?.[periodDate];
                      return (typeof scoreData === 'object' && scoreData !== null) ? scoreData?.value : scoreData;
                    })
                    .filter(score => score !== undefined && score !== null && score !== '');
                
                const average = averageScores.length > 0 
                  ? averageScores.reduce((sum, score) => sum + parseFloat(score), 0) / averageScores.length 
                  : null;
                
                // For total, still use only visible periods
                const visibleScores = periodDates
                  .map(periodDate => {
                    const scoreData = scores[metric.id]?.[periodDate];
                    return (typeof scoreData === 'object' && scoreData !== null) ? scoreData?.value : scoreData;
                  })
                  .filter(score => score !== undefined && score !== null && score !== '');
                const total = visibleScores.length > 0
                  ? visibleScores.reduce((sum, score) => sum + parseFloat(score), 0)
                  : null;
                const avgGoalMet = average !== null && isGoalMet(average, metric.goal, metric.comparison_operator);
                
                return (
                  <tr key={metric.id} className={'border-b ' + (meetingMode ? 'hover:bg-blue-50/30' : 'hover:bg-gray-50')}>
                    {!meetingMode && (
                      <td className="w-4">
                        <GripVertical className="h-3 w-3 text-gray-400 cursor-move mx-auto" />
                      </td>
                    )}
                    <td className={meetingMode ? 'px-3 py-2' : 'text-center px-1 text-[10px]'}>
                      {meetingMode ? (
                        <div className="text-left">
                          <div className="text-sm font-medium text-gray-900">{metric.name}</div>
                          <div className="text-xs text-gray-500">{metric.ownerName || metric.owner || 'Unassigned'}</div>
                        </div>
                      ) : (
                        metric.ownerName || metric.owner || '-'
                      )}
                    </td>
                    {!meetingMode && <td className="text-left px-1 text-xs font-medium">{metric.name}</td>}
                    <td className={meetingMode ? "w-8" : "w-6"}>
                      <Button
                        onClick={() => onChartOpen && onChartOpen(metric)}
                        size="sm"
                        variant="ghost"
                        className={meetingMode ? "h-6 w-6 p-0 hover:bg-gray-100" : "h-5 w-5 p-0 hover:bg-gray-100"}
                      >
                        <BarChart3 className={meetingMode ? "h-4 w-4" : "h-3 w-3"} style={{ color: themeColors.primary }} />
                      </Button>
                    </td>
                    <td className={'text-center font-medium text-gray-700 ' + (meetingMode ? 'px-2 py-2 text-sm' : 'px-1 text-[10px]')}>
                      {formatGoal(metric.goal, metric.value_type, metric.comparison_operator)}
                    </td>
                    
                    {/* Average column */}
                    {showAverage ? (
                      <td className={'text-center ' + (meetingMode ? 'px-2 py-2 bg-gray-50' : 'px-1 bg-white border-l border-gray-200')}>
                        {average !== null ? (
                          meetingMode ? (
                            <div className={'inline-block px-2 py-0.5 rounded-full text-xs font-medium ' + 
                              (avgGoalMet ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
                            }>
                              {metric.value_type === 'number' ? Math.round(average) : formatValue(average, metric.value_type)}
                            </div>
                          ) : (
                            <span className={'text-[10px] px-0.5 rounded ' + 
                              (avgGoalMet ? 'text-green-700' : 'text-red-700')
                            }>
                              {metric.value_type === 'number' ? Math.round(average) : formatValue(average, metric.value_type)}
                            </span>
                          )
                        ) : (
                          <span className={'text-gray-400 ' + (meetingMode ? 'text-xs' : 'text-[10px]')}>-</span>
                        )}
                      </td>
                    ) : null}
                    
                    {/* Period columns */}
                    {periodDates.map((periodDate, index) => {
                      const scoreData = scores[metric.id]?.[periodDate];
                      // Handle both old format (just value) and new format (object with value and notes)
                      const scoreValue = (typeof scoreData === 'object' && scoreData !== null) ? scoreData?.value : scoreData;
                      const hasNotes = (typeof scoreData === 'object' && scoreData !== null) && scoreData?.notes && scoreData.notes.length > 0;
                      
                      // Debug logging for problematic scores
                      if (scoreData && typeof scoreData === 'object' && scoreData !== null && scoreData.notes) {
                        console.log('Processing score with notes:', {
                          metricId: metric.id,
                          metricName: metric.name,
                          date: periodDate,
                          rawScoreData: scoreData,
                          extractedValue: scoreValue,
                          extractedValueType: typeof scoreValue,
                          hasNotes,
                          willFormat: metric.value_type
                        });
                      }
                      const goalMet = scoreValue !== null && scoreValue !== undefined && isGoalMet(scoreValue, metric.goal, metric.comparison_operator);
                      const originalIndex = isRTL ? periodLabelsOriginal.length - 1 - index : index;
                      const isCurrentPeriod = originalIndex === periodLabelsOriginal.length - 1;
                      
                      let cellClassName = 'text-center ';
                      if (meetingMode) {
                        cellClassName += 'px-2 py-2';
                        if (isCurrentPeriod) cellClassName += ' bg-blue-50';
                      } else {
                        cellClassName += 'px-1';
                        if (isCurrentPeriod) cellClassName += ' bg-gray-50 border-2 border-gray-300';
                      }
                      
                      return (
                        <td key={periodDate} className={cellClassName}>
                          {meetingMode ? (
                            <div className={'inline-block px-2 py-0.5 rounded-full text-xs font-medium relative ' + 
                              (scoreValue !== null && scoreValue !== undefined ? (goalMet ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800') : 'text-gray-400')
                            }>
                              {scoreValue !== null && scoreValue !== undefined ? formatValue(scoreValue, metric.value_type) : '-'}
                              {hasNotes && (
                                <MessageSquare className="inline-block ml-1 h-3 w-3 opacity-70" />
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => onScoreEdit && onScoreEdit(metric, periodDate)}
                              className={'w-full px-0.5 py-0.5 rounded text-[10px] font-medium transition-colors relative ' +
                                (scoreValue !== null && scoreValue !== undefined ? (goalMet ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200') : (isCurrentPeriod ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'))
                              }
                              title={hasNotes ? `Score: ${scoreValue}\nNotes: ${scoreData.notes}` : ''}
                            >
                              <span>{scoreValue !== null && scoreValue !== undefined ? formatValue(scoreValue, metric.value_type) : '-'}</span>
                              {hasNotes && (
                                <MessageSquare className="inline-block ml-0.5 h-2.5 w-2.5 opacity-60" />
                              )}
                            </button>
                          )}
                        </td>
                      );
                    })}
                    
                    {showTotal && (
                      <td className={'text-center font-medium ' + (meetingMode ? 'px-2 py-2 bg-gray-50' : 'px-1 text-[10px] border-l border-gray-200')}>
                        {(() => {
                          const totalValue = Object.values(scores[metric.id] || {}).reduce((sum, scoreData) => {
                            const val = (typeof scoreData === 'object' && scoreData !== null) ? scoreData?.value : scoreData;
                            return sum + (parseFloat(val) || 0);
                          }, 0);
                          const formattedTotal = totalValue !== 0 ? formatValue(totalValue, metric.value_type) : '-';
                          
                          return meetingMode ? (
                            <div className="text-sm font-semibold text-gray-700">
                              {formattedTotal}
                            </div>
                          ) : (
                            formattedTotal
                          );
                        })()}
                      </td>
                    )}
                    {!meetingMode && (
                      <td className="px-1 text-center">
                        <div className="flex justify-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => onMetricUpdate && onMetricUpdate(metric)}
                          >
                            <Edit className="h-3 w-3" style={{ color: themeColors.primary }} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => onMetricDelete && onMetricDelete(metric.id)}
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    )}
                    {meetingMode && onAddIssue && (
                      <td className="px-2 py-2 text-center">
                        <Button
                          onClick={() => {
                            const isOffTrack = average !== null && !isGoalMet(average, metric.goal, metric.comparison_operator);
                            onAddIssue(metric, isOffTrack);
                          }}
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                        >
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Add Issue
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
  );

  if (noWrapper) {
    return tableContent;
  }

  return (
    <Card className="transition-all bg-white border border-gray-200">
      <CardHeader className="bg-white border-b border-gray-200">
        <CardTitle className="text-lg">All Metrics</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {tableContent}
      </CardContent>
    </Card>
  );
};

export default ScorecardTableClean;