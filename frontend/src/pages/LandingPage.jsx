import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SEO from '../components/SEO';
import FrameworkSwitcherDemo from '../components/FrameworkSwitcherDemo';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  Zap, 
  Users, 
  Globe, 
  Calendar, 
  CheckCircle, 
  MessageSquare,
  ArrowRight,
  Star,
  Cloud,
  Shield,
  Sparkles,
  Building,
  RefreshCw,
  Palette,
  Brain,
  Lock,
  FileText,
  Video,
  ChevronRight,
  Gauge,
  TrendingUp,
  Target,
  Layers
} from 'lucide-react';

const LandingPage = () => {
  const [showFrameworkDemo, setShowFrameworkDemo] = useState(false);
  
  // Revolutionary features that set us apart
  const gameChangers = [
    {
      icon: RefreshCw,
      title: 'Adaptive Framework Technology™',
      description: 'Seamlessly switch between EOS, 4DX, Scaling Up, or custom frameworks. One platform, infinite methodologies.',
      highlight: 'Industry First'
    },
    {
      icon: Video,
      title: 'Real-Time Collaborative Meetings',
      description: 'Transform virtual meetings with live presence, synchronized navigation, and instant team ratings.',
      highlight: 'Game Changer'
    },
    {
      icon: Cloud,
      title: 'Your Cloud, Your Control',
      description: 'Store documents in YOUR Google Drive or OneDrive. Complete data sovereignty with seamless integration.',
      highlight: 'Unique'
    },
    {
      icon: Brain,
      title: 'AI-Powered Insights',
      description: 'Smart priority assistant analyzes your data to suggest optimal goals and predict bottlenecks.',
      highlight: 'Coming Soon'
    }
  ];

  // Core features organized by workflow
  const features = {
    'Strategic Planning': [
      'Dynamic 2-Page Business Plans',
      'Strategic Planning Documents',
      'Core Values & Focus Management',
      '10-Year Target → 3-Year Picture → 1-Year Plan cascade',
      'Marketing Strategy Builder'
    ],
    'Execution Excellence': [
      'Quarterly Priorities with Milestones',
      'Department-to-Company Alignment',
      'Progress Tracking & Status Updates',
      'Accountability Chart',
      'Process Documentation'
    ],
    'Performance Management': [
      'Weekly & Monthly Scorecards',
      'Drag-and-drop Metric Grouping',
      'Red/Yellow/Green Goal Tracking',
      'Trend Analysis & Insights',
      'Excel Export for Reports'
    ],
    'Meeting Productivity': [
      'Weekly Meeting Facilitation',
      'Quarterly Planning Sessions',
      'Structured Problem Solving',
      'Meeting Summary Emails',
      'Action Item Tracking'
    ]
  };

  const testimonials = [
    {
      role: 'CEO, Strategic Advisory Firm',
      content: 'The ability to use our own Microsoft cloud storage while getting enterprise features is unprecedented. This platform understands enterprise needs.',
      rating: 5
    },
    {
      role: 'Business Coach',
      content: 'Finally, a platform that respects the methodology but enhances it with modern technology. The real-time meeting features are revolutionary.',
      rating: 5
    },
    {
      role: 'COO, Growing Company',
      content: 'We switched frameworks three times before finding what worked. With AXP, we just toggle settings. It\'s that simple.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen">
      <SEO 
        title="Home"
        description="AXP is the most affordable business operating system. Switch from EOS, Ninety.io, OKRs, or any framework. Manage priorities, scorecards, meetings, and more with the only platform that adapts to YOUR methodology."
        keywords="EOS alternative, Ninety.io alternative, business operating system, OKR software, quarterly planning, business management platform, adaptive framework, EOS tools"
      />
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src="/AXP_logo_upper_left_transparent.png" 
              alt="AXP" 
              className="h-20 w-auto"
            />
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - Clean and Bold */}
      <section className="pt-20 pb-24 px-4 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur px-4 py-2 rounded-full border border-slate-200/50 mb-6">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-medium text-slate-700">
                Supporting EOS, 4DX, OKRs, Scaling Up or Your Custom Framework
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              The Business Operating Platform<br />
              <span className="text-4xl md:text-5xl">That Adapts to You</span>
            </h1>
            
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
              The perfect platform for any business operating system. 
              Switch methodologies instantly. Keep all your data. Pay less.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/register">
                <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  Start Executing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>30-Day Free Trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Cancel Anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Framework Independence & Attribution */}
      <section id="disclaimer" className="py-16 px-4 bg-white border-y">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Framework Independence & Attribution</h2>
          </div>
          
          <div className="prose prose-slate max-w-none">
            <div className="bg-slate-50 rounded-xl p-6 mb-6">
              <p className="text-sm text-slate-700 leading-relaxed mb-4">
                <strong>Platform Independence:</strong> AXP is an independent software platform that enables organizations to implement various business methodologies. 
                We have no affiliation with, endorsement from, or partnership with any of the methodology creators or organizations mentioned on this site.
              </p>
              
              <p className="text-sm text-slate-700 leading-relaxed mb-4">
                <strong>Trademark Acknowledgments:</strong> EOS® and Entrepreneurial Operating System® are registered trademarks of EOS Worldwide, LLC. 
                Scaling Up® and Rockefeller Habits® are registered trademarks of Gazelles, Inc. 
                OKR (Objectives and Key Results) methodology was developed by Andy Grove at Intel. 
                4DX® (4 Disciplines of Execution) is a registered trademark of Franklin Covey Co.
              </p>
              
              <p className="text-sm text-slate-700 leading-relaxed mb-4">
                <strong>Platform Purpose:</strong> AXP provides a flexible technology platform that can support multiple business operating systems. 
                Organizations should work with certified implementers, coaches, or consultants for methodology-specific guidance and training.
              </p>
              
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>Software Comparison:</strong> References to Ninety.io™, Bloom Growth™, and EOS One™ are for comparative purposes only.
                These platforms are property of their respective companies. We encourage organizations to evaluate all options to find the best fit for their needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Framework Switcher Demo */}
      <section className="py-20 px-4 bg-gradient-to-br from-white via-slate-50 to-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
              <RefreshCw className="h-4 w-4" />
              ADAPTIVE FRAMEWORK TECHNOLOGY
            </div>
            <h2 className="text-4xl font-bold mb-6">
              One Platform. Any Methodology.
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Unlike other platforms locked to a single framework, AXP transforms instantly 
              to match your chosen methodology.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-6">Switch frameworks anytime or switch to your own</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">EOS® (Entrepreneurial Operating System)</div>
                    <div className="text-gray-600">Vision/Traction™, Rocks, Scorecards, Level 10™</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">4DX® (4 Disciplines of Execution)</div>
                    <div className="text-gray-600">WIGs, Lead Measures, Scoreboards, WIG Sessions</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">OKRs (Objectives & Key Results)</div>
                    <div className="text-gray-600">Objectives, Key Results, Initiatives, Check-ins</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">Scaling Up® (Rockefeller Habits)</div>
                    <div className="text-gray-600">One-Page Plan, Priorities, KPIs, Daily Huddles</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">Custom Framework</div>
                    <div className="text-gray-600">Design your own methodology with custom terms</div>
                  </div>
                </div>
              </div>
              
              <Button 
                size="lg" 
                className="mt-8"
                onClick={() => setShowFrameworkDemo(true)}
              >
                See Framework Switching in Action
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            
            <div className="relative">
              <div className="bg-white rounded-xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">Framework Settings</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Live</span>
                </div>
                <div className="space-y-3">
                  <div className="p-3 border-2 border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">EOS® Mode</span>
                      <div className="w-12 h-6 bg-gray-300 rounded-full"></div>
                    </div>
                  </div>
                  <div className="p-3 border-2 border-blue-500 rounded-lg bg-blue-50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">OKRs Mode</span>
                      <div className="w-12 h-6 bg-blue-500 rounded-full relative">
                        <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-2 border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Scaling Up Mode</span>
                      <div className="w-12 h-6 bg-gray-300 rounded-full"></div>
                    </div>
                  </div>
                  <div className="p-3 border-2 border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">4DX® Mode</span>
                      <div className="w-12 h-6 bg-gray-300 rounded-full"></div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900 mb-2">Instant Transformation</div>
                  <div className="text-xs text-blue-700">
                    • Rocks → Key Results → WIGs → Priorities<br />
                    • Scorecard → KPIs → Scoreboard → Metrics<br />
                    • Issues → Blockers → Barriers → Obstacles<br />
                    • All data preserved & remapped instantly
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Leading Edge Features Grid */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              LEADING EDGE FEATURES
            </div>
            <h2 className="text-4xl font-bold mb-6">
              Features That Actually Matter
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built by operators, for operators. Every feature designed to save time and drive results.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {gameChangers.map((feature, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                    <feature.icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold">{feature.title}</h3>
                      <span className="px-2 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs rounded-full font-medium">
                        {feature.highlight}
                      </span>
                    </div>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Features Grid */}
          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Palette, title: 'White-Label Ready', desc: 'Custom branding for consultants' },
              { icon: Shield, title: 'Bank-Level Security', desc: '256-bit encryption & SOC2 compliant' },
              { icon: Globe, title: 'Integration Ready', desc: 'RESTful APIs and webhooks enable custom integrations with your tools.' },
              { icon: Users, title: 'Department Views', desc: 'Filtered dashboards for each team' },
              { icon: FileText, title: 'Document Storage', desc: 'Your cloud, your documents' },
              { icon: TrendingUp, title: 'Predictive Analytics', desc: 'AI-powered trend analysis' }
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-6 bg-white rounded-xl border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{item.title}</h4>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Lock className="h-4 w-4" />
                ENTERPRISE READY
              </div>
              <h2 className="text-4xl font-bold mb-6">
                Built for Growth.
                <br />
                <span className="text-blue-600">Powered by Partnership.</span>
              </h2>
              <p className="text-lg text-gray-700 mb-8">
                We're building something different. A platform that grows with you, 
                backed by humans who actually answer your emails.
              </p>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Scale from 10 to 500+ users seamlessly</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Rock-solid, secure, geographically redundant infrastructure</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Your data stays yours - full export anytime</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Leaders Who've Made the Switch</h2>
            <p className="text-xl text-gray-600">
              From established companies to scaling startups, see why they chose AXP.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex mb-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <CardDescription className="text-base text-gray-700 italic">
                    "{testimonial.content}"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 font-medium">{testimonial.role}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            START EXECUTING
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Stop Adapting to Software.
            <br />
            Start Using Software That Adapts.
          </h2>
          <p className="text-xl mb-8 text-blue-50">
            Join forward-thinking organizations that refuse to compromise between 
            methodology and technology.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-gray-100">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            
          </div>
          
          <div className="mt-12 pt-8 border-t border-white/20">
            <p className="text-sm text-blue-100 mb-4">Built for modern organizations</p>
            <div className="flex flex-wrap justify-center gap-8 opacity-70">
              <div className="text-white font-semibold">Strategy Consultants</div>
              <div className="text-white font-semibold">Growing Companies</div>
              <div className="text-white font-semibold">Leadership Teams</div>
              <div className="text-white font-semibold">Enterprise Organizations</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">All features included. Just choose your team size.</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { name: 'Startup', users: 'Up to 10 users', price: '$97', period: '/month' },
              { name: 'Growth', users: 'Up to 25 users', price: '$297', period: '/month', popular: true },
              { name: 'Scale', users: 'Up to 50 users', price: '$497', period: '/month' },
              { name: 'Enterprise', users: '50+ users', price: 'Custom', period: '' }
            ].map((plan, i) => (
              <Card key={i} className={plan.popular ? 'border-blue-500 shadow-xl relative' : ''}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 rounded-full text-sm">
                    Most Popular
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.users}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link to="/register">
                    <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-white">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/AXP_logo_upper_left.png" 
              alt="AXP" 
              className="h-10 w-auto brightness-0 invert"
            />
          </div>
          <p className="text-gray-400 text-sm mb-6">
            Start Executing
          </p>
          <div className="text-gray-500 text-xs space-y-2">
            <p>&copy; 2025 AXP Platform. All rights reserved.</p>
            <p>All trademarks are property of their respective owners.</p>
          </div>
        </div>
      </footer>
      
      {/* Framework Switcher Demo Modal */}
      <Dialog open={showFrameworkDemo} onOpenChange={setShowFrameworkDemo}>
        <DialogContent className="max-w-5xl p-8">
          <FrameworkSwitcherDemo />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPage;