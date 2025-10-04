import { create } from 'zustand';
import axios from 'axios';
import * as Sentry from '@sentry/react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// Create a dedicated axios instance for auth to avoid conflicts
const authAxios = axios.create({
  baseURL: API_BASE_URL
});

// Add request interceptor to include auth token and impersonation header
authAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Removed impersonation header - feature no longer supported
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh
authAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry refresh requests or requests that have already been retried
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register')
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await authAxios.post('/auth/refresh', {
            refreshToken
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return authAxios(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // Only redirect if we're not already on a public page
        if (!window.location.pathname.match(/^\/(login|register|consultant-register|$)/)) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: true,
  error: null,

  /**
   * Check if the current user is on a leadership team
   * @returns {boolean} true if user is on a leadership team
   */
  isOnLeadershipTeam: () => {
    const user = get().user;
    if (!user || !user.teams) return false;
    
    return user.teams.some(team => team.is_leadership_team === true);
  },

  // Check if user is authenticated
  checkAuth: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }

      const response = await authAxios.get('/auth/profile');
      const userData = response.data.data;
      
      // Normalize organization_id field (backend sends organizationId, frontend expects organization_id)
      if (userData && userData.organizationId && !userData.organization_id) {
        userData.organization_id = userData.organizationId;
      }
      
      // Store organizationId for theme management
      const orgId = userData?.organizationId || userData?.organization_id;
      if (orgId) {
        localStorage.setItem('organizationId', orgId);
      }
      
      // Set Sentry user context for session restoration
      if (userData) {
        console.log('Full user object from checkAuth:', userData);
        const sentryUserContext = {
          id: userData.id,
          email: userData.email,
          username: userData.email, // Sentry uses username for display
          organization_id: orgId
        };
        console.log('Setting Sentry user context in checkAuth:', sentryUserContext);
        Sentry.setUser(sentryUserContext);
      }
      
      set({ user: userData, isLoading: false, error: null });
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, isLoading: false, error: null });
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await authAxios.post('/auth/login', {
        email,
        password
      });

      const { user, accessToken, refreshToken } = response.data.data;
      
      // Normalize organization_id field (backend sends organizationId, frontend expects organization_id)
      if (user && user.organizationId && !user.organization_id) {
        user.organization_id = user.organizationId;
      }
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      // Store organizationId for theme management
      const orgId = user?.organizationId || user?.organization_id;
      if (orgId) {
        localStorage.setItem('organizationId', orgId);
        console.log('Stored organizationId:', orgId);
      } else {
        console.error('No organizationId found in user object:', user);
      }
      
      // Set Sentry user context
      console.log('Full user object from login:', user);
      const sentryUserContext = {
        id: user.id,
        email: user.email,
        username: user.email, // Sentry uses username for display
        organization_id: orgId
      };
      console.log('Setting Sentry user context in login:', sentryUserContext);
      Sentry.setUser(sentryUserContext);
      
      set({ user, isLoading: false, error: null });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Register user
  register: async (userData) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await authAxios.post('/auth/register', userData);
      
      const { user, accessToken, refreshToken } = response.data.data;
      
      // Normalize organization_id field (backend sends organizationId, frontend expects organization_id)
      if (user && user.organizationId && !user.organization_id) {
        user.organization_id = user.organizationId;
      }
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      // Store organizationId for theme management
      const orgId = user?.organizationId || user?.organization_id;
      if (orgId) {
        localStorage.setItem('organizationId', orgId);
        console.log('Stored organizationId:', orgId);
      } else {
        console.error('No organizationId found in user object:', user);
      }
      
      // Set Sentry user context
      console.log('Full user object from registration:', user);
      const sentryUserContext = {
        id: user.id,
        email: user.email,
        username: user.email, // Sentry uses username for display
        organization_id: orgId
      };
      console.log('Setting Sentry user context in registration:', sentryUserContext);
      Sentry.setUser(sentryUserContext);
      
      set({ user, isLoading: false, error: null });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Logout user
  logout: async () => {
    try {
      await authAxios.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('organizationId');
      // Clear all org-specific themes
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('orgTheme_')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear Sentry user context
      Sentry.setUser(null);
      
      set({ user: null, isLoading: false, error: null });
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await authAxios.put('/auth/profile', profileData);
      
      set({ 
        user: { ...get().user, ...response.data.data }, 
        isLoading: false, 
        error: null 
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Profile update failed';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Switch to client organization (for consultants)
  switchToClientOrganization: (organizationId, organizationName) => {
    const currentUser = get().user;
    if (currentUser) {
      // Update organizationId in localStorage for theme management
      localStorage.setItem('organizationId', organizationId);
      
      // Clear any cached theme for the previous organization
      const previousOrgId = currentUser.organizationId || currentUser.organization_id;
      if (previousOrgId) {
        // Optional: You might want to keep the previous org's theme
        // localStorage.removeItem(`orgTheme_${previousOrgId}`);
      }
      
      set({
        user: {
          ...currentUser,
          organizationId,
          organizationName,
          isImpersonating: true,
          originalOrganizationId: currentUser.organizationId
        }
      });
      
      // Dispatch theme change event to trigger theme refresh in components
      window.dispatchEvent(new CustomEvent('organizationChanged', { detail: { organizationId } }));
    }
  },

  // Check if user has accepted legal agreements
  checkLegalAgreements: async () => {
    try {
      const response = await authAxios.get('/auth/check-agreements');
      return response.data;
    } catch (error) {
      console.error('Failed to check legal agreements:', error);
      return { success: false, needsAcceptance: true };
    }
  },

  // Accept legal agreements for existing users
  acceptLegalAgreements: async (agreementData) => {
    try {
      const response = await authAxios.post('/auth/accept-agreements', agreementData);
      return response.data;
    } catch (error) {
      console.error('Failed to accept legal agreements:', error);
      throw error;
    }
  }
}));

