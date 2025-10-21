import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Download, AlertTriangle, CheckCircle, XCircle, FileText, Users, CheckSquare } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { todosImportService } from '../services/todosImportService';
import { organizationService } from '../services/organizationService';
import axios from '../services/axiosConfig';

const ImportTodosPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teams, setTeams] = useState([]);
  const [organization, setOrganization] = useState(null);
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

  // Load template and organization on component mount
  useEffect(() => {
    loadTemplate();
    fetchOrganization();
  }, []);

  // Load teams when organization is available
  useEffect(() => {
    if (organization?.id) {
      loadTeams();
    }
  }, [organization?.id]);

  const loadTemplate = async () => {
    try {
      const templateData = await todosImportService.getTemplate();
      setTemplate(templateData);
    } catch (error) {
      console.error('Failed to load template:', error);
      setError('Failed to load import template');
    }
  };

  const fetchOrganization = async () => {
    try {
      const orgData = await organizationService.getOrganization();
      setOrganization(orgData);
      console.log('✅ Organization loaded:', orgData);
    } catch (error) {
      console.error('❌ Failed to fetch organization:', error);
    }
  };

  const loadTeams = async () => {
    try {
      const response = await axios.get(`/organizations/${organization.id}/teams`);
      const teams = response.data.data || [];
      setTeams(teams);
      console.log('✅ Teams loaded:', teams);
      
      // Auto-select leadership team if available
      const leadershipTeam = teams.find(team => team.is_leadership_team);
      if (leadershipTeam) {
        setSelectedTeam(leadershipTeam.id);
        console.log('✅ Auto-selected leadership team:', leadershipTeam.name);
      }
    } catch (error) {
      console.error('❌ Failed to load teams:', error);
      setError('Failed to load teams');
    }
  };

  const handleFileSelect = (file) => {
    setError('');
    
    const validation = todosImportService.validateExcelFile(file);
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

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
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
      formData.append('organizationId', organization.id);
      formData.append('teamId', selectedTeam);

      const preview = await todosImportService.previewImport(formData);
      setPreviewData(preview);
      setCurrentStep(2);
      
      // Initialize user mappings
      const mappings = {};
      if (preview.todos) {
        preview.todos.forEach(todo => {
          if (todo.owner_name && !todo.matched_user_id) {
            mappings[todo.owner_name] = '';
          }
        });
      }
      setUserMappings(mappings);
      
    } catch (error) {
      console.error('Preview failed:', error);
      setError(error.message || 'Failed to preview import');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !selectedTeam) {
      setError('Missing required data');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('organizationId', organization.id);
      formData.append('teamId', selectedTeam);
      formData.append('conflictStrategy', conflictStrategy);
      formData.append('userMappings', JSON.stringify(userMappings));

      const results = await todosImportService.executeImport(formData);
      setImportResults(results);
      setCurrentStep(3);
      
    } catch (error) {
      console.error('Import failed:', error);
      setError(error.message || 'Failed to execute import');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setCurrentStep(1);
    setSelectedFile(null);
    setSelectedTeam('');
    setPreviewData(null);
    setImportResults(null);
    setUserMappings({});
    setError('');
  };

  const selectedTeamName = teams.find(t => t.id === selectedTeam)?.name || 'Unknown Team';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/tools')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Tools
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-teal-100 rounded-lg">
              <CheckSquare className="h-8 w-8 text-teal-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Import To-Dos</h1>
              <p className="text-gray-600">Import tasks and to-do items from Ninety.io or other systems</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between max-w-md">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-teal-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 1 ? 'bg-teal-600 text-white' : 'bg-gray-200'
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Upload</span>
            </div>
            <div className={`w-16 h-0.5 ${currentStep >= 2 ? 'bg-teal-600' : 'bg-gray-200'}`} />
            <div className={`flex items-center ${currentStep >= 2 ? 'text-teal-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 2 ? 'bg-teal-600 text-white' : 'bg-gray-200'
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Preview</span>
            </div>
            <div className={`w-16 h-0.5 ${currentStep >= 3 ? 'bg-teal-600' : 'bg-gray-200'}`} />
            <div className={`flex items-center ${currentStep >= 3 ? 'text-teal-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 3 ? 'bg-teal-600 text-white' : 'bg-gray-200'
              }`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">Complete</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Step 1: Upload */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Team Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-gray-600" />
                Select Target Team
              </h2>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Team (Required)
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                >
                  <option value="">Select a team...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} {team.is_leadership_team ? '(Leadership Team)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500">
                  Choose which team the imported to-dos will belong to.
                </p>
              </div>
            </div>

            {/* File Upload */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Upload className="h-5 w-5 mr-2 text-gray-600" />
                Upload File
              </h2>
              
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver
                    ? 'border-teal-400 bg-teal-50'
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
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
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
                        Drop your Excel file here, or{' '}
                        <label className="text-teal-600 hover:text-teal-700 cursor-pointer">
                          browse
                          <input
                            type="file"
                            className="hidden"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileInputChange}
                          />
                        </label>
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Supports .xlsx, .xls, and .csv files (max 10MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Template Download */}
            {template && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-blue-900">Template Available</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Download our template to ensure your data imports correctly.
                    </p>
                    <button
                      onClick={() => window.open(template.downloadUrl, '_blank')}
                      className="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download Template
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Continue Button */}
            <div className="flex justify-end">
              <button
                onClick={handlePreview}
                disabled={!selectedFile || !selectedTeam || loading}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  'Preview Import'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {currentStep === 2 && previewData && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Preview</h2>
              
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">{previewData.todos?.length || 0}</div>
                  <div className="text-sm text-gray-600">Total To-Dos</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">{selectedTeamName}</div>
                  <div className="text-sm text-gray-600">Target Team</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">{selectedFile?.name}</div>
                  <div className="text-sm text-gray-600">Source File</div>
                </div>
              </div>

              {/* User Mappings */}
              {Object.keys(userMappings).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-medium text-gray-900 mb-3">User Assignments</h3>
                  <div className="space-y-3">
                    {Object.keys(userMappings).map((ownerName) => (
                      <div key={ownerName} className="flex items-center space-x-3">
                        <div className="flex-1">
                          <span className="text-sm text-gray-700">"{ownerName}" → </span>
                        </div>
                        <select
                          value={userMappings[ownerName]}
                          onChange={(e) => setUserMappings(prev => ({
                            ...prev,
                            [ownerName]: e.target.value
                          }))}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          <option value="">Auto-assign to importer</option>
                          {previewData.availableUsers?.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.full_name} ({user.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Unmatched users will be auto-assigned to you (the importer).
                  </p>
                </div>
              )}

              {/* Preview Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Owner
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.todos?.slice(0, 10).map((todo, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {todo.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {todo.owner_name || 'Unassigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {todo.due_date || 'No date'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            todo.status === 'complete' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {todo.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.todos?.length > 10 && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Showing first 10 of {previewData.todos.length} to-dos
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importing...
                  </>
                ) : (
                  'Import To-Dos'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {currentStep === 3 && importResults && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                Import Complete
              </h2>
              
              {/* Results Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-2xl font-bold text-green-900">{importResults.created || 0}</div>
                  <div className="text-sm text-green-700">Created</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-2xl font-bold text-blue-900">{importResults.updated || 0}</div>
                  <div className="text-sm text-blue-700">Updated</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-900">{importResults.skipped || 0}</div>
                  <div className="text-sm text-yellow-700">Skipped</div>
                </div>
              </div>

              {/* Errors */}
              {importResults.errors && importResults.errors.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-md font-medium text-red-900 mb-2">Errors</h3>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    {importResults.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-700 mb-1">
                        {error.todo ? `"${error.todo}": ` : ''}{error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-600">
                Your to-dos have been imported successfully. You can now view them in the To-Dos section.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <button
                onClick={handleStartOver}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Import More
              </button>
              <button
                onClick={() => navigate('/todos')}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                View To-Dos
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportTodosPage;