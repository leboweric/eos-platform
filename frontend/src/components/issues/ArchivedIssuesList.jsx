import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  RotateCcw,
  User,
  Calendar,
  Paperclip,
  CheckCircle,
  AlertTriangle,
  Archive,
  Clock
} from 'lucide-react';

const ArchivedIssuesList = ({ issues, onUnarchive, getStatusColor, getStatusIcon }) => {
  const [selectedIssue, setSelectedIssue] = useState(null);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead className="w-40">Owner</TableHead>
              <TableHead className="w-32">Archived</TableHead>
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
                      <div className="text-gray-700 line-clamp-1">{issue.title}</div>
                      {issue.description && (
                        <div className="text-sm text-gray-400 line-clamp-1 mt-1">
                          {issue.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Archive className="h-4 w-4" />
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
                  <span className="text-sm text-gray-500 truncate block">
                    {issue.owner_name || 'Unassigned'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-500">
                    {formatDate(issue.archived_at)}
                  </span>
                </TableCell>
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
                <div className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-gray-400" />
                  <DialogTitle className="text-xl font-semibold">
                    {selectedIssue.title} (Archived)
                  </DialogTitle>
                </div>
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
                        <Archive className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Archived:</span>
                        <span className="font-medium">{formatDate(selectedIssue.archived_at)}</span>
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
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      onUnarchive(selectedIssue.id);
                      setSelectedIssue(null);
                    }}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore Issue
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ArchivedIssuesList;