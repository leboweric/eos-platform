import { useState, useEffect, Component } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useDepartment } from '../contexts/DepartmentContext';
import meetingHistoryService from '../services/meetingHistoryService';
import { teamsService } from '../services/teamsService';
import MeetingDetailDialog from '../components/MeetingDetailDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar,
  Download,
  Search,
  Filter,
  Clock,
  Users,
  Star,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Plus,
  Target,
  ListTodo
} from 'lucide-react';
import toast from 'react-hot-toast';

// Error Boundary Component
class MeetingHistoryErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Meeting History Page Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="space-y-2">
                <p>An error occurred loading the meeting history page.</p>
                <p className="text-sm">Error: {this.state.error?.message}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  size="sm"
                  variant="outline"
                >
                  Refresh Page
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

const MeetingHistoryPageClean = () => {
  console.log('=== 🏁 MeetingHistoryPage COMPONENT RENDERING ===');
  
  const { user, currentOrganization } = useAuthStore();
  const { selectedDepartment } = useDepartment();
  
  console.log('👤 User in MeetingHistory:', user);
  console.log('🏢 Current Organization:', currentOrganization);
  console.log('🏢 Organization ID from user:', user?.organizationId || user?.organization_id);
  console.log('🏢 Organization ID from currentOrganization:', currentOrganization?.id);
  console.log('🏢 Selected Department:', selectedDepartment);
  
  // State management
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [teams, setTeams] = useState([]);
  
  // Summary modal state
  const [showSummary, setShowSummary] = useState(false);
  const [summaryHTML, setSummaryHTML] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    team_id: '',
    meeting_type: '',
    start_date: '',
    end_date: '',
    search_query: ''
  });
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  
  console.log('📋 Initial state:', { 
    meetingsCount: meetings.length, 
    loading, 
    filters,
    page,
    total 
  });

  // Trigger fetch when organization data becomes available
  useEffect(() => {
    console.log('🔄 === useEffect #1 TRIGGERED (org/user change) ===');
    console.log('🔄 user:', user);
    console.log('🔄 currentOrganization:', currentOrganization);
    
    const orgId = currentOrganization?.id || user?.organization_id || user?.organizationId;
    if (orgId) {
      console.log('🔄 Organization ID available, fetching data...');
      fetchTeams();
      fetchMeetings();
    }
  }, [user, currentOrganization]);

  useEffect(() => {
    console.log('🔄 === useEffect #2 TRIGGERED (selectedDepartment change) ===');
    console.log('🔄 selectedDepartment:', selectedDepartment);
    fetchMeetings();
  }, [selectedDepartment]);

  useEffect(() => {
    console.log('🔄 === useEffect #3 TRIGGERED (filters/page change) ===');
    console.log('🔄 filters:', filters);
    console.log('🔄 page:', page);
    fetchMeetings();
  }, [filters, page]);

  async function fetchTeams() {
    try {
      // Try to get org ID from multiple sources
      const orgId = currentOrganization?.id || user?.organization_id || user?.organizationId;
      
      if (!orgId) {
        console.log('⚠️ No organization ID available for fetching teams');
        return;
      }
      
      const response = await teamsService.getTeams(orgId);
      setTeams(response.data || []);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  }

  async function fetchMeetings() {
    console.log('📞 === fetchMeetings CALLED ===');
    console.log('📞 currentOrganization at fetch time:', currentOrganization);
    console.log('📞 user at fetch time:', user);
    console.log('📞 selectedDepartment:', selectedDepartment);
    
    try {
      setLoading(true);
      setError(null);
      
      // Try to get org ID from multiple sources
      const orgId = currentOrganization?.id || user?.organization_id || user?.organizationId;
      
      console.log('🔑 Extracted orgId:', orgId);
      console.log('🔑 Source breakdown:', {
        fromCurrentOrg: currentOrganization?.id,
        fromUserSnakeCase: user?.organization_id,
        fromUserCamelCase: user?.organizationId,
        finalOrgId: orgId
      });
      
      if (!orgId) {
        console.error('❌ NO ORGANIZATION ID - Exiting fetchMeetings early');
        console.error('❌ currentOrganization object:', currentOrganization);
        console.error('❌ user object:', user);
        setLoading(false);
        return;
      }
      
      // CRITICAL: Get team ID for access control
      const teamId = selectedDepartment?.id;
      
      // TEMPORARY: Allow fetch without team for testing
      if (!teamId) {
        console.warn('⚠️ No department selected - using hardcoded SSO team for testing');
        // Use SSO team ID as fallback for testing
        const fallbackTeamId = 'e621f912-d26e-4498-90f6-b287782b3a31';
        console.log('🔧 Using fallback team ID:', fallbackTeamId);
      }
      
      console.log('🔒 Filtering meetings by team:', teamId);
      console.log('🔒 Team name:', selectedDepartment?.name);

      // Use fallback team ID if no department selected (temporary for testing)
      const effectiveTeamId = teamId || 'e621f912-d26e-4498-90f6-b287782b3a31';
      
      const params = {
        ...filters,
        team_id: effectiveTeamId,  // Use effective team ID
        limit,
        offset: (page - 1) * limit
      };

      console.log('🌐 Raw params before cleanup:', params);

      // Remove empty filter values
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      console.log('🌐 Clean params after cleanup:', params);
      console.log('🌐 About to call meetingHistoryService.getMeetingHistory');
      console.log('🌐 Calling with params:', params);

      const response = await meetingHistoryService.getMeetingHistory(orgId, params);
      
      console.log('✅ === API RESPONSE RECEIVED ===');
      console.log('✅ Full response:', response);
      console.log('✅ Meetings array:', response.meetings);
      console.log('✅ Number of meetings:', response.meetings?.length || 0);
      console.log('✅ Total count:', response.total);
      
      setMeetings(response.meetings || []);
      setTotal(response.total || 0);
      
    } catch (error) {
      console.error('❌ === ERROR in fetchMeetings ===');
      console.error('❌ Error object:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response:', error.response);
      setError('Failed to load meeting history');
      toast.error('Failed to load meeting history');
    } finally {
      setLoading(false);
      console.log('📞 fetchMeetings completed, loading set to false');
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      team_id: '',
      meeting_type: '',
      start_date: '',
      end_date: '',
      search_query: ''
    });
    setPage(1);
  };

  const handleExportCSV = () => {
    try {
      const exportParams = { ...filters };
      // Remove empty values for export
      Object.keys(exportParams).forEach(key => {
        if (exportParams[key] === '' || exportParams[key] === null) {
          delete exportParams[key];
        }
      });
      
      meetingHistoryService.exportMeetingHistoryCSV(exportParams);
      toast.success('Meeting history export started');
    } catch (error) {
      console.error('Failed to export CSV:', error);
      toast.error('Failed to export meeting history');
    }
  };

  const handleMeetingClick = async (meeting) => {
    console.log('📄 Opening meeting summary for:', meeting.id);
    console.log('📄 Meeting object:', meeting);
    
    console.log('📄 Step 1: Setting loading state...');
    setLoadingSummary(true);
    
    console.log('📄 Step 2: Setting show summary...');
    setShowSummary(true);
    
    try {
      console.log('📄 Step 3: Getting auth token...');
      const token = localStorage.getItem('accessToken');
      console.log('📄 Token found:', !!token);
      console.log('📄 Token preview:', token ? `${token.substring(0, 20)}...` : 'null');
      
      if (!token) {
        console.error('📄 ERROR: No token found');
        toast.error('Authentication required');
        setShowSummary(false);
        return;
      }
      
      console.log('📄 Step 4: Building fetch URL...');
      const url = `${import.meta.env.VITE_API_URL}/api/v1/organizations/${meeting.organization_id}/meeting-history/${meeting.id}/summary`;
      console.log('📄 Fetch URL:', url);
      
      console.log('📄 Step 5: Making fetch request...');
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('📄 Step 6: Response received:', response.status);
      
      if (!response.ok) {
        console.error('📄 ERROR: Response not OK:', response.status);
        throw new Error('Failed to load meeting summary');
      }
      
      console.log('📄 Step 7: Parsing HTML...');
      const html = await response.text();
      console.log('📄 HTML length:', html.length);
      
      console.log('📄 Step 8: Setting HTML state...');
      setSummaryHTML(html);
      console.log('📄 SUCCESS: Summary loaded');
      
    } catch (error) {
      console.error('📄 CATCH ERROR:', error);
      console.error('📄 Error message:', error.message);
      console.error('📄 Error stack:', error.stack);
      toast.error('Failed to load meeting summary');
      setShowSummary(false);
    } finally {
      console.log('📄 Step 9: Setting loading false...');
      setLoadingSummary(false);
    }
  };

  const handleNotesUpdate = async (meetingId, notes) => {
    try {
      await meetingHistoryService.updateMeetingNotes(meetingId, notes);
      
      // Update the meeting in the list
      setMeetings(prev => prev.map(meeting => 
        meeting.id === meetingId 
          ? { 
              ...meeting, 
              snapshot_data: { 
                ...meeting.snapshot_data, 
                notes 
              } 
            }
          : meeting
      ));
      
      // Update selected meeting if it's the same one
      if (selectedMeeting?.id === meetingId) {
        setSelectedMeeting(prev => ({
          ...prev,
          snapshot_data: {
            ...prev.snapshot_data,
            notes
          }
        }));
      }
      
      toast.success('Notes updated successfully');
    } catch (error) {
      console.error('Failed to update notes:', error);
      toast.error('Failed to update notes');
      throw error;
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const totalPages = Math.ceil(total / limit);

  if (loading && meetings.length === 0) {
    console.log('🎨 RENDERING LOADING SPINNER');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  console.log('🎨 === RENDERING MAIN UI ===');
  console.log('🎨 Meetings count:', meetings.length);
  console.log('🎨 Loading state:', loading);
  console.log('🎨 Error state:', error);
  console.log('🎨 Total from backend:', total);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Meeting History</h1>
          <p className="text-gray-600">
            View archived meetings with detailed snapshots, attendee information, and outcomes.
          </p>
        </div>

        {/* Team Indicator */}
        {selectedDepartment ? (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              🔒 Showing meetings for: <strong>{selectedDepartment.name}</strong> team
            </p>
          </div>
        ) : (
          <Alert className="mb-4 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Please select a department from the dropdown to view meeting history
            </AlertDescription>
          </Alert>
        )}

        {/* Filter Bar */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search meetings..."
                    value={filters.search_query}
                    onChange={(e) => handleFilterChange('search_query', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Meeting Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="type">Meeting Type</Label>
                <Select
                  value={filters.meeting_type || undefined}
                  onValueChange={(value) => handleFilterChange('meeting_type', value || '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly_accountability">Weekly Accountability</SelectItem>
                    <SelectItem value="quarterly_planning">Quarterly Planning</SelectItem>
                    <SelectItem value="annual_planning">Annual Planning</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
              <Button onClick={handleExportCSV} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Showing {meetings.length} of {total} meetings
            {page > 1 && ` (Page ${page} of ${totalPages})`}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="border-red-200 bg-red-50 mb-6">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Meeting Cards List */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading meetings...</p>
          </div>
        ) : meetings.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No meetings found</h3>
            <p className="text-gray-600">
              Try adjusting your filters or check back after your next meeting
            </p>
          </Card>
        ) : (
          <div className="space-y-5">
            {meetings.map((meeting) => {
              const snapshotData = meeting.snapshot_data || {};
              const issues = snapshotData.issues || {};
              const todos = snapshotData.todos || {};
              
              return (
                <Card 
                  key={meeting.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleMeetingClick(meeting)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {meeting.team_name}
                          </h3>
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                            {meeting.meeting_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Meeting'}
                          </Badge>
                          {meeting.average_rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">
                                {meeting.average_rating.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(meeting.meeting_date)}
                          </div>
                          {meeting.duration_minutes && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatDuration(meeting.duration_minutes)}
                            </div>
                          )}
                          {snapshotData.attendees && (
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {snapshotData.attendees.length} attendees
                            </div>
                          )}
                          {meeting.facilitator_name && (
                            <div className="text-gray-500">
                              Facilitated by {meeting.facilitator_name}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4">
                          {issues.solved && issues.solved.length > 0 && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                {issues.solved.length} solved
                              </span>
                            </div>
                          )}
                          {issues.created && issues.created.length > 0 && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                {issues.created.length} issues
                              </span>
                            </div>
                          )}
                          {todos.created && todos.created.length > 0 && (
                            <div className="flex items-center gap-1 text-purple-600">
                              <ListTodo className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                {todos.created.length} todos
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Meeting Summary Modal - Fullscreen */}
        {showSummary && (
          <div className="fixed inset-0 z-50 bg-white overflow-auto">
            <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
              <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Meeting Summary</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.print()}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Save as PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSummary(false);
                      setSummaryHTML('');
                    }}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="container mx-auto">
              {loadingSummary ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-3">Loading meeting summary...</span>
                </div>
              ) : (
                <div 
                  dangerouslySetInnerHTML={{ __html: summaryHTML }}
                  className="meeting-summary-content"
                />
              )}
            </div>
          </div>
        )}

        {/* Meeting Detail Dialog - DISABLED - Using new summary modal instead */}
        {/* {showDetail && selectedMeeting && (
          <MeetingDetailDialog
            meeting={selectedMeeting}
            onClose={() => {
              setShowDetail(false);
              setSelectedMeeting(null);
            }}
            onNotesUpdate={handleNotesUpdate}
          />
        )} */}
      </div>
    </div>
  );
};

// Wrap with error boundary
const MeetingHistoryPageWithErrorBoundary = () => (
  <MeetingHistoryErrorBoundary>
    <MeetingHistoryPageClean />
  </MeetingHistoryErrorBoundary>
);

export default MeetingHistoryPageWithErrorBoundary;