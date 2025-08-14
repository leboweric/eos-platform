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
  List
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
import { getOrgTheme, saveOrgTheme } from '../../utils/themeUtils';
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
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [sortedTodos, setSortedTodos] = useState(todos);
  // Default to list view - only show grid if explicitly set
  const [showListView, setShowListView] = useState(() => {
    const savedMode = localStorage.getItem('todosViewMode');
    // If no saved preference or saved as 'list', show list view
    return savedMode !== 'grid';
  });
  
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
        <div className="flex items-center justify-between">
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
          
          {/* List view toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const newMode = !showListView;
              setShowListView(newMode);
              localStorage.setItem('todosViewMode', newMode ? 'list' : 'grid');
            }}
            className="h-7 px-3 py-1 text-xs font-medium hover:bg-gray-200"
            title={showListView ? "Switch to Compact Grid View" : "Switch to List View"}
          >
            <List className="h-3 w-3 mr-1" />
            {showListView ? "Grid View" : "List View"}
          </Button>
        </div>
      </div>
      
      {/* Default compact grid view - cards in columns */}
      <div className={showListView ? "space-y-2" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"}>
        {sortedTodos.map((todo) => {
        const daysUntilDue = getDaysUntilDue(todo);
        const overdue = isOverdue(todo);
        
        if (showListView) {
          // List View - Compact row layout
          return (
            <div
              key={todo.id}
              className={`
                group flex items-center gap-3 bg-white rounded-lg border px-4 py-2 transition-all duration-200
                ${todo.status === 'complete' && !todo.archived ? 'border-gray-300 opacity-60' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}
              `}
            >
              {/* Checkbox */}
              <Checkbox
                checked={todo.status === 'complete'}
                onCheckedChange={(checked) => {
                  if (onStatusChange) {
                    onStatusChange(todo.id, checked);
                  } else if (onUpdate) {
                    todosService.updateTodo(todo.id, { 
                      status: checked ? 'complete' : 'incomplete' 
                    }).then(() => {
                      onUpdate();
                    });
                  }
                }}
                className="h-4 w-4 rounded border-gray-300 data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
              />
              
              {/* Title */}
              <h3 className={`
                flex-1 text-sm font-medium
                ${todo.status === 'complete' ? 'text-gray-400 line-through' : 'text-gray-900'}
              `}>
                {todo.title}
              </h3>
              
              {/* Assignee */}
              {todo.assigned_to && (
                <span className="text-sm text-gray-500">
                  {todo.assigned_to.first_name} {todo.assigned_to.last_name}
                </span>
              )}
              
              {/* Due date */}
              {todo.due_date && (
                <span className={`
                  flex items-center gap-1 text-sm
                  ${overdue ? 'text-red-600 font-medium' : 
                    daysUntilDue === 0 ? 'text-orange-600' :
                    daysUntilDue === 1 ? 'text-yellow-600' :
                    'text-gray-500'}
                `}>
                  <Calendar className="h-3 w-3" />
                  {formatDueDate(todo)}
                </span>
              )}
              
              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="h-3.5 w-3.5 text-gray-500" />
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
          );
        }
        
        // Compact Grid View - Default
        return (
          <div
            key={todo.id}
            className={`
              group relative bg-white rounded-lg border transition-all duration-200 h-full
              ${todo.status === 'complete' && !todo.archived ? 'border-gray-400 shadow-sm opacity-60' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}
            `}
          >
            {/* Status indicator - subtle left border */}
            {overdue ? (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-lg" />
            ) : (
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: themeColors.accent }} />
            )}
            
            <div className="p-3 pl-4">
              <div className="flex items-start gap-3">
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
                    className="h-4 w-4 rounded border-gray-300 data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
                  />
                </div>
                
                {/* Main content */}
                <div className="flex-1 min-w-0">
                  {/* Title - smaller for compact view */}
                  <h3 className={`
                    text-sm font-medium leading-tight line-clamp-2
                    ${todo.status === 'complete' ? 'text-gray-400 line-through' : 'text-gray-900'}
                  `}>
                    {todo.title}
                  </h3>
                  
                  {/* Description hidden from main view - only shown in edit dialog */}
                  
                  {/* Metadata - compact */}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
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
    </div>
  );
};

export default TodosListClean;