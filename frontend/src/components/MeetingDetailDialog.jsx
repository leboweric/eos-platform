import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar,
  Clock,
  Users,
  Star,
  X,
  Save,
  Edit,
  Download,
  CheckCircle,
  AlertTriangle,
  ListTodo,
  Target,
  User,
  Loader2,
  AlertCircle,
  FileText,
  TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

const MeetingDetailDialog = ({ meeting, onClose, onNotesUpdate }) => {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(meeting.snapshot_data?.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);

  if (!meeting || !meeting.snapshot_data) {
    return null;
  }

  const snapshotData = meeting.snapshot_data;
  const issues = snapshotData.issues || {};
  const todos = snapshotData.todos || {};
  const attendees = snapshotData.attendees || [];
  const conclusions = snapshotData.conclusions || {};

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      await onNotesUpdate(meeting.id, notes);
      setEditingNotes(false);
    } catch (error) {
      // Error is handled in parent component
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCancelNotesEdit = () => {
    setNotes(snapshotData.notes || '');
    setEditingNotes(false);
  };

  const attendedCount = attendees.filter(a => a.attended).length;
  const ratingsCount = attendees.filter(a => a.rating !== null).length;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold mb-2">
                {meeting.team_name} Meeting
              </DialogTitle>
              <div className="flex items-center gap-4 text-sm text-gray-600">
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
                <Badge className="bg-blue-100 text-blue-800">
                  {meeting.meeting_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Meeting'}
                </Badge>
                {meeting.average_rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">
                      {typeof meeting.average_rating === 'number' ? meeting.average_rating.toFixed(1) : 'N/A'}/10
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.print()}
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="todos">To-Dos</TabsTrigger>
            <TabsTrigger value="attendees">Attendees</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Issues Solved</p>
                      <p className="text-2xl font-bold text-green-600">
                        {issues.solved?.length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Issues Created</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {issues.created?.length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <ListTodo className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Todos Created</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {todos.created?.length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Target className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Todos Completed</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {todos.completed?.length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Key Decisions */}
            {conclusions.key_decisions && conclusions.key_decisions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Key Decisions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {conclusions.key_decisions.map((decision, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <span>{decision}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Meeting Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Meeting Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {meeting.facilitator_name && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Facilitator:</span>
                    <span className="font-medium">{meeting.facilitator_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Attendance:</span>
                  <span className="font-medium">
                    {attendedCount} of {attendees.length} attendees
                  </span>
                </div>
                {ratingsCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Average Rating:</span>
                    <span className="font-medium">
                      {typeof meeting.average_rating === 'number' ? meeting.average_rating.toFixed(1) : 'N/A'}/10 ({ratingsCount} ratings)
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues" className="space-y-6">
            {/* Issues Solved */}
            {issues.solved && issues.solved.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Issues Solved ({issues.solved.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {issues.solved.map((issue, index) => (
                      <div key={index} className="border-l-4 border-green-500 pl-4 py-2">
                        <h4 className="font-medium">{issue.title}</h4>
                        {issue.solution && (
                          <p className="text-sm text-gray-600 mt-1">{issue.solution}</p>
                        )}
                        {issue.solved_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Solved: {new Date(issue.solved_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Issues Created */}
            {issues.created && issues.created.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-600">
                    <AlertTriangle className="h-5 w-5" />
                    Issues Created ({issues.created.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {issues.created.map((issue, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                        <h4 className="font-medium">{issue.title}</h4>
                        {issue.priority && (
                          <Badge variant="outline" className="mt-1">
                            Priority: {issue.priority}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Issues Discussed */}
            {issues.discussed && issues.discussed.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-600">
                    <AlertTriangle className="h-5 w-5" />
                    Issues Discussed ({issues.discussed.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {issues.discussed.map((issue, index) => (
                      <div key={index} className="border-l-4 border-gray-400 pl-4 py-2">
                        <h4 className="font-medium">{issue.title}</h4>
                        <Badge variant="outline" className="mt-1">
                          {issue.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {(!issues.solved?.length && !issues.created?.length && !issues.discussed?.length) && (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No issues were recorded for this meeting</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="todos" className="space-y-6">
            {/* Todos Created */}
            {todos.created && todos.created.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-600">
                    <ListTodo className="h-5 w-5" />
                    To-Dos Created ({todos.created.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {todos.created.map((todo, index) => (
                      <div key={index} className="border-l-4 border-purple-500 pl-4 py-2">
                        <h4 className="font-medium">{todo.title}</h4>
                        {todo.assignee_name && (
                          <p className="text-sm text-gray-600 mt-1">
                            Assigned to: {todo.assignee_name}
                          </p>
                        )}
                        {todo.due_date && (
                          <p className="text-sm text-gray-600">
                            Due: {new Date(todo.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Todos Completed */}
            {todos.completed && todos.completed.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <Target className="h-5 w-5" />
                    To-Dos Completed ({todos.completed.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {todos.completed.map((todo, index) => (
                      <div key={index} className="border-l-4 border-orange-500 pl-4 py-2">
                        <h4 className="font-medium line-through text-gray-600">{todo.title}</h4>
                        {todo.completed_by && (
                          <p className="text-sm text-gray-600 mt-1">
                            Completed by: {todo.completed_by}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {(!todos.created?.length && !todos.completed?.length) && (
              <div className="text-center py-8 text-gray-500">
                <ListTodo className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No to-dos were recorded for this meeting</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="attendees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Attendees ({attendees.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendees.length > 0 ? (
                  <div className="space-y-3">
                    {attendees.map((attendee, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${attendee.attended ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className="font-medium">{attendee.name}</span>
                          <span className="text-sm text-gray-500">
                            {attendee.attended ? 'Attended' : 'Did not attend'}
                          </span>
                        </div>
                        {attendee.rating !== null && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{attendee.rating}/10</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No attendee information available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Meeting Notes
                  </CardTitle>
                  {!editingNotes && (
                    <Button variant="outline" size="sm" onClick={() => setEditingNotes(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingNotes ? (
                  <div className="space-y-4">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Enter meeting notes..."
                      rows={10}
                      className="min-h-[200px]"
                    />
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSaveNotes} 
                        disabled={savingNotes}
                        className="flex items-center gap-2"
                      >
                        {savingNotes ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleCancelNotesEdit}
                        disabled={savingNotes}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="prose max-w-none">
                    {notes ? (
                      <div className="whitespace-pre-wrap">{notes}</div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No notes were recorded for this meeting</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setEditingNotes(true)}
                          className="mt-2"
                        >
                          Add Notes
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingDetailDialog;