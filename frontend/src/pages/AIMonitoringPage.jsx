import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  FileText,
  Zap,
  RefreshCw
} from 'lucide-react';

const AIMonitoringPage = () => {
  const { orgId } = useParams();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/v1/organizations/${orgId}/ai-monitoring/health`
      );
      setMetrics(response.data.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching AI metrics:', err);
      setError('Failed to load AI monitoring metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm('This will mark all stuck transcripts (>2 hours) as failed. Continue?')) {
      return;
    }

    try {
      setCleaningUp(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/v1/organizations/${orgId}/ai-monitoring/cleanup`
      );
      
      alert(`Successfully cleaned up ${response.data.data.cleanedCount} stuck transcripts`);
      fetchMetrics(); // Refresh metrics
    } catch (err) {
      console.error('Error cleaning up:', err);
      alert('Failed to cleanup stuck transcripts');
    } finally {
      setCleaningUp(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [orgId]);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading AI monitoring metrics...</p>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-gray-600">{error}</p>
          <button
            onClick={fetchMetrics}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { overview, summaries, activeTranscriptions, recentCompletions, failureReasons, trends } = metrics || {};

  // Calculate health status
  const getHealthStatus = () => {
    if (!overview) return { status: 'unknown', color: 'gray', text: 'Unknown' };
    
    const successRate = overview.successRate;
    const stuckCount = overview.stuckCount;
    
    if (stuckCount > 5 || successRate < 50) {
      return { status: 'critical', color: 'red', text: 'Critical' };
    } else if (stuckCount > 2 || successRate < 80) {
      return { status: 'warning', color: 'yellow', text: 'Warning' };
    } else {
      return { status: 'healthy', color: 'green', text: 'Healthy' };
    }
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="h-8 w-8 text-blue-600" />
              AI Transcription Monitoring
            </h1>
            <p className="text-gray-600 mt-1">
              Real-time health metrics and status for AI transcription and summary generation
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {overview && overview.stuckCount > 0 && (
              <button
                onClick={handleCleanup}
                disabled={cleaningUp}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Cleanup Stuck ({overview.stuckCount})
              </button>
            )}
          </div>
        </div>

        {lastUpdated && (
          <p className="text-sm text-gray-500 mb-4">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}

        {/* Overall Health Status */}
        <div className={`mb-6 p-6 rounded-lg border-2 border-${healthStatus.color}-500 bg-${healthStatus.color}-50`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-4 w-4 rounded-full bg-${healthStatus.color}-500 animate-pulse`}></div>
              <h2 className="text-2xl font-bold text-gray-900">
                System Status: <span className={`text-${healthStatus.color}-600`}>{healthStatus.text}</span>
              </h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Success Rate (24h)</p>
              <p className="text-3xl font-bold text-gray-900">{overview?.successRate}%</p>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Transcripts */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Transcripts (30d)</p>
                <p className="text-3xl font-bold text-gray-900">{overview?.totalTranscripts || 0}</p>
              </div>
              <FileText className="h-12 w-12 text-blue-500" />
            </div>
          </div>

          {/* Completed */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-600">{overview?.completedCount || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {overview?.completed24h || 0} in last 24h
                </p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </div>

          {/* Failed */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-3xl font-bold text-red-600">{overview?.failedCount || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {overview?.failed24h || 0} in last 24h
                </p>
              </div>
              <XCircle className="h-12 w-12 text-red-500" />
            </div>
          </div>

          {/* Stuck */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stuck (>1 hour)</p>
                <p className="text-3xl font-bold text-orange-600">{overview?.stuckCount || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Currently processing
                </p>
              </div>
              <AlertTriangle className="h-12 w-12 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Avg Processing Time */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Processing Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview?.avgProcessingSeconds ? `${Math.floor(overview.avgProcessingSeconds / 60)}m ${Math.floor(overview.avgProcessingSeconds % 60)}s` : 'N/A'}
                </p>
              </div>
              <Clock className="h-10 w-10 text-purple-500" />
            </div>
          </div>

          {/* AI Summaries */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Summaries Generated</p>
                <p className="text-2xl font-bold text-gray-900">{summaries?.totalSummaries || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {summaries?.summaries24h || 0} in last 24h
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-indigo-500" />
            </div>
          </div>

          {/* Active Now */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Transcriptions</p>
                <p className="text-2xl font-bold text-gray-900">{overview?.processingCount || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Currently running
                </p>
              </div>
              <Activity className="h-10 w-10 text-blue-500 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Active Transcriptions */}
        {activeTranscriptions && activeTranscriptions.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Active Transcriptions
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activeTranscriptions.map((transcript) => (
                    <tr key={transcript.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{transcript.teamName}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {transcript.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {Math.floor(transcript.durationSeconds / 60)}m {Math.floor(transcript.durationSeconds % 60)}s
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(transcript.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Completions */}
        {recentCompletions && recentCompletions.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Completions</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Words</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">AI Summary</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Processing Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentCompletions.slice(0, 10).map((transcript) => (
                    <tr key={transcript.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{transcript.teamName}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          transcript.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transcript.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{transcript.wordCount || 0}</td>
                      <td className="px-4 py-3 text-sm">
                        {transcript.hasSummary ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {transcript.processingSeconds ? `${Math.floor(transcript.processingSeconds / 60)}m` : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {transcript.completedAt ? new Date(transcript.completedAt).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Failure Reasons */}
        {failureReasons && failureReasons.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Failure Reasons (Last 7 Days)
            </h3>
            <div className="space-y-2">
              {failureReasons.map((reason, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded">
                  <p className="text-sm text-gray-900">{reason.reason}</p>
                  <span className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-xs font-semibold">
                    {reason.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trends */}
        {trends && trends.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              7-Day Trends
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Failed</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg Words</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg Processing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {trends.map((trend, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(trend.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600 font-semibold">{trend.completed}</td>
                      <td className="px-4 py-3 text-sm text-red-600 font-semibold">{trend.failed}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{trend.avgWords}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {trend.avgProcessingSeconds ? `${Math.floor(trend.avgProcessingSeconds / 60)}m` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIMonitoringPage;
