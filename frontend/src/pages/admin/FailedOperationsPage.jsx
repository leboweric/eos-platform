import React, { useState, useEffect, useCallback } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { adminService } from '../../services/adminService';

const FailedOperationsPage = () => {
  const navigate = useNavigate();
  const [failures, setFailures] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFailures, setSelectedFailures] = useState(new Set());
  
  // Filters
  const [filters, setFilters] = useState({
    operation_type: '',
    severity: '',
    resolved: 'false',
    limit: 50,
    offset: 0
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

  // Initial load
  useEffect(() => {
    fetchFailures();
    fetchStatistics();
  }, [fetchFailures, fetchStatistics]);

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0 // Reset pagination on filter change
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

  if (loading && !failures.length) {
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

      {/* Statistics Cards */}
      {statistics && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Failures</p>
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
                    No failures found
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