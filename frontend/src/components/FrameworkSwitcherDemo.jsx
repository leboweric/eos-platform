import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, RefreshCw } from 'lucide-react';

const FrameworkSwitcherDemo = () => {
  const frameworks = [
    {
      name: 'EOS',
      fullName: 'Entrepreneurial Operating System',
      colorClass: 'text-blue-600',
      bgColorClass: 'bg-blue-600',
      borderColorClass: 'border-blue-600',
      terms: {
        priorities: 'Rocks',
        scorecard: 'Scorecard',
        issues: 'Issues',
        todos: 'To-Dos',
        blueprint: 'V/TO™',
        meetings: 'Level 10 Meetings'
      }
    },
    {
      name: '4DX',
      fullName: '4 Disciplines of Execution',
      colorClass: 'text-green-600',
      bgColorClass: 'bg-green-600',
      borderColorClass: 'border-green-600',
      terms: {
        priorities: 'WIGs',
        scorecard: 'Scoreboard',
        issues: 'Barriers',
        todos: 'Commitments',
        blueprint: 'Strategic Plan',
        meetings: 'WIG Sessions'
      }
    },
    {
      name: 'OKRs',
      fullName: 'Objectives & Key Results',
      colorClass: 'text-purple-600',
      bgColorClass: 'bg-purple-600',
      borderColorClass: 'border-purple-600',
      terms: {
        priorities: 'Key Results',
        scorecard: 'Metrics Dashboard',
        issues: 'Blockers',
        todos: 'Action Items',
        blueprint: 'Strategy Map',
        meetings: 'Check-ins'
      }
    },
    {
      name: 'Scaling Up',
      fullName: 'Rockefeller Habits',
      colorClass: 'text-orange-600',
      bgColorClass: 'bg-orange-600',
      borderColorClass: 'border-orange-600',
      terms: {
        priorities: 'Priorities',
        scorecard: 'KPIs',
        issues: 'Obstacles',
        todos: 'Action Items',
        blueprint: 'One-Page Plan',
        meetings: 'Daily Huddles'
      }
    },
    {
      name: 'Custom',
      fullName: 'Your Methodology',
      colorClass: 'text-indigo-600',
      bgColorClass: 'bg-indigo-600',
      borderColorClass: 'border-indigo-600',
      terms: {
        priorities: 'Initiatives',
        scorecard: 'Performance Metrics',
        issues: 'Challenges',
        todos: 'Tasks',
        blueprint: 'Strategic Plan',
        meetings: 'Team Syncs'
      }
    }
  ];

  const [currentFramework, setCurrentFramework] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay) return;
    
    const interval = setInterval(() => {
      handleSwitch();
    }, 3000);

    return () => clearInterval(interval);
  }, [currentFramework, autoPlay]);

  const handleSwitch = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentFramework((prev) => (prev + 1) % frameworks.length);
      setIsAnimating(false);
    }, 300);
  };

  const framework = frameworks[currentFramework];

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Framework Selector */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Active Framework</h3>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={autoPlay ? "default" : "outline"}
                onClick={() => setAutoPlay(!autoPlay)}
                className="text-xs"
              >
                {autoPlay ? 'Auto-Playing' : 'Paused'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSwitch}
                disabled={autoPlay}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Framework Pills */}
          <div className="flex flex-wrap gap-2">
            {frameworks.map((fw, index) => (
              <Badge
                key={fw.name}
                variant={index === currentFramework ? "default" : "outline"}
                className={`cursor-pointer transition-all ${
                  index === currentFramework 
                    ? `${fw.bgColorClass} text-white ${fw.borderColorClass}` 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  setAutoPlay(false);
                  setCurrentFramework(index);
                }}
              >
                {fw.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Animated Content */}
        <div className="p-6">
          <div className={`transition-all duration-300 ${isAnimating ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'}`}>
            {/* Framework Name */}
            <div className="text-center mb-6">
              <h4 className={`text-2xl font-bold ${framework.colorClass} mb-1`}>
                {framework.name}
              </h4>
              <p className="text-sm text-gray-500">{framework.fullName}</p>
            </div>

            {/* Terminology Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(framework.terms).map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className={`font-semibold ${framework.colorClass}`}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Sample Interface */}
            <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
              <div className="text-sm text-gray-600 mb-2">Your interface adapts:</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">
                    "Add new {framework.terms.priorities}" button appears in navigation
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">
                    "{framework.terms.scorecard}" shows your metrics
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">
                    "{framework.terms.meetings}" for team alignment
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <p className="text-xs text-gray-500 text-center">
            One platform • Multiple frameworks • Zero data loss • Instant switching
          </p>
        </div>
      </div>
    </div>
  );
};

export default FrameworkSwitcherDemo;