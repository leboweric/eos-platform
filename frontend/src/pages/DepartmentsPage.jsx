import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Building2,
  Plus,
  Edit,
  Users,
  Search,
  Loader2,
  AlertCircle,
  Trash2,
  X,
  UserPlus,
  ChevronDown
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
  const [expandedDepts, setExpandedDepts] = useState(new Set());
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const { user } = useAuthStore();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    leaderId: '',
    parentDepartmentId: null,
    is_active: true
  });

  // Toggle department expansion
  const toggleDeptExpanded = (deptId) => {
    setExpandedDepts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deptId)) {
        newSet.delete(deptId);
      } else {
        newSet.add(deptId);
      }
      return newSet;
    });
  };

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
    const newStatus = !dept.is_active;
    const currentStatus = dept.is_active;
    
    // Optimistic UI update
    setDepartments(prevDepartments => 
      prevDepartments.map(d => 
        d.id === dept.id ? { ...d, is_active: newStatus } : d
      )
    );
    
    try {
      setError(null);
      await departmentService.updateDepartment(dept.id, {
        is_active: newStatus
      });
    } catch (error) {
      // Revert on error
      setDepartments(prevDepartments => 
        prevDepartments.map(d => 
          d.id === dept.id ? { ...d, is_active: currentStatus } : d
        )
      );
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

  // Handle add member click
  const handleAddMemberClick = async (dept) => {
    setSelectedDepartment(dept);
    setAddMemberDialogOpen(true);
    
    // Fetch all users in the organization
    try {
      const response = await fetch(`/api/v1/organizations/${user.organizationId}/users/organization`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      const users = data.users || data;
      
      // Filter out users already in the department
      const currentMemberIds = new Set(dept.members?.map(m => m.id) || []);
      const available = users.filter(u => !currentMemberIds.has(u.id));
      setAvailableUsers(available);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    }
  };

  // Handle add member submit
  const handleAddMember = async () => {
    if (!selectedUserId || !selectedDepartment) return;
    
    try {
      setSaving(true);
      await departmentService.addMember(selectedDepartment.id, selectedUserId);
      
      // Refresh departments
      await fetchDepartments();
      
      // Close dialog and reset
      setAddMemberDialogOpen(false);
      setSelectedDepartment(null);
      setSelectedUserId('');
      setAvailableUsers([]);
    } catch (error) {
      console.error('Error adding member:', error);
      setError(error.response?.data?.error || 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  // Handle remove member
  const handleRemoveMember = async (departmentId, userId) => {
    if (!confirm('Are you sure you want to remove this member from the department?')) {
      return;
    }
    
    try {
      await departmentService.removeMember(departmentId, userId);
      
      // Refresh departments
      await fetchDepartments();
    } catch (error) {
      console.error('Error removing member:', error);
      setError(error.response?.data?.error || 'Failed to remove member');
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const totalDepartments = departments.length;
  const activeDepartments = departments.filter(d => d.is_active !== false).length;
  // Count unique users across all departments (avoid counting same user multiple times)
  const totalMembers = (() => {
    const uniqueUserIds = new Set();
    departments.forEach(dept => {
      const members = dept.members || [];
      members.forEach(member => {
        if (member.id) {
          uniqueUserIds.add(member.id);
        }
      });
    });
    return uniqueUserIds.size;
  })();

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
                  {filteredDepartments.map((dept) => {
                    const isExpanded = expandedDepts.has(dept.id);
                    const members = dept.members || [];
                    const memberCount = parseInt(dept.member_count) || 0;
                    
                    return (
                      <React.Fragment key={dept.id}>
                        {/* Main Row */}
                        <tr className="border-b hover:bg-gray-50">
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
                            <button
                              onClick={() => toggleDeptExpanded(dept.id)}
                              className="inline-flex items-center gap-1 hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors"
                              title={memberCount > 0 ? "Click to view members" : "No members"}
                            >
                              <Badge variant="secondary" className="cursor-pointer">
                                {memberCount}
                              </Badge>
                              {memberCount > 0 && (
                                <svg
                                  className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Switch
                                checked={dept.is_active !== false}
                                onCheckedChange={() => handleToggleActive(dept)}
                                className="data-[state=checked]:bg-green-500"
                              />
                              <span className={`text-sm font-medium ${dept.is_active !== false ? 'text-green-600' : 'text-gray-400'}`}>
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
                            </div>
                          </td>
                        </tr>
                        
                        {/* Expanded Members Row */}
                        {isExpanded && memberCount > 0 && (
                          <tr className="bg-gray-50/50">
                            <td colSpan="5" className="py-4 px-4">
                              <div className="pl-12">
                                <div className="flex items-center justify-between mb-3">
                                  <p className="text-sm font-semibold text-gray-700">
                                    Team Members ({memberCount})
                                  </p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddMemberClick(dept)}
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <UserPlus className="h-4 w-4 mr-1" />
                                    Add Member
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {members.map((member) => (
                                    <div
                                      key={member.id}
                                      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                                    >
                                      {/* Avatar */}
                                      <div className="flex-shrink-0">
                                        {member.avatarUrl ? (
                                          <img
                                            src={member.avatarUrl}
                                            alt={member.name}
                                            className="h-10 w-10 rounded-full object-cover"
                                          />
                                        ) : (
                                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                                            {member.firstName?.[0]}{member.lastName?.[0]}
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Member Info */}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                          {member.name}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                          {member.email}
                                        </p>
                                      </div>
                                      
                                      {/* Remove Button */}
                                      <button
                                        onClick={() => handleRemoveMember(dept.id, member.id)}
                                        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Remove from department"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        
                        {/* Empty State for Expanded Row with No Members */}
                        {isExpanded && memberCount === 0 && (
                          <tr className="bg-gray-50/50">
                            <td colSpan="5" className="py-4 px-4">
                              <div className="pl-12">
                                <p className="text-sm text-gray-500 italic">
                                  No members in this department yet.
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl max-w-2xl">
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
          <DialogContent className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl max-w-2xl">
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

        {/* Add Member Dialog */}
        <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
          <DialogContent className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl max-w-md">
            <DialogHeader>
              <DialogTitle>Add Member to {selectedDepartment?.name}</DialogTitle>
              <DialogDescription>
                Select a user to add to this department
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="user-select">Select User</Label>
                <select
                  id="user-select"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a user --</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              {availableUsers.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  All users are already members of this department.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setAddMemberDialogOpen(false);
                  setSelectedDepartment(null);
                  setSelectedUserId('');
                  setAvailableUsers([]);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddMember}
                disabled={!selectedUserId || saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Member'
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