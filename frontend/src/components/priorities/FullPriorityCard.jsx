import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/DatePicker';
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
  ChevronDown,
  ChevronUp,
  Building2,
  Save,
  X,
  Loader2,
  Paperclip,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { quarterlyPrioritiesService } from '../../services/quarterlyPrioritiesService';
import { issuesService } from '../../services/issuesService';
import { useAuthStore } from '../../stores/authStore';

const FullPriorityCard = ({ 
  priority, 
  isCompany = false, 
  isArchived = false,
  teamMembers = [],
  onUpdate,
  onArchive,
  onStatusChange,
  onMilestoneUpdate,
  onMilestoneCreate,
  onMilestoneEdit,
  onMilestoneDelete,
  onAddUpdate
}) => {
  const { user } = useAuthStore();
  
  // Validate priority data
  if (!priority || !priority.owner) {
    console.error('Invalid priority data:', priority);
    return null;
  }
  
  const [isExpanded, setIsExpanded] = useState(false);
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
    title: priority.title || '',
    description: priority.description || '',
    status: priority.status || 'on-track',
    progress: priority.progress || 0,
    dueDate: priority.dueDate ? (
      priority.dueDate.includes('T') 
        ? priority.dueDate.split('T')[0]
        : priority.dueDate
    ) : '',
    ownerId: priority.owner?.id || '',
    isCompanyPriority: priority.isCompanyPriority ?? priority.is_company_priority ?? false
  });
  
  // Attachment states
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachmentError, setAttachmentError] = useState(null);
  
  // Issue creation state
  const [creatingIssue, setCreatingIssue] = useState(false);
  const [issueCreatedSuccess, setIssueCreatedSuccess] = useState(false);

  // Load attachments on mount
  useEffect(() => {
    if (priority.id && !isArchived) {
      loadAttachments();
    }
  }, [priority.id, isArchived]);

  const loadAttachments = async () => {
    try {
      setLoadingAttachments(true);
      const orgId = user?.organizationId || user?.organization_id;
      // Get team ID from priority or user's first team
      const userFirstTeamId = user?.teams?.[0]?.id;
      const teamId = priority.team_id || userFirstTeamId;
      
      if (!teamId) {
        console.error('No team ID found for priority attachments');
        return;
      }
      
      if (orgId && teamId) {
        const attachmentList = await quarterlyPrioritiesService.getAttachments(orgId, teamId, priority.id);
        setAttachments(attachmentList || []);
      }
    } catch (error) {
      console.error('Failed to load attachments:', error);
      setAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      setAttachmentError(null);
      
      const orgId = user?.organizationId || user?.organization_id;
      // Get team ID from priority or user's first team
      const userFirstTeamId = user?.teams?.[0]?.id;
      const teamId = priority.team_id || userFirstTeamId;
      
      if (!teamId) {
        console.error('No team ID found for priority attachments');
        return;
      }
      
      if (!orgId || !teamId) {
        throw new Error('Organization or team not found');
      }

      await quarterlyPrioritiesService.uploadAttachment(orgId, teamId, priority.id, file);
      await loadAttachments();
      
      // Clear the file input
      event.target.value = '';
    } catch (error) {
      console.error('Failed to upload file:', error);
      setAttachmentError('Failed to upload attachment');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      const orgId = user?.organizationId || user?.organization_id;
      // Get team ID from priority or user's first team
      const userFirstTeamId = user?.teams?.[0]?.id;
      const teamId = priority.team_id || userFirstTeamId;
      
      if (!teamId) {
        console.error('No team ID found for priority attachments');
        return;
      }
      
      await quarterlyPrioritiesService.deleteAttachment(orgId, teamId, priority.id, attachmentId);
      await loadAttachments();
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      setAttachmentError('Failed to delete attachment');
    }
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      // Get team ID from priority or user's first team
      const userFirstTeamId = user?.teams?.[0]?.id;
      const teamId = priority.team_id || userFirstTeamId;
      
      if (!teamId) {
        console.error('No team ID found for priority attachments');
        return;
      }
      
      const blob = await quarterlyPrioritiesService.downloadAttachment(orgId, teamId, priority.id, attachment.id);
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download attachment:', error);
      setAttachmentError('Failed to download attachment');
    }
  };

  const handleSave = async () => {
    try {
      await onUpdate(priority.id, editForm);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  const handleAddUpdateSubmit = async () => {
    if (!updateText.trim()) return;
    
    try {
      await onAddUpdate(priority.id, updateText, updateStatusChange);
      setUpdateText('');
      setUpdateStatusChange(null);
      setShowUpdateDialog(false);
    } catch (error) {
      console.error('Failed to add update:', error);
    }
  };

  const handleCreateIssue = async () => {
    try {
      setCreatingIssue(true);
      
      const ownerName = priority.owner?.name || 
        (priority.owner?.firstName && priority.owner?.lastName 
          ? `${priority.owner.firstName} ${priority.owner.lastName}`
          : 'Unassigned');
      
      // Add status to title if off-track or at-risk
      const statusSuffix = (priority.status === 'off-track' || priority.status === 'at-risk') 
        ? ` - ${priority.status.replace('-', ' ').toUpperCase()}` 
        : '';
      
      const dueDate = priority.dueDate || priority.due_date;
      const formattedDueDate = dueDate ? format(new Date(dueDate), 'MMM dd, yyyy') : 'Not set';
        
      const issueData = {
        title: `${priority.title}${statusSuffix}`,
        description: `Priority "${priority.title}" needs discussion. Status: ${priority.status || 'on-track'}. Due: ${formattedDueDate}. Owner: ${ownerName}`,
        timeline: 'short_term',
        ownerId: priority.owner?.id || user?.id
      };
      
      await issuesService.createIssue(issueData);
      
      // Show success message if available
      if (window.showSuccessMessage) {
        window.showSuccessMessage(`Issue created for ${priority.title}`);
      }
      
      setCreatingIssue(false);
      setIssueCreatedSuccess(true);
      
      // Reset success state after 3 seconds
      setTimeout(() => {
        setIssueCreatedSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to create issue:', error);
      setCreatingIssue(false);
      alert('Failed to create issue. Please try again.');
    }
  };

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'complete':
        return 'bg-green-500';
      case 'on-track':
        return 'bg-blue-500';
      case 'at-risk':
        return 'bg-yellow-500';
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
      case 'at-risk':
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
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day, 12, 0, 0);
        return format(date, 'MMM d, yyyy');
      }
      
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return format(date, 'MMM d, yyyy');
      }
      
      return 'Invalid date';
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let due;
    if (typeof dueDate === 'string' && dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dueDate.split('-').map(Number);
      due = new Date(year, month - 1, day, 12, 0, 0);
    } else {
      due = new Date(dueDate);
    }
    
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              {!isArchived && onStatusChange && !isEditing && (
                <Checkbox
                  checked={priority.status === 'complete'}
                  onCheckedChange={(checked) => {
                    onStatusChange(priority.id, checked ? 'complete' : 'on-track');
                  }}
                  className="flex-shrink-0"
                />
              )}
              <div className={`w-3 h-3 rounded-full ${getStatusColor(isEditing ? editForm.status : priority.status)}`} />
              {isEditing ? (
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="flex-1 font-semibold"
                />
              ) : (
                <CardTitle className={`text-lg ${priority.status === 'complete' ? 'line-through text-gray-500' : ''}`}>
                  {priority.title}
                  {isCompany && priority.owner && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      ({priority.owner.name})
                    </span>
                  )}
                </CardTitle>
              )}
              {isCompany && (
                <Badge variant="outline" className="bg-blue-50">
                  <Building2 className="h-3 w-3 mr-1" />
                  Company Priority
                </Badge>
              )}
              {(() => {
                const overdueMilestones = (priority.milestones || []).filter(
                  m => !m.completed && getDaysUntilDue(m.dueDate) < 0
                );
                if (overdueMilestones.length > 0) {
                  return (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {overdueMilestones.length} Overdue
                    </Badge>
                  );
                }
                return null;
              })()}
              <Badge 
                variant={getStatusBadgeVariant(isEditing ? editForm.status : priority.status)} 
                className={`flex items-center space-x-1 ${
                  (isEditing ? editForm.status : priority.status) === 'on-track' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                  (isEditing ? editForm.status : priority.status) === 'off-track' ? 'bg-red-100 text-red-800 border-red-300' :
                  (isEditing ? editForm.status : priority.status) === 'at-risk' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                  (isEditing ? editForm.status : priority.status) === 'complete' ? 'bg-green-100 text-green-800 border-green-300' : ''
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
              priority.description && isExpanded && (
                <CardDescription className="mt-2">{priority.description}</CardDescription>
              )
            )}
          </div>
          {!isArchived && (
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSave}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {onArchive && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onArchive(priority.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Show/Hide Details Button */}
        <div className="flex justify-center mb-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show Details
              </>
            )}
          </Button>
        </div>
        
        {isExpanded && (
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
                      {(teamMembers || []).filter(member => member.id).map(member => (
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
                  <DatePicker placeholder="Select date" 
                    value={editForm.dueDate}
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
                      <SelectItem value="at-risk">At Risk</SelectItem>
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
            {onMilestoneCreate && (
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
                  {(priority.milestones || []).map((milestone) => (
                    <div key={milestone.id} className="flex items-center space-x-3 group">
                      <input
                        type="checkbox"
                        checked={milestone.completed}
                        onChange={(e) => onMilestoneUpdate(priority.id, milestone.id, e.target.checked)}
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
                          <DatePicker placeholder="Select date" 
                            value={milestoneForm.dueDate}
                            onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                            className="w-40 text-xs"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              onMilestoneEdit(priority.id, milestone.id, {
                                title: milestoneForm.title,
                                dueDate: milestoneForm.dueDate,
                                completed: milestone.completed
                              });
                              setEditingMilestoneId(null);
                              setMilestoneForm({ title: '', dueDate: '' });
                            }}
                          >
                            <CheckSquare className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingMilestoneId(null);
                              setMilestoneForm({ title: '', dueDate: '' });
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {!milestone.completed && getDaysUntilDue(milestone.dueDate) < 0 && (
                            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                          )}
                          <span className={`text-sm flex-1 ${milestone.completed ? 'line-through text-gray-500' : ''}`}>
                            {milestone.title}
                          </span>
                          <span className={`text-xs ${
                            !milestone.completed && getDaysUntilDue(milestone.dueDate) < 0 
                              ? 'text-red-600 font-medium' 
                              : !milestone.completed && getDaysUntilDue(milestone.dueDate) <= 3
                              ? 'text-orange-600'
                              : 'text-gray-500'
                          }`}>
                            {formatDate(milestone.dueDate)}
                            {!milestone.completed && getDaysUntilDue(milestone.dueDate) < 0 && (
                              <span className="ml-1">(Overdue)</span>
                            )}
                          </span>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingMilestoneId(milestone.id);
                                setMilestoneForm({
                                  title: milestone.title,
                                  dueDate: milestone.dueDate ? new Date(milestone.dueDate).toISOString().split('T')[0] : ''
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
                                  onMilestoneDelete(priority.id, milestone.id);
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
                      <DatePicker placeholder="Select date" 
                        value={milestoneForm.dueDate}
                        onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                        className="w-40 text-xs"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          onMilestoneCreate(priority.id, milestoneForm);
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
            )}

            {/* Latest Update */}
            {onAddUpdate && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm text-gray-600">Latest Update</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={issueCreatedSuccess ? "default" : "outline"}
                      size="sm"
                      onClick={handleCreateIssue}
                      disabled={creatingIssue || isArchived || issueCreatedSuccess}
                      className={issueCreatedSuccess 
                        ? "text-xs bg-green-600 hover:bg-green-700 text-white" 
                        : "text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                      }
                      title="Create an issue to discuss this priority"
                    >
                      {creatingIssue ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Creating...
                        </>
                      ) : issueCreatedSuccess ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Issue Created!
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Make an Issue
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUpdateText('');
                        setUpdateStatusChange(null);
                        setShowUpdateDialog(true);
                      }}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Update
                    </Button>
                  </div>
                </div>
                {priority.latestUpdate ? (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{priority.latestUpdate.author}</span>
                      <span className="text-xs text-gray-500">{formatDate(priority.latestUpdate.date)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{priority.latestUpdate.text}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-sm text-gray-500 italic">No updates yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Attachments */}
            {!isArchived && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm text-gray-600">
                    <Paperclip className="inline-block h-3 w-3 mr-1" />
                    Attachments
                  </Label>
                  <label>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploadingFile}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      disabled={uploadingFile}
                      onClick={(e) => {
                        e.preventDefault();
                        e.currentTarget.parentElement.querySelector('input[type="file"]').click();
                      }}
                    >
                      {uploadingFile ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3 mr-1" />
                          Add File
                        </>
                      )}
                    </Button>
                  </label>
                </div>
                
                {attachmentError && (
                  <Alert variant="destructive" className="mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{attachmentError}</AlertDescription>
                  </Alert>
                )}
                
                {loadingAttachments ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : attachments.length > 0 ? (
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2 flex-1">
                          <Paperclip className="h-4 w-4 text-gray-400" />
                          <span className="text-sm truncate">{attachment.file_name}</span>
                          <span className="text-xs text-gray-500">
                            ({attachment.file_size ? `${(attachment.file_size / 1024).toFixed(1)} KB` : 'Unknown size'})
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadAttachment(attachment)}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAttachment(attachment.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-sm text-gray-500 italic">No attachments</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Add Update Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Priority Update</DialogTitle>
            <DialogDescription>
              Share progress, changes, or blockers for this priority
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="update">Update</Label>
              <Textarea
                id="update"
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                placeholder="What's the latest on this priority?"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="statusChange">Status Change (Optional)</Label>
              <Select value={updateStatusChange || ''} onValueChange={setUpdateStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="No status change" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Change</SelectItem>
                  <SelectItem value="on-track">On Track</SelectItem>
                  <SelectItem value="off-track">Off Track</SelectItem>
                  <SelectItem value="at-risk">At Risk</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddUpdateSubmit}
              disabled={!updateText.trim()}
            >
              Add Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default FullPriorityCard;