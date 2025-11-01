import axios from './axiosConfig';

const API_BASE = '/admin/isolation';

export const dataIsolationService = {
  // Get isolation health overview
  async getIsolationHealth() {
    const response = await axios.get(`${API_BASE}/health`);
    return response.data;
  },

  // Get violations with filters
  async getViolations(filters = {}) {
    const params = new URLSearchParams();
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.violation_type) params.append('violation_type', filters.violation_type);
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.resolved !== undefined) params.append('resolved', filters.resolved);
    if (filters.table_name) params.append('table_name', filters.table_name);

    const response = await axios.get(`${API_BASE}/violations?${params}`);
    return response.data;
  },

  // Get violations by table
  async getViolationsByTable() {
    const response = await axios.get(`${API_BASE}/violations/by-table`);
    return response.data;
  },

  // Get violations by organization
  async getViolationsByOrganization() {
    const response = await axios.get(`${API_BASE}/violations/by-org`);
    return response.data;
  },

  // Get data distribution
  async getDataDistribution() {
    const response = await axios.get(`${API_BASE}/distribution`);
    return response.data;
  },

  // Get check history
  async getCheckHistory(limit = 20) {
    const response = await axios.get(`${API_BASE}/history?limit=${limit}`);
    return response.data;
  },

  // Get multi-tenant tables
  async getMultiTenantTables() {
    const response = await axios.get(`${API_BASE}/tables`);
    return response.data;
  },

  // Run all checks
  async runAllChecks() {
    const response = await axios.post(`${API_BASE}/check`);
    return response.data;
  },

  // Run specific check
  async runSpecificCheck(checkType, tableName = null) {
    const endpoint = checkType === 'orphaned' ? 'check/orphaned' : 'check/missing-org';
    const params = tableName ? `?table=${tableName}` : '';
    const response = await axios.get(`${API_BASE}/${endpoint}${params}`);
    return response.data;
  },

  // Resolve violation
  async resolveViolation(violationId, notes) {
    const response = await axios.post(`${API_BASE}/violations/${violationId}/resolve`, {
      notes
    });
    return response.data;
  }
};

export default dataIsolationService;