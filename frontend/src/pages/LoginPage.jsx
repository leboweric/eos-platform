import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  EyeOff, 
  Briefcase, 
  Shield, 
  Target, 
  TrendingUp,
  Users,
  CheckCircle,
  ArrowRight,
  Lock
} from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
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

  const onSubmit = async (data) => {
    clearError();
    const result = await login(data.email, data.password);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding & Benefits */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-50 via-sky-50 to-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full opacity-20">
            <div className="absolute top-20 right-20 w-64 h-64 bg-blue-100 rounded-full filter blur-3xl"></div>
            <div className="absolute bottom-20 left-20 w-96 h-96 bg-sky-100 rounded-full filter blur-3xl"></div>
          </div>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Logo - Enhanced with animation */}
          <div className="mb-12">
            <Link to="/" className="inline-block group">
              <img 
                src="/AXP_logo_upper_left_transparent.png?v=2" 
                alt="AXP" 
                className="h-28 w-auto transition-all duration-300 group-hover:scale-105"
              />
            </Link>
          </div>
          
          {/* Main Message */}
          <div className="space-y-6">
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-800 leading-tight">
              Welcome Back to
              <span className="text-blue-600 block mt-2">Your Accountability Platform</span>
            </h1>
          </div>

          {/* Benefits */}
          <div className="mt-12 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-slate-800 font-semibold">Strategic Alignment</h3>
                <p className="text-slate-600 text-sm mt-1">Get everyone rowing in the same direction with clear priorities</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-slate-800 font-semibold">Measurable Results</h3>
                <p className="text-slate-600 text-sm mt-1">Track progress with scorecards and data-driven insights</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-slate-800 font-semibold">Team Accountability</h3>
                <p className="text-slate-600 text-sm mt-1">Build a culture of ownership and execution excellence</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo (shown only on small screens) */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-block">
              <img 
                src="/AXP_logo_upper_left_transparent.png?v=2" 
                alt="AXP" 
                className="h-24 w-auto mx-auto"
              />
            </Link>
          </div>

          {/* Form Container */}
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-600 mt-2">Enter your credentials to access your account</p>
            </div>

            {/* Consultant Badge */}
            {emailValue.toLowerCase().endsWith('@eosworldwide.com') && (
              <div className="mb-6 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <div className="flex items-center justify-center space-x-2">
                  <Briefcase className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-medium text-indigo-900">Strategy Consultant Account</span>
                </div>
              </div>
            )}

            {/* Error Alert */}
            {error && (
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
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    {...register('email')}
                    className={`h-11 px-4 ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-400 focus:ring-blue-400'}`}
                  />
                </div>
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
                    className={`h-11 px-4 pr-10 ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-400 focus:ring-blue-400'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                  className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                />
                <Label htmlFor="remember" className="ml-2 text-sm text-gray-600 cursor-pointer">
                  Keep me signed in
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    Sign in
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">New to AXP?</span>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <Link 
                to="/register" 
                className="inline-flex items-center justify-center w-full h-11 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Create an account
              </Link>
            </div>

            {/* Security Note */}
            <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-gray-500">
              <Lock className="h-3 w-3" />
              <span>Secured with 256-bit SSL encryption</span>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;