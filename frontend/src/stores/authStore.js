import { create } from 'zustand';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;

// Add request interceptor to include auth token and impersonation header
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add impersonation header if consultant is viewing client org
    const impersonatedOrgId = localStorage.getItem('impersonatedOrgId');
    if (impersonatedOrgId && localStorage.getItem('consultantImpersonating') === 'true') {
      config.headers['X-Impersonated-Org-Id'] = impersonatedOrgId;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh
axios.interceptors.response.use(
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
          const response = await axios.post('/api/v1/auth/refresh', {
            refreshToken
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return axios(originalRequest);
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

      const response = await axios.get('/api/v1/auth/profile');
      set({ user: response.data.data, isLoading: false, error: null });
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
      
      const response = await axios.post('/api/v1/auth/login', {
        email,
        password
      });

      const { user, accessToken, refreshToken } = response.data.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
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
      
      const response = await axios.post('/api/v1/auth/register', userData);
      
      const { user, accessToken, refreshToken } = response.data.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
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
      await axios.post('/api/v1/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, isLoading: false, error: null });
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await axios.put('/api/v1/auth/profile', profileData);
      
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
      set({
        user: {
          ...currentUser,
          organizationId,
          organizationName,
          isImpersonating: true,
          originalOrganizationId: currentUser.organizationId
        }
      });
    }
  }
}));

