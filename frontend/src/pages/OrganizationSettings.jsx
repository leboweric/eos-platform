import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Building2, Save, Loader2, Upload, X, Image, RefreshCw, AlertTriangle, Download, FileSpreadsheet } from 'lucide-react';
import { organizationService } from '../services/organizationService';
import { demoService } from '../services/demoService';
import { exportService } from '../services/exportService';
import ColorThemePicker from '../components/ColorThemePicker';
import { saveOrgTheme, getOrgTheme } from '../utils/themeUtils';


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
    logo_updated_at: null,
    revenue_metric_type: 'revenue',
    revenue_metric_label: '',
    theme_primary_color: '#3B82F6',
    theme_secondary_color: '#1E40AF',
    theme_accent_color: '#60A5FA'
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoSize, setLogoSize] = useState(100); // Will be set from org data
  const [demoResetStatus, setDemoResetStatus] = useState(null);
  const [resettingDemo, setResettingDemo] = useState(false);
  const [demoResetError, setDemoResetError] = useState(null);
  const [demoResetSuccess, setDemoResetSuccess] = useState(null);
  const [exportingData, setExportingData] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(null);
  const [exportError, setExportError] = useState(null);

  useEffect(() => {
    fetchOrganizationDetails();
  }, []);

  useEffect(() => {
    // Check demo status once we have organization data
    if (organizationData?.id) {
      checkDemoStatus();
    }
  }, [organizationData?.id]);

  useEffect(() => {
    // Set logo preview URL when organization data is loaded
    if (organizationData?.id && organizationData?.logo_updated_at) {
      setLogoPreview(organizationService.getLogoUrl(organizationData.id));
    }
  }, [organizationData]);

  const checkDemoStatus = async () => {
    // Only check demo status if it's the demo org
    if (organizationData?.slug === 'demo-acme-industries' || organizationData?.id === 'deeeeeee-0000-0000-0000-000000000001') {
      try {
        const status = await demoService.getResetStatus();
        setDemoResetStatus(status);
      } catch (error) {
        console.error('Failed to fetch demo status:', error);
      }
    }
  };

  const handleDemoReset = async () => {
    if (!window.confirm('This will reset the demo organization to its original state. All changes will be lost. Continue?')) {
      return;
    }

    setDemoResetError(null);
    setDemoResetSuccess(null);
    setResettingDemo(true);

    try {
      const response = await demoService.resetDemo();
      setDemoResetSuccess(response.message);
      setDemoResetStatus({ ...demoResetStatus, canReset: false, nextResetAvailable: response.nextResetAvailable });
      
      // Reload page after a short delay to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setDemoResetError(error.response?.data?.message || 'Failed to reset demo');
    } finally {
      setResettingDemo(false);
    }
  };

  const fetchOrganizationDetails = async () => {
    try {
      setLoading(true);
      const orgData = await organizationService.getOrganization();
      setOrganizationData(orgData);
      
      // Set logo size from organization data
      if (orgData.logo_size) {
        setLogoSize(orgData.logo_size);
      }
      
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
        name: organizationData?.name || '',
        revenueMetricType: organizationData?.revenue_metric_type,
        revenueMetricLabel: organizationData?.revenue_metric_label
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

  const handleLogoSizeChange = async (value) => {
    const size = value[0]; // Slider returns array
    setLogoSize(size);
    
    try {
      // Save to database
      await organizationService.updateOrganization({
        name: organizationData?.name || '',
        logoSize: size,
        revenueMetricType: organizationData?.revenue_metric_type,
        revenueMetricLabel: organizationData?.revenue_metric_label
      });
      
      // Trigger a custom event to update logo size in Layout
      const orgId = user?.organizationId || user?.organization_id;
      window.dispatchEvent(new CustomEvent('logoSizeChanged', { detail: { size, orgId } }));
    } catch (error) {
      console.error('Failed to save logo size:', error);
      setError('Failed to save logo size');
    }
  };

  const handleExportData = async () => {
    setExportingData(true);
    setExportError(null);
    setExportSuccess(null);
    
    try {
      const result = await exportService.exportOrganizationBackup(organizationData.id);
      setExportSuccess(`Successfully exported data to ${result.filename}`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setExportSuccess(null);
      }, 5000);
    } catch (error) {
      console.error('Export error:', error);
      setExportError(error.message || 'Failed to export organization data');
    } finally {
      setExportingData(false);
    }
  };

  const handleSaveColorTheme = async (theme) => {
    console.log('handleSaveColorTheme called with theme:', theme);
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      console.log('Calling updateOrganization with data:', {
        name: organizationData?.name || '',
        revenueMetricType: organizationData?.revenue_metric_type,
        revenueMetricLabel: organizationData?.revenue_metric_label,
        themePrimaryColor: theme.primary,
        themeSecondaryColor: theme.secondary,
        themeAccentColor: theme.accent
      });
      
      const response = await organizationService.updateOrganization({
        name: organizationData?.name || '',
        revenueMetricType: organizationData?.revenue_metric_type,
        revenueMetricLabel: organizationData?.revenue_metric_label,
        themePrimaryColor: theme.primary,
        themeSecondaryColor: theme.secondary,
        themeAccentColor: theme.accent
      });

      console.log('Update response:', response);
      setSuccess('Color theme updated successfully');
      setOrganizationData({
        ...organizationData,
        theme_primary_color: theme.primary,
        theme_secondary_color: theme.secondary,
        theme_accent_color: theme.accent
      });
      
      // Store in localStorage for immediate use (org-specific)
      const orgId = user?.organizationId || user?.organization_id;
      saveOrgTheme(orgId, theme);
      console.log('Saved theme for org:', orgId, theme);
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: theme }));
      console.log('Dispatched themeChanged event');
    } catch (error) {
      console.error('Update theme error full details:', error);
      console.error('Error response:', error.response);
      setError(error.response?.data?.error || 'Failed to update color theme');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <div className="max-w-6xl mx-auto p-8 space-y-8">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 bg-blue-50/80 backdrop-blur-sm text-blue-700">
            <Building2 className="h-4 w-4" />
            ORGANIZATION MANAGEMENT
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">Organization Settings</h1>
          <p className="text-lg text-slate-600">Manage your organization details and preferences</p>
        </div>

        {error && (
          <Alert className="bg-red-50/80 backdrop-blur-sm border-red-200/50 rounded-2xl">
            <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50/80 backdrop-blur-sm border-green-200/50 rounded-2xl">
            <AlertDescription className="text-green-800 font-medium">{success}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl">
          <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20">
            <CardTitle className="text-xl font-bold text-slate-900">General Information</CardTitle>
            <CardDescription className="text-slate-600 font-medium">
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
                className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200"
              />
              <p className="text-sm text-slate-500">
                This name will appear throughout the platform
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="revenueMetric">Revenue Metric Type</Label>
              <Select
                value={organizationData?.revenue_metric_type || 'revenue'}
                onValueChange={(value) => setOrganizationData({ ...organizationData, revenue_metric_type: value })}
              >
                <SelectTrigger id="revenueMetric" className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm">
                  <SelectValue placeholder="Select revenue metric" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-xl shadow-xl">
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="aum">Assets Under Management (AUM)</SelectItem>
                  <SelectItem value="arr">Annual Recurring Revenue (ARR)</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-slate-500">
                Choose how revenue is displayed throughout the platform
              </p>
            </div>

            {organizationData?.revenue_metric_type === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="customLabel">Custom Revenue Label</Label>
                <Input
                  id="customLabel"
                  value={organizationData?.revenue_metric_label || ''}
                  onChange={(e) => setOrganizationData({ ...organizationData, revenue_metric_label: e.target.value })}
                  placeholder="e.g., GMV, Gross Sales, Total Billings"
                  required={organizationData?.revenue_metric_type === 'custom'}
                  className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200"
                />
                <p className="text-sm text-slate-500">
                  This label will be used wherever revenue is displayed
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="slug">Organization URL</Label>
              <Input
                id="slug"
                value={organizationData?.slug || ''}
                disabled
                className="bg-slate-50/50 backdrop-blur-sm border-slate-200/50 rounded-xl"
              />
              <p className="text-sm text-slate-500">
                The URL slug cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label>Created</Label>
              <p className="text-sm text-slate-600 font-medium">
                {organizationData?.created_at ? new Date(organizationData.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Loading...'}
              </p>
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                disabled={saving}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              >
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

      <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl">
        <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20">
          <CardTitle className="text-xl font-bold text-slate-900">Organization Logo</CardTitle>
          <CardDescription className="text-slate-600 font-medium">
            Upload a logo to display in the sidebar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Logo Preview */}
            <div className="flex items-center space-x-4">
              <div className="w-32 h-32 border-2 border-dashed border-slate-300/50 rounded-xl flex items-center justify-center bg-slate-50/50 backdrop-blur-sm">
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="Organization logo" 
                    className="max-w-full max-h-full object-contain rounded"
                  />
                ) : (
                  <Image className="h-8 w-8 text-slate-400" />
                )}
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="text-sm text-slate-600 font-medium">
                  <p>Recommended: Square image, at least 200x200px</p>
                  <p>Maximum file size: 5MB</p>
                  <p>Supported formats: JPG, PNG, GIF, SVG</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <Button type="button" variant="outline" asChild className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200">
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
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
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
                      className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remove Logo
                    </Button>
                  )}
                </div>
                
                {selectedFile && (
                  <p className="text-sm text-slate-600 font-medium">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>
            
            {/* Logo Size Adjustment */}
            {organizationData?.logo_updated_at && (
              <div className="mt-6 pt-6 border-t">
                <div className="space-y-4">
                  <div>
                    <Label>Logo Display Size</Label>
                    <p className="text-sm text-slate-600 mb-3">
                      Adjust how large your logo appears in the sidebar
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-slate-500 font-medium">Small</span>
                    <Slider
                      value={[logoSize]}
                      onValueChange={handleLogoSizeChange}
                      min={50}
                      max={150}
                      step={10}
                      className="flex-1"
                    />
                    <span className="text-sm text-slate-500 font-medium">Large</span>
                    <span className="text-sm font-bold w-12 text-right text-slate-700">{logoSize}%</span>
                  </div>
                  
                  <div className="flex items-center justify-center p-4 bg-slate-50/50 backdrop-blur-sm rounded-xl border border-slate-200/50">
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-2 font-medium">Preview</p>
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="object-contain"
                        style={{ 
                          height: `${40 * (logoSize / 100)}px`,
                          maxWidth: `${150 * (logoSize / 100)}px`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

        {/* Demo Reset Section - Only show for demo org and admin users */}
        {user?.role === 'admin' && (organizationData?.slug === 'demo-acme-industries' || organizationData?.id === 'deeeeeee-0000-0000-0000-000000000001') && (
          <Card className="bg-orange-50/80 backdrop-blur-sm border border-orange-200/50 rounded-2xl shadow-xl">
            <CardHeader className="bg-gradient-to-r from-orange-50/90 to-orange-100/70 backdrop-blur-sm border-b border-orange-200/20">
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-orange-900">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Demo Organization Management
              </CardTitle>
              <CardDescription className="text-orange-700 font-medium">
                Reset the demo organization to its original state
              </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {demoResetError && (
                <Alert variant="destructive">
                  <AlertDescription>{demoResetError}</AlertDescription>
                </Alert>
              )}
              
              {demoResetSuccess && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">{demoResetSuccess}</AlertDescription>
                </Alert>
              )}

              <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-orange-200/50 shadow-sm">
                <h4 className="font-bold mb-2 text-slate-900">What happens when you reset?</h4>
                <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside font-medium">
                  <li>All data returns to original demo state</li>
                  <li>Custom changes are removed</li>
                  <li>Users and passwords are reset</li>
                  <li>Can only be reset once every 24 hours</li>
                </ul>
              </div>

              {demoResetStatus && (
                <div className="text-sm font-medium">
                  {demoResetStatus.canReset ? (
                    <p className="text-green-600 font-semibold">✓ Demo can be reset now</p>
                  ) : (
                    <p className="text-orange-600 font-semibold">
                      Next reset available: {new Date(demoResetStatus.nextResetAvailable).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              <Button
                onClick={handleDemoReset}
                disabled={resettingDemo || (demoResetStatus && !demoResetStatus.canReset)}
                variant="outline"
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] border-0"
              >
                {resettingDemo ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting Demo...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset Demo Organization
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Export Section */}
      <Card className="bg-white/80 backdrop-blur-sm border-white/20 rounded-2xl shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Data Backup & Export
          </CardTitle>
          <CardDescription className="text-slate-600 font-medium">
            Export all your organization data to Excel format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {exportError && (
              <Alert variant="destructive">
                <AlertDescription>{exportError}</AlertDescription>
              </Alert>
            )}
            
            {exportSuccess && (
              <Alert className="border-green-200/50 bg-green-50/80 backdrop-blur-sm rounded-xl">
                <AlertDescription className="text-green-800 font-medium">{exportSuccess}</AlertDescription>
              </Alert>
            )}

            <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-blue-200/50 shadow-sm">
              <h4 className="font-bold mb-2 text-slate-900">What's included in the export?</h4>
              <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside font-medium">
                <li>Quarterly Priorities (Rocks) with milestones</li>
                <li>Scorecard metrics and historical scores</li>
                <li>To-Dos with assignments and status</li>
                <li>Issues (both short-term and long-term)</li>
                <li>Business Blueprint (VTO) data</li>
                <li>Accountability Chart</li>
                <li>Core Values</li>
              </ul>
            </div>

            <Button
              onClick={handleExportData}
              disabled={exportingData || !organizationData?.id}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {exportingData ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting Data...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export to Excel
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Color Theme Section */}
      <ColorThemePicker
        currentTheme={{
          primary: organizationData?.theme_primary_color || '#3B82F6',
          secondary: organizationData?.theme_secondary_color || '#1E40AF',
          accent: organizationData?.theme_accent_color || '#60A5FA'
        }}
        onThemeChange={(theme) => {
          setOrganizationData({
            ...organizationData,
            theme_primary_color: theme.primary,
            theme_secondary_color: theme.secondary,
            theme_accent_color: theme.accent
          });
        }}
        onSave={handleSaveColorTheme}
        saving={saving}
      />
    </div>
    </div>
  );
};

export default OrganizationSettings;