import React, { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, RefreshCw, CheckCircle, XCircle, 
  Database, Server, Clock, TrendingDown, Play, AlertCircle 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import dataIsolationService from '../../services/dataIsolationService';

const DataIsolationDashboard = () => {
  const [health, setHealth] = useState(null);
  const [violations, setViolations] = useState([]);
  const [violationsByTable, setViolationsByTable] = useState([]);
  const [violationsByOrg, setViolationsByOrg] = useState([]);
  const [checkHistory, setCheckHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    resolved: false,
    severity: '',
    violation_type: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [healthResponse, violationsResponse, tableResponse, orgResponse, historyResponse] = await Promise.all([
        dataIsolationService.getIsolationHealth(),
        dataIsolationService.getViolations({ resolved: filters.resolved, limit: 50 }),
        dataIsolationService.getViolationsByTable(),
        dataIsolationService.getViolationsByOrganization(),
        dataIsolationService.getCheckHistory(10)
      ]);

      setHealth(healthResponse.data || healthResponse);
      setViolations(violationsResponse.data || violationsResponse);
      setViolationsByTable(tableResponse.data || tableResponse);
      setViolationsByOrg(orgResponse.data || orgResponse);
      setCheckHistory(historyResponse.data || historyResponse);
    } catch (error) {
      console.error('Failed to fetch isolation data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.resolved]);

  const handleRunChecks = async () => {
    try {
      setRunningCheck(true);
      await dataIsolationService.runAllChecks();
      await fetchData();
      alert('Isolation checks completed successfully!');
    } catch (error) {
      console.error('Failed to run checks:', error);
      alert('Failed to run isolation checks');
    } finally {
      setRunningCheck(false);
    }
  };

  const handleResolveViolation = async (violationId, notes) => {
    try {
      await dataIsolationService.resolveViolation(violationId, notes);
      setResolveDialogOpen(false);
      setSelectedViolation(null);
      await fetchData();
    } catch (error) {
      console.error('Failed to resolve violation:', error);
      alert('Failed to resolve violation');
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getHealthStatus = () => {
    if (!health) return { status: 'unknown', color: 'text-gray-600', icon: Server };
    
    if (health.critical_violations > 0) {
      return { status: 'CRITICAL', color: 'text-red-600', icon: XCircle };
    }
    if (health.high_violations > 0) {
      return { status: 'WARNING', color: 'text-orange-600', icon: AlertTriangle };
    }
    if (health.unresolved_violations > 0) {
      return { status: 'DEGRADED', color: 'text-yellow-600', icon: AlertTriangle };
    }
    return { status: 'SECURE', color: 'text-green-600', icon: CheckCircle };
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#10b981'];

  if (loading && !health) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-600">Loading isolation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-500" />
                Data Isolation Monitor
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Multi-tenant security and data isolation monitoring
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleRunChecks}
                disabled={runningCheck}
                className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
              >
                <Play className={`w-4 h-4 ${runningCheck ? 'animate-spin' : ''}`} />
                {runningCheck ? 'Running Checks...' : 'Run Security Checks'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Health Status Banner */}
        <div className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border-2 ${
          healthStatus.status === 'CRITICAL' ? 'border-red-500 bg-red-50/50' :
          healthStatus.status === 'WARNING' ? 'border-orange-500 bg-orange-50/50' :
          healthStatus.status === 'DEGRADED' ? 'border-yellow-500 bg-yellow-50/50' :
          'border-green-500 bg-green-50/50'
        }`}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <HealthIcon className={`w-12 h-12 ${healthStatus.color}`} />
                <div>
                  <h2 className={`text-2xl font-bold ${healthStatus.color}`}>
                    Isolation Status: {healthStatus.status}
                  </h2>
                  <p className="text-gray-700">
                    {health?.unresolved_violations === 0 
                      ? 'All data properly isolated. No security violations detected.'
                      : `${health?.unresolved_violations} unresolved violation(s) require attention.`
                    }
                  </p>
                </div>
              </div>
              {health?.last_violation_at && (
                <div className="text-right text-sm text-gray-600">
                  <p>Last violation detected:</p>
                  <p className="font-semibold">
                    {new Date(health.last_violation_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Violations</h3>
              <Database className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{health?.total_violations || 0}</p>
            <p className="text-xs text-gray-500 mt-1">
              {health?.unresolved_violations || 0} unresolved
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Critical Issues</h3>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-red-600">
              {health?.critical_violations || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Require immediate action</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">High Priority</h3>
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-orange-600">
              {health?.high_violations || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Needs attention soon</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Last 24 Hours</h3>
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{health?.violations_last_24h || 0}</p>
            <p className="text-xs text-gray-500 mt-1">
              {health?.violations_last_7d || 0} in last 7 days
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Violations by Table */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Violations by Table</h3>
            {violationsByTable.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={violationsByTable.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="table_name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total_violations" name="Total" fill="#3b82f6" />
                  <Bar dataKey="unresolved" name="Unresolved" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No violations by table data available
              </div>
            )}
          </div>

          {/* Violations by Severity */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Violations by Severity</h3>
            {(health?.critical_violations || health?.high_violations || health?.medium_violations || health?.low_violations) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Critical', value: parseInt(health?.critical_violations) || 0 },
                      { name: 'High', value: parseInt(health?.high_violations) || 0 },
                      { name: 'Medium', value: parseInt(health?.medium_violations) || 0 },
                      { name: 'Low', value: parseInt(health?.low_violations) || 0 }
                    ].filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No violations to display
              </div>
            )}
          </div>
        </div>

        {/* Violations Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Violations</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({...filters, resolved: false})}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    !filters.resolved 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Unresolved
                </button>
                <button
                  onClick={() => setFilters({...filters, resolved: true})}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    filters.resolved 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Resolved
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-sm font-medium text-gray-700">Severity</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-700">Type</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-700">Table</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-700">Description</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-700">Detected</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                        <p className="font-semibold">No violations found!</p>
                        <p className="text-sm">Data isolation is secure.</p>
                      </td>
                    </tr>
                  ) : (
                    violations.map((violation) => (
                      <tr key={violation.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(violation.severity)}`}>
                            {violation.severity}
                          </span>
                        </td>
                        <td className="p-2 text-sm">{violation.violation_type}</td>
                        <td className="p-2 text-sm font-mono">{violation.table_name}</td>
                        <td className="p-2 text-sm">{violation.description}</td>
                        <td className="p-2 text-sm">
                          {new Date(violation.detected_at).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          {violation.resolved ? (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                              Resolved
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                              Open
                            </span>
                          )}
                        </td>
                        <td className="p-2">
                          {!violation.resolved && (
                            <button
                              onClick={() => {
                                setSelectedViolation(violation);
                                setResolveDialogOpen(true);
                              }}
                              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
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
            </div>
          </div>
        </div>

        {/* Check History */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Security Checks</h3>
            <div className="space-y-2">
              {checkHistory.length > 0 ? (
                checkHistory.map((check) => (
                  <div key={check.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{check.check_type}</p>
                      <p className="text-sm text-gray-600">
                        {check.table_name || 'All tables'} • {check.records_checked} records checked
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${check.violations_found > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {check.violations_found} violations
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(check.performed_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">No check history available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resolve Violation Dialog */}
      {resolveDialogOpen && selectedViolation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Resolve Violation</h3>
            <p className="text-sm text-gray-600 mb-4">
              Mark this violation as resolved and add resolution notes.
            </p>
            <div className="space-y-4">
              <div>
                <p className="font-semibold">Violation Details:</p>
                <p className="text-sm text-gray-600">{selectedViolation.description}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Resolution Notes</label>
                <textarea
                  className="w-full border rounded p-2"
                  rows="4"
                  placeholder="Describe how this violation was resolved..."
                  id="resolution-notes"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setResolveDialogOpen(false);
                    setSelectedViolation(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const notes = document.getElementById('resolution-notes').value;
                    handleResolveViolation(selectedViolation.id, notes);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Mark as Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataIsolationDashboard;