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
  User
} from 'lucide-react';
import TodoDialog from '../components/todos/TodoDialog';
import TodosList from '../components/todos/TodosListClean';
import { useSelectedTodos } from '../contexts/SelectedTodosContext';

const TodosPage = () => {
  const { user } = useAuthStore();
  const { selectedDepartment } = useDepartment();
  const { selectedTodoIds, setSelectedTodoIds } = useSelectedTodos();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('incomplete');
  const [filterAssignee, setFilterAssignee] = useState('all');
  
  // Todos data
  const [todos, setTodos] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  
  // Dialog states
  const [showTodoDialog, setShowTodoDialog] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);

  useEffect(() => {
    fetchTodos();
  }, [activeTab, filterAssignee, selectedDepartment]);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const assignedTo = filterAssignee === 'me' ? user.id : 
                        filterAssignee === 'all' ? null : filterAssignee;
      
      const response = await todosService.getTodos(
        null, // Always fetch all todos for accurate counts
        assignedTo,
        true, // Include completed
        selectedDepartment?.id // Filter by selected department
      );
      
      setTodos(response.data.todos || []);
      setTeamMembers(response.data.teamMembers || []);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
      setError('Failed to load to-dos');
    } finally {
      setLoading(false);
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

  const handleMarkComplete = async () => {
    if (selectedTodoIds.length === 0) {
      setError('Please select to-dos to mark as complete');
      return;
    }
    
    if (!window.confirm(`Mark ${selectedTodoIds.length} selected to-do(s) as complete?`)) {
      return;
    }
    
    try {
      // Mark each selected todo as complete
      await Promise.all(selectedTodoIds.map(id => 
        todosService.updateTodo(id, { status: 'complete' })
      ));
      setSelectedTodoIds([]);
      await fetchTodos();
      setSuccess(`${selectedTodoIds.length} to-do(s) marked as complete`);
    } catch (error) {
      console.error('Failed to complete selected todos:', error);
      setError('Failed to mark to-dos as complete');
    }
  };

  const getFilteredTodos = () => {
    if (activeTab === 'all') return todos;
    return todos.filter(todo => todo.status === activeTab);
  };

  const filteredTodos = getFilteredTodos();
  const incompleteTodosCount = todos.filter(t => t.status === 'incomplete').length;
  const completeTodosCount = todos.filter(t => t.status === 'complete').length;

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
            {selectedTodoIds.length > 0 && (
              <Button 
                onClick={handleMarkComplete}
                variant="ghost"
                className="text-gray-600 hover:text-gray-900"
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                Mark Complete ({selectedTodoIds.length})
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
                value="incomplete" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-3 px-4 font-medium"
              >
                Incomplete
                <span className="ml-2 text-sm text-gray-500">({incompleteTodosCount})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="complete" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-3 px-4 font-medium"
              >
                Complete
                <span className="ml-2 text-sm text-gray-500">({completeTodosCount})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-3 px-4 font-medium"
              >
                All
                <span className="ml-2 text-sm text-gray-500">({todos.length})</span>
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

        {/* Main Content */}
        {filteredTodos.length === 0 ? (
          <div className="text-center py-16">
            <ListTodo className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab === 'incomplete' && 'No incomplete to-dos'}
              {activeTab === 'complete' && 'No completed to-dos'}
              {activeTab === 'all' && 'No to-dos yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {activeTab === 'complete' ? 'Completed to-dos will appear here' : 'Create your first to-do to get started'}
            </p>
            {activeTab !== 'complete' && (
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
            onConvertToIssue={handleConvertToIssue}
            showCompleted={activeTab !== 'incomplete'}
          />
        )}

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
