import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
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
  Target
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
  onStatusChange,
  teamMembers = [],
  readOnly = false
}) => {
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

  const getStatusBorderColor = (status) => {
    switch (status) {
      case 'complete':
        return 'border-l-green-500';
      case 'on-track':
        return 'border-l-blue-500';
      case 'off-track':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-300';
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
      setNewMilestone({ title: '', dueDate: '' });
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
      <Card className={`transition-all duration-200 border-l-4 ${getStatusBorderColor(isEditing ? editForm.status : priority.status)} hover:shadow-sm bg-white`}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusDotColor(isEditing ? editForm.status : priority.status)}`} />
                {isEditing ? (
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="flex-1 text-lg font-semibold border-0 p-0 focus:ring-0 shadow-none"
                  />
                ) : (
                  <h3 className="text-lg font-semibold text-gray-900 truncate flex-1">
                    {priority.title}
                  </h3>
                )}
                
                {isCompany && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
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

                {onStatusChange && !isEditing ? (
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
              </div>

              {isEditing ? (
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="mt-2 text-sm resize-none"
                  rows={2}
                  placeholder="Priority description..."
                />
              ) : (
                priority.description && (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {priority.description}
                  </p>
                )
              )}
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
                    className="h-8 w-8 p-0 hover:bg-blue-100"
                  >
                    <Edit className="h-4 w-4 text-blue-600" />
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
            {/* Progress Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm text-gray-600">{priority.progress || 0}%</span>
              </div>
              <Progress value={priority.progress || 0} className="h-2" />
            </div>

            {/* Milestones Section */}
            {(priority.milestones?.length > 0 || showAddMilestone) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Milestones
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
                    <div key={milestone.id || index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={milestone.completed}
                        onChange={() => onToggleMilestone && onToggleMilestone(priority.id, milestone.id, !milestone.completed)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <span className={`text-sm ${milestone.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {milestone.title}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {formatDate(milestone.dueDate)}
                        </span>
                      </div>
                      {onDeleteMilestone && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteMilestone(priority.id, milestone.id)}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  {showAddMilestone && (
                    <div className="flex gap-2 p-2 bg-gray-50 rounded-lg">
                      <Input
                        value={newMilestone.title}
                        onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                        placeholder="Milestone title"
                        className="flex-1 text-sm"
                      />
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
                <div className="flex items-center justify-between">
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
                  {priority.updates?.slice(0, 3).map((update, index) => (
                    <div key={update.id || index} className="p-2 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{update.text}</p>
                      <div className="text-xs text-gray-500 mt-1">
                        {update.createdBy} • {formatDate(update.createdAt)}
                      </div>
                    </div>
                  ))}
                  
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
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default PriorityCardClean;