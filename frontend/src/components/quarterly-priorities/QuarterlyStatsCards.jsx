import { Card, CardContent } from '@/components/ui/card';
import { CheckSquare, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';

const QuarterlyStatsCards = ({ priorities = [] }) => {
  const stats = {
    total: priorities.length,
    completed: priorities.filter(p => p.status === 'complete').length,
    onTrack: priorities.filter(p => p.status === 'on-track').length,
    offTrack: priorities.filter(p => p.status === 'off-track').length
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const onTrackRate = stats.total > 0 ? Math.round(((stats.completed + stats.onTrack) / stats.total) * 100) : 0;

  const StatCard = ({ title, value, subtitle, icon: Icon, color, bgColor, textColor }) => (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-gray-600 font-medium">{title}</p>
            <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
            {subtitle && (
              <p className={`text-sm font-medium ${textColor}`}>
                {subtitle}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-full ${bgColor}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Priorities"
        value={stats.total}
        subtitle={`${completionRate}% Complete`}
        icon={CheckSquare}
        color="text-gray-600"
        bgColor="bg-gray-100"
        textColor={
          completionRate >= 80 ? 'text-green-600' :
          completionRate >= 60 ? 'text-blue-600' :
          'text-red-600'
        }
      />

      <StatCard
        title="Completed"
        value={stats.completed}
        icon={CheckCircle}
        color="text-green-600"
        bgColor="bg-green-100"
        textColor="text-green-600"
      />

      <StatCard
        title="On Track"
        value={stats.onTrack}
        subtitle={`${onTrackRate}% Total Health`}
        icon={TrendingUp}
        color="text-blue-600"
        bgColor="bg-blue-100"
        textColor="text-blue-600"
      />

      <StatCard
        title="Off Track"
        value={stats.offTrack}
        icon={AlertTriangle}
        color="text-red-600"
        bgColor="bg-red-100"
        textColor="text-red-600"
      />
    </div>
  );
};

export default QuarterlyStatsCards;