import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { quarterlyPrioritiesService } from '../services/quarterlyPrioritiesService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckSquare, 
  Plus, 
  Calendar,
  User,
  Target,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  Building2,
  DollarSign,
  BarChart,
  Save,
  X,
  Users,
  Loader2
} from 'lucide-react';
import { format, addMonths, startOfQuarter, endOfQuarter } from 'date-fns';

const QuarterlyPrioritiesPage = () => {
  const { user } = useAuthStore();
  const [selectedQuarter, setSelectedQuarter] = useState('Q1 2025');
  const [showAddPriority, setShowAddPriority] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for priorities data
  const [predictions, setPredictions] = useState({
    revenue: { target: 5000000, current: 4200000, trend: 'up' },
    profit: { target: 1000000, current: 850000, trend: 'up' },
    measurables: { onTrack: 8, total: 10 }
  });
  
  const [companyPriorities, setCompanyPriorities] = useState([]);
  const [teamMemberPriorities, setTeamMemberPriorities] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  
  // Editing states
  const [editingPredictions, setEditingPredictions] = useState(false);
  const [editingPriority, setEditingPriority] = useState(null);
  const [editingMilestone, setEditingMilestone] = useState(null);
  
  // Form states
  const [priorityForm, setPriorityForm] = useState({
    title: '',
    description: '',
    ownerId: '',
    dueDate: '',
    isCompanyPriority: false,
    milestones: []
  });
  const [newMilestoneForm, setNewMilestoneForm] = useState({
    title: '',
    dueDate: ''
  });

  // Mock data - replace with API calls
  useEffect(() => {
    fetchQuarterlyData();
  }, [selectedQuarter]);

  const fetchQuarterlyData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Extract quarter and year from selectedQuarter (e.g., "Q1 2025")
      const [quarter, year] = selectedQuarter.split(' ');
      
      // Get organization and team IDs from user context
      const orgId = user?.organizationId;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000'; // Default team ID
      
      if (!orgId) {
        throw new Error('No organization ID found');
      }
      
      const data = await quarterlyPrioritiesService.getQuarterlyPriorities(orgId, teamId, quarter, parseInt(year));
      
      setPredictions(data.predictions || {
        revenue: { target: 0, current: 0 },
        profit: { target: 0, current: 0 },
        measurables: { onTrack: 0, total: 0 }
      });
      
      setCompanyPriorities(data.companyPriorities || []);
      setTeamMemberPriorities(data.teamMemberPriorities || {});
      setTeamMembers(data.teamMembers || []);
    } catch (err) {
      console.error('Failed to fetch quarterly data:', err);
      setError('Failed to load quarterly priorities. Please try again later.');
      
      // Set empty data on error
      setPredictions({
        revenue: { target: 0, current: 0 },
        profit: { target: 0, current: 0 },
        measurables: { onTrack: 0, total: 0 }
      });
      setCompanyPriorities([]);
      setTeamMembers([]);
      setTeamMemberPriorities({});
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete':
        return 'bg-green-500';
      case 'on-track':
        return 'bg-blue-500';
      case 'off-track':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4" />;
      case 'on-track':
        return <TrendingUp className="h-4 w-4" />;
      case 'off-track':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'complete':
        return 'default';
      case 'on-track':
        return 'success';
      case 'off-track':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getUserInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date set';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid date';
    }
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return 0;
    try {
      const today = new Date();
      const due = new Date(dueDate);
      if (isNaN(due.getTime())) {
        return 0;
      }
      const diffTime = due - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      console.error('Error calculating days until due:', dueDate, error);
      return 0;
    }
  };

  const handleSavePredictions = async () => {
    try {
      const [quarter, year] = selectedQuarter.split(' ');
      const orgId = user?.organizationId;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await quarterlyPrioritiesService.updatePredictions(orgId, teamId, {
        quarter,
        year: parseInt(year),
        revenue: predictions.revenue,
        profit: predictions.profit,
        measurables: predictions.measurables
      });
      
      setEditingPredictions(false);
    } catch (err) {
      console.error('Failed to save predictions:', err);
      setError('Failed to save predictions');
    }
  };

  const handleUpdatePriority = async (priorityId, updates) => {
    try {
      const orgId = user?.organizationId;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await quarterlyPrioritiesService.updatePriority(orgId, teamId, priorityId, updates);
      
      // Refresh data
      await fetchQuarterlyData();
      setEditingPriority(null);
    } catch (err) {
      console.error('Failed to update priority:', err);
      setError('Failed to update priority');
    }
  };

  const handleUpdateMilestone = async (priorityId, milestoneId, completed) => {
    try {
      const orgId = user?.organizationId;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await quarterlyPrioritiesService.updateMilestone(orgId, teamId, priorityId, milestoneId, { completed });
      
      // Refresh data to get updated progress
      await fetchQuarterlyData();
    } catch (err) {
      console.error('Failed to update milestone:', err);
      if (err.status === 404) {
        // Milestone doesn't exist, refresh to remove from UI
        console.warn(`Milestone ${milestoneId} not found, refreshing data`);
        await fetchQuarterlyData();
      } else {
        setError('Failed to update milestone');
      }
    }
  };

  const handleCreateMilestone = async (priorityId, milestoneData) => {
    try {
      const orgId = user?.organizationId;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await quarterlyPrioritiesService.createMilestone(orgId, teamId, priorityId, milestoneData);
      
      // Refresh data
      await fetchQuarterlyData();
    } catch (err) {
      console.error('Failed to create milestone:', err);
      setError('Failed to create milestone');
    }
  };

  const handleEditMilestone = async (priorityId, milestoneId, updates) => {
    try {
      const orgId = user?.organizationId;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await quarterlyPrioritiesService.updateMilestone(orgId, teamId, priorityId, milestoneId, updates);
      
      // Refresh data
      await fetchQuarterlyData();
    } catch (err) {
      console.error('Failed to update milestone:', err);
      if (err.status === 404) {
        // Milestone doesn't exist, refresh to remove from UI
        console.warn(`Milestone ${milestoneId} not found, refreshing data`);
        await fetchQuarterlyData();
      } else {
        setError('Failed to update milestone');
      }
    }
  };

  const handleDeleteMilestone = async (priorityId, milestoneId) => {
    try {
      const orgId = user?.organizationId;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await quarterlyPrioritiesService.deleteMilestone(orgId, teamId, priorityId, milestoneId);
      
      // Refresh data
      await fetchQuarterlyData();
    } catch (err) {
      console.error('Failed to delete milestone:', err);
      // For delete, we don't show error for 404 since the milestone is already gone
      if (err.message && !err.message.includes('not found')) {
        setError('Failed to delete milestone');
      } else {
        // Still refresh to ensure UI is in sync
        await fetchQuarterlyData();
      }
    }
  };

  const handleAddUpdate = async (priorityId, updateText, statusChange = null) => {
    try {
      const orgId = user?.organizationId;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await quarterlyPrioritiesService.addPriorityUpdate(orgId, teamId, priorityId, updateText, statusChange);
      
      // Refresh data to show new update
      await fetchQuarterlyData();
    } catch (err) {
      console.error('Failed to add update:', err);
      setError('Failed to add update');
    }
  };

  const handleCreatePriority = async () => {
    try {
      const [quarter, year] = selectedQuarter.split(' ');
      const orgId = user?.organizationId;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      const priorityData = {
        ...priorityForm,
        quarter,
        year: parseInt(year)
      };
      
      console.log('Creating priority with data:', priorityData);
      console.log('isCompanyPriority value:', priorityForm.isCompanyPriority, 'type:', typeof priorityForm.isCompanyPriority);
      
      await quarterlyPrioritiesService.createPriority(orgId, teamId, priorityData);
      
      setShowAddPriority(false);
      setPriorityForm({
        title: '',
        description: '',
        ownerId: '',
        dueDate: '',
        isCompanyPriority: false,
        milestones: []
      });
      setNewMilestoneForm({ title: '', dueDate: '' });
      
      // Refresh data
      await fetchQuarterlyData();
    } catch (err) {
      console.error('Failed to create priority:', err);
      setError('Failed to create priority');
    }
  };

  const handleDeletePriority = async (priorityId) => {
    if (!window.confirm('Are you sure you want to delete this priority?')) {
      return;
    }
    
    try {
      const orgId = user?.organizationId;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await quarterlyPrioritiesService.deletePriority(orgId, teamId, priorityId);
      
      // Refresh data
      await fetchQuarterlyData();
    } catch (err) {
      console.error('Failed to delete priority:', err);
      setError('Failed to delete priority');
    }
  };

  const quarters = ['Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];

  // Calculate stats without "at-risk"
  const allPriorities = [
    ...companyPriorities,
    ...Object.values(teamMemberPriorities).flat()
  ];
  
  const stats = {
    total: allPriorities.length,
    completed: allPriorities.filter(p => p.status === 'complete').length,
    onTrack: allPriorities.filter(p => p.status === 'on-track').length,
    offTrack: allPriorities.filter(p => p.status === 'off-track').length
  };

  const PriorityCard = ({ priority, isCompany = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);
    const [updateText, setUpdateText] = useState('');
    const [updateStatusChange, setUpdateStatusChange] = useState(null);
    const [showAddMilestone, setShowAddMilestone] = useState(false);
    const [editingMilestoneId, setEditingMilestoneId] = useState(null);
    const [milestoneForm, setMilestoneForm] = useState({
      title: '',
      dueDate: ''
    });
    const [editForm, setEditForm] = useState({
      title: priority.title,
      description: priority.description,
      status: priority.status,
      progress: priority.progress,
      dueDate: priority.dueDate,
      ownerId: priority.owner.id
    });

    const handleSave = () => {
      handleUpdatePriority(priority.id, editForm);
      setIsEditing(false);
    };

    const handleAddUpdateSubmit = () => {
      handleAddUpdate(priority.id, updateText, updateStatusChange);
      setUpdateText('');
      setUpdateStatusChange(null);
      setShowUpdateDialog(false);
    };

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(isEditing ? editForm.status : priority.status)}`} />
                {isEditing ? (
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="flex-1 font-semibold"
                  />
                ) : (
                  <CardTitle className="text-lg">{priority.title}</CardTitle>
                )}
                {isCompany && (
                  <Badge variant="outline" className="bg-blue-50">
                    <Building2 className="h-3 w-3 mr-1" />
                    Company Priority
                  </Badge>
                )}
                <Badge 
                  variant={getStatusBadgeVariant(isEditing ? editForm.status : priority.status)} 
                  className={`flex items-center space-x-1 ${
                    (isEditing ? editForm.status : priority.status) === 'on-track' ? 'bg-green-100 text-green-800 border-green-300' :
                    (isEditing ? editForm.status : priority.status) === 'off-track' ? 'bg-red-100 text-red-800 border-red-300' :
                    (isEditing ? editForm.status : priority.status) === 'complete' ? 'bg-gray-100 text-gray-800 border-gray-300' : ''
                  }`}
                >
                  {getStatusIcon(isEditing ? editForm.status : priority.status)}
                  <span className="capitalize">{(isEditing ? editForm.status : priority.status).replace('-', ' ')}</span>
                </Badge>
              </div>
              {isEditing ? (
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="mt-2"
                  rows={2}
                />
              ) : (
                <CardDescription className="text-base">
                  {priority.description}
                </CardDescription>
              )}
            </div>
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeletePriority(priority.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress and Details */}
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Owner</Label>
                {isEditing ? (
                  <Select
                    value={editForm.ownerId}
                    onValueChange={(value) => setEditForm({ ...editForm, ownerId: value })}
                  >
                    <SelectTrigger className="h-8 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center space-x-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getUserInitials(priority.owner.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{priority.owner.name}</span>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-sm text-gray-600">Due Date</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editForm.dueDate ? new Date(editForm.dueDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <div className="flex items-center space-x-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{formatDate(priority.dueDate)}</span>
                    <span className="text-xs text-gray-500">
                      ({getDaysUntilDue(priority.dueDate)} days)
                    </span>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-sm text-gray-600">Status</Label>
                {isEditing ? (
                  <Select
                    value={editForm.status}
                    onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                  >
                    <SelectTrigger className="h-8 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on-track">On Track</SelectItem>
                      <SelectItem value="off-track">Off Track</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1">
                    <Badge variant={getStatusBadgeVariant(priority.status)}>
                      {priority.status.replace('-', ' ')}
                    </Badge>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-sm text-gray-600">Progress</Label>
                <div className="mt-1">
                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editForm.progress}
                        onChange={(e) => setEditForm({ ...editForm, progress: parseInt(e.target.value) || 0 })}
                        className="w-20 h-8"
                      />
                    ) : (
                      <>
                        <Progress value={priority.progress} className="flex-1" />
                        <span className="text-sm font-medium">{priority.progress}%</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm text-gray-600">Milestones</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddMilestone(true)}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Milestone
                </Button>
              </div>
              <div className="space-y-2">
                {priority.milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center space-x-3 group">
                    <input
                      type="checkbox"
                      checked={milestone.completed}
                      onChange={(e) => handleUpdateMilestone(priority.id, milestone.id, e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    {editingMilestoneId === milestone.id ? (
                      <>
                        <Input
                          value={milestoneForm.title}
                          onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                          className="flex-1 text-sm"
                          placeholder="Milestone title"
                        />
                        <Input
                          type="date"
                          value={milestoneForm.dueDate}
                          onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                          className="w-32 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            handleEditMilestone(priority.id, milestone.id, milestoneForm);
                            setEditingMilestoneId(null);
                          }}
                        >
                          <CheckSquare className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingMilestoneId(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className={`text-sm flex-1 ${milestone.completed ? 'line-through text-gray-500' : ''}`}>
                          {milestone.title}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(milestone.dueDate)}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingMilestoneId(milestone.id);
                              setMilestoneForm({
                                title: milestone.title,
                                dueDate: milestone.dueDate
                              });
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this milestone?')) {
                                handleDeleteMilestone(priority.id, milestone.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {showAddMilestone && (
                  <div className="flex items-center space-x-3 mt-2">
                    <Input
                      value={milestoneForm.title}
                      onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                      placeholder="New milestone title"
                      className="flex-1 text-sm"
                    />
                    <Input
                      type="date"
                      value={milestoneForm.dueDate}
                      onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                      className="w-32 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        handleCreateMilestone(priority.id, milestoneForm);
                        setMilestoneForm({ title: '', dueDate: '' });
                        setShowAddMilestone(false);
                      }}
                      disabled={!milestoneForm.title || !milestoneForm.dueDate}
                    >
                      <CheckSquare className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowAddMilestone(false);
                        setMilestoneForm({ title: '', dueDate: '' });
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Latest Update */}
            {priority.latestUpdate && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm text-gray-600">Latest Update</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUpdateDialog(true)}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Update
                  </Button>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{priority.latestUpdate.author}</span>
                    <span className="text-xs text-gray-500">{formatDate(priority.latestUpdate.date)}</span>
                  </div>
                  <p className="text-sm text-gray-700">{priority.latestUpdate.text}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {/* Add Update Dialog */}
        <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Update</DialogTitle>
              <DialogDescription>
                Share progress or any blockers for this priority
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="What's the latest status?"
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                rows={4}
              />
              <div>
                <Label htmlFor="statusChange">Update Status (optional)</Label>
                <Select
                  value={updateStatusChange || ''}
                  onValueChange={(value) => setUpdateStatusChange(value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Keep current status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Keep current status</SelectItem>
                    <SelectItem value="on-track">On Track</SelectItem>
                    <SelectItem value="off-track">Off Track</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddUpdateSubmit}>
                Add Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quarterly Priorities</h1>
          <p className="text-gray-600 mt-2">
            Track progress on your most important initiatives for {selectedQuarter}
          </p>
        </div>
        <div className="flex space-x-2">
          <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {quarters.map(quarter => (
                <SelectItem key={quarter} value={quarter}>{quarter}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => {
            // Set default owner to current user when opening dialog
            setPriorityForm({
              ...priorityForm,
              ownerId: user?.id || ''
            });
            setShowAddPriority(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Priority
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Priorities</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">On Track</p>
                <p className="text-2xl font-bold text-blue-600">{stats.onTrack}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Off Track</p>
                <p className="text-2xl font-bold text-red-600">{stats.offTrack}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Predictions Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quarterly Predictions</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingPredictions(!editingPredictions)}
            >
              {editingPredictions ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            </Button>
          </div>
          <CardDescription>
            Revenue, profit and measurables forecasts for {selectedQuarter}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <Label className="text-base font-semibold">Revenue</Label>
              </div>
              {editingPredictions ? (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Target</Label>
                    <Input
                      type="number"
                      value={predictions.revenue.target}
                      onChange={(e) => setPredictions({
                        ...predictions,
                        revenue: { ...predictions.revenue, target: parseFloat(e.target.value) || 0 }
                      })}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Current</Label>
                    <Input
                      type="number"
                      value={predictions.revenue.current}
                      onChange={(e) => setPredictions({
                        ...predictions,
                        revenue: { ...predictions.revenue, current: parseFloat(e.target.value) || 0 }
                      })}
                      className="h-8"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-2xl font-bold">${(predictions.revenue.current / 1000000).toFixed(1)}M</p>
                  <p className="text-sm text-gray-600">Target: ${(predictions.revenue.target / 1000000).toFixed(1)}M</p>
                  <Progress 
                    value={(predictions.revenue.current / predictions.revenue.target) * 100} 
                    className="mt-2"
                  />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <BarChart className="h-5 w-5 text-blue-600" />
                <Label className="text-base font-semibold">Profit</Label>
              </div>
              {editingPredictions ? (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Target</Label>
                    <Input
                      type="number"
                      value={predictions.profit.target}
                      onChange={(e) => setPredictions({
                        ...predictions,
                        profit: { ...predictions.profit, target: parseFloat(e.target.value) || 0 }
                      })}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Current</Label>
                    <Input
                      type="number"
                      value={predictions.profit.current}
                      onChange={(e) => setPredictions({
                        ...predictions,
                        profit: { ...predictions.profit, current: parseFloat(e.target.value) || 0 }
                      })}
                      className="h-8"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-2xl font-bold">${(predictions.profit.current / 1000000).toFixed(1)}M</p>
                  <p className="text-sm text-gray-600">Target: ${(predictions.profit.target / 1000000).toFixed(1)}M</p>
                  <Progress 
                    value={(predictions.profit.current / predictions.profit.target) * 100} 
                    className="mt-2"
                  />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-5 w-5 text-purple-600" />
                <Label className="text-base font-semibold">Measurables</Label>
              </div>
              {editingPredictions ? (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">On Track</Label>
                    <Input
                      type="number"
                      value={predictions.measurables.onTrack}
                      onChange={(e) => setPredictions({
                        ...predictions,
                        measurables: { ...predictions.measurables, onTrack: parseInt(e.target.value) || 0 }
                      })}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Total</Label>
                    <Input
                      type="number"
                      value={predictions.measurables.total}
                      onChange={(e) => setPredictions({
                        ...predictions,
                        measurables: { ...predictions.measurables, total: parseInt(e.target.value) || 0 }
                      })}
                      className="h-8"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-2xl font-bold">{predictions.measurables.onTrack}/{predictions.measurables.total}</p>
                  <p className="text-sm text-gray-600">Measurables on track</p>
                  <Progress 
                    value={(predictions.measurables.onTrack / predictions.measurables.total) * 100} 
                    className="mt-2"
                  />
                </div>
              )}
            </div>
          </div>
          {editingPredictions && (
            <div className="flex justify-end mt-4">
              <Button onClick={handleSavePredictions} size="sm">
                Save Predictions
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Priorities */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Building2 className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Company Priorities</h2>
        </div>
        {companyPriorities.map(priority => (
          <PriorityCard key={priority.id} priority={priority} isCompany={true} />
        ))}
      </div>

      {/* Team Member Priorities */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold">Individual Priorities</h2>
        </div>
        {teamMembers.map(member => {
          const memberPriorities = teamMemberPriorities[member.id] || [];
          if (memberPriorities.length === 0) return null;

          return (
            <div key={member.id} className="space-y-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getUserInitials(member.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{member.name}</h3>
                  <p className="text-sm text-gray-600">{member.role} • {member.department}</p>
                </div>
              </div>
              {memberPriorities.map(priority => (
                <PriorityCard key={priority.id} priority={priority} />
              ))}
            </div>
          );
        })}
      </div>

      {/* Add Priority Dialog */}
      <Dialog open={showAddPriority} onOpenChange={setShowAddPriority}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Priority</DialogTitle>
            <DialogDescription>
              Create a new quarterly priority for {selectedQuarter}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={priorityForm.title}
                onChange={(e) => setPriorityForm({ ...priorityForm, title: e.target.value })}
                placeholder="Enter priority title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={priorityForm.description}
                onChange={(e) => setPriorityForm({ ...priorityForm, description: e.target.value })}
                placeholder="Describe what needs to be accomplished"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="owner">Owner</Label>
                <Select
                  value={priorityForm.ownerId}
                  onValueChange={(value) => setPriorityForm({ ...priorityForm, ownerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.length > 0 ? (
                      teamMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value={user?.id || 'current-user'}>
                        {user?.firstName && user?.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user?.email || 'Current User'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={priorityForm.dueDate}
                  onChange={(e) => setPriorityForm({ ...priorityForm, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isCompany"
                checked={priorityForm.isCompanyPriority}
                onChange={(e) => setPriorityForm({ ...priorityForm, isCompanyPriority: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isCompany">This is a company-wide priority</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPriority(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePriority}>
              Create Priority
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuarterlyPrioritiesPage;