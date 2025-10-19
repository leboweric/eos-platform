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
                <p className="text-2xl font-bold text-blue-900">{preview.totalRows}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Valid Users</p>
                <p className="text-2xl font-bold text-green-900">{preview.validUsers}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-600 font-medium">Invalid Users</p>
                <p className="text-2xl font-bold text-red-900">{preview.invalidUsers}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">New Departments</p>
                <p className="text-2xl font-bold text-purple-900">{preview.newDepartments}</p>
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

            {/* User Preview Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.users.slice(0, 10).map((user) => (
                    <tr key={user.row} className={user.valid ? '' : 'bg-red-50'}>
                      <td className="px-4 py-2 text-sm text-gray-900">{user.row}</td>
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
                        {user.valid ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <div className="flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-red-500" />
                            <div className="text-xs text-red-600">
                              {user.errors.join(', ')}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.users.length > 10 && (
                <p className="text-sm text-gray-500 mt-2 px-4">
                  Showing first 10 rows of {preview.users.length} total
                </p>
              )}
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
                      Import {preview.validUsers} Users
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Users Created</p>
                <p className="text-2xl font-bold text-green-900">{importResults.usersCreated}</p>
              </div>
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