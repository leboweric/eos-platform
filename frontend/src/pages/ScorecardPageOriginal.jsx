import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { scorecardService } from '../services/scorecardService';
import { scorecardGroupsService } from '../services/scorecardGroupsService';
import { useDepartment } from '../contexts/DepartmentContext';
import { LEADERSHIP_TEAM_ID } from '../utils/teamUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Target,
  Edit,
  Save,
  X,
  ArrowLeftRight,
  BarChart3,
  GripVertical
} from 'lucide-react';
import MetricTrendChart from '../components/scorecard/MetricTrendChart';
import GroupedScorecardView from '../components/scorecard/GroupedScorecardView';

const ScorecardPage = () => {
  const { user } = useAuthStore();
  const { selectedDepartment, isLeadershipMember, loading: departmentLoading } = useDepartment();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Scorecard data
  const [metrics, setMetrics] = useState([]);
  const [weeklyScores, setWeeklyScores] = useState({});
  const [editingMetric, setEditingMetric] = useState(null);
  const [showMetricDialog, setShowMetricDialog] = useState(false);
  const [editingScore, setEditingScore] = useState(null);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [scoreDialogData, setScoreDialogData] = useState({ metricId: null, weekDate: '', metricName: '', currentValue: '' });
  const [scoreInputValue, setScoreInputValue] = useState('');
  const [users, setUsers] = useState([]);
  const [chartModal, setChartModal] = useState({ isOpen: false, metric: null, metricId: null });
  const [useGroupsView, setUseGroupsView] = useState(() => {
    return localStorage.getItem('scorecardUseGroups') === 'true';
  });
  const [groups, setGroups] = useState([]);
  
  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  
  // Filter metrics by type
  const weeklyMetrics = metrics.filter(m => m.type === 'weekly');
  const monthlyMetrics = metrics.filter(m => m.type === 'monthly');
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isRTL, setIsRTL] = useState(() => {
    // Load RTL preference from localStorage
    const saved = localStorage.getItem('scorecardRTL');
    return saved === 'true';
  });
  const [showTotal, setShowTotal] = useState(() => {
    // Load showTotal preference from localStorage
    const saved = localStorage.getItem('scorecardShowTotal');
    return saved !== null ? saved === 'true' : true; // Default to true if not set
  });
  const [activeTab, setActiveTab] = useState('weekly');
  const [monthlyScores, setMonthlyScores] = useState({});
  
  // Form data for new/edit metric
  const [metricForm, setMetricForm] = useState({
    name: '',
    description: '',
    goal: '',
    ownerId: '',
    ownerName: '',
    type: 'weekly', // weekly, monthly, quarterly
    valueType: 'number', // number, currency, percentage
    comparisonOperator: 'greater_equal', // greater_equal, less_equal, equal
    groupId: 'none' // scorecard group
  });

  useEffect(() => {
    console.log('ScorecardPage useEffect - user:', user);
    console.log('ScorecardPage useEffect - organizationId:', user?.organizationId);
    console.log('ScorecardPage useEffect - selectedDepartment:', selectedDepartment);
    console.log('ScorecardPage useEffect - isLeadershipMember:', isLeadershipMember);
    
    if (user?.organizationId && (selectedDepartment || isLeadershipMember)) {
      fetchScorecard();
      fetchGroups();
    }
  }, [user?.organizationId, selectedDepartment, isLeadershipMember]);

  const fetchScorecard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const orgId = user?.organizationId || user?.organization_id;
      
      // Use Leadership Team ID if leadership member without department selected
      let teamId = selectedDepartment?.id;
      if (!teamId && isLeadershipMember) {
        teamId = LEADERSHIP_TEAM_ID;
      }
      
      if (!teamId) {
        console.log('No department selected and not a leadership member, skipping operation');
        return;
      }
      const departmentId = selectedDepartment?.id;
      
      if (!orgId) {
        throw new Error('No organization ID found');
      }
      
      console.log('Fetching scorecard with:', { orgId, teamId, departmentId });
      const response = await scorecardService.getScorecard(orgId, teamId, departmentId);
      console.log('Scorecard response:', response);
      
      if (response && response.data) {
        console.log('Response has data wrapper:', response.data);
        setMetrics(response.data.metrics || []);
        setWeeklyScores(response.data.weeklyScores || {});
        setMonthlyScores(response.data.monthlyScores || {});
        setUsers(response.data.teamMembers || []);
      } else if (response) {
        console.log('Response without data wrapper:', response);
        setMetrics(response.metrics || []);
        setWeeklyScores(response.weeklyScores || {});
        setMonthlyScores(response.monthlyScores || {});
        setUsers(response.teamMembers || []);
      }
      console.log('State before update - metrics:', metrics.length);
      console.log('About to set metrics to:', response.metrics || response.data?.metrics || []);
    } catch (error) {
      console.error('Failed to fetch scorecard:', error);
      setError('Failed to load scorecard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = selectedDepartment?.id || LEADERSHIP_TEAM_ID;
      
      if (!orgId || !teamId) return;
      
      const fetchedGroups = await scorecardGroupsService.getGroups(orgId, teamId);
      setGroups(fetchedGroups || []);
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
    console.log('Editing metric:', metric);
    console.log('Metric description:', metric.description);
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
      const teamId = selectedDepartment?.id;
      
      if (!teamId) {
        console.log('No department selected yet, skipping operation');
        return;
      }
      
      if (!orgId) {
        throw new Error('No organization ID found');
      }
      
      // Prepare the metric data with owner name for the backend
      const metricData = {
        name: metricForm.name,
        description: metricForm.description,
        goal: metricForm.goal ? Math.round(parseFloat(metricForm.goal)).toString() : metricForm.goal,
        owner: metricForm.ownerName, // Backend expects 'owner' field with the name
        type: metricForm.type,
        valueType: metricForm.valueType,
        comparisonOperator: metricForm.comparisonOperator,
        groupId: metricForm.groupId === 'none' ? null : metricForm.groupId
      };
      
      console.log('Saving metric with data:', metricData);
      
      if (editingMetric) {
        const updatedMetric = await scorecardService.updateMetric(orgId, teamId, editingMetric.id, metricData);
        console.log('Updated metric received:', updatedMetric);
        console.log('Updated metric description:', updatedMetric.description);
        setMetrics(prev => prev.map(m => m.id === updatedMetric.id ? {...updatedMetric, ownerId: metricForm.ownerId, ownerName: metricForm.ownerName} : m));
        setSuccess('Metric updated successfully');
      } else {
        const newMetric = await scorecardService.createMetric(orgId, teamId, metricData);
        console.log('New metric received:', newMetric);
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
      const teamId = selectedDepartment?.id;
      
      if (!teamId) {
        console.log('No department selected yet, skipping operation');
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

  const handleScoreEdit = (metric, weekDate) => {
    const currentValue = weeklyScores[metric.id] && weeklyScores[metric.id][weekDate] 
      ? Math.round(parseFloat(weeklyScores[metric.id][weekDate])) 
      : '';
    
    setScoreDialogData({
      metricId: metric.id,
      weekDate: weekDate,
      metricName: metric.name,
      currentValue: currentValue
    });
    setScoreInputValue(currentValue.toString());
    setShowScoreDialog(true);
  };

  const handleScoreDialogSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = selectedDepartment?.id;
      
      if (!orgId || !teamId) {
        console.log('No department selected yet, skipping operation');
        return;
      }
      
      await scorecardService.updateScore(
        orgId, 
        teamId, 
        scoreDialogData.metricId, 
        scoreDialogData.weekDate, 
        scoreInputValue || null,
        scoreDialogData.scoreType || 'weekly'
      );
      
      setShowScoreDialog(false);
      setScoreInputValue('');
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
  };

  const handleScoreSave = async (metricId, period, value, scoreType = 'weekly') => {
    try {
      setSaving(true);
      setError(null);
      
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = selectedDepartment?.id;
      
      if (!teamId) {
        console.log('No department selected yet, skipping operation');
        return;
      }
      
      if (!orgId) {
        throw new Error('No organization ID found');
      }
      
      await scorecardService.updateScore(orgId, teamId, metricId, period, value, scoreType);
      
      if (scoreType === 'monthly') {
        setMonthlyScores(prev => ({
          ...prev,
          [metricId]: {
            ...prev[metricId],
            [period]: value
          }
        }));
      } else {
        setWeeklyScores(prev => ({
          ...prev,
          [metricId]: {
            ...prev[metricId],
            [period]: value
          }
        }));
      }
      
      setEditingScore(null);
      setSuccess('Score updated successfully');
    } catch {
      setError('Failed to update score');
    } finally {
      setSaving(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, type, index) => {
    setDraggedItem({ type, index });
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '';
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, type, index) => {
    if (draggedItem && draggedItem.type === type && draggedItem.index !== index) {
      setDragOverItem({ type, index });
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = async (e, type, dropIndex) => {
    e.preventDefault();
    setDragOverItem(null);

    if (!draggedItem || draggedItem.type !== type || draggedItem.index === dropIndex) {
      return;
    }

    const filteredMetrics = metrics.filter(m => m.type === type);
    const draggedMetric = filteredMetrics[draggedItem.index];
    
    // Create new metrics array with updated order
    const newFilteredMetrics = [...filteredMetrics];
    newFilteredMetrics.splice(draggedItem.index, 1);
    newFilteredMetrics.splice(dropIndex, 0, draggedMetric);
    
    // Update the full metrics array
    const otherMetrics = metrics.filter(m => m.type !== type);
    const newMetrics = [...otherMetrics, ...newFilteredMetrics].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'weekly' ? -1 : 1;
      }
      return 0;
    });
    
    setMetrics(newMetrics);
    
    // Save new order to backend
    try {
      setIsSavingOrder(true);
      setSuccess('Saving new order...');
      
      // Create array with new display_order values for this type
      const metricsWithOrder = newFilteredMetrics.map((metric, index) => ({
        id: metric.id,
        display_order: index
      }));
      
      await scorecardService.updateMetricOrder(
        user.organizationId,
        selectedDepartment?.id || user.teamId,
        metricsWithOrder
      );
      
      setSuccess('Order saved successfully');
    } catch (error) {
      console.error('Failed to save metric order:', error);
      setError('Failed to save new order');
      // Revert on error
      fetchScorecardData();
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Get week start date for a given date
  const getWeekStartDate = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
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
      // Store the week identifier in ISO format for consistent storage
      weekDates.push(mondayOfWeek.toISOString().split('T')[0]);
    }
    
    return { labels, weekDates };
  };

  // Format month label as "MMM YY"
  const formatMonthLabel = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = date.getFullYear().toString().slice(-2);
    return `${months[date.getMonth()]} ${year}`;
  };

  // Get month labels for the past 12 months
  const getMonthLabels = () => {
    const labels = [];
    const monthDates = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      labels.push(formatMonthLabel(monthDate));
      // Store the month identifier as YYYY-MM-01 for consistent storage
      monthDates.push(monthDate.toISOString().split('T')[0]);
    }
    
    return { labels, monthDates };
  };

  const { labels: weekLabelsOriginal, weekDates: weekDatesOriginal } = getWeekLabels();
  const weekLabels = isRTL ? [...weekLabelsOriginal].reverse() : weekLabelsOriginal;
  const weekDates = isRTL ? [...weekDatesOriginal].reverse() : weekDatesOriginal;
  
  const { labels: monthLabelsOriginal, monthDates: monthDatesOriginal } = getMonthLabels();
  const monthLabels = isRTL ? [...monthLabelsOriginal].reverse() : monthLabelsOriginal;
  const monthDates = isRTL ? [...monthDatesOriginal].reverse() : monthDatesOriginal;
  
  // Create options for GroupedScorecardView
  const weekOptions = weekDates.map((date, index) => ({
    value: date,
    label: weekLabels[index]
  }));
  
  const monthOptions = monthDates.map((date, index) => ({
    value: date,
    label: monthLabels[index]
  }));

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
        return Math.abs(scoreVal - goalVal) < 0.01; // Allow small floating point differences
      default:
        return scoreVal >= goalVal;
    }
  };

  console.log('Render - loading:', loading, 'departmentLoading:', departmentLoading, 'metrics length:', metrics.length);
  console.log('weekLabels:', weekLabels);
  console.log('weekDates:', weekDates);
  console.log('weeklyScores:', weeklyScores);
  
  if (loading || departmentLoading || !selectedDepartment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-full mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
              {selectedDepartment?.name || ''} Scorecard
            </h1>
            <p className="text-gray-600 mt-2 text-lg">Track your key metrics and measurables</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                const newValue = !showTotal;
                setShowTotal(newValue);
                localStorage.setItem('scorecardShowTotal', newValue.toString());
              }} 
              variant="outline"
              title={showTotal ? "Hide total column" : "Show total column"}
            >
              {showTotal ? "Hide Total" : "Show Total"}
            </Button>
            <Button 
              onClick={() => {
                const newValue = !isRTL;
                setIsRTL(newValue);
                localStorage.setItem('scorecardRTL', newValue.toString());
              }} 
              variant="outline"
              title={isRTL ? "Switch to left-to-right" : "Switch to right-to-left"}
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
            <Button 
              onClick={() => {
                const newValue = !useGroupsView;
                setUseGroupsView(newValue);
                localStorage.setItem('scorecardUseGroups', newValue.toString());
              }} 
              variant="outline"
              title={useGroupsView ? "Switch to table view" : "Switch to groups view"}
            >
              {useGroupsView ? "Table View" : "Groups View"}
            </Button>
            <Button onClick={handleAddMetric} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Add Metric
            </Button>
          </div>
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
          
          <TabsContent value="weekly">
            {useGroupsView ? (
              <GroupedScorecardView
                metrics={weeklyMetrics}
                weeklyScores={weeklyScores}
                monthlyScores={monthlyScores}
                teamMembers={users}
                orgId={user?.organizationId}
                teamId={selectedDepartment?.id || LEADERSHIP_TEAM_ID}
                type="weekly"
                onMetricUpdate={handleEditMetric}
                onScoreUpdate={(metric, period, value) => handleScoreEdit(metric, period)}
                onMetricDelete={handleDeleteMetric}
                onChartOpen={handleChartOpen}
                onRefresh={fetchScorecard}
                showTotal={showTotal}
                weekOptions={weekOptions}
                weekOptionsOriginal={weekDatesOriginal.map((date, index) => ({ value: date, label: weekLabelsOriginal[index] }))}
                monthOptions={[]}
                monthOptionsOriginal={[]}
                selectedWeeks={weekDates.map(date => ({ value: date, label: date }))}
                selectedMonths={[]}
              />
            ) : (
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
                    <th className="text-center p-2 font-semibold text-gray-700 w-8"></th>
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
                    <th className="text-center p-2 font-semibold text-gray-700 w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {console.log('TBODY RENDER: metrics.length =', metrics.length, 'metrics =', metrics)}
                  {console.log('TBODY RENDER: metrics.length === 0 is', metrics.length === 0)}
                  {metrics.filter(m => m.type === 'weekly').length === 0 ? (
                    <tr>
                      <td colSpan={weekLabels.length + (showTotal ? 8 : 7)} className="text-center p-8 text-gray-500">
                        No weekly metrics defined. Click "Add Metric" and select Weekly frequency to get started.
                      </td>
                    </tr>
                  ) : (
                    metrics.filter(m => m.type === 'weekly').map((metric, index) => {
                      console.log('Rendering metric:', metric.id, metric.name);
                      const isBeingDragged = draggedItem?.type === 'weekly' && draggedItem?.index === index;
                      const isDragOver = dragOverItem?.type === 'weekly' && dragOverItem?.index === index;
                      return (
                      <tr 
                        key={metric.id} 
                        className={`border-b hover:bg-gray-50 cursor-move ${isDragOver ? 'bg-blue-50' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'weekly', index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDragEnter={(e) => handleDragEnter(e, 'weekly', index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'weekly', index)}
                      >
                        <td className="p-2 text-center">
                          <GripVertical className="h-4 w-4 text-gray-400" />
                        </td>
                        <td className="p-2 text-center text-sm">{metric.ownerName || metric.owner}</td>
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
                        <td className="p-2 text-center font-semibold text-indigo-600 text-sm">{formatGoal(metric.goal, metric.value_type, metric.comparison_operator)}</td>
                        
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
                            <td className="p-2 text-center bg-gray-50 font-semibold text-sm">
                              {(() => {
                                // Always use original order for calculations
                                const scores = weekDatesOriginal
                                  .map(weekDate => weeklyScores[metric.id]?.[weekDate])
                                  .filter(score => score !== undefined && score !== null && score !== '');
                                
                                if (scores.length === 0) return '-';
                                
                                const average = scores.reduce((sum, score) => sum + parseFloat(score), 0) / scores.length;
                                const avgGoalMet = isGoalMet(average, metric.goal, metric.comparison_operator);
                                
                                return (
                                  <span className={`px-2 py-1 rounded ${
                                    avgGoalMet ? 'text-green-800' : 'text-red-800'
                                  }`}>
                                    {metric.value_type === 'number' ? Math.round(average) : formatValue(average, metric.value_type)}
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
                          
                          return (
                            <td key={weekDate} className="p-2 text-center group">
                              <button
                                className={`w-full h-8 rounded text-center font-medium transition-colors cursor-pointer relative group ${
                                  score
                                    ? goalMet
                                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                                    : 'text-gray-400 hover:bg-gray-100'
                                }`}
                                onClick={() => handleScoreEdit(metric, weekDate)}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  {score ? (
                                    <>
                                      <span className="text-sm">{formatValue(score, metric.value_type)}</span>
                                      <Edit className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </>
                                  ) : (
                                    <span className="text-sm">-</span>
                                  )}
                                </div>
                              </button>
                            </td>
                          );
                        })}
                        {/* Average, Total and Actions columns for LTR */}
                        {!isRTL && (
                          <>
                            {/* Average column */}
                            <td className="p-2 text-center bg-gray-50 font-semibold text-sm">
                              {(() => {
                                // Always use original order for calculations
                                const scores = weekDatesOriginal
                                  .map(weekDate => weeklyScores[metric.id]?.[weekDate])
                                  .filter(score => score !== undefined && score !== null && score !== '');
                                
                                if (scores.length === 0) return '-';
                                
                                const average = scores.reduce((sum, score) => sum + parseFloat(score), 0) / scores.length;
                                const avgGoalMet = isGoalMet(average, metric.goal, metric.comparison_operator);
                                
                                return (
                                  <span className={`px-2 py-1 rounded ${
                                    avgGoalMet ? 'text-green-800' : 'text-red-800'
                                  }`}>
                                    {metric.value_type === 'number' ? Math.round(average) : formatValue(average, metric.value_type)}
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
                        {/* Actions column - always on far right */}
                        <td className="p-2 text-center">
                              <div className="flex justify-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleEditMetric(metric)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleDeleteMetric(metric.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                        </td>
                      </tr>
                    )})
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
            )}
      </TabsContent>
      
      <TabsContent value="monthly">
        {useGroupsView ? (
              <GroupedScorecardView
                metrics={monthlyMetrics}
                weeklyScores={weeklyScores}
                monthlyScores={monthlyScores}
                teamMembers={users}
                orgId={user?.organizationId}
                teamId={selectedDepartment?.id || LEADERSHIP_TEAM_ID}
                type="monthly"
                onMetricUpdate={handleEditMetric}
                onScoreUpdate={(metric, period, value) => handleScoreEdit(metric, period)}
                onMetricDelete={handleDeleteMetric}
                onChartOpen={handleChartOpen}
                onRefresh={fetchScorecard}
                showTotal={showTotal}
                weekOptions={[]}
                weekOptionsOriginal={[]}
                monthOptions={monthOptions}
                monthOptionsOriginal={monthDatesOriginal.map((date, index) => ({ value: date, label: monthLabelsOriginal[index] }))}
                selectedWeeks={[]}
                selectedMonths={monthOptions}
              />
            ) : (
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white">
            <CardTitle className="flex items-center text-xl">
              <Target className="mr-2 h-6 w-6" />
              Monthly Scorecard
            </CardTitle>
            <CardDescription className="text-indigo-100">
              Track performance over the past 12 months
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-center p-2 font-semibold text-gray-700 w-8"></th>
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
                    {monthLabels.map((label, index) => {
                      const originalIndex = isRTL ? monthLabels.length - 1 - index : index;
                      const isCurrentMonth = originalIndex === monthLabelsOriginal.length - 1;
                      return (
                        <th key={monthDates[index]} className={`text-center p-2 font-semibold text-xs w-16 ${
                          isCurrentMonth ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700'
                        }`}>
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-normal text-gray-500 mb-1">
                              {isCurrentMonth ? 'Current' : ''}
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
                    <th className="text-center p-2 font-semibold text-gray-700 w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.filter(m => m.type === 'monthly').length === 0 ? (
                    <tr>
                      <td colSpan={monthLabels.length + (showTotal ? 8 : 7)} className="text-center p-8 text-gray-500">
                        No monthly metrics defined. Click "Add Metric" and select Monthly frequency to get started.
                      </td>
                    </tr>
                  ) : (
                    metrics.filter(m => m.type === 'monthly').map((metric, index) => {
                      const isDragOver = dragOverItem?.type === 'monthly' && dragOverItem?.index === index;
                      return (
                      <tr 
                        key={metric.id} 
                        className={`border-b hover:bg-gray-50 cursor-move ${isDragOver ? 'bg-blue-50' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'monthly', index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDragEnter={(e) => handleDragEnter(e, 'monthly', index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'monthly', index)}
                      >
                        <td className="p-2 text-center">
                          <GripVertical className="h-4 w-4 text-gray-400" />
                        </td>
                        <td className="p-2 text-center text-sm">{metric.ownerName || metric.owner}</td>
                        <td className="p-2 font-medium text-sm">{metric.name}</td>
                        <td className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-blue-100"
                            onClick={() => setChartModal({ isOpen: true, metric, metricId: metric.id })}
                            title="View 3-month moving trend chart"
                          >
                            <BarChart3 className="h-4 w-4 text-blue-600" />
                          </Button>
                        </td>
                        <td className="p-2 text-center font-semibold text-indigo-600 text-sm">{formatGoal(metric.goal, metric.value_type, metric.comparison_operator)}</td>
                        
                        {/* Total and Average columns for RTL */}
                        {isRTL && (
                          <>
                            {/* Total column */}
                            {showTotal && (
                              <td className="p-2 text-center bg-gray-50 font-semibold text-sm">
                              {(() => {
                                const scores = monthDatesOriginal
                                  .map(monthDate => monthlyScores[metric.id]?.[monthDate])
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
                            <td className="p-2 text-center bg-gray-50 font-semibold text-sm">
                              {(() => {
                                const scores = monthDatesOriginal
                                  .map(monthDate => monthlyScores[metric.id]?.[monthDate])
                                  .filter(score => score !== undefined && score !== null && score !== '');
                                
                                if (scores.length === 0) return '-';
                                
                                const average = scores.reduce((sum, score) => sum + parseFloat(score), 0) / scores.length;
                                const avgGoalMet = isGoalMet(average, metric.goal, metric.comparison_operator);
                                
                                return (
                                  <span className={`px-2 py-1 rounded ${
                                    avgGoalMet ? 'text-green-800' : 'text-red-800'
                                  }`}>
                                    {metric.value_type === 'number' ? Math.round(average) : formatValue(average, metric.value_type)}
                                  </span>
                                );
                              })()}
                            </td>
                          </>
                        )}
                        
                        {/* Month columns */}
                        {monthDates.map((monthDate) => {
                          const score = monthlyScores[metric.id]?.[monthDate];
                          const goalMet = score && isGoalMet(score, metric.goal, metric.comparison_operator);
                          
                          return (
                            <td key={monthDate} className="p-2 text-center group">
                              <button
                                className={`w-full h-8 rounded text-center font-medium transition-colors cursor-pointer relative group ${
                                  score
                                    ? goalMet
                                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                                    : 'text-gray-400 hover:bg-gray-100'
                                }`}
                                onClick={() => {
                                  const currentValue = monthlyScores[metric.id] && monthlyScores[metric.id][monthDate] 
                                    ? Math.round(parseFloat(monthlyScores[metric.id][monthDate])) 
                                    : '';
                                  
                                  setScoreDialogData({
                                    metricId: metric.id,
                                    weekDate: monthDate,
                                    metricName: metric.name,
                                    currentValue: currentValue,
                                    scoreType: 'monthly'
                                  });
                                  setScoreInputValue(currentValue.toString());
                                  setShowScoreDialog(true);
                                }}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  {score ? (
                                    <>
                                      <span className="text-sm">{formatValue(score, metric.value_type)}</span>
                                      <Edit className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </>
                                  ) : (
                                    <span className="text-sm">-</span>
                                  )}
                                </div>
                              </button>
                            </td>
                          );
                        })}
                        {/* Average, Total and Actions columns for LTR */}
                        {!isRTL && (
                          <>
                            {/* Average column */}
                            <td className="p-2 text-center bg-gray-50 font-semibold text-sm">
                              {(() => {
                                const scores = monthDatesOriginal
                                  .map(monthDate => monthlyScores[metric.id]?.[monthDate])
                                  .filter(score => score !== undefined && score !== null && score !== '');
                                
                                if (scores.length === 0) return '-';
                                
                                const average = scores.reduce((sum, score) => sum + parseFloat(score), 0) / scores.length;
                                const avgGoalMet = isGoalMet(average, metric.goal, metric.comparison_operator);
                                
                                return (
                                  <span className={`px-2 py-1 rounded ${
                                    avgGoalMet ? 'text-green-800' : 'text-red-800'
                                  }`}>
                                    {metric.value_type === 'number' ? Math.round(average) : formatValue(average, metric.value_type)}
                                  </span>
                                );
                              })()}
                            </td>
                            {/* Total column */}
                            {showTotal && (
                              <td className="p-2 text-center bg-gray-50 font-semibold text-sm">
                              {(() => {
                                const scores = monthDatesOriginal
                                  .map(monthDate => monthlyScores[metric.id]?.[monthDate])
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
                        {/* Actions column - always on far right */}
                        <td className="p-2 text-center">
                          <div className="flex justify-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleEditMetric(metric)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleDeleteMetric(metric.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
            )}
      </TabsContent>
    </Tabs>

        {/* Metric Dialog */}
        <Dialog open={showMetricDialog} onOpenChange={setShowMetricDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMetric ? 'Edit Metric' : 'Add New Metric'}</DialogTitle>
              <DialogDescription>
                Define a measurable metric to track {metricForm.type === 'monthly' ? 'monthly' : 'weekly'} performance
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="metric-name">Metric Name</Label>
                <Input
                  id="metric-name"
                  value={metricForm.name}
                  onChange={(e) => setMetricForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Sales Calls, Customer Satisfaction"
                />
              </div>
              <div>
                <Label htmlFor="metric-description">Data Source</Label>
                <Input
                  id="metric-description"
                  value={metricForm.description}
                  onChange={(e) => setMetricForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g., CRM system, collected weekly on Fridays"
                />
              </div>
              <div>
                <Label htmlFor="metric-goal">{metricForm.type === 'monthly' ? 'Monthly' : 'Weekly'} Goal</Label>
                <Input
                  id="metric-goal"
                  type="number"
                  step="1"
                  value={metricForm.goal}
                  onChange={(e) => setMetricForm(prev => ({ ...prev, goal: e.target.value }))}
                  placeholder="e.g., 50, 95"
                />
              </div>
              <div>
                <Label htmlFor="metric-owner">Owner</Label>
                <Select
                  value={metricForm.ownerId}
                  onValueChange={(userId) => {
                    const selectedUser = users.find(u => u.id === userId);
                    setMetricForm(prev => ({ 
                      ...prev, 
                      ownerId: userId,
                      ownerName: selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : ''
                    }));
                  }}
                >
                  <SelectTrigger id="metric-owner">
                    <SelectValue placeholder="Select an owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="metric-value-type">Value Type</Label>
                <Select
                  value={metricForm.valueType}
                  onValueChange={(value) => setMetricForm(prev => ({ ...prev, valueType: value }))}
                >
                  <SelectTrigger id="metric-value-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="currency">Currency ($)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="metric-comparison">Goal Achievement</Label>
                <Select
                  value={metricForm.comparisonOperator}
                  onValueChange={(value) => setMetricForm(prev => ({ ...prev, comparisonOperator: value }))}
                >
                  <SelectTrigger id="metric-comparison">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="greater_equal">Greater than or equal to goal (≥)</SelectItem>
                    <SelectItem value="less_equal">Less than or equal to goal (≤)</SelectItem>
                    <SelectItem value="equal">Equal to goal (=)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="metric-type">Frequency</Label>
                <Select
                  value={metricForm.type}
                  onValueChange={(value) => setMetricForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger id="metric-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="metric-group">Group (Optional)</Label>
                <Select
                  value={metricForm.groupId || 'none'}
                  onValueChange={(value) => setMetricForm(prev => ({ ...prev, groupId: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger id="metric-group">
                    <SelectValue placeholder="No group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No group</SelectItem>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMetricDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveMetric} disabled={saving || !metricForm.name || !metricForm.goal}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editingMetric ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Score Entry Dialog */}
        <Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Score</DialogTitle>
              <DialogDescription>
                Enter the score for {scoreDialogData.metricName} for {scoreDialogData.scoreType === 'monthly' ? 'the month of' : 'the week of'} {scoreDialogData.weekDate}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="score-input">Score</Label>
                <Input
                  id="score-input"
                  type="number"
                  step="1"
                  value={scoreInputValue}
                  onChange={(e) => setScoreInputValue(e.target.value)}
                  placeholder="Enter score"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleScoreDialogCancel}>
                Cancel
              </Button>
              <Button onClick={handleScoreDialogSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save Score
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
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

export default ScorecardPage;