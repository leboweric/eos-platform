import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Save, 
  AlertCircle, 
  Calendar, 
  User, 
  Paperclip, 
  X, 
  Download, 
  AlertTriangle, 
  Target,
  Plus,
  CheckSquare,
  MessageSquare,
  Trash2,
  Edit2,
  Archive,
  TrendingUp,
  TrendingDown,
  Link,
  Sparkles
} from 'lucide-react';
import { quarterlyPrioritiesService } from '../../services/quarterlyPrioritiesService';
import { useAuthStore } from '../../stores/authStore';
import { useTerminology } from '../../contexts/TerminologyContext';
import { format } from 'date-fns';
import { getOrgTheme } from '../../utils/themeUtils';
import TeamMemberSelect from '../shared/TeamMemberSelect';

const PriorityDialog = ({ 
  open, 
  onOpenChange, 
  priority, 
  teamMembers, 
  teamId,
  onSave,
  onUpdate,
  onArchive,
  onDelete,
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
  onToggleMilestone,
  onAddUpdate,
  onEditUpdate,
  onDeleteUpdate,
  onUploadAttachment,
  onDownloadAttachment,
  onDeleteAttachment,
  onCreateLinkedIssue,
  onGenerateActionPlan
}) => {
  const { user } = useAuthStore();
  const { labels } = useTerminology();
  const [activeTab, setActiveTab] = useState('details');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'on-track',
    progress: 0,
    dueDate: '',
    ownerId: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });

  // Milestone states
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', dueDate: '', ownerId: '' });
  const [editingMilestoneId, setEditingMilestoneId] = useState(null);
  const [editingMilestone, setEditingMilestone] = useState({ title: '', dueDate: '', ownerId: '' });

  // Update states
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [editingUpdateId, setEditingUpdateId] = useState(null);
  const [editingUpdateText, setEditingUpdateText] = useState('');

  // Sharing states
  const [availableTeams, setAvailableTeams] = useState([]);
  const [sharedWithTeamIds, setSharedWithTeamIds] = useState([]);
  const [loadingShares, setLoadingShares] = useState(false);
  
  // Calculate actual progress from milestones
  const calculatedProgress = priority?.milestones && priority.milestones.length > 0
    ? Math.round((priority.milestones.filter(m => m.completed).length / priority.milestones.length) * 100)
    : formData.progress;

  useEffect(() => {
    const fetchTheme = async () => {
      const orgId = user?.organizationId || user?.organization_id;
      if (orgId) {
        const theme = await getOrgTheme(orgId);
        // Only update if theme is not null and has required properties
        if (theme && theme.primary && theme.secondary) {
          setThemeColors(theme);
        }
      }
    };
    fetchTheme();
  }, [user]);

  useEffect(() => {
    if (priority) {
      setFormData({
        title: priority.title || '',
        description: priority.description || '',
        status: priority.status || 'on-track',
        progress: priority.progress || 0,
        dueDate: priority.dueDate ? priority.dueDate.split('T')[0] : '',
        ownerId: priority.owner?.id || priority.owner_id || '',
        isCompanyPriority: priority.isCompanyPriority || priority.is_company_priority || priority.priority_type === 'company' || false
      });
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'on-track',
        progress: 0,
        dueDate: '',
        ownerId: '',
        isCompanyPriority: false
      });
    }
    setFiles([]);
    setError(null);
    // Only reset to details tab when dialog is opened (priority changes from null to object)
    // Don't reset when priority is just updated (milestones added/removed)
  }, [priority?.id]); // Only depend on ID, not the entire object
  
  // Update status when milestones change (priority object updates)
  useEffect(() => {
    if (priority && priority.status !== formData.status) {
      setFormData(prev => ({ ...prev, status: priority.status }));
    }
  }, [priority?.status]);
  
  // Reset tab to details only when dialog opens/closes
  useEffect(() => {
    if (open) {
      setActiveTab('details');
    }
  }, [open]);

  // Load sharing data when priority changes
  useEffect(() => {
    const loadSharingData = async () => {
      console.log('[PriorityDialog] loadSharingData called with:', { 
        priorityId: priority?.id, 
        teamId, 
        orgId: user?.organizationId,
        open 
      });
      
      if (!priority?.id || !teamId || !user?.organizationId) {
        console.log('[PriorityDialog] Skipping sharing data load - missing required params');
        return;
      }
      
      try {
        setLoadingShares(true);
        console.log('[PriorityDialog] Loading available teams...');
        
        // Load available teams
        const teams = await quarterlyPrioritiesService.getAvailableTeamsForSharing(
          user.organizationId,
          teamId
        );
        console.log('[PriorityDialog] Available teams response:', teams);
        setAvailableTeams(teams || []);
        
        // Load current shares
        console.log('[PriorityDialog] Loading current shares...');
        const shares = await quarterlyPrioritiesService.getPriorityShares(
          user.organizationId,
          teamId,
          priority.id
        );
        console.log('[PriorityDialog] Current shares response:', shares);
        setSharedWithTeamIds(shares?.map(s => s.team_id) || []);
      } catch (error) {
        console.error('[PriorityDialog] Error loading sharing data:', error);
        console.error('[PriorityDialog] Error details:', error.response?.data || error.message);
      } finally {
        setLoadingShares(false);
      }
    };
    
    if (open && priority?.id) {
      console.log('[PriorityDialog] Conditions met, calling loadSharingData');
      loadSharingData();
    } else {
      console.log('[PriorityDialog] Conditions NOT met for loading sharing data:', { open, priorityId: priority?.id });
    }
  }, [priority?.id, open, teamId, user?.organizationId]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete': return '#10B981';
      case 'on-track': return themeColors.primary;
      case 'off-track': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete': return <CheckSquare className="h-4 w-4" />;
      case 'on-track': return <TrendingUp className="h-4 w-4" />;
      case 'off-track': return <TrendingDown className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      // Calculate current progress from milestones (but NOT status - keep them decoupled)
      let currentProgress = formData.progress;
      
      if (priority?.milestones && priority.milestones.length > 0) {
        const completedCount = priority.milestones.filter(m => m.completed).length;
        const totalCount = priority.milestones.length;
        currentProgress = Math.round((completedCount / totalCount) * 100);
        
        console.log('Calculated progress from milestones:', {
          completedCount,
          totalCount,
          currentProgress,
          oldProgress: formData.progress
        });
      }
      
      const priorityData = {
        ...formData,
        progress: currentProgress, // Use calculated progress
        status: formData.status, // Use user-selected status (NOT calculated)
        owner_id: formData.ownerId,
        due_date: formData.dueDate,
        is_company_priority: formData.isCompanyPriority || false,
        priority_type: formData.isCompanyPriority ? 'company' : 'individual'
      };

      if (onSave) {
        await onSave(priorityData);
      } else if (onUpdate && priority) {
        await onUpdate(priority.id, priorityData);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save priority:', error);
      setError(error.message || 'Failed to save priority');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (filesToUpload) => {
    if (!priority?.id || !onUploadAttachment) return;
    
    let successCount = 0;
    let failCount = 0;
    
    for (const file of filesToUpload) {
      try {
        await onUploadAttachment(priority.id, file);
        successCount++;
      } catch (error) {
        console.error('Failed to upload file:', error);
        setError(`Failed to upload ${file.name}`);
        failCount++;
      }
    }
    
    // Show success message
    if (successCount > 0) {
      setSuccess(`Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}`);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileUpload(droppedFiles);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed right-0 top-0 left-auto translate-x-0 translate-y-0 h-screen w-[600px] max-w-[90vw] bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-l border-white/20 dark:border-gray-700/50 shadow-2xl rounded-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-300">
        <div className="h-full overflow-y-auto p-6 flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" style={{ color: themeColors.primary }} />
            {priority ? `Edit ${labels?.priority_singular || 'Priority'}` : `Add ${labels?.priority_singular || 'Priority'}`}
          </DialogTitle>
          {priority && (
            <DialogDescription className="flex items-center gap-4 mt-2">
              <Badge 
                variant="outline" 
                className="flex items-center gap-1"
                style={{ 
                  borderColor: getStatusColor(formData.status),
                  color: getStatusColor(formData.status)
                }}
              >
                {getStatusIcon(formData.status)}
                {formData.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
              <span className="text-sm text-gray-500">
                Progress: {calculatedProgress}%
              </span>
            </DialogDescription>
          )}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col min-h-[500px]">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="milestones" className="flex items-center gap-1">
              {labels?.milestones_label || 'Milestones'}
              {priority?.milestones?.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                  {priority.milestones.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="updates" className="flex items-center gap-1">
              Updates
              {priority?.updates?.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                  {priority.updates.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="attachments" className="flex items-center gap-1">
              Files
              {priority?.attachments?.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                  {priority.attachments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sharing" className="flex items-center gap-1" disabled={!priority}>
              Sharing
              {sharedWithTeamIds.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                  {sharedWithTeamIds.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4 min-h-[400px]">
            <TabsContent value="details" className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4 pt-6">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={`Enter ${labels?.priority_singular || 'priority'} title`}
                    required
                    className="mt-1 bg-transparent dark:bg-gray-700/50"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(content) => setFormData({ ...formData, description: content })}
                    placeholder="Enter description (optional)"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => {
                        // Allow any status change - milestones only affect progress, not status
                        setFormData({ ...formData, status: value });
                      }}
                    >
                      <SelectTrigger id="status" className="mt-1 bg-transparent dark:bg-gray-700/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on-track">On Track</SelectItem>
                        <SelectItem value="off-track">Off Track</SelectItem>
                        <SelectItem value="complete">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="progress">Progress: {calculatedProgress}%</Label>
                    <div className="mt-3">
                      <input
                        type="range"
                        id="progress"
                        min="0"
                        max="100"
                        value={calculatedProgress}
                        onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                        className="w-full"
                        disabled={priority?.milestones && priority.milestones.length > 0}
                        title={priority?.milestones && priority.milestones.length > 0 ? "Progress is calculated from milestone completion" : ""}
                      />
                      <div className="mt-2 bg-gray-200 h-2 w-full overflow-hidden rounded-full">
                        <div 
                          className="h-full transition-all"
                          style={{
                            width: `${calculatedProgress}%`,
                            backgroundColor: themeColors.primary
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="owner">Owner</Label>
                    {teamId ? (
                      <TeamMemberSelect
                        teamId={teamId}
                        value={formData.ownerId}
                        onValueChange={(value) => setFormData({ ...formData, ownerId: value })}
                        placeholder="Select owner"
                        className="mt-1 bg-transparent dark:bg-gray-700/50"
                        includeAllIfLeadership={true}
                        showMemberCount={false}
                      />
                    ) : (
                      // Fallback to original Select if no teamId
                      <Select 
                        value={formData.ownerId} 
                        onValueChange={(value) => setFormData({ ...formData, ownerId: value })}
                      >
                        <SelectTrigger id="owner" className="mt-1 bg-transparent dark:bg-gray-700/50">
                          <SelectValue placeholder="Select owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers?.map(member => (
                            <SelectItem key={member.id} value={String(member.id)}>
                              {member.name || `${member.first_name} ${member.last_name}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="mt-1 bg-transparent dark:bg-gray-700/50"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-blue-50/30 rounded-lg mt-4">
                  <Checkbox
                    id="isCompanyWide"
                    checked={formData.isCompanyPriority || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, isCompanyPriority: checked })}
                    className="bg-white border-gray-300"
                    style={{
                      backgroundColor: formData.isCompanyPriority ? themeColors.primary : undefined,
                      borderColor: formData.isCompanyPriority ? themeColors.primary : undefined
                    }}
                  />
                  <Label htmlFor="isCompanyWide" className="text-sm font-medium cursor-pointer">
                    This is a company-wide priority
                  </Label>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="milestones" className="space-y-4">
              {priority?.milestones?.map((milestone) => (
                <div key={milestone.id} className="p-3 bg-blue-50/30 rounded-lg">
                  {editingMilestoneId === milestone.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editingMilestone.title}
                        onChange={(e) => setEditingMilestone({ ...editingMilestone, title: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (onEditMilestone) {
                              onEditMilestone(priority.id, milestone.id, editingMilestone);
                            }
                            setEditingMilestoneId(null);
                          }
                        }}
                        placeholder="Milestone title"
                        className="bg-white"
                      />
                      <div className="flex gap-2">
                        <Select
                          value={(() => {
                            const currentValue = editingMilestone.ownerId !== '' ? String(editingMilestone.ownerId) : String(milestone.owner_id || priority?.owner?.id || '');
                            console.log('Select value prop:', { 
                              editingOwnerId: editingMilestone.ownerId,
                              milestoneOwnerId: milestone.owner_id,
                              finalValue: currentValue,
                              milestoneId: milestone.id
                            });
                            return currentValue;
                          })()}
                          onValueChange={(value) => {
                            console.log('Milestone owner change:', { 
                              from: editingMilestone.ownerId, 
                              to: value,
                              milestoneId: milestone.id 
                            });
                            setEditingMilestone({ ...editingMilestone, ownerId: value });
                          }}
                        >
                          <SelectTrigger className="flex-1 bg-white">
                            <SelectValue placeholder="Assign to..." />
                          </SelectTrigger>
                          <SelectContent>
                            {teamMembers?.map(member => (
                              <SelectItem key={member.id} value={String(member.id)}>
                                {member.name || `${member.first_name} ${member.last_name}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="date"
                          value={editingMilestone.dueDate}
                          onChange={(e) => setEditingMilestone({ ...editingMilestone, dueDate: e.target.value })}
                          className="bg-white flex-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (onEditMilestone) {
                              onEditMilestone(priority.id, milestone.id, editingMilestone);
                            }
                            setEditingMilestoneId(null);
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingMilestoneId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={milestone.completed}
                          onChange={(e) => onToggleMilestone?.(priority.id, milestone.id, e.target.checked)}
                          className="flex-shrink-0 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                        />
                        <div>
                          <p className={`font-medium ${milestone.completed ? 'line-through text-gray-500' : ''}`}>
                            {milestone.title}
                          </p>
                          <div className="flex items-center gap-3 text-sm">
                            {milestone.owner_name && (
                              <div 
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
                                style={{
                                  background: `linear-gradient(135deg, ${themeColors.primary}10 0%, ${themeColors.secondary}10 100%)`,
                                  borderColor: `${themeColors.primary}30`
                                }}
                              >
                                <User className="h-3 w-3" style={{ color: themeColors.primary }} />
                                <span className="font-medium" style={{ color: themeColors.primary }}>
                                  {milestone.owner_id === priority?.owner?.id ? 
                                    `${milestone.owner_name} (Rock Owner)` : 
                                    milestone.owner_name
                                  }
                                </span>
                              </div>
                            )}
                            {milestone.dueDate && (
                              <div className="inline-flex items-center gap-1.5 text-gray-500">
                                <Calendar className="h-3 w-3" />
                                <span>{format(new Date(milestone.dueDate), 'MMM d, yyyy')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingMilestoneId(milestone.id);
                            setEditingMilestone({
                              title: milestone.title,
                              dueDate: milestone.dueDate?.split('T')[0] || '',
                              ownerId: String(milestone.owner_id || priority?.owner?.id || '')
                            });
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteMilestone?.(priority.id, milestone.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {showAddMilestone ? (
                <div className="p-3 bg-blue-50/30 rounded-lg space-y-2">
                  <Input
                    value={newMilestone.title}
                    onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                    placeholder="Milestone title"
                    autoFocus
                    className="bg-white"
                  />
                  <div className="flex gap-2">
                    <Select
                      value={newMilestone.ownerId !== '' ? String(newMilestone.ownerId) : String(priority?.owner?.id || '')}
                      onValueChange={(value) => setNewMilestone({ ...newMilestone, ownerId: value })}
                    >
                      <SelectTrigger className="flex-1 bg-white">
                        <SelectValue placeholder="Assign to..." />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers?.map(member => (
                          <SelectItem key={member.id} value={String(member.id)}>
                            {member.name || `${member.first_name} ${member.last_name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      value={newMilestone.dueDate}
                      onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })}
                      className="bg-white flex-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (onAddMilestone && newMilestone.title) {
                          // Ensure ownerId is set - use selected value or default to form's current owner
                          const milestoneToAdd = {
                            ...newMilestone,
                            ownerId: newMilestone.ownerId || formData.ownerId || priority?.owner?.id || ''
                          };
                          try {
                            await onAddMilestone(priority.id, milestoneToAdd);
                            // Clear form but keep it open for adding more milestones
                            setNewMilestone({ 
                              title: '', 
                              dueDate: '', 
                              ownerId: newMilestone.ownerId || formData.ownerId || priority?.owner?.id || '' 
                            });
                            // Don't hide the form - let user add more milestones or manually close
                            // setShowAddMilestone(false);
                          } catch (error) {
                            console.error('Failed to add milestone:', error);
                          }
                        }
                      }}
                      className="text-white"
                      style={{
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                      }}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowAddMilestone(false);
                        setNewMilestone({ title: '', dueDate: '', ownerId: '' });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowAddMilestone(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add {labels?.milestones_label?.slice(0, -1) || 'Milestone'}
                </Button>
              )}
            </TabsContent>

            <TabsContent value="updates" className="space-y-4">
              {priority?.updates?.map((update) => (
                <div key={update.id} className="p-3 bg-blue-50/30 rounded-lg">
                  {editingUpdateId === update.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingUpdateText}
                        onChange={(e) => setEditingUpdateText(e.target.value)}
                        rows={3}
                        autoFocus
                        className="bg-white"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (onEditUpdate && editingUpdateText.trim()) {
                              onEditUpdate(priority.id, update.id, editingUpdateText.trim());
                              setEditingUpdateId(null);
                            }
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingUpdateId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm">{update.text}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {update.createdBy} • {format(new Date(update.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingUpdateId(update.id);
                            setEditingUpdateText(update.text);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteUpdate?.(priority.id, update.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {showAddUpdate ? (
                <div className="p-3 bg-blue-50/30 rounded-lg space-y-2">
                  <Textarea
                    value={updateText}
                    onChange={(e) => setUpdateText(e.target.value)}
                    placeholder="Enter update..."
                    rows={3}
                    autoFocus
                    className="bg-white"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (onAddUpdate && updateText.trim()) {
                          onAddUpdate(priority.id, updateText.trim());
                          setUpdateText('');
                          setShowAddUpdate(false);
                        }
                      }}
                      className="text-white"
                      style={{
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                      }}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowAddUpdate(false);
                        setUpdateText('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowAddUpdate(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Update
                </Button>
              )}
            </TabsContent>

            <TabsContent value="attachments" className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <Paperclip className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Drag and drop files here, or{' '}
                  <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
                    browse
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                    />
                  </label>
                </p>
              </div>

              {priority?.attachments?.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      {(() => {
                        const fileName = attachment.fileName || attachment.file_name;
                        // Display .md files as .docx since they're converted on download
                        return fileName.endsWith('.md') ? fileName.replace(/\.md$/, '.docx') : fileName;
                      })()}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDownloadAttachment?.(priority.id, attachment.id)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteAttachment?.(priority.id, attachment.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Sharing Tab */}
            <TabsContent value="sharing" className="space-y-4">
              {loadingShares ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading sharing options...</span>
                </div>
              ) : (
                <div className="space-y-4 pt-6">
                  <div>
                    <Label className="text-base font-semibold">Share with Teams</Label>
                    <p className="text-sm text-gray-500 mt-1 mb-4">
                      Select which teams can view this {labels?.priority_singular?.toLowerCase() || 'priority'}. 
                      Shared {labels?.priority_plural?.toLowerCase() || 'priorities'} are read-only for other teams.
                    </p>
                  </div>

                  {availableTeams.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No other teams available to share with.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2">
                      {availableTeams.map(team => (
                        <div 
                          key={team.id} 
                          className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <Checkbox
                            id={`team-${team.id}`}
                            checked={sharedWithTeamIds.includes(team.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSharedWithTeamIds([...sharedWithTeamIds, team.id]);
                              } else {
                                setSharedWithTeamIds(sharedWithTeamIds.filter(id => id !== team.id));
                              }
                            }}
                          />
                          <label
                            htmlFor={`team-${team.id}`}
                            className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {team.name}
                            {team.is_leadership_team && (
                              <Badge variant="outline" className="ml-2">Leadership</Badge>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <Button
                      onClick={async () => {
                        try {
                          setSaving(true);
                          await quarterlyPrioritiesService.sharePriority(
                            user.organizationId,
                            teamId,
                            priority.id,
                            sharedWithTeamIds
                          );
                          setError(null);
                          // Show success message
                          const successMsg = sharedWithTeamIds.length > 0 
                            ? `Shared with ${sharedWithTeamIds.length} team(s)`
                            : 'Sharing removed';
                          alert(successMsg); // TODO: Replace with toast notification
                        } catch (err) {
                          console.error('Error saving shares:', err);
                          setError('Failed to update sharing settings');
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving}
                      style={{ backgroundColor: themeColors.primary }}
                      className="w-full"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Sharing Settings
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="mt-4">
          {priority && (onArchive || onCreateLinkedIssue || onGenerateActionPlan) && (
            <div className="flex gap-2 mr-auto">
              {onGenerateActionPlan && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onGenerateActionPlan(priority);
                  }}
                  className="border-2 transition-all duration-200"
                  style={{
                    borderColor: themeColors.primary,
                    color: themeColors.primary
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = themeColors.primary;
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = themeColors.primary;
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Action Plan
                </Button>
              )}
              {onArchive && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onArchive(priority.id);
                    onOpenChange(false);
                  }}
                  className="border-2 transition-all duration-200"
                  style={{
                    borderColor: themeColors.primary,
                    color: themeColors.primary
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = themeColors.primary;
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = themeColors.primary;
                  }}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </Button>
              )}
              {onCreateLinkedIssue && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onCreateLinkedIssue(priority);
                    onOpenChange(false);
                  }}
                  className="border-2 transition-all duration-200"
                  style={{
                    borderColor: themeColors.primary,
                    color: themeColors.primary
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = themeColors.primary;
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = themeColors.primary;
                  }}
                >
                  <Link className="h-4 w-4 mr-2" />
                  Add Linked Issue
                </Button>
              )}
            </div>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={saving || !formData.title}
            style={{
              background: saving ? '#9CA3AF' : `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
            }}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PriorityDialog;