import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SEO from '../components/SEO';
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
      icon: Shield,
      title: 'Enterprise OAuth & SSO',
      description: 'Google and Microsoft authentication built-in. Your IT team will love the security and simplicity.',
      highlight: 'Enterprise Ready'
    },
    {
      icon: Brain,
      title: 'AI Strategic Assistant',
      description: 'SMART goal validation, milestone generation, and alignment checking powered by GPT-4.',
      highlight: 'AI Powered'
    },
    {
      icon: Palette,
      title: 'White-Label Ready',
      description: 'Custom domains, branded login portals, and complete visual customization for consultants.',
      highlight: 'Your Brand'
    }
  ];

  const coreCapabilities = [
    {
      category: 'Strategic Planning',
      features: [
        'Dynamic 2-Page Business Plans',
        'Vision/Traction Organizer',
        'Core Values & Focus Management',
        '10-Year Target → 3-Year Picture → 1-Year Plan cascade',
        'Marketing Strategy Builder'
      ]
    },
    {
      category: 'Execution Excellence',
      features: [
        'Quarterly Priorities with Milestones',
        'Department-to-Company Alignment',
        'Progress Tracking & Status Updates',
        'Accountability Chart',
        'Process Documentation'
      ]
    },
    {
      category: 'Performance Management',
      features: [
        'Weekly & Monthly Scorecards',
        'Drag-and-drop Metric Grouping',
        'Red/Yellow/Green Goal Tracking',
        'Trend Analysis & Insights',
        'Excel Export for Reports'
      ]
    },
    {
      category: 'Meeting Productivity',
      features: [
        'Level 10 Meeting Facilitation',
        'Quarterly Planning Sessions',
        'IDS™ Problem Solving',
        'Meeting Summary Emails',
        'Action Item Tracking'
      ]
    }
  ];

  const testimonials = [
    {
      name: 'Michael Thompson',
      role: 'CEO, Strategic Advisory Firm',
      content: 'The ability to use our own Microsoft cloud storage while getting enterprise features is unprecedented. This platform understands enterprise needs.',
      rating: 5
    },
    {
      name: 'Sarah Chen',
      role: 'EOS Implementer',
      content: 'Finally, a platform that respects the methodology but enhances it with modern technology. The real-time meeting features are revolutionary.',
      rating: 5
    },
    {
      name: 'David Rodriguez',
      role: 'COO, Growth Company',
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

      {/* Hero Section - Bold Statement */}
      <section className="py-20 px-4 text-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
        <div className="container mx-auto max-w-5xl">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Beyond EOS. Beyond 4DX. Beyond Traditional Software.
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
            The Execution Platform That
            <br />
            <span className="text-blue-600">Adapts to You</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto leading-relaxed">
            Not another EOS tool. Not another 4DX app. 
            <br />
            <span className="font-semibold">The world's first Adaptive Execution Platform</span> that transforms 
            with your methodology, integrates with your cloud, and evolves with your business.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/register">
              <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                Start Your Transformation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2">
              See It In Action
              <Video className="ml-2 h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>30-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Switch frameworks anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Game Changers Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Zap className="h-4 w-4" />
              REVOLUTIONARY FEATURES
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Features That Don't Exist
              <br />
              <span className="text-blue-600">Anywhere Else</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We didn't just build another business tool. We reimagined what's possible when 
              technology truly serves strategy.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {gameChangers.map((feature, index) => (
              <Card key={index} className="relative border-2 hover:border-blue-500 transition-all duration-300 hover:shadow-xl group">
                <div className="absolute -top-3 left-4">
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
                    {feature.highlight}
                  </span>
                </div>
                <CardHeader className="pt-8">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-7 w-7 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl mb-3">{feature.title}</CardTitle>
                  <CardDescription className="text-base text-gray-700">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Adaptive Framework Showcase */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Layers className="h-4 w-4" />
                ADAPTIVE FRAMEWORK TECHNOLOGY™
              </div>
              <h2 className="text-4xl font-bold mb-6">
                One Platform.
                <br />
                <span className="text-blue-600">Every Methodology.</span>
              </h2>
              <p className="text-lg text-gray-700 mb-8">
                Your business is unique. Your execution platform should be too. 
                Switch between proven frameworks or create your own—all your data transforms seamlessly.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">EOS® (Entrepreneurial Operating System)</div>
                    <div className="text-gray-600">Full V/TO, Level 10 meetings, Rocks, IDS™</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">4DX® (4 Disciplines of Execution)</div>
                    <div className="text-gray-600">WIGs, Lead Measures, Scoreboards, Accountability</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">Scaling Up / OKRs / Custom</div>
                    <div className="text-gray-600">Adapt terminology, workflows, and structures to your needs</div>
                  </div>
                </div>
              </div>
              
              <Button size="lg" className="mt-8">
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
                      <span className="font-medium">4DX® Mode</span>
                      <div className="w-12 h-6 bg-blue-500 rounded-full relative">
                        <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-2 border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Custom Framework</span>
                      <div className="w-12 h-6 bg-gray-300 rounded-full"></div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900 mb-2">Instant Transformation</div>
                  <div className="text-xs text-blue-700">
                    • Rocks → WIGs<br />
                    • V/TO → Execution Plan<br />
                    • Level 10 → WIG Session<br />
                    • All data preserved & remapped
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities Grid */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Everything You Need.
              <br />
              <span className="text-blue-600">Nothing You Don't.</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive capabilities that work together seamlessly, not a collection of disconnected tools.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {coreCapabilities.map((category, index) => (
              <div key={index} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-bold text-lg">{category.category}</h3>
                </div>
                <ul className="space-y-2">
                  {category.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration & Security */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-50 to-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-white rounded-xl shadow-xl p-8">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Cloud className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Your Cloud Storage</h4>
                      <p className="text-sm text-gray-600">Connect Google Drive, OneDrive, or SharePoint. Your data stays in YOUR cloud.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Shield className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Enterprise Security</h4>
                      <p className="text-sm text-gray-600">OAuth 2.0, SSO, 2FA, SOC 2 compliant. Your IT team's requirements, met.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">White-Label Options</h4>
                      <p className="text-sm text-gray-600">Custom domains, branded portals. Make it yours.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Globe className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">API & Webhooks</h4>
                      <p className="text-sm text-gray-600">Connect with Slack, Teams, Salesforce, and 1000+ apps via Zapier.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Lock className="h-4 w-4" />
                ENTERPRISE READY
              </div>
              <h2 className="text-4xl font-bold mb-6">
                Built for Enterprise.
                <br />
                <span className="text-blue-600">Loved by Teams.</span>
              </h2>
              <p className="text-lg text-gray-700 mb-8">
                We know the difference between a tool and a platform. That's why we built 
                enterprise features from day one, not as an afterthought.
              </p>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Unlimited users on all plans</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>99.9% uptime SLA</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>GDPR & CCPA compliant</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>24/7 priority support</span>
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
              From Fortune 500s to scaling startups, see why they chose AXP.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-2 hover:border-blue-500 transition-colors">
                <CardHeader>
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <CardDescription className="text-base text-gray-700 italic">
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
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            JOIN THE EXECUTION REVOLUTION
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
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2 border-white text-white hover:bg-white/10">
              Schedule a Demo
            </Button>
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

      {/* Disclaimer & Attribution Section */}
      <section id="disclaimer-section" className="py-12 px-4 bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-4">Framework Independence & Attribution</h3>
            <div className="max-w-4xl mx-auto space-y-4 text-sm text-gray-600 text-left">
              <p className="font-semibold text-gray-800">
                AXP is an independent software platform with no affiliation to any business methodology organization.
              </p>
              <p>
                <strong>Trademark Acknowledgments:</strong> EOS® and Entrepreneurial Operating System® are registered trademarks of EOS Worldwide, LLC. 
                Scaling Up® and Rockefeller Habits® are registered trademarks of Gazelles, Inc. 
                OKR (Objectives and Key Results) methodology was developed by Andy Grove at Intel. 
                4DX® (4 Disciplines of Execution) is a registered trademark of Franklin Covey Co.
              </p>
              <p>
                <strong>Our Position:</strong> AXP is a framework-agnostic execution platform that enables organizations to implement 
                their chosen business operating system. We provide the software infrastructure to support various methodologies 
                but are not endorsed by, affiliated with, or certified by any of these organizations. 
                Organizations should seek official training and certification from the respective methodology providers.
              </p>
              <p>
                <strong>Software Comparison:</strong> References to Ninety.io™, Bloom Growth™, and EOS One™ are for comparative purposes only. 
                These are trademarks of their respective owners, and we have no affiliation with these companies. 
                Our platform offers similar functionality with the unique ability to adapt between frameworks.
              </p>
              <p className="italic">
                We encourage organizations to work with certified implementers and coaches from their chosen methodology 
                while using AXP as their execution platform.
              </p>
            </div>
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
                  className="h-8 w-auto brightness-0 invert"
                />
              </div>
              <p className="text-gray-400 text-sm">
                The Adaptive Execution Platform that transforms with your business.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>Features</li>
                <li>Frameworks</li>
                <li>Integrations</li>
                <li>Security</li>
                <li>Pricing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>About</li>
                <li>Blog</li>
                <li>Customers</li>
                <li>Partners</li>
                <li>Careers</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>Documentation</li>
                <li>API Reference</li>
                <li>Community</li>
                <li>Support</li>
                <li>Status</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-gray-400 text-sm">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p>&copy; 2025 AXP Platform by Profitbuilder Network. All rights reserved.</p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="/privacy" className="hover:text-white">Privacy</a>
                <a href="/terms" className="hover:text-white">Terms</a>
                <a href="#disclaimer" className="hover:text-white" onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('#disclaimer-section').scrollIntoView({ behavior: 'smooth' });
                }}>Disclaimers</a>
              </div>
            </div>
            <p className="mt-4 text-xs text-center">
              All trademarks mentioned are property of their respective owners. See full disclaimer above.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;