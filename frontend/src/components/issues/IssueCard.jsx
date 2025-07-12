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
  ArrowRight
} from 'lucide-react';

const IssueCard = ({ issue, onEdit, onStatusChange, onTimelineChange, getStatusColor, getStatusIcon }) => {
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
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge className={`${getStatusColor(issue.status)} flex items-center gap-1`}>
                  {getStatusIcon(issue.status)}
                  <span className="capitalize">{issue.status.replace('-', ' ')}</span>
                </Badge>

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
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IssueCard;