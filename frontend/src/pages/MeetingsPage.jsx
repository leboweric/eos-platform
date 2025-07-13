import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Calendar,
  Clock,
  ChevronRight,
  Target,
  BarChart,
  AlertTriangle
} from 'lucide-react';
import { teamsService } from '../services/teamsService';

const MeetingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [loadingTeams, setLoadingTeams] = useState(true);

  const meetings = [
    {
      id: 'weekly-accountability',
      title: 'Weekly Accountability Meeting',
      description: 'Review scorecard, priorities, and solve issues as a team',
      duration: '90 minutes',
      frequency: 'Weekly',
      icon: Users,
      color: 'bg-blue-500',
      features: [
        'Good News & Headlines',
        'Scorecard Review',
        'Quarterly Priorities Check',
        'Issues Discussion'
      ]
    },
    {
      id: 'quarterly-planning',
      title: 'Quarterly Planning',
      description: 'Set priorities and goals for the upcoming quarter',
      duration: '4-8 hours',
      frequency: 'Quarterly',
      icon: Target,
      color: 'bg-green-500',
      features: [
        'Review previous quarter',
        'Set new priorities',
        'Resource planning',
        'Team alignment'
      ],
      comingSoon: true
    },
    {
      id: 'annual-planning',
      title: 'Annual Planning',
      description: 'Define vision, set annual goals, and plan the year ahead',
      duration: '2 days',
      frequency: 'Annually',
      icon: Calendar,
      color: 'bg-purple-500',
      features: [
        'Vision refinement',
        'Annual goals',
        'Budget planning',
        'Strategic initiatives'
      ],
      comingSoon: true
    }
  ];

  useEffect(() => {
    fetchUserTeams();
  }, []);

  const fetchUserTeams = async () => {
    try {
      setLoadingTeams(true);
      
      // Use the same default team ID pattern as other pages
      const teamId = user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      const defaultTeam = {
        id: teamId,
        name: 'Leadership Team'
      };
      setTeams([defaultTeam]);
      setSelectedTeamId(teamId);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      setTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleStartMeeting = (meetingId) => {
    if (meetingId === 'weekly-accountability' && selectedTeamId) {
      navigate(`/meetings/weekly-accountability/${selectedTeamId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Meetings</h1>
              <p className="text-gray-600 mt-2 text-lg">Run effective meetings with structured agendas</p>
            </div>
            {teams.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Team</label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Choose a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetings.map((meeting) => {
            const Icon = meeting.icon;
            return (
              <Card key={meeting.id} className={`relative overflow-hidden ${meeting.comingSoon ? 'opacity-75' : ''}`}>
                <div className={`h-2 ${meeting.color}`} />
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg ${meeting.color} bg-opacity-10`}>
                      <Icon className={`h-6 w-6 ${meeting.color.replace('bg-', 'text-')}`} />
                    </div>
                    {meeting.comingSoon && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Coming Soon</span>
                    )}
                  </div>
                  <CardTitle className="text-xl mt-4">{meeting.title}</CardTitle>
                  <CardDescription>{meeting.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{meeting.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{meeting.frequency}</span>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2">Agenda includes:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {meeting.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-gray-400 mt-1">•</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button 
                      onClick={() => handleStartMeeting(meeting.id)}
                      disabled={meeting.comingSoon || !selectedTeamId || loadingTeams}
                      className="w-full"
                    >
                      {meeting.comingSoon ? 'Coming Soon' : 'Start Meeting'}
                      {!meeting.comingSoon && <ChevronRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!loadingTeams && teams.length === 0 && (
          <Card className="mt-6 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                No Team Selected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-orange-700">
                You need to be part of a team to start meetings. A default team will be created for your organization.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MeetingsPage;
