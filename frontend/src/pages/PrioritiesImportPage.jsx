import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Download, ArrowLeft, AlertCircle, CheckCircle, FileText, Users, Target } from 'lucide-react';
import { prioritiesImportService } from '../services/prioritiesImportService';
import { organizationService } from '../services/organizationService';
import { useAuthStore } from '../stores/authStore';
import { useDepartment } from '../contexts/DepartmentContext';
import OwnerMappingSection from '../components/import/OwnerMappingSection';
import RocksPreviewTable from '../components/import/RocksPreviewTable';
import ImportSummary from '../components/import/ImportSummary';

const PrioritiesImportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { selectedDepartment } = useDepartment();
  
  // UI State
  const [step, setStep] = useState('upload'); // upload, preview, mapping, execute, complete
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [organization, setOrganization] = useState(null);
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Import Data State
  const [template, setTemplate] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [assigneeMappings, setAssigneeMappings] = useState({});
  const [conflictStrategy, setConflictStrategy] = useState('merge');
  const [importResults, setImportResults] = useState(null);

  // Load template and organization on mount
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const templateData = await prioritiesImportService.getTemplate();
        setTemplate(templateData);
      } catch (err) {
        console.error('Failed to load template:', err);
        setError('Failed to load import template');
      }
    };
    
    const fetchOrganization = async () => {
      try {
        const orgData = await organizationService.getOrganization();
        setOrganization(orgData);
      } catch (error) {
        console.error('Failed to fetch organization:', error);
      }
    };
    
    loadTemplate();
    fetchOrganization();
  }, []);

  // File upload handlers
  const handleFileSelect = (file) => {
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
      setError('File size must be less than 10MB');
      return;
    }
    
    setSelectedFile(file);
    setError('');
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Preview the import
  const handlePreview = async () => {
    if (!selectedFile || !selectedDepartment || !organization) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('organizationId', organization.id);
      formData.append('teamId', selectedDepartment.id);
      
      const preview = await prioritiesImportService.previewImport(formData);
      setPreviewData(preview);
      
      // Initialize assignee mappings
      const mappings = {};
      preview.assigneeMappings && Object.keys(preview.assigneeMappings).forEach(name => {
        mappings[name] = preview.assigneeMappings[name];
      });
      setAssigneeMappings(mappings);
      
      setStep('preview');
    } catch (err) {
      console.error('Preview failed:', err);
      setError(err.message || 'Failed to preview import');
    } finally {
      setIsLoading(false);
    }
  };

  // Execute the import
  const handleExecute = async () => {
    if (!selectedFile || !selectedDepartment || !organization) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('organizationId', organization.id);
      formData.append('teamId', selectedDepartment.id);
      formData.append('conflictStrategy', conflictStrategy);
      formData.append('assigneeMappings', JSON.stringify(assigneeMappings));
      
      const results = await prioritiesImportService.executeImport(formData);
      setImportResults(results);
      setStep('complete');
      setSuccess('Import completed successfully!');
    } catch (err) {
      console.error('Import failed:', err);
      setError(err.message || 'Failed to execute import');
    } finally {
      setIsLoading(false);
    }
  };

  // Download template
  const handleDownloadTemplate = () => {
    if (!template) return;
    
    const csvContent = [
      // Headers
      [...template.required_columns, ...template.optional_columns].join(','),
      // Example data
      ...template.example_data.map(row => 
        [...template.required_columns, ...template.optional_columns]
          .map(col => `"${row[col] || ''}"`)
          .join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'priorities-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const stepTitles = {
    upload: 'Upload CSV File',
    preview: 'Preview Import',
    mapping: 'Map Assignees',
    execute: 'Execute Import',
    complete: 'Import Complete'
  };

  const stepDescriptions = {
    upload: 'Select your Ninety.io priorities export CSV file',
    preview: 'Review the priorities that will be imported',
    mapping: 'Map assignee names to users in your organization',
    execute: 'Configure import settings and execute',
    complete: 'Review import results and next steps'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => navigate('/priorities')}
                className="p-2 rounded-lg border border-gray-200 bg-white/80 backdrop-blur-sm hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Import Priorities</h1>
                <p className="text-gray-600 mt-1">Import your priorities from Ninety.io</p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-4 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50">
              {Object.entries(stepTitles).map(([stepKey, title], index) => {
                const isActive = stepKey === step;
                const isCompleted = Object.keys(stepTitles).indexOf(step) > index;
                
                return (
                  <React.Fragment key={stepKey}>
                    {index > 0 && (
                      <div className={`h-0.5 w-8 ${isCompleted ? 'bg-blue-500' : 'bg-gray-200'}`} />
                    )}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-700' : 
                      isCompleted ? 'bg-green-50 text-green-700' : 
                      'text-gray-500'
                    }`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        isActive ? 'bg-blue-500 text-white' : 
                        isCompleted ? 'bg-green-500 text-white' : 
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                      </div>
                      <span className="text-sm font-medium">{title}</span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-800">Error</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-green-800">Success</h3>
                <p className="text-green-700 text-sm mt-1">{success}</p>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">{stepTitles[step]}</h2>
              <p className="text-gray-600 mt-1">{stepDescriptions[step]}</p>
            </div>

            <div className="p-6">
              {/* Step 1: Upload */}
              {step === 'upload' && (
                <div className="space-y-6">
                  {/* Template Download */}
                  {template && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-medium text-blue-800">Download Template</h3>
                          <p className="text-blue-700 text-sm mt-1">
                            Download our CSV template to see the required format and example data.
                          </p>
                          <button
                            onClick={handleDownloadTemplate}
                            className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            Download Template
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* File Upload */}
                  <div className="space-y-4">
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        dragActive
                          ? 'border-blue-500 bg-blue-50'
                          : selectedFile
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      <div className="space-y-4">
                        <Upload className={`h-12 w-12 mx-auto ${
                          selectedFile ? 'text-green-500' : 'text-gray-400'
                        }`} />
                        {selectedFile ? (
                          <div>
                            <p className="text-green-700 font-medium">{selectedFile.name}</p>
                            <p className="text-green-600 text-sm">
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-gray-600 font-medium">
                              Drag and drop your CSV file here, or click to browse
                            </p>
                            <p className="text-gray-500 text-sm">
                              Maximum file size: 10MB
                            </p>
                          </div>
                        )}
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleFileInputChange}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                        >
                          <Upload className="h-4 w-4" />
                          Choose File
                        </label>
                      </div>
                    </div>

                    {selectedFile && (
                      <div className="flex justify-end">
                        <button
                          onClick={handlePreview}
                          disabled={isLoading}
                          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isLoading ? 'Analyzing...' : 'Preview Import'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Template Info */}
                  {template && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3">CSV Format Requirements</h3>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Required Columns</h4>
                          <ul className="space-y-1 text-gray-600">
                            {template.required_columns.map(col => (
                              <li key={col} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                {col}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Optional Columns</h4>
                          <ul className="space-y-1 text-gray-600">
                            {template.optional_columns.slice(0, 6).map(col => (
                              <li key={col} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                {col}
                              </li>
                            ))}
                            {template.optional_columns.length > 6 && (
                              <li className="text-gray-500 italic">
                                +{template.optional_columns.length - 6} more...
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Preview */}
              {step === 'preview' && previewData && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <Target className="h-8 w-8 text-blue-500" />
                        <div>
                          <div className="text-2xl font-bold text-blue-700">
                            {previewData.summary.totalPriorities}
                          </div>
                          <div className="text-blue-600 text-sm">Total Priorities</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                        <div>
                          <div className="text-2xl font-bold text-green-700">
                            {previewData.summary.newPriorities}
                          </div>
                          <div className="text-green-600 text-sm">New Priorities</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-8 w-8 text-orange-500" />
                        <div>
                          <div className="text-2xl font-bold text-orange-700">
                            {previewData.summary.existingPriorities}
                          </div>
                          <div className="text-orange-600 text-sm">Conflicts</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <Users className="h-8 w-8 text-purple-500" />
                        <div>
                          <div className="text-2xl font-bold text-purple-700">
                            {previewData.summary.unmappedAssignees}
                          </div>
                          <div className="text-purple-600 text-sm">Unmapped Users</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {previewData.warnings && previewData.warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium text-yellow-800">Warnings</h3>
                          <ul className="text-yellow-700 text-sm mt-1 space-y-1">
                            {previewData.warnings.map((warning, index) => (
                              <li key={index}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview Table */}
                  <RocksPreviewTable priorities={previewData.priorities} />

                  {/* Assignee Mapping */}
                  {previewData.unmappedAssignees && previewData.unmappedAssignees.length > 0 && (
                    <OwnerMappingSection
                      unmappedAssignees={previewData.unmappedAssignees}
                      availableUsers={previewData.availableUsers}
                      mappings={assigneeMappings}
                      onMappingChange={setAssigneeMappings}
                    />
                  )}

                  {/* Conflict Strategy */}
                  {previewData.conflicts && previewData.conflicts.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3">
                        Conflict Resolution Strategy
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            id="merge"
                            name="conflictStrategy"
                            value="merge"
                            checked={conflictStrategy === 'merge'}
                            onChange={(e) => setConflictStrategy(e.target.value)}
                            className="text-blue-600"
                          />
                          <label htmlFor="merge" className="text-sm">
                            <span className="font-medium">Merge:</span> Update existing priorities with new data
                          </label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            id="update"
                            name="conflictStrategy"
                            value="update"
                            checked={conflictStrategy === 'update'}
                            onChange={(e) => setConflictStrategy(e.target.value)}
                            className="text-blue-600"
                          />
                          <label htmlFor="update" className="text-sm">
                            <span className="font-medium">Update:</span> Replace existing priorities completely
                          </label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            id="skip"
                            name="conflictStrategy"
                            value="skip"
                            checked={conflictStrategy === 'skip'}
                            onChange={(e) => setConflictStrategy(e.target.value)}
                            className="text-blue-600"
                          />
                          <label htmlFor="skip" className="text-sm">
                            <span className="font-medium">Skip:</span> Keep existing priorities, only import new ones
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-between">
                    <button
                      onClick={() => setStep('upload')}
                      className="px-4 py-2 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleExecute}
                      disabled={isLoading}
                      className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? 'Importing...' : 'Execute Import'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Complete */}
              {step === 'complete' && importResults && (
                <div className="space-y-6">
                  <ImportSummary results={importResults} />
                  
                  <div className="flex justify-between">
                    <button
                      onClick={() => {
                        setStep('upload');
                        setSelectedFile(null);
                        setPreviewData(null);
                        setImportResults(null);
                        setError('');
                        setSuccess('');
                      }}
                      className="px-4 py-2 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Import Another File
                    </button>
                    <button
                      onClick={() => navigate('/priorities')}
                      className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Priorities
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
};

export default PrioritiesImportPage;