import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  User,
  Edit,
  MoreVertical,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { todosService } from '../../services/todosService';
import { useSelectedTodos } from '../../contexts/SelectedTodosContext';

const TodosList = ({ 
  todos, 
  onEdit, 
  onDelete,
  onUpdate,
  onStatusChange,
  onConvertToIssue,
  showCompleted = true
}) => {
  const { selectedTodoIds, toggleTodo, isSelected } = useSelectedTodos();
  const [expandedOwners, setExpandedOwners] = useState({});
  
  const toggleOwnerExpanded = (ownerName) => {
    setExpandedOwners(prev => ({
      ...prev,
      [ownerName]: !prev[ownerName]
    }));
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
    return dueDate && dueDate < today && !todo.completed;
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
      {Object.entries(todosByOwner).map(([ownerName, ownerTodos]) => {
        const isExpanded = expandedOwners[ownerName] || false;
        return (
          <Card key={ownerName} className="shadow-sm">
            <CardHeader className="py-3 px-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {ownerName} ({ownerTodos.length})
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => toggleOwnerExpanded(ownerName)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show Details
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {ownerTodos.map((todo) => (
                <div
                  key={todo.id}
                  className={`p-4 hover:bg-green-50 transition-colors ${
                    todo.completed ? 'opacity-60' : ''
                  } ${
                    isOverdue(todo) && !todo.completed ? 'bg-red-50 hover:bg-red-100' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Completion checkbox */}
                    <div className="flex items-center">
                      <Checkbox
                        checked={todo.completed || false}
                        onCheckedChange={(checked) => {
                          if (onStatusChange) {
                            onStatusChange(todo.id, checked);
                          }
                        }}
                        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                    </div>
                
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className={`font-medium ${
                            todo.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                          }`}>
                            {todo.title}
                          </h3>
                      
                      {todo.description && (
                        <p className={`text-sm mt-1 whitespace-pre-wrap ${
                          todo.completed ? 'text-gray-400 line-through' : 'text-gray-600'
                        }`}>
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
                                {isOverdue(todo) && (
                                  <>
                                    <span className="ml-1">(Overdue)</span>
                                    <span className="ml-2 text-xs text-orange-600 font-medium">
                                      • Already in Issues List
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                            
                            {/* Show closed badge if completed */}
                            {todo.completed && (
                              <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Closed
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
                          Update
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
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default TodosList;