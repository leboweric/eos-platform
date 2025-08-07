import { useState, useEffect, Component } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus,
  Loader2,
  AlertCircle,
  Target,
  Edit,
  Save,
  X,
  BarChart3,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  Zap,
  Settings,
  Download
} from 'lucide-react';

// Import redesigned components
import ScorecardDashboard from '../components/scorecard-redesigned/ScorecardDashboard';
import IntelligentMetricCard from '../components/scorecard-redesigned/IntelligentMetricCard';
import BulkUpdateModal from '../components/scorecard-redesigned/BulkUpdateModal';

// Import original components for backward compatibility
import MetricTrendChart from '../components/scorecard/MetricTrendChart';

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Scorecard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>An error occurred loading the scorecard.</p>
                <p className="text-sm">Error: {this.state.error?.message}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  size="sm"
                  variant="outline"
                >
                  Refresh Page
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

const ScorecardPageRedesigned = () => {
  const { user } = useAuthStore();
  const { selectedDepartment, isLeadershipMember, loading: departmentLoading } = useDepartment();
  
  // Core data state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Scorecard data
  const [metrics, setMetrics] = useState([]);
  const [weeklyScores, setWeeklyScores] = useState({});
  const [monthlyScores, setMonthlyScores] = useState({});
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('weekly');
  const [viewMode, setViewMode] = useState('dashboard'); // dashboard, cards, table
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal states
  const [showMetricDialog, setShowMetricDialog] = useState(false);
  const [editingMetric, setEditingMetric] = useState(null);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [bulkUpdateMetrics, setBulkUpdateMetrics] = useState([]);
  const [chartModal, setChartModal] = useState({ isOpen: false, metric: null, metricId: null });
  
  // Metric form
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
        console.log('No department selected and not a leadership member, skipping operation');
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

  const fetchGroups = async () => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
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
        console.log('No department selected yet, skipping operation');
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
      resetMetricForm();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Failed to save metric');
    } finally {
      setSaving(false);
    }
  };

  const resetMetricForm = () => {
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
  };

  const handleScoreUpdate = async (metric, period, value) => {
    try {
      setSaving(true);
      setError(null);
      
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = selectedDepartment?.id;
      
      if (!teamId) {
        console.log('No department selected yet, skipping operation');
        return;
      }
      
      if (!orgId) {
        throw new Error('No organization ID found');
      }
      
      await scorecardService.updateScore(orgId, teamId, metric.id, period, value || null, metric.type);
      
      if (metric.type === 'monthly') {
        setMonthlyScores(prev => ({
          ...prev,
          [metric.id]: {
            ...prev[metric.id],
            [period]: value
          }
        }));
      } else {
        setWeeklyScores(prev => ({
          ...prev,
          [metric.id]: {
            ...prev[metric.id],
            [period]: value
          }
        }));
      }
      
      setSuccess('Score updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Failed to update score');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpdate = (metricsToUpdate = []) => {
    if (metricsToUpdate.length > 0) {
      setBulkUpdateMetrics(metricsToUpdate);
    } else {
      const currentMetrics = metrics.filter(m => m.type === activeTab);
      setBulkUpdateMetrics(currentMetrics);
    }
    setShowBulkUpdate(true);
  };

  const handleBulkUpdateSave = async (updates) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = selectedDepartment?.id;
      
      if (!orgId || !teamId) {
        throw new Error('Organization or department not found');
      }
      
      // Process each update
      const promises = updates.map(update => 
        scorecardService.updateScore(orgId, teamId, update.metricId, update.period, update.value, activeTab)
      );
      
      await Promise.all(promises);
      
      // Update local state
      updates.forEach(update => {
        if (activeTab === 'monthly') {
          setMonthlyScores(prev => ({
            ...prev,
            [update.metricId]: {
              ...prev[update.metricId],
              [update.period]: update.value
            }
          }));
        } else {
          setWeeklyScores(prev => ({
            ...prev,
            [update.metricId]: {
              ...prev[update.metricId],
              [update.period]: update.value
            }
          }));
        }
      });
      
      setSuccess(`Successfully updated ${updates.length} metrics`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to save bulk updates:', error);
      throw error;
    }
  };

  // Get time periods for current type
  const getTimePeriods = () => {
    const periods = [];
    const today = new Date();
    
    if (activeTab === 'monthly') {
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        periods.push(monthDate.toISOString().split('T')[0]);
      }
    } else {
      for (let i = 9; i >= 0; i--) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (i * 7));
        const mondayOfWeek = new Date(weekStart);
        const day = mondayOfWeek.getDay();
        const diff = mondayOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        mondayOfWeek.setDate(diff);
        periods.push(mondayOfWeek.toISOString().split('T')[0]);
      }
    }
    
    return periods;
  };

  const getCurrentPeriod = () => {
    const periods = getTimePeriods();
    return periods[periods.length - 1]; // Most recent period
  };

  // Filter metrics
  const getFilteredMetrics = () => {
    const typeMetrics = metrics.filter(m => m.type === activeTab);
    
    return typeMetrics.filter(metric => {
      if (searchQuery && !metric.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      if (selectedOwner !== 'all' && metric.ownerId !== selectedOwner) {
        return false;
      }
      
      return true;
    });
  };

  const filteredMetrics = getFilteredMetrics();
  const timePeriods = getTimePeriods();
  const currentPeriod = getCurrentPeriod();
  const currentScores = activeTab === 'monthly' ? monthlyScores : weeklyScores;

  // Loading state
  if (loading || departmentLoading || !selectedDepartment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {selectedDepartment?.name || ''} Scorecard
          </h1>
          <p className="text-gray-600 mt-1">
            Intelligent performance tracking and insights
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button onClick={handleAddMetric} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Metric
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'dashboard' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('dashboard')}
            >
              Dashboard
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('cards')}
            >
              Cards
            </Button>
          </div>
        </div>

        <TabsContent value={activeTab} className="space-y-6">
          {/* Dashboard View */}
          {viewMode === 'dashboard' && (
            <ScorecardDashboard
              metrics={filteredMetrics}
              scores={currentScores}
              periods={timePeriods}
              type={activeTab}
              currentPeriod={currentPeriod}
              onBulkUpdate={handleBulkUpdate}
              onViewMetric={handleEditMetric}
            />
          )}

          {/* Filters */}
          {viewMode === 'cards' && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search metrics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Owners</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => handleBulkUpdate()}
                className="flex items-center space-x-2"
              >
                <Zap className="h-4 w-4" />
                <span>Bulk Update</span>
              </Button>
            </div>
          )}

          {/* Cards View */}
          {viewMode === 'cards' && (
            <div className="space-y-6">
              {filteredMetrics.length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="space-y-4">
                    <Target className="h-12 w-12 text-gray-300 mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        No {activeTab} metrics found
                      </h3>
                      <p className="text-gray-600">
                        {searchQuery || selectedOwner !== 'all' 
                          ? 'Try adjusting your filters.' 
                          : `Create your first ${activeTab} metric to get started.`
                        }
                      </p>
                    </div>
                    {!searchQuery && selectedOwner === 'all' && (
                      <Button onClick={handleAddMetric}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add {activeTab} Metric
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredMetrics.map(metric => (
                    <IntelligentMetricCard
                      key={metric.id}
                      metric={metric}
                      scores={currentScores}
                      periods={timePeriods}
                      type={activeTab}
                      onScoreUpdate={handleScoreUpdate}
                      onMetricEdit={handleEditMetric}
                      onChartView={(metric) => setChartModal({ isOpen: true, metric, metricId: metric.id })}
                      currentPeriod={currentPeriod}
                      isNeedsAttention={!currentScores[metric.id]?.[currentPeriod]}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Metric Dialog - keeping original for compatibility */}
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

      {/* Bulk Update Modal */}
      <BulkUpdateModal
        isOpen={showBulkUpdate}
        onClose={() => setShowBulkUpdate(false)}
        metrics={bulkUpdateMetrics}
        currentPeriod={currentPeriod}
        type={activeTab}
        onSave={handleBulkUpdateSave}
        currentScores={currentScores}
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

// Wrap with Error Boundary
const ScorecardPageRedesignedWithErrorBoundary = () => (
  <ErrorBoundary>
    <ScorecardPageRedesigned />
  </ErrorBoundary>
);

export default ScorecardPageRedesignedWithErrorBoundary;