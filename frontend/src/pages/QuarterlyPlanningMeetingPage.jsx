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
  Target,
  CheckSquare,
  AlertTriangle,
  ClipboardList,
  ListChecks,
  Calendar,
  Plus,
  ChevronDown,
  Archive
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PriorityCard from '../components/priorities/PriorityCard';
import IssuesList from '../components/issues/IssuesList';
import IssueDialog from '../components/issues/IssueDialog';
import { quarterlyPrioritiesService } from '../services/quarterlyPrioritiesService';
import { issuesService } from '../services/issuesService';

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
  const [previousPriorities, setPreviousPriorities] = useState([]);
  const [issues, setIssues] = useState([]);
  const [selectedIssueIds, setSelectedIssueIds] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  
  // Dialog states
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    companyPriorities: false,
    individualPriorities: {}
  });

  const agendaItems = [
    { id: 'objectives', label: 'Objectives', duration: 5, icon: Target },
    { id: 'check-in', label: 'Check In', duration: 10, icon: CheckSquare },
    { id: 'review-prior', label: 'Review Prior Quarter', duration: 30, icon: Calendar },
    { id: 'quarterly-priorities', label: 'Quarterly Priorities', duration: 60, icon: ListChecks },
    { id: 'issues', label: 'Issues', duration: 30, icon: AlertTriangle },
    { id: 'next-steps', label: 'Next Steps', duration: 15, icon: ClipboardList },
    { id: 'conclude', label: 'Conclude', duration: 10, icon: CheckSquare }
  ];

  useEffect(() => {
    if (activeSection === 'quarterly-priorities' || activeSection === 'review-prior') {
      fetchPrioritiesData();
    } else if (activeSection === 'issues') {
      fetchIssuesData();
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
      
      const data = await quarterlyPrioritiesService.getCurrentPriorities(orgId, effectiveTeamId);
      setPriorities(Array.isArray(data) ? data : []);
      
      // If reviewing prior quarter, also fetch previous quarter's priorities
      if (activeSection === 'review-prior') {
        // TODO: Implement getPreviousQuarterPriorities in the service
        // For now, we'll use the same data
        setPreviousPriorities(Array.isArray(data) ? data : []);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch priorities:', error);
      setError('Failed to load priorities data');
      setLoading(false);
    }
  };

  const fetchIssuesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      const response = await issuesService.getIssues(orgId, effectiveTeamId);
      // The response structure is {success: true, data: {issues: [...], teamMembers: [...]}}
      const issuesData = response?.data?.issues || [];
      const activeIssues = issuesData.filter(issue => !issue.is_archived);
      setIssues(activeIssues);
      if (response?.data?.teamMembers) {
        setTeamMembers(response.data.teamMembers);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
      setError('Failed to load issues');
      setLoading(false);
    }
  };

  const handlePriorityUpdate = async (priorityId, updates) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await quarterlyPrioritiesService.updatePriority(orgId, effectiveTeamId, priorityId, updates);
      
      // Refresh data
      await fetchPrioritiesData();
      setSuccess('Priority updated successfully');
    } catch (error) {
      console.error('Failed to update priority:', error);
      setError('Failed to update priority');
    }
  };

  const handleIssueUpdate = async (issueId, updates) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await issuesService.updateIssue(orgId, effectiveTeamId, issueId, updates);
      
      // Refresh issues
      await fetchIssuesData();
      setSuccess('Issue updated successfully');
    } catch (error) {
      console.error('Failed to update issue:', error);
      setError('Failed to update issue');
    }
  };

  const handleArchiveIssues = async () => {
    if (selectedIssueIds.length === 0) return;
    
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      // Archive each selected issue
      await Promise.all(
        selectedIssueIds.map(issueId =>
          issuesService.updateIssue(orgId, effectiveTeamId, issueId, { is_archived: true })
        )
      );
      
      // Clear selection and refresh
      setSelectedIssueIds([]);
      await fetchIssuesData();
      setSuccess(`Archived ${selectedIssueIds.length} issue(s)`);
    } catch (error) {
      console.error('Failed to archive issues:', error);
      setError('Failed to archive issues');
    }
  };

  const handleBack = () => {
    navigate('/meetings');
  };

  const handleNext = () => {
    const currentIndex = agendaItems.findIndex(item => item.id === activeSection);
    if (currentIndex < agendaItems.length - 1) {
      setActiveSection(agendaItems[currentIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    const currentIndex = agendaItems.findIndex(item => item.id === activeSection);
    if (currentIndex > 0) {
      setActiveSection(agendaItems[currentIndex - 1].id);
    }
  };

  const getCompletedSections = () => {
    const currentIndex = agendaItems.findIndex(item => item.id === activeSection);
    return agendaItems.slice(0, currentIndex).map(item => item.id);
  };

  const completedSections = getCompletedSections();
  const currentSectionIndex = agendaItems.findIndex(item => item.id === activeSection);
  const isFirstSection = currentSectionIndex === 0;
  const isLastSection = currentSectionIndex === agendaItems.length - 1;

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'objectives':
        return (
          <div className="space-y-6">
            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold mb-4">Meeting Objectives</h3>
              <ul className="space-y-2">
                <li>Review and assess the previous quarter's performance</li>
                <li>Identify key learnings and areas for improvement</li>
                <li>Set clear priorities for the upcoming quarter</li>
                <li>Align team on critical issues and next steps</li>
                <li>Ensure everyone leaves with clarity on their responsibilities</li>
              </ul>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This meeting is designed to help your team transition effectively from one quarter to the next. 
                Stay focused on high-level priorities and strategic decisions.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'check-in':
        return (
          <div className="space-y-6">
            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold mb-4">Team Check-In</h3>
              <p className="text-gray-600 mb-6">
                Go around the room and have each team member share:
              </p>
              <ol className="space-y-3">
                <li>
                  <strong>Personal highlight from the last quarter</strong>
                  <p className="text-sm text-gray-600">What was your biggest personal or professional win?</p>
                </li>
                <li>
                  <strong>Key learning or insight</strong>
                  <p className="text-sm text-gray-600">What did you learn that will help you going forward?</p>
                </li>
                <li>
                  <strong>Energy level coming into the new quarter</strong>
                  <p className="text-sm text-gray-600">Rate your energy/enthusiasm from 1-10 and explain why</p>
                </li>
              </ol>
            </div>
          </div>
        );

      case 'review-prior':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Review Prior Quarter</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Review each priority from last quarter. Discuss what was accomplished, 
                    what wasn't, and why. Be honest about successes and failures.
                  </AlertDescription>
                </Alert>
                
                {/* Company Priorities */}
                <div className="space-y-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-4 hover:bg-gray-50"
                    onClick={() => setExpandedSections(prev => ({
                      ...prev,
                      companyPriorities: !prev.companyPriorities
                    }))}
                  >
                    <span className="font-semibold">Company Priorities</span>
                    <ChevronDown className={`h-5 w-5 transition-transform ${
                      expandedSections.companyPriorities ? 'rotate-180' : ''
                    }`} />
                  </Button>
                  
                  {expandedSections.companyPriorities && (
                    <div className="pl-4 space-y-3">
                      {(previousPriorities || [])
                        .filter(p => p.is_company_priority)
                        .map(priority => (
                          <PriorityCard
                            key={priority.id}
                            priority={priority}
                            onUpdate={handlePriorityUpdate}
                            showActions={false}
                            isReadOnly={true}
                          />
                        ))}
                      {(previousPriorities || []).filter(p => p.is_company_priority).length === 0 && (
                        <p className="text-gray-500 text-sm">No company priorities from last quarter</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Individual Priorities */}
                {Object.entries(
                  (previousPriorities || [])
                    .filter(p => !p.is_company_priority)
                    .reduce((acc, priority) => {
                      const ownerName = priority.owner_name || 'Unassigned';
                      if (!acc[ownerName]) acc[ownerName] = [];
                      acc[ownerName].push(priority);
                      return acc;
                    }, {})
                ).map(([ownerName, ownerPriorities]) => (
                  <div key={ownerName} className="space-y-4">
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-4 hover:bg-gray-50"
                      onClick={() => setExpandedSections(prev => ({
                        ...prev,
                        individualPriorities: {
                          ...prev.individualPriorities,
                          [ownerName]: !prev.individualPriorities[ownerName]
                        }
                      }))}
                    >
                      <span className="font-semibold">{ownerName}'s Priorities</span>
                      <ChevronDown className={`h-5 w-5 transition-transform ${
                        expandedSections.individualPriorities[ownerName] ? 'rotate-180' : ''
                      }`} />
                    </Button>
                    
                    {expandedSections.individualPriorities[ownerName] && (
                      <div className="pl-4 space-y-3">
                        {ownerPriorities.map(priority => (
                          <PriorityCard
                            key={priority.id}
                            priority={priority}
                            onUpdate={handlePriorityUpdate}
                            showActions={false}
                            isReadOnly={true}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        );

      case 'quarterly-priorities':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Set Quarterly Priorities</h3>
              <Button
                onClick={() => navigate('/priorities')}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Manage Priorities
              </Button>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Set 3-7 priorities for the quarter. Each should be SMART 
                    (Specific, Measurable, Achievable, Relevant, Time-bound).
                  </AlertDescription>
                </Alert>
                
                {/* Company Priorities */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">Company Priorities</h4>
                  <div className="space-y-3">
                    {(priorities || [])
                      .filter(p => p.is_company_priority)
                      .map(priority => (
                        <PriorityCard
                          key={priority.id}
                          priority={priority}
                          onUpdate={handlePriorityUpdate}
                          showActions={true}
                        />
                      ))}
                    {(priorities || []).filter(p => p.is_company_priority).length === 0 && (
                      <p className="text-gray-500 text-sm">No company priorities set yet</p>
                    )}
                  </div>
                </div>

                {/* Individual Priorities */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">Individual Priorities</h4>
                  {Object.entries(
                    (priorities || [])
                      .filter(p => !p.is_company_priority)
                      .reduce((acc, priority) => {
                        const ownerName = priority.owner_name || 'Unassigned';
                        if (!acc[ownerName]) acc[ownerName] = [];
                        acc[ownerName].push(priority);
                        return acc;
                      }, {})
                  ).map(([ownerName, ownerPriorities]) => (
                    <div key={ownerName} className="space-y-3">
                      <h5 className="text-sm font-medium text-gray-600">{ownerName}</h5>
                      <div className="space-y-3 pl-4">
                        {ownerPriorities.map(priority => (
                          <PriorityCard
                            key={priority.id}
                            priority={priority}
                            onUpdate={handlePriorityUpdate}
                            showActions={true}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {(priorities || []).filter(p => !p.is_company_priority).length === 0 && (
                    <p className="text-gray-500 text-sm">No individual priorities set yet</p>
                  )}
                </div>
              </>
            )}
          </div>
        );

      case 'issues':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Strategic Issues</h3>
              <div className="flex gap-2">
                {selectedIssueIds.length > 0 && (
                  <Button
                    onClick={handleArchiveIssues}
                    variant="outline"
                    size="sm"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive ({selectedIssueIds.length})
                  </Button>
                )}
                <Button
                  onClick={() => setShowIssueDialog(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Issue
                </Button>
              </div>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Focus on strategic issues that could impact the quarter ahead. 
                    Tactical issues should be handled in weekly meetings.
                  </AlertDescription>
                </Alert>
                
                <IssuesList
                  issues={issues}
                  selectedIssueIds={selectedIssueIds}
                  onSelectionChange={setSelectedIssueIds}
                  onEdit={(issue) => {
                    setEditingIssue(issue);
                    setShowIssueDialog(true);
                  }}
                  onUpdate={handleIssueUpdate}
                  showVoting={false}
                />
              </>
            )}
          </div>
        );

      case 'next-steps':
        return (
          <div className="space-y-6">
            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
              <p className="text-gray-600 mb-6">
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
          </div>
        );

      case 'conclude':
        return (
          <div className="space-y-6">
            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold mb-4">Meeting Conclusion</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Quick Recap</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Reviewed last quarter's performance</li>
                    <li>• Set new quarterly priorities</li>
                    <li>• Identified key strategic issues</li>
                    <li>• Aligned on next steps and responsibilities</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Rate this Meeting</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    On a scale of 1-10, how effective was this meeting?
                  </p>
                  <div className="flex gap-2">
                    {[...Array(10)].map((_, i) => (
                      <Button
                        key={i + 1}
                        variant="outline"
                        size="sm"
                        className="w-10 h-10"
                      >
                        {i + 1}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Great work! You've successfully completed your Quarterly Planning Meeting. 
                    Remember to follow up on action items and communicate decisions to your team.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Quarterly Planning</h2>
          <p className="text-sm text-gray-600 mt-1">
            Total Duration: {agendaItems.reduce((sum, item) => sum + item.duration, 0)} minutes
          </p>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {agendaItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              const isCompleted = completedSections.includes(item.id);
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700'
                        : isCompleted
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isCompleted && !isActive ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                      <span>{item.label}</span>
                    </div>
                    <span className="text-xs text-gray-500">{item.duration}m</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleBack}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Exit Meeting
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = agendaItems.find(item => item.id === activeSection)?.icon;
                  return Icon ? <Icon className="h-5 w-5" /> : null;
                })()}
                <CardTitle>
                  {agendaItems.find(item => item.id === activeSection)?.label}
                </CardTitle>
              </div>
              <CardDescription>
                Duration: {agendaItems.find(item => item.id === activeSection)?.duration} minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderSectionContent()}
            </CardContent>
          </Card>
        </div>
        
        {/* Navigation Footer */}
        <div className="border-t p-4 bg-white">
          <div className="flex justify-between items-center max-w-4xl mx-auto">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstSection}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex items-center gap-2">
              {agendaItems.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    index < currentSectionIndex
                      ? 'bg-green-500'
                      : index === currentSectionIndex
                      ? 'bg-indigo-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <Button
              onClick={handleNext}
              disabled={isLastSection}
            >
              {isLastSection ? 'Complete' : 'Next'}
              {!isLastSection && <ChevronRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Issue Dialog */}
      <IssueDialog
        open={showIssueDialog}
        onOpenChange={setShowIssueDialog}
        issue={editingIssue}
        onSave={async (issueData) => {
          try {
            const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
            const effectiveTeamId = teamId || user?.teamId || '00000000-0000-0000-0000-000000000000';
            
            if (editingIssue) {
              await issuesService.updateIssue(orgId, effectiveTeamId, editingIssue.id, issueData);
            } else {
              await issuesService.createIssue(orgId, effectiveTeamId, issueData);
            }
            
            await fetchIssuesData();
            setShowIssueDialog(false);
            setEditingIssue(null);
            setSuccess(editingIssue ? 'Issue updated successfully' : 'Issue created successfully');
          } catch (error) {
            console.error('Failed to save issue:', error);
            setError('Failed to save issue');
          }
        }}
      />
    </div>
  );
};

export default QuarterlyPlanningMeetingPage;