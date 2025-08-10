import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Building2,
  Plus,
  Edit,
  Trash2,
  Users,
  ChevronRight,
  Search,
  Loader2,
  Target,
  BarChart,
  Calendar,
  CheckSquare,
  AlertCircle,
  UserPlus,
  Settings
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { departmentService } from '../services/departmentService';
import { teamsService } from '../services/teamsService';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [selectedDeptForTeams, setSelectedDeptForTeams] = useState(null);
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  const [teamFormData, setTeamFormData] = useState({
    name: '',
    description: ''
  });
  const [savingTeam, setSavingTeam] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    leaderId: '',
    parentDepartmentId: null
  });

  // Fetch departments from API
  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await departmentService.getDepartments();
      console.log('Departments API response:', response);
      
      // Handle different response structures
      const departmentsData = response.data || response.departments || response;
      
      // Ensure it's an array
      const departmentsArray = Array.isArray(departmentsData) ? departmentsData : [];
      
      console.log('Departments to set:', departmentsArray);
      setDepartments(departmentsArray);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (dept = null) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({
        name: dept.name,
        description: dept.description || '',
        leaderId: dept.leaderId || '',
        parentDepartmentId: dept.parentDepartmentId
      });
    } else {
      setEditingDept(null);
      setFormData({
        name: '',
        description: '',
        leaderId: '',
        parentDepartmentId: null
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      if (editingDept) {
        // Update existing department
        await departmentService.updateDepartment(editingDept.id, formData);
      } else {
        // Add new department
        await departmentService.createDepartment(formData);
      }
      
      await fetchDepartments();
      setDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        leaderId: '',
        parentDepartmentId: null
      });
    } catch (error) {
      console.error('Error saving department:', error);
      setError(error.response?.data?.error || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (deptId) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        setDeleting(deptId);
        setError(null);
        await departmentService.deleteDepartment(deptId);
        await fetchDepartments();
      } catch (error) {
        console.error('Error deleting department:', error);
        setError(error.response?.data?.error || 'Failed to delete department');
      } finally {
        setDeleting(null);
      }
    }
  };

  const handleCreateTeam = async () => {
    try {
      setSavingTeam(true);
      setError(null);
      
      const newTeam = await teamsService.createTeam({
        name: teamFormData.name,
        description: teamFormData.description,
        department_id: selectedDeptForTeams.id,
        is_leadership_team: false
      });
      
      // Refresh departments to show the new team
      await fetchDepartments();
      
      // Close dialog and reset form
      setCreateTeamDialogOpen(false);
      setTeamFormData({ name: '', description: '' });
      
      // Optionally, show success message
    } catch (error) {
      console.error('Error creating team:', error);
      setError(error.response?.data?.error || 'Failed to create team');
    } finally {
      setSavingTeam(false);
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const DepartmentCard = ({ department, isSubDept = false }) => (
    <Card className={isSubDept ? 'ml-8' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building2 className="h-5 w-5 text-gray-600" />
            <div>
              <CardTitle className="text-lg">{department.name}</CardTitle>
              {department.leader_name && (
                <p className="text-sm text-gray-600 mt-1">
                  Led by {department.leader_name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              <Users className="h-3 w-3 mr-1" />
              {department.member_count || 0} members
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenDialog(department)}
              title="Edit department"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(department.id)}
              disabled={deleting === department.id}
              title="Delete department"
            >
              {deleting === department.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {department.description && (
          <p className="text-gray-600 mb-4">{department.description}</p>
        )}
        
        {/* Teams Section */}
        {department.teams && department.teams.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 flex items-center">
                <Users className="h-4 w-4 mr-1" />
                Teams ({department.teams.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDeptForTeams(department);
                  setTeamDialogOpen(true);
                }}
                className="text-xs"
              >
                <Settings className="h-3 w-3 mr-1" />
                Manage
              </Button>
            </div>
            <div className="space-y-1">
              {department.teams.map(team => (
                <div key={team.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{team.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {team.member_count || 0} members
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Department Management Actions */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/departments/${department.id}/priorities`)}
            className="flex items-center justify-center"
          >
            <Target className="h-4 w-4 mr-1" />
            Priorities
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/departments/${department.id}/scorecard`)}
            className="flex items-center justify-center"
          >
            <BarChart className="h-4 w-4 mr-1" />
            Scorecard
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/departments/${department.id}/meetings`)}
            className="flex items-center justify-center"
          >
            <Calendar className="h-4 w-4 mr-1" />
            Meetings
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/departments/${department.id}/todos`)}
            className="flex items-center justify-center"
          >
            <CheckSquare className="h-4 w-4 mr-1" />
            To-Dos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/departments/${department.id}/issues`)}
            className="flex items-center justify-center"
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Issues
          </Button>
        </div>
        
        {!isSubDept && department.subDepartments?.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2 flex items-center">
              <ChevronRight className="h-4 w-4 mr-1" />
              Sub-departments
            </p>
            <div className="space-y-3">
              {department.subDepartments.map(subDept => (
                <DepartmentCard
                  key={subDept.id}
                  department={subDept}
                  isSubDept={true}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Departments</h1>
          <p className="text-gray-600 mt-2">
            Organize your teams into departments for better accountability
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search departments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Departments List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : filteredDepartments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg font-medium">No departments found</p>
            <p className="text-gray-500 text-sm mt-1">
              {searchTerm ? 'Try adjusting your search' : 'Create your first department to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDepartments.map(dept => (
            <DepartmentCard key={dept.id} department={dept} />
          ))}
        </div>
      )}

      {/* Department Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDept ? 'Edit Department' : 'Create Department'}
            </DialogTitle>
            <DialogDescription>
              Set up your department structure for better organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Department Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Sales, Marketing, Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this department do?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent">Parent Department (Optional)</Label>
              <select
                id="parent"
                className="w-full rounded-md border border-gray-300 p-2"
                value={formData.parentDepartmentId || ''}
                onChange={(e) => setFormData({ ...formData, parentDepartmentId: e.target.value || null })}
              >
                <option value="">None (Top-level department)</option>
                {departments.filter(d => d.id !== editingDept?.id).map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingDept ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{editingDept ? 'Update' : 'Create'} Department</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Management Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Manage Teams - {selectedDeptForTeams?.name}
            </DialogTitle>
            <DialogDescription>
              View and manage teams within this department
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedDeptForTeams?.teams && selectedDeptForTeams.teams.length > 0 ? (
              <div className="space-y-3">
                {selectedDeptForTeams.teams.map(team => (
                  <Card key={team.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <h4 className="font-medium">{team.name}</h4>
                        {team.description && (
                          <p className="text-sm text-gray-600 mt-1">{team.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant="secondary">
                            <Users className="h-3 w-3 mr-1" />
                            {team.member_count || 0} members
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/departments/${selectedDeptForTeams.id}/teams/${team.id}`)}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Manage Members
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600">
                No teams found for this department
              </div>
            )}
            
            <div className="pt-4 border-t">
              <Button 
                className="w-full"
                onClick={() => {
                  setCreateTeamDialogOpen(true);
                  setTeamFormData({ name: '', description: '' });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Team
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Team Dialog */}
      <Dialog open={createTeamDialogOpen} onOpenChange={setCreateTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create New Team
            </DialogTitle>
            <DialogDescription>
              Add a new team to {selectedDeptForTeams?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                value={teamFormData.name}
                onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                placeholder="e.g., Product Team, Support Team"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamDescription">Description</Label>
              <Textarea
                id="teamDescription"
                value={teamFormData.description}
                onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
                placeholder="What does this team do?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTeamDialogOpen(false)} disabled={savingTeam}>
              Cancel
            </Button>
            <Button onClick={handleCreateTeam} disabled={savingTeam || !teamFormData.name}>
              {savingTeam ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Team'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartmentsPage;