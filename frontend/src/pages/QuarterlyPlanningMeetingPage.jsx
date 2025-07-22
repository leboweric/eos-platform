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
  Calendar,
  ClipboardList,
  ListChecks,
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const QuarterlyPlanningMeetingPage = () => {
  const { user } = useAuthStore();
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('objectives');
  const [success, setSuccess] = useState(null);

  const agendaItems = [
    { id: 'objectives', label: 'Objectives', duration: 5, icon: Target },
    { id: 'check-in', label: 'Check In', duration: 10, icon: CheckSquare },
    { id: 'review-prior', label: 'Review Prior Quarter', duration: 30, icon: Calendar },
    { id: 'quarterly-priorities', label: 'Quarterly Priorities', duration: 60, icon: ListChecks },
    { id: 'issues', label: 'Issues', duration: 30, icon: AlertTriangle },
    { id: 'next-steps', label: 'Next Steps', duration: 15, icon: ClipboardList },
    { id: 'conclude', label: 'Conclude', duration: 10, icon: CheckSquare }
  ];

  // Auto-clear success messages after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Meeting Objectives
              </CardTitle>
              <CardDescription>Review meeting goals and expected outcomes (5 minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  This quarterly planning meeting is designed to help your team transition effectively 
                  from one quarter to the next.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Meeting Goals:</h4>
                  <ul className="list-disc list-inside text-lg space-y-2">
                    <li>Clear Vision, All on Same Page</li>
                    <li>Clear Plan for Next Quarter</li>
                    <li>Resolve All Key Issues</li>
                  </ul>
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
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Review Prior Quarter
              </CardTitle>
              <CardDescription>Assess last quarter's performance and results (30 minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Review each priority from last quarter. Discuss what was accomplished, 
                  what wasn't, and why. Be honest about successes and failures.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Review Framework:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>What were our quarterly priorities?</li>
                    <li>Which ones did we complete successfully?</li>
                    <li>Which ones did we miss and why?</li>
                    <li>What obstacles did we encounter?</li>
                    <li>What can we learn from this quarter?</li>
                  </ul>
                </div>
                <div className="text-center py-8">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/quarterly-priorities')}
                  >
                    View Quarterly Priorities
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'quarterly-priorities':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5" />
                Set Quarterly Priorities
              </CardTitle>
              <CardDescription>Define 3-7 priorities for the upcoming quarter (60 minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Work together to establish the most important priorities for the next 90 days. 
                  Each priority should be SMART (Specific, Measurable, Achievable, Relevant, Time-bound).
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Priority Setting Guidelines:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Limit to 3-7 priorities total</li>
                    <li>Make them specific and measurable</li>
                    <li>Assign clear ownership</li>
                    <li>Set realistic deadlines</li>
                    <li>Ensure alignment with annual goals</li>
                  </ul>
                </div>
                <div className="text-center py-8">
                  <Button 
                    onClick={() => navigate('/quarterly-priorities')}
                  >
                    Go to Quarterly Priorities
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'issues':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Strategic Issues
              </CardTitle>
              <CardDescription>Identify and discuss strategic issues for the quarter (30 minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Focus on strategic issues that could impact the quarter ahead. 
                  Tactical issues should be handled in weekly meetings.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Strategic Issue Examples:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Market changes or competitive threats</li>
                    <li>Resource constraints or capacity issues</li>
                    <li>Major process improvements needed</li>
                    <li>Team structure or role changes</li>
                    <li>Technology or system upgrades</li>
                  </ul>
                </div>
                <div className="text-center py-8">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/issues')}
                  >
                    View Issues List
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Meeting Conclusion
              </CardTitle>
              <CardDescription>Wrap up and rate the meeting (10 minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Quick Recap:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Reviewed last quarter's performance</li>
                    <li>Set new quarterly priorities</li>
                    <li>Identified key strategic issues</li>
                    <li>Aligned on next steps and responsibilities</li>
                  </ul>
                </div>
                <div className="text-center py-8">
                  <h4 className="font-medium mb-4">Rate this Meeting</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    On a scale of 1-10, how effective was this meeting?
                  </p>
                  <div className="flex justify-center gap-2">
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Quarterly Planning Meeting</h1>
            <p className="text-gray-600 text-sm">2.5 hours total</p>
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
        <div className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
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
            {(getPreviousSection() || getNextSection()) && (
              <div className="mt-6 flex justify-between">
                <div>
                  {getPreviousSection() && (
                    <Button 
                      onClick={() => handleSectionChange(getPreviousSection())}
                      variant="outline"
                      className="border-gray-300 hover:bg-gray-50"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back: {agendaItems.find(item => item.id === getPreviousSection())?.label}
                    </Button>
                  )}
                </div>
                <div>
                  {getNextSection() && (
                    <Button 
                      onClick={() => handleSectionChange(getNextSection())}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      Next: {agendaItems.find(item => item.id === getNextSection())?.label}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuarterlyPlanningMeetingPage;