import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, Users } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { teamsService } from '../../services/teamsService';

const CascadingMessageDialog = ({ open, onOpenChange, onSave }) => {
  const { user } = useAuthStore();
  const [message, setMessage] = useState('');
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [allTeams, setAllTeams] = useState(false);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTeams();
    }
  }, [open]);

  const fetchTeams = async () => {
    try {
      const response = await teamsService.getTeams();
      // The backend returns { success: true, data: [...] } where data is the array directly
      const allTeams = response?.data || [];
      // Filter out the current user's team to show only other teams
      const currentTeamId = user?.teams?.[0]?.id;
      const otherTeams = allTeams.filter(t => t.id !== currentTeamId);
      setTeams(otherTeams);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    
    setLoading(true);
    try {
      await onSave({
        message: message.trim(),
        recipientTeamIds: allTeams ? null : selectedTeams,
        allTeams
      });
      
      // Reset form
      setMessage('');
      setSelectedTeams([]);
      setAllTeams(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save cascading message:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTeamSelection = (teamId) => {
    setSelectedTeams(prev => 
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleAllTeamsChange = (checked) => {
    setAllTeams(checked);
    if (checked) {
      setSelectedTeams([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Create Cascading Message
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Message Input */}
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message to cascade to other teams..."
              className="min-h-[120px] mt-2"
              autoFocus
            />
          </div>

          {/* Team Selection */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4" />
              Select Teams to Cascade To
            </Label>
            
            {/* All Teams Checkbox */}
            <div className="mb-4">
              <label className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100">
                <Checkbox
                  checked={allTeams}
                  onCheckedChange={handleAllTeamsChange}
                />
                <span className="font-medium">Send to All Teams</span>
              </label>
            </div>

            {/* Individual Team Selection */}
            {!allTeams && (
              <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-2">
                {teams.length > 0 ? (
                  teams.map(team => (
                    <label
                      key={team.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedTeams.includes(team.id)}
                        onCheckedChange={() => toggleTeamSelection(team.id)}
                      />
                      <span>{team.name}</span>
                      {team.is_leadership_team && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Leadership
                        </span>
                      )}
                    </label>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No other teams available</p>
                )}
              </div>
            )}
          </div>

          {/* Selection Summary */}
          <div className="text-sm text-gray-600">
            {allTeams 
              ? 'This message will be sent to all teams in the organization'
              : selectedTeams.length > 0
              ? `Sending to ${selectedTeams.length} team${selectedTeams.length > 1 ? 's' : ''}`
              : 'No teams selected'
            }
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !message.trim() || (!allTeams && selectedTeams.length === 0)}
          >
            {loading ? 'Sending...' : 'Send Message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CascadingMessageDialog;