import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { scorecardService } from '../services/scorecardService';
import { scorecardGroupsService } from '../services/scorecardGroupsService';
import { organizationService } from '../services/organizationService';
import { getOrgTheme, saveOrgTheme } from '../utils/themeUtils';
import { useDepartment } from '../contexts/DepartmentContext';
import { LEADERSHIP_TEAM_ID } from '../utils/teamUtils';
import { getDateRange, calculateAverageInRange } from '../utils/scorecardDateUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TeamMemberSelect from '../components/shared/TeamMemberSelect';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Edit,
  BarChart3,
  ChevronDown,
  MoreHorizontal,
  Share2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Calendar,
  Users,
  Filter
} from 'lucide-react';
import MetricTrendChart from '../components/scorecard/MetricTrendChart';
import GroupedScorecardView from '../components/scorecard/GroupedScorecardView';
import ScorecardTableClean from '../components/scorecard/ScorecardTableClean';
import ScorecardImport from '../components/scorecard/ScorecardImport';
import ShareMetricDialog from '../components/shared-metrics/ShareMetricDialog';
import SharedMetricsBrowser from '../components/shared-metrics/SharedMetricsBrowser';
import sharedMetricsService from '../services/sharedMetricsService';

const ScorecardPageClean = () => {
  const { user } = useAuthStore();
  const { selectedDepartment, isLeadershipMember, loading: departmentLoading } = useDepartment();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  const [scorecardTimePeriodPreference, setScorecardTimePeriodPreference] = useState('13_week_rolling');
  
  // Scorecard data
  const [metrics, setMetrics] = useState([]);
  const [weeklyScores, setWeeklyScores] = useState({});
  const [weeklyNotes, setWeeklyNotes] = useState({}); // Add notes state
  const [monthlyNotes, setMonthlyNotes] = useState({}); // Add notes state
  const [editingMetric, setEditingMetric] = useState(null);
  const [showMetricDialog, setShowMetricDialog] = useState(false);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [scoreDialogData, setScoreDialogData] = useState({ metricId: null, weekDate: '', metricName: '', currentValue: '', currentNotes: '' });
  const [scoreInputValue, setScoreInputValue] = useState('');
  const [scoreNotesValue, setScoreNotesValue] = useState('');
  const [users, setUsers] = useState([]);
  const [chartModal, setChartModal] = useState({ isOpen: false, metric: null, metricId: null });
  const [groups, setGroups] = useState([]);
  const [viewMode, setViewMode] = useState(() => {
    // Load view mode preference from localStorage
    const savedViewMode = localStorage.getItem('scorecardViewMode');
    return savedViewMode || 'groups'; // Default to groups view
  }); // 'table' or 'groups'
  const [showOptions, setShowOptions] = useState(false);
  const [isRTL, setIsRTL] = useState(() => {
    // Load RTL preference from localStorage
    const savedRTL = localStorage.getItem('scorecardRTL');
    return savedRTL === 'true';
  }); // Add RTL state
  
  // Shared metrics state
  const [shareMetricDialog, setShareMetricDialog] = useState(false);
  const [metricToShare, setMetricToShare] = useState(null);
  
  // Filter metrics by type
  const weeklyMetrics = metrics.filter(m => m.type === 'weekly');
  const monthlyMetrics = metrics.filter(m => m.type === 'monthly');
  const [activeTab, setActiveTab] = useState('weekly');
  const [monthlyScores, setMonthlyScores] = useState({});
  
  // Form data for new/edit metric
  const [metricForm, setMetricForm] = useState({
    name: '',
    description: '',
    goal: '',
    ownerId: '',
    ownerName: '',
    type: 'weekly',
    valueType: 'number',
    comparisonOperator: 'greater_equal',
    groupId: 'none'
  });

  useEffect(() => {
    if (user?.organizationId && (selectedDepartment || isLeadershipMember)) {
      fetchScorecard();
      fetchGroups();
    }
    fetchOrganizationTheme();
    
    // Listen for theme changes
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, [user?.organizationId, selectedDepartment, isLeadershipMember]);

  const fetchScorecard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const orgId = user?.organizationId || user?.organization_id;
      
      let teamId = selectedDepartment?.id;
      if (!teamId && isLeadershipMember) {
        teamId = LEADERSHIP_TEAM_ID;
      }
      
      if (!teamId) {
        return;
      }
      const departmentId = selectedDepartment?.id;
      
      if (!orgId) {
        throw new Error('No organization ID found');
      }
      
      const response = await scorecardService.getScorecard(orgId, teamId, departmentId);
      
      // Debug: Check for zero values in the response
      console.log('Scorecard response:', response);
      
      if (response && response.data) {
        // Check for zero values in scores
        const scores = response.data.weeklyScores || {};
        Object.keys(scores).forEach(metricId => {
          Object.keys(scores[metricId]).forEach(date => {
            if (scores[metricId][date] === 0) {
              console.log('Found zero value from backend - metricId:', metricId, 'date:', date, 'value:', scores[metricId][date]);
            }
          });
        });
        
        setMetrics(response.data.metrics || []);
        setWeeklyScores(response.data.weeklyScores || {});
        setMonthlyScores(response.data.monthlyScores || {});
        setWeeklyNotes(response.data.weeklyNotes || {}); // Load notes
        setMonthlyNotes(response.data.monthlyNotes || {}); // Load notes
        setUsers(response.data.teamMembers || []);
      } else if (response) {
        // Check for zero values in scores
        const scores = response.weeklyScores || {};
        Object.keys(scores).forEach(metricId => {
          Object.keys(scores[metricId]).forEach(date => {
            if (scores[metricId][date] === 0) {
              console.log('Found zero value from backend - metricId:', metricId, 'date:', date, 'value:', scores[metricId][date]);
            }
          });
        });
        
        setMetrics(response.metrics || []);
        setWeeklyScores(response.weeklyScores || {});
        setMonthlyScores(response.monthlyScores || {});
        setWeeklyNotes(response.weeklyNotes || {}); // Load notes
        setMonthlyNotes(response.monthlyNotes || {}); // Load notes
        setUsers(response.teamMembers || []);
      }
    } catch (error) {
      console.error('Failed to fetch scorecard:', error);
      setError('Failed to load scorecard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizationTheme = async () => {
    try {
      // First check localStorage
      const orgId = user?.organizationId || user?.organization_id;
      const savedTheme = getOrgTheme(orgId);
      if (savedTheme) {
        setThemeColors(savedTheme);
        return;
      }
      
      // Fetch from API
      const orgData = await organizationService.getOrganization();
      
      if (orgData) {
        const theme = {
          primary: orgData.theme_primary_color || '#3B82F6',
          secondary: orgData.theme_secondary_color || '#1E40AF',
          accent: orgData.theme_accent_color || '#60A5FA'
        };
        setThemeColors(theme);
        saveOrgTheme(orgId, theme);
        
        // Set scorecard time period preference
        setScorecardTimePeriodPreference(orgData.scorecard_time_period_preference || '13_week_rolling');
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = selectedDepartment?.id || LEADERSHIP_TEAM_ID;
      
      if (!orgId || !teamId) return;
      
      const fetchedGroups = await scorecardGroupsService.getGroups(orgId, teamId);
      setGroups(fetchedGroups || []);
      
      // If groups exist and no saved preference, default to groups view
      if (fetchedGroups && fetchedGroups.length > 0) {
        const savedViewMode = localStorage.getItem('scorecardViewMode');
        if (!savedViewMode) {
          setViewMode('groups');
          localStorage.setItem('scorecardViewMode', 'groups');
        }
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const handleAddMetric = () => {
    setEditingMetric(null);
    setMetricForm({
      name: '',
      description: '',
      goal: '',
      ownerId: '',
      ownerName: '',
      type: activeTab === 'monthly' ? 'monthly' : 'weekly',
      valueType: 'number',
      comparisonOperator: 'greater_equal',
      groupId: 'none'
    });
    setShowMetricDialog(true);
  };

  const handleChartOpen = (metric) => {
    setChartModal({ isOpen: true, metric: metric, metricId: metric.id });
  };

  const handleEditMetric = (metric) => {
    setEditingMetric(metric);
    setMetricForm({
      name: metric.name,
      description: metric.description || '',
      goal: metric.goal,
      ownerId: metric.ownerId || '',
      ownerName: metric.owner || metric.ownerName || '',
      type: metric.type || 'weekly',
      valueType: metric.value_type || 'number',
      comparisonOperator: metric.comparison_operator || 'greater_equal',
      groupId: metric.group_id || 'none'
    });
    setShowMetricDialog(true);
  };

  const handleSaveMetric = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = selectedDepartment?.id || LEADERSHIP_TEAM_ID;
      
      if (!teamId) {
        return;
      }
      
      if (!orgId) {
        throw new Error('No organization ID found');
      }
      
      const metricData = {
        name: metricForm.name,
        description: metricForm.description,
        goal: metricForm.goal ? Math.round(parseFloat(metricForm.goal)).toString() : metricForm.goal,
        owner: metricForm.ownerName,
        type: metricForm.type,
        valueType: metricForm.valueType,
        comparisonOperator: metricForm.comparisonOperator,
        groupId: metricForm.groupId === 'none' ? null : metricForm.groupId
      };
      
      if (editingMetric) {
        const updatedMetric = await scorecardService.updateMetric(orgId, teamId, editingMetric.id, metricData);
        setMetrics(prev => prev.map(m => m.id === updatedMetric.id ? {...updatedMetric, ownerId: metricForm.ownerId, ownerName: metricForm.ownerName} : m));
        setSuccess('Metric updated successfully');
      } else {
        const newMetric = await scorecardService.createMetric(orgId, teamId, metricData);
        setMetrics(prev => [...prev, {...newMetric, ownerId: metricForm.ownerId, ownerName: metricForm.ownerName}]);
        setSuccess('Metric added successfully');
      }
      
      setShowMetricDialog(false);
      setMetricForm({
        name: '',
        description: '',
        goal: '',
        ownerId: '',
        ownerName: '',
        type: 'weekly',
        valueType: 'number',
        comparisonOperator: 'greater_equal',
        groupId: 'none'
      });
    } catch {
      setError('Failed to save metric');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMetric = async (metricId) => {
    if (!confirm('Are you sure you want to delete this metric?')) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = selectedDepartment?.id || LEADERSHIP_TEAM_ID;
      
      if (!teamId) {
        return;
      }
      
      if (!orgId) {
        throw new Error('No organization ID found');
      }
      
      await scorecardService.deleteMetric(orgId, teamId, metricId);
      setMetrics(prev => prev.filter(m => m.id !== metricId));
      setSuccess('Metric deleted successfully');
    } catch {
      setError('Failed to delete metric');
    } finally {
      setSaving(false);
    }
  };

  const handleMetricShare = (metric) => {
    setMetricToShare(metric);
    setShareMetricDialog(true);
  };

  const handleShareSuccess = async () => {
    setSuccess('Metric shared successfully');
    // Refresh metrics to update the is_shared status
    await fetchScorecard();
  };

  const handleScoreEdit = (metric, weekDate, scoreType = 'weekly') => {
    const scores = scoreType === 'monthly' ? monthlyScores : weeklyScores;
    const notes = scoreType === 'monthly' ? monthlyNotes : weeklyNotes;
    const scoreValue = scores[metric.id]?.[weekDate];
    const noteValue = notes[metric.id]?.[weekDate] || '';
    
    const currentValue = scoreValue !== undefined && scoreValue !== null
      ? Math.round(parseFloat(scoreValue))
      : '';
    const currentNotes = noteValue;
    
    setScoreDialogData({
      metricId: metric.id,
      weekDate: weekDate,
      metricName: metric.name,
      currentValue: currentValue,
      currentNotes: currentNotes,
      scoreType: scoreType
    });
    setScoreInputValue(currentValue.toString());
    setScoreNotesValue(currentNotes);
    setShowScoreDialog(true);
  };

  const handleScoreDialogSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = selectedDepartment?.id || LEADERSHIP_TEAM_ID;
      
      if (!orgId || !teamId) {
        return;
      }
      
      const valueToSave = scoreInputValue === '' ? null : parseFloat(scoreInputValue);
      console.log('Saving score - Input value:', scoreInputValue, 'Value to save:', valueToSave, 'Type:', typeof valueToSave);
      
      await scorecardService.updateScore(
        orgId, 
        teamId, 
        scoreDialogData.metricId, 
        scoreDialogData.weekDate, 
        valueToSave,
        scoreDialogData.scoreType || 'weekly',
        scoreNotesValue || null
      );
      
      setShowScoreDialog(false);
      setScoreInputValue('');
      setScoreNotesValue('');
      await fetchScorecard();
      setSuccess('Score updated successfully');
    } catch (error) {
      console.error('Failed to save score:', error);
      setError('Failed to save score');
    } finally {
      setSaving(false);
    }
  };

  const handleScoreDialogCancel = () => {
    setShowScoreDialog(false);
    setScoreInputValue('');
    setScoreNotesValue('');
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

  // Get week labels based on actual data dates, not calculated from today
  const getWeekLabels = () => {
    const labels = [];
    const weekDates = [];
    
    // Get all unique dates where we have actual score data
    const allScoreDates = [...new Set(
      metrics.flatMap(metric => Object.keys(weeklyScores[metric.id] || {}))
    )].sort();
    
    if (allScoreDates.length === 0) {
      console.log('ScorecardPage - No score data available, showing empty weeks');
      return { labels: [], weekDates: [] };
    }
    
    // For 13-week rolling, show the last 13 weeks that have data
    let displayDates;
    if (scorecardTimePeriodPreference === '13_week_rolling') {
      displayDates = allScoreDates.slice(-13);
    } else {
      // For other preferences, still use the existing logic but ensure we have data
      const today = new Date();
      const { startDate, endDate } = getDateRange(scorecardTimePeriodPreference, today);
      
      // Filter actual dates to only those in the calculated range
      displayDates = allScoreDates.filter(dateStr => {
        const date = new Date(dateStr);
        return date >= startDate && date <= endDate;
      });
    }
    
    // Convert dates to labels and week start dates
    displayDates.forEach(dateStr => {
      const date = new Date(dateStr);
      const weekStart = getWeekStartDate(date);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      
      // Avoid duplicate weeks
      if (!weekDates.includes(weekStartStr)) {
        labels.push(formatWeekLabel(weekStart));
        weekDates.push(weekStartStr);
      }
    });
    
    console.log(`ScorecardPage - Showing ${scorecardTimePeriodPreference} weeks with actual data:`, weekDates);
    
    return { labels, weekDates };
  };

  // Format month label as "MMM YY"
  const formatMonthLabel = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = date.getFullYear().toString().slice(-2);
    return `${months[date.getMonth()]} ${year}`;
  };

  // Get month labels based on actual data dates, not calculated from today
  const getMonthLabels = () => {
    const labels = [];
    const monthDates = [];
    
    // Get all unique dates where we have actual score data
    const allScoreDates = [...new Set(
      metrics.flatMap(metric => Object.keys(weeklyScores[metric.id] || {}))
    )].sort();
    
    if (allScoreDates.length === 0) {
      console.log('ScorecardPage - No score data available, showing empty months');
      return { labels: [], monthDates: [] };
    }
    
    // For 13-week rolling, show months from the last 13 weeks of data
    let displayDates;
    if (scorecardTimePeriodPreference === '13_week_rolling') {
      displayDates = allScoreDates.slice(-13);
    } else {
      // For other preferences, still use the existing logic but ensure we have data
      const today = new Date();
      const { startDate, endDate } = getDateRange(scorecardTimePeriodPreference, today);
      
      // Filter actual dates to only those in the calculated range
      displayDates = allScoreDates.filter(dateStr => {
        const date = new Date(dateStr);
        return date >= startDate && date <= endDate;
      });
    }
    
    // Convert dates to month labels and avoid duplicates
    const monthsSet = new Set();
    displayDates.forEach(dateStr => {
      const date = new Date(dateStr);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthStartStr = monthStart.toISOString().split('T')[0];
      
      if (!monthsSet.has(monthStartStr)) {
        monthsSet.add(monthStartStr);
        labels.push(formatMonthLabel(monthStart));
        monthDates.push(monthStartStr);
      }
    });
    
    console.log(`ScorecardPage - Showing ${scorecardTimePeriodPreference} months with actual data:`, monthDates);
    
    return { labels, monthDates };
  };

  // Calculate date ranges dynamically based on current state
  const getWeekData = () => getWeekLabels();
  const getMonthData = () => getMonthLabels();
  
  const { labels: weekLabels, weekDates } = getWeekData();
  const { labels: monthLabels, monthDates } = getMonthData();


  if (loading || departmentLoading || (!selectedDepartment && !isLeadershipMember)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const currentMetrics = activeTab === 'weekly' ? weeklyMetrics : monthlyMetrics;
  const currentScores = activeTab === 'weekly' ? weeklyScores : monthlyScores;
  const currentDates = activeTab === 'weekly' ? weekDates : monthDates;
  const currentLabels = activeTab === 'weekly' ? weekLabels : monthLabels;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
                   style={{
                     background: `linear-gradient(135deg, ${themeColors.primary}15 0%, ${themeColors.secondary}15 100%)`,
                     color: themeColors.primary
                   }}>
                <Activity className="h-4 w-4" />
                PERFORMANCE TRACKING
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                {selectedDepartment?.name || ''} Scorecard
              </h1>
              <p className="text-base sm:text-lg text-slate-600">Track your key metrics and measurables</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="relative">
                <Button 
                  onClick={() => setShowOptions(!showOptions)}
                  variant="outline"
                  className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm transition-all duration-200"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">View Options</span>
                  <span className="sm:hidden">Options</span>
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
                {showOptions && (
                  <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-sm border border-white/20 rounded-xl shadow-lg z-10 overflow-hidden">
                    <button
                      onClick={() => {
                        const newViewMode = viewMode === 'table' ? 'groups' : 'table';
                        setViewMode(newViewMode);
                        localStorage.setItem('scorecardViewMode', newViewMode);
                        setShowOptions(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-medium transition-colors"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `linear-gradient(135deg, ${themeColors.primary}10 0%, ${themeColors.secondary}10 100%)`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" style={{ color: themeColors.primary }} />
                        <span>{viewMode === 'table' ? 'Switch to Groups View' : 'Switch to Table View'}</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        const newRTL = !isRTL;
                        setIsRTL(newRTL);
                        localStorage.setItem('scorecardRTL', newRTL.toString());
                        setShowOptions(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-medium border-t border-gray-100 transition-colors"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `linear-gradient(135deg, ${themeColors.primary}10 0%, ${themeColors.secondary}10 100%)`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" style={{ color: themeColors.secondary }} />
                        <span>{isRTL ? 'Left to Right Layout' : 'Right to Left Layout'}</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <ScorecardImport 
                  orgId={user?.organization_id}
                  teamId={selectedDepartment?.id || LEADERSHIP_TEAM_ID}
                  onImportComplete={fetchScorecard}
                />
                <Button 
                  onClick={handleAddMetric} 
                  className="text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  style={{ 
                    background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Add Metric</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm rounded-xl">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50/80 backdrop-blur-sm rounded-xl">
            <Sparkles className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 font-medium">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 mb-6 inline-flex shadow-sm">
            <TabsList className="grid w-80 grid-cols-3 bg-transparent gap-1">
              <TabsTrigger 
                value="weekly" 
                className="data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-200 font-medium"
                style={activeTab === 'weekly' ? {
                  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                } : {}}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Weekly
              </TabsTrigger>
              <TabsTrigger 
                value="monthly" 
                className="data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-200 font-medium"
                style={activeTab === 'monthly' ? {
                  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                } : {}}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Monthly
              </TabsTrigger>
              <TabsTrigger 
                value="shared" 
                className="data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-200 font-medium"
                style={activeTab === 'shared' ? {
                  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                } : {}}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Shared
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="weekly" className="mt-0">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg p-6">
            {viewMode === 'groups' ? (
              <GroupedScorecardView
                metrics={weeklyMetrics}
                weeklyScores={weeklyScores}
                monthlyScores={monthlyScores}
                weeklyNotes={weeklyNotes}
                monthlyNotes={monthlyNotes}
                teamMembers={users}
                orgId={user?.organizationId}
                teamId={selectedDepartment?.id || LEADERSHIP_TEAM_ID}
                type="weekly"
                isRTL={isRTL}
                themeColors={themeColors}
                onMetricUpdate={handleEditMetric}
                onScoreUpdate={(metric, period) => handleScoreEdit(metric, period, 'weekly')}
                onMetricDelete={handleDeleteMetric}
                onMetricShare={handleMetricShare}
                onChartOpen={handleChartOpen}
                onRefresh={fetchScorecard}
                showTotal={false}
                weekOptions={weekDates.map((date, index) => ({ value: date, label: weekLabels[index] }))}
                weekOptionsOriginal={weekDates.map((date, index) => ({ value: date, label: weekLabels[index] }))}
                monthOptions={[]}
                monthOptionsOriginal={[]}
                selectedWeeks={weekDates.map(date => ({ value: date, label: date }))}
                selectedMonths={[]}
              />
            ) : (
              <ScorecardTableClean
                metrics={weeklyMetrics}
                weeklyScores={weeklyScores}
                monthlyScores={monthlyScores}
                weeklyNotes={weeklyNotes}
                monthlyNotes={monthlyNotes}
                type="weekly"
                readOnly={false}
                isRTL={isRTL}
                showTotal={false}
                themeColors={themeColors}
                departmentId={selectedDepartment?.id || LEADERSHIP_TEAM_ID}
                onIssueCreated={null}
                onScoreEdit={(metric, weekDate) => handleScoreEdit(metric, weekDate, 'weekly')}
                onChartOpen={handleChartOpen}
                onMetricUpdate={handleEditMetric}
                onMetricDelete={handleDeleteMetric}
                onMetricShare={handleMetricShare}
                scorecardTimePeriodPreference={scorecardTimePeriodPreference}
              />
            )}
            </div>
          </TabsContent>
          
          <TabsContent value="monthly" className="mt-0">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg p-6">
            {viewMode === 'groups' ? (
              <GroupedScorecardView
                metrics={monthlyMetrics}
                weeklyScores={weeklyScores}
                monthlyScores={monthlyScores}
                weeklyNotes={weeklyNotes}
                monthlyNotes={monthlyNotes}
                teamMembers={users}
                orgId={user?.organizationId}
                teamId={selectedDepartment?.id || LEADERSHIP_TEAM_ID}
                type="monthly"
                isRTL={isRTL}
                themeColors={themeColors}
                onMetricUpdate={handleEditMetric}
                onScoreUpdate={(metric, period) => handleScoreEdit(metric, period, 'monthly')}
                onMetricDelete={handleDeleteMetric}
                onMetricShare={handleMetricShare}
                onChartOpen={handleChartOpen}
                onRefresh={fetchScorecard}
                showTotal={false}
                weekOptions={[]}
                weekOptionsOriginal={[]}
                monthOptions={monthDates.map((date, index) => ({ value: date, label: monthLabels[index] }))}
                monthOptionsOriginal={monthDates.map((date, index) => ({ value: date, label: monthLabels[index] }))}
                selectedWeeks={[]}
                selectedMonths={monthDates.map(date => ({ value: date, label: date }))}
              />
            ) : (
              <ScorecardTableClean
                metrics={monthlyMetrics}
                weeklyScores={weeklyScores}
                monthlyScores={monthlyScores}
                weeklyNotes={weeklyNotes}
                monthlyNotes={monthlyNotes}
                type="monthly"
                readOnly={false}
                isRTL={isRTL}
                showTotal={false}
                departmentId={selectedDepartment?.id || LEADERSHIP_TEAM_ID}
                onIssueCreated={null}
                onScoreEdit={(metric, monthDate) => handleScoreEdit(metric, monthDate, 'monthly')}
                onChartOpen={handleChartOpen}
                onMetricUpdate={handleEditMetric}
                onMetricDelete={handleDeleteMetric}
                onMetricShare={handleMetricShare}
                scorecardTimePeriodPreference={scorecardTimePeriodPreference}
              />
            )}
            </div>
          </TabsContent>
          
          <TabsContent value="shared" className="mt-0">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg p-6">
            <SharedMetricsBrowser
              orgId={user?.organizationId || user?.organization_id}
              teamId={selectedDepartment?.id || LEADERSHIP_TEAM_ID}
              onSubscribe={fetchScorecard}
            />
            </div>
          </TabsContent>
        </Tabs>

        {/* Metric Dialog */}
        <Dialog open={showMetricDialog} onOpenChange={setShowMetricDialog}>
          <DialogContent className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                {editingMetric ? 'Edit Metric' : 'Add New Metric'}
              </DialogTitle>
              <DialogDescription className="text-slate-600 font-medium">
                Define a measurable metric to track {metricForm.type === 'monthly' ? 'monthly' : 'weekly'} performance
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="metric-name" className="text-slate-700 font-medium">Metric Name</Label>
                <Input
                  id="metric-name"
                  value={metricForm.name}
                  onChange={(e) => setMetricForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Sales Calls, Customer Satisfaction"
                  className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200"
                />
              </div>
              <div>
                <Label htmlFor="metric-description" className="text-slate-700 font-medium">Data Source</Label>
                <Input
                  id="metric-description"
                  value={metricForm.description}
                  onChange={(e) => setMetricForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g., CRM system, collected weekly on Fridays"
                  className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200"
                />
              </div>
              <div>
                <Label htmlFor="metric-goal" className="text-slate-700 font-medium">{metricForm.type === 'monthly' ? 'Monthly' : 'Weekly'} Goal</Label>
                <Input
                  id="metric-goal"
                  type="number"
                  step="1"
                  value={metricForm.goal}
                  onChange={(e) => setMetricForm(prev => ({ ...prev, goal: e.target.value }))}
                  placeholder="e.g., 50, 95"
                  className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200"
                />
              </div>
              <div>
                <Label htmlFor="metric-owner" className="text-slate-700 font-medium">Owner</Label>
                <TeamMemberSelect
                  teamId={selectedDepartment?.id}
                  value={metricForm.ownerId}
                  onValueChange={(userId) => {
                    const selectedUser = users.find(u => u.id === userId);
                    setMetricForm(prev => ({ 
                      ...prev, 
                      ownerId: userId,
                      ownerName: selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : ''
                    }));
                  }}
                  placeholder="Select an owner"
                  className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm"
                  includeAllIfLeadership={true}
                />
              </div>
              <div>
                <Label htmlFor="metric-value-type" className="text-slate-700 font-medium">Value Type</Label>
                <Select
                  value={metricForm.valueType}
                  onValueChange={(value) => setMetricForm(prev => ({ ...prev, valueType: value }))}
                >
                  <SelectTrigger id="metric-value-type" className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl">
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="currency">Currency ($)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="metric-comparison" className="text-slate-700 font-medium">Goal Achievement</Label>
                <Select
                  value={metricForm.comparisonOperator}
                  onValueChange={(value) => setMetricForm(prev => ({ ...prev, comparisonOperator: value }))}
                >
                  <SelectTrigger id="metric-comparison" className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl">
                    <SelectItem value="greater">{'Greater than goal (>)'}</SelectItem>
                    <SelectItem value="greater_equal">Greater than or equal to goal (≥)</SelectItem>
                    <SelectItem value="less">{'Less than goal (<)'}</SelectItem>
                    <SelectItem value="less_equal">Less than or equal to goal (≤)</SelectItem>
                    <SelectItem value="equal">Equal to goal (=)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="metric-type" className="text-slate-700 font-medium">Frequency</Label>
                <Select
                  value={metricForm.type}
                  onValueChange={(value) => setMetricForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger id="metric-type" className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl">
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {groups.length > 0 && (
                <div>
                  <Label htmlFor="metric-group" className="text-slate-700 font-medium">Group (Optional)</Label>
                  <Select
                    value={metricForm.groupId || 'none'}
                    onValueChange={(value) => setMetricForm(prev => ({ ...prev, groupId: value === 'none' ? '' : value }))}
                  >
                    <SelectTrigger id="metric-group" className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm">
                      <SelectValue placeholder="No group" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl">
                      <SelectItem value="none">No group</SelectItem>
                      {groups.map(group => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter className="flex justify-between pt-4 border-t border-white/20">
              <div>
                {editingMetric && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowMetricDialog(false);
                      handleMetricShare(editingMetric);
                    }}
                    className="mr-auto bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200"
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    {editingMetric.is_shared ? 'Manage Sharing' : 'Share This Metric'}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowMetricDialog(false)}
                  className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveMetric} 
                  disabled={saving || !metricForm.name || !metricForm.goal}
                  className="text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = 'brightness(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = 'brightness(1)';
                  }}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {editingMetric ? 'Update' : 'Create'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Score Entry Dialog */}
        <Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
          <DialogContent className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Update Score</DialogTitle>
              <DialogDescription className="text-slate-600 font-medium">
                Enter the score for {scoreDialogData.metricName} for {scoreDialogData.scoreType === 'monthly' ? 'the month of' : 'the week of'} {scoreDialogData.weekDate}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="score-input" className="text-slate-700 font-medium">Score</Label>
                <Input
                  id="score-input"
                  type="number"
                  step="1"
                  value={scoreInputValue}
                  onChange={(e) => setScoreInputValue(e.target.value)}
                  placeholder="Enter score"
                  autoFocus
                  className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200"
                />
              </div>
              <div>
                <Label htmlFor="score-notes" className="text-slate-700 font-medium">Notes (optional)</Label>
                <textarea
                  id="score-notes"
                  className="w-full min-h-[80px] px-3 py-2 text-sm bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={scoreNotesValue}
                  onChange={(e) => setScoreNotesValue(e.target.value)}
                  placeholder="Add context or comments about this score..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="pt-4 border-t border-white/20">
              <Button 
                variant="outline" 
                onClick={handleScoreDialogCancel}
                className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleScoreDialogSave} 
                disabled={saving}
                className="text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save Score
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Share Metric Dialog */}
      <ShareMetricDialog
        open={shareMetricDialog}
        onClose={() => {
          setShareMetricDialog(false);
          setMetricToShare(null);
        }}
        metric={metricToShare}
        orgId={user?.organizationId || user?.organization_id}
        teamId={selectedDepartment?.id || LEADERSHIP_TEAM_ID}
        onSuccess={handleShareSuccess}
      />
      
      {/* Metric Trend Chart Modal */}
      <MetricTrendChart
        isOpen={chartModal.isOpen}
        onClose={() => setChartModal({ isOpen: false, metric: null, metricId: null })}
        metric={chartModal.metric}
        metricId={chartModal.metricId}
        orgId={user?.organizationId}
        teamId={selectedDepartment?.id}
      />
    </div>
  );
};

export default ScorecardPageClean;