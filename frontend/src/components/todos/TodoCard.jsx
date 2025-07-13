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
  Trash,
  AlertTriangle
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { todosService } from '../../services/todosService';

/**
 * TodoCard component for displaying todo item information
 * @param {Object} props - Component props
 * @param {Object} props.todo - Todo data
 * @param {string} props.todo.id - Todo ID
 * @param {string} props.todo.title - Todo title
 * @param {string} props.todo.description - Todo description
 * @param {string} props.todo.status - Todo status (incomplete/complete/cancelled)
 * @param {string} props.todo.due_date - Todo due date
 * @param {string} props.todo.owner_id - ID of the todo owner
 * @param {string} props.todo.team_id - ID of the team
 * @param {boolean} props.todo.is_published_to_departments - Whether todo is published to departments
 * @param {string} props.todo.published_at - Publication timestamp
 * @param {string} props.todo.published_by - ID of user who published
 * @param {Function} props.onEdit - Edit handler
 * @param {Function} props.onDelete - Delete handler
 * @param {Function} props.onUpdate - Update handler
 * @param {Function} props.onAddToIssues - Add to issues handler
 * @param {boolean} props.readOnly - Whether in read-only mode
 */
const TodoCard = ({ todo, onEdit, onDelete, onUpdate, onAddToIssues, readOnly = false }) => {
  const [updating, setUpdating] = useState(false);
  const [creatingIssue, setCreatingIssue] = useState(false);


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

  const handleAddToIssues = async () => {
    if (!onAddToIssues) return;
    
    try {
      setCreatingIssue(true);
      await onAddToIssues(todo);
    } catch (error) {
      console.error('Failed to create issue:', error);
    } finally {
      setCreatingIssue(false);
    }
  };

  return (
    <Card className={`transition-all ${todo.status === 'complete' ? 'opacity-60' : ''} ${isOverdue ? 'border-red-300' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {!readOnly && (
              <div className={`p-1.5 rounded-md ${todo.status === 'complete' ? 'bg-green-50 border-green-300' : 'bg-indigo-50 border-indigo-300'} border`}>
                <Checkbox
                  checked={todo.status === 'complete'}
                  onCheckedChange={handleToggleComplete}
                  disabled={updating}
                  className="h-5 w-5 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 border-2"
                />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className={`font-medium ${todo.status === 'complete' ? 'line-through text-gray-500' : ''}`}>
                    {todo.title}
                  </h3>
                  {todo.description && (
                    <p className="text-sm text-gray-600 mt-1">{todo.description}</p>
                  )}
                </div>
                {isOverdue && !readOnly && onAddToIssues && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-2 h-8 px-2 border-red-300 hover:bg-red-50"
                    onClick={handleAddToIssues}
                    disabled={creatingIssue}
                    title="Add to Issues List"
                  >
                    <AlertTriangle className="h-4 w-4 text-red-600 mr-1" />
                    <span className="text-xs">Add to Issues</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {!readOnly && (
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
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center gap-4 text-sm">
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