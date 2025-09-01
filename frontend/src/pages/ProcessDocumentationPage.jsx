import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useTerminology } from '../contexts/TerminologyContext';
import { organizationService } from '../services/organizationService';
import { getOrgTheme } from '../utils/themeUtils';
import ProcessWorkflowEditor from '../components/processes/ProcessWorkflowEditor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Plus,
  FileText,
  Search,
  Filter,
  ExternalLink,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  Folder,
  BookOpen,
  Edit,
  Trash2,
  Archive,
  Star,
  ChevronRight,
  Sparkles,
  Activity,
  Target,
  Grid,
  List,
  Eye,
  CheckSquare,
  Loader2
} from 'lucide-react';
import axios from '../services/axiosConfig';
import { format } from 'date-fns';

const ProcessDocumentationPage = () => {
  const { user } = useAuthStore();
  const { labels } = useTerminology();
  const [processes, setProcesses] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [processToDelete, setProcessToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [activeTab, setActiveTab] = useState('all');
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });

  // Terminology mapping
  const processTerms = {
    eos: 'Core Process',
    scaling_up: 'Process Map',
    '4dx': 'Standard Work',
    okr: 'Playbook',
    custom: 'Process Document'
  };

  useEffect(() => {
    fetchProcesses();
    fetchTemplates();
    fetchTeamMembers();
    fetchOrganizationTheme();
    
    // Listen for theme changes
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  const fetchOrganizationTheme = async () => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const savedTheme = getOrgTheme(orgId);
      if (savedTheme) {
        setThemeColors(savedTheme);
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
    }
  };

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/processes');
      setProcesses(response.data);
    } catch (error) {
      console.error('Failed to fetch processes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/v1/processes/templates/list');
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const response = await axios.get(`/api/v1/organizations/${orgId}/users`);
      setTeamMembers(response.data);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      // Fallback to current user
      setTeamMembers([{ id: user?.id, name: user?.name || user?.email }]);
    }
  };

  const handleCreateProcess = () => {
    setSelectedProcess(null);
    setShowEditor(true);
  };

  const handleEditProcess = (process) => {
    setSelectedProcess(process);
    setShowEditor(true);
  };

  const handleDeleteProcess = async () => {
    if (!processToDelete) return;
    
    try {
      await axios.delete(`/api/v1/processes/${processToDelete.id}`);
      await fetchProcesses();
      setShowDeleteDialog(false);
      setProcessToDelete(null);
    } catch (error) {
      console.error('Failed to delete process:', error);
    }
  };

  const handleSaveProcess = async (processData) => {
    try {
      if (selectedProcess) {
        await axios.put(`/api/v1/processes/${selectedProcess.id}`, processData);
      } else {
        await axios.post('/api/v1/processes', processData);
      }
      setShowEditor(false);
      setSelectedProcess(null);
      await fetchProcesses();
    } catch (error) {
      console.error('Failed to save process:', error);
    }
  };

  const handleAcknowledgeProcess = async (processId) => {
    try {
      await axios.post(`/api/v1/processes/${processId}/acknowledge`);
      await fetchProcesses();
    } catch (error) {
      console.error('Failed to acknowledge process:', error);
    }
  };

  // Filter processes based on search and filters
  const getFilteredProcesses = () => {
    let filtered = processes;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(p => p.category === filterCategory);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    // Tab filter
    switch (activeTab) {
      case 'core':
        filtered = filtered.filter(p => p.is_core_process);
        break;
      case 'review':
        filtered = filtered.filter(p => {
          if (!p.next_review_date) return false;
          const reviewDate = new Date(p.next_review_date);
          const today = new Date();
          return reviewDate <= today;
        });
        break;
      case 'unread':
        filtered = filtered.filter(p => !p.user_acknowledgment);
        break;
    }

    return filtered;
  };

  const filteredProcesses = getFilteredProcesses();

  // Calculate stats
  const stats = {
    total: processes.length,
    core: processes.filter(p => p.is_core_process).length,
    needsReview: processes.filter(p => {
      if (!p.next_review_date) return false;
      const reviewDate = new Date(p.next_review_date);
      const today = new Date();
      return reviewDate <= today;
    }).length,
    unread: processes.filter(p => !p.user_acknowledgment).length,
    compliance: processes.length > 0 
      ? Math.round(processes.reduce((sum, p) => sum + (p.followed_by_all_percentage || 0), 0) / processes.length)
      : 0
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show editor in full screen mode
  if (showEditor) {
    return (
      <ProcessWorkflowEditor
        process={selectedProcess}
        onSave={handleSaveProcess}
        onCancel={() => {
          setShowEditor(false);
          setSelectedProcess(null);
        }}
        templates={templates}
        teamMembers={teamMembers}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
                   style={{
                     background: `linear-gradient(135deg, ${themeColors.primary}15 0%, ${themeColors.secondary}15 100%)`,
                     color: themeColors.primary
                   }}>
                <Activity className="h-4 w-4" />
                PROCESS DOCUMENTATION
              </div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                {labels.processes_label || 'Processes'}
              </h1>
              <p className="text-lg text-slate-600">
                Document, standardize, and optimize your business processes
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                variant="outline"
                className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm"
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
              <Button 
                onClick={handleCreateProcess}
                className="text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                style={{ 
                  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Process
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: themeColors.primary }}>
                    {stats.total}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-slate-300" />
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Core</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: themeColors.primary }}>
                    {stats.core}
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-400" />
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Need Review</p>
                  <p className="text-2xl font-bold mt-1 text-orange-600">
                    {stats.needsReview}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-400" />
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Unread</p>
                  <p className="text-2xl font-bold mt-1 text-blue-600">
                    {stats.unread}
                  </p>
                </div>
                <Eye className="h-8 w-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Compliance</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">
                    {stats.compliance}%
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search processes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Sales & Marketing">Sales & Marketing</SelectItem>
                <SelectItem value="Operations">Operations</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Human Resources">Human Resources</SelectItem>
                <SelectItem value="Customer Success">Customer Success</SelectItem>
                <SelectItem value="Technology">Technology</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs and Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white/80 backdrop-blur-sm border border-white/50">
            <TabsTrigger value="all">All Processes</TabsTrigger>
            <TabsTrigger value="core">Core Processes</TabsTrigger>
            <TabsTrigger value="review">Need Review</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredProcesses.length === 0 ? (
              <div className="text-center py-12 px-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No processes found
                </h3>
                <p className="text-slate-600 mb-6">
                  {searchTerm || filterCategory !== 'all' || filterStatus !== 'all' 
                    ? 'Try adjusting your filters'
                    : 'Get started by creating your first process'}
                </p>
                {!searchTerm && filterCategory === 'all' && filterStatus === 'all' && (
                  <Button
                    onClick={handleCreateProcess}
                    className="text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    style={{ 
                      background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Process
                  </Button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProcesses.map((process) => (
                  <Card key={process.id} className="bg-white/80 backdrop-blur-sm border-white/50 shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-1">
                            {process.name}
                          </CardTitle>
                          <CardDescription className="line-clamp-2 mt-1">
                            {process.description}
                          </CardDescription>
                        </div>
                        {process.is_core_process && (
                          <Star className="h-5 w-5 text-yellow-400 fill-current" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {process.category}
                          </Badge>
                          <Badge 
                            variant={process.status === 'published' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {process.status}
                          </Badge>
                          {process.step_count > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {process.step_count} steps
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm text-slate-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            <span>{process.owner_name || 'Unassigned'}</span>
                          </div>
                          {process.next_review_date && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>Review: {format(new Date(process.next_review_date), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                        </div>

                        {process.followed_by_all_percentage !== null && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-600">Compliance</span>
                              <span className="font-medium">{process.followed_by_all_percentage}%</span>
                            </div>
                            <Progress value={process.followed_by_all_percentage} className="h-1.5" />
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditProcess(process);
                            }}
                            className="flex-1"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          {!process.user_acknowledgment && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcknowledgeProcess(process.id);
                              }}
                              className="flex-1"
                              style={{ 
                                background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`,
                              }}
                            >
                              <CheckSquare className="h-3 w-3 mr-1" />
                              Acknowledge
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProcessToDelete(process);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="text-left p-4 font-medium text-slate-700">Process Name</th>
                      <th className="text-left p-4 font-medium text-slate-700">Category</th>
                      <th className="text-left p-4 font-medium text-slate-700">Owner</th>
                      <th className="text-left p-4 font-medium text-slate-700">Status</th>
                      <th className="text-left p-4 font-medium text-slate-700">Steps</th>
                      <th className="text-left p-4 font-medium text-slate-700">Compliance</th>
                      <th className="text-left p-4 font-medium text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProcesses.map((process) => (
                      <tr key={process.id} className="border-t border-slate-200 hover:bg-slate-50/50">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {process.is_core_process && (
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            )}
                            <span className="font-medium">{process.name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-xs">
                            {process.category}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {process.owner_name || 'Unassigned'}
                        </td>
                        <td className="p-4">
                          <Badge 
                            variant={process.status === 'published' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {process.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {process.step_count || 0}
                        </td>
                        <td className="p-4">
                          {process.followed_by_all_percentage !== null && (
                            <div className="flex items-center gap-2">
                              <Progress value={process.followed_by_all_percentage} className="h-1.5 w-20" />
                              <span className="text-xs font-medium">{process.followed_by_all_percentage}%</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditProcess(process)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            {!process.user_acknowledgment && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleAcknowledgeProcess(process.id)}
                                style={{ color: themeColors.primary }}
                              >
                                <CheckSquare className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setProcessToDelete(process);
                                setShowDeleteDialog(true);
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Process</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{processToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteProcess}
            >
              Delete Process
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProcessDocumentationPage;