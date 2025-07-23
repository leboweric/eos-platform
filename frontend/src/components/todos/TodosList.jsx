import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  MoreVertical,
  AlertTriangle
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
  onConvertToIssue,
  showCompleted = true 
}) => {
  const handleToggleComplete = async (todo) => {
    try {
      const newStatus = todo.status === 'complete' ? 'incomplete' : 'complete';
      await todosService.updateTodo(todo.id, {
        status: newStatus
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  // Parse date string as local date, not UTC
  const parseDateAsLocal = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(num => parseInt(num));
    return new Date(year, month - 1, day); // month is 0-indexed in JS
  };
  
  const isOverdue = (todo) => {
    const dueDate = parseDateAsLocal(todo.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    return dueDate && dueDate < today && todo.status !== 'complete';
  };

  if (todos.length === 0) {
    return null;
  }

  // Group todos by owner
  const todosByOwner = todos.reduce((acc, todo) => {
    const ownerName = todo.assigned_to 
      ? `${todo.assigned_to.first_name} ${todo.assigned_to.last_name}`
      : 'Unassigned';
    
    if (!acc[ownerName]) {
      acc[ownerName] = [];
    }
    acc[ownerName].push(todo);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(todosByOwner).map(([ownerName, ownerTodos]) => (
        <Card key={ownerName} className="shadow-sm">
          <CardHeader className="py-3 px-4 bg-gray-50">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              {ownerName} ({ownerTodos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {ownerTodos.map((todo) => (
                <div
                  key={todo.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    todo.status === 'complete' ? 'opacity-75' : ''
                  } ${
                    isOverdue(todo) ? 'bg-red-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1 rounded-full ${
                      todo.status === 'complete' 
                        ? 'border-green-500' 
                        : isOverdue(todo)
                        ? 'border-red-500'
                        : 'border-indigo-500'
                    } border-2`}>
                      <Checkbox
                        checked={todo.status === 'complete'}
                        onCheckedChange={() => handleToggleComplete(todo)}
                        className="mt-0 rounded-full data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                    </div>
                
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className={`font-medium ${
                            todo.status === 'complete' ? 'line-through text-gray-500' : 'text-gray-900'
                          }`}>
                            {todo.title}
                          </h3>
                      
                      {todo.description && (
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                          {todo.description}
                        </p>
                      )}
                      
                          <div className="flex items-center gap-4 mt-2">
                            {todo.due_date && (
                              <div className={`flex items-center gap-1 text-sm ${
                                isOverdue(todo) ? 'text-red-600 font-medium' : 'text-gray-600'
                              }`}>
                                {isOverdue(todo) && <AlertTriangle className="h-4 w-4" />}
                                <Calendar className="h-4 w-4" />
                                <span>{format(parseDateAsLocal(todo.due_date), 'MMM d, yyyy')}</span>
                                {isOverdue(todo) && <span className="ml-1">(Overdue)</span>}
                              </div>
                            )}
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
                        {isOverdue(todo) && onConvertToIssue && (
                          <DropdownMenuItem 
                            onClick={() => onConvertToIssue(todo)}
                            className="text-orange-600"
                          >
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Convert to Issue
                          </DropdownMenuItem>
                        )}
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
      ))}
    </div>
  );
};

export default TodosList;