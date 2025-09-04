import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { organizationService } from '../services/organizationService';
import { getOrgTheme, saveOrgTheme } from '../utils/themeUtils';
import { useDepartment } from '../contexts/DepartmentContext';
import { useTerminology } from '../contexts/TerminologyContext';
import useMeeting from '../hooks/useMeeting';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Calendar,
  Clock,
  ChevronRight,
  Target,
  BarChart,
  AlertTriangle,
  Activity,
  Sparkles
} from 'lucide-react';
import { teamsService } from '../services/teamsService';

const MeetingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { selectedDepartment } = useDepartment();
  const { labels } = useTerminology();
  const { joinMeeting, activeMeetings, isConnected, isEnabled } = useMeeting();
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [selectedMeetingType, setSelectedMeetingType] = useState('weekly-accountability');
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });

  const meetings = [
    {
      id: 'weekly-accountability',
      title: labels.weekly_meeting_label || 'Weekly Accountability Meeting',
      description: `Review ${labels.scorecard_label?.toLowerCase() || 'scorecard'}, ${labels.priorities_label?.toLowerCase() || 'priorities'}, and solve ${labels.issues_label?.toLowerCase() || 'issues'} as a team`,
      duration: '90 minutes',
      frequency: 'Weekly',
      icon: Users,
      getColor: () => themeColors.primary,
      getBgClass: () => 'bg-opacity-10',
      features: [
        'Good News & Headlines',
        'Scorecard Review',
        'Quarterly Priorities Check',
        'Issues Discussion'
      ]
    },
    {
      id: 'quarterly-planning',
      title: labels.quarterly_meeting_label || 'Quarterly Planning Meeting',
      description: `Review past performance and set ${labels.priorities_label?.toLowerCase() || 'priorities'} for the upcoming quarter`,
      duration: '2.5 hours',
      frequency: 'Quarterly',
      icon: Target,
      getColor: () => themeColors.secondary, // Use secondary color for quarterly
      getBgClass: () => 'bg-opacity-10',
      features: [
        'Review prior quarter performance',
        'Set quarterly priorities',
        'Address strategic issues',
        'Align on next steps'
      ]
    },
    {
      id: 'annual-planning',
      title: 'Annual Planning',
      description: 'Define vision, set annual goals, and plan the year ahead',
      duration: '2 days',
      frequency: 'Annually',
      icon: Calendar,
      getColor: () => themeColors.accent, // Use accent color for annual
      getBgClass: () => 'bg-opacity-10',
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
    // Always fetch teams, even without a selected department
    fetchUserTeams();
    fetchOrganizationTheme();
    
    // Listen for theme changes
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, [selectedDepartment]);
  
  const fetchOrganizationTheme = async () => {
    try {
      // First check localStorage
      const orgId = user?.organizationId || user?.organization_id;
      const savedTheme = getOrgTheme(orgId);
      if (savedTheme) {
        setThemeColors(savedTheme);
        return;
      }
      
      // Fetch from API
      const orgData = await organizationService.getOrganization();
      
      if (orgData) {
        const theme = {
          primary: orgData.theme_primary_color || '#3B82F6',
          secondary: orgData.theme_secondary_color || '#1E40AF',
          accent: orgData.theme_accent_color || '#60A5FA'
        };
        setThemeColors(theme);
        saveOrgTheme(orgId, theme);
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
    }
  };

  const fetchUserTeams = async () => {
    try {
      setLoadingTeams(true);
      
      // Use the selected department, or default to Leadership Team
      const teamId = selectedDepartment?.id || user?.teamId || user?.team_id;
      const teamName = selectedDepartment?.name || 'Leadership Team';
      
      if (!teamId) {
        // If still no team ID, use a placeholder for Leadership Team
        const defaultTeam = {
          id: '00000000-0000-0000-0000-000000000000',
          name: 'Leadership Team'
        };
        setTeams([defaultTeam]);
        setSelectedTeamId(defaultTeam.id);
        setLoadingTeams(false);
        return;
      }
      
      const defaultTeam = {
        id: teamId,
        name: teamName
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
    console.log('🎯 handleStartMeeting called with:', { meetingId, selectedTeamId });
    
    if (!selectedTeamId) {
      console.error('❌ No team selected');
      return;
    }
    
    // Use team ID as the meeting identifier (simpler - no codes needed!)
    const meetingRoom = `${selectedTeamId}-${meetingId}`;
    console.log('🏠 Meeting room code:', meetingRoom);
    
    // Join the meeting as leader
    if (joinMeeting) {
      console.log('📞 Calling joinMeeting function');
      joinMeeting(meetingRoom, true);
    } else {
      console.error('❌ joinMeeting function not available');
    }
    
    // Navigate to the appropriate meeting page
    if (meetingId === 'weekly-accountability') {
      console.log('🧭 Navigating to weekly meeting');
      navigate(`/meetings/weekly-accountability/${selectedTeamId}`);
    } else if (meetingId === 'quarterly-planning') {
      console.log('🧭 Navigating to quarterly meeting');
      navigate(`/meetings/quarterly-planning/${selectedTeamId}`);
    }
  };

  const handleJoinMeeting = (meetingType) => {
    if (!selectedTeamId) return;
    
    // Use team ID + meeting type as the meeting identifier
    const meetingRoom = `${selectedTeamId}-${meetingType}`;
    
    // Join the meeting as participant
    if (joinMeeting) {
      joinMeeting(meetingRoom, false);
    }
    
    // Navigate to the appropriate meeting page
    if (meetingType === 'weekly-accountability') {
      navigate(`/meetings/weekly-accountability/${selectedTeamId}`);
    } else if (meetingType === 'quarterly-planning') {
      navigate(`/meetings/quarterly-planning/${selectedTeamId}`);
    }
    
    setShowJoinDialog(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
                   style={{
                     background: `linear-gradient(135deg, ${themeColors.primary}15 0%, ${themeColors.secondary}15 100%)`,
                     color: themeColors.primary
                   }}>
                <Activity className="h-4 w-4" />
                TEAM MEETINGS
              </div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                {selectedDepartment?.name || ''} Meetings
              </h1>
              <p className="text-lg text-slate-600">Run effective meetings with structured agendas</p>
            </div>
            <div className="flex items-start gap-4">
              {(() => {
                // Check if any meetings are in progress for this team
                console.log('Socket connection status:', { isEnabled, isConnected });
                if (!isEnabled) console.warn('⚠️ Meetings are disabled! Set VITE_ENABLE_MEETINGS=true');
                if (!isConnected) console.warn('⚠️ Socket not connected!');
                console.log('Active meetings:', activeMeetings);
                console.log('Active meetings entries:', Object.entries(activeMeetings || {}));
                console.log('Selected team ID:', selectedTeamId);
                
                // Log each meeting's teamId for debugging
                Object.values(activeMeetings || {}).forEach(meeting => {
                  console.log(`Meeting ${meeting.code}: teamId=${meeting.teamId}, type=${meeting.type}`);
                });
                
                const teamMeetings = Object.values(activeMeetings || {}).filter(
                  m => m.teamId === selectedTeamId
                );
                console.log('Team meetings found:', teamMeetings);
                const hasActiveMeeting = teamMeetings.length > 0;
                
                return (
                  <Button
                    onClick={() => setShowJoinDialog(true)}
                    className={`flex items-center gap-2 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] ${
                      hasActiveMeeting ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 animate-pulse' : ''
                    }`}
                    style={{
                      ...(!hasActiveMeeting ? {
                        background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                      } : {})
                    }}
                    onMouseEnter={(e) => {
                      if (!hasActiveMeeting) {
                        e.currentTarget.style.filter = 'brightness(1.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!hasActiveMeeting) {
                        e.currentTarget.style.filter = 'brightness(1)';
                      }
                    }}
                    disabled={!selectedTeamId}
                  >
                    {hasActiveMeeting && (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                      </span>
                    )}
                    <Users className="h-4 w-4" />
                    {hasActiveMeeting ? 'Join Meeting in Progress' : 'Join Team Meeting'}
                  </Button>
                );
              })()}
              {teams.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Team</label>
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger className="w-[250px] bg-white/80 backdrop-blur-sm border-white/20 shadow-sm">
                      <SelectValue placeholder="Choose a team" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {meetings.map((meeting) => {
            const Icon = meeting.icon;
            const meetingCode = `${selectedTeamId}-${meeting.id}`;
            const activeMeeting = activeMeetings?.[meetingCode];
            const isActive = !!activeMeeting;
            
            return (
              <Card key={meeting.id} className={`relative overflow-hidden bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl transition-all duration-200 hover:shadow-xl hover:scale-[1.02] ${
                meeting.comingSoon ? 'opacity-75' : ''
              } ${
                isActive ? 'meeting-active ring-2 ring-green-500 ring-opacity-50 shadow-lg' : ''
              }`}>
                <div className="h-1.5 bg-gradient-to-r" style={{ background: `linear-gradient(90deg, ${meeting.getColor()} 0%, ${meeting.getColor()}AA 100%)` }} />
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="relative">
                      <div className="p-3 rounded-xl shadow-sm" style={{ background: `linear-gradient(135deg, ${meeting.getColor()}20 0%, ${meeting.getColor()}10 100%)` }}>
                        <Icon className="h-6 w-6" style={{ color: meeting.getColor() }} />
                      </div>
                      {isActive && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <div className="flex items-center gap-1 bg-green-100/80 backdrop-blur-sm text-green-700 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                          <Users className="h-3 w-3" />
                          <span>{activeMeeting.participantCount} in meeting</span>
                        </div>
                      )}
                      {meeting.comingSoon && (
                        <span className="text-xs bg-gray-200/80 backdrop-blur-sm text-gray-600 px-3 py-1.5 rounded-full font-medium">Coming Soon</span>
                      )}
                    </div>
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
                      className={`w-full text-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] ${
                        meeting.comingSoon ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed' : 
                        (isActive ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' : '')
                      }`}
                      style={{
                        ...((!meeting.comingSoon && !isActive) ? {
                          background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                        } : {})
                      }}
                      onMouseEnter={(e) => {
                        if (!meeting.comingSoon && !isActive) {
                          e.currentTarget.style.filter = 'brightness(1.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!meeting.comingSoon && !isActive) {
                          e.currentTarget.style.filter = 'brightness(1)';
                        }
                      }}
                    >
                      {meeting.comingSoon ? 'Coming Soon' : (isActive ? 'Join Meeting' : 'Start Meeting')}
                      {!meeting.comingSoon && <ChevronRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!loadingTeams && teams.length === 0 && (
          <Card className="mt-6 border-orange-200/50 bg-orange-50/80 backdrop-blur-sm rounded-2xl shadow-sm">
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
      
      {/* Join Meeting Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Join Team Meeting</DialogTitle>
            <DialogDescription>
              Select which meeting you want to join for the {teams.find(t => t.id === selectedTeamId)?.name || 'selected'} team.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-3">
              <div 
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 backdrop-blur-sm ${
                  selectedMeetingType === 'weekly-accountability' 
                    ? 'border-blue-500 bg-blue-50/80 shadow-sm' 
                    : 'border-white/50 bg-white/60 hover:border-blue-300 hover:bg-blue-50/40'
                }`}
                onClick={() => setSelectedMeetingType('weekly-accountability')}
              >
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium">{labels.weekly_meeting_label || 'Weekly Accountability Meeting'}</h4>
                    <p className="text-sm text-gray-600">90 minute team sync</p>
                  </div>
                </div>
              </div>
              
              <div 
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 backdrop-blur-sm ${
                  selectedMeetingType === 'quarterly-planning' 
                    ? 'shadow-sm' 
                    : 'border-white/50 bg-white/60'
                }`}
                style={{
                  borderColor: selectedMeetingType === 'quarterly-planning' ? themeColors.primary : undefined,
                  backgroundColor: selectedMeetingType === 'quarterly-planning' 
                    ? `${themeColors.primary}15` 
                    : undefined
                }}
                onClick={() => setSelectedMeetingType('quarterly-planning')}
                onMouseEnter={(e) => {
                  if (selectedMeetingType !== 'quarterly-planning') {
                    e.currentTarget.style.borderColor = `${themeColors.primary}80`;
                    e.currentTarget.style.backgroundColor = `${themeColors.primary}08`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedMeetingType !== 'quarterly-planning') {
                    e.currentTarget.style.borderColor = '';
                    e.currentTarget.style.backgroundColor = '';
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5" style={{ color: themeColors.primary }} />
                  <div>
                    <h4 className="font-medium">{labels.quarterly_meeting_label || 'Quarterly Planning Meeting'}</h4>
                    <p className="text-sm text-gray-600">Plan the upcoming quarter</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowJoinDialog(false);
                  setSelectedMeetingType('weekly-accountability');
                }}
                className="flex-1 bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleJoinMeeting(selectedMeetingType)}
                className="flex-1 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
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
                Join Meeting
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeetingsPage;
