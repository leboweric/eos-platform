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
import LegalAgreement from '../components/legal/LegalAgreement';
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
  const [legalAgreement, setLegalAgreement] = useState(null);
  const [agreementError, setAgreementError] = useState('');
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
    setAgreementError('');
    
    // Check if legal agreements are accepted
    if (!legalAgreement || !legalAgreement.termsAccepted || !legalAgreement.privacyAccepted) {
      setAgreementError('You must accept both the Terms of Service and Privacy Policy to create an account');
      // Scroll to the legal agreement section
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
      navigate('/dashboard');
    }
  };

  const handleLegalAcceptance = (agreementData) => {
    setLegalAgreement(agreementData);
    setAgreementError('');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Value Proposition */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-50 via-sky-50 to-white relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full opacity-20">
            <div className="absolute top-20 right-20 w-64 h-64 bg-blue-100 rounded-full filter blur-3xl"></div>
            <div className="absolute bottom-20 left-20 w-96 h-96 bg-sky-100 rounded-full filter blur-3xl"></div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo and Tagline */}
          <div>
            <Link to="/" className="inline-block group mb-8">
              <img 
                src="/AXP_logo_upper_left_transparent.png?v=2" 
                alt="AXP" 
                className="h-20 w-auto transition-all duration-300 group-hover:scale-105"
              />
              <div className="mt-2 text-slate-700 text-sm font-medium">
                Accountability & Execution Platform
              </div>
            </Link>
            <h1 className="text-4xl font-bold mb-4 text-slate-800">
              Start Your 30-Day Free Trial
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              Join hundreds of teams saving 75% compared to Ninety.io
            </p>

            {/* Value Props */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-slate-800">Any Framework, Your Terms</p>
                  <p className="text-slate-600">EOS, OKRs, Scaling Up, or create your own</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-slate-800">Save Thousands Per Year</p>
                  <p className="text-slate-600">Flat-rate pricing, not per-user charges</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-slate-800">Setup in 10 Minutes</p>
                  <p className="text-slate-600">Get started immediately with your team</p>
                </div>
              </div>
            </div>

          </div>

          {/* Testimonial Carousel */}
          <div className="mt-8">
            <div className="bg-white/70 rounded-xl p-6 backdrop-blur-sm shadow-sm">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-lg mb-3 italic text-slate-700">
                "{testimonials[currentTestimonial].quote}"
              </p>
              <div>
                <p className="font-semibold text-slate-800">{testimonials[currentTestimonial].author}</p>
                <p className="text-sm text-slate-600">{testimonials[currentTestimonial].role}</p>
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
                className="h-24 w-auto"
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

                {/* Legal Agreements - Subtle like standard SaaS */}
                <div className="pt-2">
                  <LegalAgreement 
                    onAccept={handleLegalAcceptance}
                    isRequired={true}
                  />
                </div>
                
                {agreementError && (
                  <p className="text-sm text-red-600 mt-2">
                    {agreementError}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full mt-4"
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
                
                <p className="text-xs text-gray-500 text-center mt-3">
                  By clicking "Start Free Trial", you agree to our Terms of Service and Privacy Policy
                </p>
              </form>


              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </div>

            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default RegisterPage;