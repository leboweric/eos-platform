import axios from './axiosConfig';

export const oauthService = {
  // Google OAuth
  googleLogin: async () => {
    try {
      // Get OAuth URL from backend
      const response = await axios.get('/auth/google');
      // Redirect to Google OAuth
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Google OAuth error:', error);
      throw error;
    }
  },

  // Microsoft OAuth
  microsoftLogin: async () => {
    try {
      // Get OAuth URL from backend
      const response = await axios.get('/auth/microsoft');
      // Redirect to Microsoft OAuth
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Microsoft OAuth error:', error);
      throw error;
    }
  },

  // Handle OAuth callback
  handleOAuthCallback: async (provider, code, state) => {
    try {
      const response = await axios.post(`/auth/${provider}/callback`, {
        code,
        state
      });
      
      // Store token and user data
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  },

  // Link existing account with OAuth provider
  linkOAuthAccount: async (provider) => {
    try {
      const response = await axios.post(`/auth/${provider}/link`);
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('OAuth link error:', error);
      throw error;
    }
  }
};