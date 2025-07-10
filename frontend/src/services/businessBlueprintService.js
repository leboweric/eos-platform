import axios from 'axios';

const API_BASE = '/organizations/:orgId/teams/:teamId/business-blueprint';

// Helper to build URL with org and team IDs
const buildUrl = (endpoint = '') => {
  // Get org from the current auth context
  const authState = JSON.parse(localStorage.getItem('auth-store') || '{}');
  const user = authState?.state?.user;
  const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId;
  
  // For now, use a default team ID since teams aren't implemented yet
  const teamId = '00000000-0000-0000-0000-000000000000';
  
  return API_BASE.replace(':orgId', orgId).replace(':teamId', teamId) + endpoint;
};

export const businessBlueprintService = {
  // Get complete business blueprint
  getBusinessBlueprint: async () => {
    const response = await axios.get(buildUrl());
    return response.data.data;
  },

  // Core Values
  upsertCoreValue: async (coreValue) => {
    const response = await axios.post(buildUrl('/core-values'), coreValue);
    return response.data.data;
  },

  deleteCoreValue: async (valueId) => {
    await axios.delete(buildUrl(`/core-values/${valueId}`));
  },

  // Core Focus (Hedgehog)
  updateCoreFocus: async (coreFocus) => {
    const response = await axios.put(buildUrl('/core-focus'), coreFocus);
    return response.data.data;
  },

  // BHAG (Big Hairy Audacious Goal)
  updateBHAG: async (bhag) => {
    const response = await axios.put(buildUrl('/ten-year-target'), {
      targetDescription: bhag.description,
      targetYear: bhag.year,
      runningTotalDescription: bhag.runningTotal
    });
    return response.data.data;
  },

  // Marketing Strategy
  updateMarketingStrategy: async (strategy) => {
    const response = await axios.put(buildUrl('/marketing-strategy'), strategy);
    return response.data.data;
  },

  // Three Year Picture
  updateThreeYearPicture: async (picture) => {
    const response = await axios.put(buildUrl('/three-year-picture'), picture);
    return response.data.data;
  },

  // One Year Plan
  updateOneYearPlan: async (plan) => {
    const response = await axios.put(buildUrl('/one-year-plan'), plan);
    return response.data.data;
  }
};