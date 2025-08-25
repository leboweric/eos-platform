import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useTerminology } from '../contexts/TerminologyContext';
import ProcessEditor from '../components/processes/ProcessEditor';
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
  ChevronRight
} from 'lucide-react';
import axios from '../services/axiosConfig';

const ProcessDocumentationPage = () => {
  const { user } = useAuthStore();
  const { labels } = useTerminology();
  const [processes, setProcesses] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [activeTab, setActiveTab] = useState('all');

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
  }, []);

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

  const handleCreateProcess = () => {
    setSelectedProcess(null);
    setShowEditor(true);
  };

  const handleEditProcess = (process) => {
    setSelectedProcess(process);
    setShowEditor(true);
  };

  const handleSaveProcess = async (processData) => {
    try {
      if (selectedProcess) {
        await axios.put(`/api/v1/processes/${selectedProcess.id}`, processData);
      } else {
        await axios.post('/api/v1/processes', processData);
      }
      fetchProcesses();
      setShowEditor(false);
    } catch (error) {
      console.error('Failed to save process:', error);
    }
  };

  const handleAcknowledge = async (processId) => {
    try {
      await axios.post(`/api/v1/processes/${processId}/acknowledge`, {
        training_completed: true
      });
      fetchProcesses();
    } catch (error) {
      console.error('Failed to acknowledge process:', error);
    }
  };

  const handleArchiveProcess = async (processId) => {
    try {
      await axios.put(`/api/v1/processes/${processId}`, {
        status: 'archived',
        archived_at: new Date()
      });
      fetchProcesses();
    } catch (error) {
      console.error('Failed to archive process:', error);
    }
  };

  const handleExportProcess = async (processId) => {
    try {
      const response = await axios.get(`/api/v1/processes/${processId}/export`);
      // TODO: Handle PDF download when implemented
      console.log('Export data:', response.data);
    } catch (error) {
      console.error('Failed to export process:', error);
    }
  };

  // Filter processes
  const filteredProcesses = processes.filter(process => {
    const matchesSearch = process.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          process.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || process.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || process.status === filterStatus;
    
    if (activeTab === 'core' && !process.is_core_process) return false;
    if (activeTab === 'review' && process.next_review_date > new Date()) return false;
    if (activeTab === 'unread' && process.user_acknowledgment) return false;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Get categories from processes
  const categories = [...new Set(processes.map(p => p.category))].filter(Boolean);

  // Calculate stats
  const stats = {
    total: processes.length,
    core: processes.filter(p => p.is_core_process).length,
    needsReview: processes.filter(p => new Date(p.next_review_date) <= new Date()).length,
    unread: processes.filter(p => !p.user_acknowledgment).length,
    avgCompliance: processes.length > 0 
      ? Math.round(processes.reduce((acc, p) => acc + (p.followed_by_all_percentage || 0), 0) / processes.length)
      : 0
  };

  const ProcessCard = ({ process }) => {
    const isOverdue = new Date(process.next_review_date) <= new Date();
    const isExternal = process.storage_type !== 'internal';
    
    return (
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                {process.name}
                {process.is_core_process && (
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {process.category} • {process.step_count || 0} steps
              </CardDescription>
            </div>
            <Badge variant={
              process.status === 'published' ? 'success' :
              process.status === 'draft' ? 'secondary' :
              process.status === 'under_review' ? 'warning' : 'default'
            }>
              {process.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {process.description || 'No description provided'}
          </p>
          
          <div className="space-y-3">
            {/* Owner */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Owner</span>
              <span className="font-medium">{process.owner_name || 'Unassigned'}</span>
            </div>
            
            {/* Compliance */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Followed by All</span>
                <span className="font-medium">{process.followed_by_all_percentage || 0}%</span>
              </div>
              <Progress value={process.followed_by_all_percentage || 0} className="h-2" />
            </div>
            
            {/* Review Status */}
            {isOverdue && (
              <Alert className="py-2">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  Due for review
                </AlertDescription>
              </Alert>
            )}
            
            {/* Acknowledgment Status */}
            {process.user_acknowledgment ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Acknowledged</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span>Not yet read</span>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1"
                onClick={() => handleEditProcess(process)}
              >
                <Edit className="h-3 w-3 mr-1" />
                {isExternal ? 'View' : 'Edit'}
              </Button>
              
              {!process.user_acknowledgment && (
                <Button 
                  size="sm" 
                  variant="default"
                  className="flex-1"
                  onClick={() => handleAcknowledge(process.id)}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Acknowledge
                </Button>
              )}
              
              {isExternal && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => window.open(process.external_url, '_blank')}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ProcessListItem = ({ process }) => {
    const isOverdue = new Date(process.next_review_date) <= new Date();
    
    return (
      <div className="flex items-center justify-between p-4 hover:bg-accent rounded-lg transition-colors">
        <div className="flex items-center gap-4 flex-1">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{process.name}</span>
              {process.is_core_process && (
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              )}
              <Badge variant="outline" className="text-xs">
                {process.category}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {process.step_count || 0} steps • Owner: {process.owner_name || 'Unassigned'}
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-semibold">{process.followed_by_all_percentage || 0}%</p>
              <p className="text-xs text-muted-foreground">FBA</p>
            </div>
            
            <div className="flex items-center gap-2">
              {process.user_acknowledgment ? (
                <Badge variant="success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Read
                </Badge>
              ) : (
                <Badge variant="warning">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Unread
                </Badge>
              )}
              
              {isOverdue && (
                <Badge variant="destructive">
                  <Clock className="h-3 w-3 mr-1" />
                  Review Due
                </Badge>
              )}
            </div>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleEditProcess(process)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">
              {labels?.processes || 'Process Documentation'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Document and track your organization's core processes
            </p>
          </div>
          
          <Button onClick={handleCreateProcess}>
            <Plus className="h-4 w-4 mr-2" />
            New Process
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Processes</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Core Processes</p>
                  <p className="text-2xl font-bold">{stats.core}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Need Review</p>
                  <p className="text-2xl font-bold">{stats.needsReview}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unread</p>
                  <p className="text-2xl font-bold">{stats.unread}</p>
                </div>
                <BookOpen className="h-8 w-8 text-blue-500/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Compliance</p>
                  <p className="text-2xl font-bold">{stats.avgCompliance}%</p>
                </div>
                <Users className="h-8 w-8 text-green-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search processes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
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
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              All Processes {processes.length > 0 && `(${processes.length})`}
            </TabsTrigger>
            <TabsTrigger value="core">
              Core {stats.core > 0 && `(${stats.core})`}
            </TabsTrigger>
            <TabsTrigger value="review">
              Need Review {stats.needsReview > 0 && (
                <Badge variant="destructive" className="ml-2">{stats.needsReview}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread {stats.unread > 0 && (
                <Badge variant="warning" className="ml-2">{stats.unread}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProcesses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No processes found</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchTerm ? 'Try adjusting your search terms' : 'Create your first process to get started'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={handleCreateProcess}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Process
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProcesses.map(process => (
                  <ProcessCard key={process.id} process={process} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {filteredProcesses.map(process => (
                      <ProcessListItem key={process.id} process={process} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Process Editor Dialog */}
        <Dialog open={showEditor} onOpenChange={setShowEditor}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedProcess ? 'Edit Process' : 'Create New Process'}
              </DialogTitle>
              <DialogDescription>
                Define your process steps and tracking requirements
              </DialogDescription>
            </DialogHeader>
            
            <ProcessEditor
              process={selectedProcess}
              templates={templates}
              onSave={handleSaveProcess}
              onCancel={() => setShowEditor(false)}
            />
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default ProcessDocumentationPage;