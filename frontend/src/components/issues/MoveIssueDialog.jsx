import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle } from 'lucide-react';
import { issuesService } from '../../services/issuesService';
import TransferToTeamSection, { EMPTY_TRANSFER_STATE } from '../shared/TransferToTeamSection';

export function MoveIssueDialog({ isOpen, onClose, issue, onSuccess, sourceTeamId }) {
  const [transfer, setTransfer] = useState({ ...EMPTY_TRANSFER_STATE, enabled: true });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentTeamId = issue?.team_id || issue?.department_id || issue?.teamId || sourceTeamId;

  useEffect(() => {
    if (isOpen) {
      setTransfer({ ...EMPTY_TRANSFER_STATE, enabled: true });
      setError(null);
    }
  }, [isOpen, issue?.id]);

  const handleSubmit = async () => {
    if (!transfer.destinationTeamId) {
      setError('Please select a destination team');
      return;
    }

    if (transfer.destinationTeamId === currentTeamId) {
      setError('Please select a different team');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await issuesService.moveIssueToTeam(
        issue.id,
        transfer.destinationTeamId,
        transfer.reason,
        transfer.assigneeId || null
      );

      if (response.success) {
        onSuccess(response.message || 'Issue sent successfully');
        onClose();
      } else {
        setError(response.message || 'Failed to send issue');
      }
    } catch (err) {
      console.error('Error moving issue:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to send issue. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!issue) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Send Issue to Another Team</DialogTitle>
          <DialogDescription>
            Send &quot;{issue.title}&quot; from {issue.team_name || 'this team'} to another team&apos;s issues list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <TransferToTeamSection
            sourceTeamId={currentTeamId}
            transfer={transfer}
            onTransferChange={setTransfer}
            requireAssignee={false}
            assigneeLabel="Assign owner on destination team (optional)"
            showToggle={false}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !transfer.destinationTeamId}>
            {isLoading ? 'Sending...' : 'Send Issue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}