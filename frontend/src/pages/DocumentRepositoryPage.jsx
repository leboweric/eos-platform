import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { documentsService } from '../services/documentsService';
import { foldersService } from '../services/foldersService';
import { departmentService } from '../services/departmentService';
import FolderTree from '../components/documents/FolderTree';
import CreateFolderDialog from '../components/documents/CreateFolderDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Upload,
  Download,
  Star,
  File,
  Folder,
  Filter,
  Plus,
  Trash2,
  Edit,
  Eye,
  AlertCircle,
  Loader2,
  FileText,
  FileSpreadsheet,
  FileImage,
  Presentation,
  Archive,
  Users,
  Building2,
  Lock
} from 'lucide-react';

const DocumentRepositoryPage = () => {
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [showFavorites, setShowFavorites] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [parentFolderForCreate, setParentFolderForCreate] = useState(null);
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  
  // Upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    visibility: 'company',
    departmentId: '',
    folderId: null,
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);

  useEffect(() => {
    fetchData();
  }, [selectedFolder, selectedDepartment, showFavorites, searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const orgId = user?.organizationId;
      
      if (!orgId) {
        throw new Error('No organization ID found');
      }

      // Fetch documents with filters
      const filters = {
        ...(selectedFolder !== null && { folderId: selectedFolder }),
        ...(selectedDepartment !== 'all' && { department: selectedDepartment }),
        ...(showFavorites && { favorites: 'true' }),
        ...(searchTerm && { search: searchTerm })
      };
      
      const [docsData, foldersData, departmentsData] = await Promise.all([
        documentsService.getDocuments(orgId, filters),
        foldersService.getFolders(orgId),
        departmentService.getDepartments()
      ]);
      
      setDocuments(docsData || []);
      setFolders(foldersData || []);
      setDepartments(departmentsData?.data || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadForm(prev => ({
        ...prev,
        title: prev.title || file.name.replace(/\.[^/.]+$/, '') // Use filename without extension as default title
      }));
    }
  };

  const handleUpload = async (file = uploadFile, formData = uploadForm) => {
    if (!file || !formData.title) {
      setError('Please provide a file and title');
      return;
    }

    try {
      setUploading(true);
      const orgId = user?.organizationId;
      
      await documentsService.uploadDocument(orgId, formData, file);
      
      // Reset form and refresh documents
      setShowUploadDialog(false);
      setUploadFile(null);
      setUploadForm({
        title: '',
        description: '',
        visibility: 'company',
        departmentId: '',
        folderId: selectedFolder,
        tags: []
      });
      setTagInput('');
      
      await fetchData();
    } catch (err) {
      console.error('Upload failed:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Handle single file - show upload dialog
    if (files.length === 1) {
      const file = files[0];
      setUploadFile(file);
      setUploadForm(prev => ({
        ...prev,
        title: file.name.replace(/\.[^/.]+$/, ''),
        folderId: selectedFolder
      }));
      setShowUploadDialog(true);
    } else {
      // Handle multiple files - upload directly with default names
      setUploading(true);
      const orgId = user?.organizationId;
      
      for (const file of files) {
        try {
          const documentData = {
            title: file.name.replace(/\.[^/.]+$/, ''),
            description: '',
            visibility: 'company',
            departmentId: '',
            folderId: selectedFolder,
            tags: []
          };
          
          await documentsService.uploadDocument(orgId, documentData, file);
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err);
          console.error('Error response:', err.response?.data);
          setError(`Failed to upload ${file.name}: ${err.response?.data?.error || err.message}`);
        }
      }
      
      await fetchData();
      setUploading(false);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    if (dragCounter - 1 === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDownload = async (doc) => {
    try {
      const orgId = user?.organizationId;
      await documentsService.downloadDocument(orgId, doc.id, doc.file_name);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download document');
    }
  };

  const handleToggleFavorite = async (doc) => {
    try {
      const orgId = user?.organizationId;
      await documentsService.toggleFavorite(orgId, doc.id);
      await fetchData();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.title}"?`)) {
      return;
    }

    try {
      const orgId = user?.organizationId;
      await documentsService.deleteDocument(orgId, doc.id);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete document:', err);
      setError('Failed to delete document');
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !uploadForm.tags.includes(tagInput.trim())) {
      setUploadForm(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setUploadForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return <File className="h-8 w-8" />;
    
    if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-600" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <Presentation className="h-8 w-8 text-orange-600" />;
    if (mimeType.includes('image')) return <FileImage className="h-8 w-8 text-blue-600" />;
    if (mimeType.includes('zip') || mimeType.includes('archive')) return <Archive className="h-8 w-8 text-purple-600" />;
    
    return <File className="h-8 w-8 text-gray-600" />;
  };

  const getVisibilityIcon = (visibility) => {
    switch (visibility) {
      case 'company':
        return <Building2 className="h-4 w-4" />;
      case 'department':
        return <Users className="h-4 w-4" />;
      case 'private':
        return <Lock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleCreateFolder = async (folderData) => {
    try {
      const orgId = user?.organizationId;
      await foldersService.createFolder(orgId, folderData);
      await fetchData();
      setShowCreateFolderDialog(false);
    } catch (err) {
      console.error('Failed to create folder:', err);
      throw err;
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (!window.confirm(`Are you sure you want to delete "${folder.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const orgId = user?.organizationId;
      await foldersService.deleteFolder(orgId, folder.id);
      if (selectedFolder === folder.id) {
        setSelectedFolder(null);
      }
      await fetchData();
    } catch (err) {
      console.error('Failed to delete folder:', err);
      setError(err.response?.data?.error || 'Failed to delete folder');
    }
  };

  const handleRenameFolder = async (folder, newName) => {
    try {
      const orgId = user?.organizationId;
      await foldersService.updateFolder(orgId, folder.id, newName);
      await fetchData();
      setRenamingFolder(null);
    } catch (err) {
      console.error('Failed to rename folder:', err);
      setError(err.response?.data?.error || 'Failed to rename folder');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div 
      className="space-y-6"
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <Upload className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Drop files to upload</h3>
            <p className="text-gray-600">Release to upload your documents</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Document Repository</h1>
          <p className="text-gray-600 mt-1">
            Central storage for company documents, policies, and resources
          </p>
        </div>
        <Button 
          onClick={() => setShowUploadDialog(true)}
          variant="outline"
          size="sm"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <div className="w-64 space-y-6">
          {/* Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={showFavorites ? "default" : "outline"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setShowFavorites(!showFavorites)}
              >
                <Star className="mr-2 h-4 w-4" />
                Favorites
              </Button>
            </CardContent>
          </Card>

          {/* Folders */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Folders</CardTitle>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    setParentFolderForCreate(null);
                    setShowCreateFolderDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <FolderTree
                folders={folders}
                selectedFolder={selectedFolder}
                onSelectFolder={setSelectedFolder}
                onCreateFolder={(parentId) => {
                  const parent = folders.find(f => f.id === parentId);
                  setParentFolderForCreate(parent);
                  setShowCreateFolderDialog(true);
                }}
                onRenameFolder={(folder) => setRenamingFolder(folder)}
                onDeleteFolder={handleDeleteFolder}
                isAdmin={user?.role === 'admin'}
                userId={user?.id}
              />
            </CardContent>
          </Card>

          {/* Departments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Departments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Documents Grid */}
        <div className="flex-1">
          {/* Upload progress */}
          {uploading && (
            <div className="mb-4">
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Uploading documents...
                </AlertDescription>
              </Alert>
            </div>
          )}
          {documents.length === 0 ? (
            <Card className="border-2 border-dashed hover:border-gray-400 transition-colors">
              <CardContent 
                className="text-center py-16 cursor-pointer"
                onClick={() => document.getElementById('file-input-hidden').click()}
              >
                <input
                  id="file-input-hidden"
                  type="file"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 1) {
                      setUploadFile(files[0]);
                      setUploadForm(prev => ({
                        ...prev,
                        title: files[0].name.replace(/\.[^/.]+$/, ''),
                        folderId: selectedFolder
                      }));
                      setShowUploadDialog(true);
                    } else if (files.length > 1) {
                      handleDrop({ 
                        preventDefault: () => {}, 
                        stopPropagation: () => {},
                        dataTransfer: { files: e.target.files }
                      });
                    }
                  }}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.zip"
                />
                <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {searchTerm || selectedFolder !== null || showFavorites
                    ? 'No documents found'
                    : 'Drop files here or click to upload'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedFolder !== null || showFavorites
                    ? 'Try adjusting your filters'
                    : 'Drag and drop your documents or click to browse'}
                </p>
                <p className="text-sm text-gray-500">
                  Supports PDF, Word, Excel, PowerPoint, images, and more
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Drop zone hint */}
              <Card className="border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors mb-4">
                <CardContent className="py-4">
                  <div className="flex items-center justify-center space-x-3 text-gray-500">
                    <Upload className="h-5 w-5" />
                    <span className="text-sm">Drag and drop files anywhere to upload</span>
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map(doc => (
                <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(doc.mime_type)}
                        <div className="min-w-0">
                          <CardTitle className="text-base line-clamp-1">
                            {doc.title}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFavorite(doc)}
                      >
                        <Star className={`h-4 w-4 ${doc.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {doc.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {doc.description}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      {/* Tags */}
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {doc.tags.map(tag => tag && (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {/* Folder info */}
                      {doc.folder_name && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Folder className="h-3 w-3 mr-1" />
                          <span>{doc.folder_name}</span>
                        </div>
                      )}
                      
                      {/* Metadata */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-2">
                          {getVisibilityIcon(doc.visibility)}
                          <span className="capitalize">{doc.visibility}</span>
                          {doc.department_name && (
                            <>
                              <span>•</span>
                              <span>{doc.department_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Uploader */}
                      <div className="text-xs text-gray-500">
                        By {doc.uploader_name}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center space-x-1 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {(doc.uploaded_by === user?.id || user?.role === 'admin') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(doc)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Add a new document to the repository
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* File Input */}
            <div>
              <Label>File</Label>
              <label className="block mt-1">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.zip"
                />
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors">
                  {uploadFile ? (
                    <div className="flex items-center justify-center space-x-2">
                      {getFileIcon(uploadFile.type)}
                      <div>
                        <p className="font-medium">{uploadFile.name}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(uploadFile.size)}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">Click to choose a file</p>
                      <p className="text-xs text-gray-500 mt-1">Max size: 50MB</p>
                    </>
                  )}
                </div>
              </label>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="Enter document title"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Brief description of the document"
                rows={3}
              />
            </div>

            {/* Current Folder */}
            {selectedFolder && (
              <Alert>
                <Folder className="h-4 w-4" />
                <AlertDescription>
                  This document will be uploaded to: <strong>{folders.find(f => f.id === selectedFolder)?.name || 'Unknown Folder'}</strong>
                </AlertDescription>
              </Alert>
            )}

            {/* Visibility */}
            <div>
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={uploadForm.visibility}
                onValueChange={(value) => setUploadForm({ ...uploadForm, visibility: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">
                    <div className="flex items-center">
                      <Building2 className="mr-2 h-4 w-4" />
                      Company - All users can view
                    </div>
                  </SelectItem>
                  <SelectItem value="department">
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4" />
                      Department - Team members only
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center">
                      <Lock className="mr-2 h-4 w-4" />
                      Private - Only you can view
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department (if visibility is department) */}
            {uploadForm.visibility === 'department' && (
              <div>
                <Label htmlFor="department">Department</Label>
                <Select
                  value={uploadForm.departmentId}
                  onValueChange={(value) => setUploadForm({ ...uploadForm, departmentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Add tags..."
                  className="flex-1"
                />
                <Button type="button" onClick={handleAddTag} size="sm">
                  Add
                </Button>
              </div>
              {uploadForm.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {uploadForm.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleUpload()} disabled={uploading || !uploadFile || !uploadForm.title}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={showCreateFolderDialog}
        onClose={() => {
          setShowCreateFolderDialog(false);
          setParentFolderForCreate(null);
        }}
        onCreateFolder={handleCreateFolder}
        parentFolder={parentFolderForCreate}
        departments={departments}
        isAdmin={user?.role === 'admin'}
        userId={user?.id}
      />

      {/* Rename Folder Dialog */}
      {renamingFolder && (
        <Dialog open={!!renamingFolder} onOpenChange={() => setRenamingFolder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Folder</DialogTitle>
              <DialogDescription>
                Enter a new name for "{renamingFolder.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="folder-name">Folder Name</Label>
                <Input
                  id="folder-name"
                  defaultValue={renamingFolder.name}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleRenameFolder(renamingFolder, e.target.value);
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenamingFolder(null)}>
                Cancel
              </Button>
              <Button onClick={(e) => {
                const input = e.target.closest('.space-y-4').querySelector('input');
                handleRenameFolder(renamingFolder, input.value);
              }}>
                Rename
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DocumentRepositoryPage;