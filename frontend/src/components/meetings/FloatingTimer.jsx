import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Pause, 
  Play, 
  X,
  Minimize2,
  Maximize2,
  AlertTriangle,
  Move
} from 'lucide-react';

const FloatingTimer = ({ 
  elapsed = 0,
  sectionElapsed = 0,
  isPaused = false,
  section,
  sectionConfig,
  meetingPace = 'on-track',
  onPauseResume,
  onClose,
  onSectionClick,
  isLeader = false
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [dockPosition, setDockPosition] = useState(() => {
    return localStorage.getItem('timerDockPosition') || 'bottom-right';
  });

  useEffect(() => {
    localStorage.setItem('timerDockPosition', dockPosition);
  }, [dockPosition]);

  const toggleDockPosition = () => {
    setDockPosition(prev => prev === 'bottom-right' ? 'top-right' : 'bottom-right');
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSectionTime = (seconds, allocated) => {
    const mins = Math.floor(seconds / 60);
    const allocatedMins = Math.floor(allocated / 60);
    return `${mins}/${allocatedMins}m`;
  };

  const getPaceColor = () => {
    switch (meetingPace) {
      case 'critical': return 'bg-red-500 border-red-600';
      case 'behind': return 'bg-orange-500 border-orange-600';
      case 'ahead': return 'bg-blue-500 border-blue-600';
      default: return 'bg-green-500 border-green-600';
    }
  };

  const getSectionProgress = () => {
    if (!sectionConfig?.duration) return 0;
    const allocated = sectionConfig.duration * 60;
    return Math.min((sectionElapsed / allocated) * 100, 100);
  };

  const isOvertime = sectionConfig && sectionElapsed > (sectionConfig.duration * 60);

  const positionClasses = dockPosition === 'top-right' 
    ? 'fixed top-4 right-4 z-50'
    : 'fixed bottom-4 right-4 z-50';

  if (isMinimized) {
    return (
      <div className={positionClasses}>
        <div className={`${getPaceColor()} rounded-full p-3 shadow-lg cursor-pointer border-2`}
          onClick={() => setIsMinimized(false)}>
          <div className="flex items-center gap-2 text-white">
            <Clock className="w-5 h-5" />
            <span className="font-bold">{formatTime(elapsed)}</span>
            {isPaused && <Pause className="w-4 h-4" />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${positionClasses} w-80`}>
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200">
        {/* Header */}
        <div className={`${getPaceColor()} text-white px-4 py-2 rounded-t-lg`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">Meeting Timer</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleDockPosition}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title={dockPosition === 'top-right' ? 'Move to bottom' : 'Move to top'}
              >
                <Move className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Minimize"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Close timer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Timer */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-3xl font-bold text-gray-800">
                {formatTime(elapsed)}
              </div>
              {isPaused && (
                <span className="text-xs text-orange-600 font-medium">PAUSED</span>
              )}
            </div>
            {isLeader && (
              <Button
                size="sm"
                variant={isPaused ? "default" : "outline"}
                onClick={onPauseResume}
                className="ml-2"
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4 mr-1" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-1" />
                    Pause
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Pace Indicator */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Meeting pace:</span>
            <span className={`font-medium ${
              meetingPace === 'critical' ? 'text-red-600' :
              meetingPace === 'behind' ? 'text-orange-600' :
              meetingPace === 'ahead' ? 'text-blue-600' :
              'text-green-600'
            }`}>
              {meetingPace === 'critical' ? 'Critical' :
               meetingPace === 'behind' ? 'Behind' :
               meetingPace === 'ahead' ? 'Ahead' :
               'On Track'}
            </span>
          </div>
        </div>

        {/* Current Section */}
        {section && sectionConfig && (
          <div className="p-4">
            <div 
              className="cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded transition-colors"
              onClick={() => onSectionClick && onSectionClick(section)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {sectionConfig.name}
                </span>
                <span className={`text-sm font-bold ${
                  isOvertime ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {formatSectionTime(sectionElapsed, sectionConfig.duration * 60)}
                </span>
              </div>

              {/* Section Progress Bar */}
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`absolute top-0 left-0 h-full transition-all duration-1000 ${
                    isOvertime ? 'bg-red-500' : 
                    getSectionProgress() > 80 ? 'bg-yellow-500' : 
                    'bg-green-500'
                  }`}
                  style={{ width: `${getSectionProgress()}%` }}
                />
              </div>

              {isOvertime && (
                <div className="flex items-center gap-1 mt-1 text-red-600">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-xs">
                    {Math.floor((sectionElapsed - sectionConfig.duration * 60) / 60)} min over
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingTimer;