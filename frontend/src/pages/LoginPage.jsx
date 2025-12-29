import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../stores/authStore';
import { oauthService } from '../services/oauthService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogoText } from '../components/Logo';
import { 
  Eye, 
  EyeOff, 
  ArrowRight
} from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [urlError, setUrlError] = useState(null);
  const [urlMessage, setUrlMessage] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoading, error, clearError } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema)
  });

  // Check for OAuth error messages in URL parameters
  useEffect(() => {
    const errorParam = searchParams.get('error');
    const messageParam = searchParams.get('message');
    
    if (errorParam) {
      setUrlError(errorParam);
      setUrlMessage(messageParam);
      
      // Clear URL parameters after reading them
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [searchParams]);

  const onSubmit = async (data) => {
    clearError();
    setUrlError(null);
    setUrlMessage(null);
    const result = await login(data.email, data.password);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-[45%] flex flex-col bg-white">
        {/* Logo at top */}
        <div className="p-8 lg:p-12">
          <Link to="/" className="inline-block">
            <LogoText useThemeColors={false} height="h-14" />
          </Link>
        </div>

        {/* Form centered in remaining space */}
        <div className="flex-1 flex items-center justify-center px-8 lg:px-16 pb-12">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Log In</h1>
            </div>

            {/* OAuth Error Alert from URL Parameters */}
            {urlError && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>
                  {urlError === 'user_not_found' && (
                    <div>
                      <p className="font-semibold mb-1">Account Not Found</p>
                      <p className="text-sm">
                        {urlMessage || 'Your account has not been created yet. Please contact your administrator to set up your AXP account.'}
                      </p>
                    </div>
                  )}
                  {urlError === 'oauth_failed' && (
                    <div>
                      <p className="font-semibold mb-1">Authentication Failed</p>
                      <p className="text-sm">There was a problem with Microsoft authentication. Please try again.</p>
                    </div>
                  )}
                  {urlError === 'invalid_token' && (
                    <div>
                      <p className="font-semibold mb-1">Invalid Authentication</p>
                      <p className="text-sm">The authentication token was invalid. Please try signing in again.</p>
                    </div>
                  )}
                  {urlError === 'no_token' && (
                    <div>
                      <p className="font-semibold mb-1">Authentication Incomplete</p>
                      <p className="text-sm">The authentication process did not complete. Please try again.</p>
                    </div>
                  )}
                  {urlError === 'invalid_user' && (
                    <div>
                      <p className="font-semibold mb-1">User Account Error</p>
                      <p className="text-sm">There was a problem with your user account. Please contact support.</p>
                    </div>
                  )}
                  {urlError === 'auth_failed' && (
                    <div>
                      <p className="font-semibold mb-1">Login Failed</p>
                      <p className="text-sm">{urlMessage || 'Please try again or contact support.'}</p>
                    </div>
                  )}
                  {!['user_not_found', 'oauth_failed', 'invalid_token', 'no_token', 'invalid_user', 'auth_failed'].includes(urlError) && (
                    <div>
                      <p className="font-semibold mb-1">Authentication Error</p>
                      <p className="text-sm">{urlMessage || 'An error occurred during authentication. Please try again.'}</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Regular Error Alert */}
            {error && !urlError && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-gray-600">
                  Email*
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  {...register('email')}
                  className={`h-12 px-4 border-0 border-b-2 border-gray-200 rounded-none bg-transparent focus:border-blue-500 focus:ring-0 transition-colors ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-gray-600">
                  Password*
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    {...register('password')}
                    className={`h-12 px-4 pr-12 border-0 border-b-2 border-gray-200 rounded-none bg-transparent focus:border-blue-500 focus:ring-0 transition-colors ${errors.password ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="remember" className="ml-2 text-sm text-gray-600 cursor-pointer">
                    Remember Me
                  </Label>
                </div>
                <Link
                  to="/forgot-password"
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium uppercase tracking-wide"
                >
                  Forgot Password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-base rounded-lg transition-all uppercase tracking-wide"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </span>
                ) : (
                  'Log In'
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">OR</span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-gray-300 hover:bg-gray-50 font-medium"
                onClick={async () => {
                  try {
                    await oauthService.googleLogin();
                  } catch (error) {
                    console.error('Google login failed:', error);
                  }
                }}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Log in with Google
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-gray-300 hover:bg-gray-50 font-medium"
                onClick={async () => {
                  try {
                    await oauthService.microsoftLogin();
                  } catch (error) {
                    console.error('Microsoft login failed:', error);
                  }
                }}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#F25022" d="M11.4 11.4H1V1h10.4v10.4z"/>
                  <path fill="#7FBA00" d="M23 11.4H12.6V1H23v10.4z"/>
                  <path fill="#00A4EF" d="M11.4 23H1V12.6h10.4V23z"/>
                  <path fill="#FFB900" d="M23 23H12.6V12.6H23V23z"/>
                </svg>
                Log in with Microsoft
              </Button>
            </div>

            {/* Sign Up Link */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account yet?{' '}
                <Link to="/signup" className="text-teal-600 hover:text-teal-700 font-medium uppercase tracking-wide">
                  Sign Up
                </Link>
              </p>
            </div>

            {/* Terms */}
            <div className="mt-6 text-center text-xs text-gray-500">
              By continuing, you agree to the{' '}
              <a href="/terms" className="text-teal-600 hover:text-teal-700">Terms and Conditions</a>
              {' '}and{' '}
              <a href="/privacy" className="text-teal-600 hover:text-teal-700">Privacy Policy</a>.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 text-center text-xs text-gray-400">
          Patent Pending Serial No. 63/870,133 • AXP™ - Adaptive Execution Platform™
        </div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden lg:block lg:w-[55%] relative">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: 'url(/login-bg-team.jpg)',
          }}
        >
          {/* Optional overlay for better aesthetics */}
          <div className="absolute inset-0 bg-black/10"></div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
