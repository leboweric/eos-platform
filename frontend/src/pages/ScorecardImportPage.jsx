import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import {
  FileSpreadsheet,
  Upload,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Download,
  FileText,
  Target,
  TrendingUp
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { teamsService } from '../services/teamsService';
import scorecardImportService from '../services/scorecardImportService';

const ScorecardImportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const organizationId = user?.organizationId || user?.organization_id;

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // Add initial loading state
  const [error, setError] = useState(null);

  // Step 1: File upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // Step 2: Preview
  const [previewData, setPreviewData] = useState(null);
  const [conflictStrategy, setConflictStrategy] = useState('merge'); // DEFAULT: 'merge' for incremental imports
  
  // Step 3: Owner mapping
  const [ownerMappings, setOwnerMappings] = useState({});

  // Step 4: Results
  const [importResults, setImportResults] = useState(null);

  const steps = [
    { number: 1, title: 'Upload File', icon: Upload },
    { number: 2, title: 'Review & Map', icon: Users },
    { number: 3, title: 'Confirm Import', icon: CheckCircle },
    { number: 4, title: 'Results', icon: FileSpreadsheet }
  ];

  useEffect(() => {
    // Only fetch teams if organizationId is available
    if (organizationId) {
      fetchTeams();
    } else {
      // Mark as initialized even if no orgId yet
      setIsInitializing(false);
    }
  }, [organizationId]);

  const fetchTeams = async () => {
    try {
      // Don't pass organizationId - teamsService gets it internally
      const response = await teamsService.getTeams();
      console.log('Teams response:', response);
      // Handle different response formats
      const teamsData = response?.data?.teams || response?.teams || response?.data || response || [];
      console.log('Teams data:', teamsData);
      setTeams(Array.isArray(teamsData) ? teamsData : []);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError('Failed to load teams');
      setTeams([]); // Ensure teams is an empty array on error
    } finally {
      setIsInitializing(false); // Mark initialization as complete
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }
    
    setSelectedFile(file);
    setError(null);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handlePreview = async () => {
    if (!selectedFile || !selectedTeamId) {
      setError('Please select a file and team');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('organizationId', organizationId);
      formData.append('teamId', selectedTeamId);

      const response = await scorecardImportService.preview(formData);
      setPreviewData(response.preview);
      
      // Initialize owner mappings with auto-matched users
      setOwnerMappings(response.preview.ownerMappings || {});
      
      setCurrentStep(2);
    } catch (error) {
      console.error('Error previewing import:', error);
      setError(error.response?.data?.error || 'Failed to preview import');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Sanitize owner mappings - convert "no-owner" placeholder back to null
      const sanitizedMappings = Object.fromEntries(
        Object.entries(ownerMappings).map(([key, value]) => [
          key, 
          value === 'no-owner' ? null : value
        ])
      );

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('organizationId', organizationId);
      formData.append('teamId', selectedTeamId);
      formData.append('conflictStrategy', conflictStrategy);
      formData.append('ownerMappings', JSON.stringify(sanitizedMappings));

      const response = await scorecardImportService.execute(formData);
      setImportResults(response.results);
      setCurrentStep(4);
    } catch (error) {
      console.error('Error executing import:', error);
      setError(error.response?.data?.error || 'Failed to import scorecard');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOwnerMapping = (ownerName, userId) => {
    setOwnerMappings(prev => ({
      ...prev,
      [ownerName]: userId
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderUploadStep();
      case 2:
        return renderPreviewStep();
      case 3:
        return renderConfirmStep();
      case 4:
        return renderResultsStep();
      default:
        return null;
    }
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Scorecard CSV</CardTitle>
          <CardDescription>
            Upload your scorecard export from Ninety.io or another compatible system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Team Selection */}
          <div className="space-y-2">
            <Label htmlFor="team">Select Team *</Label>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a team for this scorecard" />
              </SelectTrigger>
              <SelectContent>
                {teams && teams.length > 0 ? (
                  teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                      {team.is_leadership_team && (
                        <Badge variant="secondary" className="ml-2">Leadership</Badge>
                      )}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-teams" disabled>
                    No teams available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload with Drag & Drop */}
          <div className="space-y-2">
            <Label htmlFor="file">CSV File *</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver
                  ? 'border-blue-400 bg-blue-50'
                  : selectedFile
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <p className="text-lg font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      Drop your CSV file here, or{' '}
                      <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
                        browse
                        <input
                          type="file"
                          className="hidden"
                          accept=".csv"
                          onChange={handleFileInputChange}
                        />
                      </label>
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Supports CSV files only (max 10MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Format Instructions */}
          <Alert className="border-blue-200 bg-blue-50">
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <p className="font-semibold mb-2">Expected CSV Format:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Columns: Group Name, Status, Title, Description, Owner, Goal, Average, [Date Columns]</li>
                <li>Date format: "Oct 13 - Oct 19" for weekly data</li>
                <li>Goal format: "&gt; 0", "&lt;= 10", "&gt;= 50%" etc.</li>
                <li>Values can be numbers or percentages</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => navigate('/admin/tools')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tools
            </Button>
            <Button 
              onClick={handlePreview}
              disabled={!selectedFile || !selectedTeamId || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Preview Import
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Import Preview</CardTitle>
          <CardDescription>
            Review the data that will be imported and resolve any conflicts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Total Metrics</p>
              <p className="text-2xl font-bold text-blue-900">
                {previewData?.summary.totalMetrics || 0}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 font-medium">New Metrics</p>
              <p className="text-2xl font-bold text-green-900">
                {previewData?.summary.newMetrics || 0}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-600 font-medium">Conflicts</p>
              <p className="text-2xl font-bold text-yellow-900">
                {previewData?.summary.existingMetrics || 0}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Total Scores</p>
              <p className="text-2xl font-bold text-purple-900">
                {previewData?.summary.totalScores || 0}
              </p>
            </div>
          </div>

          {/* Detailed Metrics Table */}
          {previewData && previewData.metrics && previewData.metrics.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Metrics to Import</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-200 px-4 py-2 text-left">Metric Name</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Owner</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Goal</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Avg</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Recent Scores (5 weeks)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.metrics.map((metric, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-4 py-2 font-medium">
                          {metric.name}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          {metric.owner_name}
                          {metric.owner_id ? (
                            <span className="ml-2 text-xs text-green-600">✓ Found</span>
                          ) : (
                            <span className="ml-2 text-xs text-yellow-600">⚠ Will create</span>
                          )}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          {metric.goal || '-'}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          {metric.average || '-'}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          <div className="flex gap-2 text-sm">
                            {metric.recent_scores && metric.recent_scores.slice(0, 5).map((score, i) => (
                              <span key={i} className="px-2 py-1 bg-blue-50 rounded">
                                {score.value}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Show any warnings or issues */}
              {previewData.warnings && previewData.warnings.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <h4 className="font-semibold text-yellow-800 mb-2">Warnings:</h4>
                  <ul className="list-disc list-inside text-sm text-yellow-700">
                    {previewData.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Show database mapping info */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-semibold text-blue-800 mb-2">Database Mapping:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-medium">CSV "Title"</span> → DB "name"</div>
                  <div><span className="font-medium">CSV "Owner"</span> → DB "owner_id" (user lookup)</div>
                  <div><span className="font-medium">CSV "Goal"</span> → DB "goal"</div>
                  <div><span className="font-medium">CSV "Description"</span> → DB "description"</div>
                  <div><span className="font-medium">CSV "Status"</span> → DB "is_active"</div>
                  <div><span className="font-medium">CSV Date columns</span> → DB "scorecard_scores" table</div>
                </div>
              </div>
            </div>
          )}

          {/* Conflict Strategy */}
          {previewData?.conflicts?.length > 0 && (
            <div className="space-y-4 mb-6">
              <h3 className="font-semibold">Conflict Resolution Strategy</h3>
              <RadioGroup value={conflictStrategy} onValueChange={setConflictStrategy}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="merge" id="merge" />
                  <Label htmlFor="merge" className="cursor-pointer">
                    <span className="font-medium">Merge (Recommended for re-imports)</span> - Updates metric details, adds only new scores
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="skip" id="skip" />
                  <Label htmlFor="skip" className="cursor-pointer">
                    Skip - Don't update existing metrics at all
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="update" id="update" />
                  <Label htmlFor="update" className="cursor-pointer">
                    Replace - Overwrites all existing data (use with caution)
                  </Label>
                </div>
              </RadioGroup>
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Incremental Import Support:</strong> For re-imports with new weeks of data, use "Merge" to keep existing scores and add only new ones.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Owner Mapping */}
          {previewData?.unmappedOwners?.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Map Metric Owners</h3>
              <div className="space-y-3">
                {(previewData?.unmappedOwners || []).map(ownerName => (
                  <div key={ownerName} className="flex items-center gap-4">
                    <span className="text-sm w-32">{ownerName}:</span>
                    <Select 
                      value={ownerMappings[ownerName] || 'no-owner'}
                      onValueChange={(value) => updateOwnerMapping(ownerName, value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-owner">No owner</SelectItem>
                        {(previewData?.availableUsers || []).map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={() => setCurrentStep(3)}>
              Continue to Confirm
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Confirm Import</CardTitle>
          <CardDescription>
            Review your import settings before proceeding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Team:</span>
                <span className="font-medium">
                  {teams.find(t => t.id === selectedTeamId)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">File:</span>
                <span className="font-medium">{selectedFile?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">New Metrics:</span>
                <span className="font-medium text-green-600">
                  {previewData?.summary.newMetrics || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Conflict Strategy:</span>
                <span className="font-medium">
                  {conflictStrategy === 'skip' && 'Skip existing'}
                  {conflictStrategy === 'update' && 'Replace all'}
                  {conflictStrategy === 'merge' && 'Merge scores'}
                </span>
              </div>
            </div>

            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                This action cannot be undone. Make sure you have backed up your data if needed.
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button 
                onClick={handleImport}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Start Import
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderResultsStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            Import Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          {importResults && (
            <div className="space-y-6">
              {/* Results Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Created</p>
                  <p className="text-2xl font-bold text-green-900">
                    {importResults.metricsCreated}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Updated</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {importResults.metricsUpdated}
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-600 font-medium">Skipped</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {importResults.metricsSkipped}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Scores Added</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {importResults.scoresAdded}
                  </p>
                </div>
              </div>

              {/* Errors if any */}
              {importResults.errors?.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-2">Some items failed to import:</p>
                    <ul className="list-disc list-inside text-sm">
                      {(importResults?.errors || []).slice(0, 5).map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                      {(importResults?.errors?.length || 0) > 5 && (
                        <li>...and {importResults.errors.length - 5} more</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCurrentStep(1);
                    setSelectedFile(null);
                    setPreviewData(null);
                    setImportResults(null);
                  }}
                >
                  Import Another File
                </Button>
                <Button onClick={() => navigate('/scorecard')}>
                  View Scorecard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Import Scorecard</h1>
        <p className="text-gray-600">
          Import scorecard metrics and historical data from CSV files
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 right-0 top-5 h-0.5 bg-gray-200 -z-10" />
          <div 
            className="absolute left-0 top-5 h-0.5 bg-blue-600 -z-10 transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = step.number === currentStep;
            const isCompleted = step.number < currentStep;
            
            return (
              <div 
                key={step.number}
                className="flex flex-col items-center"
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${isActive ? 'bg-blue-600 text-white' : ''}
                  ${isCompleted ? 'bg-green-600 text-white' : ''}
                  ${!isActive && !isCompleted ? 'bg-gray-200 text-gray-600' : ''}
                `}>
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className={`text-xs mt-2 ${isActive ? 'font-semibold' : ''}`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      {renderStepContent()}
    </div>
  );
};

export default ScorecardImportPage;