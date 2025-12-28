import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/DatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckSquare, 
  Plus, 
  Calendar,
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
  Archive,
  Eye,
  EyeOff,
  Paperclip,
  Download,
  MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';

const PriorityCard = ({ 
  priority, 
  isCompany = false, 
  isArchived = false,
  density = 'comfortable', // compact, comfortable, spacious
  teamMembers = [],
  user,
  selectedDepartment,
  onUpdate,
  onUpdateMilestone,
  onCreateMilestone,
  onEditMilestone,
  onDeleteMilestone,
  onAddUpdate,
  onArchive
}) => {
  // Validate priority data
  if (!priority || !priority.owner) {
    console.error('Invalid priority data:', priority);
    return null;
  }
  
  const [viewMode, setViewMode] = useState('compact'); // compact, expanded
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Form states
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
  
  // Milestone form
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    dueDate: ''
  });
  
  // Update form
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [updateStatusChange, setUpdateStatusChange] = useState(null);
  
  // Attachment states
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachmentError, setAttachmentError] = useState(null);
  
  // Issue creation states
  const [creatingIssue, setCreatingIssue] = useState(false);
  const [issueCreatedSuccess, setIssueCreatedSuccess] = useState(false);

  // Utility functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'complete': return 'bg-green-500';
      case 'on-track': return 'bg-blue-500';
      case 'off-track': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete': return <CheckCircle className="h-4 w-4" />;
      case 'on-track': return <TrendingUp className="h-4 w-4" />;
      case 'off-track': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'complete': return 'default';
      case 'on-track': return 'success';
      case 'off-track': return 'destructive';
      default: return 'outline';
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
      
      if (typeof dateString === 'string' && dateString.includes('T')) {
        const datePart = dateString.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        const date = new Date(year, month - 1, day, 12, 0, 0);
        return format(date, 'MMM d, yyyy');
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return format(localDate, 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid date';
    }
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return 0;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let due;
      if (typeof dueDate === 'string' && dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dueDate.split('-').map(Number);
        due = new Date(year, month - 1, day, 12, 0, 0);
      } else {
        due = new Date(dueDate);
        due = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      }
      
      if (isNaN(due.getTime())) return 0;
      
      const diffTime = due - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      console.error('Error calculating days until due:', dueDate, error);
      return 0;
    }
  };

  const handleSave = () => {
    onUpdate(priority.id, editForm);
    setIsEditing(false);
  };

  const handleAddUpdateSubmit = () => {
    onAddUpdate(priority.id, updateText, updateStatusChange);
    setUpdateText('');
    setUpdateStatusChange(null);
    setShowUpdateDialog(false);
  };

  // Calculate urgency indicators
  const overdueMilestones = (priority.milestones || []).filter(
    m => !m.completed && getDaysUntilDue(m.dueDate) < 0
  );
  const urgentMilestones = (priority.milestones || []).filter(
    m => !m.completed && getDaysUntilDue(m.dueDate) <= 3 && getDaysUntilDue(m.dueDate) >= 0
  );

  // Determine card styling based on density
  const densityClasses = {
    compact: 'p-3',
    comfortable: 'p-4',
    spacious: 'p-6'
  };

  const cardClass = `hover:shadow-md transition-all duration-200 ${
    overdueMilestones.length > 0 ? 'ring-2 ring-red-200 border-red-200' :
    urgentMilestones.length > 0 ? 'ring-1 ring-orange-200 border-orange-200' :
    priority.status === 'off-track' ? 'ring-1 ring-red-100 border-red-100' :
    ''
  }`;

  // Compact view (default)
  if (viewMode === 'compact') {
    return (
      <Card className={cardClass}>
        <CardContent className={densityClasses[density]}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {/* Status indicator */}
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(priority.status)}`} />
              
              {/* Priority info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold truncate">{priority.title}</h3>
                  {isCompany && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs flex-shrink-0">
                      <Building2 className="h-3 w-3 mr-1" />
                      Company
                    </Badge>
                  )}
                  {overdueMilestones.length > 0 && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs flex-shrink-0">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {overdueMilestones.length} Overdue
                    </Badge>
                  )}
                </div>
                {density !== 'compact' && (
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-xs">{getUserInitials(priority.owner.name)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{priority.owner.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(priority.dueDate)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right side info */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              {/* Progress */}
              <div className="flex items-center space-x-2">
                <Progress value={priority.progress} className="w-20" />
                <span className="text-sm font-medium w-10 text-right">{priority.progress}%</span>
              </div>
              
              {/* Status badge */}
              <Badge 
                variant={getStatusBadgeVariant(priority.status)} 
                className="flex items-center space-x-1"
              >
                {getStatusIcon(priority.status)}
                <span className="capitalize">{priority.status.replace('-', ' ')}</span>
              </Badge>
              
              {/* Actions */}
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('expanded')}
                  className="h-8 w-8 p-0"
                  title="View details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 w-8 p-0"
                  title="Edit priority"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                {!isArchived && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onArchive(priority.id)}
                    className="h-8 w-8 p-0"
                    title="Archive priority"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Expanded view with tabs
  return (
    <Card className={cardClass}>
      <CardHeader className={densityClasses[density]}>
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
                <CardTitle className="text-lg">
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
              {overdueMilestones.length > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {overdueMilestones.length} Overdue
                </Badge>
              )}
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
              <CardDescription className="text-base whitespace-pre-wrap">
                {priority.description || ''}
              </CardDescription>
            )}
          </div>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('compact')}
              title="Collapse"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
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
                <Button variant="ghost" size="sm" onClick={() => {
                  const isCompanyPriorityValue = priority.isCompanyPriority ?? priority.is_company_priority ?? false;
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
                    isCompanyPriority: isCompanyPriorityValue
                  });
                  setIsEditing(true);
                }}>
                  <Edit className="h-4 w-4" />
                </Button>
                {!isArchived && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onArchive(priority.id)}
                    title="Archive priority"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="updates">Updates</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
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

            {isEditing && (
              <div className="flex items-center space-x-2 mt-4">
                <input
                  type="checkbox"
                  id="editIsCompany"
                  checked={editForm.isCompanyPriority}
                  onChange={(e) => setEditForm({ ...editForm, isCompanyPriority: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="editIsCompany" className="text-sm">This is a company-wide priority</Label>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="milestones" className="space-y-4">
            {/* Milestone content will be implemented here */}
            <p className="text-sm text-gray-500">Milestone management coming soon...</p>
          </TabsContent>
          
          <TabsContent value="updates" className="space-y-4">
            {/* Updates content will be implemented here */}
            <p className="text-sm text-gray-500">Updates management coming soon...</p>
          </TabsContent>
          
          <TabsContent value="files" className="space-y-4">
            {/* Files content will be implemented here */}
            <p className="text-sm text-gray-500">File attachments coming soon...</p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PriorityCard;