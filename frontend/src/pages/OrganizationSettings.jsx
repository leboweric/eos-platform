import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Save, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const OrganizationSettings = () => {
  const { user, checkAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [organizationData, setOrganizationData] = useState({
    name: '',
    slug: '',
    created_at: ''
  });

  useEffect(() => {
    fetchOrganizationDetails();
  }, []);

  const fetchOrganizationDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/organizations/current`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizationData(data.data);
      } else {
        setError('Failed to load organization details');
      }
    } catch (error) {
      console.error('Failed to fetch organization:', error);
      setError('Failed to load organization details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/organizations/current`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          name: organizationData.name
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Organization updated successfully');
        setOrganizationData(data.data);
        // Refresh auth to update the organization name in the UI
        await checkAuth();
      } else {
        setError(data.error || 'Failed to update organization');
      }
    } catch (error) {
      console.error('Update error:', error);
      setError('Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription>
            Only administrators can access organization settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Organization Settings</h1>
          <p className="text-gray-600">Manage your organization details and preferences</p>
        </div>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>
            Update your organization's basic information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                value={organizationData.name}
                onChange={(e) => setOrganizationData({ ...organizationData, name: e.target.value })}
                placeholder="Enter organization name"
                required
              />
              <p className="text-sm text-gray-500">
                This name will appear throughout the platform
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Organization URL</Label>
              <Input
                id="slug"
                value={organizationData.slug}
                disabled
                className="bg-gray-50"
              />
              <p className="text-sm text-gray-500">
                The URL slug cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label>Created</Label>
              <p className="text-sm text-gray-600">
                {new Date(organizationData.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationSettings;