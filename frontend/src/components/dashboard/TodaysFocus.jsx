import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Target, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  User,
  Zap,
  ChevronRight,
  Star,
  Flag
} from 'lucide-react';
import { Link } from 'react-router-dom';

const TodaysFocus = ({ 
  priorities = [], 
  todos = [], 
  overdueTodos = [],
  onUpdateTodo,
  onUpdatePriority 
}) => {
  const [completedItems, setCompletedItems] = useState(new Set());

  // Get today's most important items
  const getTodaysFocus = () => {
    const focusItems = [];
    
    // Add overdue items first (highest priority)
    overdueTodos.slice(0, 2).forEach(todo => {
      focusItems.push({
        id: `todo-${todo.id}`,
        type: 'overdue-todo',
        title: todo.title,
        subtitle: `Overdue since ${new Date(todo.due_date).toLocaleDateString()}`,
        priority: 'high',
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        action: () => onUpdateTodo?.(todo.id, { status: 'completed' }),
        link: '/todos',
        progress: null,
        isOverdue: true,
        originalItem: todo
      });
    });

    // Add high-priority or off-track priorities
    const urgentPriorities = priorities
      .filter(p => p.status === 'off-track' || p.status === 'at-risk')
      .slice(0, 2);
    
    urgentPriorities.forEach(priority => {
      focusItems.push({
        id: `priority-${priority.id}`,
        type: 'priority',
        title: priority.title,
        subtitle: `${priority.progress}% complete • Due ${new Date(priority.dueDate).toLocaleDateString()}`,
        priority: priority.status === 'off-track' ? 'high' : 'medium',
        icon: Target,
        color: priority.status === 'off-track' ? 'text-red-600' : 'text-orange-600',
        bgColor: priority.status === 'off-track' ? 'bg-red-50' : 'bg-orange-50',
        borderColor: priority.status === 'off-track' ? 'border-red-200' : 'border-orange-200',
        action: null,
        link: '/quarterly-priorities',
        progress: priority.progress,
        isOverdue: false,
        originalItem: priority
      });
    });

    // Add today's todos (non-overdue)
    const todaysTodos = todos
      .filter(todo => {
        const dueDate = todo.due_date ? new Date(todo.due_date) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dueDate && dueDate.toDateString() === today.toDateString();
      })
      .slice(0, 2);

    todaysTodos.forEach(todo => {
      if (!focusItems.some(item => item.id === `todo-${todo.id}`)) {
        focusItems.push({
          id: `todo-${todo.id}`,
          type: 'todo',
          title: todo.title,
          subtitle: `Due today • ${todo.assignedTo?.name || 'Assigned to you'}`,
          priority: todo.priority || 'medium',
          icon: CheckCircle,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          action: () => onUpdateTodo?.(todo.id, { status: 'completed' }),
          link: '/todos',
          progress: null,
          isOverdue: false,
          originalItem: todo
        });
      }
    });

    // If we don't have enough items, add some in-progress priorities
    if (focusItems.length < 3) {
      const activePriorities = priorities
        .filter(p => p.status === 'on-track' && p.progress < 100)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 3 - focusItems.length);

      activePriorities.forEach(priority => {
        focusItems.push({
          id: `priority-${priority.id}`,
          type: 'priority',
          title: priority.title,
          subtitle: `${priority.progress}% complete • On track`,
          priority: 'normal',
          icon: Target,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          action: null,
          link: '/quarterly-priorities',
          progress: priority.progress,
          isOverdue: false,
          originalItem: priority
        });
      });
    }

    return focusItems.slice(0, 4); // Max 4 items
  };

  const handleItemComplete = (item) => {
    if (item.action) {
      item.action();
      setCompletedItems(prev => new Set([...prev, item.id]));
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <Flag className="h-3 w-3 text-red-500" />;
      case 'medium': return <Star className="h-3 w-3 text-orange-500" />;
      default: return <Clock className="h-3 w-3 text-gray-500" />;
    }
  };

  const focusItems = getTodaysFocus();

  if (focusItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <CardTitle>Today's Focus</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-600 text-sm">No urgent items need your attention today.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <CardTitle>Today's Focus</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {focusItems.filter(item => !completedItems.has(item.id)).length} active
            </Badge>
          </div>
          <div className="text-xs text-gray-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {focusItems.map((item) => {
            const isCompleted = completedItems.has(item.id);
            
            return (
              <div 
                key={item.id} 
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-all duration-200 ${
                  item.isOverdue ? 'bg-red-50 border-red-200' : 
                  isCompleted ? 'bg-gray-50 border-gray-200 opacity-60' :
                  `${item.bgColor} ${item.borderColor} hover:shadow-sm`
                }`}
              >
                {/* Checkbox for todos */}
                {item.type.includes('todo') && (
                  <div className="mt-0.5">
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={() => handleItemComplete(item)}
                      className={isCompleted ? 'opacity-50' : ''}
                    />
                  </div>
                )}

                {/* Icon for priorities */}
                {item.type === 'priority' && (
                  <div className={`p-1.5 rounded ${item.bgColor} mt-0.5`}>
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium text-sm ${
                        isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
                      } truncate`}>
                        {item.title}
                      </h4>
                      <p className={`text-xs mt-1 ${
                        isCompleted ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {item.subtitle}
                      </p>
                      
                      {/* Progress bar for priorities */}
                      {item.progress !== null && !isCompleted && (
                        <div className="mt-2">
                          <Progress value={item.progress} className="h-1.5" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-2">
                      {getPriorityIcon(item.priority)}
                      <Link to={item.link}>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Overdue warning */}
                  {item.isOverdue && !isCompleted && (
                    <div className="mt-2 flex items-center space-x-1">
                      <AlertTriangle className="h-3 w-3 text-red-600" />
                      <span className="text-xs text-red-700 font-medium">Overdue</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Progress summary */}
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Daily Progress</span>
              <span>
                {completedItems.size} of {focusItems.length} completed
              </span>
            </div>
            <Progress 
              value={(completedItems.size / focusItems.length) * 100} 
              className="h-1.5 mt-2"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TodaysFocus;