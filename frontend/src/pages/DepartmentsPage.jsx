import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Building2,
  Plus,
  Edit,
  Users,
  Search,
  Loader2,
  AlertCircle,
  Trash2
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
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
      // Log member_count values for debugging
      departmentsArray.forEach(dept => {
        if (dept.member_count !== undefined && dept.member_count !== null) {
          console.log(`Department ${dept.name} member_count:`, dept.member_count, 'Type:', typeof dept.member_count);
        }
      });
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

  const handleDeleteClick = (dept) => {
    setDepartmentToDelete(dept);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!departmentToDelete) return;
    
    try {
      setDeleting(true);
      setError(null);
      await departmentService.deleteDepartment(departmentToDelete.id);
      
      // Update local state
      setDepartments(departments.filter(d => d.id !== departmentToDelete.id));
      
      // Close dialog and reset
      setDeleteDialogOpen(false);
      setDepartmentToDelete(null);
    } catch (error) {
      console.error('Error deleting department:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete department';
      setError(errorMessage);
      
      // If the error is about existing data, keep the dialog open to show the message
      if (!errorMessage.includes('existing data')) {
        setDeleteDialogOpen(false);
      }
    } finally {
      setDeleting(false);
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const totalDepartments = departments.length;
  const activeDepartments = departments.filter(d => d.is_active !== false).length;
  const totalMembers = departments.reduce((sum, dept) => {
    // Ensure member_count is treated as a number
    const memberCount = parseInt(dept.member_count) || 0;
    return sum + memberCount;
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 bg-blue-50/80 backdrop-blur-sm text-blue-700">
              <Building2 className="h-4 w-4" />
              TEAM ORGANIZATION
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">Departments</h1>
            <p className="text-lg text-slate-600">
              Organize your teams into departments for better accountability
            </p>
          </div>
          <Button 
            onClick={() => handleOpenDialog()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-600">Total Departments</p>
                  <p className="text-3xl font-bold text-slate-900">{totalDepartments}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200">
                  <Building2 className="h-8 w-8 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-600">Active Departments</p>
                  <p className="text-3xl font-bold text-slate-900">{activeDepartments}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-100 to-emerald-200">
                  <Building2 className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-600">Total Members</p>
                  <p className="text-3xl font-bold text-slate-900">{totalMembers}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-200">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200/50 bg-red-50/80 backdrop-blur-sm rounded-2xl shadow-sm">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Search departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200"
          />
        </div>

        {/* Departments List */}
        <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl">
          <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20">
            <CardTitle className="text-xl font-bold text-slate-900">All Departments</CardTitle>
          </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
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
                          {parseInt(dept.member_count) || 0}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(dept)}
                            className={`
                              relative inline-flex h-5 w-9 items-center rounded-full
                              transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                              ${dept.is_active !== false ? 'bg-green-600' : 'bg-gray-300'}
                              cursor-pointer hover:opacity-80
                            `}
                            role="switch"
                            aria-checked={dept.is_active !== false}
                            aria-label={`Toggle ${dept.name} active status`}
                          >
                            <span
                              className={`
                                inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm
                                ${dept.is_active !== false ? 'translate-x-5' : 'translate-x-1'}
                              `}
                            />
                          </button>
                          <span className={`text-sm ${dept.is_active !== false ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                            {dept.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(dept)}
                            title="Edit department"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(dept)}
                            title="Delete department"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
          <DialogContent className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl">
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
              <div className="flex items-center space-x-3">
                <Label htmlFor="active" className="text-sm font-medium text-gray-700">
                  Status:
                </Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                    className={`
                      relative inline-flex h-5 w-9 items-center rounded-full
                      transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                      ${formData.is_active ? 'bg-green-600' : 'bg-gray-300'}
                      cursor-pointer hover:opacity-80
                    `}
                    role="switch"
                    aria-checked={formData.is_active}
                    aria-label="Toggle department active status"
                  >
                    <span
                      className={`
                        inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm
                        ${formData.is_active ? 'translate-x-5' : 'translate-x-1'}
                      `}
                    />
                  </button>
                  <span className={`text-sm ${formData.is_active ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
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

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl">
            <DialogHeader>
              <DialogTitle>Delete Department</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <span className="font-semibold">{departmentToDelete?.name}</span>?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  <p className="text-sm text-yellow-800">
                    This action cannot be undone. The department will be permanently deleted.
                  </p>
                  {departmentToDelete?.member_count > 0 && (
                    <p className="text-sm text-yellow-800 mt-2">
                      <strong>Warning:</strong> This department has {departmentToDelete.member_count} member(s).
                      You may need to reassign them before deletion.
                    </p>
                  )}
                </AlertDescription>
              </Alert>
              {error && error.includes('existing data') && (
                <Alert className="mt-3 border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <p className="text-sm text-red-800">
                      {error}
                    </p>
                    <p className="text-sm text-red-800 mt-1">
                      Please remove or reassign all related data before deleting this department.
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setDepartmentToDelete(null);
                  setError(null);
                }} 
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleConfirmDelete} 
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Department'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DepartmentsPage;