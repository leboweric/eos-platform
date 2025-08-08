import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical,
  Edit,
  User,
  Calendar,
  Paperclip,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ThumbsUp,
  Users
} from 'lucide-react';

/**
 * IssueCard component for displaying issue information
 * @param {Object} props - Component props
 * @param {Object} props.issue - Issue data
 * @param {string} props.issue.id - Issue ID
 * @param {string} props.issue.title - Issue title
 * @param {string} props.issue.description - Issue description
 * @param {string} props.issue.status - Issue status (open/closed)
 * @param {string} props.issue.timeline - Issue timeline (short_term/long_term)
 * @param {string} props.issue.owner_name - Name of the issue owner
 * @param {string} props.issue.created_at - Issue creation date
 * @param {number} props.issue.attachment_count - Number of attachments
 * @param {boolean} props.issue.user_has_voted - Whether current user has voted
 * @param {number} props.issue.vote_count - Total number of votes
 * @param {boolean} props.issue.is_published_to_departments - Whether issue is published to departments
 * @param {string} props.issue.published_at - Publication timestamp
 * @param {string} props.issue.published_by - ID of user who published
 * @param {Function} props.onEdit - Edit handler
 * @param {Function} props.onStatusChange - Status change handler
 * @param {Function} props.onTimelineChange - Timeline change handler
 * @param {Function} props.onVote - Vote handler
 * @param {Function} props.onMoveToTeam - Move to team handler
 * @param {Function} props.getStatusColor - Get status color function
 * @param {Function} props.getStatusIcon - Get status icon function
 * @param {boolean} props.readOnly - Whether in read-only mode
 * @param {boolean} props.showVoting - Whether to show voting interface
 */
const IssueCard = ({ issue, onEdit, onStatusChange, onTimelineChange, onVote, onMoveToTeam, getStatusColor, getStatusIcon, readOnly = false, showVoting = false }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const statusOptions = [
    { value: 'open', label: 'Open', icon: <AlertTriangle className="h-4 w-4" /> },
    { value: 'closed', label: 'Closed', icon: <CheckCircle className="h-4 w-4" /> }
  ];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {issue.title}
                </h3>
                
                {issue.description && (
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {issue.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1 text-gray-500">
                    <User className="h-4 w-4" />
                    <span>
                      {issue.owner_name || 'Unassigned'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>Created {formatDate(issue.created_at)}</span>
                  </div>

                  {issue.attachment_count > 0 && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <Paperclip className="h-4 w-4" />
                      <span>{issue.attachment_count} attachment{issue.attachment_count > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1 text-gray-500">
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                      {issue.timeline === 'short_term' ? 'Short Term' : 'Long Term'}
                    </span>
                  </div>

                  {showVoting && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant={issue.user_has_voted ? "default" : "outline"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onVote(issue.id, !issue.user_has_voted);
                        }}
                        className="flex items-center gap-1"
                      >
                        <ThumbsUp className={`h-4 w-4 ${issue.user_has_voted ? 'fill-current' : ''}`} />
                        <span>{issue.vote_count || 0}</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge className={`${getStatusColor(issue.status)} flex items-center gap-1`}>
                  {getStatusIcon(issue.status)}
                  <span className="capitalize">{issue.status.replace('-', ' ')}</span>
                </Badge>

                {!readOnly && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(issue)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <div className="px-2 py-1.5 text-sm font-medium">Change Status</div>
                      {statusOptions.map(option => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => onStatusChange(issue.id, option.value)}
                          disabled={issue.status === option.value}
                        >
                          <span className="mr-2">{option.icon}</span>
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem 
                        onClick={() => onTimelineChange(issue.id, issue.timeline === 'short_term' ? 'long_term' : 'short_term')}
                      >
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Move to {issue.timeline === 'short_term' ? 'Long Term' : 'Short Term'}
                      </DropdownMenuItem>
                      
                      {onMoveToTeam && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onMoveToTeam(issue)}>
                            <Users className="mr-2 h-4 w-4" />
                            Move to Team
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IssueCard;