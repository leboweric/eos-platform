import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Smile,
  BarChart,
  Target,
  Newspaper,
  ListTodo,
  AlertTriangle,
  CheckSquare,
  ArrowLeftRight,
  ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ScorecardTable from '../components/scorecard/ScorecardTable';
import PriorityCard from '../components/priorities/PriorityCard';
import IssueCard from '../components/issues/IssueCard';
import IssueDialog from '../components/issues/IssueDialog';
import TodoCard from '../components/todos/TodoCard';
import { scorecardService } from '../services/scorecardService';
import { quarterlyPrioritiesService } from '../services/quarterlyPrioritiesService';
import { issuesService } from '../services/issuesService';
import { todosService } from '../services/todosService';

const WeeklyAccountabilityMeetingPage = () => {
  const { user } = useAuthStore();
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('good-news');
  const [success, setSuccess] = useState(null);
  
  // Meeting data
  const [scorecardMetrics, setScorecardMetrics] = useState([]);
  const [weeklyScores, setWeeklyScores] = useState({});
  const [priorities, setPriorities] = useState([]);
  const [issues, setIssues] = useState([]);
  const [todos, setTodos] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [goodNews, setGoodNews] = useState([]);
  const [headlines, setHeadlines] = useState([]);
  
  // Dialog states
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    companyPriorities: false,
    individualPriorities: {}
  });
  const [isRTL, setIsRTL] = useState(() => {
    // Load RTL preference from localStorage
    const saved = localStorage.getItem('scorecardRTL');
    return saved === 'true';
  });
  const [showTotal, setShowTotal] = useState(() => {
    // Load showTotal preference from localStorage
    const saved = localStorage.getItem('scorecardShowTotal');
    return saved !== null ? saved === 'true' : true; // Default to true if not set
  });

  const agendaItems = [
    { id: 'good-news', label: 'Good News', duration: 5, icon: Smile },
    { id: 'scorecard', label: 'Scorecard', duration: 5, icon: BarChart },
    { id: 'priorities', label: 'Priorities', duration: 5, icon: Target },
    { id: 'headlines', label: 'Headlines', duration: 5, icon: Newspaper },
    { id: 'todo-list', label: 'To Do List', duration: 5, icon: ListTodo },
    { id: 'issues', label: 'Issues', duration: 60, icon: AlertTriangle },
    { id: 'conclude', label: 'Conclude', duration: 5, icon: CheckSquare }
  ];

  useEffect(() => {
    if (activeSection === 'scorecard') {
      fetchScorecardData();
    } else if (activeSection === 'priorities') {
      fetchPrioritiesData();
    } else if (activeSection === 'issues') {
      fetchIssuesData();
    } else if (activeSection === 'todo-list') {
      fetchTodosData();
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

  const fetchScorecardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      // Use the same default as ScorecardPage if teamId is not provided
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      console.log('Fetching scorecard with:', { orgId, teamId: effectiveTeamId });
      
      const response = await scorecardService.getScorecard(orgId, effectiveTeamId);
      console.log('Scorecard response:', response);
      
      // The response structure from the API has metrics and weeklyScores
      const metrics = response.metrics || response.data?.metrics || [];
      const scores = response.weeklyScores || response.data?.weeklyScores || {};
      
      setScorecardMetrics(metrics);
      setWeeklyScores(scores);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch scorecard:', error);
      setError('Failed to load scorecard data');
      setLoading(false);
    }
  };

  const fetchPrioritiesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      // Use the same default as ScorecardPage if teamId is not provided
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      // Use the simplified current priorities endpoint
      const response = await quarterlyPrioritiesService.getCurrentPriorities(orgId, effectiveTeamId);
      
      // Extract data in the same format as the original page
      const companyPriorities = response.companyPriorities || [];
      const teamMemberPriorities = response.teamMemberPriorities || {};
      
      // Flatten the data structure to a simple array for easier handling
      const allPriorities = [
        ...companyPriorities.map(p => ({ ...p, priority_type: 'company' })),
        ...Object.values(teamMemberPriorities).flatMap(memberData => 
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
      const response = await issuesService.getIssues();
      
      console.log('All issues from API:', response.data.issues);
      console.log('Issues breakdown:', response.data.issues.map(i => ({
        id: i.id,
        title: i.title,
        status: i.status,
        timeline: i.timeline,
        willShow: i.status === 'open' && i.timeline === 'short_term'
      })));
      
      const filteredIssues = response.data.issues.filter(i => i.status === 'open' && i.timeline === 'short_term');
      console.log('Filtered short-term issues:', filteredIssues);
      
      setIssues(filteredIssues);
      setTeamMembers(response.data.teamMembers || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
      setError('Failed to load issues');
      setLoading(false);
    }
  };

  const handleVote = async (issueId, shouldVote) => {
    try {
      if (shouldVote) {
        await issuesService.voteForIssue(issueId);
      } else {
        await issuesService.unvoteForIssue(issueId);
      }
      await fetchIssuesData();
    } catch (error) {
      console.error('Failed to vote:', error);
      setError('Failed to update vote');
    }
  };

  const handleEditIssue = (issue) => {
    setEditingIssue(issue);
    setShowIssueDialog(true);
  };

  const handleSaveIssue = async (issueData) => {
    try {
      if (editingIssue) {
        await issuesService.updateIssue(editingIssue.id, issueData);
        setSuccess('Issue updated successfully');
      } else {
        await issuesService.createIssue({
          ...issueData,
          timeline: 'short_term' // New issues in meetings are short-term
        });
        setSuccess('Issue created successfully');
      }
      
      await fetchIssuesData();
      setShowIssueDialog(false);
      setEditingIssue(null);
    } catch (error) {
      console.error('Failed to save issue:', error);
      setError('Failed to save issue');
    }
  };

  const handleIssueStatusChange = async (issueId, newStatus) => {
    try {
      await issuesService.updateIssue(issueId, { status: newStatus });
      await fetchIssuesData(); // Refresh the issues list
      setSuccess(`Issue ${newStatus === 'closed' ? 'closed' : 'reopened'} successfully`);
    } catch (error) {
      console.error('Failed to update issue status:', error);
      setError('Failed to update issue status');
    }
  };

  const handleIssueTimelineChange = async (issueId, newTimeline) => {
    try {
      await issuesService.updateIssue(issueId, { timeline: newTimeline });
      await fetchIssuesData(); // Refresh the issues list
      setSuccess(`Issue moved to ${newTimeline.replace('_', ' ')} successfully`);
    } catch (error) {
      console.error('Failed to update issue timeline:', error);
      setError('Failed to update issue timeline');
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

  const fetchTodosData = async () => {
    try {
      setLoading(true);
      const response = await todosService.getTodos('incomplete');
      setTodos(response.data.todos || []);
      setTeamMembers(response.data.teamMembers || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
      setError('Failed to load todos');
      setLoading(false);
    }
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

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    switch (activeSection) {
      case 'good-news':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smile className="h-5 w-5" />
                Good News
              </CardTitle>
              <CardDescription>Share personal and professional wins (5 minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Take turns sharing good news from your personal and professional lives. 
                  This helps build team connection and starts the meeting on a positive note.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Tips for Good News:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Keep it brief - aim for 30-60 seconds per person</li>
                    <li>Share both personal and professional wins</li>
                    <li>Celebrate team members' achievements</li>
                    <li>Be authentic and genuine</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'scorecard':
        return (
          <div className="space-y-4 w-full">
            {scorecardMetrics.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="h-5 w-5" />
                    Scorecard Review
                  </CardTitle>
                  <CardDescription>Review weekly metrics (5 minutes)</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No scorecard metrics found. Set up your scorecard to track key metrics.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate('/scorecard')}
                  >
                    Go to Scorecard
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex justify-end gap-2">
                  <Button 
                    onClick={() => {
                      const newValue = !showTotal;
                      setShowTotal(newValue);
                      localStorage.setItem('scorecardShowTotal', newValue.toString());
                    }} 
                    variant="outline"
                    size="sm"
                    title={showTotal ? "Hide total column" : "Show total column"}
                  >
                    {showTotal ? "Hide Total" : "Show Total"}
                  </Button>
                  <Button 
                    onClick={() => {
                      const newValue = !isRTL;
                      setIsRTL(newValue);
                      localStorage.setItem('scorecardRTL', newValue.toString());
                    }} 
                    variant="outline"
                    size="sm"
                    title={isRTL ? "Switch to left-to-right" : "Switch to right-to-left"}
                  >
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    {isRTL ? "Switch to LTR" : "Switch to RTL"}
                  </Button>
                </div>
                <ScorecardTable 
                  metrics={scorecardMetrics} 
                  weeklyScores={weeklyScores} 
                  readOnly={true}
                  isRTL={isRTL}
                  showTotal={showTotal}
                  onIssueCreated={(message) => {
                    setSuccess(message);
                    setTimeout(() => setSuccess(null), 3000);
                  }}
                />
              </>
            )}
          </div>
        );

      case 'priorities':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Quarterly Priorities Review
                </CardTitle>
                <CardDescription>Check progress on quarterly priorities (5 minutes)</CardDescription>
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
                          <Target className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold">
                            Company Priorities ({companyPriorities.length})
                          </h3>
                        </div>
                      </div>
                      {expandedSections.companyPriorities && (
                        <div className="space-y-4 ml-7 mt-4">
                          {companyPriorities.map(priority => (
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
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <Target className="h-5 w-5 text-purple-600" />
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

      case 'headlines':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5" />
                Headlines
              </CardTitle>
              <CardDescription>Share important updates and information (5 minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Share important updates that the team needs to know about. Keep headlines brief and factual.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Examples of Headlines:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Customer feedback or complaints</li>
                    <li>Important deadlines or events</li>
                    <li>Personnel changes or updates</li>
                    <li>Market or competitive information</li>
                    <li>Process or system changes</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'todo-list':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5" />
                  To-Do List Review
                </CardTitle>
                <CardDescription>Review action items from last week (5 minutes)</CardDescription>
              </CardHeader>
            </Card>
            {todos.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No incomplete to-dos found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {todos.map(todo => (
                  <TodoCard key={todo.id} todo={todo} readOnly />
                ))}
              </div>
            )}
          </div>
        );

      case 'issues':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Issues Discussion
                </CardTitle>
                <CardDescription>Review and solve short-term issues (60 minutes)</CardDescription>
              </CardHeader>
            </Card>
            {issues.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No open issues found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {issues.map(issue => (
                  <IssueCard 
                    key={issue.id} 
                    issue={issue} 
                    showVoting
                    onVote={handleVote}
                    onEdit={handleEditIssue}
                    onStatusChange={handleIssueStatusChange}
                    onTimelineChange={handleIssueTimelineChange}
                    getStatusColor={(status) => {
                      switch (status) {
                        case 'open': return 'bg-yellow-100 text-yellow-800';
                        case 'closed': return 'bg-green-100 text-green-800';
                        default: return 'bg-gray-100 text-gray-800';
                      }
                    }}
                    getStatusIcon={(status) => {
                      switch (status) {
                        case 'open': return <AlertTriangle className="h-4 w-4" />;
                        case 'closed': return <CheckCircle className="h-4 w-4" />;
                        default: return null;
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'conclude':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Conclude
              </CardTitle>
              <CardDescription>Wrap up and rate the meeting (5 minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Meeting Wrap-up:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Recap key decisions and action items</li>
                    <li>Confirm next steps and ownership</li>
                    <li>Rate the meeting (1-10)</li>
                    <li>Share any final thoughts</li>
                  </ul>
                </div>
                <div className="flex items-center justify-center gap-2 py-8">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <span className="text-2xl font-semibold">Meeting Complete!</span>
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
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen flex-shrink-0">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Weekly Accountability Meeting</h1>
            <p className="text-gray-600 text-sm">90 minutes total</p>
          </div>
          
          <nav className="px-4 pb-6">
            {agendaItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              const isCompleted = agendaItems.findIndex(i => i.id === activeSection) > index;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleSectionChange(item.id)}
                  className={`w-full text-left px-4 py-3 mb-2 rounded-lg transition-colors flex items-center justify-between group ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                      : isCompleted
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{item.duration}m</span>
                    {isActive && <ChevronRight className="h-4 w-4" />}
                    {isCompleted && <CheckCircle className="h-4 w-4 text-green-600" />}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-x-auto">
          <div className={activeSection === 'scorecard' || activeSection === 'priorities' ? 'min-w-fit' : 'max-w-6xl mx-auto'}>
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            {renderContent()}

            {/* Navigation buttons */}
            {getNextSection() && (
              <div className="mt-6 flex justify-end">
                <Button 
                  onClick={() => handleSectionChange(getNextSection())}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Next: {agendaItems.find(item => item.id === getNextSection())?.label}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Issue Edit Dialog */}
      <IssueDialog
        open={showIssueDialog}
        onClose={() => {
          setShowIssueDialog(false);
          setEditingIssue(null);
        }}
        issue={editingIssue}
        onSave={handleSaveIssue}
        teamMembers={teamMembers}
      />
    </div>
  );
};

export default WeeklyAccountabilityMeetingPage;