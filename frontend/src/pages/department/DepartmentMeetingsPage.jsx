import { useOutletContext } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { meetingsService } from '../../services/meetingsService';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Video, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DepartmentMeetingsPage = () => {
  const { department } = useOutletContext();
  const { user } = useAuthStore();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (department) {
      fetchMeetings();
    }
  }, [department]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      
      // Use the department's first team ID if available, otherwise use department ID
      const teamId = department.teams && department.teams.length > 0 
        ? department.teams[0].id 
        : department.id;
      
      // Fetch department-specific meetings
      const data = await meetingsService.getMeetings(orgId, teamId);
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching department meetings:', error);
      setError('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Meetings</h2>
          <p className="text-gray-600 mt-1">
            Regular meetings for {department.name}
          </p>
        </div>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          Schedule Meeting
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {meetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg font-medium">No meetings scheduled</p>
            <p className="text-gray-500 text-sm mt-1">
              Schedule your first department meeting to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {meetings.map(meeting => (
          <Card key={meeting.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">{meeting.title}</CardTitle>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString() : meeting.day}
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {meeting.start_time || meeting.time}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-1" />
                  {meeting.attendee_count || meeting.attendees || 0} attendees
                </div>
                <Button size="sm" variant="outline">
                  <Video className="h-4 w-4 mr-1" />
                  Join
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}
    </div>
  );
};

export default DepartmentMeetingsPage;