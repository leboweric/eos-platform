import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Download, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { adminService } from '../services/adminService';
import * as XLSX from 'xlsx';

const BulkUserImport = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const handleDownloadTemplate = async () => {
    try {
      const response = await adminService.downloadBulkImportTemplate();
      const blob = new Blob([response], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk_user_import_template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download template: ' + err.message);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setSelectedFile(file);
    setError(null);
    setImportResults(null);
    
    // Preview the file
    try {
      setIsLoading(true);
      const previewData = await adminService.previewBulkImport(file);
      setPreview(previewData.preview);
    } catch (err) {
      setError('Failed to preview file: ' + err.message);
      setPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !preview?.canImport) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const result = await adminService.performBulkImport(selectedFile);
      setImportResults(result.results);
      setPreview(null);
      setSelectedFile(null);
      // Clear file input
      document.getElementById('file-upload').value = '';
    } catch (err) {
      setError('Import failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bulk User Import</h1>
        <p className="text-gray-600 mt-2">
          Import multiple users at once using an Excel spreadsheet
        </p>
      </div>

      {/* Step 1: Download Template */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Step 1: Download Template
          </CardTitle>
          <CardDescription>
            Download the Excel template and fill it with your user data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleDownloadTemplate}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Download Excel Template
          </Button>
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-semibold mb-2">Template Instructions:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Required fields: First Name, Last Name, Email, Role</li>
              <li>Role options: member, admin</li>
              <li>Department Name is optional - departments will be created if they don't exist</li>
              <li>All users will be set up for Microsoft OAuth authentication</li>
              <li>Email addresses must be unique and match their Microsoft accounts</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Upload File */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Step 2: Upload File
          </CardTitle>
          <CardDescription>
            Upload your completed Excel file for preview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
              disabled={isLoading}
            />
            {selectedFile && (
              <Badge variant="secondary">
                {selectedFile.name}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Preview */}
      {preview && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Preview
            </CardTitle>
            <CardDescription>
              Review the data before importing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Total Rows</p>
                <p className="text-2xl font-bold text-blue-900">{preview.summary?.total || 0}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Valid Users</p>
                <p className="text-2xl font-bold text-green-900">{preview.summary?.valid || 0}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-600 font-medium">Invalid Users</p>
                <p className="text-2xl font-bold text-red-900">{preview.summary?.invalid || 0}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">New Departments</p>
                <p className="text-2xl font-bold text-purple-900">{preview.departments?.new?.length || 0}</p>
              </div>
            </div>

            {/* Department Info */}
            {preview.departments && (preview.departments.new.length > 0 || preview.departments.existing.length > 0) && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Departments</h4>
                {preview.departments.new.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-600 mb-1">New departments to be created:</p>
                    <div className="flex flex-wrap gap-2">
                      {preview.departments.new.map(dept => (
                        <Badge key={dept} variant="secondary">
                          {dept}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {preview.departments.existing.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Existing departments:</p>
                    <div className="flex flex-wrap gap-2">
                      {preview.departments.existing.map(dept => (
                        <Badge key={dept} variant="outline">
                          {dept}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Validation Alerts */}
            {preview.invalid && preview.invalid.length > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-semibold">{preview.invalid.length} user(s) have validation errors.</span> Click the "Invalid" tab below to see details.
                </AlertDescription>
              </Alert>
            )}
            
            {preview.duplicates && preview.duplicates.length > 0 && (
              <Alert className="mb-4 border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <span className="font-semibold">{preview.duplicates.length} duplicate user(s) found.</span> These users already exist and will be skipped.
                </AlertDescription>
              </Alert>
            )}

            {/* Status Filter Tabs */}
            <div className="flex gap-2 mb-4 border-b">
              <Button 
                variant={statusFilter === 'all' ? 'default' : 'ghost'}
                onClick={() => setStatusFilter('all')}
                className="rounded-b-none"
              >
                All ({preview.summary?.total || 0})
              </Button>
              <Button 
                variant={statusFilter === 'ready' ? 'default' : 'ghost'}
                onClick={() => setStatusFilter('ready')}
                className="rounded-b-none"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Ready ({preview.valid?.length || 0})
              </Button>
              <Button 
                variant={statusFilter === 'duplicate' ? 'default' : 'ghost'}
                onClick={() => setStatusFilter('duplicate')}
                className="rounded-b-none"
              >
                <AlertCircle className="h-4 w-4 mr-1 text-yellow-600" />
                Duplicates ({preview.duplicates?.length || 0})
              </Button>
              <Button 
                variant={statusFilter === 'invalid' ? 'default' : 'ghost'}
                onClick={() => setStatusFilter('invalid')}
                className="rounded-b-none"
              >
                <XCircle className="h-4 w-4 mr-1 text-red-600" />
                Invalid ({preview.invalid?.length || 0})
              </Button>
            </div>

            {/* User Preview Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    // Combine all users and filter based on selected status
                    const allUsers = [
                      ...(preview.valid || []).map(u => ({...u, status: 'Ready'})),
                      ...(preview.invalid || []).map(u => ({...u, status: 'Invalid'})),
                      ...(preview.duplicates || []).map(u => ({...u, status: 'Duplicate'}))
                    ];
                    
                    const filteredUsers = statusFilter === 'all' 
                      ? allUsers
                      : allUsers.filter(u => {
                          if (statusFilter === 'ready') return u.status === 'Ready';
                          if (statusFilter === 'duplicate') return u.status === 'Duplicate';
                          if (statusFilter === 'invalid') return u.status === 'Invalid';
                          return true;
                        });
                    
                    return filteredUsers.slice(0, 20).map((user) => (
                      <tr key={user.rowNumber || user.row || user.email} 
                          className={
                            user.status === 'Invalid' ? 'bg-red-50' : 
                            user.status === 'Duplicate' ? 'bg-yellow-50' : 
                            ''
                          }>
                        <td className="px-4 py-2 text-sm text-gray-900">{user.rowNumber || user.row}</td>
                        <td className="px-4 py-2 text-sm">
                          {user.status === 'Ready' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Ready
                            </span>
                          )}
                          {user.status === 'Duplicate' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Duplicate
                            </span>
                          )}
                          {user.status === 'Invalid' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Invalid
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {user.firstName} {user.lastName}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{user.email}</td>
                        <td className="px-4 py-2 text-sm">
                          <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{user.department || '-'}</td>
                        <td className="px-4 py-2 text-sm">
                          {user.status === 'Invalid' && user.errors && (
                            <div className="text-xs text-red-600">
                              {typeof user.errors === 'string' ? user.errors : user.errors}
                            </div>
                          )}
                          {user.status === 'Duplicate' && (
                            <div className="text-xs text-yellow-700">
                              User already exists
                            </div>
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
              
              <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500">
                {(() => {
                  const allUsers = [
                    ...(preview.valid || []),
                    ...(preview.invalid || []),
                    ...(preview.duplicates || [])
                  ];
                  const filteredCount = statusFilter === 'all' 
                    ? allUsers.length
                    : statusFilter === 'ready' ? (preview.valid?.length || 0)
                    : statusFilter === 'duplicate' ? (preview.duplicates?.length || 0)
                    : (preview.invalid?.length || 0);
                  
                  return (
                    <span>
                      Showing {Math.min(20, filteredCount)} of {filteredCount} 
                      {statusFilter !== 'all' && ` ${statusFilter}`} users
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Import Button */}
            {preview.canImport && (
              <div className="mt-6 flex justify-end">
                <Button 
                  onClick={handleImport}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4" />
                      Import {preview.summary?.valid || 0} Users
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResults && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Users Created</p>
                <p className="text-2xl font-bold text-green-900">{importResults.usersCreated}</p>
              </div>
              {importResults.usersSkipped > 0 && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-600 font-medium">Skipped (Existing)</p>
                  <p className="text-2xl font-bold text-yellow-900">{importResults.usersSkipped}</p>
                </div>
              )}
              {importResults.departmentsCreated > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Departments Created</p>
                  <p className="text-2xl font-bold text-blue-900">{importResults.departmentsCreated}</p>
                </div>
              )}
              {importResults.usersFailed > 0 && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Failed</p>
                  <p className="text-2xl font-bold text-red-900">{importResults.usersFailed}</p>
                </div>
              )}
            </div>
            
            {importResults.warnings && importResults.warnings.length > 0 && (
              <Alert className="mb-4 border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  <p className="font-semibold mb-2 text-yellow-800">Skipped Users:</p>
                  <ul className="list-disc list-inside">
                    {importResults.warnings.slice(0, 5).map((warn, idx) => (
                      <li key={idx} className="text-sm text-yellow-700">{warn}</li>
                    ))}
                    {importResults.warnings.length > 5 && (
                      <li className="text-sm text-yellow-700 italic">
                        ...and {importResults.warnings.length - 5} more
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {importResults.errors && importResults.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Errors:</p>
                  <ul className="list-disc list-inside">
                    {importResults.errors.map((err, idx) => (
                      <li key={idx} className="text-sm">{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="mt-6">
              <Button 
                onClick={() => {
                  setImportResults(null);
                  setSelectedFile(null);
                  setPreview(null);
                }}
                variant="outline"
              >
                Import More Users
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkUserImport;