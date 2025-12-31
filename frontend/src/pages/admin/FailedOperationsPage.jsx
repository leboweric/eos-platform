import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Mail,
  CreditCard,
  Shield,
  HardDrive,
  Wifi,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  AlertCircle,
  Calendar,
  BarChart3,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { adminService } from '../../services/adminService';

const FailedOperationsPage = () => {
  const navigate = useNavigate();
  const [failures, setFailures] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [dailySummary, setDailySummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFailures, setSelectedFailures] = useState(new Set());
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'list'
  
  // Filters
  const [filters, setFilters] = useState({
    operation_type: '',
    severity: '',
    resolved: 'false',
    limit: 50,
    offset: 0,
    start_date: '',
    end_date: ''
  });

  // Get icon for operation type
  const getOperationIcon = (type) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'stripe':
        return <CreditCard className="w-4 h-4" />;
      case 'oauth':
        return <Shield className="w-4 h-4" />;
      case 'file':
        return <HardDrive className="w-4 h-4" />;
      case 'socket':
        return <Wifi className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'error':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Fetch failures
  const fetchFailures = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminService.getFailedOperations(filters);
      
      if (response.success) {
        setFailures(response.data);
      }
    } catch (error) {
      console.error('Error fetching failures:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await adminService.getFailureStatistics();
      
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  }, []);

  // Fetch daily summary
  const fetchDailySummary = useCallback(async () => {
    try {
      const response = await adminService.getDailySummary(30);
      
      if (response.success) {
        setDailySummary(response.data.dailySummary || []);
      }
    } catch (error) {
      console.error('Error fetching daily summary:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchFailures();
    fetchStatistics();
    fetchDailySummary();
  }, [fetchFailures, fetchStatistics, fetchDailySummary]);

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0 // Reset pagination on filter change
    }));
  };

  // Handle date click - filter to that day
  const handleDateClick = (date) => {
    const dateStr = new Date(date).toISOString().split('T')[0];
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];
    
    setSelectedDate(dateStr);
    setFilters(prev => ({
      ...prev,
      start_date: dateStr,
      end_date: nextDayStr,
      offset: 0
    }));
    setViewMode('list');
  };

  // Clear date filter
  const clearDateFilter = () => {
    setSelectedDate(null);
    setFilters(prev => ({
      ...prev,
      start_date: '',
      end_date: '',
      offset: 0
    }));
  };

  // Handle resolve single
  const handleResolve = async (id) => {
    try {
      const response = await adminService.resolveFailure(id);
      
      if (response.success) {
        // Refresh data
        fetchFailures();
        fetchStatistics();
        fetchDailySummary();
      }
    } catch (error) {
      console.error('Error resolving failure:', error);
    }
  };

  // Handle bulk resolve
  const handleBulkResolve = async () => {
    if (selectedFailures.size === 0) return;
    
    try {
      const response = await adminService.bulkResolveFailures(Array.from(selectedFailures));
      
      if (response.success) {
        setSelectedFailures(new Set());
        fetchFailures();
        fetchStatistics();
        fetchDailySummary();
      }
    } catch (error) {
      console.error('Error bulk resolving failures:', error);
    }
  };

  // Toggle selection
  const toggleSelection = (id) => {
    const newSelected = new Set(selectedFailures);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedFailures(newSelected);
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  // Format date short
  const formatDateShort = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
      }
    }
    
    return 'just now';
  };

  // Calculate max for chart scaling
  const maxDailyCount = Math.max(...dailySummary.map(d => parseInt(d.total_count) || 0), 1);

  // Calculate trend
  const getTrend = () => {
    if (dailySummary.length < 2) return null;
    const today = parseInt(dailySummary[0]?.total_count) || 0;
    const yesterday = parseInt(dailySummary[1]?.total_count) || 0;
    if (yesterday === 0) return today > 0 ? 'up' : 'same';
    const change = ((today - yesterday) / yesterday) * 100;
    if (change > 10) return 'up';
    if (change < -10) return 'down';
    return 'same';
  };

  const trend = getTrend();

  if (loading && !failures.length && !dailySummary.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-600">Loading failed operations...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Failed Operations</h1>
              <p className="text-sm text-gray-600 mt-1">
                Monitor and resolve system failures
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/system-health')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => {
                  fetchFailures();
                  fetchStatistics();
                  fetchDailySummary();
                }}
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

      {/* Daily Summary Chart */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Errors by Day (Last 30 Days)</h2>
              {trend && (
                <span className={`flex items-center gap-1 text-sm ${
                  trend === 'up' ? 'text-red-600' : trend === 'down' ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : 
                   trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
                  {trend === 'up' ? 'Increasing' : trend === 'down' ? 'Decreasing' : 'Stable'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1 text-sm rounded ${viewMode === 'daily' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Daily View
              </button>
              <button
                onClick={() => { setViewMode('list'); clearDateFilter(); }}
                className={`px-3 py-1 text-sm rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                List View
              </button>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="flex items-end gap-1 h-40 mt-4 overflow-x-auto pb-2">
            {dailySummary.slice().reverse().map((day, index) => {
              const total = parseInt(day.total_count) || 0;
              const critical = parseInt(day.critical_count) || 0;
              const error = parseInt(day.error_count) || 0;
              const warning = parseInt(day.warning_count) || 0;
              const height = (total / maxDailyCount) * 100;
              const isSelected = selectedDate === day.date;
              
              return (
                <div 
                  key={day.date} 
                  className="flex flex-col items-center min-w-[40px] cursor-pointer group"
                  onClick={() => handleDateClick(day.date)}
                >
                  <div className="relative w-8 flex flex-col justify-end" style={{ height: '120px' }}>
                    {/* Stacked bar */}
                    <div 
                      className={`w-full rounded-t transition-all ${isSelected ? 'ring-2 ring-blue-500' : 'group-hover:opacity-80'}`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    >
                      {critical > 0 && (
                        <div 
                          className="w-full bg-red-500 rounded-t"
                          style={{ height: `${(critical / total) * 100}%` }}
                        />
                      )}
                      {error > 0 && (
                        <div 
                          className="w-full bg-orange-500"
                          style={{ height: `${(error / total) * 100}%` }}
                        />
                      )}
                      {warning > 0 && (
                        <div 
                          className="w-full bg-yellow-400"
                          style={{ height: `${(warning / total) * 100}%` }}
                        />
                      )}
                      {total === 0 && (
                        <div className="w-full bg-gray-200 rounded-t h-1" />
                      )}
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                      <div className="font-medium">{formatDateShort(day.date)}</div>
                      <div>Total: {total}</div>
                      {critical > 0 && <div className="text-red-300">Critical: {critical}</div>}
                      {error > 0 && <div className="text-orange-300">Error: {error}</div>}
                      {warning > 0 && <div className="text-yellow-300">Warning: {warning}</div>}
                    </div>
                  </div>
                  <span className={`text-xs mt-1 ${isSelected ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                    {formatDateShort(day.date)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-sm text-gray-600">Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded" />
              <span className="text-sm text-gray-600">Error</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400 rounded" />
              <span className="text-sm text-gray-600">Warning</span>
            </div>
            <span className="text-sm text-gray-500 ml-auto">Click a bar to view details for that day</span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total (24h)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.statistics?.total_failures || 0}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Unresolved</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {statistics.statistics?.unresolved_count || 0}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Critical</p>
                  <p className="text-2xl font-bold text-red-600">
                    {statistics.statistics?.critical_count || 0}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Email Failures</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.statistics?.email_failures || 0}
                  </p>
                </div>
                <Mail className="w-8 h-8 text-gray-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Payment Failures</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.statistics?.stripe_failures || 0}
                  </p>
                </div>
                <CreditCard className="w-8 h-8 text-gray-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>

            {selectedDate && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm">
                <Calendar className="w-4 h-4" />
                <span>{formatDateShort(selectedDate)}</span>
                <button 
                  onClick={clearDateFilter}
                  className="ml-1 hover:text-blue-900"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}

            <select
              value={filters.operation_type}
              onChange={(e) => handleFilterChange('operation_type', e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Types</option>
              <option value="email">Email</option>
              <option value="stripe">Stripe</option>
              <option value="oauth">OAuth</option>
              <option value="file">File</option>
              <option value="socket">WebSocket</option>
            </select>

            <select
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
            </select>

            <select
              value={filters.resolved}
              onChange={(e) => handleFilterChange('resolved', e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="false">Unresolved</option>
              <option value="true">Resolved</option>
              <option value="">All</option>
            </select>

            {selectedFailures.size > 0 && (
              <button
                onClick={handleBulkResolve}
                className="ml-auto px-4 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600"
              >
                Resolve {selectedFailures.size} Selected
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Failures Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedFailures.size === failures.length && failures.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFailures(new Set(failures.map(f => f.id)));
                      } else {
                        setSelectedFailures(new Set());
                      }
                    }}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Error
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {failures.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    {selectedDate ? `No failures found for ${formatDateShort(selectedDate)}` : 'No failures found'}
                  </td>
                </tr>
              ) : (
                failures.map((failure) => (
                  <tr key={failure.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedFailures.has(failure.id)}
                        onChange={() => toggleSelection(failure.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getOperationIcon(failure.operation_type)}
                        <span className="text-sm text-gray-900 capitalize">
                          {failure.operation_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(failure.severity)}`}>
                        {failure.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">
                        {failure.operation_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-900 truncate">
                          {failure.error_message}
                        </p>
                        {failure.context && (
                          <details className="mt-1">
                            <summary className="text-xs text-gray-500 cursor-pointer">
                              View details
                            </summary>
                            <pre className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded overflow-auto max-h-32">
                              {JSON.stringify(failure.context, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <p className="text-gray-900">
                          {failure.organization_name || '-'}
                        </p>
                        {failure.user_name && (
                          <p className="text-xs text-gray-500">
                            {failure.user_name}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <p className="text-gray-900" title={formatDate(failure.created_at)}>
                          {formatTimeAgo(failure.created_at)}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {failure.resolved_at ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs">Resolved</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleResolve(failure.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {failures.length === filters.limit && (
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleFilterChange('offset', Math.max(0, filters.offset - filters.limit))}
                  disabled={filters.offset === 0}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Showing {filters.offset + 1} - {filters.offset + failures.length}
                </span>
                <button
                  onClick={() => handleFilterChange('offset', filters.offset + filters.limit)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FailedOperationsPage;
