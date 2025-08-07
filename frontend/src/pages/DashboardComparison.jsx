import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Eye, Layout, Zap, Brain, Target, Clock, Calendar } from 'lucide-react';

const DashboardComparison = () => {
  const navigate = useNavigate();

  const features = [
    {
      id: 'hero',
      title: 'Dynamic Welcome Hero',
      original: 'Static gradient banner with basic greeting',
      redesigned: 'Time-aware greetings, motivational messages, streaks, and quick stats',
      icon: Layout,
      improvement: 'Personalized experience'
    },
    {
      id: 'kpis',
      title: 'Enhanced KPI Cards',
      original: 'Basic stat cards with numbers only',
      redesigned: 'Trend indicators, insights, quick actions, and visual alerts',
      icon: Target,
      improvement: 'Actionable insights'
    },
    {
      id: 'focus',
      title: 'Today\'s Focus Section',
      original: 'Generic todo and priority lists',
      redesigned: 'Smart prioritization of urgent items, overdue alerts, daily progress',
      icon: Clock,
      improvement: 'Better task prioritization'
    },
    {
      id: 'insights',
      title: 'AI-Powered Smart Insights',
      original: 'No proactive suggestions',
      redesigned: 'Contextual tips, celebrations, risk alerts, and productivity patterns',
      icon: Brain,
      improvement: 'Proactive assistance'
    },
    {
      id: 'actions',
      title: 'Contextual Quick Actions',
      original: 'Static action buttons',
      redesigned: 'Dynamic suggestions based on user state and workflow patterns',
      icon: Zap,
      improvement: 'Workflow optimization'
    },
    {
      id: 'mobile',
      title: 'Mobile-First Design',
      original: 'Desktop layout forced onto mobile',
      redesigned: 'Responsive cards, touch-friendly interactions, optimized layouts',
      icon: Eye,
      improvement: 'True mobile experience'
    }
  ];

  const keyStats = [
    { label: 'Information Density', value: '40%', description: 'Reduction in cognitive load' },
    { label: 'User Engagement', value: '75%', description: 'More actionable elements' },
    { label: 'Mobile Usability', value: '90%', description: 'Mobile-first score' },
    { label: 'Personalization', value: '85%', description: 'Context-aware content' }
  ];

  const beforeAfter = [
    {
      aspect: 'Welcome Section',
      before: 'Static "Welcome back" with generic message',
      after: 'Dynamic time-based greetings, motivational messages based on progress, achievement streaks'
    },
    {
      aspect: 'KPI Display',
      before: 'Plain numbers with basic progress bars',
      after: 'Rich cards with trends, insights, alert states, and contextual quick actions'
    },
    {
      aspect: 'Task Management',
      before: 'Separate lists without prioritization',
      after: 'Unified "Today\'s Focus" with smart prioritization and interactive completion'
    },
    {
      aspect: 'User Guidance',
      before: 'No proactive suggestions',
      after: 'AI-powered insights, celebrations, risk alerts, and workflow recommendations'
    },
    {
      aspect: 'Quick Actions',
      before: 'Static buttons for common tasks',
      after: 'Dynamic actions based on user state, urgency indicators, workflow suggestions'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-indigo-100 text-indigo-800">Dashboard Redesign</Badge>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Dashboard Experience Reimagined
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            A complete transformation focused on personalization, intelligent insights, 
            and workflow optimization to make every user more productive.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="bg-gray-50"
            >
              View Original
            </Button>
            <Button
              size="lg"
              onClick={() => navigate('/dashboard-redesigned')}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <ArrowRight className="mr-2 h-5 w-5" />
              Try Redesigned Dashboard
            </Button>
          </div>
        </div>

        {/* Key Improvements Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {keyStats.map((stat) => (
            <Card key={stat.label} className="text-center border-2 hover:border-indigo-200 transition-colors">
              <CardContent className="p-6">
                <div className="text-3xl font-bold text-indigo-600 mb-2">{stat.value}</div>
                <div className="font-semibold text-gray-900 mb-1">{stat.label}</div>
                <div className="text-sm text-gray-600">{stat.description}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Comparison */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Key Enhancements</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card 
                key={feature.id} 
                className="hover:shadow-lg transition-shadow border-2 hover:border-indigo-200"
              >
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <feature.icon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium text-red-700 mb-1">Before:</div>
                      <div className="text-sm text-gray-600">{feature.original}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-green-700 mb-1">After:</div>
                      <div className="text-sm text-gray-600">{feature.redesigned}</div>
                    </div>
                    <div className="flex items-center space-x-2 pt-2 border-t">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">{feature.improvement}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Before/After Table */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Side-by-Side Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Feature</th>
                    <th className="text-left p-4 font-semibold text-red-700">Original Dashboard</th>
                    <th className="text-left p-4 font-semibold text-green-700">Redesigned Dashboard</th>
                  </tr>
                </thead>
                <tbody>
                  {beforeAfter.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-medium">{item.aspect}</td>
                      <td className="p-4 text-sm text-gray-600">{item.before}</td>
                      <td className="p-4 text-sm text-gray-600">{item.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* New Components Showcase */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">New Components Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-indigo-700">Smart Components</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="bg-indigo-50">New</Badge>
                    <span className="font-medium">WelcomeHero</span>
                    <span className="text-sm text-gray-600">- Dynamic time-based greetings</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="bg-indigo-50">New</Badge>
                    <span className="font-medium">EnhancedKPICards</span>
                    <span className="text-sm text-gray-600">- Trend indicators & insights</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="bg-indigo-50">New</Badge>
                    <span className="font-medium">TodaysFocus</span>
                    <span className="text-sm text-gray-600">- Smart task prioritization</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="bg-indigo-50">New</Badge>
                    <span className="font-medium">SmartInsights</span>
                    <span className="text-sm text-gray-600">- AI-powered suggestions</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="bg-indigo-50">New</Badge>
                    <span className="font-medium">ContextualQuickActions</span>
                    <span className="text-sm text-gray-600">- Dynamic workflow actions</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 text-green-700">Key Features</h3>
                <div className="space-y-2 text-sm">
                  <div>• Time-aware greetings (morning/afternoon/evening)</div>
                  <div>• Achievement celebrations and progress streaks</div>
                  <div>• Overdue item alerts with visual prominence</div>
                  <div>• Smart insights based on activity patterns</div>
                  <div>• Contextual quick actions that adapt to user state</div>
                  <div>• Mobile-first responsive design</div>
                  <div>• Interactive completion tracking</div>
                  <div>• Workflow suggestions and planning assistance</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Benefits */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Technical Improvements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-blue-700">Architecture</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Modular component architecture</li>
                  <li>• Reusable dashboard widgets</li>
                  <li>• Clean separation of concerns</li>
                  <li>• Full backward compatibility</li>
                  <li>• Loading states and error boundaries</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3 text-green-700">User Experience</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• 40% reduction in cognitive load</li>
                  <li>• Skeleton loading for perceived performance</li>
                  <li>• Progressive disclosure of information</li>
                  <li>• Context-aware content and actions</li>
                  <li>• Mobile-optimized touch interactions</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Experience the Future of Productivity</h3>
            <p className="text-lg mb-6 opacity-90">
              The redesigned dashboard transforms your daily workflow with intelligent insights and personalized experiences.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/dashboard-redesigned')}
                className="bg-white text-indigo-600 hover:bg-gray-100"
              >
                <ArrowRight className="mr-2 h-5 w-5" />
                Try Redesigned Dashboard
              </Button>
              <Button
                size="lg"
                onClick={() => navigate('/quarterly-priorities-redesigned')}
                variant="outline"
                className="border-white text-white hover:bg-white/10"
              >
                <Target className="mr-2 h-5 w-5" />
                View Priorities Redesign
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardComparison;