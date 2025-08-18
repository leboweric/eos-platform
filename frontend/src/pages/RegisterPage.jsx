import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Eye, 
  EyeOff, 
  Check, 
  ArrowRight,
  Zap,
  Users,
  DollarSign,
  Shield,
  Clock,
  Star,
  TrendingUp,
  Building2,
  Sparkles,
  ChevronRight
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
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const navigate = useNavigate();
  const { register: registerUser, isLoading, error, clearError } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(registerSchema)
  });

  const emailValue = watch('email', '');

  const testimonials = [
    {
      quote: "We saved $10,000 in our first year by switching from Ninety.io",
      author: "Sarah Chen",
      role: "COO, TechScale Inc",
      rating: 5
    },
    {
      quote: "Finally, software that adapts to how WE work, not the other way around",
      author: "Michael Rodriguez",
      role: "CEO, Growth Partners",
      rating: 5
    },
    {
      quote: "Setup took 10 minutes. Seriously. Our team was using it the same day",
      author: "Jessica Park",
      role: "VP Operations, Innovate Co",
      rating: 5
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const onSubmit = async (data) => {
    clearError();
    const { confirmPassword, ...userData } = data;
    const result = await registerUser(userData);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Value Proposition */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full opacity-5">
            <div className="absolute top-20 right-20 w-64 h-64 bg-white rounded-full filter blur-3xl"></div>
            <div className="absolute bottom-20 left-20 w-96 h-96 bg-white rounded-full filter blur-3xl"></div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo and Tagline */}
          <div>
            <Link to="/" className="inline-block group mb-8">
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl inline-block transition-all duration-300 group-hover:bg-white/20 group-hover:scale-105">
                <img 
                  src="/AXP_logo_upper_left_transparent.png?v=2" 
                  alt="AXP" 
                  className="h-12 w-auto brightness-0 invert"
                />
              </div>
              <div className="mt-2 text-white/80 text-sm font-medium">
                Accountability & Execution Platform
              </div>
            </Link>
            <h1 className="text-4xl font-bold mb-4">
              Start Your 30-Day Free Trial
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Join hundreds of teams saving 75% compared to Ninety.io
            </p>

            {/* Value Props */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Any Framework, Your Terms</p>
                  <p className="text-blue-100">EOS, OKRs, Scaling Up, or create your own</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Save Thousands Per Year</p>
                  <p className="text-blue-100">Flat-rate pricing, not per-user charges</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Setup in 10 Minutes</p>
                  <p className="text-blue-100">No consultants or training required</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-lg">30-Day Money Back Guarantee</p>
                  <p className="text-blue-100">No risk, cancel anytime</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 p-6 bg-white/10 rounded-xl backdrop-blur-sm">
              <div>
                <p className="text-3xl font-bold">500+</p>
                <p className="text-sm text-blue-100">Teams</p>
              </div>
              <div>
                <p className="text-3xl font-bold">75%</p>
                <p className="text-sm text-blue-100">Cost Savings</p>
              </div>
              <div>
                <p className="text-3xl font-bold">4.9★</p>
                <p className="text-sm text-blue-100">Rating</p>
              </div>
            </div>
          </div>

          {/* Testimonial Carousel */}
          <div className="mt-8">
            <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-lg mb-3 italic">
                "{testimonials[currentTestimonial].quote}"
              </p>
              <div>
                <p className="font-semibold">{testimonials[currentTestimonial].author}</p>
                <p className="text-sm text-blue-100">{testimonials[currentTestimonial].role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6">
            <Link to="/" className="inline-flex items-center justify-center">
              <img 
                src="/AXP_logo_upper_left_transparent.png?v=2" 
                alt="AXP" 
                className="h-16 w-auto"
              />
            </Link>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="mb-2">
                <Badge className="mb-3" variant="secondary">
                  <Sparkles className="mr-1 h-3 w-3" />
                  No Credit Card Required
                </Badge>
              </div>
              <CardTitle className="text-2xl">Create Your Free Account</CardTitle>
              <CardDescription>
                30-day free trial • Setup in minutes • Cancel anytime
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="firstName" className="text-sm">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      {...register('firstName')}
                      className={errors.firstName ? 'border-red-500' : ''}
                    />
                    {errors.firstName && (
                      <p className="text-xs text-red-500">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      {...register('lastName')}
                      className={errors.lastName ? 'border-red-500' : ''}
                    />
                    {errors.lastName && (
                      <p className="text-xs text-red-500">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email" className="text-sm">Work Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@company.com"
                    {...register('email')}
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="organizationName" className="text-sm">Company Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="organizationName"
                      placeholder="Acme Corporation"
                      {...register('organizationName')}
                      className={`pl-10 ${errors.organizationName ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.organizationName && (
                    <p className="text-xs text-red-500">{errors.organizationName.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="password" className="text-sm">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      {...register('password')}
                      className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      {...register('confirmPassword')}
                      className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="terms"
                      required
                      className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="terms" className="text-xs text-gray-600">
                      I agree to the{' '}
                      <Link to="/terms" className="text-primary hover:underline">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      'Creating Account...'
                    ) : (
                      <>
                        Start Free Trial
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Social Proof */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>10,000+ users</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    <span>SOC 2 compliant</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    <span>99.9% uptime</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </div>

              {/* Consultant Link */}
              <div className="mt-3 text-center">
                <p className="text-xs text-gray-500">
                  Are you a consultant?{' '}
                  <Link to="/consultant-register" className="text-primary hover:underline">
                    Register here
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Trust Badges */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 mb-2">Trusted by teams at</p>
            <div className="flex justify-center items-center gap-6 opacity-50">
              <TrendingUp className="h-6 w-6 text-gray-400" />
              <Building2 className="h-8 w-8 text-gray-400" />
              <Target className="h-6 w-6 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;