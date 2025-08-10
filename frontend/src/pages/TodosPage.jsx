import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { todosService } from '../services/todosService';
import { issuesService } from '../services/issuesService';
import { useDepartment } from '../contexts/DepartmentContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus,
  Loader2,
  AlertCircle,
  CheckSquare,
  Square,
  ListTodo,
  User,
  Archive
} from 'lucide-react';
import TodoDialog from '../components/todos/TodoDialog';
import TodosList from '../components/todos/TodosList';
import { useSelectedTodos } from '../contexts/SelectedTodosContext';

const TodosPage = () => {
  const { user } = useAuthStore();
  const { selectedDepartment } = useDepartment();
  const { selectedTodoIds, setSelectedTodoIds } = useSelectedTodos();
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('not-done');
  const [filterAssignee, setFilterAssignee] = useState('all');
  
  // Todos data
  const [todos, setTodos] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  
  // Dialog states
  const [showTodoDialog, setShowTodoDialog] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);

  useEffect(() => {
    fetchTodos();
  }, [filterAssignee, selectedDepartment]);

  // Helper function to check if a todo is overdue
  const isOverdue = (todo) => {
    if (!todo.due_date || todo.status === 'complete' || todo.status === 'cancelled') {
      return false;
    }
    const dueDate = new Date(todo.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  // Automatically create issues for overdue todos
  const createIssuesForOverdueTodos = async (todos) => {
    try {
      // Get todos that are overdue
      const overdueTodos = todos.filter(todo => 
        isOverdue(todo) && 
        todo.status !== 'complete' &&
        todo.status !== 'cancelled'
      );

      if (overdueTodos.length === 0) return;

      let issuesCreated = 0;
      
      for (const todo of overdueTodos) {
        try {
          const dueDate = new Date(todo.due_date).toLocaleDateString();
          const assigneeName = todo.assigned_to 
            ? `${todo.assigned_to.first_name} ${todo.assigned_to.last_name}`
            : 'Unassigned';
          
          // Calculate how many days overdue
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dueDateObj = new Date(todo.due_date);
          dueDateObj.setHours(0, 0, 0, 0);
          const daysOverdue = Math.floor((today - dueDateObj) / (1000 * 60 * 60 * 24));

          const issueData = {
            title: `Overdue: ${todo.title}`,
            description: `This to-do is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue and needs immediate attention.\n\nOriginal due date: ${dueDate}\nAssigned to: ${assigneeName}\n\nDescription:\n${todo.description || 'No description provided'}`,
            timeline: 'short_term',
            ownerId: todo.assigned_to?.id || null,
            department_id: selectedDepartment?.id || todo.team_id,
            priority_level: 'high', // High priority since it's overdue
            related_todo_id: todo.id // Track which todo this came from
          };
          
          await issuesService.createIssue(issueData);
          issuesCreated++;
        } catch (error) {
          // If it's a duplicate error (unique constraint violation), that's okay - just skip
          if (error.response?.status === 409 || error.response?.data?.message?.includes('duplicate') || error.response?.data?.message?.includes('unique')) {
            console.log(`Issue already exists for todo: ${todo.title}`);
          } else {
            console.error(`Failed to create issue for overdue todo: ${todo.title}`, error);
          }
        }
      }
      
      if (issuesCreated > 0) {
        setSuccess(`${issuesCreated} issue${issuesCreated > 1 ? 's' : ''} created for overdue to-dos`);
      }
    } catch (error) {
      console.error('Failed to create issues for overdue todos:', error);
    }
  };

  const fetchTodos = async () => {
    try {
      // Only show loading spinner on initial load
      if (initialLoad) {
        setLoading(true);
      }
      setError(null);
      
      const assignedTo = filterAssignee === 'me' ? user.id : 
                        filterAssignee === 'all' ? null : filterAssignee;
      
      const response = await todosService.getTodos(
        null, // Always fetch all todos for accurate counts
        assignedTo,
        true, // Include completed
        selectedDepartment?.id, // Filter by selected department
        true // Include archived to show in the archived tab
      );
      
      const fetchedTodos = response.data.todos || [];
      setTodos(fetchedTodos);
      setTeamMembers(response.data.teamMembers || []);
      
      // Automatically create issues for overdue todos
      await createIssuesForOverdueTodos(fetchedTodos);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
      setError('Failed to load to-dos');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const handleCreateTodo = () => {
    setEditingTodo(null);
    setShowTodoDialog(true);
  };

  const handleEditTodo = (todo) => {
    setEditingTodo(todo);
    setShowTodoDialog(true);
  };

  const handleSaveTodo = async (todoData) => {
    try {
      let savedTodo;
      if (editingTodo) {
        savedTodo = await todosService.updateTodo(editingTodo.id, todoData);
        setSuccess('To-do updated successfully');
      } else {
        savedTodo = await todosService.createTodo({
          ...todoData,
          department_id: selectedDepartment?.id
        });
        setSuccess('To-do created successfully');
      }
      
      await fetchTodos();
      setShowTodoDialog(false);
      return savedTodo;
    } catch (error) {
      console.error('Failed to save todo:', error);
      throw error;
    }
  };

  const handleDeleteTodo = async (todoId) => {
    if (!window.confirm('Are you sure you want to delete this to-do?')) {
      return;
    }

    try {
      await todosService.deleteTodo(todoId);
      setSuccess('To-do deleted successfully');
      await fetchTodos();
    } catch (error) {
      console.error('Failed to delete todo:', error);
      setError('Failed to delete to-do');
    }
  };

  const handleStatusChange = async (todoId, completed) => {
    try {
      await todosService.updateTodo(todoId, { 
        status: completed ? 'complete' : 'incomplete' 
      });
      // Update local state instead of refetching to avoid flashing
      setTodos(prevTodos => 
        prevTodos.map(todo => 
          todo.id === todoId 
            ? { ...todo, status: completed ? 'complete' : 'incomplete' }
            : todo
        )
      );
    } catch (error) {
      console.error('Failed to update todo status:', error);
      setError('Failed to update to-do status');
      // Refetch on error to ensure consistency
      await fetchTodos();
    }
  };

  const handleConvertToIssue = async (todo) => {
    if (!window.confirm(`Convert "${todo.title}" to an issue? This will cancel the to-do.`)) {
      return;
    }

    try {
      // Format the due date for display
      const dueDate = todo.due_date ? new Date(todo.due_date).toLocaleDateString() : 'Not set';
      const assigneeName = todo.assigned_to 
        ? `${todo.assigned_to.first_name} ${todo.assigned_to.last_name}`
        : 'Unassigned';

      const issueData = {
        title: todo.title,
        description: `This issue was created from a to-do.\n\nOriginal due date: ${dueDate}\nAssigned to: ${assigneeName}\n\nDescription:\n${todo.description || 'No description provided'}`,
        timeline: 'short_term',
        ownerId: todo.assigned_to?.id || null,
        department_id: selectedDepartment?.id
      };
      
      await issuesService.createIssue(issueData);
      
      // Mark the todo as cancelled
      await todosService.updateTodo(todo.id, { status: 'cancelled' });
      
      setSuccess(`To-do converted to issue successfully`);
      await fetchTodos();
    } catch (error) {
      console.error('Failed to convert todo to issue:', error);
      setError('Failed to convert to-do to issue');
    }
  };

  const handleArchiveDone = async () => {
    try {
      const result = await todosService.archiveDoneTodos();
      setSuccess(`${result.data.archivedCount} done to-do(s) archived`);
      await fetchTodos();
    } catch (error) {
      console.error('Failed to archive done todos:', error);
      setError('Failed to archive done to-dos');
    }
  };

  const handleMarkComplete = async () => {
    if (selectedTodoIds.length === 0) {
      setError('Please select to-dos to mark as done');
      return;
    }
    
    if (!window.confirm(`Mark ${selectedTodoIds.length} selected to-do(s) as done?`)) {
      return;
    }
    
    try {
      // Mark each selected todo as complete
      await Promise.all(selectedTodoIds.map(id => 
        todosService.updateTodo(id, { status: 'complete' })
      ));
      setSelectedTodoIds([]);
      await fetchTodos();
      setSuccess(`${selectedTodoIds.length} to-do(s) marked as done`);
    } catch (error) {
      console.error('Failed to complete selected todos:', error);
      setError('Failed to mark to-dos as done');
    }
  };

  const getFilteredTodos = () => {
    if (activeTab === 'not-done') {
      // Show all non-archived todos (both done and not done)
      // Handle missing archived field for backwards compatibility
      return todos.filter(todo => todo.archived !== true);
    }
    if (activeTab === 'done') {
      // Show only archived todos
      return todos.filter(todo => todo.archived === true);
    }
    return todos;
  };

  const filteredTodos = getFilteredTodos();
  const notDoneTodosCount = todos.filter(t => t.archived !== true).length;
  const doneTodosCount = todos.filter(t => t.archived === true).length;
  const doneNotArchivedCount = todos.filter(t => t.status === 'complete' && t.archived !== true).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Clean Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">To-Dos{selectedDepartment ? ` - ${selectedDepartment.name}` : ''}</h1>
          </div>
          <div className="flex items-center gap-3">
            {doneNotArchivedCount > 0 && activeTab === 'not-done' && (
              <Button 
                onClick={handleArchiveDone}
                variant="ghost"
                className="text-gray-600 hover:text-gray-900"
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive Done ({doneNotArchivedCount})
              </Button>
            )}
            {selectedTodoIds.length > 0 && (
              <Button 
                onClick={handleMarkComplete}
                variant="ghost"
                className="text-gray-600 hover:text-gray-900"
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                Mark Done ({selectedTodoIds.length})
              </Button>
            )}
            <Button onClick={handleCreateTodo} className="bg-gray-900 hover:bg-gray-800 text-white">
              <Plus className="mr-2 h-4 w-4" />
              New To-Do
            </Button>
          </div>
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50 mb-6">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 mb-6">
            <CheckSquare className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Clean Filters Bar */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="border-0">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger 
                value="not-done" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-3 px-4 font-medium"
              >
                Not Done
                <span className="ml-2 text-sm text-gray-500">({notDoneTodosCount})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="done" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-3 px-4 font-medium"
              >
                Done
                <span className="ml-2 text-sm text-gray-500">({doneTodosCount})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-[200px] border-gray-200 focus:border-gray-400">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Team Members</SelectItem>
              <SelectItem value="me">Assigned to Me</SelectItem>
              {teamMembers.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  {member.first_name} {member.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Main Content with smooth transition */}
        <div className="transition-opacity duration-200 ease-in-out">
          {filteredTodos.length === 0 ? (
            <div className="text-center py-16">
              <ListTodo className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === 'not-done' && 'No to-dos not done'}
                {activeTab === 'done' && 'No done to-dos'}
              </h3>
              <p className="text-gray-500 mb-6">
                {activeTab === 'done' ? 'Done to-dos will appear here' : 'Create your first to-do to get started'}
              </p>
              {activeTab !== 'done' && (
                <Button 
                  onClick={handleCreateTodo} 
                  variant="outline"
                  className="border-gray-300"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create To-Do
                </Button>
              )}
            </div>
          ) : (
            <TodosList
              todos={filteredTodos}
              onEdit={handleEditTodo}
              onDelete={handleDeleteTodo}
              onUpdate={fetchTodos}
              onStatusChange={handleStatusChange}
              onConvertToIssue={handleConvertToIssue}
              showCompleted={true}
            />
          )}
        </div>

        {/* Todo Dialog */}
        <TodoDialog
          open={showTodoDialog}
          onOpenChange={setShowTodoDialog}
          todo={editingTodo}
          teamMembers={teamMembers}
          onSave={handleSaveTodo}
        />
      </div>
    </div>
  );
};

export default TodosPage;
