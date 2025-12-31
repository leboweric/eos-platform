import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  RefreshCw, 
  Search, 
  AlertCircle, 
  AlertTriangle,
  Info,
  Clock,
  Filter,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { adminService } from '../../services/adminService';

const RailwayLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState({});
  const [activeTab, setActiveTab] = useState('summary');
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [logsRes, summaryRes, errorsRes] = await Promise.all([
        adminService.getRailwayLogs({ limit: 200 }),
        adminService.getRailwayLogsSummary(7),
        adminService.getRailwayErrors(50)
      ]);

      setLogs(logsRes.logs || []);
      setSummary(summaryRes.summary || []);
      setErrors(errorsRes.errors || []);
    } catch (err) {
      console.error('Error fetching Railway logs:', err);
      setError(err.message || 'Failed to fetch Railway logs. Make sure RAILWAY_API_TOKEN is configured.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setLoading(true);
      const res = await adminService.searchRailwayLogs(searchQuery, 100);
      setSearchResults(res.logs || []);
    } catch (err) {
      console.error('Error searching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warn':
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'warn':
      case 'warning':
        return <Badge variant="warning" className="bg-yellow-500">Warning</Badge>;
      default:
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const toggleLogExpand = (index) => {
    setExpandedLogs(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const filteredLogs = (searchResults || logs).filter(log => {
    if (selectedSeverity === 'all') return true;
    return log.severity?.toLowerCase() === selectedSeverity;
  });

  const renderLogEntry = (log, index) => {
    const isExpanded = expandedLogs[index];
    const isLongMessage = log.message?.length > 200;

    return (
      <div 
        key={index} 
        className={`p-3 border-b last:border-b-0 hover:bg-gray-50 ${
          log.severity?.toLowerCase() === 'error' ? 'bg-red-50' : ''
        }`}
      >
        <div className="flex items-start gap-3">
          {getSeverityIcon(log.severity)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getSeverityBadge(log.severity)}
              <span className="text-xs text-gray-500">
                <Clock className="h-3 w-3 inline mr-1" />
                {formatTimestamp(log.timestamp)}
              </span>
              {log.tags?.serviceName && (
                <Badge variant="outline" className="text-xs">
                  {log.tags.serviceName}
                </Badge>
              )}
            </div>
            <pre className={`text-sm font-mono whitespace-pre-wrap break-all ${
              !isExpanded && isLongMessage ? 'line-clamp-3' : ''
            }`}>
              {log.message}
            </pre>
            {isLongMessage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleLogExpand(index)}
                className="mt-1 h-6 text-xs"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show more
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <div>
                <h3 className="font-semibold">Error Loading Railway Logs</h3>
                <p className="text-sm">{error}</p>
                <p className="text-sm mt-2">
                  Make sure the <code className="bg-gray-100 px-1 rounded">RAILWAY_API_TOKEN</code> environment 
                  variable is set in your Railway backend deployment.
                </p>
              </div>
            </div>
            <Button onClick={fetchData} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Railway Logs</h1>
          <p className="text-gray-500">Real-time backend logs from Railway</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button onClick={fetchData} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Logs (7d)</p>
                <p className="text-2xl font-bold">
                  {summary.reduce((acc, day) => acc + day.total, 0).toLocaleString()}
                </p>
              </div>
              <Info className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Errors (7d)</p>
                <p className="text-2xl font-bold text-red-600">
                  {summary.reduce((acc, day) => acc + day.error, 0).toLocaleString()}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Warnings (7d)</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {summary.reduce((acc, day) => acc + day.warn, 0).toLocaleString()}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today's Errors</p>
                <p className="text-2xl font-bold text-red-600">
                  {summary[0]?.error || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-gray-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs (e.g., 'error', 'timeout', 'subscription')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              Search
            </Button>
            {searchResults && (
              <Button variant="outline" onClick={() => setSearchResults(null)}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="summary">Daily Summary</TabsTrigger>
          <TabsTrigger value="errors">
            Recent Errors
            {errors.length > 0 && (
              <Badge variant="destructive" className="ml-2">{errors.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Logs</TabsTrigger>
        </TabsList>

        {/* Daily Summary Tab */}
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Daily Log Summary</CardTitle>
              <CardDescription>Log counts by severity over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No data available</p>
              ) : (
                <div className="space-y-3">
                  {summary.map((day, index) => (
                    <div key={day.date} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-24 font-medium">{day.date}</div>
                      <div className="flex-1">
                        <div className="flex gap-1 h-6">
                          {day.error > 0 && (
                            <div 
                              className="bg-red-500 rounded"
                              style={{ width: `${Math.max((day.error / day.total) * 100, 5)}%` }}
                              title={`${day.error} errors`}
                            />
                          )}
                          {day.warn > 0 && (
                            <div 
                              className="bg-yellow-500 rounded"
                              style={{ width: `${Math.max((day.warn / day.total) * 100, 5)}%` }}
                              title={`${day.warn} warnings`}
                            />
                          )}
                          {day.info > 0 && (
                            <div 
                              className="bg-blue-500 rounded"
                              style={{ width: `${Math.max((day.info / day.total) * 100, 5)}%` }}
                              title={`${day.info} info`}
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-red-600">{day.error} errors</span>
                        <span className="text-yellow-600">{day.warn} warnings</span>
                        <span className="text-blue-600">{day.info} info</span>
                        <span className="text-gray-500">{day.total} total</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Errors Tab */}
        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
              <CardDescription>Latest error logs from the backend</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {errors.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recent errors</p>
              ) : (
                <div className="max-h-[600px] overflow-y-auto">
                  {errors.map((log, index) => renderLogEntry(log, `error-${index}`))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Logs Tab */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>
                    {searchResults ? `Search Results (${filteredLogs.length})` : 'Recent Logs'}
                  </CardTitle>
                  <CardDescription>
                    {searchResults 
                      ? `Showing results for "${searchQuery}"` 
                      : 'Latest logs from all services'
                    }
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={selectedSeverity}
                    onChange={(e) => setSelectedSeverity(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="all">All Severities</option>
                    <option value="error">Errors Only</option>
                    <option value="warn">Warnings Only</option>
                    <option value="info">Info Only</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No logs found</p>
              ) : (
                <div className="max-h-[600px] overflow-y-auto">
                  {filteredLogs.map((log, index) => renderLogEntry(log, `log-${index}`))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RailwayLogsPage;
