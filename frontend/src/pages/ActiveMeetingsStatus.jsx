import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function ActiveMeetingsStatus() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [error, setError] = useState(null);
  const { token } = useAuthStore();

  useEffect(() => {
    fetchActiveMeetings();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchActiveMeetings();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchActiveMeetings = async () => {
    if (!token) {
      setError('Authentication token not found');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/admin/active-meetings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setMeetings(data.meetings || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch active meetings:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const activeMeetingsCount = meetings.filter(m => m.status === 'in-progress').length;
  const activeRecordingsCount = meetings.filter(m => m.has_active_recording).length;
  const safeToDeploy = activeMeetingsCount === 0;

  const formatDuration = (startedAt) => {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now - start;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} minutes`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      return `${hours}h ${remainingMins}m`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Active Meetings Dashboard</h1>
          <p className="text-gray-600 text-lg mb-2">Check before deploying updates</p>
          <p className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refreshes every 30 seconds
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700 font-medium">Error loading data</span>
            </div>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Status Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Active Meetings */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <div className="text-center">
              {activeMeetingsCount === 0 ? (
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              ) : (
                <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
              )}
              <div className="text-4xl font-bold text-gray-900 mb-1">{activeMeetingsCount}</div>
              <div className="text-sm font-medium text-gray-600">Active Meetings</div>
            </div>
          </div>

          {/* Active Recordings */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <div className="text-center">
              {activeRecordingsCount === 0 ? (
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              ) : (
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              )}
              <div className="text-4xl font-bold text-gray-900 mb-1">{activeRecordingsCount}</div>
              <div className="text-sm font-medium text-gray-600">Active Recordings</div>
            </div>
          </div>

          {/* Deployment Status */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <div className="text-center">
              {safeToDeploy ? (
                <>
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <div className="text-xl font-bold text-green-600 mb-1">Safe to Deploy</div>
                </>
              ) : activeRecordingsCount > 0 ? (
                <>
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                  <div className="text-xl font-bold text-red-600 mb-1">DO NOT DEPLOY</div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                  <div className="text-xl font-bold text-yellow-600 mb-1">Wait Before Deploy</div>
                </>
              )}
              <div className="text-sm text-gray-600">Deployment Status</div>
            </div>
          </div>
        </div>

        {/* Active Meetings List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {activeMeetingsCount === 0 ? (
                'No Active Meetings ✅'
              ) : (
                `${activeMeetingsCount} Active Meeting${activeMeetingsCount > 1 ? 's' : ''}`
              )}
            </h2>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-3 text-gray-600">Loading meetings...</span>
              </div>
            ) : activeMeetingsCount === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">All clear!</h3>
                <p className="text-gray-600 mb-1">No meetings in progress across all organizations.</p>
                <p className="text-sm text-green-600 font-medium">✅ Safe to deploy updates</p>
              </div>
            ) : (
              <div className="space-y-4">
                {meetings.filter(m => m.status === 'in-progress').map((meeting) => (
                  <div
                    key={meeting.id}
                    className={`border-l-4 rounded-lg p-6 bg-gradient-to-r from-white to-gray-50 hover:shadow-md transition-all duration-200 ${
                      meeting.has_active_recording 
                        ? 'border-red-500 bg-gradient-to-r from-red-50 to-red-25' 
                        : 'border-yellow-500 bg-gradient-to-r from-yellow-50 to-yellow-25'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {meeting.team_name}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            meeting.has_active_recording 
                              ? 'bg-red-100 text-red-700 border border-red-200' 
                              : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                          }`}>
                            {meeting.has_active_recording ? '🔴 Recording' : '⚠️ In Progress'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <p className="font-medium text-gray-700">Organization</p>
                            <p>{meeting.organization_name}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">Duration</p>
                            <p>{formatDuration(meeting.started_at)}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">Started</p>
                            <p>{new Date(meeting.started_at).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">Meeting ID</p>
                            <p className="font-mono text-xs">{meeting.id}</p>
                          </div>
                        </div>
                        
                        {meeting.has_active_recording && (
                          <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                            <p className="text-red-800 font-medium text-sm">
                              ⚠️ AI Recording in progress - DO NOT DEPLOY until recording is complete
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={fetchActiveMeetings}
            disabled={loading}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Now
              </>
            )}
          </button>
          <p className="text-sm text-gray-500 mt-3">
            Dashboard automatically refreshes every 30 seconds
          </p>
        </div>

        {/* Deployment Guidelines */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Deployment Safety Guidelines</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-green-700">0 active meetings:</strong> Safe to deploy anytime</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-yellow-700">Active meetings, no recordings:</strong> Safe to deploy (may briefly interrupt UI)</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-red-700">Active recordings:</strong> DO NOT DEPLOY - will break AI transcription</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}