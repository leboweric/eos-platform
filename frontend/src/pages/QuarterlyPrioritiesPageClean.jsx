import { useState, useEffect, Component } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { quarterlyPrioritiesService } from '../services/quarterlyPrioritiesService';
import { organizationService } from '../services/organizationService';
import { issuesService } from '../services/issuesService';
import { getRevenueLabel, getRevenueLabelWithSuffix } from '../utils/revenueUtils';
import { useDepartment } from '../contexts/DepartmentContext';
import PriorityCardClean from '../components/priorities/PriorityCardClean';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckSquare, 
  Plus, 
  Calendar,
  User,
  Target,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Building2,
  DollarSign,
  BarChart,
  Save,
  X,
  Users,
  Loader2,
  Archive,
  ChevronRight,
  Eye,
  EyeOff,
  Paperclip,
  Download,
  Brain
} from 'lucide-react';
import { format, addMonths, startOfQuarter, endOfQuarter } from 'date-fns';

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('QuarterlyPriorities Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>An error occurred loading quarterly priorities.</p>
                <p className="text-sm">Error: {this.state.error?.message}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  size="sm"
                  variant="outline"
                >
                  Refresh Page
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

const QuarterlyPrioritiesPageClean = () => {
  const navigate = useNavigate();
  const { user, isOnLeadershipTeam } = useAuthStore();
  const { selectedDepartment, loading: departmentLoading } = useDepartment();
  const [showArchived, setShowArchived] = useState(false);
  const [showAddPriority, setShowAddPriority] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [organization, setOrganization] = useState(null);
  
  // State for priorities data
  const [companyPriorities, setCompanyPriorities] = useState([]);
  const [teamMemberPriorities, setTeamMemberPriorities] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  const [archivedQuarters, setArchivedQuarters] = useState({});
  
  // Expansion states for collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    companyPriorities: false,
    individualPriorities: {}
  });
  
  // Editing states
  const [editingPriority, setEditingPriority] = useState(null);
  const [editingMilestone, setEditingMilestone] = useState(null);
  
  // Form states
  const [priorityForm, setPriorityForm] = useState({
    title: '',
    description: '',
    ownerId: '',
    dueDate: '',
    isCompanyPriority: false,
    milestones: []
  });
  const [newMilestoneForm, setNewMilestoneForm] = useState({
    title: '',
    dueDate: ''
  });

  // Fetch data when department or archive view changes
  useEffect(() => {
    if (selectedDepartment) {
      fetchQuarterlyData();
    }
    fetchOrganization();
  }, [selectedDepartment, showArchived]);

  const fetchQuarterlyData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get organization and team IDs from user context
      const orgId = user?.organizationId;
      const teamId = selectedDepartment?.id;
      
      if (!orgId) {
        throw new Error('No organization ID found');
      }
      
      if (!teamId) {
        throw new Error('No department selected');
      }
      
      // Fetch either active or archived priorities
      if (showArchived) {
        const archivedData = await quarterlyPrioritiesService.getArchivedPriorities(orgId, teamId);
        setArchivedQuarters(archivedData || {});
        // Clear current priorities data when viewing archived
        setCompanyPriorities([]);
        setTeamMemberPriorities({});
        setTeamMembers([]);
      } else {
        // Use the selected department's ID as the teamId for the API call
        const data = await quarterlyPrioritiesService.getCurrentPriorities(orgId, teamId);
        
        setCompanyPriorities(data.companyPriorities || []);
        setTeamMemberPriorities(data.teamMemberPriorities || {});
        setTeamMembers(data.teamMembers || []);
        setArchivedQuarters({});
      }
    } catch (err) {
      console.error('Failed to fetch quarterly data:', err);
      setError('Failed to load data. Please try again later.');
      
      // Set empty data on error
      setCompanyPriorities([]);
      setTeamMembers([]);
      setTeamMemberPriorities({});
    } finally {
      setLoading(false);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete':
        return 'bg-green-500';
      case 'on-track':
        return 'bg-blue-500';
      case 'off-track':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusBorderColor = (status) => {
    switch (status) {
      case 'complete':
        return 'border-l-green-500';
      case 'on-track':
        return 'border-l-blue-500';
      case 'off-track':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-300';
    }
  };

  const getStatusDotColor = (status) => {
    switch (status) {
      case 'complete':
        return 'bg-green-500';
      case 'on-track':
        return 'bg-blue-500';
      case 'off-track':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4" />;
      case 'on-track':
        return <TrendingUp className="h-4 w-4" />;
      case 'off-track':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'complete':
        return 'default';
      case 'on-track':
        return 'success';
      case 'off-track':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getUserInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date set';
    try {
      // If the date string is already in YYYY-MM-DD format, parse it as local date
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return format(date, 'MMM d, yyyy');
      }
      
      // For ISO date strings (with time), extract just the date part
      if (typeof dateString === 'string' && dateString.includes('T')) {
        const datePart = dateString.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return format(date, 'MMM d, yyyy');
      }
      
      // For other date formats, parse and use local date
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      // Use the local date to avoid timezone issues
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return format(localDate, 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid date';
    }
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return 0;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      
      let due;
      // If the date string is in YYYY-MM-DD format, parse it as local date
      if (typeof dueDate === 'string' && dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dueDate.split('-').map(Number);
        due = new Date(year, month - 1, day);
      } else {
        due = new Date(dueDate);
        // Reset to start of day in local timezone
        due = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      }
      
      if (isNaN(due.getTime())) {
        return 0;
      }
      
      const diffTime = due - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      console.error('Error calculating days until due:', dueDate, error);
      return 0;
    }
  };

  const formatRevenue = (value) => {
    if (!value || value === 0) return '$0';
    
    // If value is >= 1 million, show in millions
    if (value >= 1000000) {
      const millions = value / 1000000;
      // Show up to 3 decimal places, but remove trailing zeros
      return `$${millions.toFixed(3).replace(/\.?0+$/, '')}M`;
    }
    
    // If value is >= 1 thousand, show in thousands
    if (value >= 1000) {
      const thousands = value / 1000;
      // Show up to 1 decimal place, but remove trailing zeros
      return `$${thousands.toFixed(1).replace(/\.0$/, '')}K`;
    }
    
    // Otherwise show the full value
    return `$${value.toFixed(0)}`;
  };

  const handleUpdatePriority = async (priorityId, updates) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = selectedDepartment?.id;
      
      if (!orgId || !teamId) {
        throw new Error('Organization or department not found');
      }
      
      await quarterlyPrioritiesService.updatePriority(orgId, teamId, priorityId, updates);
      
      // Refresh data
      await fetchQuarterlyData();
      setEditingPriority(null);
    } catch (err) {
      console.error('Failed to update priority:', err);
      setError('Failed to save changes: ' + err.message);
    }
  };

  const handleUpdateMilestone = async (priorityId, milestoneId, completed) => {
    try {
      const orgId = user?.organizationId;
      const teamId = selectedDepartment?.id;
      
      if (!orgId || !teamId) {
        throw new Error('Organization or department not found');
      }
      
      await quarterlyPrioritiesService.updateMilestone(orgId, teamId, priorityId, milestoneId, { completed });
      
      // Refresh data to get updated progress
      await fetchQuarterlyData();
    } catch (err) {
      console.error('Failed to update milestone:', err);
      if (err.status === 404) {
        // Milestone doesn't exist, refresh to remove from UI
        console.warn(`Milestone ${milestoneId} not found, refreshing data`);
        await fetchQuarterlyData();
      } else {
        setError('Failed to update milestone');
      }
    }
  };

  const handleCreateMilestone = async (priorityId, milestoneData) => {
    try {
      const orgId = user?.organizationId;
      const teamId = selectedDepartment?.id;
      
      if (!orgId || !teamId) {
        throw new Error('Organization or department not found');
      }
      
      await quarterlyPrioritiesService.createMilestone(orgId, teamId, priorityId, milestoneData);
      
      // Refresh data
      await fetchQuarterlyData();
    } catch (err) {
      console.error('Failed to create milestone:', err);
      setError('Failed to create milestone');
    }
  };

  const handleEditMilestone = async (priorityId, milestoneId, updates) => {
    try {
      const orgId = user?.organizationId;
      const teamId = selectedDepartment?.id;
      
      if (!orgId || !teamId) {
        throw new Error('Organization or department not found');
      }
      
      await quarterlyPrioritiesService.updateMilestone(orgId, teamId, priorityId, milestoneId, updates);
      
      // Refresh data
      await fetchQuarterlyData();
    } catch (err) {
      console.error('Failed to update milestone:', err);
      if (err.status === 404) {
        // Milestone doesn't exist, refresh to remove from UI
        console.warn(`Milestone ${milestoneId} not found, refreshing data`);
        await fetchQuarterlyData();
      } else {
        setError('Failed to update milestone');
      }
    }
  };

  const handleDeleteMilestone = async (priorityId, milestoneId) => {
    try {
      const orgId = user?.organizationId;
      const teamId = selectedDepartment?.id;
      
      if (!orgId || !teamId) {
        throw new Error('Organization or department not found');
      }
      
      await quarterlyPrioritiesService.deleteMilestone(orgId, teamId, priorityId, milestoneId);
      
      // Refresh data
      await fetchQuarterlyData();
    } catch (err) {
      console.error('Failed to delete milestone:', err);
      // For delete, we don't show error for 404 since the milestone is already gone
      if (err.message && !err.message.includes('not found')) {
        setError('Failed to delete milestone');
      } else {
        // Still refresh to ensure UI is in sync
        await fetchQuarterlyData();
      }
    }
  };

  const handleAddUpdate = async (priorityId, updateText, statusChange = null) => {
    try {
      const orgId = user?.organizationId;
      const teamId = selectedDepartment?.id;
      
      if (!orgId || !teamId) {
        throw new Error('Organization or department not found');
      }
      
      await quarterlyPrioritiesService.addPriorityUpdate(orgId, teamId, priorityId, updateText, statusChange);
      
      // Refresh data to show new update
      await fetchQuarterlyData();
    } catch (err) {
      console.error('Failed to add update:', err);
      setError('Failed to add update');
    }
  };

  const handleCreatePriority = async () => {
    try {
      // Get current quarter and year
      const now = new Date();
      const currentQuarter = Math.floor((now.getMonth() / 3)) + 1;
      const currentYear = now.getFullYear();
      const quarter = `Q${currentQuarter}`;
      
      const orgId = user?.organizationId;
      const teamId = selectedDepartment?.id;
      
      if (!orgId || !teamId) {
        throw new Error('Organization or department not found');
      }
      
      const priorityData = {
        ...priorityForm,
        quarter,
        year: currentYear
      };
      
      await quarterlyPrioritiesService.createPriority(orgId, teamId, priorityData);
      
      setShowAddPriority(false);
      setPriorityForm({
        title: '',
        description: '',
        ownerId: '',
        dueDate: '',
        isCompanyPriority: false,
        milestones: []
      });
      setNewMilestoneForm({ title: '', dueDate: '' });
      
      // Refresh data
      await fetchQuarterlyData();
    } catch (err) {
      console.error('Failed to create priority:', err);
      setError('Failed to create item');
    }
  };

  const handleArchivePriority = async (priorityId) => {
    if (!window.confirm('Are you sure you want to archive this priority?')) {
      return;
    }
    
    try {
      const orgId = user?.organizationId;
      const teamId = selectedDepartment?.id;
      
      if (!orgId || !teamId) {
        throw new Error('Organization or department not found');
      }
      
      await quarterlyPrioritiesService.archivePriority(orgId, teamId, priorityId);
      
      // Refresh data
      await fetchQuarterlyData();
    } catch (err) {
      console.error('Failed to archive priority:', err);
      setError('Failed to archive item');
    }
  };

  const handlePriorityStatusChange = async (priorityId, newStatus) => {
    try {
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = selectedDepartment?.id || user?.teamId || '00000000-0000-0000-0000-000000000000';
      
      await quarterlyPrioritiesService.updatePriority(orgId, teamId, priorityId, { status: newStatus });
      
      // Update local state for company priorities
      setCompanyPriorities(prev => 
        Array.isArray(prev) ? prev.map(p => 
          p.id === priorityId ? { ...p, status: newStatus } : p
        ) : []
      );
      
      // Update local state for team member priorities
      setTeamMemberPriorities(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(memberId => {
          // Ensure the value is an array before calling map
          if (Array.isArray(updated[memberId])) {
            updated[memberId] = updated[memberId].map(p => 
              p.id === priorityId ? { ...p, status: newStatus } : p
            );
          }
        });
        return updated;
      });
      
      // Update archived priorities if needed
      setArchivedPriorities(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(quarter => {
          if (updated[quarter] && updated[quarter].companyPriorities && Array.isArray(updated[quarter].companyPriorities)) {
            updated[quarter].companyPriorities = updated[quarter].companyPriorities.map(p =>
              p.id === priorityId ? { ...p, status: newStatus } : p
            );
          }
          if (updated[quarter] && updated[quarter].teamMemberPriorities) {
            Object.keys(updated[quarter].teamMemberPriorities).forEach(memberId => {
              if (Array.isArray(updated[quarter].teamMemberPriorities[memberId])) {
                updated[quarter].teamMemberPriorities[memberId] = 
                  updated[quarter].teamMemberPriorities[memberId].map(p =>
                    p.id === priorityId ? { ...p, status: newStatus } : p
                  );
              }
            });
          }
        });
        return updated;
      });
      
      // If the priority is marked as off-track, create an issue
      if (newStatus === 'off-track') {
        // Safely collect all priorities
        const allPriorities = [
          ...(Array.isArray(companyPriorities) ? companyPriorities : []),
          ...Object.values(teamMemberPriorities).filter(Array.isArray).flat()
        ];
        const priority = allPriorities.find(p => p.id === priorityId);
        
        if (priority) {
          const issueData = {
            title: `Off-Track Priority: ${priority.title}`,
            description: `Priority "${priority.title}" is off-track and needs attention.\n\nOriginal priority: ${priority.description || 'No description'}`,
            timeline: 'short_term',
            team_id: teamId,
            created_by: user?.id,
            status: 'open',
            priority_level: 'high',
            related_priority_id: priorityId
          };
          
          await issuesService.createIssue(orgId, teamId, issueData);
          setSuccess('Issue created for off-track priority');
        }
      }
      
      setSuccess('Priority status updated');
    } catch (error) {
      console.error('Failed to update priority status:', error);
      setError('Failed to update priority status');
    }
  };

  // Get current period for display
  const getCurrentPeriodDisplay = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    return `${currentYear}`;
  };

  // Toggle expansion states
  const toggleCompanyPriorities = () => {
    setExpandedSections(prev => ({
      ...prev,
      companyPriorities: !prev.companyPriorities
    }));
  };

  const toggleIndividualPriorities = (memberId) => {
    setExpandedSections(prev => ({
      ...prev,
      individualPriorities: {
        ...prev.individualPriorities,
        [memberId]: !prev.individualPriorities[memberId]
      }
    }));
  };

  const expandAll = () => {
    const allIndividuals = {};
    teamMembers.forEach(member => {
      if (teamMemberPriorities[member.id]?.priorities?.length > 0) {
        allIndividuals[member.id] = true;
      }
    });
    setExpandedSections({
      companyPriorities: true,
      individualPriorities: allIndividuals
    });
  };

  const collapseAll = () => {
    setExpandedSections({
      companyPriorities: false,
      individualPriorities: {}
    });
  };

  // Calculate stats - should reflect what's currently being displayed
  // Filter to only count priorities for the selected team
  const currentTeamIndividualPriorities = Object.values(teamMemberPriorities).flatMap(memberData => {
    const priorities = memberData?.priorities || [];
    // Filter by team_id to ensure we only count the selected team's priorities
    return priorities.filter(p => {
      // If viewing Leadership Team (id: 00000000-0000-0000-0000-000000000000)
      if (selectedDepartment?.id === '00000000-0000-0000-0000-000000000000') {
        // Count priorities that belong to Leadership Team
        return p.team_id === '00000000-0000-0000-0000-000000000000' || 
               p.team_id === null || // Legacy priorities without team_id
               p.is_from_leadership === true;
      } else if (selectedDepartment?.id) {
        // For other teams, only count their specific priorities
        return p.team_id === selectedDepartment.id;
      }
      return true; // Fallback if no department selected
    });
  });
  
  // Stats should match what's displayed on the page:
  // - Company priorities (if user can see them AND viewing Leadership Team)
  const visibleCompanyPriorities = (isOnLeadershipTeam() && selectedDepartment?.id === '00000000-0000-0000-0000-000000000000') 
    ? companyPriorities 
    : [];
  
  const allPriorities = [
    ...visibleCompanyPriorities,
    ...currentTeamIndividualPriorities
  ];
  
  console.log('Stats Debug:', {
    selectedTeam: selectedDepartment?.name,
    selectedTeamId: selectedDepartment?.id,
    isLeadershipTeam: isOnLeadershipTeam(),
    companyPrioritiesCount: visibleCompanyPriorities.length,
    individualPrioritiesCount: currentTeamIndividualPriorities.length,
    totalCalculated: allPriorities.length,
    allIndividualBeforeFilter: Object.values(teamMemberPriorities).flatMap(m => m?.priorities || []).length
  });
  
  const stats = {
    total: allPriorities.length,
    completed: allPriorities.filter(p => p.status === 'complete').length,
    onTrack: allPriorities.filter(p => p.status === 'on-track').length,
    offTrack: allPriorities.filter(p => p.status === 'off-track').length
  };

  const PriorityCard = ({ priority, isCompany = false, isArchived = false }) => {
    // Validate priority data
    if (!priority || !priority.owner) {
      console.error('Invalid priority data:', priority);
      return null;
    }
    
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);
    const [updateText, setUpdateText] = useState('');
    const [updateStatusChange, setUpdateStatusChange] = useState(null);
    const [showAddMilestone, setShowAddMilestone] = useState(false);
    const [editingMilestoneId, setEditingMilestoneId] = useState(null);
    const [milestoneForm, setMilestoneForm] = useState({
      title: '',
      dueDate: ''
    });
    const [editForm, setEditForm] = useState({
      title: priority.title || '',
      description: priority.description || '',
      status: priority.status || 'on-track',
      progress: priority.progress || 0,
      dueDate: priority.dueDate ? (
        priority.dueDate.includes('T') 
          ? priority.dueDate.split('T')[0]
          : priority.dueDate
      ) : '',
      ownerId: priority.owner?.id || '',
      isCompanyPriority: priority.isCompanyPriority ?? priority.is_company_priority ?? false
    });
    
    // Attachment states
    const [attachments, setAttachments] = useState([]);
    const [loadingAttachments, setLoadingAttachments] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [attachmentError, setAttachmentError] = useState(null);
    
    // Issue creation states
    const [creatingIssue, setCreatingIssue] = useState(false);
    const [issueCreatedSuccess, setIssueCreatedSuccess] = useState(false);

    // Load attachments on mount
    useEffect(() => {
      if (priority.id && !isArchived) {
        loadAttachments();
      }
    }, [priority.id]);

    const loadAttachments = async () => {
      try {
        setLoadingAttachments(true);
        const orgId = user?.organizationId;
        const teamId = selectedDepartment?.id;
        
        if (orgId && teamId) {
          const attachmentList = await quarterlyPrioritiesService.getAttachments(orgId, teamId, priority.id);
          setAttachments(attachmentList || []);
        }
      } catch (error) {
        console.error('Failed to load attachments:', error);
        // Silently fail for now until migration runs
        setAttachments([]);
      } finally {
        setLoadingAttachments(false);
      }
    };

    const handleFileUpload = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        setUploadingFile(true);
        setAttachmentError(null);
        
        const orgId = user?.organizationId;
        const teamId = selectedDepartment?.id;
        
        if (!orgId || !teamId) {
          throw new Error('Organization or team not found');
        }

        await quarterlyPrioritiesService.uploadAttachment(orgId, teamId, priority.id, file);
        await loadAttachments(); // Reload attachments
        
        // Clear the file input
        event.target.value = '';
      } catch (error) {
        console.error('Failed to upload file:', error);
        setAttachmentError('Failed to upload attachment');
      } finally {
        setUploadingFile(false);
      }
    };

    const handleDeleteAttachment = async (attachmentId) => {
      if (!window.confirm('Are you sure you want to delete this attachment?')) {
        return;
      }

      try {
        const orgId = user?.organizationId;
        const teamId = selectedDepartment?.id;
        
        if (orgId && teamId) {
          await quarterlyPrioritiesService.deleteAttachment(orgId, teamId, priority.id, attachmentId);
          await loadAttachments(); // Reload attachments
        }
      } catch (error) {
        console.error('Failed to delete attachment:', error);
        setAttachmentError('Failed to delete attachment');
      }
    };

    const handleDownloadAttachment = async (attachment) => {
      try {
        const orgId = user?.organizationId;
        const teamId = selectedDepartment?.id;
        
        if (orgId && teamId) {
          await quarterlyPrioritiesService.downloadAttachment(
            orgId, 
            teamId, 
            priority.id, 
            attachment.id, 
            attachment.file_name
          );
        }
      } catch (error) {
        console.error('Failed to download attachment:', error);
        setAttachmentError('Failed to download attachment');
      }
    };

    const handleSave = () => {
      handleUpdatePriority(priority.id, editForm);
      setIsEditing(false);
    };

    const handleAddUpdateSubmit = () => {
      handleAddUpdate(priority.id, updateText, updateStatusChange);
      setUpdateText('');
      setUpdateStatusChange(null);
      setShowUpdateDialog(false);
    };
    
    const handleCreateIssue = async () => {
      try {
        setCreatingIssue(true);
        
        const ownerName = priority.owner?.name || 
          (priority.owner?.firstName && priority.owner?.lastName 
            ? `${priority.owner.firstName} ${priority.owner.lastName}`
            : 'Unassigned');
        
        // Add status to title if off-track or at-risk
        const statusSuffix = (priority.status === 'off-track' || priority.status === 'at-risk') 
          ? ` - ${priority.status.replace('-', ' ').toUpperCase()}` 
          : '';
        
        const dueDate = priority.dueDate || priority.due_date;
        const formattedDueDate = dueDate ? format(new Date(dueDate), 'MMM dd, yyyy') : 'Not set';
          
        const issueData = {
          title: `${priority.title}${statusSuffix}`,
          description: `Priority "${priority.title}" needs discussion. Status: ${priority.status || 'on-track'}. Due: ${formattedDueDate}. Owner: ${ownerName}`,
          timeline: 'short_term',
          ownerId: priority.owner?.id || user?.id,
          department_id: selectedDepartment?.id
        };
        
        await issuesService.createIssue(issueData);
        
        // Just update local state - don't call parent's setSuccess
        setCreatingIssue(false);
        setIssueCreatedSuccess(true);
        
        // Reset success state after 3 seconds
        setTimeout(() => {
          setIssueCreatedSuccess(false);
        }, 3000);
      } catch (error) {
        console.error('Failed to create issue:', error);
        setCreatingIssue(false);
        alert('Failed to create issue. Please try again.');
      }
    };

    try {
      return (
        <Card className={`transition-all duration-200 border-l-4 ${getStatusBorderColor(isEditing ? editForm.status : priority.status)} hover:shadow-sm bg-white`}>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusDotColor(isEditing ? editForm.status : priority.status)}`} />
                  {isEditing ? (
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="flex-1 text-lg font-semibold border-0 p-0 focus:ring-0 shadow-none"
                    />
                  ) : (
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {priority.title}
                      </h3>
                      {/* Milestones at a glance */}
                      {priority.milestones && priority.milestones.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {priority.milestones.slice(0, 3).map((milestone) => (
                            <div key={milestone.id} className="flex items-center gap-2 text-sm">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                milestone.completed 
                                  ? 'bg-green-500' 
                                  : getDaysUntilDue(milestone.dueDate || milestone.due_date) < 0
                                  ? 'bg-red-500'
                                  : 'bg-gray-400'
                              }`} />
                              <span className={`truncate ${
                                milestone.completed 
                                  ? 'text-gray-500 line-through' 
                                  : 'text-gray-700'
                              }`}>
                                {milestone.title}
                              </span>
                              {milestone.dueDate && (
                                <span className="text-xs text-gray-500 flex-shrink-0">
                                  {format(new Date(milestone.dueDate), 'MMM d')}
                                </span>
                              )}
                            </div>
                          ))}
                          {priority.milestones.length > 3 && (
                            <span className="text-xs text-gray-500 pl-3.5">
                              +{priority.milestones.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {isCompany && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      <Building2 className="h-3 w-3 mr-1" />
                      Company
                    </Badge>
                  )}
                  
                  {(() => {
                    const overdueMilestones = (priority.milestones || []).filter(
                      m => !m.completed && getDaysUntilDue(m.dueDate) < 0
                    );
                    if (overdueMilestones.length > 0) {
                      return (
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {overdueMilestones.length} Overdue
                        </Badge>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-gray-100">
                        {getUserInitials(priority.owner.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{priority.owner.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{formatDate(priority.dueDate)}</span>
                  </div>

                  {!isArchived && !isEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentStatus = priority.status || 'on-track';
                        const newStatus = currentStatus === 'on-track' ? 'off-track' : 'on-track';
                        handlePriorityStatusChange(priority.id, newStatus);
                      }}
                      className={`flex items-center gap-2 ${
                        priority.status === 'off-track' ? 'border-red-300 bg-red-50 hover:bg-red-100' :
                        'border-green-300 bg-green-50 hover:bg-green-100'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${getStatusDotColor(priority.status)}`} />
                      <span className="capitalize font-medium">
                        {(priority.status || 'on-track').replace('-', ' ')}
                      </span>
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(isEditing ? editForm.status : priority.status)}`} />
                      <span className="capitalize">{(isEditing ? editForm.status : priority.status).replace('-', ' ')}</span>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="mt-2 text-sm resize-none"
                    rows={2}
                    placeholder="Priority description..."
                  />
                ) : (
                  priority.description && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {priority.description}
                    </p>
                  )
                )}
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                
                {isEditing ? (
                  <>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleSave}
                      className="h-8 w-8 p-0 hover:bg-green-100"
                    >
                      <Save className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setIsEditing(false)}
                      className="h-8 w-8 p-0 hover:bg-red-100"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        const isCompanyPriorityValue = priority.isCompanyPriority ?? priority.is_company_priority ?? false;
                        setEditForm({
                          title: priority.title || '',
                          description: priority.description || '',
                          status: priority.status || 'on-track',
                          progress: priority.progress || 0,
                          dueDate: priority.dueDate ? (
                            priority.dueDate.includes('T') 
                              ? priority.dueDate.split('T')[0]
                              : priority.dueDate
                          ) : '',
                          ownerId: priority.owner?.id || '',
                          isCompanyPriority: isCompanyPriorityValue
                        });
                        setIsEditing(true);
                      }}
                      className="h-8 w-8 p-0 hover:bg-blue-100"
                    >
                      <Edit className="h-4 w-4 text-blue-600" />
                    </Button>
                    
                    {!isArchived && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleArchivePriority(priority.id)}
                        className="h-8 w-8 p-0 hover:bg-orange-100"
                      >
                        <Archive className="h-4 w-4 text-orange-600" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardHeader>

          {isExpanded && (
            <CardContent className="pt-0 space-y-6">
              {/* Progress and Details Grid */}
              <div className="grid md:grid-cols-4 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-600 mb-2 block">Owner</Label>
                  {isEditing ? (
                    <Select
                      value={editForm.ownerId}
                      onValueChange={(value) => setEditForm({ ...editForm, ownerId: value })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(teamMembers || []).filter(member => member.id).map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs bg-gray-100">
                          {getUserInitials(priority.owner.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-900">{priority.owner.name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600 mb-2 block">Due Date</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editForm.dueDate}
                      onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                      className="h-9"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{formatDate(priority.dueDate)}</span>
                      <span className="text-xs text-gray-500">
                        ({getDaysUntilDue(priority.dueDate)} days)
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600 mb-2 block">Status</Label>
                  {isEditing ? (
                    <Select
                      value={editForm.status}
                      onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on-track">On Track</SelectItem>
                        <SelectItem value="off-track">Off Track</SelectItem>
                        <SelectItem value="complete">Complete</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusDotColor(priority.status)}`} />
                      <span className="text-sm text-gray-900 capitalize">{priority.status.replace('-', ' ')}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600 mb-2 block">Progress</Label>
                  <div className="flex items-center gap-3">
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editForm.progress}
                        onChange={(e) => setEditForm({ ...editForm, progress: parseInt(e.target.value) || 0 })}
                        className="w-20 h-9"
                      />
                    ) : (
                      <>
                        <Progress value={priority.progress} className="flex-1 h-2" />
                        <span className="text-sm font-medium text-gray-900 w-10">{priority.progress}%</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Company/Individual Priority Toggle (only in edit mode) */}
              {isEditing && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="editIsCompany"
                    checked={editForm.isCompanyPriority}
                    onChange={(e) => setEditForm({ ...editForm, isCompanyPriority: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="editIsCompany" className="text-sm">This is a company-wide priority</Label>
                </div>
              )}

              {/* Milestones */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium text-gray-600">Milestones</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddMilestone(true)}
                    className="text-xs h-7 hover:bg-blue-100 text-blue-600"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Milestone
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {(priority.milestones || []).map((milestone) => (
                    <div key={milestone.id} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={milestone.completed}
                        onChange={(e) => handleUpdateMilestone(priority.id, milestone.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      
                      {editingMilestoneId === milestone.id ? (
                        <>
                          <Input
                            value={milestoneForm.title}
                            onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                            className="flex-1 h-8 text-sm"
                            placeholder="Milestone title"
                          />
                          <Input
                            type="date"
                            value={milestoneForm.dueDate}
                            onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                            className="w-36 h-8 text-xs"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              handleEditMilestone(priority.id, milestone.id, {
                                title: milestoneForm.title,
                                dueDate: milestoneForm.dueDate,
                                completed: milestone.completed
                              });
                              setEditingMilestoneId(null);
                              setMilestoneForm({ title: '', dueDate: '' });
                            }}
                            className="h-8 w-8 p-0 hover:bg-green-100"
                          >
                            <CheckSquare className="h-3 w-3 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingMilestoneId(null);
                              setMilestoneForm({ title: '', dueDate: '' });
                            }}
                            className="h-8 w-8 p-0 hover:bg-red-100"
                          >
                            <X className="h-3 w-3 text-red-600" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {!milestone.completed && getDaysUntilDue(milestone.dueDate) < 0 && (
                            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          )}
                          <span className={`text-sm flex-1 ${milestone.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {milestone.title}
                          </span>
                          <span className={`text-xs font-medium ${
                            !milestone.completed && getDaysUntilDue(milestone.dueDate) < 0 
                              ? 'text-red-600' 
                              : !milestone.completed && getDaysUntilDue(milestone.dueDate) <= 3
                              ? 'text-orange-600'
                              : 'text-gray-500'
                          }`}>
                            {formatDate(milestone.dueDate)}
                            {!milestone.completed && getDaysUntilDue(milestone.dueDate) < 0 && (
                              <span className="ml-1">(Overdue)</span>
                            )}
                          </span>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingMilestoneId(milestone.id);
                                setMilestoneForm({
                                  title: milestone.title,
                                  dueDate: milestone.dueDate ? new Date(milestone.dueDate).toISOString().split('T')[0] : ''
                                });
                              }}
                              className="h-7 w-7 p-0 hover:bg-blue-100"
                            >
                              <Edit className="h-3 w-3 text-blue-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this milestone?')) {
                                  handleDeleteMilestone(priority.id, milestone.id);
                                }
                              }}
                              className="h-7 w-7 p-0 hover:bg-red-100"
                            >
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  
                  {showAddMilestone && (
                    <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                      <Input
                        value={milestoneForm.title}
                        onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                        placeholder="New milestone title"
                        className="flex-1 h-8 text-sm"
                      />
                      <Input
                        type="date"
                        value={milestoneForm.dueDate}
                        onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                        className="w-36 h-8 text-xs"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          handleCreateMilestone(priority.id, milestoneForm);
                          setMilestoneForm({ title: '', dueDate: '' });
                          setShowAddMilestone(false);
                        }}
                        disabled={!milestoneForm.title || !milestoneForm.dueDate}
                        className="h-8 w-8 p-0 hover:bg-green-100"
                      >
                        <CheckSquare className="h-3 w-3 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowAddMilestone(false);
                          setMilestoneForm({ title: '', dueDate: '' });
                        }}
                        className="h-8 w-8 p-0 hover:bg-red-100"
                      >
                        <X className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Latest Update */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium text-gray-600">Latest Update</Label>
                  <div className="flex gap-2">
                    {!isArchived && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCreateIssue}
                        disabled={creatingIssue || issueCreatedSuccess}
                        className={issueCreatedSuccess 
                          ? "text-xs bg-green-600 hover:bg-green-700 text-white border-green-600" 
                          : "text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                        }
                      >
                        {creatingIssue ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Creating...
                          </>
                        ) : issueCreatedSuccess ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Issue Created!
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Make an Issue
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUpdateText('');
                        setUpdateStatusChange(null);
                        setShowUpdateDialog(true);
                      }}
                      className="text-xs h-7 hover:bg-blue-100 text-blue-600"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Update
                    </Button>
                  </div>
                </div>
                
                {priority.latestUpdate ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{priority.latestUpdate.author}</span>
                      <span className="text-xs text-gray-500">{formatDate(priority.latestUpdate.date)}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{priority.latestUpdate.text}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-500 italic">No updates yet</p>
                  </div>
                )}
              </div>

              {/* Attachments */}
              {!isArchived && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium text-gray-600">
                      <Paperclip className="inline-block h-3 w-3 mr-1" />
                      Attachments
                    </Label>
                    <label>
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploadingFile}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 hover:bg-blue-100 text-blue-600"
                        disabled={uploadingFile}
                        onClick={(e) => {
                          e.preventDefault();
                          e.currentTarget.parentElement.querySelector('input[type="file"]').click();
                        }}
                      >
                        {uploadingFile ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3 mr-1" />
                            Add File
                          </>
                        )}
                      </Button>
                    </label>
                  </div>
                  
                  {attachmentError && (
                    <Alert variant="destructive" className="mb-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{attachmentError}</AlertDescription>
                    </Alert>
                  )}
                  
                  {loadingAttachments ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  ) : attachments.length > 0 ? (
                    <div className="space-y-2">
                      {attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3 flex-1">
                            <Paperclip className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-900 truncate">{attachment.file_name}</span>
                            <span className="text-xs text-gray-500">
                              ({attachment.file_size ? `${(attachment.file_size / 1024).toFixed(1)} KB` : 'Unknown size'})
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadAttachment(attachment)}
                              className="h-7 w-7 p-0 hover:bg-blue-100"
                            >
                              <Download className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAttachment(attachment.id)}
                              className="h-7 w-7 p-0 hover:bg-red-100"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <p className="text-sm text-gray-500 italic">No attachments</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          )}

          {/* Add Update Dialog */}
          <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Update</DialogTitle>
                <DialogDescription>
                  Share progress or any blockers for this priority. Updates should be provided before each weekly accountability meeting.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="What's the latest status?"
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  rows={4}
                />
                <div>
                  <Label htmlFor="statusChange">Update Status (optional)</Label>
                  <Select
                    value={updateStatusChange || 'no-change'}
                    onValueChange={(value) => setUpdateStatusChange(value === 'no-change' ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Keep current status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-change">Keep current status</SelectItem>
                      <SelectItem value="on-track">On Track</SelectItem>
                      <SelectItem value="off-track">Off Track</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddUpdateSubmit}>
                  Add Update
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Card>
      );
    } catch (error) {
      console.error('Error rendering priority card:', error, priority);
      return (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Error displaying priority. Please refresh the page.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Show loading while waiting for department selection
  if (departmentLoading || !selectedDepartment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-white min-h-screen">
      {/* Header */}
      <div className="bg-white border-b pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{selectedDepartment.name} Quarterly Priorities</h1>
            {showArchived && (
              <p className="text-gray-600 mt-2">
                Viewing archived priorities from previous quarters
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!showArchived && (
              <>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={expandAll}
                  className="text-sm"
                >
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Expand All
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={collapseAll}
                  className="text-sm"
                >
                  <ChevronRight className="mr-2 h-4 w-4" />
                  Collapse All
                </Button>
              </>
            )}
            <Button 
              variant={showArchived ? "default" : "outline"}
              onClick={() => setShowArchived(!showArchived)}
              className="text-sm"
            >
              {showArchived ? 'View Current' : 'View Archive'}
            </Button>
            {!showArchived && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => navigate(`/organizations/${organization?.id || localStorage.getItem('organizationId')}/smart-rock-assistant`)}
                  className="text-sm"
                >
                  <Brain className="mr-2 h-4 w-4" />
                  SMART Assistant
                </Button>
                <Button 
                  onClick={() => {
                    // Set default owner to current user when opening dialog
                    setPriorityForm({
                      ...priorityForm,
                      ownerId: user?.id || ''
                    });
                    setShowAddPriority(true);
                  }}
                  className="text-sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Priority
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards - Only show for current priorities */}
      {!showArchived && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Priorities</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                  <p className={`text-sm font-medium mt-1 ${
                    stats.total > 0 && (stats.completed / stats.total) >= 0.8 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {stats.total > 0 
                      ? `${Math.round((stats.completed / stats.total) * 100)}% Complete`
                      : '0% Complete'
                    }
                  </p>
                </div>
                <CheckSquare className="h-8 w-8 text-gray-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">On Track</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.onTrack}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Off Track</p>
                  <p className="text-3xl font-bold text-red-600">{stats.offTrack}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-300" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Display archived priorities by quarter if showing archived */}
      {showArchived ? (
        <div className="space-y-12">
          {Object.entries(archivedQuarters).length === 0 ? (
            <div className="text-center py-16">
              <Archive className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-500">No archived priorities found</p>
            </div>
          ) : (
            Object.entries(archivedQuarters)
              .sort(([a], [b]) => b.localeCompare(a)) // Sort quarters in reverse order
              .map(([quarterKey, quarterData]) => (
                <div key={quarterKey} className="space-y-8">
                  <div className="border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-900">{quarterKey}</h2>
                  </div>
                  
                  {/* Company Priorities for this quarter - Only show for Leadership Team */}
                  {isOnLeadershipTeam() && quarterData.companyPriorities.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-6 w-6 text-blue-600" />
                        <h3 className="text-xl font-semibold text-gray-900">Company Priorities</h3>
                      </div>
                      <div className="space-y-4">
                        {quarterData.companyPriorities.map(priority => (
                          <PriorityCard key={priority.id} priority={priority} isCompany={true} isArchived={true} />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Individual Priorities for this quarter */}
                  {Object.keys(quarterData.teamMemberPriorities).length > 0 && (
                    <div className="space-y-8">
                      <div className="flex items-center gap-3">
                        <Users className="h-6 w-6 text-purple-600" />
                        <h3 className="text-xl font-semibold text-gray-900">Individual Priorities</h3>
                      </div>
                      {Object.entries(quarterData.teamMemberPriorities).map(([memberId, priorities]) => {
                        const firstPriority = priorities[0];
                        return (
                          <div key={memberId} className="space-y-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-gray-100">{getUserInitials(firstPriority.owner.name)}</AvatarFallback>
                              </Avatar>
                              <h4 className="text-lg font-semibold text-gray-900">{firstPriority.owner.name}</h4>
                            </div>
                            {priorities.map(priority => (
                              <PriorityCard key={priority.id} priority={priority} isArchived={true} />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {/* Company Priorities - Only show for Leadership Team */}
          {isOnLeadershipTeam() && (
            <div className="space-y-6">
              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-3 -m-3 transition-colors group"
                onClick={toggleCompanyPriorities}
              >
                {expandedSections.companyPriorities ? (
                  <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                )}
                <Building2 className="h-6 w-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Company Priorities</h2>
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {companyPriorities.length}
                </span>
              </div>
              {expandedSections.companyPriorities && (
                <div className="space-y-4 ml-8">
                  {(companyPriorities || []).map(priority => (
                    <div key={priority.id} className="group">
                      <PriorityCard priority={priority} isCompany={true} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Team Member Priorities */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Individual Priorities</h2>
            </div>
            {(teamMembers || []).map(member => {
              const memberData = teamMemberPriorities[member.id];
              const memberPriorities = memberData?.priorities || [];
              if (memberPriorities.length === 0) return null;

              return (
                <div key={member.id} className="space-y-6">
                  <div 
                    className="flex items-center gap-4 cursor-pointer hover:bg-gray-50 rounded-lg p-3 -m-3 transition-colors group"
                    onClick={() => toggleIndividualPriorities(member.id)}
                  >
                    {expandedSections.individualPriorities[member.id] ? (
                      <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                    )}
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gray-100">{getUserInitials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-600">{member.role} • {member.department}</p>
                    </div>
                    <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {memberPriorities.length}
                    </span>
                  </div>
                  {expandedSections.individualPriorities[member.id] && (
                    <div className="space-y-4 ml-16">
                      {memberPriorities.map(priority => (
                        <div key={priority.id} className="group">
                          <PriorityCard priority={priority} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Priority Dialog */}
      <Dialog open={showAddPriority} onOpenChange={setShowAddPriority}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Priority</DialogTitle>
            <DialogDescription>
              Create a new priority for {getCurrentPeriodDisplay()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label htmlFor="title" className="text-sm font-medium">Title</Label>
              <Input
                id="title"
                value={priorityForm.title}
                onChange={(e) => setPriorityForm({ ...priorityForm, title: e.target.value })}
                placeholder="Enter priority title"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                value={priorityForm.description}
                onChange={(e) => setPriorityForm({ ...priorityForm, description: e.target.value })}
                placeholder="Describe what needs to be accomplished"
                rows={3}
                className="mt-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="owner" className="text-sm font-medium">Owner</Label>
                <Select
                  value={priorityForm.ownerId}
                  onValueChange={(value) => setPriorityForm({ ...priorityForm, ownerId: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {(teamMembers || []).length > 0 ? (
                      teamMembers.filter(member => member.id).map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value={user?.id || 'current-user'}>
                        {user?.firstName && user?.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user?.email || 'Current User'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dueDate" className="text-sm font-medium">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={priorityForm.dueDate}
                  onChange={(e) => setPriorityForm({ ...priorityForm, dueDate: e.target.value })}
                  className="mt-2"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="isCompany"
                checked={priorityForm.isCompanyPriority}
                onChange={(e) => setPriorityForm({ ...priorityForm, isCompanyPriority: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isCompany" className="text-sm font-medium">This is a company-wide priority</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPriority(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePriority}>
              Create Priority
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Wrap with Error Boundary
const QuarterlyPrioritiesPageCleanWithErrorBoundary = () => (
  <ErrorBoundary>
    <QuarterlyPrioritiesPageClean />
  </ErrorBoundary>
);

export default QuarterlyPrioritiesPageCleanWithErrorBoundary;