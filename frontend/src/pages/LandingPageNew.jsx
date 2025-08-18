import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowRight, 
  Check, 
  X,
  Zap,
  Target,
  Users,
  BarChart,
  Calendar,
  DollarSign,
  Globe,
  Lock,
  Sparkles,
  TrendingUp,
  Building2,
  ChevronRight,
  PlayCircle,
  Star,
  ArrowUpRight,
  CheckCircle2,
  Gauge,
  Languages,
  Settings2,
  RefreshCw,
  Shield,
  Rocket
} from 'lucide-react';

const LandingPageNew = () => {
  const navigate = useNavigate();
  const [currentFramework, setCurrentFramework] = useState('eos');
  const [isAnimating, setIsAnimating] = useState(false);

  // Terminology sets for different frameworks
  const frameworkTerms = {
    eos: {
      name: 'EOS',
      priorities: 'Rocks',
      scorecard: 'Scorecard',
      issues: 'Issues',
      meetings: 'Level 10 Meeting',
      vision: 'V/TO'
    },
    okrs: {
      name: 'OKRs',
      priorities: 'Objectives',
      scorecard: 'Key Results',
      issues: 'Blockers',
      meetings: 'Weekly Check-in',
      vision: 'Strategy Doc'
    },
    scaling: {
      name: 'Scaling Up',
      priorities: 'Priorities',
      scorecard: 'KPI Dashboard',
      issues: 'Obstacles',
      meetings: 'Daily Huddle',
      vision: 'One-Page Plan'
    },
    custom: {
      name: 'Your Way',
      priorities: 'Goals',
      scorecard: 'Metrics',
      issues: 'Challenges',
      meetings: 'Team Sync',
      vision: 'Strategic Plan'
    }
  };

  // Auto-rotate through frameworks
  useEffect(() => {
    const frameworks = ['eos', 'okrs', 'scaling', 'custom'];
    let index = 0;
    
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        index = (index + 1) % frameworks.length;
        setCurrentFramework(frameworks[index]);
        setIsAnimating(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Target className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold">AXP</span>
              <Badge variant="secondary" className="ml-2">Platform</Badge>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
              <Link to="/compare" className="text-gray-600 hover:text-gray-900">Compare</Link>
              <Link to="/demo" className="text-gray-600 hover:text-gray-900">Demo</Link>
              <Button variant="outline" onClick={() => navigate('/login')}>Login</Button>
              <Button onClick={() => navigate('/register')}>
                Start Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6">
            <Badge className="mb-4" variant="outline">
              <Sparkles className="mr-1 h-3 w-3" />
              The Framework-Agnostic Alternative to Ninety.io
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight">
              One Platform.<br />
              <span className="text-blue-600">Any Framework.</span><br />
              Your Language.
            </h1>
            
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              While Ninety.io locks you into EOS, AXP adapts to YOUR business methodology. 
              Run EOS, OKRs, Scaling Up, or create your own system.
            </p>

            <div className="flex gap-4 justify-center pt-4">
              <Button size="lg" onClick={() => navigate('/register')}>
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline">
                <PlayCircle className="mr-2 h-5 w-5" />
                Watch 2-Min Demo
              </Button>
            </div>

            <p className="text-sm text-gray-500">
              No credit card required • 30-day free trial • Setup in 10 minutes
            </p>
          </div>
        </div>
      </section>

      {/* Live Framework Switcher Demo */}
      <section className="py-20 px-6 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Watch AXP Transform in Real-Time
            </h2>
            <p className="text-xl text-gray-600">
              Your platform should speak YOUR language, not force you into theirs
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 border-2 border-gray-200">
            <div className="flex justify-center gap-4 mb-8">
              {Object.keys(frameworkTerms).map((framework) => (
                <Button
                  key={framework}
                  variant={currentFramework === framework ? 'default' : 'outline'}
                  onClick={() => setCurrentFramework(framework)}
                  className="transition-all"
                >
                  {frameworkTerms[framework].name}
                </Button>
              ))}
            </div>

            <div className={`transition-all duration-300 ${isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
              <Card className="border-2">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardTitle className="text-2xl">Your Dashboard</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-white rounded-lg border">
                      <Target className="h-6 w-6 text-blue-600 mb-2" />
                      <p className="font-semibold">{frameworkTerms[currentFramework].priorities}</p>
                      <p className="text-sm text-gray-500">Track your quarterly goals</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border">
                      <BarChart className="h-6 w-6 text-green-600 mb-2" />
                      <p className="font-semibold">{frameworkTerms[currentFramework].scorecard}</p>
                      <p className="text-sm text-gray-500">Monitor performance</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border">
                      <Calendar className="h-6 w-6 text-purple-600 mb-2" />
                      <p className="font-semibold">{frameworkTerms[currentFramework].meetings}</p>
                      <p className="text-sm text-gray-500">Run effective meetings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <p className="text-center mt-6 text-gray-600">
              <RefreshCw className="inline h-4 w-4 mr-2" />
              Auto-rotating through frameworks to show flexibility
            </p>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                Tired of Software That Forces You Into Their Box?
              </h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <X className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold">Ninety.io locks you into EOS-only terminology</p>
                    <p className="text-gray-600">Can't use your own terms or methodologies</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <X className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold">Paying per-user gets expensive fast</p>
                    <p className="text-gray-600">$16/user/month adds up to thousands</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <X className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold">Switching frameworks means switching tools</p>
                    <p className="text-gray-600">Lost data, retraining, migration headaches</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-red-100">
              <div className="text-center">
                <p className="text-5xl font-bold text-red-600 mb-2">$9,600</p>
                <p className="text-gray-600 mb-4">Annual cost for 50 users on Ninety.io</p>
                <div className="pt-4 border-t">
                  <p className="text-2xl font-bold text-green-600 mb-2">$2,400</p>
                  <p className="text-gray-600">Same team on AXP (flat rate)</p>
                  <Badge className="mt-2 bg-green-100 text-green-800">Save 75%</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-6 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              AXP: The Platform That Adapts to You
            </h2>
            <p className="text-xl text-gray-600">
              Not the other way around
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <Languages className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle>Speak Your Language</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Use Rocks, OKRs, WIGs, or whatever you call them. Your platform, your terms.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Customize all terminology</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Pre-built framework templates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Switch anytime without losing data</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <DollarSign className="h-10 w-10 text-green-600 mb-2" />
                <CardTitle>Fair Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Pay for value, not per seat. One price for your whole team.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Flat monthly rate</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Unlimited users</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">No surprise bills</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <Gauge className="h-10 w-10 text-purple-600 mb-2" />
                <CardTitle>Actually Simple</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Running in 10 minutes, not 10 weeks. No consultants required.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Intuitive interface</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">No training needed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Import from Ninety.io</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="outline">Side-by-Side</Badge>
            <h2 className="text-4xl font-bold mb-4">
              AXP vs Ninety.io
            </h2>
            <p className="text-xl text-gray-600">
              Why teams are switching to AXP
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-6 font-semibold">Feature</th>
                  <th className="text-center p-6">
                    <div className="flex items-center justify-center gap-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold">AXP</span>
                    </div>
                  </th>
                  <th className="text-center p-6 font-semibold text-gray-500">Ninety.io</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-6">Framework Support</td>
                  <td className="text-center p-6">
                    <Badge className="bg-green-100 text-green-800">Any Framework</Badge>
                  </td>
                  <td className="text-center p-6">
                    <Badge variant="secondary">EOS Only</Badge>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-6">Custom Terminology</td>
                  <td className="text-center p-6">
                    <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center p-6">
                    <X className="h-6 w-6 text-gray-400 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-6">Pricing Model</td>
                  <td className="text-center p-6">
                    <span className="font-semibold text-green-600">Flat Rate</span>
                  </td>
                  <td className="text-center p-6">
                    <span className="text-gray-600">$16/user/month</span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-6">Setup Time</td>
                  <td className="text-center p-6">
                    <span className="font-semibold text-green-600">10 minutes</span>
                  </td>
                  <td className="text-center p-6">
                    <span className="text-gray-600">Days/Weeks</span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-6">Training Required</td>
                  <td className="text-center p-6">
                    <X className="h-6 w-6 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center p-6">
                    <Check className="h-6 w-6 text-gray-400 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-6">Switch Frameworks</td>
                  <td className="text-center p-6">
                    <Badge className="bg-green-100 text-green-800">Anytime</Badge>
                  </td>
                  <td className="text-center p-6">
                    <Badge variant="secondary">Never</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-center mt-8">
            <Button size="lg" onClick={() => navigate('/register')}>
              Switch to AXP Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-sm text-gray-500 mt-2">Free migration from Ninety.io included</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Teams Love the Freedom
            </h2>
            <p className="text-xl text-gray-600">
              Join hundreds of teams who've escaped rigid software
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2">
              <CardHeader>
                <div className="flex gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  "We switched from EOS to OKRs last year. With Ninety.io, we'd need a new platform. 
                  With AXP, we just changed the terminology. Brilliant."
                </p>
                <p className="font-semibold">Sarah Chen</p>
                <p className="text-sm text-gray-500">COO, TechScale Inc.</p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="flex gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  "The flat pricing alone saves us $7,200 per year. The flexibility to use our own 
                  terminology? Priceless."
                </p>
                <p className="font-semibold">Michael Rodriguez</p>
                <p className="text-sm text-gray-500">CEO, Growth Partners</p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="flex gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  "Finally, software that adapts to how WE work, not the other way around. 
                  Setup took 10 minutes, seriously."
                </p>
                <p className="font-semibold">Jessica Park</p>
                <p className="text-sm text-gray-500">VP Operations, Innovate Co</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Simple, Fair Pricing
            </h2>
            <p className="text-xl text-gray-600">
              No per-user fees. No surprises. Just value.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$99</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <CardDescription className="mt-2">Perfect for small teams</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>Up to 20 users</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>All frameworks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>Custom terminology</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>Email support</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" variant="outline">Get Started</Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-500 relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600">
                Most Popular
              </Badge>
              <CardHeader>
                <CardTitle>Professional</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$199</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <CardDescription className="mt-2">For growing companies</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>Up to 100 users</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>All frameworks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>Custom terminology</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>Data migration help</span>
                  </li>
                </ul>
                <Button className="w-full mt-6">Get Started</Button>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">Custom</span>
                </div>
                <CardDescription className="mt-2">For large organizations</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>Unlimited users</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>All frameworks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>Custom terminology</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>Dedicated support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <span>SLA & Security</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" variant="outline">Contact Sales</Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <Card className="inline-block border-2 border-green-200 bg-green-50">
              <CardContent className="p-6">
                <p className="text-lg font-semibold text-green-800 mb-2">
                  🎉 Switching from Ninety.io?
                </p>
                <p className="text-green-700">
                  Get 50% off for 3 months + free migration assistance
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Break Free from Rigid Software?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join hundreds of teams using AXP to run their business, their way.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" variant="secondary" onClick={() => navigate('/register')}>
              Start 30-Day Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 text-white border-white hover:bg-white/20">
              Schedule Demo
            </Button>
          </div>
          <p className="mt-6 text-blue-100">
            ✓ No credit card required &nbsp;&nbsp; ✓ Setup in 10 minutes &nbsp;&nbsp; ✓ Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-gray-400">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-6 w-6 text-white" />
                <span className="text-white font-bold text-lg">AXP</span>
              </div>
              <p className="text-sm">
                The accountability and execution platform that adapts to your methodology.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/features" className="hover:text-white">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link to="/compare" className="hover:text-white">Compare</Link></li>
                <li><Link to="/frameworks" className="hover:text-white">Frameworks</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="hover:text-white">About</Link></li>
                <li><Link to="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link to="/careers" className="hover:text-white">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy" className="hover:text-white">Privacy</Link></li>
                <li><Link to="/terms" className="hover:text-white">Terms</Link></li>
                <li><Link to="/security" className="hover:text-white">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>© 2024 AXP Platform. All rights reserved.</p>
            <p className="mt-2 text-xs">
              AXP is not affiliated with or endorsed by EOS Worldwide, Ninety.io, or any other business operating system.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPageNew;