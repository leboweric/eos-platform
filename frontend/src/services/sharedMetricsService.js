import axios from '../axiosSetup';

// Get all shared metrics in the organization
export const getSharedMetrics = async (orgId, teamId = null) => {
  try {
    const params = teamId ? { teamId } : {};
    const response = await axios.get(`/organizations/${orgId}/shared-metrics`, { params });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching shared metrics:', error);
    throw error;
  }
};

// Share a metric
export const shareMetric = async (orgId, teamId, metricId, shareData) => {
  try {
    const response = await axios.post(
      `/organizations/${orgId}/teams/${teamId}/scorecard/metrics/${metricId}/share`,
      shareData
    );
    return response.data;
  } catch (error) {
    console.error('Error sharing metric:', error);
    throw error;
  }
};

// Unshare a metric
export const unshareMetric = async (orgId, teamId, metricId) => {
  try {
    const response = await axios.delete(
      `/organizations/${orgId}/teams/${teamId}/scorecard/metrics/${metricId}/share`
    );
    return response.data;
  } catch (error) {
    console.error('Error unsharing metric:', error);
    throw error;
  }
};

// Subscribe to a shared metric
export const subscribeToMetric = async (orgId, teamId, subscriptionData) => {
  try {
    const response = await axios.post(
      `/organizations/${orgId}/teams/${teamId}/metric-subscriptions`,
      subscriptionData
    );
    return response.data;
  } catch (error) {
    console.error('Error subscribing to metric:', error);
    throw error;
  }
};

// Unsubscribe from a shared metric
export const unsubscribeFromMetric = async (orgId, teamId, subscriptionId) => {
  try {
    const response = await axios.delete(
      `/organizations/${orgId}/teams/${teamId}/metric-subscriptions/${subscriptionId}`
    );
    return response.data;
  } catch (error) {
    console.error('Error unsubscribing from metric:', error);
    throw error;
  }
};

// Get team's metric subscriptions
export const getTeamSubscriptions = async (orgId, teamId) => {
  try {
    const response = await axios.get(
      `/organizations/${orgId}/teams/${teamId}/metric-subscriptions`
    );
    return response.data.data;
  } catch (error) {
    console.error('Error fetching team subscriptions:', error);
    throw error;
  }
};

// Sync scores from source to subscribed metrics
export const syncMetricScores = async (orgId, metricId, fromDate = null, toDate = null) => {
  try {
    const params = {};
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;
    
    const response = await axios.post(
      `/organizations/${orgId}/shared-metrics/${metricId}/sync`,
      {},
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('Error syncing metric scores:', error);
    throw error;
  }
};

const sharedMetricsService = {
  getSharedMetrics,
  shareMetric,
  unshareMetric,
  subscribeToMetric,
  unsubscribeFromMetric,
  getTeamSubscriptions,
  syncMetricScores
};

export default sharedMetricsService;