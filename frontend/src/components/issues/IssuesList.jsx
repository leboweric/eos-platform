import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  Clock,
  MessageSquare
} from 'lucide-react';

const IssuesList = ({ 
  issues, 
  onEdit, 
  onStatusChange, 
  onTimelineChange, 
  onVote, 
  getStatusColor, 
  getStatusIcon, 
  readOnly = false, 
  showVoting = false 
}) => {
  const [selectedIssue, setSelectedIssue] = useState(null);

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
    <>
      <div className="bg-white rounded-lg shadow-sm border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead className="w-40">Owner</TableHead>
              {showVoting && <TableHead className="w-20 text-center">Votes</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((issue, index) => (
              <TableRow 
                key={issue.id} 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedIssue(issue)}
              >
                <TableCell className="text-sm text-gray-500 font-medium">
                  {index + 1}
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-gray-900 line-clamp-1">{issue.title}</div>
                      {issue.description && (
                        <div className="text-sm text-gray-500 line-clamp-1 mt-1">
                          {issue.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      {issue.attachment_count > 0 && (
                        <div className="flex items-center">
                          <Paperclip className="h-4 w-4" />
                          <span className="text-xs ml-1">{issue.attachment_count}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-600 truncate block">
                    {issue.owner_name || 'Unassigned'}
                  </span>
                </TableCell>
                {showVoting && (
                  <TableCell className="text-center">
                    <Button
                      variant={issue.user_has_voted ? "default" : "outline"}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onVote(issue.id, !issue.user_has_voted);
                      }}
                      className="h-8 px-2"
                    >
                      <ThumbsUp className={`h-3 w-3 ${issue.user_has_voted ? 'fill-current' : ''}`} />
                      <span className="ml-1 text-xs">{issue.vote_count || 0}</span>
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Issue Detail Modal */}
      <Dialog open={!!selectedIssue} onOpenChange={(open) => !open && setSelectedIssue(null)}>
        <DialogContent className="max-w-2xl">
          {selectedIssue && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold pr-8">
                  {selectedIssue.title}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                {selectedIssue.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                    <p className="text-gray-600 whitespace-pre-wrap">{selectedIssue.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Details</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Owner:</span>
                        <span className="font-medium">{selectedIssue.owner_name || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">{formatDate(selectedIssue.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Timeline:</span>
                        <Badge variant="outline" className="text-xs">
                          {selectedIssue.timeline === 'short_term' ? 'Short Term' : 'Long Term'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`${getStatusColor(selectedIssue.status)}`}>
                          {getStatusIcon(selectedIssue.status)}
                          <span className="ml-1 capitalize">{selectedIssue.status}</span>
                        </Badge>
                      </div>
                      {selectedIssue.attachment_count > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Paperclip className="h-4 w-4 text-gray-400" />
                          <span>{selectedIssue.attachment_count} attachment{selectedIssue.attachment_count > 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {showVoting && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <ThumbsUp className="h-4 w-4 text-gray-400" />
                          <span>{selectedIssue.vote_count || 0} vote{(selectedIssue.vote_count || 0) !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedIssue.is_published_to_departments && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MessageSquare className="h-4 w-4 text-gray-400" />
                      <span>Published to departments on {formatDate(selectedIssue.published_at)}</span>
                    </div>
                  </div>
                )}

                {!readOnly && (
                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="flex gap-2">
                      <Button
                        variant={selectedIssue.status === 'open' ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => {
                          onStatusChange(selectedIssue.id, 'closed');
                          setSelectedIssue(null);
                        }}
                        disabled={selectedIssue.status === 'closed'}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark Closed
                      </Button>
                      <Button
                        variant={selectedIssue.status === 'closed' ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => {
                          onStatusChange(selectedIssue.id, 'open');
                          setSelectedIssue(null);
                        }}
                        disabled={selectedIssue.status === 'open'}
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Reopen
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          onTimelineChange(selectedIssue.id, selectedIssue.timeline === 'short_term' ? 'long_term' : 'short_term');
                          setSelectedIssue(null);
                        }}
                      >
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Move to {selectedIssue.timeline === 'short_term' ? 'Long Term' : 'Short Term'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          onEdit(selectedIssue);
                          setSelectedIssue(null);
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Issue
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IssuesList;