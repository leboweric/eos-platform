import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  UserPlus,
  Trash2,
  Mail,
  AlertCircle,
  Copy,
  X,
  Loader2,
  Users,
  Edit,
} from 'lucide-react';
import { format } from 'date-fns';

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
    teamId: ''
  });
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    role: 'member',
    teamId: ''
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [departments, setDepartments] = useState([]);

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
        setUsers(data.data);
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

      // Show invitation link for copying
      if (data.data.invitation_link) {
        navigator.clipboard.writeText(data.data.invitation_link);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
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
        sendWelcomeEmail: true
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
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      teamId: user.team_id || ''
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
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          role: editForm.role,
          teamId: editForm.teamId || null,
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

  const handleRemoveUser = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to remove ${userEmail} from the organization?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        setSuccessMessage(`${userEmail} has been removed from the organization`);
        fetchUsers();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to remove user');
      }
    } catch (error) {
      setError('Failed to remove user');
    }
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

  const getMonthlyCost = () => {
    return getUserCount() * 5;
  };

  return (
    <div className="space-y-6">
      {isConsultant && organizations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Viewing organization:</span>
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
              <SelectTrigger className="w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-gray-600 mt-2">
            Manage your organization's team members and invitations
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {(isConsultant || isAdmin) && (
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleCreateUser}>
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Create a new user account directly. They'll receive an email with login credentials.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {isConsultant && organizations.length > 0 && (
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
                        <Label htmlFor="createDepartment">Department</Label>
                        <Select
                          value={createForm.teamId}
                          onValueChange={(value) => setCreateForm({ ...createForm, teamId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                                {dept.is_leadership_team && ' (Leadership)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      {error && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                      {temporaryPassword && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-2">
                              <p>User created successfully. Temporary password:</p>
                              <div className="flex items-center gap-2">
                                <code className="bg-gray-100 px-2 py-1 rounded">{temporaryPassword}</code>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(temporaryPassword);
                                    setCopiedLink(true);
                                    setTimeout(() => setCopiedLink(false), 3000);
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                              <p className="text-sm text-gray-600">Share this password securely with the user.</p>
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
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Mail className="mr-2 h-4 w-4" />
                  Invite User
                </Button>
              </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleInviteUser}>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your organization. They'll receive an email with instructions.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={inviteForm.role}
                      onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}
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
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={inviteLoading}>
                    {inviteLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Invitation'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleUpdateUser}>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and department assignment
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
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
                <Label htmlFor="editDepartment">Department</Label>
                <Select
                  value={editForm.teamId}
                  onValueChange={(value) => setEditForm({ ...editForm, teamId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                        {dept.is_leadership_team && ' (Leadership)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      {/* Cost Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Subscription Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Active Users</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Invitations</p>
              <p className="text-2xl font-bold">{invitations.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Monthly Cost</p>
              <p className="text-2xl font-bold">${getMonthlyCost()}/month</p>
              <p className="text-xs text-gray-500">($5 per user)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {successMessage && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {copiedLink && (
        <Alert>
          <Copy className="h-4 w-4" />
          <AlertDescription>Invitation link copied to clipboard!</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending Invitations ({invitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Users</CardTitle>
              <CardDescription>
                Team members with access to your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department(s)</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.departments || <span className="text-gray-400 italic">No department</span>}
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
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveUser(user.id, user.email)}
                              disabled={user.id === user.id} // Prevent removing yourself
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Invitations sent but not yet accepted
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  No pending invitations
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Invited By</TableHead>
                      <TableHead>Expires</TableHead>
                      {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            {invitation.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={invitation.role === 'admin' ? 'default' : 'secondary'}>
                            {invitation.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{invitation.invited_by_name}</TableCell>
                        <TableCell>
                          {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelInvitation(invitation.id, invitation.email)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UsersPage;