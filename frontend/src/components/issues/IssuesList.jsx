import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  MessageSquare,
  Archive,
  Check
} from 'lucide-react';

const IssuesList = ({ 
  issues, 
  onEdit, 
  onStatusChange, 
  onTimelineChange, 
  onArchive,
  onVote, 
  getStatusColor, 
  getStatusIcon, 
  readOnly = false, 
  showVoting = false,
  selectedIssues,
  onSelectionChange
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
              <TableHead className="w-12"></TableHead>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="min-w-0">Issue</TableHead>
              <TableHead className="w-32">Owner</TableHead>
              {showVoting && <TableHead className="w-20 text-center">Votes</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((issue, index) => {
              const hasVotes = (issue.vote_count || 0) > 0;
              const isTopIssue = index === 0 && hasVotes;
              
              return (
                <TableRow 
                  key={issue.id} 
                  className={`cursor-pointer transition-colors ${
                    isTopIssue 
                      ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                      : hasVotes 
                      ? 'bg-indigo-25 border-indigo-100 hover:bg-indigo-50'
                      : 'hover:bg-green-50'
                  }`}
                >
                <TableCell 
                  className="w-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={selectedIssues?.includes(issue.id) || false}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onSelectionChange([...(selectedIssues || []), issue.id]);
                        } else {
                          onSelectionChange((selectedIssues || []).filter(id => id !== issue.id));
                        }
                      }}
                      className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                    />
                  </div>
                </TableCell>
                <TableCell 
                  className={`text-sm font-medium ${
                    isTopIssue 
                      ? 'text-blue-700 font-bold'
                      : hasVotes 
                      ? 'text-indigo-600 font-semibold'
                      : 'text-gray-500'
                  }`}
                  onClick={() => setSelectedIssue(issue)}
                >
                  <div className="flex items-center gap-1">
                    {isTopIssue && <span className="text-xs text-blue-600">🔥</span>}
                    {index + 1}
                  </div>
                </TableCell>
                <TableCell className="font-medium" onClick={() => setSelectedIssue(issue)}>
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
                <TableCell onClick={() => setSelectedIssue(issue)} className="max-w-0">
                  <span className="text-sm text-gray-600 truncate block">
                    {issue.owner_name || 'Unassigned'}
                  </span>
                </TableCell>
                {showVoting && (
                  <TableCell className="text-center" onClick={() => setSelectedIssue(issue)}>
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
              );
            })}
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
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onArchive(selectedIssue.id);
                          setSelectedIssue(null);
                        }}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
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