import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { initTokenRefresh } from '../utils/tokenRefresh';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [statusMessage, setStatusMessage] = useState('Completing sign in...');
  useEffect(() => {
    const exchangeCode = searchParams.get('code');
    const provider = searchParams.get('provider') || 'oauth';
    const error = searchParams.get('error');
    const legacyToken = searchParams.get('token');
    const legacyRefreshToken = searchParams.get('refreshToken');

    const completeLogin = async () => {
      if (error) {
        console.error('OAuth error:', error);
        navigate('/login?error=' + error);
        return;
      }

      // Legacy flow: direct tokens in URL (backward compat until fully deployed)
      if (legacyToken && !exchangeCode) {
        localStorage.setItem('accessToken', legacyToken);
        if (legacyRefreshToken) {
          localStorage.setItem('refreshToken', legacyRefreshToken);
        }
        window.location.href = '/dashboard';
        return;
      }

      if (!exchangeCode) {
        navigate('/login?error=no_code');
        return;
      }

      try {
        setStatusMessage(`Completing ${provider} sign in...`);
        const response = await axios.post(`${API_BASE_URL}/auth/exchange`, { code: exchangeCode });

        if (!response.data?.success) {
          throw new Error(response.data?.error || 'Exchange failed');
        }

        const { user, accessToken, refreshToken } = response.data.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        const orgId = user?.organizationId || user?.organization_id;
        if (orgId) {
          localStorage.setItem('organizationId', orgId);
        }

        if (user?.organizationId && !user.organization_id) {
          user.organization_id = user.organizationId;
        }

        useAuthStore.setState({ user, isLoading: false, error: null });
        initTokenRefresh();

        window.location.href = '/dashboard';
      } catch (err) {
        console.error('OAuth exchange failed:', err);
        navigate('/login?error=auth_failed');
      }
    };

    completeLogin();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">{statusMessage}</h2>
        <p className="text-gray-600 mt-2">Please wait while we redirect you to the dashboard.</p>
      </div>
    </div>
  );
};

export default OAuthCallback;