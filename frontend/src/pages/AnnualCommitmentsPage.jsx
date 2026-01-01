import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useDepartment } from '../contexts/DepartmentContext';
import { useTerminology } from '../contexts/TerminologyContext';
import annualCommitmentsService from '../services/annualCommitmentsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Target, 
  Users, 
  Calendar,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const AnnualCommitmentsPage = () => {
  const { user } = useAuthStore();
  const { selectedDepartment } = useDepartment();
  const { labels } = useTerminology();
  
  const [commitments, setCommitments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTeams, setExpandedTeams] = useState({});

  useEffect(() => {
    fetchCommitments();
  }, [user?.organizationId]);

  const fetchCommitments = async () => {
    if (!user?.organizationId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await annualCommitmentsService.getOrganizationCommitments(
        user.organizationId
      );
      setCommitments(data || []);
      
      // Auto-expand all teams by default
      const teams = [...new Set(data.map(c => c.team_id))];
      const expanded = {};
      teams.forEach(teamId => {
        expanded[teamId] = true;
      });
      setExpandedTeams(expanded);
    } catch (err) {
      console.error('Error fetching commitments:', err);
      setError('Failed to load annual commitments');
    } finally {
      setLoading(false);
    }
  };

  const toggleTeam = (teamId) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  const getUserInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  // Group commitments by team
  const commitmentsByTeam = commitments.reduce((acc, commitment) => {
    const teamId = commitment.team_id;
    const teamName = commitment.team_name || 'No Team';
    const teamColor = commitment.team_color || '#6366f1';
    
    if (!acc[teamId]) {
      acc[teamId] = {
        teamId,
        teamName,
        teamColor,
        commitments: []
      };
    }
    acc[teamId].commitments.push(commitment);
    return acc;
  }, {});

  const teamGroups = Object.values(commitmentsByTeam).sort((a, b) => 
    a.teamName.localeCompare(b.teamName)
  );

  // Get unique years from commitments
  const years = [...new Set(commitments.map(c => c.year))].sort((a, b) => b - a);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="h-7 w-7 text-primary" />
          Annual Commitments
        </h1>
        <p className="text-gray-600 mt-1">
          View all team members' annual commitments for accountability and alignment
        </p>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {!loading && commitments.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Commitments Found
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              No annual commitments have been set yet. 
              Commitments are typically set during Annual Planning meetings.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Commitments by Team */}
      {teamGroups.map(({ teamId, teamName, teamColor, commitments: teamCommitments }) => (
        <Card key={teamId} className="mb-4 overflow-hidden">
          {/* Team Header */}
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleTeam(teamId)}
            style={{ borderLeft: `4px solid ${teamColor}` }}
          >
            <div className="flex items-center gap-3">
              {expandedTeams[teamId] ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-500" />
              )}
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${teamColor}15` }}
              >
                <Users className="h-5 w-5" style={{ color: teamColor }} />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">{teamName}</h2>
                <p className="text-sm text-gray-500">
                  {teamCommitments.length} commitment{teamCommitments.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Team Commitments */}
          {expandedTeams[teamId] && (
            <CardContent className="pt-0 pb-4">
              <div className="space-y-4 mt-2">
                {teamCommitments.map((commitment) => (
                  <div 
                    key={commitment.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-100"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback 
                          style={{ 
                            backgroundColor: `${teamColor}20`,
                            color: teamColor 
                          }}
                        >
                          {getUserInitials(commitment.first_name, commitment.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">
                            {commitment.first_name} {commitment.last_name}
                          </span>
                          {commitment.user_id === user?.id && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                          <Badge 
                            variant="secondary"
                            className="text-xs"
                            style={{ 
                              backgroundColor: `${teamColor}15`,
                              color: teamColor 
                            }}
                          >
                            {commitment.year}
                          </Badge>
                        </div>
                        
                        {/* Commitment Text */}
                        <blockquote className="relative pl-4 border-l-2" style={{ borderColor: teamColor }}>
                          <p className="text-gray-700 italic leading-relaxed">
                            "{commitment.commitment_text}"
                          </p>
                        </blockquote>
                        
                        {/* Metadata */}
                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Set {new Date(commitment.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          {commitment.updated_at && commitment.updated_at !== commitment.created_at && (
                            <span>
                              Updated {new Date(commitment.updated_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {/* Summary Stats */}
      {commitments.length > 0 && (
        <Card className="mt-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{commitments.length}</div>
                  <div className="text-sm text-gray-600">Total Commitments</div>
                </div>
                <div className="h-10 w-px bg-gray-200" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{teamGroups.length}</div>
                  <div className="text-sm text-gray-600">Teams</div>
                </div>
                <div className="h-10 w-px bg-gray-200" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {[...new Set(commitments.map(c => c.user_id))].length}
                  </div>
                  <div className="text-sm text-gray-600">Team Members</div>
                </div>
                {years.length > 0 && (
                  <>
                    <div className="h-10 w-px bg-gray-200" />
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{years.join(', ')}</div>
                      <div className="text-sm text-gray-600">Year{years.length > 1 ? 's' : ''}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnnualCommitmentsPage;
