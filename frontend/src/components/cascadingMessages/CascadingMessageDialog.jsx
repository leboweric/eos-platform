import React, { useState, useEffect } from 'react';
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
import { getOrgTheme } from '../../utils/themeUtils';

const CascadingMessageDialog = ({ open, onOpenChange, onSave }) => {
  const { user } = useAuthStore();
  const orgId = user?.organizationId || user?.organization_id;
  const savedTheme = getOrgTheme(orgId);
  const themeColors = savedTheme || {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    accent: '#10B981'
  };
  
  const [message, setMessage] = useState('');
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [allTeams, setAllTeams] = useState(false);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTeams();
      // Reset form when opening
      setMessage('');
      setSelectedTeams([]);
      setAllTeams(false);
      setLoading(false);
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
      <DialogContent className="sm:max-w-[600px] bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl">
        <DialogHeader className="pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{
              background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
            }}>
              <Send className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Create Cascading Message
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>
        
        <div className="grid gap-6 py-6">
          {/* Message Input */}
          <div className="grid gap-3">
            <Label htmlFor="message" className="text-sm font-semibold text-slate-700">
              Message <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message to cascade to other teams...

Tip: Use bullet points for lists:
- Item one
- Item two"
              rows={6}
              className="resize-y bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 min-h-[120px]"
              autoFocus
            />
            <p className="text-xs text-slate-500">
              Tip: Press Enter for new lines. Start lines with - or • for bullet points.
            </p>
          </div>

          {/* Team Selection */}
          <div className="grid gap-3">
            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Select Teams to Cascade To
            </Label>
            
            {/* All Teams Checkbox */}
            <div>
              <label className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 border border-blue-100/50 shadow-sm">
                <Checkbox
                  checked={allTeams}
                  onCheckedChange={handleAllTeamsChange}
                />
                <span className="font-semibold text-slate-700">Send to All Teams</span>
              </label>
            </div>

            {/* Individual Team Selection */}
            {!allTeams && (
              <div className="space-y-2 max-h-[240px] overflow-y-auto bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl p-3 shadow-sm">
                {teams.length > 0 ? (
                  teams.map(team => (
                    <label
                      key={team.id}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50/80 rounded-lg cursor-pointer transition-all duration-200"
                    >
                      <Checkbox
                        checked={selectedTeams.includes(team.id)}
                        onCheckedChange={() => toggleTeamSelection(team.id)}
                      />
                      <span className="font-medium text-slate-700">{team.name}</span>
                      {team.is_leadership_team && (
                        <span className="text-xs font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 px-2 py-1 rounded-lg">
                          Leadership
                        </span>
                      )}
                    </label>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-8 font-medium">No other teams available</p>
                )}
              </div>
            )}
          </div>

          {/* Selection Summary */}
          <div className="text-sm font-medium text-slate-600 bg-slate-50/80 backdrop-blur-sm rounded-xl p-3 border border-slate-100">
            {allTeams 
              ? '📢 This message will be sent to all teams in the organization'
              : selectedTeams.length > 0
              ? `✉️ Sending to ${selectedTeams.length} team${selectedTeams.length > 1 ? 's' : ''}`
              : '⚠️ No teams selected'
            }
          </div>
        </div>

        <DialogFooter className="pt-6 border-t border-white/20">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm transition-all duration-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !message.trim() || (!allTeams && selectedTeams.length === 0)}
            className="text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            {loading ? 'Sending...' : 'Send Message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CascadingMessageDialog;
