import { useEffect, useRef } from 'react';
import axios from '../services/axiosConfig';

// Custom hook for managing token refresh during meetings
export const useTokenRefresh = (isActive = false, intervalMinutes = 10) => {
  const intervalRef = useRef(null);

  const refreshToken = async () => {
    const refreshTokenValue = localStorage.getItem('refreshToken');
    if (!refreshTokenValue) return;

    try {
      console.log('🔄 Background token refresh initiated...');
      const response = await axios.post('/auth/refresh', {
        refreshToken: refreshTokenValue
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      
      console.log('✅ Background token refresh successful');
    } catch (error) {
      console.error('❌ Background token refresh failed:', error);
      // Don't redirect on background refresh failure - let normal flow handle it
    }
  };

  useEffect(() => {
    if (isActive) {
      // Start periodic refresh
      intervalRef.current = setInterval(refreshToken, intervalMinutes * 60 * 1000);
      console.log(`🔄 Started background token refresh every ${intervalMinutes} minutes`);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          console.log('🛑 Stopped background token refresh');
        }
      };
    } else {
      // Stop refresh when not active
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('🛑 Stopped background token refresh (inactive)');
      }
    }
  }, [isActive, intervalMinutes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { refreshToken };
};