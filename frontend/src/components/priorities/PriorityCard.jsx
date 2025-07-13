import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Target,
  User,
  Calendar,
  CheckCircle
} from 'lucide-react';

const PriorityCard = ({ priority, readOnly = false }) => {
  const statusColors = {
    'on-track': 'bg-green-100 text-green-700 border-green-200',
    'off-track': 'bg-red-100 text-red-700 border-red-200',
    'complete': 'bg-blue-100 text-blue-700 border-blue-200'
  };

  const statusIcons = {
    'on-track': <Target className="h-4 w-4" />,
    'off-track': <Target className="h-4 w-4" />,
    'complete': <CheckCircle className="h-4 w-4" />
  };

  return (
    <Card className={priority.status === 'off-track' ? 'border-red-200' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-medium">{priority.title}</h3>
            {priority.description && (
              <p className="text-sm text-gray-600 mt-1">{priority.description}</p>
            )}
          </div>
          <Badge variant="outline" className={statusColors[priority.status] || statusColors['on-track']}>
            <span className="flex items-center gap-1">
              {statusIcons[priority.status] || statusIcons['on-track']}
              {priority.status || 'on-track'}
            </span>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {priority.owner_first_name && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{priority.owner_first_name} {priority.owner_last_name}</span>
            </div>
          )}
          {priority.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(priority.due_date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PriorityCard;