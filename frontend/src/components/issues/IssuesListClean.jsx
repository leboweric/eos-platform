import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  Edit,
  User,
  Calendar,
  Paperclip,
  ArrowRight,
  ThumbsUp,
  Clock,
  Archive,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Users
} from 'lucide-react';

const IssuesListClean = ({ 
  issues, 
  onEdit, 
  onStatusChange, 
  onTimelineChange, 
  onArchive,
  onVote,
  onMoveToTeam,
  getStatusColor, 
  getStatusIcon, 
  readOnly = false, 
  showVoting = false
}) => {
  const [selectedIssue, setSelectedIssue] = useState(null);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <>
      <div className="space-y-3">
        {(issues || []).map((issue, index) => {
          const hasVotes = (issue.vote_count || 0) > 0;
          const isTopIssue = index === 0 && hasVotes && showVoting;
          
          return (
            <div
              key={issue.id}
              className={`
                group relative bg-white rounded-lg border transition-all duration-200 cursor-pointer
                ${issue.status === 'closed' ? 'opacity-60' : ''}
                ${isTopIssue ? 'border-blue-300 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}
              `}
              onClick={() => setSelectedIssue(issue)}
            >
              {/* Status indicator - subtle left border */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
                issue.status === 'open' ? 'bg-yellow-500' : 'bg-gray-400'
              }`} />
              
              <div className="p-4 pl-6">
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={issue.status === 'closed'}
                      onCheckedChange={(checked) => {
                        onStatusChange(issue.id, checked ? 'closed' : 'open');
                      }}
                      className="h-5 w-5 rounded border-gray-300 data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
                    />
                  </div>
                  
                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    {/* Title with trending indicator */}
                    <div className="flex items-start gap-2">
                      {/* Issue Number */}
                      <span className={`
                        text-sm font-semibold min-w-[2rem]
                        ${isTopIssue ? 'text-blue-600' : 'text-gray-500'}
                      `}>
                        #{index + 1}
                      </span>
                      {isTopIssue && (
                        <span className="text-blue-600 text-sm" title="Most voted issue">🔥</span>
                      )}
                      <h3 className={`
                        text-base font-medium leading-tight flex-1
                        ${issue.status === 'closed' ? 'text-gray-400 line-through' : 'text-gray-900'}
                      `}>
                        {issue.title}
                      </h3>
                    </div>
                    
                    {/* Metadata - clean single line */}
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      {/* Owner */}
                      <span className="text-gray-500">
                        {issue.owner_name || 'Unassigned'}
                      </span>
                      
                      {/* Separator */}
                      <span className="text-gray-300">•</span>
                      
                      {/* Created date */}
                      <span className="text-gray-500">
                        {formatDate(issue.created_at)}
                      </span>
                      
                      {/* Attachments */}
                      {issue.attachment_count > 0 && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1 text-gray-500">
                            <Paperclip className="h-3.5 w-3.5" />
                            {issue.attachment_count}
                          </span>
                        </>
                      )}
                      
                      {/* Votes - only show if voting enabled */}
                      {showVoting && (
                        <>
                          <span className="text-gray-300">•</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVote(issue.id, !issue.user_has_voted);
                            }}
                            className={`
                              flex items-center gap-1 text-sm font-medium
                              ${issue.user_has_voted ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}
                            `}
                          >
                            <ThumbsUp className={`h-3.5 w-3.5 ${issue.user_has_voted ? 'fill-current' : ''}`} />
                            {issue.vote_count || 0}
                          </button>
                        </>
                      )}
                      
                      {/* Status dot for closed items */}
                      {issue.status === 'closed' && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Solved
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions menu - visible on hover */}
                  {!readOnly && (
                    <div 
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                          >
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(issue);
                            }}
                            className="cursor-pointer"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {issue.timeline === 'short_term' ? (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onTimelineChange(issue.id, 'long_term');
                              }}
                              className="cursor-pointer"
                            >
                              <ArrowRight className="mr-2 h-4 w-4" />
                              Move to Long Term
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onTimelineChange(issue.id, 'short_term');
                              }}
                              className="cursor-pointer"
                            >
                              <ArrowRight className="mr-2 h-4 w-4" />
                              Move to Short Term
                            </DropdownMenuItem>
                          )}
                          {issue.status === 'closed' && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onArchive(issue.id);
                              }}
                              className="cursor-pointer text-red-600 focus:text-red-600"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          {onMoveToTeam && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onMoveToTeam(issue);
                              }}
                              className="cursor-pointer"
                            >
                              <Users className="mr-2 h-4 w-4" />
                              Move to Team
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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
                        <span className="font-medium">
                          {selectedIssue.timeline === 'short_term' ? 'Short Term' : 'Long Term'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          selectedIssue.status === 'open' ? 'bg-yellow-500' : 'bg-gray-400'
                        }`} />
                        <span className="text-sm font-medium capitalize">{selectedIssue.status}</span>
                      </div>
                      {selectedIssue.vote_count > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <ThumbsUp className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Votes:</span>
                          <span className="font-medium">{selectedIssue.vote_count}</span>
                        </div>
                      )}
                      {selectedIssue.attachment_count > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Paperclip className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Attachments:</span>
                          <span className="font-medium">{selectedIssue.attachment_count}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedIssue(null)}
                  >
                    Close
                  </Button>
                  {!readOnly && (
                    <Button
                      onClick={() => {
                        onEdit(selectedIssue);
                        // Keep modal open briefly to ensure edit dialog opens
                        setTimeout(() => setSelectedIssue(null), 100);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Issue
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IssuesListClean;