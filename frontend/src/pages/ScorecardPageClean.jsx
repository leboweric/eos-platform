import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { scorecardService } from '../services/scorecardService';
import { scorecardGroupsService } from '../services/scorecardGroupsService';
import { organizationService } from '../services/organizationService';
import { getOrgTheme, saveOrgTheme } from '../utils/themeUtils';
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
  Edit,
  BarChart3,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';
import MetricTrendChart from '../components/scorecard/MetricTrendChart';
import GroupedScorecardView from '../components/scorecard/GroupedScorecardView';
import ScorecardTableClean from '../components/scorecard/ScorecardTableClean';
import ScorecardImport from '../components/scorecard/ScorecardImport';

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
  
  // Scorecard data
  const [metrics, setMetrics] = useState([]);
  const [weeklyScores, setWeeklyScores] = useState({});
  const [editingMetric, setEditingMetric] = useState(null);
  const [showMetricDialog, setShowMetricDialog] = useState(false);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [scoreDialogData, setScoreDialogData] = useState({ metricId: null, weekDate: '', metricName: '', currentValue: '' });
  const [scoreInputValue, setScoreInputValue] = useState('');
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
      
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      
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
      
      if (response && response.data) {
        setMetrics(response.data.metrics || []);
        setWeeklyScores(response.data.weeklyScores || {});
        setMonthlyScores(response.data.monthlyScores || {});
        setUsers(response.data.teamMembers || []);
      } else if (response) {
        setMetrics(response.metrics || []);
        setWeeklyScores(response.weeklyScores || {});
        setMonthlyScores(response.monthlyScores || {});
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
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
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
      
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = selectedDepartment?.id;
      
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
      
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = selectedDepartment?.id;
      
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

  const handleScoreEdit = (metric, weekDate, scoreType = 'weekly') => {
    const scores = scoreType === 'monthly' ? monthlyScores : weeklyScores;
    const currentValue = scores[metric.id] && scores[metric.id][weekDate] 
      ? Math.round(parseFloat(scores[metric.id][weekDate])) 
      : '';
    
    setScoreDialogData({
      metricId: metric.id,
      weekDate: weekDate,
      metricName: metric.name,
      currentValue: currentValue,
      scoreType: scoreType
    });
    setScoreInputValue(currentValue.toString());
    setShowScoreDialog(true);
  };

  const handleScoreDialogSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = selectedDepartment?.id;
      
      if (!orgId || !teamId) {
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
      monthDates.push(monthDate.toISOString().split('T')[0]);
    }
    
    return { labels, monthDates };
  };

  const { labels: weekLabels, weekDates } = getWeekLabels();
  const { labels: monthLabels, monthDates } = getMonthLabels();


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
    <div className="min-h-screen bg-white">
      <div className="max-w-full mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              <span className="inline-block w-1 h-8 mr-3 rounded-full" style={{ backgroundColor: themeColors.primary }} />
              {selectedDepartment?.name || ''} Scorecard
            </h1>
            <p className="text-gray-500 mt-1">Track your key metrics and measurables</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Button 
                onClick={() => setShowOptions(!showOptions)}
                variant="outline"
                className="border-gray-200 hover:bg-gray-50"
              >
                <MoreHorizontal className="h-4 w-4 mr-2" />
                Options
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
              {showOptions && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-sm z-10">
                  <button
                    onClick={() => {
                      const newViewMode = viewMode === 'table' ? 'groups' : 'table';
                      setViewMode(newViewMode);
                      localStorage.setItem('scorecardViewMode', newViewMode);
                      setShowOptions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                  >
                    {viewMode === 'table' ? 'Groups View' : 'Table View'}
                  </button>
                  <button
                    onClick={() => {
                      const newRTL = !isRTL;
                      setIsRTL(newRTL);
                      localStorage.setItem('scorecardRTL', newRTL.toString());
                      setShowOptions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-t border-gray-100"
                  >
                    {isRTL ? 'Left to Right' : 'Right to Left'}
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
                className="text-white transition-colors"
                style={{ 
                  backgroundColor: themeColors.primary,
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeColors.secondary}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeColors.primary}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Metric
              </Button>
            </div>
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-48 grid-cols-2 mb-6 bg-gray-100">
            <TabsTrigger 
              value="weekly" 
              className="transition-colors"
              style={{ 
                backgroundColor: activeTab === 'weekly' ? themeColors.primary : 'transparent',
                color: activeTab === 'weekly' ? 'white' : 'inherit'
              }}
            >
              Weekly
            </TabsTrigger>
            <TabsTrigger 
              value="monthly" 
              className="transition-colors"
              style={{ 
                backgroundColor: activeTab === 'monthly' ? themeColors.primary : 'transparent',
                color: activeTab === 'monthly' ? 'white' : 'inherit'
              }}
            >
              Monthly
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="weekly" className="mt-0">
            {viewMode === 'groups' ? (
              <GroupedScorecardView
                metrics={weeklyMetrics}
                weeklyScores={weeklyScores}
                monthlyScores={monthlyScores}
                teamMembers={users}
                orgId={user?.organizationId}
                teamId={selectedDepartment?.id || LEADERSHIP_TEAM_ID}
                type="weekly"
                isRTL={isRTL}
                themeColors={themeColors}
                onMetricUpdate={handleEditMetric}
                onScoreUpdate={(metric, period) => handleScoreEdit(metric, period, 'weekly')}
                onMetricDelete={handleDeleteMetric}
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
              />
            )}
          </TabsContent>
          
          <TabsContent value="monthly" className="mt-0">
            {viewMode === 'groups' ? (
              <GroupedScorecardView
                metrics={monthlyMetrics}
                weeklyScores={weeklyScores}
                monthlyScores={monthlyScores}
                teamMembers={users}
                orgId={user?.organizationId}
                teamId={selectedDepartment?.id || LEADERSHIP_TEAM_ID}
                type="monthly"
                isRTL={isRTL}
                themeColors={themeColors}
                onMetricUpdate={handleEditMetric}
                onScoreUpdate={(metric, period) => handleScoreEdit(metric, period, 'monthly')}
                onMetricDelete={handleDeleteMetric}
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
              />
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
                    <SelectItem value="greater">{'Greater than goal (>)'}</SelectItem>
                    <SelectItem value="greater_equal">Greater than or equal to goal (≥)</SelectItem>
                    <SelectItem value="less">{'Less than goal (<)'}</SelectItem>
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
              {groups.length > 0 && (
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
              )}
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

export default ScorecardPageClean;