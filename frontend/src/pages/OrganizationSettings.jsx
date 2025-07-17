import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Save, Loader2, Upload, X, Image } from 'lucide-react';
import { organizationService } from '../services/organizationService';


const OrganizationSettings = () => {
  const { user, checkAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [organizationData, setOrganizationData] = useState({
    name: '',
    slug: '',
    created_at: '',
    logo_updated_at: null
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    fetchOrganizationDetails();
  }, []);

  useEffect(() => {
    // Set logo preview URL when organization data is loaded
    if (organizationData?.id && organizationData?.logo_updated_at) {
      setLogoPreview(organizationService.getLogoUrl(organizationData.id));
    }
  }, [organizationData]);

  const fetchOrganizationDetails = async () => {
    try {
      setLoading(true);
      const orgData = await organizationService.getOrganization();
      setOrganizationData(orgData);
      
      // Set logo preview if logo exists
      if (orgData.logo_updated_at) {
        setLogoPreview(organizationService.getLogoUrl(orgData.id));
      }
    } catch (error) {
      console.error('Failed to fetch organization:', error);
      setError(error.response?.data?.error || 'Failed to load organization details');
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
      const response = await organizationService.updateOrganization({
        name: organizationData?.name || ''
      });

      setSuccess('Organization updated successfully');
      setOrganizationData(response.data);
      // Refresh auth to update the organization name in the UI
      await checkAuth();
    } catch (error) {
      console.error('Update error:', error);
      setError(error.response?.data?.error || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadLogo = async () => {
    if (!selectedFile) return;
    
    setError(null);
    setUploadingLogo(true);
    
    try {
      await organizationService.uploadLogo(selectedFile);
      setSuccess('Logo uploaded successfully');
      setSelectedFile(null);
      
      // Refresh organization data to get updated logo timestamp
      await fetchOrganizationDetails();
      
      // Force refresh of logo in sidebar
      window.location.reload();
    } catch (error) {
      console.error('Logo upload error:', error);
      setError(error.response?.data?.error || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm('Are you sure you want to remove the organization logo?')) return;
    
    setError(null);
    setUploadingLogo(true);
    
    try {
      await organizationService.deleteLogo();
      setSuccess('Logo removed successfully');
      setLogoPreview(null);
      setSelectedFile(null);
      
      // Refresh organization data
      await fetchOrganizationDetails();
      
      // Force refresh of logo in sidebar
      window.location.reload();
    } catch (error) {
      console.error('Logo delete error:', error);
      setError(error.response?.data?.error || 'Failed to remove logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Check if user has permission (admin or consultant)
  const hasPermission = user?.role === 'admin' || user?.isConsultant;
  
  if (!hasPermission) {
    return (
      <div className="p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription>
            You do not have permission to access organization settings.
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
                value={organizationData?.name || ''}
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
                value={organizationData?.slug || ''}
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
                {organizationData?.created_at ? new Date(organizationData.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Loading...'}
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

      <Card>
        <CardHeader>
          <CardTitle>Organization Logo</CardTitle>
          <CardDescription>
            Upload a logo to display in the sidebar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Logo Preview */}
            <div className="flex items-center space-x-4">
              <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="Organization logo" 
                    className="max-w-full max-h-full object-contain rounded"
                  />
                ) : (
                  <Image className="h-8 w-8 text-gray-400" />
                )}
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="text-sm text-gray-600">
                  <p>Recommended: Square image, at least 200x200px</p>
                  <p>Maximum file size: 5MB</p>
                  <p>Supported formats: JPG, PNG, GIF, SVG</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <Button type="button" variant="outline" asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose File
                      </span>
                    </Button>
                  </Label>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {selectedFile && (
                    <Button 
                      type="button"
                      onClick={handleUploadLogo}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        'Upload'
                      )}
                    </Button>
                  )}
                  
                  {organizationData?.logo_updated_at && !selectedFile && (
                    <Button 
                      type="button"
                      variant="destructive"
                      onClick={handleDeleteLogo}
                      disabled={uploadingLogo}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remove Logo
                    </Button>
                  )}
                </div>
                
                {selectedFile && (
                  <p className="text-sm text-gray-600">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationSettings;