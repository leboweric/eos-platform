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
import { quarterlyPrioritiesService } from '../../services/quarterlyPrioritiesService';
import { teamsService } from '../../services/teamsService';

export function MovePriorityDialog({ isOpen, onClose, priority, onSuccess }) {
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
      console.log('Current priority:', priority);
      
      // Check what the actual team field is called
      const currentTeamId = priority?.team_id || priority?.department_id || priority?.teamId;
      
      // Handle different response structures
      const teamsList = response?.data?.teams || response?.data || response || [];
      
      // Filter out the current team
      const availableTeams = Array.isArray(teamsList) 
        ? teamsList.filter(team => team.id !== currentTeamId)
        : [];
      
      console.log('Available teams:', availableTeams);
      setTeams(availableTeams);
      
      if (availableTeams.length === 0) {
        setError('No other teams available to move this priority to');
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
      const response = await quarterlyPrioritiesService.movePriorityToTeam(priority.id, selectedTeamId, reason);
      
      if (response.success) {
        onSuccess(response.message || 'Priority moved successfully');
        onClose();
      } else {
        setError(response.message || 'Failed to move priority');
      }
    } catch (error) {
      console.error('Error moving priority:', error);
      setError('Failed to move priority. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!priority) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Move Priority to Another Team</DialogTitle>
          <DialogDescription>
            Transfer "{priority.title}" from {priority.team_name || 'current team'} to another team.
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
              placeholder="Explain why this priority is being transferred..."
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
            {isLoading ? 'Moving...' : 'Move Priority'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}