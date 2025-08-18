import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { organizationService } from '../../services/organizationService';
import { getOrgTheme, saveOrgTheme } from '../../utils/themeUtils';
import { useTerminology } from '../../contexts/TerminologyContext';
import { 
  Calendar,
  ChevronDown,
  ChevronUp,
  Edit,
  Save,
  X,
  Archive,
  Building2,
  MessageSquare,
  Plus,
  Trash2,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  Clock,
  AlertCircle,
  Target,
  Paperclip,
  Download,
  Upload,
  Edit2
} from 'lucide-react';
import { format } from 'date-fns';

const PriorityCardClean = ({ 
  priority, 
  isCompany = false,
  isArchived = false,
  onUpdate,
  onArchive,
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
  onToggleMilestone,
  onAddUpdate,
  onEditUpdate,
  onDeleteUpdate,
  onStatusChange,
  onUploadAttachment,
  onDownloadAttachment,
  onDeleteAttachment,
  onCreateDiscussionIssue,
  teamMembers = [],
  readOnly = false
}) => {
  console.log('[PriorityCardClean] Rendering with:', {
    priorityTitle: priority?.title,
    hasMilestones: priority?.milestones?.length > 0,
    milestones: priority?.milestones,
    teamMembersCount: teamMembers.length
  });
  console.log('[PriorityCardClean] Handler props received:', {
    onEditMilestone: typeof onEditMilestone,
    onEditMilestoneExists: !!onEditMilestone,
    onUpdateExists: !!onUpdate,
    onAddMilestoneExists: !!onAddMilestone
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: priority.title || '',
    description: priority.description || '',
    status: priority.status || 'on-track',
    progress: priority.progress || 0,
    dueDate: priority.dueDate || '',
    ownerId: priority.owner?.id || '',
    isCompanyPriority: priority.isCompanyPriority || false
  });
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', dueDate: '' });
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [editingMilestoneId, setEditingMilestoneId] = useState(null);
  const [editingMilestone, setEditingMilestone] = useState({ title: '', dueDate: '' });
  const { labels } = useTerminology();
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });

  useEffect(() => {
    fetchOrganizationTheme();
    
    // Listen for theme changes
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  const fetchOrganizationTheme = async () => {
    try {
      // First check localStorage
      const orgId = localStorage.getItem('organizationId');
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
        const orgId = localStorage.getItem('organizationId');
        saveOrgTheme(orgId, theme);
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
    }
  };

  const getStatusBorderStyle = (status) => {
    switch (status) {
      case 'complete':
        return { borderLeftColor: themeColors.primary, borderLeftWidth: '4px' };
      case 'on-track':
        return { borderLeftColor: themeColors.accent, borderLeftWidth: '4px' };
      case 'off-track':
        return { borderLeftColor: '#EF4444', borderLeftWidth: '4px' };
      default:
        return { borderLeftColor: '#D1D5DB', borderLeftWidth: '4px' };
    }
  };

  const getStatusDotColor = (status) => {
    switch (status) {
      case 'complete':
        return 'bg-green-500';
      case 'on-track':
        return 'bg-blue-500';
      case 'off-track':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
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
        const date = new Date(year, month - 1, day);
        return format(date, 'MMM d, yyyy');
      }
      
      if (typeof dateString === 'string' && dateString.includes('T')) {
        const datePart = dateString.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return format(date, 'MMM d, yyyy');
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return format(localDate, 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid date';
    }
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleSave = async () => {
    if (onUpdate) {
      await onUpdate(priority.id, editForm);
      setIsEditing(false);
    }
  };

  const handleAddMilestone = async () => {
    if (onAddMilestone && newMilestone.title && newMilestone.dueDate) {
      await onAddMilestone(priority.id, newMilestone);
      setNewMilestone({ title: '', dueDate: '', ownerId: priority.owner?.id });
      setShowAddMilestone(false);
    }
  };

  const handleAddUpdate = async () => {
    if (onAddUpdate && updateText) {
      await onAddUpdate(priority.id, updateText);
      setUpdateText('');
      setShowAddUpdate(false);
    }
  };

  return (
    <div className="group">
      <Card 
        className="transition-all duration-200 hover:shadow-sm bg-white overflow-hidden"
        style={getStatusBorderStyle(isEditing ? editForm.status : priority.status)}
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                {onStatusChange && !readOnly && !isEditing && (
                  <Checkbox
                    checked={priority.status === 'complete'}
                    onCheckedChange={(checked) => {
                      onStatusChange(priority.id, checked ? 'complete' : 'on-track');
                    }}
                    className="flex-shrink-0"
                  />
                )}
                {!onStatusChange || readOnly || isEditing ? (
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusDotColor(isEditing ? editForm.status : priority.status)}`} />
                ) : null}
                {isEditing ? (
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="flex-1 text-lg font-semibold border-0 p-0 focus:ring-0 shadow-none"
                  />
                ) : (
                  <h3 className={`text-lg font-semibold text-gray-900 flex-1 line-clamp-2 ${priority.status === 'complete' ? 'line-through text-gray-500' : ''}`}>
                    {priority.title}
                  </h3>
                )}
                
                {isCompany && (
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{ 
                      backgroundColor: themeColors.accent + '15',
                      color: themeColors.secondary,
                      borderColor: themeColors.accent + '40'
                    }}
                  >
                    <Building2 className="h-3 w-3 mr-1" />
                    Company
                  </Badge>
                )}
                
                {(() => {
                  const overdueMilestones = (priority.milestones || []).filter(
                    m => !m.completed && getDaysUntilDue(m.dueDate) < 0
                  );
                  if (overdueMilestones.length > 0) {
                    return (
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {overdueMilestones.length} Overdue
                      </Badge>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                {isEditing ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-gray-100">
                          {getUserInitials(teamMembers.find(m => m.id === editForm.ownerId)?.name || priority.owner?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <Select
                        value={editForm.ownerId}
                        onValueChange={(value) => setEditForm({ ...editForm, ownerId: value })}
                      >
                        <SelectTrigger className="w-[200px] h-8">
                          <SelectValue placeholder="Select owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <Input
                        type="date"
                        value={editForm.dueDate}
                        onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                        className="h-8 w-[150px]"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="company-priority"
                        checked={editForm.isCompanyPriority}
                        onCheckedChange={(checked) => setEditForm({ ...editForm, isCompanyPriority: checked })}
                      />
                      <label htmlFor="company-priority" className="text-sm font-medium cursor-pointer">
                        Company-wide
                      </label>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-gray-100">
                          {getUserInitials(priority.owner?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{priority.owner?.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{formatDate(priority.dueDate)}</span>
                    </div>
                  </>
                )}

                {onStatusChange && !isEditing && priority.status !== 'complete' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentStatus = priority.status || 'on-track';
                      const newStatus = currentStatus === 'on-track' ? 'off-track' : 'on-track';
                      onStatusChange(priority.id, newStatus);
                    }}
                    className={`flex items-center gap-2 ${
                      priority.status === 'off-track' ? 'border-red-300 bg-red-50 hover:bg-red-100' :
                      'border-green-300 bg-green-50 hover:bg-green-100'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${getStatusDotColor(priority.status)}`} />
                    <span className="capitalize font-medium">
                      {(priority.status || 'on-track').replace('-', ' ')}
                    </span>
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(isEditing ? editForm.status : priority.status)}`} />
                    <span className="capitalize">{(isEditing ? editForm.status : priority.status).replace('-', ' ')}</span>
                  </div>
                )}
                
                {/* Milestone indicator */}
                {priority.milestones && priority.milestones.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Target className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-gray-600">
                      {priority.milestones.filter(m => m.completed).length}/{priority.milestones.length}
                    </span>
                    {priority.progress > 0 && (
                      <span className="text-gray-500">({priority.progress}%)</span>
                    )}
                  </div>
                )}
              </div>

              {/* Description now only shown when expanded */}
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              
              {isEditing ? (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSave}
                    className="h-8 w-8 p-0 hover:bg-green-100"
                  >
                    <Save className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsEditing(false)}
                    className="h-8 w-8 p-0 hover:bg-red-100"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setEditForm({
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
                        isCompanyPriority: priority.isCompanyPriority || false
                      });
                      setIsEditing(true);
                    }}
                    className="h-8 w-8 p-0 transition-colors"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeColors.accent + '20'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                  >
                    <Edit className="h-4 w-4" style={{ color: themeColors.primary }} />
                  </Button>
                  
                  {!isArchived && onArchive && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onArchive(priority.id)}
                      className="h-8 w-8 p-0 hover:bg-orange-100"
                    >
                      <Archive className="h-4 w-4 text-orange-600" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0 space-y-4 border-t">
            {/* Description section with scroll */}
            {(priority.description || isEditing) && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                {isEditing ? (
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="text-sm resize-none"
                    rows={4}
                    placeholder={`${labels.priorities_label.slice(0, -1)} description...`}
                  />
                ) : (
                  <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-md p-3 border border-gray-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {priority.description}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Progress Section - Only show if milestones exist */}
            {priority.milestones && priority.milestones.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <div className="flex items-center gap-3">
                  <Progress value={priority.progress || 0} className="h-2 max-w-[200px]" />
                  <span className="text-sm text-gray-600">{priority.progress || 0}%</span>
                </div>
              </div>
            )}

            {/* Quick Action Buttons */}
            {!isArchived && !readOnly && (
              <div className="flex gap-2 flex-wrap">
                {!priority.milestones?.length && !showAddMilestone && onAddMilestone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddMilestone(true)}
                    className="h-7 text-xs"
                  >
                    <Target className="h-3 w-3 mr-1" />
                    Add {labels.milestones_label?.slice(0, -1) || 'Milestone'}
                  </Button>
                )}
                {!priority.updates?.length && !showAddUpdate && onAddUpdate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddUpdate(true)}
                    className="h-7 text-xs"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Add Update
                  </Button>
                )}
                {onCreateDiscussionIssue && priority.status !== 'off-track' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCreateDiscussionIssue(priority)}
                    className="h-7 text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Drop Down for Discussion
                  </Button>
                )}
              </div>
            )}

            {/* Milestones Section */}
            {(priority.milestones?.length > 0 || showAddMilestone) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    {labels.milestones_label || 'Milestones'}
                  </h4>
                  {!showAddMilestone && onAddMilestone && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddMilestone(true)}
                      className="h-7 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2">
                  {priority.milestones?.map((milestone, index) => (
                    <div key={milestone.id || index} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={milestone.completed}
                        onChange={() => onToggleMilestone && onToggleMilestone(priority.id, milestone.id, !milestone.completed)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      {editingMilestoneId === milestone.id ? (
                        <>
                          <Input
                            value={editingMilestone.title}
                            onChange={(e) => setEditingMilestone({ ...editingMilestone, title: e.target.value })}
                            className="flex-1 h-7 text-sm"
                            placeholder={`${labels.milestones_label?.slice(0, -1) || 'Milestone'} title`}
                          />
                          <Select
                            value={editingMilestone.ownerId || milestone.owner_id || priority.owner?.id}
                            onValueChange={(value) => {
                              console.log('[FRONTEND] Owner dropdown changed to:', value);
                              console.log('[FRONTEND] Setting editingMilestone.ownerId to:', value);
                              setEditingMilestone({ ...editingMilestone, ownerId: value });
                            }}
                          >
                            <SelectTrigger className="w-40 h-7 text-sm">
                              <SelectValue placeholder="Owner" />
                            </SelectTrigger>
                            <SelectContent>
                              {teamMembers.length === 0 && (
                                <div className="px-2 py-1 text-sm text-gray-500">No team members available</div>
                              )}
                              {teamMembers.map((member) => {
                                console.log('[FRONTEND] Rendering team member option:', member.id, member.name);
                                return (
                                  <SelectItem key={member.id} value={member.id}>
                                    {member.name}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <Input
                            type="date"
                            value={editingMilestone.dueDate}
                            onChange={(e) => setEditingMilestone({ ...editingMilestone, dueDate: e.target.value })}
                            className="w-32 h-7 text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              console.log('===========================================');
                              console.log('[FRONTEND] MILESTONE SAVE CLICKED');
                              console.log('===========================================');
                              console.log('[FRONTEND] Priority ID:', priority.id);
                              console.log('[FRONTEND] Milestone ID:', milestone.id);
                              console.log('[FRONTEND] editingMilestone object:', JSON.stringify(editingMilestone, null, 2));
                              console.log('[FRONTEND] editingMilestone.ownerId:', editingMilestone.ownerId);
                              console.log('[FRONTEND] editingMilestone.ownerId type:', typeof editingMilestone.ownerId);
                              console.log('[FRONTEND] onEditMilestone exists?', !!onEditMilestone);
                              
                              if (onEditMilestone) {
                                console.log('[FRONTEND] Calling onEditMilestone with:', {
                                  priorityId: priority.id,
                                  milestoneId: milestone.id,
                                  updates: editingMilestone
                                });
                                onEditMilestone(priority.id, milestone.id, editingMilestone);
                              } else {
                                console.error('[FRONTEND] ERROR: onEditMilestone is not defined!');
                              }
                              setEditingMilestoneId(null);
                            }}
                            className="h-6 w-6 p-0 hover:bg-green-100"
                          >
                            <Save className="h-3 w-3 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingMilestoneId(null)}
                            className="h-6 w-6 p-0 hover:bg-red-100"
                          >
                            <X className="h-3 w-3 text-red-600" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className={`text-sm flex-1 ${milestone.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                            {milestone.title}
                          </span>
                          {milestone.owner_name && milestone.owner_id !== priority.owner?.id && (
                            <div className="flex items-center gap-1">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                                  {getUserInitials(milestone.owner_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-gray-600">{milestone.owner_name.split(' ')[0]}</span>
                            </div>
                          )}
                          <span className={`text-xs ${getDaysUntilDue(milestone.dueDate) < 0 && !milestone.completed ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {formatDate(milestone.dueDate)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              console.log('[PriorityCardClean] Entering edit mode for milestone:', {
                                milestoneId: milestone.id,
                                milestone_owner_id: milestone.owner_id,
                                milestone_owner_name: milestone.owner_name,
                                priority_owner_id: priority.owner?.id,
                                priority_owner_name: priority.owner?.name
                              });
                              setEditingMilestoneId(milestone.id);
                              setEditingMilestone({
                                title: milestone.title,
                                dueDate: milestone.dueDate ? (
                                  milestone.dueDate.includes('T') 
                                    ? milestone.dueDate.split('T')[0]
                                    : milestone.dueDate
                                ) : '',
                                ownerId: milestone.owner_id || priority.owner?.id
                              });
                              console.log('[PriorityCardClean] Edit state set to:', {
                                title: milestone.title,
                                dueDate: milestone.dueDate,
                                ownerId: milestone.owner_id || priority.owner?.id
                              });
                            }}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit2 className="h-3 w-3" style={{ color: themeColors.primary }} />
                          </Button>
                          {onDeleteMilestone && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteMilestone(priority.id, milestone.id)}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="h-3 w-3" style={{ color: themeColors.secondary }} />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                  
                  {showAddMilestone && (
                    <div className="flex gap-2 p-2 bg-gray-50 rounded-lg">
                      <Input
                        value={newMilestone.title}
                        onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                        placeholder={`${labels.milestones_label?.slice(0, -1) || 'Milestone'} title`}
                        className="flex-1 text-sm"
                      />
                      <Select
                        value={newMilestone.ownerId || priority.owner?.id}
                        onValueChange={(value) => setNewMilestone({ ...newMilestone, ownerId: value })}
                      >
                        <SelectTrigger className="w-40 h-9 text-sm">
                          <SelectValue placeholder="Owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        value={newMilestone.dueDate}
                        onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })}
                        className="w-32 text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={handleAddMilestone}
                        className="bg-gray-900 hover:bg-gray-800"
                      >
                        Add
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAddMilestone(false);
                          setNewMilestone({ title: '', dueDate: '' });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Updates Section */}
            {(priority.updates?.length > 0 || showAddUpdate) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Updates
                  </h4>
                  {!showAddUpdate && onAddUpdate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddUpdate(true)}
                      className="h-7 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2">
                  {priority.updates?.slice(0, 3).map((update, index) => {
                    // Debug log to check update structure
                    if (!update.id) {
                      console.warn('Update missing ID:', update);
                    }
                    return (
                      <div key={update.id || index} className="group p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <div>
                            <p className="text-sm text-gray-700">{update.text}</p>
                            <div className="text-xs text-gray-500 mt-1">
                              {update.createdBy} • {formatDate(update.createdAt)}
                            </div>
                          </div>
                          {(onDeleteUpdate || onEditUpdate) && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-2">
                              {onEditUpdate && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    console.log('Edit update clicked:', { priorityId: priority.id, updateId: update.id, text: update.text });
                                    onEditUpdate(priority.id, update.id, update.text);
                                  }}
                                  className="h-6 w-6 p-0 transition-colors"
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeColors.accent + '20'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                                >
                                  <Edit2 className="h-3 w-3" style={{ color: themeColors.primary }} />
                                </Button>
                              )}
                              {onDeleteUpdate && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    console.log('Delete update clicked:', { priorityId: priority.id, updateId: update.id });
                                    onDeleteUpdate(priority.id, update.id);
                                  }}
                                  className="h-6 w-6 p-0 transition-colors"
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeColors.secondary + '15'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                                >
                                  <Trash2 className="h-3 w-3" style={{ color: themeColors.secondary }} />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {showAddUpdate && (
                    <div className="space-y-2">
                      <Textarea
                        value={updateText}
                        onChange={(e) => setUpdateText(e.target.value)}
                        placeholder="Add an update..."
                        className="text-sm"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleAddUpdate}
                          className="bg-gray-900 hover:bg-gray-800"
                        >
                          Add Update
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowAddUpdate(false);
                            setUpdateText('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Attachments Section */}
            {(priority.attachments?.length > 0 || onUploadAttachment) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Attachments
                  </h4>
                  {onUploadAttachment && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.onchange = (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            onUploadAttachment(priority.id, file);
                          }
                        };
                        input.click();
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Upload
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2">
                  {priority.attachments?.map((attachment, index) => (
                    <div key={attachment.id || index} className="group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                      <Paperclip className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{attachment.fileName}</span>
                      <span className="text-xs text-gray-500">
                        {attachment.fileSize ? `(${Math.round(attachment.fileSize / 1024)}KB)` : ''}
                      </span>
                      {onDownloadAttachment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDownloadAttachment(priority.id, attachment.id)}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 ml-2"
                        >
                          <Download className="h-3 w-3 text-blue-600" />
                        </Button>
                      )}
                      {onDeleteAttachment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteAttachment(priority.id, attachment.id)}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" style={{ color: themeColors.secondary }} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default PriorityCardClean;