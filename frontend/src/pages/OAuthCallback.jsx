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
      try {
        // Validate token format (must be a JWT with 3 parts)
        const parts = token.split('.');
        if (parts.length !== 3) {
          console.error('❌ Invalid token format - not a valid JWT');
          navigate('/login?error=invalid_token');
          return;
        }
        
        // Try to decode token to validate it
        try {
          const payload = JSON.parse(atob(parts[1]));
          console.log('👤 User info from token:', { 
            id: payload.id,
            email: payload.email,
            organizationId: payload.organizationId 
          });
          
          // Validate required fields
          if (!payload.id || !payload.email) {
            console.error('❌ Token missing required fields');
            navigate('/login?error=invalid_token');
            return;
          }
        } catch (e) {
          console.error('❌ Failed to decode token:', e);
          navigate('/login?error=invalid_token');
          return;
        }
        
        // Store the access token from OAuth
        localStorage.setItem('accessToken', token);
        console.log('✅ Access token stored in localStorage');
        
        // Store organization ID if present
        try {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.organizationId) {
            localStorage.setItem('organizationId', payload.organizationId);
            console.log('✅ Organization ID stored:', payload.organizationId);
          }
        } catch (e) {
          console.log('Could not extract organization ID');
        }
        
        // Force full page reload to reinitialize auth
        console.log('🔄 Reloading to dashboard...');
        window.location.href = '/dashboard';
        
      } catch (error) {
        console.error('❌ Error processing OAuth:', error);
        navigate('/login?error=auth_failed');
      }
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