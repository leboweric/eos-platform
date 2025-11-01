import React from 'react';
import HealthIndicator from './HealthIndicator';
import { 
  Activity, 
  Clock, 
  Database, 
  Wifi, 
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

const MetricCard = ({ 
  title, 
  healthStatus, 
  metrics = [], 
  footer,
  chart,
  className = ''
}) => {
  const getIconComponent = (iconName) => {
    const icons = {
      Activity,
      Clock,
      Database,
      Wifi,
      AlertTriangle,
      TrendingUp,
      TrendingDown
    };
    return icons[iconName] || Activity;
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <HealthIndicator status={healthStatus} size="md" />
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        {metrics.map((metric, index) => {
          const IconComponent = metric.icon ? getIconComponent(metric.icon) : null;
          
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {IconComponent && (
                  <IconComponent className="w-4 h-4 text-gray-500" />
                )}
                <span className="text-sm text-gray-600">{metric.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${
                  metric.highlight ? 'text-lg' : 'text-base'
                } ${
                  metric.color || 'text-gray-900'
                }`}>
                  {metric.value}
                </span>
                {metric.trend && (
                  <span className={`text-xs ${
                    metric.trend > 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {metric.trend > 0 ? '↑' : '↓'} {Math.abs(metric.trend)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart (optional) */}
      {chart && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {chart}
        </div>
      )}

      {/* Footer (optional) */}
      {footer && (
        <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
          {footer}
        </div>
      )}
    </div>
  );
};

export default MetricCard;