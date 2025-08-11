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
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle } from 'lucide-react';
import { issuesService } from '../../services/issuesService';
import { teamsService } from '../../services/teamsService';

export function MoveIssueDialog({ isOpen, onClose, issue, onSuccess }) {
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchTeams();
      // Reset form
      setSelectedTeamId('');
      setReason('');
      setError(null);
    }
  }, [isOpen]);

  const fetchTeams = async () => {
    try {
      const response = await teamsService.getTeams();
      console.log('Teams response:', response);
      console.log('Current issue:', issue);
      
      // Check what the actual team field is called
      const currentTeamId = issue?.team_id || issue?.department_id || issue?.teamId;
      
      // Handle different response structures
      const teamsList = response?.data?.teams || response?.data || response || [];
      
      // Filter out the current team
      const availableTeams = Array.isArray(teamsList) 
        ? teamsList.filter(team => team.id !== currentTeamId)
        : [];
      
      console.log('Available teams:', availableTeams);
      setTeams(availableTeams);
      
      if (availableTeams.length === 0) {
        setError('No other teams available to move this issue to');
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError('Failed to load teams');
    }
  };

  const handleSubmit = async () => {
    if (!selectedTeamId) {
      setError('Please select a destination team');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await issuesService.moveIssueToTeam(issue.id, selectedTeamId, reason);
      
      if (response.success) {
        onSuccess(response.message || 'Issue moved successfully');
        onClose();
      } else {
        setError(response.message || 'Failed to move issue');
      }
    } catch (error) {
      console.error('Error moving issue:', error);
      setError('Failed to move issue. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!issue) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Move Issue to Another Team</DialogTitle>
          <DialogDescription>
            Transfer "{issue.title}" from {issue.team_name || 'current team'} to another team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="team">Destination Team</Label>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger id="team">
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                    {team.is_leadership_team && ' (Leadership)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Transfer (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this issue is being transferred..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !selectedTeamId}>
            {isLoading ? 'Moving...' : 'Move Issue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}