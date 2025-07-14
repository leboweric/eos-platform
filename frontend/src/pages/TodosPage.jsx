import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { todosService } from '../services/todosService';
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
import TodoCard from '../components/todos/TodoCard';

const TodosPage = () => {
  const { user } = useAuthStore();
  const { selectedDepartment } = useDepartment();
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
        activeTab === 'all' ? null : activeTab,
        assignedTo,
        activeTab === 'all',
        selectedDepartment?.id
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">To-Dos{selectedDepartment ? ` - ${selectedDepartment.name}` : ''}</h1>
            <p className="text-gray-600 mt-2 text-lg">Manage your tasks and action items</p>
          </div>
          <Button onClick={handleCreateTodo} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" />
            New To-Do
          </Button>
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between mb-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="incomplete" className="flex items-center gap-2">
                <Square className="h-4 w-4" />
                Incomplete ({incompleteTodosCount})
              </TabsTrigger>
              <TabsTrigger value="complete" className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Complete ({completeTodosCount})
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                All ({todos.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-[200px]">
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
        </div>

        <div className="space-y-4">
          {filteredTodos.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500">
                  {activeTab === 'incomplete' && 'No incomplete to-dos'}
                  {activeTab === 'complete' && 'No completed to-dos'}
                  {activeTab === 'all' && 'No to-dos yet'}
                </p>
                {activeTab !== 'complete' && (
                  <Button 
                    onClick={handleCreateTodo} 
                    variant="outline" 
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first to-do
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredTodos.map(todo => (
              <TodoCard
                key={todo.id}
                todo={todo}
                onEdit={handleEditTodo}
                onDelete={handleDeleteTodo}
                onUpdate={fetchTodos}
              />
            ))
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
