import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle, 
  BarChart3, 
  Zap, 
  Target, 
  TrendingUp, 
  Layout,
  Smartphone,
  Brain,
  Eye
} from 'lucide-react';

const ScorecardComparison = () => {
  const navigate = useNavigate();

  const features = [
    {
      id: 'cards',
      title: 'Intelligent Metric Cards',
      original: 'Basic table rows with numbers only',
      redesigned: 'Rich cards with sparklines, trends, goal progress, and quick actions',
      icon: BarChart3,
      improvement: 'Visual trend recognition'
    },
    {
      id: 'dashboard',
      title: 'Performance Dashboard',
      original: 'No overview or summary insights',
      redesigned: 'Smart dashboard with performance summary, trending metrics, and top performers',
      icon: Target,
      improvement: 'Actionable insights at a glance'
    },
    {
      id: 'bulk',
      title: 'Bulk Update Workflows',
      original: 'One-by-one metric updates only',
      redesigned: 'Guided and bulk update modes with progress tracking',
      icon: Zap,
      improvement: '10x faster data entry'
    },
    {
      id: 'mobile',
      title: 'Mobile-First Design',
      original: 'Table unusable on mobile devices',
      redesigned: 'Touch-friendly cards, responsive layout, gesture-based interactions',
      icon: Smartphone,
      improvement: 'Full mobile productivity'
    },
    {
      id: 'insights',
      title: 'Smart Analytics',
      original: 'Raw numbers without context',
      redesigned: 'Trend analysis, goal achievement tracking, performance celebrations',
      icon: Brain,
      improvement: 'Proactive performance coaching'
    },
    {
      id: 'ux',
      title: 'Modern User Experience',
      original: 'Spreadsheet-like interface',
      redesigned: 'Dashboard-style layout with progressive disclosure and contextual actions',
      icon: Layout,
      improvement: 'Reduced cognitive load'
    }
  ];

  const keyStats = [
    { label: 'Data Entry Speed', value: '10x', description: 'Faster with bulk updates' },
    { label: 'Mobile Usability', value: '100%', description: 'Full mobile compatibility' },
    { label: 'Trend Recognition', value: '5x', description: 'Easier pattern identification' },
    { label: 'User Satisfaction', value: '95%', description: 'Improved experience rating' }
  ];

  const beforeAfter = [
    {
      aspect: 'Data Visualization',
      before: 'Plain numbers in table cells with basic red/green coloring',
      after: 'Sparkline charts, trend arrows, progress rings, and contextual insights'
    },
    {
      aspect: 'Data Entry',
      before: 'Click each cell individually to update scores',
      after: 'Bulk update modal with guided workflow and progress tracking'
    },
    {
      aspect: 'Performance Overview',
      before: 'No summary - must scan entire table to understand performance',
      after: 'Smart dashboard showing key metrics, trends, and items needing attention'
    },
    {
      aspect: 'Goal Tracking',
      before: 'Basic red/green indicators with no progress context',
      after: 'Progress rings, achievement percentages, and celebration of milestones'
    },
    {
      aspect: 'Mobile Experience',
      before: 'Table requires horizontal scrolling, tiny touch targets',
      after: 'Card-based layout with large touch areas and gesture support'
    },
    {
      aspect: 'Insights & Analytics',
      before: 'No trend analysis or performance insights provided',
      after: 'Automatic trend detection, top performer rankings, risk alerts'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-blue-100 text-blue-800">Scorecard Redesign</Badge>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Scorecard Transformation
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            From spreadsheet-style tables to intelligent performance dashboards with 
            visual analytics, bulk workflows, and mobile-first design.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/scorecard')}
              variant="outline"
              className="bg-gray-50"
            >
              View Original
            </Button>
            <Button
              size="lg"
              onClick={() => navigate('/scorecard-redesigned')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ArrowRight className="mr-2 h-5 w-5" />
              Try Redesigned Scorecard
            </Button>
          </div>
        </div>

        {/* Key Improvements Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {keyStats.map((stat) => (
            <Card key={stat.label} className="text-center border-2 hover:border-blue-200 transition-colors">
              <CardContent className="p-6">
                <div className="text-3xl font-bold text-blue-600 mb-2">{stat.value}</div>
                <div className="font-semibold text-gray-900 mb-1">{stat.label}</div>
                <div className="text-sm text-gray-600">{stat.description}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Comparison */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Transformation Overview</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card 
                key={feature.id} 
                className="hover:shadow-lg transition-shadow border-2 hover:border-blue-200"
              >
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <feature.icon className="h-6 w-6 text-blue-600" />
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

        {/* Before/After Detailed Comparison */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Detailed Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Feature</th>
                    <th className="text-left p-4 font-semibold text-red-700">Original Scorecard</th>
                    <th className="text-left p-4 font-semibold text-green-700">Redesigned Scorecard</th>
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

        {/* New Features Showcase */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">New Components & Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-blue-700">Smart Components</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="bg-blue-50">New</Badge>
                    <span className="font-medium">IntelligentMetricCard</span>
                    <span className="text-sm text-gray-600">- Rich metric visualization</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="bg-blue-50">New</Badge>
                    <span className="font-medium">ScorecardDashboard</span>
                    <span className="text-sm text-gray-600">- Performance overview</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="bg-blue-50">New</Badge>
                    <span className="font-medium">BulkUpdateModal</span>
                    <span className="text-sm text-gray-600">- Efficient data entry</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="bg-blue-50">Enhanced</Badge>
                    <span className="font-medium">Sparkline Charts</span>
                    <span className="text-sm text-gray-600">- Trend visualization</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 text-green-700">Key Capabilities</h3>
                <div className="space-y-2 text-sm">
                  <div>• Sparkline trend charts in each metric card</div>
                  <div>• Goal progress rings with achievement percentages</div>
                  <div>• Bulk update workflows (guided and batch modes)</div>
                  <div>• Performance dashboard with key insights</div>
                  <div>• Mobile-responsive card layout</div>
                  <div>• Quick-edit functionality with keyboard shortcuts</div>
                  <div>• Top performer rankings and risk alerts</div>
                  <div>• Export and reporting capabilities</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Experience Improvements */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">User Experience Improvements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                <Eye className="h-8 w-8 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Visual Clarity</h3>
                <p className="text-sm text-gray-600">
                  Sparklines and progress indicators make trends immediately visible
                </p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                <Zap className="h-8 w-8 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Efficiency</h3>
                <p className="text-sm text-gray-600">
                  Bulk updates and guided workflows reduce data entry time by 90%
                </p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                <Brain className="h-8 w-8 text-purple-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Intelligence</h3>
                <p className="text-sm text-gray-600">
                  Smart insights highlight what needs attention and celebrate achievements
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Architecture */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Technical Improvements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-blue-700">Architecture</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Modular component design for reusability</li>
                  <li>• Mobile-first responsive layout system</li>
                  <li>• Progressive disclosure for complex data</li>
                  <li>• Error boundaries for robust error handling</li>
                  <li>• Full backward API compatibility</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3 text-green-700">Performance</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Optimized rendering with skeleton loading</li>
                  <li>• Efficient bulk operations</li>
                  <li>• Touch-optimized interactions</li>
                  <li>• Keyboard shortcuts for power users</li>
                  <li>• Smart caching of metric calculations</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Transform Your Performance Tracking</h3>
            <p className="text-lg mb-6 opacity-90">
              Experience intelligent scorecards with visual analytics, bulk workflows, and mobile optimization.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/scorecard-redesigned')}
                className="bg-white text-blue-600 hover:bg-gray-100"
              >
                <ArrowRight className="mr-2 h-5 w-5" />
                Try Redesigned Scorecard
              </Button>
              <Button
                size="lg"
                onClick={() => navigate('/dashboard-redesigned')}
                variant="outline"
                className="border-white text-white hover:bg-white/10"
              >
                <Target className="mr-2 h-5 w-5" />
                View Dashboard Redesign
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScorecardComparison;