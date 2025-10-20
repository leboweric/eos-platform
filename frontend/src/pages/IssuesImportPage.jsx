import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Download, AlertTriangle, CheckCircle, XCircle, FileText, Users, Target } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { issuesImportService } from '../services/issuesImportService';

const IssuesImportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teams, setTeams] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [template, setTemplate] = useState(null);
  
  // Preview data
  const [previewData, setPreviewData] = useState(null);
  const [conflictStrategy, setConflictStrategy] = useState('merge');
  const [userMappings, setUserMappings] = useState({});
  
  // Results
  const [importResults, setImportResults] = useState(null);

  // Load template and teams on component mount
  useEffect(() => {
    loadTemplate();
    loadTeams();
  }, []);

  const loadTemplate = async () => {
    try {
      const templateData = await issuesImportService.getTemplate();
      setTemplate(templateData);
    } catch (error) {
      console.error('Failed to load template:', error);
      setError('Failed to load import template');
    }
  };

  const loadTeams = async () => {
    try {
      const response = await fetch(`/api/v1/organizations/${user.currentOrganization.id}/teams`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setTeams(data.teams || []);
      
      // Auto-select leadership team if available
      const leadershipTeam = data.teams?.find(team => team.is_leadership_team);
      if (leadershipTeam) {
        setSelectedTeam(leadershipTeam.id);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
      setError('Failed to load teams');
    }
  };

  const handleFileSelect = (file) => {
    setError('');
    
    const validation = issuesImportService.validateExcelFile(file);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }
    
    setSelectedFile(file);
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

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const downloadTemplate = () => {
    // Create a simple template based on the template data
    const csvContent = [
      'Title,Owner,Description,Priority,Team,Who,Completed On,Archived Date,Created Date',
      'Fix customer onboarding process,John Smith,Streamline the customer onboarding workflow,High,Customer Success,Jane Doe,,,"2025-10-01"',
      'Improve response time,Jane Doe,Reduce average response time to under 2 hours,Medium,Support,,,,"2025-10-01"'
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ninety_issues_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handlePreview = async () => {
    if (!selectedFile || !selectedTeam) {
      setError('Please select a file and team');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('organizationId', user.currentOrganization.id);
      formData.append('teamId', selectedTeam);

      const preview = await issuesImportService.previewImport(formData);
      const formattedPreview = issuesImportService.formatPreviewData(preview);
      
      setPreviewData(formattedPreview);
      
      // Initialize user mappings with auto-detected mappings
      if (preview.assigneeMappings) {
        setUserMappings(preview.assigneeMappings);
      }
      
      setCurrentStep(2);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('organizationId', user.currentOrganization.id);
      formData.append('teamId', selectedTeam);
      formData.append('conflictStrategy', conflictStrategy);
      
      const mappings = issuesImportService.formatUserMappings(userMappings);
      formData.append('assigneeMappings', JSON.stringify(mappings));

      const results = await issuesImportService.executeImport(formData);
      const formattedResults = issuesImportService.formatImportResults(results);
      
      setImportResults(formattedResults);
      setCurrentStep(3);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetImport = () => {
    setCurrentStep(1);
    setSelectedFile(null);
    setPreviewData(null);
    setImportResults(null);
    setError('');
    setUserMappings({});
  };

  const handleUserMappingChange = (assigneeName, userId) => {
    setUserMappings(prev => ({
      ...prev,
      [assigneeName]: userId
    }));
  };

  const conflictStrategies = issuesImportService.getConflictStrategies();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/issues')}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Issues</span>
            </button>
            <div className="w-px h-6 bg-slate-300"></div>
            <h1 className="text-2xl font-bold text-slate-800">Import Issues from Ninety.io</h1>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              1
            </div>
            <div className={`w-16 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              2
            </div>
            <div className={`w-16 h-0.5 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              3
            </div>
          </div>
        </div>

        {/* Step Labels */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-16 text-sm text-slate-600">
            <span className={currentStep === 1 ? 'font-semibold text-blue-600' : ''}>Upload File</span>
            <span className={currentStep === 2 ? 'font-semibold text-blue-600' : ''}>Review & Configure</span>
            <span className={currentStep === 3 ? 'font-semibold text-blue-600' : ''}>Complete</span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: File Upload */}
        {currentStep === 1 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-white/50">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Upload Ninety.io Issues Export</h2>
                <p className="text-slate-600">
                  Export your issues from Ninety.io and upload the Excel file here. The file should contain both Short Term and Long Term sheets.
                </p>
              </div>

              {/* Template Download */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-800 mb-1">Need a template?</h3>
                    <p className="text-blue-700 text-sm mb-3">
                      Download our template to see the expected format, or export directly from Ninety.io.
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Template</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Team Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Team
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Choose a team...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver 
                    ? 'border-blue-400 bg-blue-50' 
                    : selectedFile
                    ? 'border-green-400 bg-green-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-upload"
                />
                
                {selectedFile ? (
                  <div className="space-y-2">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                    <p className="text-green-700 font-medium">{selectedFile.name}</p>
                    <p className="text-green-600 text-sm">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <label
                      htmlFor="file-upload"
                      className="inline-block text-blue-600 hover:text-blue-700 cursor-pointer text-sm font-medium"
                    >
                      Choose different file
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto" />
                    <div>
                      <label
                        htmlFor="file-upload"
                        className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium"
                      >
                        Click to upload
                      </label>
                      <span className="text-slate-500"> or drag and drop</span>
                    </div>
                    <p className="text-slate-500 text-sm">Excel files only (.xlsx, .xls) • Max 10MB</p>
                  </div>
                )}
              </div>

              {/* Format Requirements */}
              {template && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h3 className="font-medium text-slate-800 mb-2">Required Format:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium text-slate-700 mb-1">Required Sheets:</h4>
                      <ul className="text-slate-600 space-y-1">
                        {template.required_sheets?.map((sheet, index) => (
                          <li key={index}>• {sheet}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-700 mb-1">Required Columns:</h4>
                      <ul className="text-slate-600 space-y-1">
                        {template.required_columns?.map((col, index) => (
                          <li key={index}>• {col}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Next Button */}
              <div className="flex justify-end">
                <button
                  onClick={handlePreview}
                  disabled={!selectedFile || !selectedTeam || loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>Preview Import</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Review & Configure */}
        {currentStep === 2 && previewData && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-white/50">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Review Import</h2>
                <p className="text-slate-600">
                  Review the issues to be imported and configure any conflicts or user mappings.
                </p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-700">{previewData.summary.totalIssues}</div>
                  <div className="text-blue-600 text-sm">Total Issues</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{previewData.summary.shortTermIssues}</div>
                  <div className="text-green-600 text-sm">Short Term</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-700">{previewData.summary.longTermIssues}</div>
                  <div className="text-purple-600 text-sm">Long Term</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                  <Users className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-amber-700">{previewData.summary.unmappedUsers}</div>
                  <div className="text-amber-600 text-sm">Unmapped Users</div>
                </div>
              </div>

              {/* Warnings */}
              {previewData.hasWarnings && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-amber-800 mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">Warnings</span>
                  </div>
                  <ul className="text-amber-700 text-sm space-y-1">
                    {previewData.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Conflict Strategy */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Conflict Resolution Strategy
                </label>
                <select
                  value={conflictStrategy}
                  onChange={(e) => setConflictStrategy(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {conflictStrategies.map((strategy) => (
                    <option key={strategy.value} value={strategy.value}>
                      {strategy.label}
                    </option>
                  ))}
                </select>
                <p className="text-slate-500 text-sm mt-1">
                  {conflictStrategies.find(s => s.value === conflictStrategy)?.description}
                </p>
              </div>

              {/* User Mappings */}
              {previewData.unmappedAssignees.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-slate-800 mb-4">Map Assignees to Users</h3>
                  <div className="space-y-3">
                    {previewData.unmappedAssignees.map((assigneeName) => (
                      <div key={assigneeName} className="flex items-center space-x-4">
                        <div className="flex-1">
                          <span className="text-slate-700 font-medium">{assigneeName}</span>
                        </div>
                        <div className="flex-1">
                          <select
                            value={userMappings[assigneeName] || ''}
                            onChange={(e) => handleUserMappingChange(assigneeName, e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Skip (use importing user)</option>
                            {previewData.availableUsers?.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name} ({user.email})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>Import Issues</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {currentStep === 3 && importResults && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-white/50">
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-slate-800 mb-2">Import Complete!</h2>
                <p className="text-slate-600">
                  {importResults.details.successMessage}
                </p>
              </div>

              {/* Results Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{importResults.summary.created}</div>
                  <div className="text-green-600 text-sm">Created</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">{importResults.summary.updated}</div>
                  <div className="text-blue-600 text-sm">Updated</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-amber-700">{importResults.summary.skipped}</div>
                  <div className="text-amber-600 text-sm">Skipped</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">{importResults.summary.errors}</div>
                  <div className="text-red-600 text-sm">Errors</div>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="space-y-4">
                {importResults.details.createdMessage && (
                  <div className="flex items-center space-x-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span>{importResults.details.createdMessage}</span>
                  </div>
                )}
                {importResults.details.updatedMessage && (
                  <div className="flex items-center space-x-2 text-blue-700">
                    <CheckCircle className="w-5 h-5" />
                    <span>{importResults.details.updatedMessage}</span>
                  </div>
                )}
                {importResults.details.shortTermMessage && (
                  <div className="flex items-center space-x-2 text-slate-700">
                    <Target className="w-5 h-5" />
                    <span>{importResults.details.shortTermMessage}</span>
                  </div>
                )}
                {importResults.details.longTermMessage && (
                  <div className="flex items-center space-x-2 text-slate-700">
                    <Target className="w-5 h-5" />
                    <span>{importResults.details.longTermMessage}</span>
                  </div>
                )}
              </div>

              {/* Errors */}
              {importResults.hasErrors && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-red-800 mb-2">
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">Errors</span>
                  </div>
                  <ul className="text-red-700 text-sm space-y-1">
                    {importResults.details.errorMessages.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between">
                <button
                  onClick={resetImport}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Import More Issues
                </button>
                <button
                  onClick={() => navigate('/issues')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  View Issues
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssuesImportPage;