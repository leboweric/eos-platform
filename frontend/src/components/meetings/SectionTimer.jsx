import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  SkipForward,
  TrendingUp,
  Target,
  Users,
  Newspaper,
  CheckSquare,
  MessageSquare
} from 'lucide-react';

// Icon mapping for sections
const SECTION_ICONS = {
  segue: Users,
  scorecard: TrendingUp,
  rock_review: Target,
  headlines: Newspaper,
  todos: CheckSquare,
  ids: MessageSquare,
  conclude: CheckCircle
};

const SectionTimer = ({ 
  section, 
  sectionConfig,
  currentDuration = 0,
  isPaused = false,
  meetingPace = 'on-track',
  onNextSection,
  onExtendTime
}) => {
  const [localDuration, setLocalDuration] = useState(currentDuration);
  const allocated = sectionConfig?.duration ? sectionConfig.duration * 60 : 300; // Convert to seconds
  
  // Update local duration every second when not paused
  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setLocalDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPaused]);

  // Reset local duration when section changes
  useEffect(() => {
    setLocalDuration(currentDuration);
  }, [section, currentDuration]);

  const formatTime = (seconds) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    const sign = seconds < 0 ? '-' : '';
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressColor = () => {
    const percentage = (localDuration / allocated) * 100;
    if (percentage > 120) return 'bg-red-500';
    if (percentage > 100) return 'bg-orange-500';
    if (percentage > 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTimeColorClass = () => {
    const percentage = (localDuration / allocated) * 100;
    if (percentage > 120) return 'text-red-600';
    if (percentage > 100) return 'text-orange-600';
    if (percentage > 80) return 'text-yellow-600';
    return 'text-gray-700';
  };

  const getPaceIndicator = () => {
    switch (meetingPace) {
      case 'critical':
        return { color: 'text-red-600', text: 'Critical - Very Behind' };
      case 'behind':
        return { color: 'text-orange-600', text: 'Behind Schedule' };
      case 'ahead':
        return { color: 'text-blue-600', text: 'Ahead of Schedule' };
      default:
        return { color: 'text-green-600', text: 'On Track' };
    }
  };

  const isOvertime = localDuration > allocated;
  const overtimeSeconds = localDuration - allocated;
  const progressPercentage = Math.min((localDuration / allocated) * 100, 100);

  const Icon = SECTION_ICONS[section] || Clock;
  const paceInfo = getPaceIndicator();

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/50">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-gray-600" />
          <div>
            <h3 className="font-semibold text-gray-800">
              {sectionConfig?.name || section}
            </h3>
            {sectionConfig?.description && (
              <p className="text-xs text-gray-500">{sectionConfig.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Meeting Pace Indicator */}
          <span className={`text-xs font-medium ${paceInfo.color}`}>
            {paceInfo.text}
          </span>
        </div>
      </div>

      {/* Time Display */}
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${getTimeColorClass()}`}>
            {formatTime(localDuration)}
          </span>
          <span className="text-gray-400">/</span>
          <span className="text-lg text-gray-600">
            {formatTime(allocated)}
          </span>
        </div>

        {isOvertime && (
          <div className="flex items-center gap-1 text-orange-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">
              +{formatTime(overtimeSeconds)} over
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="relative">
          <Progress 
            value={progressPercentage} 
            className="h-2"
            indicatorClassName={getProgressColor()}
          />
          {isOvertime && (
            <div className="absolute top-0 left-full ml-1 h-2 bg-red-500 rounded-r"
              style={{ width: `${Math.min(overtimeSeconds / 60, 100)}px` }}
            />
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onNextSection}
          className="flex-1"
        >
          <SkipForward className="w-4 h-4 mr-1" />
          Next Section
        </Button>
        
        {isOvertime && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onExtendTime(5)}
            className="flex-1"
          >
            <Clock className="w-4 h-4 mr-1" />
            +5 min
          </Button>
        )}
      </div>

      {/* Optional: Section Tips */}
      {isOvertime && (
        <div className="mt-3 p-2 bg-orange-50 rounded-lg">
          <p className="text-xs text-orange-700">
            💡 Tip: Consider moving remaining items to the parking lot or scheduling a follow-up discussion
          </p>
        </div>
      )}
    </div>
  );
};

export default SectionTimer;