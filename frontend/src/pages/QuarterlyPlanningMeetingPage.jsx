import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Target,
  CheckSquare,
  Calendar,
  ClipboardList,
  ListChecks,
  AlertTriangle,
  Building2,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PriorityCard from '../components/priorities/PriorityCardClean';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { meetingsService } from '../services/meetingsService';
import { FileText, GitBranch, Smile, BarChart, Newspaper, ListTodo, ArrowLeftRight, Archive, Plus, MessageSquare, Send, Star } from 'lucide-react';
import { quarterlyPrioritiesService } from '../services/quarterlyPrioritiesService';
import { issuesService } from '../services/issuesService';
import { organizationService } from '../services/organizationService';
import IssuesList from '../components/issues/IssuesListClean';
import IssueDialog from '../components/issues/IssueDialog';
import TwoPagePlanView from '../components/vto/TwoPagePlanView';

const QuarterlyPlanningMeetingPage = () => {
  const { user } = useAuthStore();
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('objectives');
  const [success, setSuccess] = useState(null);
  
  // Meeting data
  const [priorities, setPriorities] = useState([]);
  const [issues, setIssues] = useState([]);
  const [vtoData, setVtoData] = useState(null);
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [meetingStartTime, setMeetingStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [meetingRating, setMeetingRating] = useState(null);
  const [cascadingMessage, setCascadingMessage] = useState('');
  
  // Dialog states for issues
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    companyPriorities: false,
    individualPriorities: {}
  });

  const agendaItems = [
    { id: 'objectives', label: 'Objectives', duration: 5, icon: Target, description: 'Review meeting goals' },
    { id: 'check-in', label: 'Check In', duration: 10, icon: CheckSquare, description: 'Team connection' },
    { id: 'review-prior', label: 'Review Prior Quarter', duration: 30, icon: Calendar, description: 'Check progress' },
    { id: '2-page-plan', label: '2-Page Plan', duration: 30, icon: ClipboardList, description: 'Review strategic plan' },
    { id: 'quarterly-priorities', label: 'Quarterly Priorities', duration: 60, icon: ListChecks, description: 'Set new priorities' },
    { id: 'issues', label: 'Issues', duration: 30, icon: AlertTriangle, description: 'Address challenges' },
    { id: 'next-steps', label: 'Next Steps', duration: 15, icon: ClipboardList, description: 'Action items' },
    { id: 'conclude', label: 'Conclude', duration: 10, icon: CheckSquare, description: 'Wrap up & rate' }
  ];

  // Timer effect
  useEffect(() => {
    let interval;
    if (meetingStarted && meetingStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - meetingStartTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [meetingStarted, meetingStartTime]);

  // Auto-start meeting on component mount
  useEffect(() => {
    setMeetingStarted(true);
    setMeetingStartTime(Date.now());
  }, []);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const concludeMeeting = async () => {
    if (!meetingRating) {
      setError('Please rate the meeting before concluding');
      return;
    }
    
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      const duration = Math.floor((Date.now() - meetingStartTime) / 60000); // in minutes
      
      await meetingsService.concludeMeeting(orgId, effectiveTeamId, {
        meetingType: 'quarterly_planning',
        duration,
        rating: meetingRating,
        cascadingMessage,
        summary: {
          priorities: priorities.length,
          completed: priorities.filter(p => p.status === 'complete').length
        }
      });
      
      setSuccess('Meeting concluded and summary sent to team!');
      setTimeout(() => {
        navigate('/quarterly-priorities');
      }, 2000);
    } catch (error) {
      console.error('Failed to conclude meeting:', error);
      setError('Failed to conclude meeting');
    }
  };

  useEffect(() => {
    if (activeSection === 'review-prior' || activeSection === 'quarterly-priorities') {
      fetchPrioritiesData();
    } else if (activeSection === 'issues') {
      fetchIssuesData();
    } else if (activeSection === '2-page-plan') {
      fetchVtoData();
    } else {
      // For non-data sections, ensure loading is false
      setLoading(false);
    }
  }, [activeSection, teamId]);

  // Auto-clear success messages after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchPrioritiesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      // Use the simplified current priorities endpoint
      const response = await quarterlyPrioritiesService.getCurrentPriorities(orgId, effectiveTeamId);
      
      // Extract data in the same format as the original page
      const companyPriorities = response.companyPriorities || [];
      const teamMemberPriorities = response.teamMemberPriorities || {};
      
      // Flatten the data structure to a simple array for easier handling
      const allPriorities = [
        ...(companyPriorities || []).map(p => ({ ...p, priority_type: 'company' })),
        ...Object.values(teamMemberPriorities || {}).flatMap(memberData => 
          (memberData.priorities || []).map(p => ({ ...p, priority_type: 'individual' }))
        )
      ];
      
      setPriorities(allPriorities);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch priorities:', error);
      setError('Failed to load priorities');
      setLoading(false);
    }
  };

  const fetchIssuesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      const response = await issuesService.getIssues(null, false, effectiveTeamId);
      setIssues(response.data.issues || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
      setError('Failed to load issues');
      setLoading(false);
    }
  };

  const fetchVtoData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await organizationService.getOrganization();
      setVtoData(response.data || response);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch VTO data:', error);
      setError('Failed to load 2-Page Plan');
      setLoading(false);
    }
  };

  // Toggle functions for collapsible sections
  const toggleCompanyPriorities = () => {
    setExpandedSections(prev => ({
      ...prev,
      companyPriorities: !prev.companyPriorities
    }));
  };

  const toggleIndividualPriorities = (memberId) => {
    setExpandedSections(prev => ({
      ...prev,
      individualPriorities: {
        ...prev.individualPriorities,
        [memberId]: !prev.individualPriorities[memberId]
      }
    }));
  };

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    setError(null);
  };

  const getNextSection = () => {
    const currentIndex = agendaItems.findIndex(item => item.id === activeSection);
    if (currentIndex < agendaItems.length - 1) {
      return agendaItems[currentIndex + 1].id;
    }
    return null;
  };

  const getPreviousSection = () => {
    const currentIndex = agendaItems.findIndex(item => item.id === activeSection);
    if (currentIndex > 0) {
      return agendaItems[currentIndex - 1].id;
    }
    return null;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    switch (activeSection) {
      case 'objectives':
        return (
          <Card className="border-0 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Target className="h-5 w-5 text-blue-600" />
                    Meeting Objectives
                  </CardTitle>
                  <CardDescription className="mt-1">Review meeting goals and expected outcomes</CardDescription>
                </div>
                <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                  5 minutes
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <p className="text-gray-700 leading-relaxed">
                  This quarterly planning meeting is designed to help your team transition effectively 
                  from one quarter to the next.
                </p>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                  <h4 className="font-semibold text-lg mb-4 text-gray-900">Meeting Goals:</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span className="text-gray-700">Clear Vision, All on Same Page</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span className="text-gray-700">Clear Plan for Next Quarter</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span className="text-gray-700">Resolve All Key Issues</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'check-in':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Team Check-In
              </CardTitle>
              <CardDescription>Connect as a team before diving into business (10 minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Go around the room and have each team member share:
                </p>
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium">1. Bests</h4>
                    <p className="text-sm text-gray-600">Personal and professional Best from the last 90 days</p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium">2. Update</h4>
                    <p className="text-sm text-gray-600">What's working/not working?</p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium">3. Expectations for this session</h4>
                    <p className="text-sm text-gray-600">What do you hope to accomplish in this meeting?</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'review-prior':
        if (loading) {
          return (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Review Prior Quarter
                </CardTitle>
                <CardDescription>Check progress on last quarter's priorities (30 minutes)</CardDescription>
              </CardHeader>
            </Card>
            {priorities.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No priorities found for this quarter.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate('/quarterly-priorities')}
                  >
                    Go to Quarterly Priorities
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-center">
                    <span className="font-semibold">Status Check:</span> Review what was accomplished, what wasn't, and why. Be honest about successes and failures.
                  </p>
                </div>
                {/* Company Priorities Section */}
                {(() => {
                  const companyPriorities = priorities.filter(p => p.priority_type === 'company');
                  return companyPriorities.length > 0 && (
                    <div>
                      <div 
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={toggleCompanyPriorities}
                      >
                        <div className="flex items-center gap-3">
                          {expandedSections.companyPriorities ? (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-600" />
                          )}
                          <Building2 className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold">
                            Company Priorities ({companyPriorities.length})
                          </h3>
                        </div>
                      </div>
                      {expandedSections.companyPriorities && (
                        <div className="space-y-4 ml-7 mt-4">
                          {(companyPriorities || []).map(priority => (
                          <PriorityCard 
                            key={priority.id} 
                            priority={priority} 
                            readOnly={false}
                            onIssueCreated={(message) => {
                              setSuccess(message);
                              setTimeout(() => setSuccess(null), 3000);
                            }}
                            onStatusChange={(priorityId, newStatus) => {
                              setPriorities(prev => 
                                prev.map(p => 
                                  p.id === priorityId ? { ...p, status: newStatus } : p
                                )
                              );
                              setSuccess(`Priority status updated to ${newStatus}`);
                              setTimeout(() => setSuccess(null), 3000);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  );
                })()}
                
                {/* Individual Priorities Section */}
                {(() => {
                  const individualPriorities = priorities.filter(p => p.priority_type !== 'company');
                  const groupedByOwner = individualPriorities.reduce((acc, priority) => {
                    const ownerId = priority.owner?.id || 'unassigned';
                    if (!acc[ownerId]) {
                      acc[ownerId] = [];
                    }
                    acc[ownerId].push(priority);
                    return acc;
                  }, {});
                  
                  return Object.keys(groupedByOwner).length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg">
                        <Users className="h-5 w-5 text-purple-600" />
                        <h3 className="text-lg font-semibold">
                          Individual Priorities ({individualPriorities.length})
                        </h3>
                      </div>
                      {Object.entries(groupedByOwner).map(([ownerId, ownerPriorities]) => {
                        const owner = ownerPriorities[0]?.owner;
                        const isExpanded = expandedSections.individualPriorities[ownerId];
                        return (
                          <div key={ownerId} className="ml-7">
                            <div 
                              className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => toggleIndividualPriorities(ownerId)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-600" />
                              )}
                              <h4 className="text-md font-medium">
                                {owner?.name || 'Unassigned'} ({ownerPriorities.length})
                              </h4>
                            </div>
                            {isExpanded && (
                              <div className="space-y-4 ml-7 mt-4">
                                {ownerPriorities.map(priority => (
                                  <PriorityCard 
                                    key={priority.id} 
                                    priority={priority} 
                                    readOnly={false}
                                    onIssueCreated={(message) => {
                                      setSuccess(message);
                                      setTimeout(() => setSuccess(null), 3000);
                                    }}
                                    onStatusChange={(priorityId, newStatus) => {
                                      setPriorities(prev => 
                                        prev.map(p => 
                                          p.id === priorityId ? { ...p, status: newStatus } : p
                                        )
                                      );
                                      setSuccess(`Priority status updated to ${newStatus}`);
                                      setTimeout(() => setSuccess(null), 3000);
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );

      case '2-page-plan':
        if (loading) {
          return (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <ClipboardList className="h-5 w-5 text-indigo-600" />
                      2-Page Plan (V/TO)
                    </CardTitle>
                    <CardDescription className="mt-1">Review and align your strategic vision</CardDescription>
                  </div>
                  <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                    30 minutes
                  </div>
                </div>
              </CardHeader>
            </Card>
            
            {/* Embedded VTO */}
            <div className="bg-white rounded-lg shadow-sm">
              {vtoData ? (
                <TwoPagePlanView 
                  organization={vtoData}
                  isEmbedded={true}
                />
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">No 2-Page Plan data available.</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate('/business-blueprint')}
                    >
                      Create Business Blueprint
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );

      case 'quarterly-priorities':
        if (loading) {
          return (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Set Quarterly Priorities
                </CardTitle>
                <CardDescription>Define 3-7 priorities for the upcoming quarter (60 minutes)</CardDescription>
              </CardHeader>
            </Card>
            {priorities.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No priorities found for this quarter.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate('/quarterly-priorities')}
                  >
                    Go to Quarterly Priorities
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-center">
                    <span className="font-semibold">Priority Setting:</span> Each priority should be SMART (Specific, Measurable, Achievable, Relevant, Time-bound). Limit to 3-7 priorities total.
                  </p>
                </div>
                {/* Company Priorities Section */}
                {(() => {
                  const companyPriorities = priorities.filter(p => p.priority_type === 'company');
                  return companyPriorities.length > 0 && (
                    <div>
                      <div 
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={toggleCompanyPriorities}
                      >
                        <div className="flex items-center gap-3">
                          {expandedSections.companyPriorities ? (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-600" />
                          )}
                          <Building2 className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold">
                            Company Priorities ({companyPriorities.length})
                          </h3>
                        </div>
                      </div>
                      {expandedSections.companyPriorities && (
                        <div className="space-y-4 ml-7 mt-4">
                          {(companyPriorities || []).map(priority => (
                            <PriorityCard 
                              key={priority.id} 
                              priority={priority} 
                              readOnly={false}
                              onIssueCreated={(message) => {
                                setSuccess(message);
                                setTimeout(() => setSuccess(null), 3000);
                              }}
                              onStatusChange={(priorityId, newStatus) => {
                                setPriorities(prev => 
                                  prev.map(p => 
                                    p.id === priorityId ? { ...p, status: newStatus } : p
                                  )
                                );
                                setSuccess(`Priority status updated to ${newStatus}`);
                                setTimeout(() => setSuccess(null), 3000);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                {/* Individual Priorities Section */}
                {(() => {
                  const individualPriorities = priorities.filter(p => p.priority_type !== 'company');
                  const groupedByOwner = individualPriorities.reduce((acc, priority) => {
                    const ownerId = priority.owner?.id || 'unassigned';
                    if (!acc[ownerId]) {
                      acc[ownerId] = [];
                    }
                    acc[ownerId].push(priority);
                    return acc;
                  }, {});
                  
                  return Object.keys(groupedByOwner).length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg">
                        <Users className="h-5 w-5 text-purple-600" />
                        <h3 className="text-lg font-semibold">
                          Individual Priorities ({individualPriorities.length})
                        </h3>
                      </div>
                      {Object.entries(groupedByOwner).map(([ownerId, ownerPriorities]) => {
                        const owner = ownerPriorities[0]?.owner;
                        const isExpanded = expandedSections.individualPriorities[ownerId];
                        return (
                          <div key={ownerId} className="ml-7">
                            <div 
                              className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => toggleIndividualPriorities(ownerId)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-600" />
                              )}
                              <h4 className="text-md font-medium">
                                {owner?.name || 'Unassigned'} ({ownerPriorities.length})
                              </h4>
                            </div>
                            {isExpanded && (
                              <div className="space-y-4 ml-7 mt-4">
                                {ownerPriorities.map(priority => (
                                  <PriorityCard 
                                    key={priority.id} 
                                    priority={priority} 
                                    readOnly={false}
                                    onIssueCreated={(message) => {
                                      setSuccess(message);
                                      setTimeout(() => setSuccess(null), 3000);
                                    }}
                                    onStatusChange={(priorityId, newStatus) => {
                                      setPriorities(prev => 
                                        prev.map(p => 
                                          p.id === priorityId ? { ...p, status: newStatus } : p
                                        )
                                      );
                                      setSuccess(`Priority status updated to ${newStatus}`);
                                      setTimeout(() => setSuccess(null), 3000);
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );

      case 'issues':
        if (loading) {
          return (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      Strategic Issues
                    </CardTitle>
                    <CardDescription className="mt-1">Identify and discuss strategic issues for the quarter</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => setShowIssueDialog(true)}
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Issue
                    </Button>
                    <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                      30 minutes
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <h4 className="font-semibold text-gray-900 mb-2">Focus on Strategic Issues</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Discuss issues that could impact the quarter ahead. Tactical issues should be handled in weekly meetings.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Market changes or competitive threats</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Resource constraints or capacity</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Major process improvements</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Team structure or role changes</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Embedded Issues List */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <IssuesList 
                issues={issues || []}
                onEdit={(issue) => {
                  setEditingIssue(issue);
                  setShowIssueDialog(true);
                }}
                onStatusChange={async (issueId, newStatus) => {
                  try {
                    await issuesService.updateIssue(issueId, { status: newStatus });
                    await fetchIssuesData();
                  } catch (error) {
                    console.error('Failed to update status:', error);
                  }
                }}
                onTimelineChange={async (issueId, newTimeline) => {
                  try {
                    await issuesService.updateIssue(issueId, { timeline: newTimeline });
                    await fetchIssuesData();
                  } catch (error) {
                    console.error('Failed to update timeline:', error);
                  }
                }}
                onArchive={async (issueId) => {
                  try {
                    await issuesService.archiveIssue(issueId);
                    await fetchIssuesData();
                  } catch (error) {
                    console.error('Failed to archive:', error);
                  }
                }}
                onVote={async () => {}}
                getStatusColor={(status) => {
                  switch (status) {
                    case 'open':
                      return 'bg-yellow-100 text-yellow-800';
                    case 'closed':
                      return 'bg-gray-100 text-gray-800';
                    default:
                      return 'bg-gray-100 text-gray-800';
                  }
                }}
                getStatusIcon={(status) => null}
                readOnly={false}
                showVoting={false}
              />
            </div>
            
            {/* Issue Dialog */}
            <IssueDialog
              isOpen={showIssueDialog}
              onClose={() => {
                setShowIssueDialog(false);
                setEditingIssue(null);
              }}
              onSave={async (issueData) => {
                try {
                  const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
                  if (editingIssue) {
                    await issuesService.updateIssue(editingIssue.id, issueData);
                  } else {
                    await issuesService.createIssue({
                      ...issueData,
                      team_id: effectiveTeamId
                    });
                  }
                  await fetchIssuesData();
                  setShowIssueDialog(false);
                  setEditingIssue(null);
                  setSuccess('Issue saved successfully');
                } catch (error) {
                  console.error('Failed to save issue:', error);
                  setError('Failed to save issue');
                }
              }}
              issue={editingIssue}
            />
          </div>
        );

      case 'next-steps':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Next Steps
              </CardTitle>
              <CardDescription>Confirm action items and responsibilities (15 minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Review and confirm the following before concluding:
                </p>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">1. Priority Owners</h4>
                    <p className="text-sm text-gray-600">
                      Ensure each priority has a clear owner who is accountable for its completion.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">2. Key Dates</h4>
                    <p className="text-sm text-gray-600">
                      Review any critical milestones or deadlines for the quarter.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">3. Communication Plan</h4>
                    <p className="text-sm text-gray-600">
                      How will priorities and decisions be communicated to the broader team?
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">4. Support Needed</h4>
                    <p className="text-sm text-gray-600">
                      What resources or support do priority owners need to be successful?
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'conclude':
        return (
          <Card className="border-0 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <CheckSquare className="h-5 w-5 text-green-600" />
                    Meeting Conclusion
                  </CardTitle>
                  <CardDescription className="mt-1">Wrap up and capture key takeaways</CardDescription>
                </div>
                <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                  10 minutes
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                      Feedback
                    </h4>
                    <p className="text-sm text-gray-600">Where's your head? How are you feeling?</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-600" />
                      Expectations
                    </h4>
                    <p className="text-sm text-gray-600">Were your expectations met?</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Star className="h-4 w-4 text-purple-600" />
                      Session Rating
                    </h4>
                    <p className="text-sm text-gray-600">Rate effectiveness (1-10)</p>
                  </div>
                </div>
                
                <div className="text-center py-8 border-t border-gray-100">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Great Planning Session!</h3>
                  <p className="text-gray-600">Your quarterly priorities are set and the team is aligned.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quarterly Planning Meeting</h1>
              <p className="text-gray-600 mt-2">Plan and align for the upcoming quarter</p>
            </div>
            {meetingStarted && (
              <div className="flex items-center gap-4">
                <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-lg font-mono font-semibold text-gray-900">
                      {formatTime(elapsedTime)}
                    </span>
                  </div>
                </div>
                {activeSection === 'conclude' && (
                  <Button
                    onClick={concludeMeeting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Conclude Meeting
                  </Button>
                )}
              </div>
            )}
            {/* Meeting auto-starts - no start button needed */}
          </div>

          {/* Alerts */}
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeSection} onValueChange={handleSectionChange} className="space-y-6">
          <TabsList className="w-full grid grid-cols-4 lg:grid-cols-8 gap-2 h-auto p-1 bg-white shadow-sm">
            {agendaItems.map((item) => {
              const Icon = item.icon;
              const currentIndex = agendaItems.findIndex(i => i.id === activeSection);
              const itemIndex = agendaItems.findIndex(i => i.id === item.id);
              const isCompleted = itemIndex < currentIndex;
              
              return (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700"
                >
                  <Icon className={`h-5 w-5 ${
                    isCompleted ? 'text-green-600' : ''
                  }`} />
                  <span className="text-xs font-medium">{item.label}</span>
                  <span className="text-xs text-gray-500">{item.duration}m</span>
                  {isCompleted && (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm">
            {renderContent()}
          </div>
        </Tabs>

        {/* Meeting Rating Dialog for Conclude */}
        {activeSection === 'conclude' && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Rate This Meeting</h3>
            <div className="flex gap-2 mb-4">
              {[...Array(10)].map((_, i) => (
                <Button
                  key={i + 1}
                  variant={meetingRating === i + 1 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMeetingRating(i + 1)}
                  className={`w-10 h-10 ${
                    meetingRating === i + 1 
                      ? 'bg-indigo-600 hover:bg-indigo-700' 
                      : ''
                  }`}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cascading Message (Optional)
                </label>
                <textarea
                  value={cascadingMessage}
                  onChange={(e) => setCascadingMessage(e.target.value)}
                  placeholder="Key messages to cascade to your teams..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuarterlyPlanningMeetingPage;