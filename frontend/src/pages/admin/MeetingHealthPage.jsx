import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Users, 
  Activity,
  AlertTriangle,
  XCircle,
  Eye,
  StopCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const MeetingHealthPage = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [errors, setErrors] = useState([]);
  const [stuckSessions, setStuckSessions] = useState([]);
  const [selectedError, setSelectedError] = useState(null);
  const [acknowledgeNotes, setAcknowledgeNotes] = useState('');
  const [acknowledging, setAcknowledging] = useState(false);
  const [forceEndDialog, setForceEndDialog] = useState(null);
  const [forceEndReason, setForceEndReason] = useState('');
  const [forceEnding, setForceEnding] = useState(false);

  const fetchData = async () => {
    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      };

      const [healthRes, errorsRes, stuckRes] = await Promise.all([
        fetch(`${API_URL}/admin/meeting-health`, { headers }),
        fetch(`${API_URL}/admin/meeting-health/errors?hours=24&limit=50`, { headers }),
        fetch(`${API_URL}/admin/meeting-health/stuck-sessions`, { headers })
      ]);

      if (healthRes.ok) {
        const healthJson = await healthRes.json();
        setHealthData(healthJson.data);
      }

      if (errorsRes.ok) {
        const errorsJson = await errorsRes.json();
        setErrors(errorsJson.data || []);
      }

      if (stuckRes.ok) {
        const stuckJson = await stuckRes.json();
        setStuckSessions(stuckJson.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch meeting health data:', error);
      toast.error('Failed to load meeting health data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleAcknowledge = async () => {
    if (!selectedError) return;
    
    setAcknowledging(true);
    try {
      const response = await fetch(`${API_URL}/admin/meeting-health/errors/${selectedError.id}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ notes: acknowledgeNotes })
      });

      if (response.ok) {
        toast.success('Error acknowledged');
        setSelectedError(null);
        setAcknowledgeNotes('');
        fetchData();
      } else {
        toast.error('Failed to acknowledge error');
      }
    } catch (error) {
      toast.error('Failed to acknowledge error');
    } finally {
      setAcknowledging(false);
    }
  };

  const handleForceEnd = async () => {
    if (!forceEndDialog) return;
    
    setForceEnding(true);
    try {
      const response = await fetch(`${API_URL}/admin/meeting-health/sessions/${forceEndDialog.id}/force-end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ reason: forceEndReason })
      });

      if (response.ok) {
        toast.success('Session force-ended');
        setForceEndDialog(null);
        setForceEndReason('');
        fetchData();
      } else {
        toast.error('Failed to force-end session');
      }
    } catch (error) {
      toast.error('Failed to force-end session');
    } finally {
      setForceEnding(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="bg-red-600">Critical</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Warning</Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 relative overflow-hidden p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 bg-purple-50/80 text-purple-700">
              <Activity className="h-4 w-4" />
              MEETING MONITORING
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
              Meeting Health Dashboard
            </h1>
            <p className="text-gray-600">Monitor meeting errors and system health in real-time</p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Health Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Overall Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Overall Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${getStatusColor(healthData?.status)}`} />
                <span className="text-2xl font-bold capitalize">{healthData?.status || 'Unknown'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Active Meetings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Active Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <span className="text-2xl font-bold">{healthData?.activeMeetings?.count || 0}</span>
                  <p className="text-xs text-gray-500">
                    {healthData?.activeMeetings?.organizationsWithMeetings || 0} orgs
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Errors (24h) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Errors (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <AlertCircle className={`h-8 w-8 ${healthData?.errors?.total > 0 ? 'text-red-500' : 'text-green-500'}`} />
                <div>
                  <span className="text-2xl font-bold">{healthData?.errors?.total || 0}</span>
                  {healthData?.errors?.critical > 0 && (
                    <p className="text-xs text-red-500 font-medium">
                      {healthData.errors.critical} critical
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meetings Today */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Meetings (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <span className="text-2xl font-bold">{healthData?.recentActivity?.completedMeetings || 0}</span>
                  <p className="text-xs text-gray-500">
                    ~{healthData?.recentActivity?.avgDurationMinutes || 0} min avg
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stuck Sessions Warning */}
        {stuckSessions.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-5 w-5" />
                Stuck Sessions ({stuckSessions.length})
              </CardTitle>
              <CardDescription className="text-yellow-700">
                These meeting sessions have been active for more than 4 hours and may be orphaned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Facilitator</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stuckSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.organization_name}</TableCell>
                      <TableCell>{session.team_name}</TableCell>
                      <TableCell>{session.facilitator_name || 'Unknown'}</TableCell>
                      <TableCell>{format(new Date(session.start_time), 'MMM d, h:mm a')}</TableCell>
                      <TableCell className="text-yellow-700 font-medium">
                        {Math.round(session.hours_active)} hours
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => setForceEndDialog(session)}
                        >
                          <StopCircle className="h-4 w-4 mr-1" />
                          Force End
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Recent Errors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Recent Errors (24h)
            </CardTitle>
            <CardDescription>
              Meeting errors that occurred in the last 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="font-medium">No errors in the last 24 hours</p>
                <p className="text-sm">All meetings are running smoothly</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors.map((error) => (
                    <TableRow key={error.id} className={error.acknowledged ? 'opacity-60' : ''}>
                      <TableCell className="text-sm">
                        {formatDistanceToNow(new Date(error.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="font-medium">{error.organization_name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {error.error_type}
                        </code>
                      </TableCell>
                      <TableCell>{getSeverityBadge(error.severity)}</TableCell>
                      <TableCell className="text-sm">
                        {error.user_first_name ? `${error.user_first_name} ${error.user_last_name}` : 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {error.acknowledged ? (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            Acknowledged
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedError(error)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Details Dialog */}
      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Error Details
              {selectedError && getSeverityBadge(selectedError.severity)}
            </DialogTitle>
            <DialogDescription>
              {selectedError?.error_type} - {selectedError?.organization_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedError && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Time:</span>
                  <p>{format(new Date(selectedError.created_at), 'PPpp')}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">User:</span>
                  <p>{selectedError.user_email || 'Unknown'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Meeting Type:</span>
                  <p>{selectedError.meeting_type || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Phase:</span>
                  <p>{selectedError.meeting_phase || 'N/A'}</p>
                </div>
              </div>
              
              <div>
                <span className="font-medium text-gray-500 text-sm">Error Message:</span>
                <pre className="mt-1 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800 whitespace-pre-wrap overflow-auto max-h-40">
                  {selectedError.error_message}
                </pre>
              </div>
              
              {selectedError.error_stack && (
                <div>
                  <span className="font-medium text-gray-500 text-sm">Stack Trace:</span>
                  <pre className="mt-1 p-3 bg-gray-50 border rounded text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-32">
                    {selectedError.error_stack}
                  </pre>
                </div>
              )}
              
              {!selectedError.acknowledged && (
                <div>
                  <span className="font-medium text-gray-500 text-sm">Resolution Notes:</span>
                  <Textarea
                    value={acknowledgeNotes}
                    onChange={(e) => setAcknowledgeNotes(e.target.value)}
                    placeholder="Add notes about how this was resolved..."
                    className="mt-1"
                  />
                </div>
              )}
              
              {selectedError.acknowledged && selectedError.resolution_notes && (
                <div>
                  <span className="font-medium text-gray-500 text-sm">Resolution Notes:</span>
                  <p className="mt-1 p-3 bg-green-50 border border-green-200 rounded text-sm">
                    {selectedError.resolution_notes}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedError(null)}>
              Close
            </Button>
            {selectedError && !selectedError.acknowledged && (
              <Button onClick={handleAcknowledge} disabled={acknowledging}>
                {acknowledging ? 'Acknowledging...' : 'Acknowledge Error'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force End Dialog */}
      <Dialog open={!!forceEndDialog} onOpenChange={() => setForceEndDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Force End Session</DialogTitle>
            <DialogDescription>
              This will forcefully end the meeting session for {forceEndDialog?.organization_name}.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div>
            <span className="font-medium text-gray-500 text-sm">Reason for force-ending:</span>
            <Textarea
              value={forceEndReason}
              onChange={(e) => setForceEndReason(e.target.value)}
              placeholder="e.g., Session appears to be orphaned after browser crash"
              className="mt-1"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setForceEndDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleForceEnd} disabled={forceEnding}>
              {forceEnding ? 'Ending...' : 'Force End Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeetingHealthPage;
