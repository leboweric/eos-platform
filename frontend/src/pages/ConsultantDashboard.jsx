import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Building2,
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  ExternalLink,
  Loader2,
  DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const ConsultantDashboard = () => {
  const { user, switchToClientOrganization } = useAuthStore();
  const navigate = useNavigate();
  const [clientOrganizations, setClientOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [newOrgForm, setNewOrgForm] = useState({
    name: '',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
  });

  useEffect(() => {
    fetchClientOrganizations();
  }, []);

  const fetchClientOrganizations = async () => {
    try {
      const response = await fetch(`${API_URL}/consultant/organizations`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setClientOrganizations(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch client organizations:', error);
      setError('Failed to load client organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/consultant/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(newOrgForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      setSuccessMessage(`Successfully created ${data.data.organizationName}. Admin credentials sent to ${data.data.adminEmail}.`);
      setCreateDialogOpen(false);
      setNewOrgForm({
        name: '',
        adminEmail: '',
        adminFirstName: '',
        adminLastName: '',
      });
      fetchClientOrganizations();
    } catch (error) {
      setError(error.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSwitchToOrganization = async (orgId) => {
    try {
      const response = await fetch(`${API_URL}/consultant/organizations/${orgId}/switch`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Store the impersonation state
        localStorage.setItem('consultantImpersonating', 'true');
        localStorage.setItem('consultantOriginalOrg', user.organizationId);
        localStorage.setItem('impersonatedOrgId', data.data.organizationId);
        
        // Update the auth store with the new organization context
        switchToClientOrganization(data.data.organizationId, data.data.organizationName);
        
        // Navigate to the client's dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      setError('Failed to switch to client organization');
    }
  };

  const getTotalRevenue = () => {
    return clientOrganizations.reduce((sum, org) => sum + (org.monthly_revenue || 0), 0);
  };

  const getTotalUsers = () => {
    return clientOrganizations.reduce((sum, org) => sum + (org.user_count || 0), 0);
  };

  const getPriorityStats = () => {
    return clientOrganizations.reduce((stats, org) => ({
      onTrack: stats.onTrack + (org.priorities_on_track || 0),
      offTrack: stats.offTrack + (org.priorities_off_track || 0),
      atRisk: stats.atRisk + (org.priorities_at_risk || 0),
    }), { onTrack: 0, offTrack: 0, atRisk: 0 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const priorityStats = getPriorityStats();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Consultant Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your strategy consulting client organizations</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Client Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateOrganization}>
              <DialogHeader>
                <DialogTitle>Create Client Organization</DialogTitle>
                <DialogDescription>
                  Create a new organization for your strategy consulting client. The admin will receive login credentials via email.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={newOrgForm.name}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminFirstName">Admin First Name</Label>
                    <Input
                      id="adminFirstName"
                      value={newOrgForm.adminFirstName}
                      onChange={(e) => setNewOrgForm({ ...newOrgForm, adminFirstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminLastName">Admin Last Name</Label>
                    <Input
                      id="adminLastName"
                      value={newOrgForm.adminLastName}
                      onChange={(e) => setNewOrgForm({ ...newOrgForm, adminLastName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Admin Email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={newOrgForm.adminEmail}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, adminEmail: e.target.value })}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createLoading}>
                  {createLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Organization'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientOrganizations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalUsers()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${getTotalRevenue()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Priorities Status</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">{priorityStats.onTrack}</span>
              <span className="text-gray-400">/</span>
              <span className="text-yellow-600">{priorityStats.atRisk}</span>
              <span className="text-gray-400">/</span>
              <span className="text-red-600">{priorityStats.offTrack}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Client Organizations</CardTitle>
          <CardDescription>
            Click on an organization to view their dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Priorities Status</TableHead>
                <TableHead>Monthly Revenue</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientOrganizations.map((org) => (
                <TableRow key={org.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>{org.user_count || 0}</TableCell>
                  <TableCell>
                    <Badge variant={org.subscription_status === 'active' ? 'default' : 'secondary'}>
                      {org.subscription_status || 'No subscription'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <span className="flex items-center">
                        <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                        {org.priorities_on_track || 0}
                      </span>
                      <span className="flex items-center">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mr-1" />
                        {org.priorities_at_risk || 0}
                      </span>
                      <span className="flex items-center">
                        <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                        {org.priorities_off_track || 0}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>${org.monthly_revenue || 0}/mo</TableCell>
                  <TableCell>{format(new Date(org.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleSwitchToOrganization(org.id)}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsultantDashboard;