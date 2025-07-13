import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  User
} from 'lucide-react';

const ScorecardCard = ({ metric, readOnly = false }) => {
  const isOnTrack = metric.actual_value >= metric.target_value;
  const percentage = metric.target_value ? ((metric.actual_value / metric.target_value) * 100).toFixed(0) : 0;

  return (
    <Card className={`${!isOnTrack ? 'border-red-200' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-medium">{metric.metric_name}</h3>
            {metric.owner_first_name && (
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                <User className="h-3 w-3" />
                <span>{metric.owner_first_name} {metric.owner_last_name}</span>
              </div>
            )}
          </div>
          <div className={`p-2 rounded-full ${isOnTrack ? 'bg-green-100' : 'bg-red-100'}`}>
            {isOnTrack ? (
              <TrendingUp className={`h-5 w-5 text-green-600`} />
            ) : (
              <TrendingDown className={`h-5 w-5 text-red-600`} />
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-500">Target</p>
            <p className="text-lg font-semibold">{metric.target_value}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Actual</p>
            <p className={`text-lg font-semibold ${isOnTrack ? 'text-green-600' : 'text-red-600'}`}>
              {metric.actual_value}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Progress</p>
            <p className="text-lg font-semibold">{percentage}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScorecardCard;