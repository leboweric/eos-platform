import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  AlertCircle,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  List,
  Archive,
  ArchiveRestore,
  Grid3X3,
  Users,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { format } from 'date-fns';
import { todosService } from '../../services/todosService';
import { organizationService } from '../../services/organizationService';
import { getOrgTheme, saveOrgTheme } from '../../utils/themeUtils';
import { useSelectedTodos } from '../../contexts/SelectedTodosContext';
import { TodoContextMenu } from '../TodoContextMenu';

const TodosListClean = ({ 
  todos, 
  onEdit, 
  onDelete,
  onUpdate,
  onStatusChange,
  onConvertToIssue,
  onUnarchive,
  onReassign,              // Add missing Level 10 Meeting functionality
  onChangeDueDate,         // Add missing Level 10 Meeting functionality
  onChangePriority,        // Add missing Level 10 Meeting functionality
  onDuplicate,             // Add missing Level 10 Meeting functionality
  onCreateLinkedIssue,     // Add missing Level 10 Meeting functionality
  showCompleted = true,
  hideViewToggle = false,
  hideSortOptions = false,
  hideAssignee = false,
  showingArchived = false
}) => {
  const { selectedTodoIds, toggleTodo, isSelected } = useSelectedTodos();
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [sortedTodos, setSortedTodos] = useState(todos);
  
  // View mode: always grouped (removed other options)
  const [viewMode, setViewMode] = useState('grouped');
  
  // Expansion state for grouped view - Default to expanded like Rocks page
  const [expandedAssignees, setExpandedAssignees] = useState(() => {
    // ALWAYS start with empty object and let useEffect populate with expanded=true
    // This ensures all sections default to expanded like Rocks page
    return {};
  });
  
  useEffect(() => {
    console.log('TodosListClean: Current viewMode is', viewMode);
    fetchOrganizationTheme();
    
    // Listen for theme changes
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  // Set all assignees as expanded by default when todos change (replicating Rocks page behavior)
  useEffect(() => {
    if (todos && todos.length > 0) {
      const assigneeIds = new Set();
      
      todos.forEach(todo => {
        const assigneeId = todo.assigned_to?.id || 'unassigned';
        assigneeIds.add(assigneeId);
      });
      
      // Set all assignees as expanded by default (like Rocks page)
      const expandedByDefault = {};
      assigneeIds.forEach(id => {
        expandedByDefault[id] = true;
      });
      
      // COPY EXACT BEHAVIOR FROM ROCKS PAGE: Force all assignees to be expanded
      const expandedState = {};
      assigneeIds.forEach(id => {
        expandedState[id] = true; // Always expanded like Rocks page
      });
      
      setExpandedAssignees(expandedState);
      localStorage.setItem('todosExpandedAssignees', JSON.stringify(expandedState));
    }
  }, [todos]);

  useEffect(() => {
    sortTodos();
  }, [todos, sortField, sortDirection]);

  const fetchOrganizationTheme = async () => {
    try {
      // First check localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const orgId = user?.organizationId || user?.organization_id;
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
        saveOrgTheme(orgId, theme);
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
    }
  };

  const sortTodos = () => {
    let sorted = [...todos];

    if (sortField) {
      sorted.sort((a, b) => {
        let aVal, bVal;

        switch (sortField) {
          case 'title':
            aVal = a.title?.toLowerCase() || '';
            bVal = b.title?.toLowerCase() || '';
            break;
          case 'assignee':
            aVal = a.assigned_to ? `${a.assigned_to.first_name} ${a.assigned_to.last_name}`.toLowerCase() : '';
            bVal = b.assigned_to ? `${b.assigned_to.first_name} ${b.assigned_to.last_name}`.toLowerCase() : '';
            break;
          case 'dueDate':
            if (showingArchived) {
              // Sort by archived_at when viewing archived todos
              aVal = a.archived_at ? new Date(a.archived_at).getTime() : 0;
              bVal = b.archived_at ? new Date(b.archived_at).getTime() : 0;
            } else {
              // Sort by due_date when viewing active todos
              aVal = a.due_date ? new Date(a.due_date).getTime() : 0;
              bVal = b.due_date ? new Date(b.due_date).getTime() : 0;
            }
            break;
          default:
            return 0;
        }

        if (typeof aVal === 'string') {
          return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        } else {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
      });
    }

    setSortedTodos(sorted);
  };

  const formatDueDate = (todo) => {
    if (showingArchived && todo.archived_at) {
      return format(new Date(todo.archived_at), 'MMM d');
    }
    if (todo.due_date) {
      return format(new Date(todo.due_date), 'MMM d');
    }
    return '';
  };

  const formatArchivedDate = (todo) => {
    if (todo.archived_at) {
      return format(new Date(todo.archived_at), 'MMM d');
    }
    return '';
  };

  // Parse date string as local date, not UTC
  const parseDateAsLocal = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(num => parseInt(num));
    return new Date(year, month - 1, day); // month is 0-indexed in JS
  };

  const getDaysUntilDue = (todo) => {
    if (!todo.due_date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = parseDateAsLocal(todo.due_date);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isOverdue = (todo) => {
    if (!todo.due_date || todo.status === 'complete' || todo.status === 'completed' || todo.status === 'cancelled') {
      return false;
    }
    const dueDate = parseDateAsLocal(todo.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate && dueDate < today;
  };

  const handleUnarchive = async (todoId, e) => {
    e.stopPropagation();
    try {
      await todosService.unarchiveTodo(todoId);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to unarchive todo:', error);
    }
  };

  const toggleAssigneeExpansion = (assigneeKey) => {
    const newState = {
      ...expandedAssignees,
      [assigneeKey]: !expandedAssignees[assigneeKey]
    };
    setExpandedAssignees(newState);
    localStorage.setItem('todosExpandedAssignees', JSON.stringify(newState));
  };

  const renderGroupedView = () => {
    // Group todos by assignee like Level 10 Meeting
    const todosByAssignee = {};
    
    sortedTodos.forEach(todo => {
      // For multi-assignee todos, show under each assignee with their individual completion status
      if (todo.assignees && todo.assignees.length > 0) {
        // Show this todo under EACH assignee
        todo.assignees.forEach(assignee => {
          const assigneeId = assignee.id;
          const assigneeName = `${assignee.first_name} ${assignee.last_name}`;
          
          if (!todosByAssignee[assigneeId]) {
            todosByAssignee[assigneeId] = {
              id: assigneeId,
              name: assigneeName,
              todos: []
            };
          }
          
          // Create a copy of the todo with this assignee's completion status
          const todoForAssignee = {
            ...todo,
            // Override completion status with this specific assignee's status
            status: assignee.completed ? 'complete' : 'incomplete',
            completed_at: assignee.completed_at,
            // Store the assignee context for the completion handler
            _currentAssignee: assignee
          };
          
          todosByAssignee[assigneeId].todos.push(todoForAssignee);
        });
      } else if (todo.assigned_to) {
        // Single assignee todo - original behavior
        const assigneeId = todo.assigned_to.id;
        const assigneeName = `${todo.assigned_to.first_name} ${todo.assigned_to.last_name}`;
        
        if (!todosByAssignee[assigneeId]) {
          todosByAssignee[assigneeId] = {
            id: assigneeId,
            name: assigneeName,
            todos: []
          };
        }
        todosByAssignee[assigneeId].todos.push(todo);
      } else {
        // Unassigned
        const assigneeId = 'unassigned';
        const assigneeName = 'Unassigned';
        
        if (!todosByAssignee[assigneeId]) {
          todosByAssignee[assigneeId] = {
            id: assigneeId,
            name: assigneeName,
            todos: []
          };
        }
        todosByAssignee[assigneeId].todos.push(todo);
      }
    });
    
    // Convert to array and sort by name
    const assignees = Object.values(todosByAssignee).sort((a, b) => {
      if (a.id === 'unassigned') return 1;
      if (b.id === 'unassigned') return -1;
      return (a.name || "").localeCompare(b.name || "");
    });

    if (sortedTodos.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <CheckCircle className="w-12 h-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No To-Dos</h3>
          <p className="text-sm text-gray-500 mb-4 max-w-md">
            This team doesn't have any to-dos yet. To-dos are action items that need to be completed.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {assignees.map(assignee => {
          const isExpanded = expandedAssignees[assignee.id] !== false; // Default to expanded
          
          return (
            <Card key={assignee.id} className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-slate-100">
                      <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 font-semibold">
                        {assignee.id === 'unassigned' ? 'UN' : assignee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{assignee.name}</h3>
                      <p className="text-sm text-slate-500">{assignee.todos.length} To-Do{assignee.todos.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAssigneeExpansion(assignee.id)}
                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    )}
                  </button>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {/* Header Row */}
                    <div className="flex items-center px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      <div className="w-10">Status</div>
                      <div className="flex-1 ml-3">Title</div>
                      <div className="w-20 text-right">Due Date</div>
                      <div className="w-8"></div>
                    </div>
                    
                    {/* To-Do Rows */}
                    {assignee.todos.map(todo => {
                      const isComplete = todo.status === 'complete' || todo.status === 'completed';
                      const daysUntilDue = getDaysUntilDue(todo);
                      const overdue = isOverdue(todo);
                      
                      return (
                        <TodoContextMenu
                          key={todo.id}
                          todo={todo}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onToggleComplete={(todoId, completed) => {
                            if (onStatusChange) {
                              onStatusChange(todoId, completed);
                            }
                          }}
                          onReassign={onReassign}
                          onChangeDueDate={onChangeDueDate}
                          onChangePriority={onChangePriority}
                          onDuplicate={onDuplicate}
                          onCreateLinkedIssue={onCreateLinkedIssue}
                          hidePriorityOptions={true}
                          hideDeleteOption={true}
                        >
                          <div className={`border-b border-slate-100 last:border-0 cursor-context-menu transition-colors rounded ${
                            overdue ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
                          }`}>
                          {/* Main To-Do Row */}
                          <div className="flex items-center px-3 py-3 group">
                            {/* Status Indicator */}
                            <div className="w-10 flex items-center relative">
                              <div 
                                className="flex items-center justify-center w-7 h-7 rounded-full cursor-pointer hover:scale-110 transition-transform"
                                style={{
                                  backgroundColor: isComplete ? themeColors.primary + '20' : 'transparent',
                                  border: `2px solid ${isComplete ? themeColors.primary : '#E2E8F0'}`
                                }}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  
                                  console.log('🔥🔥🔥 FRONTEND: Marking todo as complete 🔥🔥🔥');
                                  console.log('📋 Todo ID:', todo.id);
                                  console.log('📊 Current status:', todo.status);
                                  console.log('🎯 Is multi-assignee?', !!todo._currentAssignee);
                                  console.log('👤 Current assignee object:', todo._currentAssignee);
                                  console.log('🔢 Assignees array:', todo.assignees);
                                  
                                  if (onStatusChange) {
                                    // For multi-assignee todos, pass the assigneeId as a third parameter
                                    const assigneeId = todo._currentAssignee ? todo._currentAssignee.id : null;
                                    console.log('🎯 Calling onStatusChange with assigneeId:', assigneeId);
                                    onStatusChange(todo.id, !isComplete, assigneeId);
                                  } else if (onUpdate) {
                                    console.log('🔥🔥🔥 FRONTEND: Marking todo as complete 🔥🔥🔥');
                                    console.log('📋 Todo ID:', todo.id);
                                    console.log('📊 Current status:', todo.status);
                                    console.log('🎯 Is multi-assignee?', !!todo._currentAssignee);
                                    console.log('👤 Current assignee object:', todo._currentAssignee);
                                    console.log('🔢 Assignees array:', todo.assignees);
                                    
                                    // For multi-assignee todos, pass the specific assignee ID
                                    const updateData = { 
                                      status: isComplete ? 'incomplete' : 'complete'
                                    };
                                    
                                    // If this is a multi-assignee todo, include which assignee's copy to mark
                                    if (todo._currentAssignee) {
                                      updateData.assigneeId = todo._currentAssignee.id;
                                      console.log('✅ Adding assigneeId to request:', updateData.assigneeId);
                                    } else {
                                      console.log('⚠️ No _currentAssignee found, not adding assigneeId');
                                    }
                                    
                                    console.log('📤 Sending update request with data:', updateData);
                                    await todosService.updateTodo(todo.id, updateData);
                                    console.log('✅ Update request completed');
                                    onUpdate();
                                  }
                                }}
                              >
                                {isComplete && <CheckCircle className="h-4 w-4" style={{ color: themeColors.primary }} />}
                              </div>
                            </div>
                            
                            {/* Title */}
                            <div 
                              className={`flex-1 ml-3 cursor-pointer ${showingArchived ? 'pr-4' : ''}`}
                              onClick={() => onEdit && onEdit(todo)}
                            >
                              <div className={`text-sm font-medium ${
                                isComplete ? 'text-slate-400 line-through' : 'text-slate-900'
                              }`}>
                                {todo.title}
                              </div>
                              {todo.description && (
                                <div className="text-xs text-slate-500 mt-1">
                                  {todo.description.length > 150 && !expandedDescriptions[todo.id] ? (
                                    <>
                                      {todo.description.substring(0, 150)}...
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedDescriptions(prev => ({ ...prev, [todo.id]: true }));
                                        }}
                                        className="ml-1 text-blue-600 hover:text-blue-800 font-medium"
                                      >
                                        Show more
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      {todo.description}
                                      {todo.description.length > 150 && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedDescriptions(prev => ({ ...prev, [todo.id]: false }));
                                          }}
                                          className="ml-1 text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                          Show less
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Due Date & Actions Container */}
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {/* Due Date */}
                              <div className="text-right">
                                {todo.due_date && (
                                  <span className={`text-xs ${
                                    daysUntilDue === 0 ? 'text-orange-600 font-medium' :
                                    daysUntilDue === 1 ? 'text-yellow-600' :
                                    'text-slate-500'
                                  }`}>
                                    {formatDueDate(todo)}
                                  </span>
                                )}
                              </div>
                              
                              {/* Actions Space */}
                              <div className="flex items-center justify-center">
                                {todo.archived && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => handleUnarchive(todo.id, e)}
                                    className="h-6 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                    title="Unarchive"
                                  >
                                    <ArchiveRestore className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                          </div>
                        </TodoContextMenu>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    );
  };
  
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, start with ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3" />;
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
      {/* Enhanced Sorting header */}
      {!hideSortOptions && (
      <div className="mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-sm">
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
            Owner {getSortIcon('assignee')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('dueDate')}
            className={`h-7 px-3 py-1 text-xs font-medium hover:bg-gray-200 ${sortField === 'dueDate' ? 'bg-gray-200 text-gray-900' : 'text-gray-600'}`}
          >
            {showingArchived ? 'Date Archived' : 'Due Date'} {getSortIcon('dueDate')}
          </Button>
          {sortField && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSortField(null);
                setSortDirection('asc');
              }}
              className="h-7 px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-200"
            >
              ✕ Clear
            </Button>
          )}
          </div>
          
        </div>
      </div>
      )}
      
      {/* Always render grouped view */}
      {renderGroupedView()}
    </div>
  );
};

export default TodosListClean;