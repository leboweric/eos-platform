import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  RefreshCw, 
  Activity, 
  Database, 
  Wifi, 
  ExternalLink,
  Server,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MetricCard from '../../components/admin/MetricCard';
import HealthIndicator from '../../components/admin/HealthIndicator';
import { adminService } from '../../services/adminService';

const SystemHealthDashboard = () => {
  const navigate = useNavigate();
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(30);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch health data
  const fetchHealthData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getSystemHealth();
      
      if (response.success) {
        setHealthData(response.data);
        setLastUpdated(new Date());
        setCountdown(30);
      } else {
        throw new Error(response.error || 'Failed to fetch health data');
      }
    } catch (err) {
      console.error('Error fetching health data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    fetchHealthData();
    
    // Set up auto-refresh
    const refreshInterval = setInterval(() => {
      fetchHealthData();
    }, 30000); // 30 seconds

    // Set up countdown
    const countdownInterval = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 30);
    }, 1000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(countdownInterval);
    };
  }, [fetchHealthData]);

  // Format uptime - commented out as not currently used
  // const formatUptime = (uptime) => {
  //   if (!uptime) return 'Unknown';
  //   if (typeof uptime === 'string') return uptime;
    
  //   const days = Math.floor(uptime / 86400);
  //   const hours = Math.floor((uptime % 86400) / 3600);
  //   const minutes = Math.floor((uptime % 3600) / 60);
    
  //   return `${days}d ${hours}h ${minutes}m`;
  // };

  // Format bytes - commented out as not currently used
  // const formatBytes = (bytes) => {
  //   if (!bytes) return '0 B';
  //   const sizes = ['B', 'KB', 'MB', 'GB'];
  //   const i = Math.floor(Math.log(bytes) / Math.log(1024));
  //   return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  // };

  // Get service status icon
  const getServiceIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'down':
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'unavailable':
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      case 'unknown':
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  // Prepare chart data
  const prepareChartData = () => {
    if (!healthData?.api?.slowestEndpoints) return [];
    
    return healthData.api.slowestEndpoints.slice(0, 5).map(endpoint => ({
      name: endpoint.endpoint.length > 20 
        ? endpoint.endpoint.substring(0, 20) + '...' 
        : endpoint.endpoint,
      avgTime: Math.round(endpoint.avgDuration),
      calls: endpoint.count
    }));
  };

  if (loading && !healthData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-600">Loading system health...</p>
        </div>
      </div>
    );
  }

  if (error && !healthData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchHealthData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
              <p className="text-sm text-gray-600 mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Auto-refresh in {countdown}s
              </div>
              <button
                onClick={fetchHealthData}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overall Status */}
        {healthData && (
          <div className="mb-6 flex items-center gap-4 bg-white rounded-lg shadow-md p-4">
            <HealthIndicator status={healthData.indicators?.overall} size="lg" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                System Status: {healthData.status?.toUpperCase() || 'UNKNOWN'}
              </h2>
              <p className="text-sm text-gray-600">
                All systems operational
              </p>
            </div>
          </div>
        )}

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* API Performance Card */}
          <MetricCard
            title="API Performance"
            healthStatus={healthData?.indicators?.api}
            metrics={[
              {
                label: "Requests/min",
                value: healthData?.api?.requestsPerMinute || 0,
                icon: 'Activity',
                highlight: true
              },
              {
                label: "Avg Response",
                value: `${healthData?.api?.avgResponseTime || 0}ms`,
                icon: 'Clock'
              },
              {
                label: "p95 Response",
                value: `${healthData?.api?.p95 || 0}ms`,
                icon: 'TrendingUp'
              },
              {
                label: "Error Rate",
                value: `${healthData?.api?.errorRate || 0}%`,
                icon: 'AlertTriangle',
                color: parseFloat(healthData?.api?.errorRate) > 5 ? 'text-red-600' : 'text-gray-900'
              }
            ]}
            footer={`Tracking ${healthData?.api?.totalTracked || 0} requests`}
          />

          {/* Database Health Card */}
          <MetricCard
            title="Database Health"
            healthStatus={healthData?.indicators?.database}
            metrics={[
              {
                label: "Active Connections",
                value: `${healthData?.database?.connections?.active || 0}/${healthData?.database?.connections?.max || 100}`,
                icon: 'Database',
                highlight: true
              },
              {
                label: "Connection Usage",
                value: `${healthData?.database?.connections?.percentage || 0}%`,
                icon: 'Activity'
              },
              {
                label: "Slow Queries",
                value: healthData?.database?.slowQueries?.count || 0,
                icon: 'Clock',
                color: (healthData?.database?.slowQueries?.count || 0) > 10 ? 'text-yellow-600' : 'text-gray-900'
              },
              {
                label: "DB Size",
                value: healthData?.database?.size?.formatted || 'Unknown',
                icon: 'Database'
              }
            ]}
          />

          {/* WebSocket Status Card */}
          <MetricCard
            title="WebSocket Status"
            healthStatus={healthData?.indicators?.websockets}
            metrics={[
              {
                label: "Total Connections",
                value: healthData?.websockets?.totalConnections || 0,
                icon: 'Wifi',
                highlight: true
              },
              {
                label: "Active Meetings",
                value: healthData?.websockets?.activeMeetings || 0,
                icon: 'Activity'
              },
              {
                label: "Top Org Connections",
                value: healthData?.websockets?.topOrganizations?.[0]?.count || 0,
                icon: 'TrendingUp'
              }
            ]}
            footer={healthData?.websockets?.lastUpdated ? 
              `Updated ${new Date(healthData.websockets.lastUpdated).toLocaleTimeString()}` : 
              'Not available'
            }
          />

          {/* External Services Card */}
          <MetricCard
            title="External Services"
            healthStatus={healthData?.indicators?.externalServices}
            metrics={(() => {
              const services = [
                { name: 'SendGrid', key: 'sendgrid' },
                { name: 'Stripe', key: 'stripe' },
                { name: 'AssemblyAI', key: 'assemblyai' },
                { name: 'OAuth', key: 'oauth' },
                { name: 'OpenAI', key: 'openai' }
              ];
              
              // Only show first 4 services to fit in card
              return services.slice(0, 4).map(service => ({
                label: service.name,
                value: (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      {getServiceIcon(healthData?.externalServices?.services?.[service.key]?.status)}
                      <span className="text-sm">
                        {healthData?.externalServices?.services?.[service.key]?.status || 'unknown'}
                      </span>
                    </div>
                    {healthData?.externalServices?.services?.[service.key]?.message && (
                      <span className="text-xs text-gray-500 mt-0.5 truncate" 
                            title={healthData?.externalServices?.services?.[service.key]?.message}>
                        {healthData?.externalServices?.services?.[service.key]?.message}
                      </span>
                    )}
                  </div>
                )
              }));
            })()}
            footer={
              <div className="text-xs text-gray-500">
                {healthData?.externalServices?.services?.assemblyai && (
                  <div className="flex items-center gap-2 mt-1">
                    <span>AssemblyAI:</span>
                    {getServiceIcon(healthData?.externalServices?.services?.assemblyai?.status)}
                    <span>{healthData?.externalServices?.services?.assemblyai?.status || 'unknown'}</span>
                  </div>
                )}
              </div>
            }
          />

          {/* Failed Operations Card */}
          <MetricCard
            title="Failed Operations"
            healthStatus={healthData?.failedOperations?.total > 0 ? 
              (healthData?.failedOperations?.critical > 0 ? 'down' : 'degraded') : 
              'healthy'
            }
            metrics={[
              {
                label: "Total Failures",
                value: healthData?.failedOperations?.total || 0,
                icon: 'AlertCircle',
                highlight: true,
                color: (healthData?.failedOperations?.total || 0) > 0 ? 'text-red-600' : 'text-gray-900'
              },
              {
                label: "Unresolved",
                value: healthData?.failedOperations?.unresolved || 0,
                icon: 'XCircle',
                color: (healthData?.failedOperations?.unresolved || 0) > 0 ? 'text-yellow-600' : 'text-gray-900'
              },
              {
                label: "Critical",
                value: healthData?.failedOperations?.critical || 0,
                icon: 'AlertTriangle',
                color: (healthData?.failedOperations?.critical || 0) > 0 ? 'text-red-600' : 'text-gray-900'
              },
              {
                label: "Last 24h",
                value: healthData?.failedOperations?.last24h || 0,
                icon: 'Clock'
              }
            ]}
            footer={
              <button
                onClick={() => navigate('/admin/failed-operations')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                View Details
                <ExternalLink className="w-3 h-3" />
              </button>
            }
          />

          {/* User Activity Card */}
          <MetricCard
            title="User Activity"
            healthStatus="healthy"
            metrics={[
              {
                label: "Active Users Today",
                value: healthData?.userActivity?.dau || 0,
                icon: 'Users',
                highlight: true,
                color: 'text-blue-600'
              },
              {
                label: "Weekly Active",
                value: healthData?.userActivity?.wau || 0,
                icon: 'Calendar'
              },
              {
                label: "Monthly Active",
                value: healthData?.userActivity?.mau || 0,
                icon: 'TrendingUp'
              },
              {
                label: "Avg Session",
                value: healthData?.userActivity?.avgSession ? 
                  `${Math.round(healthData.userActivity.avgSession / 60000)}m` : '0m',
                icon: 'Clock'
              }
            ]}
            footer={
              <button
                onClick={() => navigate('/admin/user-activity')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                View Activity Details
                <ExternalLink className="w-3 h-3" />
              </button>
            }
          />

          {/* Data Isolation Card */}
          <MetricCard
            title="Data Isolation"
            healthStatus={healthData?.dataIsolation?.critical_violations > 0 ? 'down' : 
                        healthData?.dataIsolation?.high_violations > 0 ? 'degraded' : 'healthy'}
            metrics={[
              {
                label: "Total Violations",
                value: healthData?.dataIsolation?.total_violations || 0,
                icon: 'Shield',
                highlight: true,
                color: healthData?.dataIsolation?.total_violations > 0 ? 'text-red-600' : 'text-green-600'
              },
              {
                label: "Critical",
                value: healthData?.dataIsolation?.critical_violations || 0,
                icon: 'XCircle',
                color: 'text-red-600'
              },
              {
                label: "Unresolved",
                value: healthData?.dataIsolation?.unresolved_violations || 0,
                icon: 'AlertTriangle',
                color: 'text-yellow-600'
              },
              {
                label: "Last Check",
                value: healthData?.dataIsolation?.last_check_at ? 
                  new Date(healthData.dataIsolation.last_check_at).toLocaleDateString() : 'Never',
                icon: 'Clock'
              }
            ]}
            footer={
              <button
                onClick={() => navigate('/admin/data-isolation')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                View Security Details
                <ExternalLink className="w-3 h-3" />
              </button>
            }
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Slowest Endpoints Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Slowest Endpoints</h3>
            {prepareChartData().length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={prepareChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgTime" fill="#3B82F6" name="Avg Time (ms)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No data available</p>
            )}
          </div>

          {/* Recent Errors */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Errors 
              <span className="text-sm text-gray-500 ml-2">
                (Excludes common 404s like favicon.ico)
              </span>
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {healthData?.api?.recentErrors?.length > 0 ? (
                healthData.api.recentErrors.map((error, idx) => (
                  <div 
                    key={idx} 
                    className="p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => {
                      alert(`Error Details:\n\n` +
                        `Method: ${error.method}\n` +
                        `Endpoint: ${error.endpoint}\n` +
                        `Status: ${error.statusCode}\n` +
                        `Duration: ${error.duration}ms\n` +
                        `Time: ${new Date(error.timestamp).toLocaleString()}\n` +
                        `Message: ${error.errorMessage || 'No message available'}\n` +
                        `Org ID: ${error.organizationId || 'N/A'}`
                      );
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1">
                        <XCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          error.statusCode >= 500 ? 'text-red-600' : 
                          error.statusCode >= 400 ? 'text-yellow-500' : 'text-gray-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                              {error.method}
                            </span>
                            <span className="text-sm text-gray-700 truncate">
                              {error.endpoint}
                            </span>
                          </div>
                          {error.errorMessage && (
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {error.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <span className={`text-sm font-semibold ${
                          error.statusCode >= 500 ? 'text-red-600' : 
                          error.statusCode >= 400 ? 'text-yellow-600' : ''
                        }`}>
                          {error.statusCode}
                        </span>
                        <div className="text-xs text-gray-500">
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent errors 🎉</p>
              )}
            </div>
          </div>
        </div>

        {/* System Resources */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Memory */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Memory Usage</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Node RSS</span>
                  <span className="font-medium">{healthData?.system?.memory?.node?.rss || 'Unknown'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Heap Used</span>
                  <span className="font-medium">{healthData?.system?.memory?.node?.heapUsed || 'Unknown'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">System Total</span>
                  <span className="font-medium">{healthData?.system?.memory?.system?.total || 'Unknown'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">System Used</span>
                  <span className="font-medium">
                    {healthData?.system?.memory?.system?.percentage || 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* CPU */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">CPU Info</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cores</span>
                  <span className="font-medium">{healthData?.system?.cpu?.cores || 'Unknown'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Load Average</span>
                  <span className="font-medium">
                    {healthData?.system?.cpu?.loadAverage?.map(l => l.toFixed(2)).join(', ') || 'Unknown'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  {healthData?.system?.cpu?.model || 'Unknown CPU'}
                </div>
              </div>
            </div>

            {/* Environment */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Environment</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Uptime</span>
                  <span className="font-medium">{healthData?.system?.uptime?.process || 'Unknown'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Node Version</span>
                  <span className="font-medium">{healthData?.system?.environment?.node || 'Unknown'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Environment</span>
                  <span className="font-medium">{healthData?.system?.environment?.env || 'Unknown'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Platform</span>
                  <span className="font-medium">
                    {healthData?.system?.environment?.platform} ({healthData?.system?.environment?.arch})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slow Queries Section */}
        {healthData?.database?.slowQueries?.slowest && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Slowest Query</h3>
            <div className="bg-gray-50 rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Duration: {healthData.database.slowQueries.slowest.duration}ms
                </span>
                <span className="text-xs text-gray-500">
                  {healthData.database.slowQueries.slowest.age} minutes ago
                </span>
              </div>
              <div className="text-sm font-mono text-gray-600 truncate">
                {healthData.database.slowQueries.slowest.query}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                From: {healthData.database.slowQueries.slowest.endpoint}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemHealthDashboard;