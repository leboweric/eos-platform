import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Square,
  CheckSquare,
  Calendar,
  User,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { todosService } from '../../services/todosService';

const TodosList = ({ 
  todos, 
  onEdit, 
  onDelete,
  onUpdate,
  showCompleted = true 
}) => {
  const handleToggleComplete = async (todo) => {
    try {
      await todosService.updateTodo(todo.id, {
        is_completed: !todo.is_completed
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    
    return (
      <Badge className={`${colors[priority]} font-medium`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  if (todos.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className={`p-4 hover:bg-gray-50 transition-colors ${
                todo.is_completed ? 'opacity-75' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={todo.is_completed}
                  onCheckedChange={() => handleToggleComplete(todo)}
                  className="mt-1"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className={`font-medium ${
                        todo.is_completed ? 'line-through text-gray-500' : 'text-gray-900'
                      }`}>
                        {todo.title}
                      </h3>
                      
                      {todo.description && (
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                          {todo.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2">
                        {todo.assigned_to && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <User className="h-4 w-4" />
                            <span>{todo.assigned_to.first_name} {todo.assigned_to.last_name}</span>
                          </div>
                        )}
                        
                        {todo.due_date && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(todo.due_date), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                        
                        {getPriorityBadge(todo.priority)}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(todo)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(todo.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TodosList;