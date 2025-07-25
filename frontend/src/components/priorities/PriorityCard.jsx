import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Target,
  User,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Edit
} from 'lucide-react';
import { useState } from 'react';
import { issuesService } from '../../services/issuesService';
import { quarterlyPrioritiesService } from '../../services/quarterlyPrioritiesService';
import { useAuthStore } from '../../stores/authStore';

/**
 * PriorityCard component for displaying priority information
 * @param {Object} props - Component props
 * @param {Object} props.priority - Priority data
 * @param {string} props.priority.id - Priority ID
 * @param {string} props.priority.title - Priority title
 * @param {string} props.priority.description - Priority description
 * @param {string} props.priority.status - Priority status (on-track/off-track/at-risk/complete)
 * @param {string} props.priority.due_date - Priority due date
 * @param {Object} props.priority.owner - Priority owner object
 * @param {string} props.priority.owner_first_name - Owner's first name
 * @param {string} props.priority.owner_last_name - Owner's last name
 * @param {string} props.priority.team_id - ID of the team
 * @param {string} props.priority.teamName - Name of the team that owns this priority
 * @param {boolean} props.priority.isFromLeadership - Whether priority is from Leadership team
 * @param {boolean} props.readOnly - Whether in read-only mode
 * @param {Function} props.onIssueCreated - Issue creation handler
 * @param {Function} props.onStatusChange - Status change handler
 */
const PriorityCard = ({ priority, readOnly = false, onIssueCreated, onStatusChange }) => {
  const { user, isOnLeadershipTeam } = useAuthStore();
  const [creatingIssue, setCreatingIssue] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const statusColors = {
    'on-track': 'bg-green-100 text-green-700 border-green-200',
    'off-track': 'bg-red-100 text-red-700 border-red-200',
    'at-risk': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'complete': 'bg-blue-100 text-blue-700 border-blue-200'
  };

  const statusIcons = {
    'on-track': <Target className="h-4 w-4" />,
    'off-track': <AlertTriangle className="h-4 w-4" />,
    'at-risk': <AlertTriangle className="h-4 w-4" />,
    'complete': <CheckCircle className="h-4 w-4" />
  };

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

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleCreateIssue = async () => {
    try {
      setCreatingIssue(true);
      
      const daysLeft = getDaysUntilDue(priority.due_date);
      const ownerName = priority.owner_first_name && priority.owner_last_name 
        ? `${priority.owner_first_name} ${priority.owner_last_name}`
        : priority.owner?.name || 'Unassigned';
        
      const issueData = {
        title: `${priority.title} - Off Track`,
        description: `Priority "${priority.title}" is off track. Due: ${formatDate(priority.due_date)}${daysLeft !== null ? ` (${daysLeft} days)` : ''}. Owner: ${ownerName}`,
        timeline: 'short_term',
        ownerId: priority.owner_id || priority.owner?.id || user?.id
      };
      
      await issuesService.createIssue(issueData);
      
      if (onIssueCreated) {
        onIssueCreated(`Issue created for ${priority.title}`);
      }
      
      setCreatingIssue(false);
    } catch (error) {
      console.error('Failed to create issue:', error);
      setCreatingIssue(false);
      alert('Failed to create issue. Please try again.');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdatingStatus(true);
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await quarterlyPrioritiesService.updatePriority(orgId, teamId, priority.id, {
        status: newStatus
      });
      
      // Update local state
      priority.status = newStatus;
      setEditingStatus(false);
      
      // Notify parent component
      if (onStatusChange) {
        onStatusChange(priority.id, newStatus);
      }
      
      setUpdatingStatus(false);
    } catch (error) {
      console.error('Failed to update status:', error);
      setUpdatingStatus(false);
      alert('Failed to update status. Please try again.');
    }
  };


  const isOffTrack = priority.status === 'off-track' || priority.status === 'at-risk';
  const showCreateIssue = !readOnly && isOffTrack && priority.status !== 'complete';

  return (
    <Card className={priority.status === 'off-track' ? 'border-red-200' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(priority.status)}`} />
              <h3 className="font-medium">{priority.title}</h3>
              {priority.teamName && (
                <Badge variant={priority.isFromLeadership ? "default" : "secondary"} className="text-xs">
                  {priority.teamName}
                </Badge>
              )}
            </div>
            {priority.description && (
              <p className="text-sm text-gray-600 mt-1">{priority.description}</p>
            )}
          </div>
          {!readOnly && !editingStatus ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1"
              onClick={() => setEditingStatus(true)}
              disabled={updatingStatus}
            >
              <Badge variant="outline" className={statusColors[priority.status] || statusColors['on-track']}>
                <span className="flex items-center gap-1">
                  {statusIcons[priority.status] || statusIcons['on-track']}
                  {priority.status || 'on-track'}
                  <Edit className="h-3 w-3 ml-1" />
                </span>
              </Badge>
            </Button>
          ) : editingStatus ? (
            <Select 
              value={priority.status || 'on-track'} 
              onValueChange={handleStatusChange}
              disabled={updatingStatus}
            >
              <SelectTrigger className="w-32">
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
            <Badge variant="outline" className={statusColors[priority.status] || statusColors['on-track']}>
              <span className="flex items-center gap-1">
                {statusIcons[priority.status] || statusIcons['on-track']}
                {priority.status || 'on-track'}
              </span>
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {priority.owner_first_name && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{priority.owner_first_name} {priority.owner_last_name}</span>
              </div>
            )}
            {priority.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(priority.due_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {showCreateIssue && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 hover:bg-red-50"
                onClick={handleCreateIssue}
                disabled={creatingIssue}
                title="Create issue for off-track priority"
              >
                {creatingIssue ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-600 mr-1" />
                    <span className="text-xs">Create Issue</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriorityCard;