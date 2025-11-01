import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { todosService } from '../../services/todosService';
import { organizationService } from '../../services/organizationService';
import { getOrgTheme, saveOrgTheme, hexToRgba } from '../../utils/themeUtils';
import { useSelectedTodos } from '../../contexts/SelectedTodosContext';

const TodosList = ({ 
  todos, 
  onEdit, 
  onDelete,
  onUpdate,
  onStatusChange,
  onConvertToIssue,
  showCompleted = true,
  hideViewToggle = false,
  hideSortOptions = false,
  hideAssignee = false
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
        // Handle multi-assignee todos - use first assignee for sorting
        if (a.assignees && a.assignees.length > 0) {
          aValue = `${a.assignees[0].first_name} ${a.assignees[0].last_name}`.toLowerCase();
        } else {
          aValue = a.assigned_to ? `${a.assigned_to.first_name} ${a.assigned_to.last_name}`.toLowerCase() : 'zzz';
        }
        
        if (b.assignees && b.assignees.length > 0) {
          bValue = `${b.assignees[0].first_name} ${b.assignees[0].last_name}`.toLowerCase();
        } else {
          bValue = b.assigned_to ? `${b.assigned_to.first_name} ${b.assigned_to.last_name}`.toLowerCase() : 'zzz';
        }
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
    return dueDate && dueDate < today && todo.status !== 'complete' && todo.status !== 'completed';
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
      {/* Sorting header - only show when not hiding sort options */}
      {!hideSortOptions && (
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
      )}
      
      <div className="space-y-2">
        {sortedTodos.map((todo, index) => {
        const daysUntilDue = getDaysUntilDue(todo);
        const overdue = isOverdue(todo);
        
        return (
          <div
            key={todo.id}
            className={`
              group relative rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer h-full border-l-4
              ${todo.status === 'complete' && !todo.archived ? 'opacity-60' : ''}
              ${overdue ? 'bg-red-50' : 'bg-white'}
              hover:scale-[1.01] hover:-translate-y-0.5
            `}
            style={{
              borderColor: '#e5e7eb',
              borderLeftColor: overdue ? '#EF4444' : (todo.status === 'complete' ? '#9CA3AF' : themeColors.primary), // Dynamic theme color
            }}
            onClick={() => setSelectedTodo(todo)}
          >
            
            <div className="p-4">
              {/* Main content layout */}
              <div className="flex items-start gap-4">
                <div onClick={(e) => e.stopPropagation()} className="mt-1">
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
                    className="h-6 w-6 rounded border-2 border-gray-300 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 transition-colors cursor-pointer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  {/* Title - matching Rock card styling */}
                  <h4 className={`
                    text-base font-semibold mb-2 leading-snug
                    ${todo.status === 'complete' ? 'text-gray-400 line-through' : 
                      overdue ? 'text-red-700' : 'text-gray-900'}
                  `}>
                    {todo.title}
                  </h4>
                  
                  {/* Enhanced Metadata - matching Headlines pattern */}
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    {(todo.assignees && todo.assignees.length > 0) ? (
                      <span className="font-medium">
                        {todo.assignees.map(a => `${a.first_name} ${a.last_name}`).join(', ')}
                      </span>
                    ) : todo.assigned_to && (
                      <span className="font-medium">
                        {todo.assigned_to.first_name} {todo.assigned_to.last_name}
                      </span>
                    )}
                    
                    {/* Due date with calendar icon */}
                    {todo.due_date && (
                      <span className={`flex items-center gap-1 ${
                        isOverdue(todo) ? 'text-red-600 font-medium' : 
                        getDaysUntilDue(todo) <= 2 ? 'text-yellow-600 font-medium' :
                        'text-slate-500'
                      }`}>
                        <Calendar className="w-4 h-4" />
                        {formatDueDate(todo)}
                      </span>
                    )}
                  </div>
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