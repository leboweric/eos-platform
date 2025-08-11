import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  MoreVertical,
  AlertCircle,
  Edit,
  Trash2,
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
import { organizationService } from '../../services/organizationService';
import { useSelectedTodos } from '../../contexts/SelectedTodosContext';

const TodosListClean = ({ 
  todos, 
  onEdit, 
  onDelete,
  onUpdate,
  onStatusChange,
  onConvertToIssue,
  showCompleted = true
}) => {
  const { selectedTodoIds, toggleTodo, isSelected } = useSelectedTodos();
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  
  useEffect(() => {
    fetchOrganizationTheme();
    
    // Listen for theme changes
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);
  
  const fetchOrganizationTheme = async () => {
    try {
      // First check localStorage
      const savedTheme = localStorage.getItem('orgTheme');
      if (savedTheme) {
        const parsedTheme = JSON.parse(savedTheme);
        setThemeColors(parsedTheme);
        return;
      }
      
      // Fetch from API
      const orgData = await organizationService.getOrganization();
      
      if (orgData) {
        const theme = {
          primary: orgData.theme_primary_color || '#3B82F6',
          secondary: orgData.theme_secondary_color || '#1E40AF',
          accent: orgData.theme_accent_color || '#60A5FA'
        };
        setThemeColors(theme);
        localStorage.setItem('orgTheme', JSON.stringify(theme));
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
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
    today.setHours(0, 0, 0, 0);
    return dueDate && dueDate < today && todo.status !== 'complete';
  };

  const getDaysUntilDue = (todo) => {
    if (!todo.due_date) return null;
    const dueDate = parseDateAsLocal(todo.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDueDate = (todo) => {
    if (!todo.due_date) return null;
    const days = getDaysUntilDue(todo);
    
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days === -1) return '1 day overdue';
    if (days < -1) return `${Math.abs(days)} days overdue`;
    if (days > 1 && days <= 7) return `Due in ${days} days`;
    
    return format(parseDateAsLocal(todo.due_date), 'MMM d');
  };

  if (todos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {todos.map((todo) => {
        const daysUntilDue = getDaysUntilDue(todo);
        const overdue = isOverdue(todo);
        
        return (
          <div
            key={todo.id}
            className={`
              group relative bg-white rounded-lg border transition-all duration-200
              ${todo.status === 'complete' && !todo.archived ? 'border-gray-400 shadow-sm opacity-60' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}
            `}
          >
            {/* Status indicator - subtle left border */}
            {overdue ? (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-lg" />
            ) : (
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: themeColors.accent }} />
            )}
            
            <div className="p-4 pl-6">
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <div className="pt-0.5">
                  <Checkbox
                    checked={todo.status === 'complete'}
                    onCheckedChange={(checked) => {
                      if (onStatusChange) {
                        onStatusChange(todo.id, checked);
                      } else if (onUpdate) {
                        // Fallback to onUpdate if onStatusChange not provided
                        todosService.updateTodo(todo.id, { 
                          status: checked ? 'complete' : 'incomplete' 
                        }).then(() => {
                          onUpdate();
                        });
                      }
                    }}
                    className="h-5 w-5 rounded border-gray-300 data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
                  />
                </div>
                
                {/* Main content */}
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <h3 className={`
                    text-base font-medium leading-tight
                    ${todo.status === 'complete' ? 'text-gray-400 line-through' : 'text-gray-900'}
                  `}>
                    {todo.title}
                  </h3>
                  
                  {/* Description hidden from main view - only shown in edit dialog */}
                  
                  {/* Metadata - clean single line */}
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    {/* Due date */}
                    {todo.due_date && (
                      <span className={`
                        flex items-center gap-1.5
                        ${overdue ? 'text-red-600 font-medium' : 
                          daysUntilDue === 0 ? 'text-orange-600 font-medium' :
                          daysUntilDue === 1 ? 'text-yellow-600' :
                          'text-gray-500'}
                      `}>
                        {overdue && <AlertCircle className="h-3.5 w-3.5" />}
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDueDate(todo)}
                      </span>
                    )}
                    
                    {/* Separator */}
                    {todo.due_date && todo.assigned_to && (
                      <span className="text-gray-300">•</span>
                    )}
                    
                    {/* Assignee */}
                    {todo.assigned_to && (
                      <span className="text-gray-500">
                        {todo.assigned_to.first_name} {todo.assigned_to.last_name}
                      </span>
                    )}
                    
                    {/* Show message for overdue todos */}
                    {overdue && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-orange-600 font-medium text-sm">
                          Already in Issues List
                        </span>
                      </>
                    )}
                    
                    {/* Show done badge if completed */}
                    {todo.status === 'complete' && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Done
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Actions menu - visible on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem 
                        onClick={() => onEdit(todo)}
                        className="cursor-pointer"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      {onDelete && (
                        <DropdownMenuItem 
                          onClick={() => onDelete(todo.id)}
                          className="cursor-pointer text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TodosListClean;