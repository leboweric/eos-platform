import { useOutletContext } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Video } from 'lucide-react';

const DepartmentMeetingsPage = () => {
  const { department } = useOutletContext();
  const [meetings] = useState([
    {
      id: '1',
      title: 'Weekly Department Sync',
      type: 'weekly',
      day: 'Monday',
      time: '9:00 AM',
      duration: '90 minutes',
      attendees: department?.member_count || 0
    },
    {
      id: '2',
      title: 'Monthly Department Review',
      type: 'monthly',
      day: 'First Tuesday',
      time: '2:00 PM',
      duration: '2 hours',
      attendees: department?.member_count || 0
    }
  ]);

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

      <div className="grid gap-4 md:grid-cols-2">
        {meetings.map(meeting => (
          <Card key={meeting.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">{meeting.title}</CardTitle>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {meeting.day}
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {meeting.time}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-1" />
                  {meeting.attendees} attendees
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
    </div>
  );
};

export default DepartmentMeetingsPage;