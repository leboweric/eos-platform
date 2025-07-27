import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Target, 
  Users, 
  BarChart3, 
  Calendar, 
  CheckCircle, 
  MessageSquare,
  ArrowRight,
  Star
} from 'lucide-react';

const LandingPage = () => {
  const features = [
    {
      icon: Target,
      title: '2-Page Plan Management',
      description: 'Create and manage your Business Strategy Blueprint with collaborative editing and real-time updates.'
    },
    {
      icon: CheckCircle,
      title: 'Quarterly Priorities Tracking',
      description: 'Set, track, and achieve your quarterly priorities with milestone management and progress monitoring.'
    },
    {
      icon: BarChart3,
      title: 'Scorecard Analytics',
      description: 'Monitor key metrics and KPIs with visual dashboards and goal achievement tracking.'
    },
    {
      icon: Calendar,
      title: 'Accountability Meetings',
      description: 'Facilitate effective accountability meetings with structured agendas and action item tracking.'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Enable seamless team collaboration with real-time updates and shared workspaces.'
    },
    {
      icon: MessageSquare,
      title: 'Issues Management',
      description: 'Identify, prioritize, and resolve issues with comprehensive tracking and resolution workflows.'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'CEO, TechStart Inc.',
      content: 'This platform has transformed how we implement strategic initiatives. The AI insights are game-changing.',
      rating: 5
    },
    {
      name: 'Mike Chen',
      role: 'Strategy Consultant',
      content: 'My clients love the intuitive interface and real-time collaboration features.',
      rating: 5
    },
    {
      name: 'Lisa Rodriguez',
      role: 'Operations Director',
      content: 'Finally, a strategic tool that actually makes our meetings more productive.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src="/AXP_logo_upper_left.png" 
              alt="AXP" 
              className="h-10 w-auto"
            />
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Master Your Strategic Execution
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            The most advanced platform for implementing and managing proven business strategies. 
            Built for strategy consultants and their clients.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="text-lg px-8 py-3">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 py-3">
              Watch Demo
            </Button>
          </div>
          <div className="mt-6">
            <p className="text-sm text-gray-600 mb-2">Are you a Strategy Consultant?</p>
            <Link to="/eosi-register">
              <Button variant="link" className="text-primary hover:underline">
                Create your Consultant account here →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need for Strategic Success</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive tools designed specifically for strategic methodology implementation and management.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-primary mb-4" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI Features Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">AI-Powered Strategic Intelligence</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Leverage artificial intelligence to enhance your strategic implementation with smart insights and automation.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-6">Smart Goal Setting</h3>
              <ul className="space-y-4">
                <li className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5" />
                  <span>AI-suggested quarterly rocks based on historical performance</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5" />
                  <span>Intelligent milestone recommendations and timeline optimization</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5" />
                  <span>Performance predictions and risk assessment</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="text-sm text-gray-500 mb-2">AI Suggestion</div>
              <div className="font-semibold mb-4">Recommended Q1 Priority:</div>
              <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-500">
                <div className="font-medium">Implement new CRM system</div>
                <div className="text-sm text-gray-600 mt-2">
                  Based on your sales growth goals and current process inefficiencies, 
                  implementing a CRM system could increase lead conversion by 25%.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Trusted by Strategy Consultants</h2>
            <p className="text-xl text-gray-600">
              See what strategy professionals and their clients are saying about our platform.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <CardDescription className="text-base italic">
                    "{testimonial.content}"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Strategic Implementation?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of strategy consultants and organizations already using our platform to achieve better results.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-primary">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <img 
                  src="/AXP_logo_upper_left.png" 
                  alt="AXP" 
                  className="h-8 w-auto"
                />
              </div>
              <p className="text-gray-400">
                The most advanced platform for strategic implementation and management.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Features</li>
                <li>Pricing</li>
                <li>Demo</li>
                <li>API</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>About</li>
                <li>Blog</li>
                <li>Careers</li>
                <li>Contact</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>Documentation</li>
                <li>Community</li>
                <li>Status</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 AXP. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

