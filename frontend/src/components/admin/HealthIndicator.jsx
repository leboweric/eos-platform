import React from 'react';

const HealthIndicator = ({ status, size = 'md', showLabel = false }) => {
  const getColor = () => {
    switch (status) {
      case 'green':
      case 'healthy':
        return 'bg-green-500';
      case 'yellow':
      case 'degraded':
        return 'bg-yellow-500';
      case 'red':
      case 'critical':
      case 'error':
      case 'down':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2';
      case 'md':
        return 'w-3 h-3';
      case 'lg':
        return 'w-4 h-4';
      default:
        return 'w-3 h-3';
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'green':
      case 'healthy':
        return 'Healthy';
      case 'yellow':
      case 'degraded':
        return 'Degraded';
      case 'red':
      case 'critical':
      case 'error':
      case 'down':
        return 'Critical';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`${getSizeClasses()} ${getColor()} rounded-full animate-pulse`} />
      {showLabel && (
        <span className="text-sm text-gray-600">{getLabel()}</span>
      )}
    </div>
  );
};

export default HealthIndicator;