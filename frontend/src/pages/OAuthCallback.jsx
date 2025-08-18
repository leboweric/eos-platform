import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Loader2 } from 'lucide-react';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuthStore();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        // OAuth failed
        console.error('OAuth error:', error);
        navigate('/login?error=' + error);
        return;
      }

      if (token) {
        try {
          // Store the token
          localStorage.setItem('token', token);
          
          // Decode the token to get user info (you might want to make an API call instead)
          const payload = JSON.parse(atob(token.split('.')[1]));
          
          // Log the user in
          await login(payload.email, null, token);
          
          // Redirect to dashboard
          navigate('/dashboard');
        } catch (err) {
          console.error('Failed to process OAuth token:', err);
          navigate('/login?error=oauth_failed');
        }
      } else {
        // No token or error - something went wrong
        navigate('/login?error=oauth_failed');
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Completing sign in...</h2>
        <p className="text-gray-600 mt-2">Please wait while we log you in.</p>
      </div>
    </div>
  );
};

export default OAuthCallback;