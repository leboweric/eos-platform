import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
// Updated: 2025-10-25 - Fixed horizontal scrolling with sticky columns
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelectInline } from '@/components/ui/multi-select-inline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Switch component removed - using custom toggle for better cursor control
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  UserPlus,
  Mail,
  AlertCircle,
  Copy,
  X,
  Loader2,
  Users,
  Edit,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const UsersPage = () => {
  const { user } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' });
  const [createForm, setCreateForm] = useState({ 
    email: '', 
    firstName: '', 
    lastName: '', 
    role: 'member',
    sendWelcomeEmail: true,
    teamIds: []
  });
  const [editForm, setEditForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'member',
    teamIds: []
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [invitationLink, setInvitationLink] = useState(null);
  const [temporaryPassword, setTemporaryPassword] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.isConsultant;
  const isConsultant = user?.isConsultant;

  useEffect(() => {
    fetchUsers();
    fetchInvitations();
    fetchDepartments();
    if (isConsultant) {
      fetchOrganizations();
    }
  }, [isConsultant]);

  // Refetch when selected org changes
  useEffect(() => {
    if (selectedOrgId) {
      fetchUsers();
      fetchInvitations();
      fetchDepartments();
    }
  }, [selectedOrgId]);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch(`${API_URL}/consultant/organizations`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Organizations loaded:', data.data);
        setOrganizations(data.data || []);
        // Set default to current organization
        setSelectedOrgId(user?.organizationId);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const orgId = selectedOrgId || user?.organizationId || user?.organization_id;
      const response = await fetch(`${API_URL}/organizations/${orgId}/teams`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Departments loaded:', data.data);
        setDepartments(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      };
      
      // If consultant has selected an org, always send it (even if it's their own)
      if (isConsultant && selectedOrgId) {
        headers['X-Impersonated-Org-Id'] = selectedOrgId;
        console.log('Fetching users with impersonated org:', selectedOrgId);
      }
      
      const response = await fetch(`${API_URL}/users/organization`, {
        headers,
      });
      if (response.ok) {
        const data = await response.json();
        // Sort users alphabetically by first name
        const sortedUsers = data.data.sort((a, b) => {
          const firstNameA = (a.firstName || a.first_name || '').toLowerCase();
          const firstNameB = (b.firstName || b.first_name || '').toLowerCase();
          return firstNameA.localeCompare(firstNameB);
        });
        setUsers(sortedUsers);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      };
      
      // If consultant has selected an org, always send it (even if it's their own)
      if (isConsultant && selectedOrgId) {
        headers['X-Impersonated-Org-Id'] = selectedOrgId;
      }
      
      const response = await fetch(`${API_URL}/users/invitations`, {
        headers,
      });
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    setError(null);

    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      };
      
      // If consultant has selected an org, always send it (even if it's their own)
      if (isConsultant && selectedOrgId) {
        headers['X-Impersonated-Org-Id'] = selectedOrgId;
      }
      
      const response = await fetch(`${API_URL}/users/invite`, {
        method: 'POST',
        headers,
        body: JSON.stringify(inviteForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setSuccessMessage(`Invitation sent to ${inviteForm.email}`);
      setInviteForm({ email: '', role: 'member' });
      setInviteDialogOpen(false);
      fetchInvitations();

      // Store invitation link for manual copying (Safari blocks auto-copy after async API calls)
      if (data.data.invitation_link) {
        setInvitationLink(data.data.invitation_link);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setError(null);
    setTemporaryPassword(null);

    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      };
      
      // If consultant has selected an org, always send it (even if it's their own)
      if (isConsultant && selectedOrgId) {
        headers['X-Impersonated-Org-Id'] = selectedOrgId;
      }
      
      const response = await fetch(`${API_URL}/users/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setSuccessMessage(`User ${createForm.email} created successfully`);
      
      // If email was not sent, show the temporary password
      if (!createForm.sendWelcomeEmail && data.data.temporaryPassword) {
        setTemporaryPassword(data.data.temporaryPassword);
      }
      
      setCreateForm({ 
        email: '', 
        firstName: '', 
        lastName: '', 
        role: 'member',
        sendWelcomeEmail: true,
        teamIds: []
      });
      
      if (createForm.sendWelcomeEmail) {
        setCreateDialogOpen(false);
      }
      
      fetchUsers();
    } catch (error) {
      setError(error.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditForm({
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      teamIds: user.team_ids || []
    });
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setError(null);

    try {
      const orgId = selectedOrgId || user?.organizationId;
      const response = await fetch(`${API_URL}/organizations/${orgId}/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          email: editForm.email,
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          role: editForm.role,
          teamIds: editForm.teamIds
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('User updated successfully');
        setEditDialogOpen(false);
        fetchUsers();
      } else {
        setError(data.error || 'Failed to update user');
      }
    } catch (error) {
      setError('Failed to update user. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleUserActive = async (userId, currentActiveStatus, userEmail) => {
    const newStatus = !currentActiveStatus;
    const action = newStatus ? 'activate' : 'deactivate';
    
    // Optimistic UI update
    setUsers(prevUsers => 
      prevUsers.map(u => 
        u.id === userId ? { ...u, is_active: newStatus } : u
      )
    );
    
    try {
      const orgId = selectedOrgId || user?.organizationId;
      const response = await fetch(`${API_URL}/organizations/${orgId}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          is_active: newStatus
        }),
      });

      if (response.ok) {
        toast.success(`${userEmail} has been ${action}d successfully`);
      } else {
        // Revert on failure
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.id === userId ? { ...u, is_active: currentActiveStatus } : u
          )
        );
        const data = await response.json();
        toast.error(data.error || `Failed to ${action} user`);
      }
    } catch (error) {
      // Revert on error
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === userId ? { ...u, is_active: currentActiveStatus } : u
        )
      );
      console.error('Error updating user status:', error);
      toast.error(`Failed to ${action} user`);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    // Validate email confirmation
    if (deleteConfirmEmail !== userToDelete.email) {
      toast.error('Email does not match. Please type the exact email address.');
      return;
    }
    
    setDeleteLoading(true);
    
    try {
      const orgId = selectedOrgId || user?.organizationId;
      const response = await fetch(`${API_URL}/organizations/${orgId}/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`${userToDelete.email} has been permanently deleted`);
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        setDeleteConfirmEmail('');
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openDeleteDialog = (user) => {
    setUserToDelete(user);
    setDeleteConfirmEmail('');
    setDeleteDialogOpen(true);
  };

  const handleCancelInvitation = async (invitationId, email) => {
    if (!window.confirm(`Cancel invitation to ${email}?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        setSuccessMessage(`Invitation to ${email} has been cancelled`);
        fetchInvitations();
      }
    } catch (error) {
      setError('Failed to cancel invitation');
    }
  };

  const getUserCount = () => {
    return users.length + invitations.length;
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {isConsultant && organizations.length > 0 && (
          <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">Viewing organization:</span>
              </div>
              <Select
                value={selectedOrgId || user?.organizationId}
                onValueChange={(value) => {
                  console.log('Organization selected:', value, organizations.find(o => o.id === value)?.name);
                  setSelectedOrgId(value);
                  // Refresh users when organization changes
                  setTimeout(() => fetchUsers(), 100);
                }}
              >
                <SelectTrigger className="w-auto bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl">
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 bg-blue-50/80 backdrop-blur-sm text-blue-700">
              <Users className="h-4 w-4" />
              TEAM MANAGEMENT
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">Team Members</h1>
            <p className="text-lg text-slate-600">
              Manage your organization's team members and invitations
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              {(isConsultant || isAdmin) && (
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline"
                      className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm transition-all duration-200"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl max-w-2xl">
                  <form onSubmit={handleCreateUser}>
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Create a new user account directly. They'll receive an email with login credentials.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {!temporaryPassword && isConsultant && organizations.length > 0 && (
                        <div className="space-y-2">
                          <Label htmlFor="organization">Organization</Label>
                          <Select
                            value={selectedOrgId || user?.organizationId}
                            onValueChange={(value) => setSelectedOrgId(value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select organization" />
                            </SelectTrigger>
                            <SelectContent>
                              {organizations.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-gray-600">
                            Select which organization to create this user in
                          </p>
                        </div>
                      )}
                      {!temporaryPassword && (
                      <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            placeholder="John"
                            value={createForm.firstName}
                            onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            placeholder="Doe"
                            value={createForm.lastName}
                            onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="createEmail">Email Address</Label>
                        <Input
                          id="createEmail"
                          type="email"
                          placeholder="user@company.com"
                          value={createForm.email}
                          onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="createRole">Role</Label>
                        <Select
                          value={createForm.role}
                          onValueChange={(value) => setCreateForm({ ...createForm, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="createDepartments">Departments</Label>
                        <MultiSelectInline
                          options={departments.map(dept => ({
                            value: dept.id,
                            label: dept.name,
                            description: dept.is_leadership_team ? 'Leadership' : null
                          }))}
                          value={createForm.teamIds}
                          onChange={(value) => setCreateForm({ ...createForm, teamIds: value })}
                          placeholder="Select departments..."
                        />
                        <p className="text-sm text-gray-600">
                          Select one or more departments for this user
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="sendWelcomeEmail"
                          checked={createForm.sendWelcomeEmail}
                          onChange={(e) => setCreateForm({ ...createForm, sendWelcomeEmail: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="sendWelcomeEmail">Send welcome email with credentials</Label>
                      </div>
                      </>
                      )}
                      {error && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                      {temporaryPassword && (
                        <Alert className="bg-amber-50 border-amber-200">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <AlertDescription>
                            <div className="space-y-3">
                              <p className="font-semibold text-amber-900">✅ User created successfully!</p>
                              <p className="text-sm text-amber-800">No welcome email was sent. Please share this temporary password with the user:</p>
                              <div className="flex items-center gap-2 bg-white p-3 rounded border border-amber-300">
                                <code className="font-mono text-lg font-semibold text-gray-900 flex-1">{temporaryPassword}</code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(temporaryPassword);
                        toast.success('Password copied to clipboard!');
                      } catch (err) {
                        toast.error('Please manually copy the password above');
                      }
                    }}
                    className="hover:bg-amber-100"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                              </div>
                              <p className="text-xs text-amber-700">⚠️ This password will not be shown again. Make sure to save it before closing.</p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => {
                        setCreateDialogOpen(false);
                        setTemporaryPassword(null);
                      }}>
                        {temporaryPassword ? 'Close' : 'Cancel'}
                      </Button>
                      {!temporaryPassword && (
                        <Button type="submit" disabled={createLoading}>
                          {createLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create User'
                          )}
                        </Button>
                      )}
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}

          </div>
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleUpdateUser}>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and department assignment
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email Address</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editFirstName">First Name</Label>
                  <Input
                    id="editFirstName"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editLastName">Last Name</Label>
                  <Input
                    id="editLastName"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRole">Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDepartments">Departments</Label>
                <MultiSelectInline
                  options={departments.map(dept => ({
                    value: dept.id,
                    label: dept.name,
                    description: dept.is_leadership_team ? 'Leadership' : null
                  }))}
                  value={editForm.teamIds}
                  onChange={(value) => setEditForm({ ...editForm, teamIds: value })}
                  placeholder="Select departments..."
                />
                <p className="text-sm text-gray-600">
                  Select one or more departments for this user
                </p>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update User'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* User Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-sm text-gray-500">Active Users</p>
            <p className="text-2xl font-bold">{users.length}</p>
          </div>
        </CardContent>
      </Card>

      {successMessage && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

        {/* Active Users Card */}
            <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl">
              <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20">
                <CardTitle className="text-xl font-bold text-slate-900">Active Users</CardTitle>
                <CardDescription className="text-slate-600 font-medium">
                  Team members with access to your organization
                </CardDescription>
              </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-white border-r">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department(s)</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    {isAdmin && <TableHead className="text-center">Status</TableHead>}
                    {isAdmin && <TableHead className="sticky right-0 z-10 bg-white border-l text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="sticky left-0 z-10 bg-white border-r font-medium">
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="max-w-[200px]">
                        {user.departments ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="truncate cursor-help">
                                  {user.departments}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="whitespace-normal">{user.departments}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-gray-400 italic">No department</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleUserActive(user.id, user.is_active !== false, user.email)}
                              className={`
                                relative inline-flex h-5 w-9 items-center rounded-full
                                transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                                ${user.is_active !== false ? 'bg-green-600' : 'bg-gray-300'}
                                cursor-pointer hover:opacity-80
                              `}
                              role="switch"
                              aria-checked={user.is_active !== false}
                              aria-label={`Toggle ${user.first_name} ${user.last_name} active status`}
                            >
                              <span
                                className={`
                                  inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm
                                  ${user.is_active !== false ? 'translate-x-5' : 'translate-x-1'}
                                `}
                              />
                            </button>
                            <span className={`text-sm ${user.is_active !== false ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                              {user.is_active !== false ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      {isAdmin && (
                        <TableCell className="sticky right-0 z-10 bg-white border-l text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(user)}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>

      </div>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete User</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the user account and remove all associated data.
            </DialogDescription>
          </DialogHeader>
          {userToDelete && (
            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You are about to permanently delete <strong>{userToDelete.first_name} {userToDelete.last_name}</strong> ({userToDelete.email})
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="confirm-email">
                  Type <strong>{userToDelete.email}</strong> to confirm:
                </Label>
                <Input
                  id="confirm-email"
                  type="email"
                  placeholder="Enter email address"
                  value={deleteConfirmEmail}
                  onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setDeleteDialogOpen(false);
                setUserToDelete(null);
                setDeleteConfirmEmail('');
              }}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteLoading || deleteConfirmEmail !== userToDelete?.email}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;