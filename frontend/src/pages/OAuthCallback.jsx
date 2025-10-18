import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Loader2 } from 'lucide-react';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, checkAuth } = useAuthStore(); // Get auth store functions

  useEffect(() => {
    const processOAuth = async () => {
      const token = searchParams.get('token');
      const provider = searchParams.get('provider');
      const error = searchParams.get('error');
      
      console.log('🔵 OAuth callback received');
      console.log('📦 Provider:', provider || 'unknown');
      console.log('🔑 Token present:', !!token);
      
      if (error) {
        console.error('❌ OAuth error:', error);
        navigate('/login?error=' + error);
        return;
      }
      
      if (token) {
        try {
          // 1. Store token in localStorage
          localStorage.setItem('token', token);
          console.log('✅ Token stored in localStorage');
          
          // 2. Decode token to get user info
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('👤 User info from token:', { 
            id: payload.id,
            email: payload.email,
            organizationId: payload.organizationId 
          });
          
          // 3. Update auth store with user data
          setUser({ 
            id: payload.id, 
            email: payload.email, 
            organization_id: payload.organizationId 
          });
          console.log('✅ Auth store updated with user');
          
          // 4. Fetch full user data from API
          await checkAuth();
          console.log('✅ Full user data fetched');
          
          // 5. Navigate to dashboard
          console.log('🔄 Redirecting to dashboard...');
          navigate('/dashboard', { replace: true });
          
        } catch (error) {
          console.error('❌ Error processing OAuth:', error);
          navigate('/login?error=auth_failed');
        }
      } else {
        console.error('❌ No token in OAuth callback');
        navigate('/login?error=no_token');
      }
    };
    
    processOAuth();
  }, [searchParams, navigate, setUser, checkAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Completing Microsoft sign in...</h2>
        <p className="text-gray-600 mt-2">Please wait while we redirect you to the dashboard.</p>
      </div>
    </div>
  );
};

export default OAuthCallback;