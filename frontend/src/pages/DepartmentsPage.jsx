import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { 
  Building2,
  Plus,
  Edit,
  Users,
  Search,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { departmentService } from '../services/departmentService';
import { useAuthStore } from '../stores/authStore';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const { user } = useAuthStore();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    leaderId: '',
    parentDepartmentId: null,
    is_active: true
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
        parentDepartmentId: dept.parentDepartmentId,
        is_active: dept.is_active !== false // Default to true if not set
      });
    } else {
      setEditingDept(null);
      setFormData({
        name: '',
        description: '',
        leaderId: '',
        parentDepartmentId: null,
        is_active: true
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
        parentDepartmentId: null,
        is_active: true
      });
    } catch (error) {
      console.error('Error saving department:', error);
      setError(error.response?.data?.error || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (dept) => {
    try {
      setError(null);
      await departmentService.updateDepartment(dept.id, {
        ...dept,
        is_active: !dept.is_active
      });
      await fetchDepartments();
    } catch (error) {
      console.error('Error toggling department status:', error);
      setError(error.response?.data?.error || 'Failed to update department status');
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const totalDepartments = departments.length;
  const activeDepartments = departments.filter(d => d.is_active !== false).length;
  const totalMembers = departments.reduce((sum, dept) => sum + (dept.member_count || 0), 0);

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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Departments</p>
                <p className="text-2xl font-bold">{totalDepartments}</p>
              </div>
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Departments</p>
                <p className="text-2xl font-bold">{activeDepartments}</p>
              </div>
              <Building2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-2xl font-bold">{totalMembers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
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
      <Card>
        <CardHeader>
          <CardTitle>All Departments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg font-medium">No departments found</p>
              <p className="text-gray-500 text-sm mt-1">
                {searchTerm ? 'Try adjusting your search' : 'Create your first department to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Department</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Members</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepartments.map((dept) => (
                    <tr key={dept.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <Building2 className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="font-medium">{dept.name}</p>
                            {dept.leader_name && (
                              <p className="text-sm text-gray-500">Led by {dept.leader_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-600 max-w-xs truncate">
                          {dept.description || '-'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="secondary">
                          {dept.member_count || 0}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={dept.is_active !== false}
                            onCheckedChange={() => handleToggleActive(dept)}
                            aria-label={`Toggle ${dept.name} active status`}
                          />
                          <span className="ml-2 text-sm">
                            {dept.is_active !== false ? (
                              <span className="text-green-600">Active</span>
                            ) : (
                              <span className="text-gray-500">Inactive</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(dept)}
                          title="Edit department"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
            {editingDept && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="active" className="cursor-pointer">
                  Department is active
                </Label>
              </div>
            )}
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
    </div>
  );
};

export default DepartmentsPage;