import api from './axiosConfig';

const getOrgId = () => {
  const authStore = JSON.parse(localStorage.getItem('auth-store') || '{}');
  return authStore?.state?.currentOrganization?.id;
};

export const getMeetingHistory = async (params = {}) => {
  console.log('📡 === meetingHistoryService.getMeetingHistory CALLED ===');
  console.log('📡 Input params:', params);
  
  const orgId = getOrgId();
  console.log('📡 Retrieved orgId from localStorage:', orgId);
  
  if (!orgId) {
    console.error('📡 ❌ NO ORGANIZATION ID FOUND');
    throw new Error('No organization selected');
  }
  
  const url = `/organizations/${orgId}/meeting-history`;
  console.log('📡 Full API URL:', url);
  console.log('📡 Request params:', params);
  console.log('📡 Making API call NOW...');
  
  try {
    const response = await api.get(url, { params });
    console.log('📡 ✅ API call SUCCESS');
    console.log('📡 Response status:', response.status);
    console.log('📡 Response data:', response.data);
    return response.data;
  } catch (error) {
    console.error('📡 ❌ API call FAILED');
    console.error('📡 Error:', error);
    console.error('📡 Error response:', error.response?.data);
    console.error('📡 Error status:', error.response?.status);
    throw error;
  }
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