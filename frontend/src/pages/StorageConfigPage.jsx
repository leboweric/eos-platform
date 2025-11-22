import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Progress } from '../components/ui/progress';
import { 
  Cloud, 
  HardDrive, 
  Upload, 
  Download, 
  Settings, 
  Shield, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  FolderOpen,
  RefreshCw,
  Info,
  Database,
  Link,
  Activity,
  HelpCircle,
  Book,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import axios from '../services/axiosConfig';

// Provider icons
const GoogleDriveIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M7.71 3.5L1.15 15l3.46 6l6.55-11.5L7.71 3.5z"/>
    <path fill="#0F9D58" d="M15.29 3.5h-7.58l6.55 11.5h7.58L15.29 3.5z"/>
    <path fill="#FFC107" d="M4.61 21l6.55-11.5L14.62 15H22.2L18.74 21H4.61z"/>
  </svg>
);

const OneDriveIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#0078D4" d="M13.5 8.5q1.5 0 2.75.75t1.9 2.05q1.15.15 1.95.95t.9 1.95q0 1.25-.875 2.125T18 17.25H7q-1.65 0-2.825-1.175T3 13.25q0-1.5 1-2.625t2.5-1.375q.375-1.75 1.75-2.875T11.5 5.25q1.05 0 1.95.4t1.55 1.1q-.5.3-.925.675T13.5 8.5z"/>
  </svg>
);

