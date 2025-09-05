import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { stripHtml } from '../../utils/textUtils';
import { Badge } from '@/components/ui/badge';
import { 
  RotateCcw,
  User,
  Calendar,
  Paperclip,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

const ArchivedIssueCard = ({ issue, onUnarchive, getStatusColor, getStatusIcon }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className={`hover:shadow-md transition-all duration-300 ${issue.isMoving ? 'opacity-0 scale-95' : 'opacity-75'}`>
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
                    {stripHtml(issue.description)}
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
                    <span className="font-medium">Timeline:</span>
                    <span className="capitalize">{issue.timeline?.replace('_', ' ') || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge className={`${getStatusColor(issue.status)} flex items-center gap-1`}>
                  {getStatusIcon(issue.status)}
                  <span className="capitalize">{issue.status.replace('-', ' ')}</span>
                </Badge>

                <Button 
                  onClick={() => onUnarchive(issue.id)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restore
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ArchivedIssueCard;