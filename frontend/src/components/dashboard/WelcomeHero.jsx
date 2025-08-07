import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sun, 
  Moon, 
  Coffee, 
  Sunset,
  Calendar,
  TrendingUp,
  Target,
  CheckCircle,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const WelcomeHero = ({ 
  user = {}, 
  stats = {}, 
  isOnLeadershipTeam = false,
  quickActions = []
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getTimeBasedGreeting = () => {
    const hour = currentTime.getHours();
    
    if (hour < 12) {
      return {
        greeting: 'Good morning',
        icon: Sun,
        message: 'Ready to make today productive?',
        gradient: 'from-yellow-400 via-orange-500 to-pink-500'
      };
    } else if (hour < 17) {
      return {
        greeting: 'Good afternoon',
        icon: Coffee,
        message: 'Keep the momentum going!',
        gradient: 'from-blue-500 via-purple-500 to-indigo-600'
      };
    } else {
      return {
        greeting: 'Good evening',
        icon: Sunset,
        message: 'Time to wrap up and plan ahead.',
        gradient: 'from-purple-600 via-pink-500 to-red-500'
      };
    }
  };

  const getMotivationalMessage = () => {
    if (stats.prioritiesProgress >= 80) {
      return {
        message: "You're crushing your quarterly goals! 🔥",
        color: 'text-green-100',
        icon: TrendingUp
      };
    } else if (stats.prioritiesProgress >= 60) {
      return {
        message: "Great progress on your priorities this quarter!",
        color: 'text-blue-100',
        icon: Target
      };
    } else if (stats.overdueItems === 0) {
      return {
        message: "No overdue items - you're staying on top of things!",
        color: 'text-green-100',
        icon: CheckCircle
      };
    } else {
      return {
        message: "Every great achievement starts with small steps.",
        color: 'text-white',
        icon: Zap
      };
    }
  };

  const getDayInfo = () => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return currentTime.toLocaleDateString('en-US', options);
  };

  const getStreakInfo = () => {
    // This would ideally come from backend analytics
    // For now, we'll simulate some streak data
    const streaks = [];
    
    if (stats.overdueItems === 0) {
      streaks.push({ label: 'No overdue items', days: 3, color: 'bg-green-500' });
    }
    
    if (stats.prioritiesProgress > 0) {
      streaks.push({ label: 'Active on priorities', days: 7, color: 'bg-blue-500' });
    }

    return streaks;
  };

  const timeInfo = getTimeBasedGreeting();
  const motivationalInfo = getMotivationalMessage();
  const streaks = getStreakInfo();

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${timeInfo.gradient} text-white`}>
      {/* Background decoration */}
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 transform translate-x-32 -translate-y-32" />
      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 transform -translate-x-16 translate-y-16" />
      
      <div className="relative p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          {/* Main greeting content */}
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <timeInfo.icon className="h-8 w-8 text-white/90" />
              <div>
                <h1 className="text-3xl font-bold">
                  {timeInfo.greeting}, {user.firstName}!
                </h1>
                <p className="text-white/80 text-lg mt-1">
                  {timeInfo.message}
                </p>
              </div>
            </div>

            {/* Date and motivational message */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2 text-white/70">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">{getDayInfo()}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <motivationalInfo.icon className="h-4 w-4 text-white/90" />
                <span className={`text-sm font-medium ${motivationalInfo.color}`}>
                  {motivationalInfo.message}
                </span>
              </div>
            </div>

            {/* Streak indicators */}
            {streaks.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {streaks.map((streak, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="bg-white/20 text-white border-white/30 text-xs"
                  >
                    {streak.label} • {streak.days} days
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Quick stats and actions */}
          <div className="lg:ml-8 mt-6 lg:mt-0">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              {/* Quick stats */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {stats.prioritiesCompleted}/{stats.totalPriorities}
                  </div>
                  <div className="text-xs text-white/80 mt-1">
                    {isOnLeadershipTeam ? 'Company Priorities' : 'Your Priorities'}
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-1.5 mt-2">
                    <div 
                      className="bg-white rounded-full h-1.5 transition-all duration-300"
                      style={{ width: `${stats.prioritiesProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick action */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="text-center">
                  <Link to="/quarterly-priorities">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm w-full"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      View Goals
                    </Button>
                  </Link>
                  <div className="text-xs text-white/70 mt-2">
                    {stats.overdueItems > 0 ? `${stats.overdueItems} items need attention` : 'All up to date'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom action bar for mobile */}
        <div className="lg:hidden mt-6 pt-4 border-t border-white/20">
          <div className="flex justify-center space-x-4">
            {quickActions.slice(0, 3).map((action, index) => (
              <Link key={index} to={action.link}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/20 text-xs"
                >
                  <action.icon className="h-4 w-4 mr-1" />
                  {action.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeHero;