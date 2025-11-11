import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../services/axiosConfig';
import { useAuthStore } from '../stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BarChart3,
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  ArrowLeft,
  Save,
  X
} from 'lucide-react';

const MetricsManagerPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [metricToDelete, setMetricToDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    ownerId: '',
    goal: 100,
    type: 'weekly',
    valueType: 'number',
    comparisonOperator: 'greater_equal',
    description: '',
    dataSource: '',
    calculationMethod: '',
    visibleToTeams: []
  });
  
  const [users, setUsers] = useState([]);
  const [ownerSearchTerm, setOwnerSearchTerm] = useState('');

  useEffect(() => {
    console.log('🔍 [METRICS MANAGER] useEffect triggered');
    console.log('🔍 [METRICS MANAGER] user:', user);
    console.log('🔍 [METRICS MANAGER] user.organization_id:', user?.organization_id);
    
    if (user?.organization_id) {
      console.log('🔍 [METRICS MANAGER] Organization ID exists, fetching data...');
      fetchMetrics();
      fetchTeams();
      fetchUsers();
    } else {
      console.warn('⚠️ [METRICS MANAGER] No organization ID, skipping data fetch');
    }
  }, [user]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/admin/org-shared-metrics/${user.organization_id}/metrics`
      );
      setMetrics(response.data.data || []);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await axios.get(
        `/organizations/${user.organization_id}/teams`
      );
      setTeams(response.data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchUsers = async () => {
    console.log('🔍 [METRICS MANAGER] fetchUsers() called');
    console.log('🔍 [METRICS MANAGER] API URL:', import.meta.env.VITE_API_URL);
    console.log('🔍 [METRICS MANAGER] Access token exists:', !!localStorage.getItem('accessToken'));
    
    try {
      const url = `/users/organization`;
      console.log('🔍 [METRICS MANAGER] Fetching from:', url);
      
      const response = await axios.get(url);
      
      console.log('🔍 [METRICS MANAGER] Response status:', response.status);
      console.log('🔍 [METRICS MANAGER] Response data:', response.data);
      
      if (response.data && response.data.data) {
        console.log('🔍 [METRICS MANAGER] Users count:', response.data.data.length);
        console.log('🔍 [METRICS MANAGER] First user:', response.data.data[0]);
        
        // Sort users alphabetically by first name
        const sortedUsers = response.data.data.sort((a, b) => {
          const firstNameA = (a.firstName || a.first_name || '').toLowerCase();
          const firstNameB = (b.firstName || b.first_name || '').toLowerCase();
          return firstNameA.localeCompare(firstNameB);
        });
        
        console.log('🔍 [METRICS MANAGER] Setting users state with', sortedUsers.length, 'users');
        setUsers(sortedUsers);
        console.log('🔍 [METRICS MANAGER] Users state updated successfully');
      } else {
        console.warn('⚠️ [METRICS MANAGER] No data in response:', response.data);
      }
    } catch (error) {
      console.error('❌ [METRICS MANAGER] Error fetching users:', error);
      console.error('❌ [METRICS MANAGER] Error response:', error.response);
      console.error('❌ [METRICS MANAGER] Error message:', error.message);
      setUsers([]);
    }
  };

  const handleCreateMetric = async () => {
    try {
      setSaving(true);
      await axios.post(
        `/admin/org-shared-metrics/${user.organization_id}/metrics`,
        formData
      );
      setIsCreateDialogOpen(false);
      resetForm();
      fetchMetrics();
    } catch (error) {
      console.error('Error creating metric:', error);
      alert('Failed to create metric');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMetric = async () => {
    try {
      setSaving(true);
      await axios.put(
        `/admin/org-shared-metrics/${user.organization_id}/metrics/${selectedMetric.id}`,
        formData
      );
      setSelectedMetric(null);
      resetForm();
      fetchMetrics();
    } catch (error) {
      console.error('Error updating metric:', error);
      alert('Failed to update metric');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMetric = async () => {
    try {
      await axios.delete(
        `/admin/org-shared-metrics/${user.organization_id}/metrics/${metricToDelete.id}`
      );
      setIsDeleteDialogOpen(false);
      setMetricToDelete(null);
      if (selectedMetric?.id === metricToDelete.id) {
        setSelectedMetric(null);
        resetForm();
      }
      fetchMetrics();
    } catch (error) {
      console.error('Error deleting metric:', error);
      alert(error.response?.data?.message || 'Failed to delete metric');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      ownerId: '',
      goal: 100,
      type: 'weekly',
      valueType: 'number',
      comparisonOperator: 'greater_equal',
      description: '',
      dataSource: '',
      calculationMethod: '',
      visibleToTeams: []
    });
  };

  const handleSelectMetric = (metric) => {
    setSelectedMetric(metric);
    setFormData({
      name: metric.name || '',
      ownerId: metric.owner_id || '',
      goal: metric.goal || 100,
      type: metric.type || 'weekly',
      valueType: metric.value_type || 'number',
      comparisonOperator: metric.comparison_operator || 'greater_equal',
      description: metric.description || '',
      dataSource: metric.data_source || '',
      calculationMethod: metric.calculation_method || '',
      visibleToTeams: metric.visible_to_teams || []
    });
  };

  const toggleTeamVisibility = (teamId) => {
    setFormData(prev => ({
      ...prev,
      visibleToTeams: prev.visibleToTeams.includes(teamId)
        ? prev.visibleToTeams.filter(id => id !== teamId)
        : [...prev.visibleToTeams, teamId]
    }));
  };

  const selectAllTeams = () => {
    setFormData(prev => ({
      ...prev,
      visibleToTeams: (teams || []).map(t => t.id)
    }));
  };

  const deselectAllTeams = () => {
    setFormData(prev => ({
      ...prev,
      visibleToTeams: []
    }));
  };

  const filteredMetrics = metrics.filter(metric =>
    metric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    metric.owner?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/tools')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin Tools
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Metrics Manager</h1>
            </div>
            <p className="text-gray-600">
              Create and manage organization-wide shared metrics
            </p>
          </div>
          
          <Button
            onClick={() => {
              resetForm();
              setIsCreateDialogOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Metric
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Metrics List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Shared Metrics ({metrics.length})</CardTitle>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search metrics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">Loading...</div>
                ) : filteredMetrics.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {searchTerm ? 'No metrics found' : 'No metrics yet'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {(filteredMetrics || []).map((metric) => (
                      <div
                        key={metric.id}
                        onClick={() => handleSelectMetric(metric)}
                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedMetric?.id === metric.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{metric.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">Owner: {metric.owner}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {metric.type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                {metric.subscriber_count || 0}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Metric Details */}
        <div className="lg:col-span-2">
          {selectedMetric ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Edit Metric</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMetricToDelete(selectedMetric);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMetric(null);
                        resetForm();
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleUpdateMetric}
                      disabled={saving}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <MetricForm
                  formData={formData}
                  setFormData={setFormData}
                  teams={teams}
                  users={users}
                  ownerSearchTerm={ownerSearchTerm}
                  setOwnerSearchTerm={setOwnerSearchTerm}
                  toggleTeamVisibility={toggleTeamVisibility}
                  selectAllTeams={selectAllTeams}
                  deselectAllTeams={deselectAllTeams}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Metric Selected
                </h3>
                <p className="text-gray-600 mb-6">
                  Select a metric from the list or create a new one
                </p>
                <Button
                  onClick={() => {
                    resetForm();
                    setIsCreateDialogOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Metric
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Metric Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Shared Metric</DialogTitle>
            <DialogDescription>
              Create an organization-wide shared metric that teams can subscribe to
            </DialogDescription>
          </DialogHeader>
          
          <MetricForm
            formData={formData}
            setFormData={setFormData}
            teams={teams}
            toggleTeamVisibility={toggleTeamVisibility}
            selectAllTeams={selectAllTeams}
            deselectAllTeams={deselectAllTeams}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateMetric}
              disabled={saving || !formData.name || !formData.ownerId}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? 'Creating...' : 'Create Metric'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Metric</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{metricToDelete?.name}"? This action cannot be undone.
              {metricToDelete?.subscriber_count > 0 && (
                <span className="block mt-2 text-red-600 font-semibold">
                  Warning: {metricToDelete.subscriber_count} team(s) are currently subscribed to this metric.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setMetricToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteMetric}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Metric Form Component
const MetricForm = ({
  formData,
  setFormData,
  teams,
  users,
  ownerSearchTerm,
  setOwnerSearchTerm,
  toggleTeamVisibility,
  selectAllTeams,
  deselectAllTeams
}) => {
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Basic Information</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Metric Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Monthly Revenue"
            />
          </div>
          
          <div>
            <Label htmlFor="owner">Owner *</Label>
            <Select
              value={formData.ownerId}
              onValueChange={(value) => setFormData({ ...formData, ownerId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select owner..." />
              </SelectTrigger>
              <SelectContent>
                {(users || []).map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="goal">Goal *</Label>
            <Input
              id="goal"
              type="number"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: parseFloat(e.target.value) })}
            />
          </div>
          
          <div>
            <Label htmlFor="type">Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
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
            <Label htmlFor="valueType">Value Type</Label>
            <Select
              value={formData.valueType}
              onValueChange={(value) => setFormData({ ...formData, valueType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="currency">Currency</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="comparisonOperator">Comparison Operator</Label>
            <Select
              value={formData.comparisonOperator}
              onValueChange={(value) => setFormData({ ...formData, comparisonOperator: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="greater_than">Greater Than (&gt;)</SelectItem>
                <SelectItem value="greater_equal">Greater Than or Equal (≥)</SelectItem>
                <SelectItem value="less_than">Less Than (&lt;)</SelectItem>
                <SelectItem value="less_equal">Less Than or Equal (≤)</SelectItem>
                <SelectItem value="equal">Equal (=)</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Internal description for this metric"
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="dataSource">Data Source</Label>
          <Input
            id="dataSource"
            value={formData.dataSource}
            onChange={(e) => setFormData({ ...formData, dataSource: e.target.value })}
            placeholder="Where this data comes from"
          />
        </div>

        <div>
          <Label htmlFor="calculationMethod">Calculation Method</Label>
          <Textarea
            id="calculationMethod"
            value={formData.calculationMethod}
            onChange={(e) => setFormData({ ...formData, calculationMethod: e.target.value })}
            placeholder="How this metric is calculated"
            rows={2}
          />
        </div>
      </div>

      {/* Team Visibility */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Team Visibility</h3>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAllTeams}
            >
              Select All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={deselectAllTeams}
            >
              Deselect All
            </Button>
          </div>
        </div>
        
        <p className="text-sm text-gray-600">
          {formData.visibleToTeams.length === 0
            ? 'Visible to all teams (no restrictions)'
            : `Visible to ${formData.visibleToTeams.length} selected team(s)`}
        </p>

        <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto border rounded-lg p-4">
          {(teams || []).map((team) => (
            <label
              key={team.id}
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
            >
              <input
                type="checkbox"
                checked={formData.visibleToTeams.includes(team.id)}
                onChange={() => toggleTeamVisibility(team.id)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{team.name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MetricsManagerPage;
