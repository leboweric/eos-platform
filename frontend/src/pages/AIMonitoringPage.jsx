import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  Building2
} from 'lucide-react';

const AIMonitoringPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/v1/admin/ai-monitoring/health`
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
    if (!window.confirm('This will mark all stuck transcripts (>2 hours) as failed across the entire platform. Continue?')) {
      return;
    }

    try {
      setCleaningUp(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/v1/admin/ai-monitoring/cleanup`
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
  }, []);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading platform AI monitoring metrics...</p>
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

  const { overview, summaries, activeTranscriptions, recentCompletions, failureReasons, trends, organizationBreakdown, recentErrors, errorStats } = metrics || {};

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
              AI Transcription Monitoring (Platform-Wide)
            </h1>
            <p className="text-gray-600 mt-1">
              Real-time health metrics and status for AI transcription and summary generation across all organizations
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
                <p className="text-sm text-gray-600">Stuck (&gt;1 hour)</p>
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
                <p className="text-2xl font-bold text-gray-900">{summaries?.total || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {summaries?.last24h || 0} in last 24h
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

        {/* Organization Breakdown */}
        {organizationBreakdown && organizationBreakdown.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Top Organizations by Transcript Volume (Last 30 Days)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Failed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Processing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Success Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {organizationBreakdown.map((org, idx) => {
                    const successRate = org.totalTranscripts > 0 
                      ? ((org.completed / org.totalTranscripts) * 100).toFixed(1)
                      : 0;
                    return (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {org.organizationName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {org.totalTranscripts}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          {org.completed}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {org.failed}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                          {org.processing}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {successRate}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Active Transcriptions */}
        {activeTranscriptions && activeTranscriptions.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Active Transcriptions
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Started
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeTranscriptions.map((transcript) => (
                    <tr key={transcript.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transcript.organizationName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transcript.teamName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {transcript.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transcript.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Math.floor(transcript.durationSeconds / 60)}m {Math.floor(transcript.durationSeconds % 60)}s
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Recent Completions
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Processing Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      AI Summary
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentCompletions.map((transcript) => (
                    <tr key={transcript.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transcript.organizationName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transcript.teamName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          transcript.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transcript.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transcript.completedAt ? new Date(transcript.completedAt).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transcript.processingSeconds ? `${Math.floor(transcript.processingSeconds / 60)}m ${Math.floor(transcript.processingSeconds % 60)}s` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {transcript.hasSummary ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-300" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Railway Error Logs (Last 24 Hours) */}
        {recentErrors && recentErrors.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Recent Railway Errors (Last 24 Hours)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Error Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Error Message
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transcript ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentErrors.map((error) => (
                    <tr key={error.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(error.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {error.organizationName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                          {error.errorType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate" title={error.errorMessage}>
                        {error.errorMessage}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {error.transcriptId ? error.transcriptId.substring(0, 8) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Error Statistics */}
        {errorStats && errorStats.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Error Statistics (Last 24 Hours)
            </h3>
            <div className="space-y-3">
              {errorStats.map((stat, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-orange-50 rounded">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{stat.errorType}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Last: {new Date(stat.lastOccurrence).toLocaleString()}
                    </p>
                  </div>
                  <span className="ml-4 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
                    {stat.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Failure Reasons */}
        {failureReasons && failureReasons.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Failure Reasons (Last 7 Days)
            </h3>
            <div className="space-y-3">
              {failureReasons.map((reason, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded">
                  <p className="text-sm text-gray-900 flex-1">{reason.message}</p>
                  <span className="ml-4 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                    {reason.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7-Day Trends */}
        {trends && trends.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              7-Day Trends
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Failed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Processing
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trends.map((day, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(day.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {day.total}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {day.completed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {day.failed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {day.avgProcessingSeconds ? `${Math.floor(day.avgProcessingSeconds / 60)}m ${Math.floor(day.avgProcessingSeconds % 60)}s` : 'N/A'}
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
