import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  MoreVertical,
  AlertCircle,
  Edit,
  Trash2,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  FileText,
  ArrowRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { todosService } from '../../services/todosService';
import { organizationService } from '../../services/organizationService';
import { getOrgTheme, saveOrgTheme } from '../../utils/themeUtils';
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
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [sortedTodos, setSortedTodos] = useState(todos);
  const [selectedTodo, setSelectedTodo] = useState(null);
  
  useEffect(() => {
    fetchOrganizationTheme();
    
    // Listen for theme changes
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    // Listen for organization changes
    const handleOrgChange = () => {
      fetchOrganizationTheme();
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    window.addEventListener('organizationChanged', handleOrgChange);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
      window.removeEventListener('organizationChanged', handleOrgChange);
    };
  }, []);
  
  useEffect(() => {
    // Sort todos whenever todos prop or sort settings change
    const sorted = [...todos].sort((a, b) => {
      if (!sortField) return 0;
      
      let aValue, bValue;
      
      if (sortField === 'assignee') {
        aValue = a.assigned_to ? `${a.assigned_to.first_name} ${a.assigned_to.last_name}`.toLowerCase() : 'zzz';
        bValue = b.assigned_to ? `${b.assigned_to.first_name} ${b.assigned_to.last_name}`.toLowerCase() : 'zzz';
      } else if (sortField === 'dueDate') {
        aValue = a.due_date || '9999-12-31';
        bValue = b.due_date || '9999-12-31';
      } else if (sortField === 'title') {
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    setSortedTodos(sorted);
  }, [todos, sortField, sortDirection]);
  
  const fetchOrganizationTheme = async () => {
    try {
      // First check localStorage
      const orgId = localStorage.getItem('organizationId');
      const savedTheme = getOrgTheme(orgId);
      if (savedTheme) {
        setThemeColors(savedTheme);
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
        const orgId = localStorage.getItem('organizationId');
        saveOrgTheme(orgId, theme);
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
  
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3" />
      : <ArrowDown className="h-3 w-3" />;
  };

  if (todos.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Sorting header */}
      <div className="mb-4 p-2 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-gray-600 mr-2">Sort by:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('title')}
            className={`h-7 px-3 py-1 text-xs font-medium hover:bg-gray-200 ${sortField === 'title' ? 'bg-gray-200 text-gray-900' : 'text-gray-600'}`}
          >
            Title {getSortIcon('title')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('assignee')}
            className={`h-7 px-3 py-1 text-xs font-medium hover:bg-gray-200 ${sortField === 'assignee' ? 'bg-gray-200 text-gray-900' : 'text-gray-600'}`}
          >
            Person {getSortIcon('assignee')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('dueDate')}
            className={`h-7 px-3 py-1 text-xs font-medium hover:bg-gray-200 ${sortField === 'dueDate' ? 'bg-gray-200 text-gray-900' : 'text-gray-600'}`}
          >
            Due Date {getSortIcon('dueDate')}
          </Button>
          {sortField && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSortField(null);
                setSortDirection('asc');
              }}
              className="h-7 px-3 py-1 ml-2 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              ✕ Clear
            </Button>
          )}
        </div>
      </div>
      
      <div className="space-y-3">
        {sortedTodos.map((todo) => {
        const daysUntilDue = getDaysUntilDue(todo);
        const overdue = isOverdue(todo);
        
        return (
          <div
            key={todo.id}
            className={`
              group relative bg-white rounded-lg border transition-all duration-200 cursor-pointer
              ${todo.status === 'complete' && !todo.archived ? 'border-gray-400 shadow-sm opacity-60' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}
            `}
            onClick={() => setSelectedTodo(todo)}
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
                <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
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
                        <span className="text-red-600 font-medium text-sm">
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
                <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
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
      
      {/* Todo Detail Modal */}
      <Dialog open={!!selectedTodo} onOpenChange={(open) => !open && setSelectedTodo(null)}>
        <DialogContent className="max-w-2xl">
          {selectedTodo && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold pr-8">
                  {selectedTodo.title}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                {/* Description */}
                {selectedTodo.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Description
                    </h4>
                    <p className="text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                      {selectedTodo.description}
                    </p>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Details</h4>
                    <div className="space-y-3">
                      {/* Assignee */}
                      {selectedTodo.assigned_to && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Assigned to:</span>
                          <span className="font-medium">
                            {selectedTodo.assigned_to.first_name} {selectedTodo.assigned_to.last_name}
                          </span>
                        </div>
                      )}
                      
                      {/* Due Date */}
                      {selectedTodo.due_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Due date:</span>
                          <span className={`font-medium ${
                            isOverdue(selectedTodo) ? 'text-red-600' : 
                            getDaysUntilDue(selectedTodo) === 0 ? 'text-orange-600' :
                            getDaysUntilDue(selectedTodo) === 1 ? 'text-yellow-600' :
                            'text-gray-900'
                          }`}>
                            {formatDueDate(selectedTodo)}
                          </span>
                        </div>
                      )}
                      
                      {/* Status */}
                      <div className="flex items-center gap-2 text-sm">
                        {selectedTodo.status === 'complete' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-gray-600">Status:</span>
                        <span className={`font-medium capitalize ${
                          selectedTodo.status === 'complete' ? 'text-green-600' : 'text-gray-900'
                        }`}>
                          {selectedTodo.status === 'complete' ? 'Complete' : 'Incomplete'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Additional Info</h4>
                    <div className="space-y-3">
                      {/* Created Date */}
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">
                          {format(new Date(selectedTodo.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      
                      {/* Overdue Status */}
                      {isOverdue(selectedTodo) && (
                        <div className="flex items-center gap-2 text-sm">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-red-600 font-medium">
                            Overdue - Added to Issues List
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {/* Convert to Issue button - only if not already overdue */}
                    {!isOverdue(selectedTodo) && onConvertToIssue && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onConvertToIssue(selectedTodo.id);
                          setSelectedTodo(null);
                        }}
                      >
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Convert to Issue
                      </Button>
                    )}
                    
                    {/* Delete button */}
                    {onDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this to-do?')) {
                            onDelete(selectedTodo.id);
                            setSelectedTodo(null);
                          }
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                  
                  {/* Primary actions */}
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedTodo(null)}
                    >
                      Close
                    </Button>
                    {onEdit && (
                      <Button
                        onClick={() => {
                          onEdit(selectedTodo);
                          setSelectedTodo(null);
                        }}
                        style={{ backgroundColor: themeColors.primary }}
                        className="text-white hover:opacity-90"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TodosList;