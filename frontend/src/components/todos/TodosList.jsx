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
  CheckCircle,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { todosService } from '../../services/todosService';
import { issuesService } from '../../services/issuesService';
import { useSelectedTodos } from '../../contexts/SelectedTodosContext';

const TodosList = ({ 
  todos, 
  onEdit, 
  onDelete,
  onUpdate,
  onConvertToIssue,
  showCompleted = true
}) => {
  const { selectedTodoIds, toggleTodo, isSelected } = useSelectedTodos();
  const [expandedOwners, setExpandedOwners] = useState({});
  const [convertingToIssue, setConvertingToIssue] = useState({});
  const [issueCreatedSuccess, setIssueCreatedSuccess] = useState({});
  
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
  

  const handleMakeItAnIssue = async (todo) => {
    try {
      setConvertingToIssue(prev => ({ ...prev, [todo.id]: true }));
      
      // Format the due date for display
      const dueDate = todo.due_date ? format(parseDateAsLocal(todo.due_date), 'MMM d, yyyy') : 'Not set';
      const assigneeName = todo.assigned_to 
        ? `${todo.assigned_to.first_name} ${todo.assigned_to.last_name}`
        : 'Unassigned';
      
      // Create the issue directly without confirmation
      const issueData = {
        title: todo.title,
        description: `This issue was created from an overdue to-do.\n\nOriginal due date: ${dueDate} (OVERDUE)\nAssigned to: ${assigneeName}\n\nDescription:\n${todo.description || 'No description provided'}`,
        timeline: 'short_term',
        ownerId: todo.assigned_to?.id || null
      };
      
      await issuesService.createIssue(issueData);
      
      // Don't cancel the todo - just create the issue
      // This allows the todo to remain active while also being tracked as an issue
      
      setConvertingToIssue(prev => ({ ...prev, [todo.id]: false }));
      setIssueCreatedSuccess(prev => ({ ...prev, [todo.id]: true }));
      
      // Don't call onUpdate - this prevents the card from collapsing
      // The issue has been created successfully, no need to refresh the entire list
      
      // Reset success state after 5 seconds to give user time to see it
      setTimeout(() => {
        setIssueCreatedSuccess(prev => {
          const newState = { ...prev };
          delete newState[todo.id];
          return newState;
        });
      }, 5000);
    } catch (error) {
      console.error('Failed to convert to issue:', error);
      setConvertingToIssue(prev => ({ ...prev, [todo.id]: false }));
    }
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
                    todo.status === 'complete' ? 'opacity-75' : ''
                  } ${
                    isOverdue(todo) ? 'bg-red-50 hover:bg-red-100' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Selection checkbox - always show */}
                    <div className="flex items-center">
                      <Checkbox
                        checked={isSelected(todo.id)}
                        onCheckedChange={() => toggleTodo(todo.id)}
                        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                    </div>
                
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className={`font-medium ${
                            todo.status === 'complete' || isSelected(todo.id) ? 'line-through text-gray-500' : 'text-gray-900'
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
                                {isOverdue(todo) && (
                                  <>
                                    <span className="ml-1">(Overdue)</span>
                                    <Button
                                      size="sm"
                                      variant={issueCreatedSuccess[todo.id] ? "default" : "outline"}
                                      className={issueCreatedSuccess[todo.id]
                                        ? "h-6 px-2 ml-2 bg-green-600 hover:bg-green-700 text-white"
                                        : "h-6 px-2 ml-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                                      }
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMakeItAnIssue(todo);
                                      }}
                                      disabled={convertingToIssue[todo.id] || issueCreatedSuccess[todo.id]}
                                      title="Convert this overdue todo to an issue"
                                    >
                                      {convertingToIssue[todo.id] ? (
                                        <>
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                          <span className="text-xs">Creating...</span>
                                        </>
                                      ) : issueCreatedSuccess[todo.id] ? (
                                        <>
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          <span className="text-xs">Issue Created!</span>
                                        </>
                                      ) : (
                                        <>
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          <span className="text-xs">Make it an Issue</span>
                                        </>
                                      )}
                                    </Button>
                                  </>
                                )}
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