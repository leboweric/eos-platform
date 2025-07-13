import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar, 
  User, 
  Paperclip, 
  MoreVertical,
  CheckCircle,
  Circle,
  AlertCircle,
  Edit,
  Trash
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { todosService } from '../../services/todosService';

const TodoCard = ({ todo, onEdit, onDelete, onUpdate }) => {
  const [updating, setUpdating] = useState(false);

  const priorityColors = {
    low: 'bg-blue-100 text-blue-700 border-blue-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    urgent: 'bg-red-100 text-red-700 border-red-200'
  };

  const statusIcons = {
    incomplete: <Circle className="h-4 w-4" />,
    complete: <CheckCircle className="h-4 w-4 text-green-600" />,
    cancelled: <AlertCircle className="h-4 w-4 text-gray-400" />
  };

  const handleToggleComplete = async () => {
    try {
      setUpdating(true);
      const newStatus = todo.status === 'complete' ? 'incomplete' : 'complete';
      await todosService.updateTodo(todo.id, { status: newStatus });
      onUpdate();
    } catch (error) {
      console.error('Failed to update todo status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const isOverdue = todo.due_date && new Date(todo.due_date) < new Date() && todo.status !== 'complete';
  const dueDate = todo.due_date ? new Date(todo.due_date) : null;

  return (
    <Card className={`transition-all ${todo.status === 'complete' ? 'opacity-60' : ''} ${isOverdue ? 'border-red-300' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <Checkbox
              checked={todo.status === 'complete'}
              onCheckedChange={handleToggleComplete}
              disabled={updating}
              className="mt-1"
            />
            <div className="flex-1">
              <h3 className={`font-medium ${todo.status === 'complete' ? 'line-through text-gray-500' : ''}`}>
                {todo.title}
              </h3>
              {todo.description && (
                <p className="text-sm text-gray-600 mt-1">{todo.description}</p>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(todo)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(todo.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center gap-4 text-sm">
          <Badge variant="outline" className={priorityColors[todo.priority]}>
            {todo.priority}
          </Badge>
          
          {dueDate && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
              <Calendar className="h-4 w-4" />
              <span>
                {dueDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: dueDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                })}
              </span>
            </div>
          )}
          
          {todo.assignee_first_name && (
            <div className="flex items-center gap-1 text-gray-500">
              <User className="h-4 w-4" />
              <span>{todo.assignee_first_name} {todo.assignee_last_name}</span>
            </div>
          )}
          
          {todo.attachment_count > 0 && (
            <div className="flex items-center gap-1 text-gray-500">
              <Paperclip className="h-4 w-4" />
              <span>{todo.attachment_count}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TodoCard;