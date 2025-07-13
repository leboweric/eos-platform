import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Target,
  User,
  Calendar,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useState } from 'react';
import { issuesService } from '../../services/issuesService';
import { useAuthStore } from '../../stores/authStore';

const PriorityCard = ({ priority, readOnly = false, onIssueCreated }) => {
  const { user } = useAuthStore();
  const [creatingIssue, setCreatingIssue] = useState(false);
  const statusColors = {
    'on-track': 'bg-green-100 text-green-700 border-green-200',
    'off-track': 'bg-red-100 text-red-700 border-red-200',
    'complete': 'bg-blue-100 text-blue-700 border-blue-200'
  };

  const statusIcons = {
    'on-track': <Target className="h-4 w-4" />,
    'off-track': <Target className="h-4 w-4" />,
    'complete': <CheckCircle className="h-4 w-4" />
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
        category: 'short-term',
        priority: 'high',
        assignedToId: priority.owner?.id || user?.id
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

  const isOffTrack = priority.status === 'off-track' || priority.status === 'at-risk';
  const showCreateIssue = !readOnly && isOffTrack && priority.status !== 'complete';

  return (
    <Card className={priority.status === 'off-track' ? 'border-red-200' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-medium">{priority.title}</h3>
            {priority.description && (
              <p className="text-sm text-gray-600 mt-1">{priority.description}</p>
            )}
          </div>
          <Badge variant="outline" className={statusColors[priority.status] || statusColors['on-track']}>
            <span className="flex items-center gap-1">
              {statusIcons[priority.status] || statusIcons['on-track']}
              {priority.status || 'on-track'}
            </span>
          </Badge>
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
      </CardContent>
    </Card>
  );
};

export default PriorityCard;