const StorageConfigPage = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('internal');
  const [configForm, setConfigForm] = useState({});
  const [testResults, setTestResults] = useState(null);
  const [storageStats, setStorageStats] = useState(null);
  const [activeTab, setActiveTab] = useState('configuration');
  const [migrationProgress, setMigrationProgress] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [expandedGuide, setExpandedGuide] = useState(null);

  useEffect(() => {
    fetchCurrentConfig();
    fetchStorageStats();
  }, []);

  const fetchCurrentConfig = async () => {
    try {
      const response = await axios.get(`/organizations/${user.organizationId}/storage/config`);
      setCurrentConfig(response.data.data);
      setSelectedProvider(response.data.data.provider || 'internal');
      setConfigForm(response.data.data.config || {});
    } catch (error) {
      console.error('Error fetching storage config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageStats = async () => {
    try {
      const response = await axios.get(`/organizations/${user.organizationId}/storage/stats`);
      setStorageStats(response.data.data);
    } catch (error) {
      console.error('Error fetching storage stats:', error);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResults(null);
    
    try {
      const response = await axios.post(
        `/organizations/${user.organizationId}/storage/test`,
        {
          provider: selectedProvider,
          config: configForm
        }
      );
      
      setTestResults(response.data.data);
    } catch (error) {
      setTestResults({
        valid: false,
        message: error.response?.data?.error || 'Connection test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfiguration = async () => {
    setSaving(true);
    
    try {
      await axios.put(
        `/organizations/${user.organizationId}/storage/config`,
        {
          provider: selectedProvider,
          config: configForm
        }
      );
      
      await fetchCurrentConfig();
      await fetchStorageStats();
      
      // Show success message
      alert('Storage configuration updated successfully!');
    } catch (error) {
      alert('Failed to save configuration: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        setConfigForm({
          ...configForm,
          [field]: content
        });
      } catch (error) {
        alert('Invalid file format');
      }
    };
    reader.readAsText(file);
  };

  const renderHelpSection = () => {
    const guides = {
      google_drive: {
        title: 'Google Drive Setup Guide',
        steps: [
          {
            title: '1. Create Service Account',
            content: `• Go to Google Cloud Console
• Select your project or create new one
• Navigate to IAM & Admin > Service Accounts
• Click "Create Service Account"
• Name it "AXP Document Storage"`,
            link: 'https://console.cloud.google.com'
          },
          {
            title: '2. Enable APIs',
            content: `• Go to APIs & Services > Library
• Enable Google Drive API
• Enable Google Docs API (optional)
• Enable Google Sheets API (optional)`,
          },
          {
            title: '3. Create Service Account Key',
            content: `• Go back to Service Accounts
• Click on your service account
• Go to Keys tab
• Add Key > Create new key > JSON
• Save the downloaded file securely`,
          },
          {
            title: '4. Enable Domain-Wide Delegation',
            content: `• In service account details
• Enable G Suite Domain-wide Delegation
• Enter product name: "AXP Platform"
• Copy the Client ID`,
          },
          {
            title: '5. Authorize in Google Workspace',
            content: `• Go to Google Workspace Admin Console
• Security > API Controls > Domain-wide delegation
• Add new with Client ID and these scopes:
  - https://www.googleapis.com/auth/drive
  - https://www.googleapis.com/auth/drive.file`,
            link: 'https://admin.google.com'
          },
          {
            title: '6. Create Root Folder',
            content: `• Open Google Drive
• Create folder "AXP Platform"
• Share with service account email
• Copy folder ID from URL`,
          }
        ],
        troubleshooting: [
          { issue: 'Permission Denied', solution: 'Verify domain-wide delegation is enabled and authorized' },
          { issue: 'File Not Found', solution: 'Check that root folder ID is correct and shared with service account' },
          { issue: 'Invalid Credentials', solution: 'Ensure JSON key file is valid and not expired' }
        ]
      },
      onedrive: {
        title: 'OneDrive/SharePoint Setup Guide',
        steps: [
          {
            title: '1. Register App in Azure',
            content: `• Go to Azure Portal
• Navigate to Azure Active Directory
• App registrations > New registration
• Name: "AXP Document Storage"
• Supported accounts: Single tenant`,
            link: 'https://portal.azure.com'
          },
          {
            title: '2. Configure API Permissions',
            content: `• Go to API permissions
• Add permission > Microsoft Graph
• Application permissions:
  - Files.ReadWrite.All
  - Sites.ReadWrite.All
  - User.Read.All
• Grant admin consent`,
          },
          {
            title: '3. Create Client Secret',
            content: `• Go to Certificates & secrets
• New client secret
• Description: "AXP Platform Integration"
• Expires: 24 months
• Copy the secret value immediately`,
          },
          {
            title: '4. Get IDs',
            content: `• Note your Tenant ID
• Note your Application (Client) ID
• For SharePoint: Get Site ID
• For OneDrive: Get Drive ID`,
          },
          {
            title: '5. Create Storage Location',
            content: `• For OneDrive: Create service account user
• For SharePoint: Create dedicated site
• Create "AXP Platform" folder
• Note the folder path`,
          }
        ],
        troubleshooting: [
          { issue: 'Access Denied', solution: 'Verify admin consent was granted for all permissions' },
          { issue: 'Invalid Client', solution: 'Check Tenant ID and Client ID are correct' },
          { issue: 'Secret Expired', solution: 'Create new client secret in Azure Portal' }
        ]
      }
    };

    const guide = guides[selectedProvider];
    if (!guide) return null;

    return (
      <Card className="mb-6 border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Book className="h-5 w-5 text-blue-600" />
              {guide.title}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHelp(!showHelp)}
            >
              {showHelp ? 'Hide' : 'Show'} Guide
            </Button>
          </CardTitle>
          <CardDescription>
            Estimated setup time: 15-20 minutes • IT Administrator required
          </CardDescription>
        </CardHeader>
        {showHelp && (
          <CardContent className="space-y-6">
            {/* Step by Step Guide */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Step-by-Step Instructions</h3>
              {guide.steps.map((step, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpandedGuide(expandedGuide === index ? null : index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm">
                          {index + 1}
                        </span>
                        {step.title}
                      </h4>
                      {expandedGuide === index && (
                        <div className="mt-3 text-sm text-gray-600 whitespace-pre-line">
                          {step.content}
                          {step.link && (
                            <a
                              href={step.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-500 hover:underline mt-2"
                            >
                              Open in new tab
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        expandedGuide === index ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Troubleshooting */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Common Issues & Solutions
              </h3>
              <div className="space-y-2">
                {guide.troubleshooting.map((item, index) => (
                  <Alert key={index} className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{item.issue}:</strong> {item.solution}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href="/docs/CLOUD_STORAGE_SETUP_GOOGLE.md"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText className="mr-1 h-4 w-4" />
                  Full Documentation
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href="mailto:support@axplatform.app?subject=Storage Setup Help"
                >
                  <HelpCircle className="mr-1 h-4 w-4" />
                  Contact Support
                </a>
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  const renderProviderConfig = () => {
    switch (selectedProvider) {
      case 'google_drive':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="service_account_email" className="flex items-center gap-2">
                Service Account Email
                <HelpCircle className="h-4 w-4 text-gray-400" title="The email address of your Google Cloud service account" />
              </Label>
              <Input
                id="service_account_email"
                type="email"
                placeholder="your-service-account@project.iam.gserviceaccount.com"
                value={configForm.service_account_email || ''}
                onChange={(e) => setConfigForm({...configForm, service_account_email: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="service_account_key">Service Account Key (JSON)</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept=".json"
                  onChange={(e) => handleFileUpload(e, 'service_account_key')}
                />
                {configForm.service_account_key && (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-2" />
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Upload the JSON key file from Google Cloud Console
              </p>
            </div>
            
            <div>
              <Label htmlFor="root_folder_id">Root Folder ID</Label>
              <Input
                id="root_folder_id"
                placeholder="1ABC123..."
                value={configForm.root_folder_id || ''}
                onChange={(e) => setConfigForm({...configForm, root_folder_id: e.target.value})}
              />
              <p className="text-sm text-gray-500 mt-1">
                The Google Drive folder ID where files will be stored
              </p>
            </div>
            
            <div>
              <Label htmlFor="domain">Organization Domain</Label>
              <Input
                id="domain"
                placeholder="yourdomain.com"
                value={configForm.domain || ''}
                onChange={(e) => setConfigForm({...configForm, domain: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="admin_email">Admin Email (for impersonation)</Label>
              <Input
                id="admin_email"
                type="email"
                placeholder="admin@yourdomain.com"
                value={configForm.admin_email || ''}
                onChange={(e) => setConfigForm({...configForm, admin_email: e.target.value})}
              />
            </div>
          </div>
        );
        
      case 'onedrive':
      case 'sharepoint':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="tenant_id">Tenant ID</Label>
              <Input
                id="tenant_id"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={configForm.tenant_id || ''}
                onChange={(e) => setConfigForm({...configForm, tenant_id: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="client_id">Client ID (Application ID)</Label>
              <Input
                id="client_id"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={configForm.client_id || ''}
                onChange={(e) => setConfigForm({...configForm, client_id: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="client_secret">Client Secret</Label>
              <Input
                id="client_secret"
                type="password"
                placeholder="Enter client secret"
                value={configForm.client_secret || ''}
                onChange={(e) => setConfigForm({...configForm, client_secret: e.target.value})}
              />
            </div>
            
            {selectedProvider === 'sharepoint' && (
              <div>
                <Label htmlFor="site_id">SharePoint Site ID</Label>
                <Input
                  id="site_id"
                  placeholder="contoso.sharepoint.com,xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={configForm.site_id || ''}
                  onChange={(e) => setConfigForm({...configForm, site_id: e.target.value})}
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="drive_id">Drive ID</Label>
              <Input
                id="drive_id"
                placeholder="b!xxxxxx..."
                value={configForm.drive_id || ''}
                onChange={(e) => setConfigForm({...configForm, drive_id: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="root_folder_path">Root Folder Path</Label>
              <Input
                id="root_folder_path"
                placeholder="/AXP Platform"
                value={configForm.root_folder_path || ''}
                onChange={(e) => setConfigForm({...configForm, root_folder_path: e.target.value})}
              />
            </div>
          </div>
        );
        
      default:
        return (
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              Files are stored securely in AXP's database. No additional configuration required.
            </AlertDescription>
          </Alert>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 bg-blue-50/80 backdrop-blur-sm text-blue-700">
            <HardDrive className="h-4 w-4" />
            STORAGE MANAGEMENT
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">Storage Configuration</h1>
          <p className="text-lg text-slate-600">Configure where your organization's documents are stored</p>
        </div>

        {/* Current Status Card */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl">
          <CardHeader className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm border-b border-white/20">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-200">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              Current Storage Status
            </CardTitle>
          </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Provider</p>
              <p className="font-semibold flex items-center gap-2">
                {currentConfig?.provider === 'google_drive' && <GoogleDriveIcon />}
                {currentConfig?.provider === 'onedrive' && <OneDriveIcon />}
                {currentConfig?.provider === 'internal' && <Database className="h-5 w-5" />}
                {currentConfig?.provider === 'internal' ? 'Internal Storage' : 
                 currentConfig?.provider === 'google_drive' ? 'Google Drive' :
                 currentConfig?.provider === 'onedrive' ? 'OneDrive' :
                 currentConfig?.provider === 'sharepoint' ? 'SharePoint' : 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Storage Used</p>
              <p className="font-semibold">
                {storageStats?.quota ? 
                  `${(storageStats.quota.used / 1024 / 1024 / 1024).toFixed(2)} GB` : 
                  'Loading...'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">File Count</p>
              <p className="font-semibold">
                {storageStats?.quota?.fileCount || 0} documents
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-semibold flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Connected
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
          <TabsTrigger value="migration">Migration</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-6">
          {/* Help Section - Shows for selected provider */}
          {selectedProvider !== 'internal' && renderHelpSection()}
          
          <Card>
            <CardHeader>
              <CardTitle>Storage Provider</CardTitle>
              <CardDescription>
                Choose where your documents will be stored
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={selectedProvider} onValueChange={setSelectedProvider}>
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="internal" id="internal" />
                  <Label htmlFor="internal" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 font-semibold">
                      <Database className="h-5 w-5" />
                      Internal Storage
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Store files securely in AXP's database. No additional setup required.
                    </p>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="google_drive" id="google_drive" />
                  <Label htmlFor="google_drive" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 font-semibold">
                      <GoogleDriveIcon />
                      Google Drive
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Perfect for Google Workspace organizations. Files stay in your Google Drive.
                    </p>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="onedrive" id="onedrive" />
                  <Label htmlFor="onedrive" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 font-semibold">
                      <OneDriveIcon />
                      OneDrive for Business
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Ideal for Microsoft 365 organizations. Integrates with your OneDrive.
                    </p>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="sharepoint" id="sharepoint" />
                  <Label htmlFor="sharepoint" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 font-semibold">
                      <OneDriveIcon />
                      SharePoint Online
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Best for larger enterprises using SharePoint for document management.
                    </p>
                  </Label>
                </div>
              </RadioGroup>

              {selectedProvider !== 'internal' && (
                <>
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Provider Configuration</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowHelp(!showHelp)}
                        className="text-blue-600"
                      >
                        <HelpCircle className="mr-1 h-4 w-4" />
                        {showHelp ? 'Hide' : 'Need'} Help?
                      </Button>
                    </div>
                    {renderProviderConfig()}
                  </div>

                  {testResults && (
                    <Alert className={testResults.valid ? "border-green-500" : "border-red-500"}>
                      {testResults.valid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <AlertDescription>
                        {testResults.message}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleTestConnection}
                      disabled={testing}
                      variant="outline"
                    >
                      {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Test Connection
                    </Button>
                    <Button
                      onClick={handleSaveConfiguration}
                      disabled={saving || !testResults?.valid}
                    >
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Configuration
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Fine-tune your storage configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Hierarchical Folder Structure</Label>
                  <p className="text-sm text-gray-600">
                    Organize files in year/quarter/department folders
                  </p>
                </div>
                <Switch
                  checked={configForm.folder_structure === 'hierarchical'}
                  onCheckedChange={(checked) => 
                    setConfigForm({...configForm, folder_structure: checked ? 'hierarchical' : 'flat'})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-create Department Folders</Label>
                  <p className="text-sm text-gray-600">
                    Automatically create folders for each department
                  </p>
                </div>
                <Switch
                  checked={configForm.auto_create_folders}
                  onCheckedChange={(checked) => 
                    setConfigForm({...configForm, auto_create_folders: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Sync Permissions</Label>
                  <p className="text-sm text-gray-600">
                    Sync AXP visibility settings with cloud provider permissions
                  </p>
                </div>
                <Switch
                  checked={configForm.sync_permissions}
                  onCheckedChange={(checked) => 
                    setConfigForm({...configForm, sync_permissions: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Document Previews</Label>
                  <p className="text-sm text-gray-600">
                    Show document previews using cloud provider viewers
                  </p>
                </div>
                <Switch
                  checked={configForm.enable_viewer_embedding}
                  onCheckedChange={(checked) => 
                    setConfigForm({...configForm, enable_viewer_embedding: checked})
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="migration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Migration</CardTitle>
              <CardDescription>
                Migrate existing documents to your new storage provider
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  You have {storageStats?.breakdown?.find(b => b.storage_provider === 'internal')?.file_count || 0} documents
                  in internal storage that can be migrated to {selectedProvider === 'google_drive' ? 'Google Drive' : 
                  selectedProvider === 'onedrive' ? 'OneDrive' : 'your selected provider'}.
                </AlertDescription>
              </Alert>

              <RadioGroup defaultValue="new_only">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="migrate_all" id="migrate_all" />
                  <Label htmlFor="migrate_all">
                    <div>Migrate all existing documents</div>
                    <p className="text-sm text-gray-600">
                      Move all current documents to the new storage provider
                    </p>
                  </Label>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="new_only" id="new_only" />
                  <Label htmlFor="new_only">
                    <div>Use cloud storage for new documents only</div>
                    <p className="text-sm text-gray-600">
                      Keep existing documents in place, use new storage for future uploads
                    </p>
                  </Label>
                </div>
              </RadioGroup>

              {migrationProgress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Migration Progress</span>
                    <span>{migrationProgress.current}/{migrationProgress.total} files</span>
                  </div>
                  <Progress value={(migrationProgress.current / migrationProgress.total) * 100} />
                </div>
              )}

              <Button className="w-full" disabled={!selectedProvider || selectedProvider === 'internal'}>
                Start Migration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>
                Recent storage operations and sync activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Placeholder for activity logs */}
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-gray-600">2 min ago</span>
                  <span>File uploaded to Google Drive</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-gray-600">5 min ago</span>
                  <span>Permissions synced</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-gray-600">1 hour ago</span>
                  <span>Rate limit warning</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};

export default StorageConfigPage;