import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../stores/authStore';
import { oauthService } from '../services/oauthService';
import { useTrackConversion } from '../hooks/useApolloTracking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import LegalAgreement from '../components/legal/LegalAgreement';
import { LogoText } from '../components/Logo';
import { 
  Eye, 
  EyeOff, 
  Check, 
  ArrowRight,
  Zap,
  Shield,
  RefreshCw,
  Cloud,
  Video,
  Brain,
  Palette,
  Sparkles,
  CheckCircle
} from 'lucide-react';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  organizationName: z.string().min(1, 'Organization name is required')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [legalAgreement, setLegalAgreement] = useState(null);
  const [agreementError, setAgreementError] = useState('');
  const navigate = useNavigate();
  const { register: registerUser, isLoading, error, clearError } = useAuthStore();
  const { trackSignup } = useTrackConversion();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(registerSchema)
  });

  const emailValue = watch('email', '');

  const onSubmit = async (data) => {
    clearError();
    setAgreementError('');
    
    // Check if legal agreements are accepted
    if (!legalAgreement || !legalAgreement.termsAccepted || !legalAgreement.privacyAccepted) {
      setAgreementError('You must accept both the Terms of Service and Privacy Policy to create an account');
      document.getElementById('legal-agreement')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    
    const { confirmPassword, ...userData } = data;
    
    // Include legal agreement data with registration
    const registrationData = {
      ...userData,
      legalAgreement: {
        ...legalAgreement,
        acceptedAt: new Date().toISOString(),
        ipAddress: window.location.hostname,
        userAgent: navigator.userAgent
      }
    };
    
    const result = await registerUser(registrationData);
    if (result.success) {
      // Track successful signup for Apollo
      trackSignup(userData.email, userData.organizationName);
      navigate('/dashboard');
    }
  };

  const handleLegalAcceptance = (agreementData) => {
    setLegalAgreement(agreementData);
    setAgreementError('');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Revolutionary Value Proposition */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-64 h-64 bg-blue-200 rounded-full filter blur-3xl opacity-20"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-200 rounded-full filter blur-3xl opacity-20"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo and Tagline */}
          <div>
            <Link to="/" className="inline-block group mb-8">
              <div className="transition-all duration-300 group-hover:scale-105">
                <LogoText useThemeColors={false} />
              </div>
            </Link>

            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              THE FUTURE OF EXECUTION PLATFORMS
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-slate-900">
              Join the Revolution
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              The world's first platform that adapts to YOUR methodology, 
              not the other way around.
            </p>

            {/* Game-Changing Features */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <RefreshCw className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-slate-800">Adaptive Framework Technology™</p>
                  <p className="text-slate-600 text-sm">Switch between EOS, 4DX, OKRs instantly</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Cloud className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-slate-800">Your Cloud, Your Control</p>
                  <p className="text-slate-600 text-sm">Store in YOUR Google Drive or OneDrive</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Video className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-slate-800">Real-Time Collaboration</p>
                  <p className="text-slate-600 text-sm">Live meetings with presence & sync</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-slate-800">AI Strategic Assistant</p>
                  <p className="text-slate-600 text-sm">SMART goals powered by GPT-4</p>
                </div>
              </div>
            </div>
          </div>

          {/* Social Proof */}
          <div className="border-t border-slate-200 pt-8">
            <p className="text-sm text-slate-500 mb-3">Built for modern organizations</p>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <span>✓ Strategy Consultants</span>
              <span>•</span>
              <span>✓ Growing Teams</span>
              <span>•</span>
              <span>✓ Enterprise Leaders</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-block">
              <div className="flex justify-center">
                <LogoText useThemeColors={false} />
              </div>
            </Link>
          </div>

          {/* Form */}
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Start Your Free Trial</h2>
              <p className="text-gray-600 mt-2">30 days free • No credit card required</p>
            </div>

            {/* OAuth Options */}
            <div className="space-y-3 mb-6">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 border-gray-300 hover:bg-gray-50 font-medium"
                onClick={async () => {
                  try {
                    await oauthService.googleLogin();
                  } catch (error) {
                    console.error('Google signup failed:', error);
                  }
                }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 border-gray-300 hover:bg-gray-50 font-medium"
                onClick={async () => {
                  try {
                    await oauthService.microsoftLogin();
                  } catch (error) {
                    console.error('Microsoft signup failed:', error);
                  }
                }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#F25022" d="M11.4 11.4H1V1h10.4v10.4z"/>
                  <path fill="#7FBA00" d="M23 11.4H12.6V1H23v10.4z"/>
                  <path fill="#00A4EF" d="M11.4 23H1V12.6h10.4V23z"/>
                  <path fill="#FFB900" d="M23 23H12.6V12.6H23V23z"/>
                </svg>
                Sign up with Microsoft
              </Button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or register with email</span>
              </div>
            </div>

            {/* Error Alerts */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {agreementError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{agreementError}</AlertDescription>
              </Alert>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                    First name
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    {...register('firstName')}
                    className={errors.firstName ? 'border-red-500' : ''}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                    Last name
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    {...register('lastName')}
                    className={errors.lastName ? 'border-red-500' : ''}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Work email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  {...register('email')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="organizationName" className="text-sm font-medium text-gray-700">
                  Organization name
                </Label>
                <Input
                  id="organizationName"
                  placeholder="Acme Corp"
                  {...register('organizationName')}
                  className={errors.organizationName ? 'border-red-500' : ''}
                />
                {errors.organizationName && (
                  <p className="text-sm text-red-600 mt-1">{errors.organizationName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    {...register('password')}
                    className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
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

              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    {...register('confirmPassword')}
                    className={`pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600 mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Legal Agreement */}
              <div id="legal-agreement" className="border-t pt-4">
                <LegalAgreement onAccept={handleLegalAcceptance} />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Creating account...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    Start Free Trial
                    <Zap className="ml-2 h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </Link>
              </p>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-center space-x-6 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>30-day trial</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>No credit card</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>

            {/* Security Note */}
            <div className="mt-4 flex items-center justify-center space-x-2 text-xs text-gray-500">
              <Shield className="h-3 w-3" />
              <span>Enterprise-grade security • SOC 2 compliant</span>
            </div>
            
            {/* Patent Pending Notice */}
            <div className="mt-3 text-center text-xs text-gray-400">
              Patent Pending Serial No. 63/870,133 • AXP™ - Adaptive Execution Platform™
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;