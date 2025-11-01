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
import { Badge } from '@/components/ui/badge';
import { LogoText } from '../components/Logo';
import { 
  Eye, 
  EyeOff, 
  Briefcase, 
  Shield, 
  Sparkles,
  RefreshCw,
  Cloud,
  CheckCircle,
  ArrowRight,
  Lock,
  Zap,
  Video,
  Brain
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
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema)
  });

  const emailValue = watch('email', '');

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
      {/* Left Panel - Revolutionary Features */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-64 h-64 bg-blue-200 rounded-full filter blur-3xl opacity-20"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-200 rounded-full filter blur-3xl opacity-20"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="mb-12">
            <Link to="/" className="inline-block group">
              <div className="transition-all duration-300 group-hover:scale-105">
                <LogoText useThemeColors={false} />
              </div>
            </Link>
          </div>
          
          {/* Main Message */}
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
              Welcome back
            </h1>
            <p className="text-lg text-slate-600">
              Your adaptive execution platform for strategic execution.
            </p>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 pt-8 border-t border-slate-200">
            <div className="flex items-center space-x-4 text-sm text-slate-600">
              <Shield className="h-5 w-5 text-slate-500" />
              <span>SOC 2 Type II Compliant</span>
              <span>•</span>
              <span>Enterprise-Grade Security</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-block">
              <img 
                src="/AXP_logo_upper_left_transparent.png?v=2" 
                alt="AXP - Adaptive Execution Platform Logo" 
                className="h-24 w-auto mx-auto"
              />
            </Link>
          </div>

          {/* Form Container */}
          <div className="bg-white p-8 rounded-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Sign in to your account</h2>
              <p className="text-gray-600 mt-2">Sign in to your adaptive execution platform</p>
            </div>

            {/* Consultant Badge */}
            {emailValue.toLowerCase().includes('consultant') || emailValue.toLowerCase().includes('implementer') && (
              <div className="mb-6 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
                <div className="flex items-center justify-center space-x-2">
                  <Briefcase className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-medium text-indigo-900">Strategy Consultant Account</span>
                </div>
              </div>
            )}

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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  {...register('email')}
                  className={`h-11 px-4 ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    {...register('password')}
                    className={`h-11 px-4 pr-10 ${errors.password ? 'border-red-500' : ''}`}
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

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="remember" className="ml-2 text-sm text-gray-600 cursor-pointer">
                  Keep me signed in
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-base rounded-lg transition-all transform hover:scale-[1.02]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    Sign in to AXP
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full py-3 border-gray-300 hover:bg-gray-50 font-medium group"
                onClick={async () => {
                  try {
                    await oauthService.googleLogin();
                  } catch (error) {
                    console.error('Google login failed:', error);
                  }
                }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full py-3 border-gray-300 hover:bg-gray-50 font-medium group"
                onClick={async () => {
                  try {
                    await oauthService.microsoftLogin();
                  } catch (error) {
                    console.error('Microsoft login failed:', error);
                  }
                }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#F25022" d="M11.4 11.4H1V1h10.4v10.4z"/>
                  <path fill="#7FBA00" d="M23 11.4H12.6V1H23v10.4z"/>
                  <path fill="#00A4EF" d="M11.4 23H1V12.6h10.4V23z"/>
                  <path fill="#FFB900" d="M23 23H12.6V12.6H23V23z"/>
                </svg>
                Continue with Microsoft
              </Button>
            </div>

          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-700 transition-colors">Terms</a>
              <span>•</span>
              <a href="#" className="hover:text-gray-700 transition-colors">Privacy</a>
              <span>•</span>
              <a href="#" className="hover:text-gray-700 transition-colors">Support</a>
            </div>
            <div className="mt-3 text-xs text-gray-400">
              Patent Pending Serial No. 63/870,133 • AXP™ - Adaptive Execution Platform™
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;