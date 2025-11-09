import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { organizationService } from '../services/organizationService';
import { getOrgTheme, saveOrgTheme } from '../utils/themeUtils';
import { useDepartment } from '../contexts/DepartmentContext';
import { useTerminology } from '../contexts/TerminologyContext';
import useMeeting from '../hooks/useMeeting';
import MeetingFormatSelector from '../components/meetings/MeetingFormatSelector';
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
import meetingSessionsService from '../services/meetingSessionsService';
import toast, { Toaster } from 'react-hot-toast';

const MeetingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { selectedDepartment } = useDepartment();
  const { labels } = useTerminology();
  const { joinMeeting, activeMeetings, isConnected, isEnabled } = useMeeting();
  
  // Debug socket connection status
  useEffect(() => {
    console.log('🔌 Meeting Socket Status:', {
      isEnabled,
      isConnected,
      activeMeetings,
      activeMeetingCount: Object.keys(activeMeetings || {}).length
    });
  }, [isEnabled, isConnected, activeMeetings]);
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
  const [showTeamSelectionDialog, setShowTeamSelectionDialog] = useState(false);
  const [pendingMeetingId, setPendingMeetingId] = useState(null);
  const [teamForMeeting, setTeamForMeeting] = useState(null);
  const [meetingPermissions, setMeetingPermissions] = useState({});
  const [showFormatSelector, setShowFormatSelector] = useState(false);
  const [pendingMeetingTeamId, setPendingMeetingTeamId] = useState(null);
  const [checkingPermissions, setCheckingPermissions] = useState(false);

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
      comingSoon: false
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
  
  // Debug: Monitor teamForMeeting state changes
  useEffect(() => {
    console.log('🔄 teamForMeeting state changed to:', teamForMeeting);
  }, [teamForMeeting]);

  // Check meeting permissions when selectedTeamId changes
  useEffect(() => {
    const checkMeetingPermissions = async () => {
      if (!selectedTeamId || !user?.organization_id) {
        return;
      }

      setCheckingPermissions(true);
      
      try {
        const orgId = user.organization_id || user.organizationId;
        const permissionResult = await meetingSessionsService.canStartMeetingForTeam(orgId, selectedTeamId);
        
        setMeetingPermissions(prev => ({
          ...prev,
          [selectedTeamId]: permissionResult.canStart
        }));
        
        console.log('Meeting start permission check:', {
          teamId: selectedTeamId,
          canStart: permissionResult.canStart
        });
        
      } catch (error) {
        console.error('Failed to check meeting permissions:', error);
        // Default to false if check fails
        setMeetingPermissions(prev => ({
          ...prev,
          [selectedTeamId]: false
        }));
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkMeetingPermissions();
  }, [selectedTeamId, user?.organization_id]);
  
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
      
      // First, check if user has teams from their auth data
      if (user?.teams && user.teams.length > 0) {
        let allTeams = [...user.teams];
        
        // If we have a selected department that's not in the teams list, add it
        if (selectedDepartment?.id && !allTeams.find(t => t.id === selectedDepartment.id)) {
          allTeams.push({
            id: selectedDepartment.id,
            name: selectedDepartment.name,
            is_leadership_team: false,
            is_department_team: true
          });
          console.log('🏢 Added department to teams list:', selectedDepartment);
        }
        
        setTeams(allTeams);
        
        // Try to select the appropriate team
        let teamToSelect = null;
        
        // If there's a selected department, prioritize that
        if (selectedDepartment?.id) {
          teamToSelect = user.teams.find(t => t.id === selectedDepartment.id);
          console.log('🏢 Selected department team:', teamToSelect);
        }
        
        // If no department team found but we have a selected department,
        // check if the department itself is a team (some orgs use departments as teams)
        if (!teamToSelect && selectedDepartment?.id) {
          // Try using the department ID directly as team ID
          teamToSelect = { id: selectedDepartment.id, name: selectedDepartment.name };
          console.log('🏢 Using department as team:', teamToSelect);
        }
        
        // Otherwise, look for the leadership team
        if (!teamToSelect) {
          teamToSelect = user.teams.find(t => t.is_leadership_team === true);
          console.log('👑 Using leadership team:', teamToSelect);
        }
        
        // Fall back to first team if no leadership team found
        if (!teamToSelect) {
          teamToSelect = user.teams[0];
          console.log('📋 Using first available team:', teamToSelect);
        }
        
        setSelectedTeamId(teamToSelect.id);
        setLoadingTeams(false);
        return;
      }
      
      // No teams available - user is not a member of any teams
      console.log('⚠️ User has no team memberships');
      setTeams([]);
      setSelectedTeamId(null);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      setTeams([]);
      setSelectedTeamId(null);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleStartMeeting = async (meetingId) => {
    try {
      console.log('🎯 handleStartMeeting called with:', { meetingId, selectedTeamId });
      
      // Check if permissions are still being verified
      if (checkingPermissions) {
        toast.info('Checking permissions...');
        return;
      }

      // PRE-FLIGHT PERMISSION CHECK - must be explicitly true
      const canStart = meetingPermissions[selectedTeamId];
      
      if (canStart !== true) {  // Changed from === false
        toast.error('You must be a member of this team to start meetings.');
        return;
      }
    
    // CRITICAL VALIDATION: Never allow meeting start without valid team ID
    if (!selectedTeamId || selectedTeamId === 'null' || selectedTeamId === 'undefined') {
      console.error('❌ BLOCKED: Invalid team ID detected:', selectedTeamId);
      alert('Please select a valid team before starting a meeting. This prevents meeting summaries from being sent to the wrong recipients.');
      return;
    }
    
    // Additional UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(selectedTeamId)) {
      console.error('❌ BLOCKED: Team ID is not a valid UUID:', selectedTeamId);
      alert('Invalid team ID format. Please select a valid team.');
      return;
    }
    
    // Check if user is on multiple teams
    if (teams && teams.length > 1) {
      console.log('🎭 Multiple teams detected, showing selection modal');
      console.log('📋 Available teams:', teams);
      console.log('📍 Currently selected team ID:', selectedTeamId);
      
      // Show team selection dialog for multi-team users
      setPendingMeetingId(meetingId);
      
      // Pre-select a team for the modal
      // Priority: 1) Currently selected team, 2) Leadership team, 3) First team
      let initialTeamSelection = selectedTeamId;
      
      // Validate the selected team ID is valid
      if (!initialTeamSelection || !teams.find(t => t.id === initialTeamSelection)) {
        // Try to find leadership team
        const leadershipTeam = teams.find(t => t.is_leadership_team);
        initialTeamSelection = leadershipTeam ? leadershipTeam.id : teams[0]?.id;
      }
      
      console.log('🎯 Initial team selection for modal:', initialTeamSelection);
      setTeamForMeeting(initialTeamSelection);
      // Small delay to ensure state is set before showing dialog
      setTimeout(() => {
        console.log('🎭 Opening team selection dialog');
        setShowTeamSelectionDialog(true);
      }, 50);
      return;
    }
    
      // If single team, proceed directly
      proceedWithMeeting(meetingId, selectedTeamId);
    } catch (error) {
      console.error('Error in handleStartMeeting:', error);
      toast.error('Failed to start meeting. Please try again.');
    }
  };

  const handleMeetingFormatSelect = (format) => {
    if (format === 'express') {
      // Navigate to Express meeting
      navigate(`/meetings/weekly-express/${pendingMeetingTeamId}`);
    } else {
      // Navigate to Standard meeting
      navigate(`/meetings/weekly-accountability/${pendingMeetingTeamId}`);
    }
    setPendingMeetingTeamId(null);
  };
  
  const proceedWithMeeting = (meetingId, teamId) => {
    console.log('🚀 proceedWithMeeting called with:', { meetingId, teamId });
    
    // Validate the teamId before proceeding
    if (!teamId || teamId === 'null' || teamId === 'undefined' || teamId === null) {
      console.error('❌ Invalid teamId in proceedWithMeeting:', teamId);
      console.error('📋 Available teams:', teams);
      console.error('🎯 Selected team was:', teamForMeeting);
      alert('No team selected. Please select a team before starting the meeting.');
      return;
    }
    
    // Extra validation to ensure teamId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamId)) {
      console.error('❌ Team ID is not a valid UUID:', teamId);
      alert('Invalid team ID format. Please select a valid team.');
      return;
    }
    
    // Use team ID as the meeting identifier (simpler - no codes needed!)
    const meetingRoom = `${teamId}-${meetingId}`;
    console.log('🏠 Meeting room code:', meetingRoom);
    
    // Join the meeting as leader
    if (joinMeeting && isEnabled) {
      console.log('📞 Calling joinMeeting function with teamId:', teamId);
      joinMeeting(meetingRoom, true);
    } else if (!isEnabled) {
      console.log('⚠️ Meeting features disabled - skipping socket connection');
    } else {
      console.error('❌ joinMeeting function not available');
    }
    
    // Navigate to the appropriate meeting page with a small delay to ensure state is ready
    setTimeout(() => {
      if (meetingId === 'weekly-accountability') {
        const targetPath = `/meetings/weekly-accountability/${teamId}`;
        console.log('🧭 Navigating to weekly meeting with path:', targetPath);
        console.log('🆔 Team ID being passed:', teamId);
        console.log('🔍 Team ID type:', typeof teamId);
        navigate(targetPath);
      } else if (meetingId === 'quarterly-planning') {
        const targetPath = `/meetings/quarterly-planning/${teamId}`;
        console.log('🧭 Navigating to quarterly meeting with path:', targetPath);
        console.log('🆔 Team ID being passed:', teamId);
        navigate(targetPath);
      } else if (meetingId === 'annual-planning') {
        const targetPath = `/meetings/annual-planning/${teamId}`;
        console.log('🧭 Navigating to annual meeting with path:', targetPath);
        console.log('🆔 Team ID being passed:', teamId);
        navigate(targetPath);
      }
    }, 100);
  };
  
  const handleConfirmTeamSelection = () => {
    console.log('🎯 Confirming team selection:', { 
      teamForMeeting, 
      selectedTeam: teams.find(t => t.id === teamForMeeting),
      pendingMeetingId,
      showDialog: showTeamSelectionDialog
    });
    
    // Extra validation to ensure we have a valid team
    if (!teamForMeeting) {
      console.error('❌ No team selected in modal');
      console.error('Current state:', { teamForMeeting, teams, pendingMeetingId });
      alert('Please select a team before continuing');
      return;
    }
    
    if (!pendingMeetingId) {
      console.error('❌ No pending meeting ID');
      alert('Meeting type not set. Please try again.');
      return;
    }
    
    // Validate teamForMeeting is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamForMeeting)) {
      console.error('❌ Invalid team ID format in modal:', teamForMeeting);
      alert('Invalid team selection. Please try again.');
      return;
    }
    
    // Store values before clearing state
    const meetingToStart = pendingMeetingId;
    const teamToUse = teamForMeeting;
    
    console.log('✅ Proceeding with:', { 
      meetingToStart, 
      teamToUse,
      teamToUseType: typeof teamToUse,
      teamToUseLength: teamToUse?.length 
    });
    
    // Close dialog first
    setShowTeamSelectionDialog(false);
    // Clear state after a small delay to avoid race conditions
    setTimeout(() => {
      setTeamForMeeting(null);
      setPendingMeetingId(null);
    }, 200);
    
    // Proceed with the stored values
    proceedWithMeeting(meetingToStart, teamToUse);
  };

  const handleJoinMeeting = (meetingType) => {
    // CRITICAL VALIDATION: Never allow meeting join without valid team ID
    if (!selectedTeamId || selectedTeamId === 'null' || selectedTeamId === 'undefined') {
      console.error('❌ BLOCKED: Invalid team ID detected:', selectedTeamId);
      alert('Please select a valid team before joining a meeting.');
      return;
    }
    
    // Additional UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(selectedTeamId)) {
      console.error('❌ BLOCKED: Team ID is not a valid UUID:', selectedTeamId);
      alert('Invalid team ID format. Please select a valid team.');
      return;
    }
    
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
    } else if (meetingType === 'annual-planning') {
      navigate(`/meetings/annual-planning/${selectedTeamId}`);
    }
    
    setShowJoinDialog(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative">
      <Toaster position="top-right" />
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
              </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {meetings.map((meeting) => {
            const Icon = meeting.icon;
            // Use organizationId-teamId-meetingId format to match actual meeting codes
            const meetingCode = `${user?.organizationId || user?.organization_id}-${selectedTeamId}-${meeting.id}`;
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
                        <span className="absolute -top-2 -right-2 flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50 animation-delay-500"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 shadow-lg"></span>
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
                      onClick={() => {
                        if (meeting.id === 'weekly-accountability') {
                          // If meeting is active, join it directly without format selection
                          if (isActive) {
                            // Join the active meeting - use saved format or default to standard
                            const savedFormat = localStorage.getItem(`meetingFormat_${selectedTeamId}`);
                            if (savedFormat === 'express') {
                              navigate(`/meetings/weekly-express/${selectedTeamId}`);
                            } else {
                              navigate(`/meetings/weekly-accountability/${selectedTeamId}`);
                            }
                          } else {
                            // Starting a new meeting - check if user has a saved preference
                            const savedFormat = localStorage.getItem(`meetingFormat_${selectedTeamId}`);
                            
                            if (savedFormat === 'express') {
                              // Go directly to Express
                              navigate(`/meetings/weekly-express/${selectedTeamId}`);
                            } else if (savedFormat === 'standard') {
                              // Go directly to Standard
                              handleStartMeeting(meeting.id);
                            } else {
                              // Show format selector
                              setPendingMeetingTeamId(selectedTeamId);
                              setShowFormatSelector(true);
                            }
                          }
                        } else {
                          // For all other meeting types, use normal handler
                          handleStartMeeting(meeting.id);
                        }
                      }}
                      disabled={
                        meeting.comingSoon || 
                        !selectedTeamId || 
                        loadingTeams ||
                        checkingPermissions || 
                        meetingPermissions[selectedTeamId] !== true
                      }
                      className={`w-full text-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] ${
                        meeting.comingSoon ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed' : 
                        (isActive ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 animate-pulse ring-2 ring-green-400 ring-offset-2' : '')
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
                      {checkingPermissions ? 'Checking...' : 
                       meeting.comingSoon ? 'Coming Soon' : 
                       (isActive ? 'Join Meeting in Progress' : 'Start Meeting')}
                      {!meeting.comingSoon && <ChevronRight className="ml-2 h-4 w-4" />}
                    </Button>
                    
                    {/* Add helpful message below button if no permission */}
                    {(meetingPermissions[selectedTeamId] === false || 
                      (meetingPermissions[selectedTeamId] === undefined && !checkingPermissions)) && (
                      <p className="text-xs text-red-600 mt-2 text-center">
                        Team membership required
                      </p>
                    )}
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
              {teams.length > 1 
                ? 'Select which team and meeting type you want to join.'
                : 'Select which meeting type you want to join.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Team Selection (only if multiple teams) */}
            {teams.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Select Team</label>
                <div className="space-y-2">
                  {teams.map(team => (
                    <div
                      key={team.id}
                      className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                        selectedTeamId === team.id 
                          ? 'border-blue-500 bg-blue-50/80' 
                          : 'border-gray-200 bg-white/60 hover:border-blue-300 hover:bg-blue-50/40'
                      }`}
                      onClick={() => setSelectedTeamId(team.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            selectedTeamId === team.id ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <Users className={`h-4 w-4 ${
                              selectedTeamId === team.id ? 'text-blue-600' : 'text-gray-600'
                            }`} />
                          </div>
                          <div>
                            <h4 className="font-medium">{team.name}</h4>
                            {team.is_leadership_team && (
                              <p className="text-xs text-gray-500">Leadership Team</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="join-team-selection"
                            checked={selectedTeamId === team.id}
                            onChange={() => setSelectedTeamId(team.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Meeting Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Select Meeting Type</label>
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
      
      {/* Team Selection Dialog for Multi-Team Users */}
      <Dialog open={showTeamSelectionDialog} onOpenChange={setShowTeamSelectionDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Which team meeting?</DialogTitle>
            <DialogDescription>
              You're a member of multiple teams. Please confirm which team's meeting you want to start.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-3">
              {teams.map((team) => (
                <div 
                  key={team.id}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 backdrop-blur-sm ${
                    teamForMeeting === team.id 
                      ? 'shadow-sm' 
                      : 'border-white/50 bg-white/60 hover:border-blue-300 hover:bg-blue-50/40'
                  }`}
                  style={{
                    borderColor: teamForMeeting === team.id ? themeColors.primary : undefined,
                    backgroundColor: teamForMeeting === team.id 
                      ? `${themeColors.primary}15` 
                      : undefined
                  }}
                  onClick={() => {
                    console.log('🖱️ Team clicked:', team.name, team.id);
                    console.log('📍 Previous teamForMeeting:', teamForMeeting);
                    setTeamForMeeting(team.id);
                    console.log('📍 Setting teamForMeeting to:', team.id);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ 
                        backgroundColor: teamForMeeting === team.id 
                          ? `${themeColors.primary}20` 
                          : 'rgb(243 244 246)'
                      }}>
                        <Users className="h-4 w-4" style={{ 
                          color: teamForMeeting === team.id 
                            ? themeColors.primary 
                            : 'rgb(107 114 128)'
                        }} />
                      </div>
                      <div>
                        <h4 className="font-medium">{team.name}</h4>
                        {team.is_leadership_team && (
                          <p className="text-xs text-gray-500">Leadership Team</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="team-selection"
                        checked={teamForMeeting === team.id}
                        onChange={() => setTeamForMeeting(team.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-2">
              <p className="text-sm text-gray-500">
                {pendingMeetingId === 'weekly-accountability' 
                  ? `Starting ${labels.weekly_meeting_label || 'Weekly Accountability Meeting'}`
                  : `Starting ${labels.quarterly_meeting_label || 'Quarterly Planning Meeting'}`
                }
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  console.log('❌ Team selection cancelled');
                  setShowTeamSelectionDialog(false);
                  setPendingMeetingId(null);
                  setTeamForMeeting(null);
                }}
                className="flex-1 bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmTeamSelection}
                disabled={!teamForMeeting}
                className="flex-1 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                style={{
                  background: teamForMeeting 
                    ? `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                    : 'rgb(229 231 235)'
                }}
                onMouseEnter={(e) => {
                  if (teamForMeeting) {
                    e.currentTarget.style.filter = 'brightness(1.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (teamForMeeting) {
                    e.currentTarget.style.filter = 'brightness(1)';
                  }
                }}
              >
                Start {teams.find(t => t.id === teamForMeeting)?.name} Meeting
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meeting Format Selector Modal */}
      <MeetingFormatSelector
        open={showFormatSelector}
        onClose={() => {
          setShowFormatSelector(false);
          setPendingMeetingTeamId(null);
        }}
        onSelect={handleMeetingFormatSelect}
        teamId={pendingMeetingTeamId}
      />
    </div>
  );
};

export default MeetingsPage;
