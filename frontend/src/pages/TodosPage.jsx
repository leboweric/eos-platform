import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { todosService } from '../services/todosService';
import { issuesService } from '../services/issuesService';
import { organizationService } from '../services/organizationService';
import { getOrgTheme, saveOrgTheme } from '../utils/themeUtils';
import { exportTodosToExcel } from '../utils/excelExport';
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
  Archive,
  Download,
  Sparkles,
  Activity,
  Target,
  Users,
  Calendar,
  TrendingUp
} from 'lucide-react';
import TodoDialog from '../components/todos/TodoDialog';
import TodosListClean from '../components/todos/TodosListClean';
import { useSelectedTodos } from '../contexts/SelectedTodosContext';
import { useTerminology } from '../contexts/TerminologyContext';

const TodosPage = () => {
  const { user } = useAuthStore();
  const { selectedDepartment } = useDepartment();
  const { selectedTodoIds, setSelectedTodoIds } = useSelectedTodos();
  const { labels } = useTerminology();
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('not-done');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  
  // Todos data
  const [todos, setTodos] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  
  // Dialog states
  const [showTodoDialog, setShowTodoDialog] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);

  useEffect(() => {
    fetchTodos();
    fetchOrganizationTheme();
    
    // Listen for theme changes
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
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


  const fetchOrganizationTheme = async () => {
    try {
      // First check localStorage
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
        setSuccess(`${labels.todos_label.slice(0, -1)} updated successfully`);
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

  const handleCreateIssueFromTodo = async (todo) => {
    try {
      const effectiveTeamId = selectedDepartment?.id || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await issuesService.createIssue({
        title: `Issue from To-Do: ${todo.title}`,
        description: `Related to to-do: ${todo.title}\n\n${todo.description || ''}`,
        ownerId: todo.assigned_to_id || todo.assignee_id || user?.id,
        teamId: effectiveTeamId,
        related_todo_id: todo.id // Link back to the todo
      });
      
      setSuccess('Issue created successfully from to-do');
      // Close the dialog after creating
      setShowTodoDialog(false);
      setEditingTodo(null);
    } catch (error) {
      console.error('Failed to create issue from todo:', error);
      
      // Check if it's a duplicate issue error
      if (error.response?.status === 409) {
        setError('An issue has already been created for this to-do. Each to-do can only have one linked issue.');
      } else {
        setError('Failed to create issue from to-do');
      }
    }
  };

  const handleDeleteTodo = async (todoId) => {
    if (!window.confirm(`Are you sure you want to delete this ${labels.todos_label.slice(0, -1).toLowerCase()}?`)) {
      return;
    }

    try {
      await todosService.deleteTodo(todoId);
      setSuccess(`${labels.todos_label.slice(0, -1)} deleted successfully`);
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
      
      setSuccess(`${labels.todos_label.slice(0, -1)} converted to ${labels.issues_label.slice(0, -1).toLowerCase()} successfully`);
      await fetchTodos();
    } catch (error) {
      console.error('Failed to convert todo to issue:', error);
      setError('Failed to convert to-do to issue');
    }
  };

  const handleArchiveDone = async () => {
    try {
      const result = await todosService.archiveDoneTodos();
      setSuccess(`${result.data.archivedCount} done ${labels.todos_label.toLowerCase()} archived`);
      await fetchTodos();
    } catch (error) {
      console.error('Failed to archive done todos:', error);
      setError('Failed to archive done to-dos');
    }
  };

  const handleMarkComplete = async () => {
    if (selectedTodoIds.length === 0) {
      setError(`Please select ${labels.todos_label.toLowerCase()} to mark as done`);
      return;
    }
    
    if (!window.confirm(`Mark ${selectedTodoIds.length} selected ${labels.todos_label.toLowerCase()} as done?`)) {
      return;
    }
    
    try {
      // Mark each selected todo as complete
      await Promise.all(selectedTodoIds.map(id => 
        todosService.updateTodo(id, { status: 'complete' })
      ));
      setSelectedTodoIds([]);
      await fetchTodos();
      setSuccess(`${selectedTodoIds.length} ${labels.todos_label.toLowerCase()} marked as done`);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
                   style={{
                     background: `linear-gradient(135deg, ${themeColors.primary}15 0%, ${themeColors.secondary}15 100%)`,
                     color: themeColors.primary
                   }}>
                <Activity className="h-4 w-4" />
                TASK MANAGEMENT
              </div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                {labels.todos_label}{selectedDepartment ? ` - ${selectedDepartment.name}` : ''}
              </h1>
              <p className="text-lg text-slate-600">Manage and track your action items</p>
            </div>
            <div className="flex items-center gap-3">
            {doneNotArchivedCount > 0 && activeTab === 'not-done' && (
              <Button 
                onClick={handleArchiveDone}
                variant="ghost"
                className="text-gray-600 transition-all duration-200 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 rounded-lg"
                onMouseEnter={(e) => e.currentTarget.style.color = themeColors.primary}
                onMouseLeave={(e) => e.currentTarget.style.color = ''}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive Done ({doneNotArchivedCount})
              </Button>
            )}
            {selectedTodoIds.length > 0 && (
              <Button 
                onClick={handleMarkComplete}
                variant="ghost"
                className="text-gray-600 transition-all duration-200 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 rounded-lg"
                onMouseEnter={(e) => e.currentTarget.style.color = themeColors.primary}
                onMouseLeave={(e) => e.currentTarget.style.color = ''}
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                Mark Done ({selectedTodoIds.length})
              </Button>
            )}
            <Button
              onClick={() => {
                if (todos.length > 0) {
                  exportTodosToExcel(todos);
                } else {
                  setError('No to-dos to export');
                }
              }}
              variant="outline"
              className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm transition-all duration-200"
            >
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
            <Button 
              onClick={handleCreateTodo} 
              className="text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              style={{ 
                background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New {labels.todos_label.slice(0, -1)}
            </Button>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total {labels.todos_label}</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: themeColors.primary }}>
                    {todos.length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl flex items-center justify-center"
                     style={{ background: `linear-gradient(135deg, ${themeColors.primary}15 0%, ${themeColors.secondary}15 100%)` }}>
                  <ListTodo className="h-6 w-6" style={{ color: themeColors.primary }} />
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Not Done</p>
                  <p className="text-2xl font-bold mt-1 text-orange-600">
                    {notDoneTodosCount}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Target className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Completed</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">
                    {doneTodosCount}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
                  <CheckSquare className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Team Members</p>
                  <p className="text-2xl font-bold mt-1 text-blue-600">
                    {teamMembers.length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm rounded-xl mb-6">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50/80 backdrop-blur-sm rounded-xl mb-6">
            <Sparkles className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 font-medium">{success}</AlertDescription>
          </Alert>
        )}

        {/* Enhanced Filters Bar */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50 mb-6">
          <div className="flex items-center justify-between">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 inline-flex shadow-sm">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="border-0">
                <TabsList className="bg-transparent border-0 p-0 h-auto gap-1">
                  <TabsTrigger 
                    value="not-done" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-200 font-medium px-4 py-2"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Not Done
                    <span className="ml-2 text-sm opacity-80">({notDoneTodosCount})</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="done" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-200 font-medium px-4 py-2"
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Done
                    <span className="ml-2 text-sm opacity-80">({doneTodosCount})</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-[200px] bg-white/80 backdrop-blur-sm border-white/20 focus:border-gray-400 shadow-sm">
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

        {/* Main Content with smooth transition */}
        <div className="transition-opacity duration-200 ease-in-out">
          {filteredTodos.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 shadow-sm border border-white/50 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
                   style={{ background: `linear-gradient(135deg, ${themeColors.primary}15 0%, ${themeColors.secondary}15 100%)` }}>
                <ListTodo className="h-8 w-8" style={{ color: themeColors.primary }} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {activeTab === 'not-done' && 'No to-dos not done'}
                {activeTab === 'done' && 'No done to-dos'}
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {activeTab === 'done' ? 'Done to-dos will appear here once you complete them' : 'Create your first to-do to get started with task management'}
              </p>
              {activeTab !== 'done' && (
                <Button 
                  onClick={handleCreateTodo} 
                  className="shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  style={{ 
                    background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create {labels.todos_label.slice(0, -1)}
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg p-6">
              <TodosListClean
                todos={filteredTodos}
                onEdit={handleEditTodo}
                onDelete={handleDeleteTodo}
                onUpdate={fetchTodos}
                onStatusChange={handleStatusChange}
                onConvertToIssue={handleConvertToIssue}
                showCompleted={true}
              />
            </div>
          )}
        </div>

        {/* Todo Dialog */}
        <TodoDialog
          open={showTodoDialog}
          onOpenChange={setShowTodoDialog}
          todo={editingTodo}
          teamMembers={teamMembers}
          onSave={handleSaveTodo}
          onCreateIssue={handleCreateIssueFromTodo}
        />
      </div>
    </div>
  );
};

export default TodosPage;
