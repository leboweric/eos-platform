import { useOutletContext } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { quarterlyPrioritiesService } from '../../services/quarterlyPrioritiesService';
import { useAuthStore } from '../../stores/authStore';
import PriorityCard from '../../components/priorities/PriorityCardClean';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Plus, Target, Loader2, AlertCircle, ChevronRight, ChevronDown, Check, X, CheckCircle, Edit } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, startOfQuarter, getQuarter, getYear, addDays } from 'date-fns';
import { useTerminology } from '../../contexts/TerminologyContext';

const DepartmentPrioritiesPage = () => {
  const { department } = useOutletContext();
  const { user } = useAuthStore();
  const { labels } = useTerminology();
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddPriority, setShowAddPriority] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [creatingPriority, setCreatingPriority] = useState(false);
  
  // Additional state for new priorities display pattern
  const [expandedPriorities, setExpandedPriorities] = useState({});
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null);
  const [addingMilestoneFor, setAddingMilestoneFor] = useState(null);
  const [newMilestone, setNewMilestone] = useState({ title: '', dueDate: '' });
  const [success, setSuccess] = useState(null);
  
  // Form state for new priority
  const [priorityForm, setPriorityForm] = useState({
    title: '',
    description: '',
    ownerId: '',
    dueDate: '',
    isCompanyPriority: false
  });
  
  // Get current quarter and year
  const currentDate = new Date();
  const quarter = `Q${getQuarter(currentDate)}`;
  const currentYear = getYear(currentDate);

  useEffect(() => {
    if (department) {
      fetchPriorities();
    }
  }, [department]);

  const fetchPriorities = async () => {
    try {
      setLoading(true);
      const orgId = user?.organizationId || user?.organization_id;
      
      // Use the department's first team ID if available, otherwise use department ID
      const teamId = department.teams && department.teams.length > 0 
        ? department.teams[0].id 
        : department.id;
      
      const data = await quarterlyPrioritiesService.getCurrentPriorities(orgId, teamId);
      
      // NINETY.IO MODEL: Show all department priorities (cross-visibility)
      setPriorities(data.companyPriorities || []);
      
      // Add visual indicators for team ownership
      const prioritiesWithTeamInfo = (data.companyPriorities || []).map(priority => ({
        ...priority,
        teamContext: priority.teamName || 'Unknown Team'
      }));
      setPriorities(prioritiesWithTeamInfo);
    } catch (error) {
      console.error('Error fetching department priorities:', error);
      setError('Failed to load priorities');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreatePriority = async () => {
    try {
      setCreatingPriority(true);
      setError(null);
      
      // Validation
      if (!priorityForm.title.trim()) {
        setError('Please enter a priority title');
        return;
      }
      
      if (!priorityForm.ownerId) {
        setError('Please select an owner');
        return;
      }
      
      // IMPORTANT: Prevent creating Company Priorities from department pages
      if (priorityForm.isCompanyPriority) {
        setError('Company Priorities can only be created from the Leadership Team page. Please uncheck "This is a company-wide priority" to create a department priority.');
        return;
      }
      
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = department.teams && department.teams.length > 0 
        ? department.teams[0].id 
        : department.id;
      
      const priorityData = {
        ...priorityForm,
        quarter,
        year: currentYear,
        // Ensure isCompanyPriority is false for department priorities
        isCompanyPriority: false
      };
      
      await quarterlyPrioritiesService.createPriority(orgId, teamId, priorityData);
      
      // Reset form and close dialog
      setPriorityForm({
        title: '',
        description: '',
        ownerId: '',
        dueDate: '',
        isCompanyPriority: false
      });
      setShowAddPriority(false);
      
      // Refresh priorities
      await fetchPriorities();
    } catch (error) {
      console.error('Error creating priority:', error);
      setError(error.response?.data?.error || 'Failed to create priority');
    } finally {
      setCreatingPriority(false);
    }
  };

  // Handler functions for the new priorities display pattern
  const handleUpdatePriority = async (priorityId, updates) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = department.teams && department.teams.length > 0 
        ? department.teams[0].id 
        : department.id;
      
      await quarterlyPrioritiesService.updatePriority(orgId, effectiveTeamId, priorityId, updates);
      
      // Update local state
      setPriorities(prev => prev.map(p => 
        p.id === priorityId ? { ...p, ...updates } : p
      ));
      
      setSuccess('Priority updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to update priority:', error);
      setError('Failed to update priority');
    }
  };

  const handleToggleMilestone = async (priorityId, milestoneId, checked) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = department.teams && department.teams.length > 0 
        ? department.teams[0].id 
        : department.id;
      
      // First update the milestone
      await quarterlyPrioritiesService.updateMilestone(orgId, effectiveTeamId, priorityId, milestoneId, { completed: checked });
      
      // Update local state and recalculate progress
      const updatePriorityWithProgress = (p) => {
        if (p.id !== priorityId) return p;
        
        const updatedMilestones = p.milestones?.map(m => 
          m.id === milestoneId ? { ...m, completed: checked } : m
        ) || [];
        
        const completedCount = updatedMilestones.filter(m => m.completed).length;
        const totalCount = updatedMilestones.length;
        const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        const newStatus = newProgress === 100 ? 'complete' : 
                         newProgress === 0 ? 'off-track' : 'on-track';
        
        return {
          ...p,
          milestones: updatedMilestones,
          progress: newProgress,
          status: newStatus
        };
      };
      
      // Update priorities in state
      setPriorities(prev => prev.map(updatePriorityWithProgress));
      
      setSuccess('Milestone updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to update milestone:', error);
      setError('Failed to update milestone');
    }
  };

  const handleAddMilestone = async (priorityId) => {
    if (!newMilestone.title.trim()) return;
    
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const effectiveTeamId = department.teams && department.teams.length > 0 
        ? department.teams[0].id 
        : department.id;
      
      const milestoneData = {
        title: newMilestone.title,
        dueDate: newMilestone.dueDate || null,
        completed: false
      };
      
      await quarterlyPrioritiesService.createMilestone(orgId, effectiveTeamId, priorityId, milestoneData);
      
      // Refresh priorities to get the new milestone
      fetchPriorities();
      
      // Reset form
      setNewMilestone({ title: '', dueDate: '' });
      setAddingMilestoneFor(null);
      
      setSuccess('Milestone added');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to add milestone:', error);
      setError('Failed to add milestone');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quarterly Priorities</h2>
          <p className="text-gray-600 mt-1">
            Department priorities for {department.name}
          </p>
        </div>
        <Button onClick={() => setShowAddPriority(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Priority
        </Button>
      </div>

      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

{(() => {
        // Group priorities by owner
        const prioritiesByOwner = priorities.reduce((acc, priority) => {
          const ownerId = priority.owner?.id || 'unassigned';
          const ownerName = priority.owner?.name || 'Unassigned';
          if (!acc[ownerId]) {
            acc[ownerId] = {
              id: ownerId,
              name: ownerName,
              priorities: []
            };
          }
          acc[ownerId].priorities.push(priority);
          return acc;
        }, {});

        // Convert to array and sort by name
        const owners = Object.values(prioritiesByOwner).sort((a, b) => {
          if (a.id === 'unassigned') return 1;
          if (b.id === 'unassigned') return -1;
          return (a.name || '').localeCompare(b.name || '');
        });

        if (priorities.length === 0) {
          return (
            <Card className="bg-white border-slate-200 shadow-md">
              <CardContent className="text-center py-8">
                <Target className="h-12 w-12 text-gray-400 mb-4 mx-auto" />
                <p className="text-slate-500 font-medium">No {labels.priorities_label?.toLowerCase() || 'priorities'} found for this department.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowAddPriority(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add {labels.priority || 'Priority'}
                </Button>
              </CardContent>
            </Card>
          );
        }

        return (
          <div className="space-y-6">
            {owners.map(owner => (
              <Card key={owner.id} className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-slate-100">
                        <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 font-semibold">
                          {owner.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{owner.name}</h3>
                        <p className="text-sm text-slate-500">{owner.priorities.length} {labels?.priority_singular || 'Rock'}{owner.priorities.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {/* Header Row */}
                    <div className="flex items-center px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      <div className="w-8"></div>
                      <div className="w-10 ml-2">Status</div>
                      <div className="flex-1 ml-3">Title</div>
                      <div className="w-40 text-center">Milestone Progress</div>
                      <div className="w-20 text-right">Due By</div>
                      <div className="w-8"></div>
                    </div>
                    
                    {/* Priority Rows */}
                    {owner.priorities.map(priority => {
                      const isComplete = priority.status === 'complete' || priority.status === 'completed';
                      const isOnTrack = priority.status === 'on-track';
                      const completedMilestones = (priority.milestones || []).filter(m => m.completed).length;
                      const totalMilestones = (priority.milestones || []).length;
                      const isExpanded = expandedPriorities[priority.id];
                      
                      return (
                        <div key={priority.id} className="border-b border-slate-100 last:border-0">
                          {/* Main Priority Row */}
                          <div className="flex items-center px-3 py-3 hover:bg-slate-50 rounded-lg transition-colors group">
                            {/* Expand Arrow */}
                            <div 
                              className="w-8 flex items-center justify-center cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedPriorities(prev => ({
                                  ...prev,
                                  [priority.id]: !prev[priority.id]
                                }));
                              }}
                            >
                              <ChevronRight 
                                className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-90' : ''
                                }`} 
                              />
                            </div>
                            
                            {/* Status Indicator with Dropdown */}
                            <div className="w-10 ml-2 flex items-center relative status-dropdown">
                              <div 
                                className="flex items-center justify-center w-7 h-7 rounded-full cursor-pointer hover:scale-110 transition-transform"
                                style={{
                                  backgroundColor: 
                                    priority.status === 'cancelled' ? '#6B728020' :
                                    isComplete ? '#10B98120' : 
                                    (isOnTrack ? '#10B98120' : '#EF444420'),
                                  border: `2px solid ${
                                    priority.status === 'cancelled' ? '#6B7280' :
                                    isComplete ? '#10B981' : 
                                    (isOnTrack ? '#10B981' : '#EF4444')
                                  }`
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenStatusDropdown(openStatusDropdown === priority.id ? null : priority.id);
                                }}
                              >
                                {priority.status === 'cancelled' ? (
                                  <X className="h-4 w-4 text-gray-500" />
                                ) : isComplete ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : isOnTrack ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <X className="h-4 w-4 text-red-600" />
                                )}
                              </div>
                              
                              {/* Status Dropdown */}
                              {openStatusDropdown === priority.id && (
                                <div className="absolute top-8 left-0 z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px]">
                                  <button
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await handleUpdatePriority(priority.id, { status: 'on-track' });
                                      setOpenStatusDropdown(null);
                                    }}
                                  >
                                    <div className="w-4 h-4 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center">
                                      {priority.status === 'on-track' && <Check className="h-3 w-3 text-green-600" />}
                                    </div>
                                    <span className={priority.status === 'on-track' ? 'font-medium' : ''}>On Track</span>
                                  </button>
                                  
                                  <button
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await handleUpdatePriority(priority.id, { status: 'off-track' });
                                      setOpenStatusDropdown(null);
                                    }}
                                  >
                                    <div className="w-4 h-4 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center">
                                      {priority.status === 'off-track' && <X className="h-3 w-3 text-red-600" />}
                                    </div>
                                    <span className={priority.status === 'off-track' ? 'font-medium' : ''}>Off Track</span>
                                  </button>
                                  
                                  <button
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await handleUpdatePriority(priority.id, { status: 'complete' });
                                      setOpenStatusDropdown(null);
                                    }}
                                  >
                                    <div className="w-4 h-4 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center">
                                      {priority.status === 'complete' && <CheckCircle className="h-3 w-3 text-green-600" />}
                                    </div>
                                    <span className={priority.status === 'complete' ? 'font-medium' : ''}>Complete</span>
                                  </button>
                                  
                                  <div className="border-t border-slate-100 my-1"></div>
                                  
                                  <button
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await handleUpdatePriority(priority.id, { status: 'cancelled' });
                                      setOpenStatusDropdown(null);
                                    }}
                                  >
                                    <div className="w-4 h-4 rounded-full bg-gray-100 border-2 border-gray-500 flex items-center justify-center">
                                      {priority.status === 'cancelled' && <X className="h-3 w-3 text-gray-500" />}
                                    </div>
                                    <span className={priority.status === 'cancelled' ? 'font-medium' : ''}>Cancelled</span>
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            {/* Title */}
                            <div className="flex-1 ml-3">
                              <span className={`font-medium ${isComplete ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                {priority.title}
                              </span>
                              {priority.priority_type === 'company' && (
                                <Badge variant="outline" className="ml-2 text-xs">Company</Badge>
                              )}
                            </div>
                            
                            {/* Milestone Progress */}
                            <div className="w-40 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-sm text-slate-600">
                                  {completedMilestones}/{totalMilestones}
                                </span>
                                <Progress value={totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0} className="w-16 h-2" />
                              </div>
                            </div>
                            
                            {/* Due Date */}
                            <div className="w-20 text-right">
                              <span className="text-sm text-slate-600">
                                {priority.dueDate ? format(new Date(priority.dueDate), 'MMM d') : '-'}
                              </span>
                            </div>
                            
                            {/* Actions */}
                            <div className="w-8 flex items-center justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Edit className="h-4 w-4 text-slate-400" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Expanded Milestones Section */}
                          {isExpanded && (
                            <div className="ml-12 mr-4 mb-3 p-3 bg-slate-50 rounded-lg">
                              <div className="space-y-2">
                                {(priority.milestones || []).map(milestone => (
                                  <div key={milestone.id} className="flex items-center gap-3">
                                    <Checkbox
                                      checked={milestone.completed}
                                      onCheckedChange={async (checked) => {
                                        await handleToggleMilestone(priority.id, milestone.id, checked);
                                      }}
                                      className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                    />
                                    <span className={`text-sm flex-1 ${milestone.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                      {milestone.title}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      {milestone.dueDate ? format(new Date(milestone.dueDate), 'MMM d') : ''}
                                    </span>
                                  </div>
                                ))}
                                
                                {/* Milestones Section with Elegant Design */}
                                {(priority.milestones || []).length === 0 && addingMilestoneFor !== priority.id ? (
                                  <div className="space-y-3">
                                    <div className="border border-slate-200 rounded-lg p-4 bg-white/50">
                                      <p className="text-sm text-slate-500 text-center mb-3">No milestones added</p>
                                      <Button
                                        variant="outline"
                                        className="w-full border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                                        onClick={() => {
                                          setAddingMilestoneFor(priority.id);
                                          setNewMilestone({ 
                                            title: '', 
                                            dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd')
                                          });
                                        }}
                                      >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Milestone
                                      </Button>
                                    </div>
                                  </div>
                                ) : null}
                                
                                {/* Add Milestone Inline */}
                                {addingMilestoneFor === priority.id ? (
                                  <div className="flex items-center gap-2 mt-2">
                                    <Input
                                      value={newMilestone.title}
                                      onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                                      placeholder="Milestone description..."
                                      className="flex-1 h-8 text-sm"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newMilestone.title.trim()) {
                                          handleAddMilestone(priority.id);
                                        }
                                        if (e.key === 'Escape') {
                                          setAddingMilestoneFor(null);
                                          setNewMilestone({ title: '', dueDate: '' });
                                        }
                                      }}
                                    />
                                    <Input
                                      type="date"
                                      value={newMilestone.dueDate}
                                      onChange={(e) => setNewMilestone(prev => ({ ...prev, dueDate: e.target.value }))}
                                      className="w-32 h-8 text-sm"
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 hover:bg-green-100"
                                      onClick={() => handleAddMilestone(priority.id)}
                                    >
                                      <Check className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 hover:bg-red-100"
                                      onClick={() => {
                                        setAddingMilestoneFor(null);
                                        setNewMilestone({ title: '', dueDate: '' });
                                      }}
                                    >
                                      <X className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (priority.milestones || []).length > 0 ? (
                                  <button
                                    className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mt-2"
                                    onClick={() => {
                                      setAddingMilestoneFor(priority.id);
                                      setNewMilestone({ 
                                        title: '', 
                                        dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd')
                                      });
                                    }}
                                  >
                                    <Plus className="h-3 w-3" />
                                    Add Milestone
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      })()}
      
      {/* Add Priority Dialog */}
      <Dialog open={showAddPriority} onOpenChange={setShowAddPriority}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Department Priority</DialogTitle>
            <DialogDescription>
              Create a new priority for {department?.name} - Q{getQuarter(currentDate)} {currentYear}
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
                    <SelectItem value={user?.id || 'current-user'}>
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user?.email || 'Current User'}
                    </SelectItem>
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
            
            {/* Company Priority Checkbox with Warning */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isCompany"
                  checked={priorityForm.isCompanyPriority}
                  onChange={(e) => setPriorityForm({ ...priorityForm, isCompanyPriority: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isCompany" className="cursor-pointer">
                  This is a company-wide priority
                </Label>
              </div>
              {priorityForm.isCompanyPriority && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    Company Priorities can only be created from the Leadership Team page. 
                    This option will be ignored for department priorities.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPriority(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePriority} disabled={creatingPriority}>
              {creatingPriority ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Priority'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartmentPrioritiesPage;