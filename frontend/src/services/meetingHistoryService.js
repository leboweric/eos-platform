import api from './axiosConfig';

const getOrgId = () => {
  const authStore = JSON.parse(localStorage.getItem('auth-store') || '{}');
  return authStore?.state?.currentOrganization?.id;
};

export const getMeetingHistory = async (params = {}) => {
  const orgId = getOrgId();
  if (!orgId) {
    throw new Error('No organization selected');
  }
  
  const response = await api.get(`/organizations/${orgId}/meeting-history`, { params });
  return response.data;
};

export const getMeetingDetail = async (id) => {
  const orgId = getOrgId();
  if (!orgId) {
    throw new Error('No organization selected');
  }
  
  const response = await api.get(`/organizations/${orgId}/meeting-history/${id}`);
  return response.data;
};

export const createMeetingSnapshot = async (meetingId) => {
  const orgId = getOrgId();
  if (!orgId) {
    throw new Error('No organization selected');
  }
  
  const response = await api.post(`/organizations/${orgId}/meeting-history/${meetingId}/snapshot`);
  return response.data;
};

export const updateMeetingNotes = async (id, notes) => {
  const orgId = getOrgId();
  if (!orgId) {
    throw new Error('No organization selected');
  }
  
  const response = await api.put(`/organizations/${orgId}/meeting-history/${id}/notes`, { notes });
  return response.data;
};

export const exportMeetingHistoryCSV = (params = {}) => {
  const orgId = getOrgId();
  if (!orgId) {
    throw new Error('No organization selected');
  }
  
  const queryString = new URLSearchParams(params).toString();
  window.open(`${api.defaults.baseURL}/organizations/${orgId}/meeting-history/export/csv?${queryString}`, '_blank');
};

export default {
  getMeetingHistory,
  getMeetingDetail,
  createMeetingSnapshot,
  updateMeetingNotes,
  exportMeetingHistoryCSV
};