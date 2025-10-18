import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
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
      // JUST store the token - don't call any login API
      localStorage.setItem('token', token);
      console.log('✅ Token stored in localStorage');
      
      // Optionally decode to log user info (for debugging)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('👤 User info from token:', { 
          id: payload.id,
          email: payload.email,
          organizationId: payload.organizationId 
        });
      } catch (e) {
        console.log('Could not decode token for logging');
      }
      
      // Force a page reload to trigger auth check
      console.log('🔄 Redirecting to dashboard...');
      window.location.href = '/dashboard';
    } else {
      console.error('❌ No token in OAuth callback');
      navigate('/login?error=no_token');
    }
  }, [searchParams, navigate]);

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