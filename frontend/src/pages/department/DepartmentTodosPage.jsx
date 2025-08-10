import { useOutletContext } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { todosService } from '../../services/todosService';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, CheckSquare, Loader2, Calendar, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const DepartmentTodosPage = () => {
  const { department } = useOutletContext();
  const { user } = useAuthStore();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (department) {
      fetchTodos();
    }
  }, [department]);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      
      // Use the department's first team ID if available, otherwise use department ID
      const teamId = department.teams && department.teams.length > 0 
        ? department.teams[0].id 
        : department.id;
      
      // Fetch department-specific todos
      const data = await todosService.getTodos(orgId, teamId);
      setTodos(data.todos || []);
    } catch (error) {
      console.error('Error fetching department todos:', error);
      setError('Failed to load to-dos');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTodo = async (todoId, completed) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      await todosService.updateTodo(orgId, department.id, todoId, { completed });
      
      setTodos(prev => 
        prev.map(todo => 
          todo.id === todoId ? { ...todo, completed } : todo
        )
      );
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">To-Dos</h2>
          <p className="text-gray-600 mt-1">
            Action items for {department.name}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add To-Do
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {todos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckSquare className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg font-medium">No to-dos yet</p>
            <p className="text-gray-500 text-sm mt-1">
              Create your first department to-do to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {todos.map(todo => (
            <Card key={todo.id} className={todo.completed ? 'opacity-60' : ''}>
              <CardContent className="flex items-center space-x-4 py-4">
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={(checked) => handleToggleTodo(todo.id, checked)}
                />
                <div className="flex-1">
                  <div className={`font-medium ${todo.completed ? 'line-through text-gray-500' : ''}`}>
                    {todo.title}
                  </div>
                  {/* Description hidden from main view - only shown in edit dialog */}
                  <div className="flex items-center space-x-4 mt-2">
                    {todo.assignee_name && (
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-3 w-3 mr-1" />
                        {todo.assignee_name}
                      </div>
                    )}
                    {todo.due_date && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(todo.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant={todo.priority === 'high' ? 'destructive' : 'secondary'}>
                  {todo.priority}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DepartmentTodosPage;