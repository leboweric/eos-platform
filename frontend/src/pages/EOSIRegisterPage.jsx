import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Target, Briefcase, Check } from 'lucide-react';

const EOSIRegisterPage = () => {
  const navigate = useNavigate();
  const { register, error, isLoading } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    organizationName: '',
  });
  const [validationError, setValidationError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error when user types
    if (validationError) {
      setValidationError('');
    }
  };

  const validateEmail = (email) => {
    return email.toLowerCase().endsWith('@eosworldwide.com');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    // Validate email domain
    if (!validateEmail(formData.email)) {
      setValidationError('Please use your @eosworldwide.com email address');
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setValidationError('Password must be at least 8 characters long');
      return;
    }

    const result = await register({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      organizationName: formData.organizationName,
    });

    if (result.success) {
      navigate('/eosi');
    }
  };

  const benefits = [
    'Manage multiple client organizations',
    'Monitor client progress and metrics',
    'Switch between client accounts seamlessly',
    'Set up complete EOS systems for clients',
    'Track rocks, issues, and meeting effectiveness',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4">
            <Target className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">EOS Platform</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Briefcase className="h-8 w-8 text-primary" />
            EOS Implementer Registration
          </h1>
          <p className="text-gray-600 mt-2">Create your EOSI account to manage all your client organizations</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Benefits Card */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl">EOSI Platform Benefits</CardTitle>
              <CardDescription>
                Everything you need to manage your EOS client implementations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> You must have a valid @eosworldwide.com email address to register as an EOS Implementer.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Registration Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create Your EOSI Account</CardTitle>
              <CardDescription>
                Use your official EOS Worldwide email address
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">EOS Worldwide Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your.name@eosworldwide.com"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={validationError && !validateEmail(formData.email) ? 'border-red-500' : ''}
                  />
                  {formData.email && !validateEmail(formData.email) && (
                    <p className="text-sm text-red-600">Must be an @eosworldwide.com email address</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizationName">Your Company Name</Label>
                  <Input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    placeholder="Your EOS Implementation Business"
                    required
                    value={formData.organizationName}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>

                {(error || validationError) && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error || validationError}</AlertDescription>
                  </Alert>
                )}
              </CardContent>

              <CardFooter className="flex flex-col space-y-4">
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading || (formData.email && !validateEmail(formData.email))}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating EOSI Account...
                    </>
                  ) : (
                    'Create EOSI Account'
                  )}
                </Button>
                
                <div className="text-center text-sm text-gray-600">
                  <p>Already have an account?{' '}
                    <Link to="/login" className="font-medium text-primary hover:underline">
                      Sign in
                    </Link>
                  </p>
                  <p className="mt-2">Not an EOS Implementer?{' '}
                    <Link to="/register" className="font-medium text-primary hover:underline">
                      Create a regular account
                    </Link>
                  </p>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EOSIRegisterPage;