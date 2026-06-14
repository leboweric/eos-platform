import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send, Users } from 'lucide-react';
import { teamsService } from '../../services/teamsService';
import { TeamMemberSelect } from './TeamMemberSelect';

export const EMPTY_TRANSFER_STATE = {
  enabled: false,
  destinationTeamId: '',
  assigneeId: '',
  reason: ''
};

export default function TransferToTeamSection({
  sourceTeamId,
  transfer,
  onTransferChange,
  requireAssignee = false,
  assigneeLabel = 'Assign to',
  showToggle = true
}) {
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamsError, setTeamsError] = useState(null);

  const update = (patch) => onTransferChange({ ...transfer, ...patch });

  const isActive = showToggle ? transfer.enabled : true;

  useEffect(() => {
    if (!isActive) return;

    const fetchTeams = async () => {
      setLoadingTeams(true);
      setTeamsError(null);
      try {
        const response = await teamsService.getTeams();
        const teamsList = response?.data?.teams || response?.data || response || [];
        const available = Array.isArray(teamsList)
          ? teamsList.filter((team) => team.id && team.id !== sourceTeamId)
          : [];
        setTeams(available);
        if (available.length === 0) {
          setTeamsError('No other teams available');
        }
      } catch (error) {
        console.error('Failed to load teams for transfer:', error);
        setTeamsError('Failed to load teams');
        setTeams([]);
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchTeams();
  }, [isActive, sourceTeamId]);

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-4">
      {showToggle && (
        <div className="flex items-start gap-3">
          <Checkbox
            id="send-to-team"
            checked={transfer.enabled}
            onCheckedChange={(checked) => {
              onTransferChange(
                checked
                  ? { ...EMPTY_TRANSFER_STATE, enabled: true }
                  : { ...EMPTY_TRANSFER_STATE }
              );
            }}
          />
          <div className="space-y-1">
            <Label htmlFor="send-to-team" className="text-sm font-semibold text-slate-800 flex items-center gap-2 cursor-pointer">
              <Send className="h-4 w-4 text-indigo-600" />
              Send to another team
            </Label>
            <p className="text-xs text-slate-500">
              Item will appear on the destination team&apos;s list, not this meeting&apos;s team.
            </p>
          </div>
        </div>
      )}

      {isActive && (
        <div className={`space-y-4 ${showToggle ? 'pl-7' : ''}`}>
          {teamsError && (
            <p className="text-sm text-red-600">{teamsError}</p>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Destination team
            </Label>
            <Select
              value={transfer.destinationTeamId}
              onValueChange={(value) => update({ destinationTeamId: value, assigneeId: '' })}
              disabled={loadingTeams || teams.length === 0}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder={loadingTeams ? 'Loading teams...' : 'Select a team'} />
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

          {transfer.destinationTeamId && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">{assigneeLabel}</Label>
              <TeamMemberSelect
                teamId={transfer.destinationTeamId}
                value={transfer.assigneeId}
                onValueChange={(value) => update({ assigneeId: value })}
                placeholder={requireAssignee ? 'Select assignee (required)' : 'Select owner (optional)'}
                includeAllIfLeadership={false}
                showMemberCount={false}
                allowUnassigned={!requireAssignee}
                unassignedLabel="No owner"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Note (optional)</Label>
            <Textarea
              value={transfer.reason}
              onChange={(e) => update({ reason: e.target.value })}
              placeholder="Why is this being sent to another team?"
              rows={2}
              className="bg-white resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}