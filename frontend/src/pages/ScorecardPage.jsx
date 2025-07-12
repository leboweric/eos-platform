import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { scorecardService } from '../services/scorecardService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  X
} from 'lucide-react';

const ScorecardPage = () => {
  const { user } = useAuthStore();
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
  const [users, setUsers] = useState([]);
  
  // Form data for new/edit metric
  const [metricForm, setMetricForm] = useState({
    name: '',
    goal: '',
    ownerId: '',
    ownerName: '',
    type: 'weekly' // weekly, monthly, quarterly
  });

  useEffect(() => {
    console.log('ScorecardPage useEffect - user:', user);
    console.log('ScorecardPage useEffect - organizationId:', user?.organizationId);
    
    if (user?.organizationId) {
      fetchScorecard();
      fetchUsers();
    }
  }, [user?.organizationId]);

  const fetchScorecard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const orgId = user?.organizationId;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      if (!orgId) {
        throw new Error('No organization ID found');
      }
      
      const response = await scorecardService.getScorecard(orgId, teamId);
      
      if (response && response.data) {
        setMetrics(response.data.metrics || []);
        setWeeklyScores(response.data.weeklyScores || {});
      } else if (response) {
        setMetrics(response.metrics || []);
        setWeeklyScores(response.weeklyScores || {});
      }
    } catch (error) {
      console.error('Failed to fetch scorecard:', error);
      setError('Failed to load scorecard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const orgId = user?.organizationId;
      console.log('Fetching users for orgId:', orgId);
      
      if (!orgId) {
        console.error('No organization ID found for fetching users');
        return;
      }
      
      const token = localStorage.getItem('accessToken');
      console.log('Making request to:', `/api/v1/users/organization`);
      
      const response = await fetch(`/api/v1/users/organization`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      console.log('Users fetch response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Users data received:', data);
        setUsers(data.data || []);
      } else {
        console.error('Failed to fetch users - response not ok:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleAddMetric = () => {
    setEditingMetric(null);
    setMetricForm({
      name: '',
      goal: '',
      ownerId: '',
      ownerName: '',
      type: 'weekly'
    });
    setShowMetricDialog(true);
  };

  const handleEditMetric = (metric) => {
    setEditingMetric(metric);
    setMetricForm({
      name: metric.name,
      goal: metric.goal,
      ownerId: metric.ownerId || '',
      ownerName: metric.owner || metric.ownerName || '',
      type: metric.type || 'weekly'
    });
    setShowMetricDialog(true);
  };

  const handleSaveMetric = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const orgId = user?.organizationId;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      if (!orgId) {
        throw new Error('No organization ID found');
      }
      
      // Prepare the metric data with owner name for the backend
      const metricData = {
        ...metricForm,
        owner: metricForm.ownerName // Backend expects 'owner' field with the name
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
        goal: '',
        ownerId: '',
        ownerName: '',
        type: 'weekly'
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
      
      const orgId = user?.organizationId;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
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

  const handleScoreEdit = (metricId, week) => {
    setEditingScore({ metricId, week });
  };

  const handleScoreSave = async (metricId, week, value) => {
    try {
      setSaving(true);
      setError(null);
      
      const orgId = user?.organizationId;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      if (!orgId) {
        throw new Error('No organization ID found');
      }
      
      await scorecardService.updateScore(orgId, teamId, metricId, week, value);
      
      setWeeklyScores(prev => ({
        ...prev,
        [metricId]: {
          ...prev[metricId],
          [week]: value
        }
      }));
      
      setEditingScore(null);
      setSuccess('Score updated successfully');
    } catch {
      setError('Failed to update score');
    } finally {
      setSaving(false);
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

  // Get week labels for the past 12 weeks
  const getWeekLabels = () => {
    const labels = [];
    const weekDates = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (i * 7));
      const mondayOfWeek = getWeekStartDate(weekStart);
      
      labels.push(formatWeekLabel(mondayOfWeek));
      // Store the week identifier in ISO format for consistent storage
      weekDates.push(mondayOfWeek.toISOString().split('T')[0]);
    }
    
    return { labels, weekDates };
  };

  const { labels: weekLabels, weekDates } = getWeekLabels();

  if (loading) {
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
              Scorecard
            </h1>
            <p className="text-gray-600 mt-2 text-lg">Track your key metrics and measurables</p>
          </div>
          <Button onClick={handleAddMetric} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Add Metric
          </Button>
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

        <Card className="shadow-lg border-0 overflow-x-auto">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white">
            <CardTitle className="flex items-center text-xl">
              <Target className="mr-2 h-6 w-6" />
              Weekly Scorecard
            </CardTitle>
            <CardDescription className="text-indigo-100">
              Track performance over the past 12 weeks
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
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
                    <th className="text-center p-4 font-semibold text-gray-700 min-w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.length === 0 ? (
                    <tr>
                      <td colSpan={weekLabels.length + 6} className="text-center p-8 text-gray-500">
                        No metrics defined. Click "Add Metric" to get started.
                      </td>
                    </tr>
                  ) : (
                    metrics.map(metric => (
                      <tr key={metric.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-medium">{metric.name}</td>
                        <td className="p-4 text-center font-semibold text-indigo-600">{Math.round(parseFloat(metric.goal))}</td>
                        <td className="p-4 text-center">{metric.ownerName || metric.owner}</td>
                        {weekDates.map((weekDate) => {
                          const score = weeklyScores[metric.id]?.[weekDate];
                          const isEditing = editingScore?.metricId === metric.id && editingScore?.week === weekDate;
                          const isGoalMet = score && parseFloat(score) >= parseFloat(metric.goal);
                          
                          return (
                            <td key={weekDate} className="p-4 text-center">
                              {isEditing ? (
                                <div className="flex items-center space-x-1">
                                  <Input
                                    type="number"
                                    className="w-16 h-8 text-center"
                                    defaultValue={score ? Math.round(parseFloat(score)) : ''}
                                    step="1"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleScoreSave(metric.id, weekDate, e.target.value);
                                      }
                                      if (e.key === 'Escape') {
                                        setEditingScore(null);
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      const input = e.target.previousSibling;
                                      handleScoreSave(metric.id, weekDate, input.value);
                                    }}
                                  >
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingScore(null)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div
                                  className={`cursor-pointer px-2 py-1 rounded ${
                                    score
                                      ? isGoalMet
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                      : 'text-gray-400 hover:bg-gray-100'
                                  }`}
                                  onClick={() => handleScoreEdit(metric.id, weekDate)}
                                >
                                  {score ? Math.round(parseFloat(score)) : '-'}
                                </div>
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
                            const isGoalMet = average >= parseFloat(metric.goal);
                            
                            return (
                              <span className={`px-2 py-1 rounded ${
                                isGoalMet ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {Math.round(average)}
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
                                {total.toFixed(0)}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditMetric(metric)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMetric(metric.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Metric Dialog */}
        <Dialog open={showMetricDialog} onOpenChange={setShowMetricDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMetric ? 'Edit Metric' : 'Add New Metric'}</DialogTitle>
              <DialogDescription>
                Define a measurable metric to track weekly performance
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
                <Label htmlFor="metric-goal">Weekly Goal</Label>
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
                <Label htmlFor="metric-type">Type</Label>
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
      </div>
    </div>
  );
};

export default ScorecardPage;