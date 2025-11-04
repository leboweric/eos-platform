import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Edit,
  Edit2,
  BarChart3,
  GripVertical,
  Archive,
  AlertCircle,
  MessageSquare,
  Share2
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { organizationService } from '../../services/organizationService';
import { getOrgTheme, saveOrgTheme } from '../../utils/themeUtils';
import { getDateRange, calculateAverageInRange } from '../../utils/scorecardDateUtils';

const ScorecardTableClean = ({ 
  metrics = [], 
  weeklyScores = {}, 
  monthlyScores = {},
  weeklyNotes = {}, // New prop for notes
  monthlyNotes = {}, // New prop for notes
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
  onMetricShare, // New prop for sharing metrics
  onAddIssue, // New prop for adding metric issues
  noWrapper = false, // Add prop to disable Card wrapper
  maxPeriods = 10, // Control how many weeks/months to show
  meetingMode = false, // New prop for meeting display mode
  scorecardTimePeriodPreference = '13_week_rolling', // Organization's time period preference
  showHistoricalData = true // Show historical imported data (default true)
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
  // Business Logic: Weeks run Monday-Sunday (Monday = week start)
  // This ensures consistent week boundaries for scorecard grouping
  const getWeekStartDate = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  // Format date as "MMM D - MMM D" (week range) to match Ninety.io
  const formatWeekLabel = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const weekStart = new Date(date);
    const weekEnd = new Date(date);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday to Saturday
    
    const startMonth = months[weekStart.getMonth()];
    const startDay = weekStart.getDate();
    const endMonth = months[weekEnd.getMonth()];
    const endDay = weekEnd.getDate();
    
    // If same month, show "Oct 20 - 26", otherwise "Oct 27 - Nov 2"
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
    }
  };

  // Get the start of the current quarter
  const getQuarterStart = (date) => {
    const d = new Date(date);
    const quarter = Math.floor(d.getMonth() / 3);
    return new Date(d.getFullYear(), quarter * 3, 1);
  };

  // Get the end of the current quarter
  const getQuarterEnd = (date) => {
    const d = new Date(date);
    const quarter = Math.floor(d.getMonth() / 3);
    return new Date(d.getFullYear(), quarter * 3 + 3, 0);
  };

  // Get week labels for the past N weeks or current quarter
  const getWeekLabels = () => {
    const labels = [];
    const weekDates = [];
    const today = new Date();
    
    // Check if we should show current quarter (for non-meeting mode or when showQuarterToDate is true)
    const showQuarterToDate = !meetingMode; // Show QTD in normal scorecard view
    
    // 🚨 DEBUG: Check what dates actually exist in the scores data
    const allScoreDates = new Set();
    if (weeklyScores) {
      Object.values(weeklyScores).forEach(metricScores => {
        if (metricScores) {
          Object.keys(metricScores).forEach(date => {
            allScoreDates.add(date);
          });
        }
      });
    }
    const sortedDates = Array.from(allScoreDates).sort();
    
    if (sortedDates.length > 0) {
      console.log('📊 SCORECARD DEBUG: Found score dates in data:', {
        earliestDate: sortedDates[0],
        latestDate: sortedDates[sortedDates.length - 1],
        totalUniqueDates: sortedDates.length,
        sampleDates: sortedDates.slice(0, 5),
        todayDate: today.toISOString().split('T')[0]
      });
    }
    
    if (showQuarterToDate) {
      // Get current quarter start and today
      const quarterStart = getQuarterStart(today);
      const quarterEnd = getQuarterEnd(today);
      const endDate = today < quarterEnd ? today : quarterEnd;
      
      // Check if we have historical data that predates current quarter
      let effectiveStartDate = quarterStart;
      if (showHistoricalData && sortedDates.length > 0) {
        const earliestDataDate = new Date(sortedDates[0] + 'T12:00:00');
        if (earliestDataDate < quarterStart) {
          console.log('⚠️ SCORECARD: Historical data found before current quarter!', {
            currentQuarterStart: quarterStart.toISOString().split('T')[0],
            earliestData: sortedDates[0],
            action: 'Using earliest data date as start',
            showHistoricalData
          });
          effectiveStartDate = earliestDataDate;
        }
      }
      
      console.log('Quarter calculation:', {
        today: today.toISOString().split('T')[0],
        quarter: Math.floor(today.getMonth() / 3) + 1,
        quarterStart: quarterStart.toISOString().split('T')[0],
        quarterEnd: quarterEnd.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        effectiveStartDate: effectiveStartDate.toISOString().split('T')[0],
        hasHistoricalData: effectiveStartDate < quarterStart
      });
      
      // Generate all weeks from effective start date to current date
      let currentWeek = getWeekStartDate(effectiveStartDate);
      while (currentWeek <= endDate) {
        labels.push(formatWeekLabel(currentWeek));
        weekDates.push(currentWeek.toISOString().split('T')[0]);
        
        // Move to next week
        currentWeek = new Date(currentWeek);
        currentWeek.setDate(currentWeek.getDate() + 7);
      }
      
      // For historical data view, we may have many weeks - limit to reasonable amount
      // Show most recent 26 weeks (half year) if we have more than that
      if (weekDates.length > 26) {
        console.warn(`Too many weeks (${weekDates.length}), trimming to most recent 26`);
        const trimCount = weekDates.length - 26;
        labels.splice(0, trimCount);
        weekDates.splice(0, trimCount);
      }
      
      console.log(`📊 SCORECARD: Showing ${weekDates.length} weeks from ${weekDates[0]} to ${weekDates[weekDates.length-1]}`);
    } else {
      // Meeting mode - Use actual dates from the data instead of generating them
      const weeksToShow = Math.min(maxPeriods, 10);
      
      // Get dates from the first metric that has data
      const firstMetricWithData = metrics?.find(m => weeklyScores?.[m.id] && Object.keys(weeklyScores[m.id]).length > 0);
      
      if (firstMetricWithData && weeklyScores[firstMetricWithData.id]) {
        // ✅ FIX: Group actual dates by week start, don't use individual dates
        // Business Rule: Weeks run Monday-Sunday, so Oct 20 (Sun) and Oct 21 (Mon) 
        // should be grouped into the same week column for proper display
        const allDates = Object.keys(weeklyScores[firstMetricWithData.id]).sort();
        
        // Group dates by their week start (Monday)
        const weekGroups = new Map();
        allDates.forEach(dateStr => {
          const date = new Date(dateStr + 'T12:00:00');
          const weekStart = getWeekStartDate(date);
          const weekStartStr = weekStart.toISOString().split('T')[0];
          
          if (!weekGroups.has(weekStartStr)) {
            weekGroups.set(weekStartStr, []);
          }
          weekGroups.get(weekStartStr).push(dateStr);
        });
        
        // Get the most recent weeks (by week start date)
        const uniqueWeekStarts = Array.from(weekGroups.keys()).sort();
        
        // ✅ FIX: Exclude current week (incomplete) to match Ninety.io behavior
        // Only show completed weeks - shift back by 1 week
        const currentWeekStart = getWeekStartDate(today).toISOString().split('T')[0];
        const completedWeeks = uniqueWeekStarts.filter(weekStart => weekStart < currentWeekStart);
        
        // Take the most recent N completed weeks
        const weeksToDisplay = completedWeeks.slice(-weeksToShow);
        
        console.log('📅 Week display logic:', {
          currentWeekStart,
          totalWeeksInData: uniqueWeekStarts.length,
          completedWeeks: completedWeeks.length,
          weeksToShow,
          weeksDisplayed: weeksToDisplay.length,
          behavior: 'Excluding current incomplete week to match Ninety.io'
        });
        
        weeksToDisplay.forEach(weekStartStr => {
          const weekStartDate = new Date(weekStartStr + 'T12:00:00');
          labels.push(formatWeekLabel(weekStartDate));
          weekDates.push(weekStartStr);
        });
        
        console.log('✅ Meeting mode - Week grouping fix applied:', {
          originalDates: allDates,
          weekGroups: Array.from(weekGroups.entries()),
          finalWeekStarts: weekDates,
          issueFixed: 'Oct 20 and Oct 21 should now be grouped into same week'
        });
      } else {
        // Fallback to generated dates if no data
        // ✅ FIX: Start from last week (not current week) to match Ninety.io
        for (let i = weeksToShow; i >= 1; i--) {
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - (i * 7));
          const mondayOfWeek = getWeekStartDate(weekStart);
          
          labels.push(formatWeekLabel(mondayOfWeek));
          weekDates.push(mondayOfWeek.toISOString().split('T')[0]);
        }
        console.log('Meeting mode - No data found, using generated dates (excluding current week):', weekDates);
      }
    }
    
    // Final debug output
    console.log('📊 SCORECARD: Final week configuration:', {
      mode: meetingMode ? 'meeting' : 'scorecard',
      weekCount: weekDates.length,
      dateRange: weekDates.length > 0 ? `${weekDates[0]} to ${weekDates[weekDates.length-1]}` : 'no dates',
      hasScores: sortedDates.length > 0,
      scoreCount: sortedDates.length
    });
    
    if (meetingMode) {
      console.log('WeeklyMeeting - Generated week dates:', weekDates);
      console.log('WeeklyMeeting - Available scores for metrics:', Object.keys(weeklyScores || {}));
      // Log sample scores for first metric if available
      const firstMetricId = metrics?.[0]?.id;
      if (firstMetricId && weeklyScores?.[firstMetricId]) {
        console.log('WeeklyMeeting - Sample scores for first metric:', firstMetricId, weeklyScores[firstMetricId]);
      }
    }
    
    return { labels, weekDates };
  };

  // Get month labels for the past N months or current quarter
  const getMonthLabels = () => {
    const labels = [];
    const monthDates = [];
    const today = new Date();
    
    // Check if we should show current quarter (for non-meeting mode)
    const showQuarterToDate = !meetingMode; // Show QTD in normal scorecard view
    
    if (showQuarterToDate) {
      // Get current quarter start and today
      const quarterStart = getQuarterStart(today);
      const quarterEnd = getQuarterEnd(today);
      
      // Generate all months in the current quarter up to current month
      let currentMonth = new Date(quarterStart);
      while (currentMonth <= today && currentMonth <= quarterEnd) {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const monthLabel = date.toLocaleString('default', { month: 'short' }).toUpperCase();
        const yearLabel = date.getFullYear().toString().slice(-2);
        labels.push(`${monthLabel} ${yearLabel}`);
        monthDates.push(date.toISOString().split('T')[0]);
        
        // Move to next month
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
      
      console.log(`Showing Q${Math.floor(today.getMonth() / 3) + 1} months:`, monthDates);
    } else {
      // Meeting mode or fallback - show last N months as before
      const monthsToShow = Math.min(maxPeriods, 12);
      
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthLabel = date.toLocaleString('default', { month: 'short' }).toUpperCase();
        const yearLabel = date.getFullYear().toString().slice(-2);
        labels.push(`${monthLabel} ${yearLabel}`);
        monthDates.push(date.toISOString().split('T')[0]);
      }
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
  const notes = isWeekly ? weeklyNotes : monthlyNotes;
  
  // Debug: Check if notes are being passed
  console.log('ScorecardTableClean - Notes prop received:', { 
    weeklyNotes: Object.keys(weeklyNotes || {}).length,
    monthlyNotes: Object.keys(monthlyNotes || {}).length,
    currentNotes: notes 
  });

  // Helper functions for value formatting and goal achievement
  const formatValue = (value, valueType) => {
    // Debug log for zero values
    if (value === 0 || value === "0") {
      console.log('formatValue called with zero - value:', value, 'type:', typeof value, 'valueType:', valueType);
    }
    
    // Check for null, undefined, or empty string - but allow 0
    if (value === null || value === undefined || value === '') return '-';
    
    // Make absolutely sure we have a number
    const numValue = typeof value === 'number' ? value : parseFloat(value);
    
    // Only return '-' if it's truly not a number (but 0 is a valid number)
    if (isNaN(numValue)) return '-';
    
    const result = (() => {
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
    })();
    
    // Debug log the result for zero values
    if (value === 0 || value === "0") {
      console.log('formatValue returning for zero:', result);
    }
    
    return result;
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
                    {(() => {
                      const { label } = getDateRange(scorecardTimePeriodPreference);
                      const finalLabel = label.replace(' Average', '').replace('13-Week', '13w').replace('4-Week', '4w');
                      
                      // Debug logging for scorecard label (both meeting and main scorecard)
                      console.log('🔍 ScorecardTableClean - Label calculation:', {
                        preference: scorecardTimePeriodPreference,
                        originalLabel: label,
                        finalLabel: finalLabel,
                        meetingMode: meetingMode,
                        context: meetingMode ? 'MEETING' : 'MAIN'
                      });
                      
                      return finalLabel;
                    })()}
                  </th>
                ) : null}
                
                {/* Week columns */}
                {periodLabels.map((label, index) => {
                  const originalIndex = isRTL ? periodLabelsOriginal.length - 1 - index : index;
                  const isLastWeekColumn = originalIndex === periodLabelsOriginal.length - 1;
                  
                  return (
                    <th key={periodDates[index]} className={
                      `text-center ${meetingMode ? "px-2 py-2" : "px-1"} ` +
                      (isLastWeekColumn ? (meetingMode ? "bg-amber-50 font-semibold" : "bg-amber-50 border-2 border-amber-300") : "")
                    }>
                      <div className="flex flex-col items-center gap-0.5">
                        {isLastWeekColumn && (
                          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Last Week</span>
                        )}
                        <span className={`font-medium text-gray-600 ${meetingMode ? "text-xs" : "text-[10px]"}`}>
                          {label}
                        </span>
                        {isLastWeekColumn && (
                          <Edit2 className="h-3 w-3 text-amber-600" />
                        )}
                      </div>
                    </th>
                  );
                })}
                {showTotal && (
                  <th className={'text-center font-semibold text-gray-700 ' + (meetingMode ? 'px-2 py-2 text-sm bg-gray-100' : 'p-1 text-xs border-l border-gray-200')}>
                    Total
                  </th>
                )}
                {!meetingMode && <th className="text-center px-4 py-2 font-semibold text-gray-700 text-xs min-w-[140px]">Actions</th>}
                {meetingMode && onAddIssue && <th className="text-center px-2 py-2 text-sm font-medium text-gray-700">Action</th>}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric, metricIndex) => {
                // Calculate average based on organization's time period preference
                const average = (() => {
                  const { startDate, endDate } = getDateRange(scorecardTimePeriodPreference);
                  const metricScores = scores[metric.id] || {};
                  return calculateAverageInRange(metricScores, startDate, endDate);
                })();
                
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
                      // ✅ FIX: For meeting mode, aggregate scores within the week
                      let scoreValue;
                      if (meetingMode && scores[metric.id]) {
                        // Find all scores within this week and aggregate them
                        const weekStartDate = new Date(periodDate + 'T12:00:00');
                        const weekEndDate = new Date(weekStartDate);
                        weekEndDate.setDate(weekEndDate.getDate() + 6); // End of week (6 days later)
                        
                        const weekScores = [];
                        Object.entries(scores[metric.id]).forEach(([dateStr, score]) => {
                          const scoreDate = new Date(dateStr + 'T12:00:00');
                          if (scoreDate >= weekStartDate && scoreDate <= weekEndDate) {
                            // Extract numeric value from score (handle both object and primitive values)
                            const scoreVal = (typeof score === 'object' && score !== null) ? score?.value : score;
                            if (scoreVal !== undefined && scoreVal !== null && scoreVal !== '') {
                              weekScores.push({
                                date: dateStr,
                                value: scoreVal,
                                rawScore: score
                              });
                            }
                          }
                        });
                        
                        // Use the most recent score in the week (sorted by date)
                        if (weekScores.length > 0) {
                          weekScores.sort((a, b) => a.date.localeCompare(b.date));
                          scoreValue = weekScores[weekScores.length - 1].rawScore; // Most recent score with original format
                          
                          // Debug: Log week aggregation for verification
                          if (weekScores.length > 1 && metrics.indexOf(metric) === 0) {
                            console.log(`✅ Week aggregation working for week ${periodDate}:`, {
                              weekStart: weekStartDate.toISOString().split('T')[0],
                              weekEnd: weekEndDate.toISOString().split('T')[0],
                              allScoresInWeek: weekScores.map(s => ({ date: s.date, value: s.value })),
                              selectedScore: scoreValue,
                              fixApplied: 'Multiple dates in same week now show as single column'
                            });
                          }
                        }
                      } else {
                        // Normal mode: exact date match
                        scoreValue = scores[metric.id]?.[periodDate];
                      }
                      
                      // DEBUG: Enhanced date matching diagnostics for Level 10 Meeting
                      if (metrics.indexOf(metric) === 0) {
                        console.log(`📊 LEVEL 10 DATE CHECK [${index}]:`, {
                          metricId: metric.id,
                          metricName: metric.name,
                          periodDate: periodDate,
                          scoreValue: scoreValue,
                          allScoreDates: scores[metric.id] ? Object.keys(scores[metric.id]) : [],
                          scoresForThisMetric: scores[metric.id],
                          readOnly: readOnly,
                          meetingMode: meetingMode
                        });
                      }
                      
                      // Debug logging for zero values
                      if (scores[metric.id] && periodDate in scores[metric.id]) {
                        const rawValue = scores[metric.id][periodDate];
                        if (rawValue === 0 || rawValue === "0") {
                          console.log('Zero check - Metric:', metric.id, 'Date:', periodDate, 'Raw value:', rawValue, 'Type:', typeof rawValue, 'scoreValue:', scoreValue, 'scoreValue type:', typeof scoreValue);
                        }
                      }
                      
                      // Notes are stored separately
                      const noteValue = notes[metric.id]?.[periodDate];
                      const hasNotes = noteValue && noteValue.length > 0;
                      
                      // Debug: Check if notes are being detected
                      if (noteValue && !hasNotes) {
                        console.log('Note exists but hasNotes is false:', { noteValue, length: noteValue.length });
                      }
                      
                      
                      const goalMet = scoreValue !== null && scoreValue !== undefined && isGoalMet(scoreValue, metric.goal, metric.comparison_operator);
                      const originalIndex = isRTL ? periodLabelsOriginal.length - 1 - index : index;
                      const isLastWeekColumn = originalIndex === periodLabelsOriginal.length - 1;
                      
                      let cellClassName = 'text-center ';
                      const isLastColumn = index === periodDates.length - 1;
                      if (meetingMode) {
                        cellClassName += isLastColumn ? 'px-2 pr-4 py-2' : 'px-2 py-2';
                        if (isLastWeekColumn) cellClassName += ' bg-amber-50';
                      } else {
                        cellClassName += isLastColumn ? 'px-1 pr-3' : 'px-1';
                        if (isLastWeekColumn) cellClassName += ' bg-amber-50 border-2 border-amber-300';
                      }
                      
                      return (
                        <td key={periodDate} className={cellClassName}>
                          {meetingMode ? (
                            <div 
                              className={'inline-block px-2 py-0.5 rounded-full text-xs font-medium relative ' + 
                                (scoreValue !== null && scoreValue !== undefined ? (goalMet ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800') : 'text-gray-400')
                              }
                            >
                              {scoreValue !== null && scoreValue !== undefined ? formatValue(scoreValue, metric.value_type) : '-'}
                              {hasNotes && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <MessageSquare className="inline-block ml-1 h-3 w-3 opacity-70 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs bg-slate-900 text-white border border-slate-700">
                                      <div className="text-sm">
                                        <div className="font-medium mb-1 text-slate-200">Comment:</div>
                                        <div className="text-white">{noteValue}</div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          ) : (
                            readOnly && !onScoreEdit ? (
                              // Read-only mode without edit capability - show tooltip for comments
                              <div 
                                className={'w-full px-0.5 py-0.5 rounded text-[10px] font-medium relative ' +
                                  (scoreValue !== null && scoreValue !== undefined ? (goalMet ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200') : (isLastWeekColumn ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-white border border-gray-200 text-gray-600'))
                                }
                              >
                                <span>{scoreValue !== null && scoreValue !== undefined ? formatValue(scoreValue, metric.value_type) : '-'}</span>
                                {hasNotes && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <MessageSquare className="inline-block ml-0.5 h-2.5 w-2.5 opacity-60 cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs bg-slate-900 text-white border border-slate-700">
                                        <div className="text-sm">
                                          <div className="font-medium mb-1 text-slate-200">Comment:</div>
                                          <div className="text-white">{noteValue}</div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            ) : (
                              // Normal edit mode - clickable button
                              <button
                                onClick={() => onScoreEdit && onScoreEdit(metric, periodDate)}
                                className={'w-full px-0.5 py-0.5 rounded text-[10px] font-medium transition-colors relative ' +
                                  (scoreValue !== null && scoreValue !== undefined ? (goalMet ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200') : (isLastWeekColumn ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'))
                                }
                                title={hasNotes ? `Score: ${scoreValue}\nNotes: ${noteValue}` : ''}
                              >
                                <span>{scoreValue !== null && scoreValue !== undefined ? formatValue(scoreValue, metric.value_type) : '-'}</span>
                                {hasNotes && (
                                  <MessageSquare className="inline-block ml-0.5 h-2.5 w-2.5 opacity-60" />
                                )}
                              </button>
                            )
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
                      <td className="px-4 py-2 text-center min-w-[140px]">
                        <div className="flex justify-center items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-1.5 hover:bg-blue-50 rounded-md transition-colors"
                            onClick={() => onMetricUpdate && onMetricUpdate(metric)}
                            title="Edit metric"
                          >
                            <Edit className="h-4 w-4 shrink-0" style={{ color: themeColors.primary }} />
                          </Button>
                          {onMetricShare && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-1.5 hover:bg-green-50 rounded-md transition-colors"
                              onClick={() => onMetricShare(metric)}
                              title={metric.is_shared ? "Shared metric" : "Share metric"}
                            >
                              <Share2 className="h-4 w-4 shrink-0" style={{ color: metric.is_shared ? themeColors.accent : themeColors.primary }} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-1.5 hover:bg-gray-50 rounded-md transition-colors"
                            onClick={() => onMetricDelete && onMetricDelete(metric.id)}
                            title="Archive metric"
                          >
                            <Archive className="h-4 w-4 shrink-0 text-gray-600" />
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