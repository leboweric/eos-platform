import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  TrendingDown
} from 'lucide-react';
import { quarterlyPrioritiesService } from '../../services/quarterlyPrioritiesService';
import { useAuthStore } from '../../stores/authStore';
import { useTerminology } from '../../contexts/TerminologyContext';
import { format } from 'date-fns';
import { getOrgTheme } from '../../utils/themeUtils';

const PriorityDialog = ({ 
  open, 
  onOpenChange, 
  priority, 
  teamMembers, 
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
  onDeleteAttachment
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
  const [newMilestone, setNewMilestone] = useState({ title: '', dueDate: '' });
  const [editingMilestoneId, setEditingMilestoneId] = useState(null);
  const [editingMilestone, setEditingMilestone] = useState({ title: '', dueDate: '' });

  // Update states
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [editingUpdateId, setEditingUpdateId] = useState(null);
  const [editingUpdateText, setEditingUpdateText] = useState('');
  
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
        isCompanyPriority: priority.isCompanyPriority || priority.is_company_priority || false
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
      // Calculate current progress and status from milestones
      let currentProgress = formData.progress;
      let currentStatus = formData.status;
      
      if (priority?.milestones && priority.milestones.length > 0) {
        const completedCount = priority.milestones.filter(m => m.completed).length;
        const totalCount = priority.milestones.length;
        currentProgress = Math.round((completedCount / totalCount) * 100);
        
        // Auto-determine status based on milestone completion
        if (completedCount === totalCount && totalCount > 0) {
          currentStatus = 'complete';
        } else if (formData.status === 'complete') {
          // Don't keep complete status if not all milestones are done
          currentStatus = 'on-track';
        }
        
        console.log('Calculated progress from milestones:', {
          completedCount,
          totalCount,
          currentProgress,
          oldProgress: formData.progress,
          currentStatus,
          oldStatus: formData.status
        });
      }
      
      const priorityData = {
        ...formData,
        progress: currentProgress, // Use calculated progress
        status: currentStatus, // Use calculated status
        owner_id: formData.ownerId,
        due_date: formData.dueDate
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
    
    for (const file of filesToUpload) {
      try {
        await onUploadAttachment(priority.id, file);
      } catch (error) {
        console.error('Failed to upload file:', error);
        setError(`Failed to upload ${file.name}`);
      }
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
      <DialogContent className="sm:max-w-[900px] w-full max-h-[90vh] overflow-hidden flex flex-col bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl">
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
          <TabsList className="grid w-full grid-cols-4">
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
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4 min-h-[400px]">
            <TabsContent value="details" className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={`Enter ${labels?.priority_singular || 'priority'} title`}
                    required
                    className="mt-1 bg-white"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description (optional)"
                    rows={3}
                    className="mt-1 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => {
                        // Don't allow setting to complete unless all milestones are done
                        if (value === 'complete') {
                          const completedMilestones = priority?.milestones?.filter(m => m.completed).length || 0;
                          const totalMilestones = priority?.milestones?.length || 0;
                          if (totalMilestones > 0 && completedMilestones < totalMilestones) {
                            alert(`Cannot mark as complete. Only ${completedMilestones} of ${totalMilestones} milestones are complete.`);
                            return;
                          }
                        }
                        setFormData({ ...formData, status: value });
                      }}
                    >
                      <SelectTrigger id="status" className="mt-1 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on-track">On Track</SelectItem>
                        <SelectItem value="off-track">Off Track</SelectItem>
                        <SelectItem value="complete">Complete</SelectItem>
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
                      <Progress value={calculatedProgress} className="mt-2" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="owner">Owner</Label>
                    <Select 
                      value={formData.ownerId} 
                      onValueChange={(value) => setFormData({ ...formData, ownerId: value })}
                    >
                      <SelectTrigger id="owner" className="mt-1 bg-white">
                        <SelectValue placeholder="Select owner" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers?.map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name || `${member.first_name} ${member.last_name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="mt-1 bg-white"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-blue-50/30 rounded-lg mt-4">
                  <Checkbox
                    id="isCompanyWide"
                    checked={formData.isCompanyPriority || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, isCompanyPriority: checked })}
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
                        placeholder="Milestone title"
                        className="bg-white"
                      />
                      <Input
                        type="date"
                        value={editingMilestone.dueDate}
                        onChange={(e) => setEditingMilestone({ ...editingMilestone, dueDate: e.target.value })}
                        className="bg-white"
                      />
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
                        <Checkbox
                          checked={milestone.completed}
                          onCheckedChange={(checked) => onToggleMilestone?.(priority.id, milestone.id, checked)}
                          className="flex-shrink-0"
                        />
                        <div>
                          <p className={`font-medium ${milestone.completed ? 'line-through text-gray-500' : ''}`}>
                            {milestone.title}
                          </p>
                          {milestone.dueDate && (
                            <p className="text-sm text-gray-500">
                              Due: {format(new Date(milestone.dueDate), 'MMM d, yyyy')}
                            </p>
                          )}
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
                              dueDate: milestone.dueDate?.split('T')[0] || ''
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
                  <Input
                    type="date"
                    value={newMilestone.dueDate}
                    onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })}
                    className="bg-white"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (onAddMilestone && newMilestone.title) {
                          onAddMilestone(priority.id, newMilestone);
                          setNewMilestone({ title: '', dueDate: '' });
                          setShowAddMilestone(false);
                        }
                      }}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowAddMilestone(false);
                        setNewMilestone({ title: '', dueDate: '' });
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
                    <span className="text-sm">{attachment.fileName || attachment.file_name}</span>
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
          </div>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="mt-4">
          {priority && onArchive && (
            <Button
              variant="outline"
              onClick={() => {
                onArchive(priority.id);
                onOpenChange(false);
              }}
              className="mr-auto"
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
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
      </DialogContent>
    </Dialog>
  );
};

export default PriorityDialog;