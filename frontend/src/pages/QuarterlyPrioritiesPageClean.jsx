import { useState, useEffect, Component } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, startOfQuarter, endOfQuarter, addDays } from 'date-fns';
import { useAuthStore } from '../stores/authStore';
import { quarterlyPrioritiesService } from '../services/quarterlyPrioritiesService';
import { organizationService } from '../services/organizationService';
import { getOrgTheme, saveOrgTheme } from '../utils/themeUtils';
import { issuesService } from '../services/issuesService';
import { getRevenueLabel, getRevenueLabelWithSuffix } from '../utils/revenueUtils';
import { useDepartment } from '../contexts/DepartmentContext';
import { useTerminology } from '../contexts/TerminologyContext';
import { getEffectiveTeamId } from '../utils/teamUtils';
import { groupRocksByPreference, getSectionHeader } from '../utils/rockGroupingUtils';
import PriorityDialog from '../components/priorities/PriorityDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckSquare, 
  Plus, 
  Calendar,
  User,
  Target,
  Check,
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
  Brain,
  Sparkles,
  Activity,
  Zap
} from 'lucide-react';

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
  const { labels } = useTerminology();
  
  // Default methodology - can be made configurable later when organization methodology is implemented
  const methodology = 'eos';
  const [showArchived, setShowArchived] = useState(false);
  const [showAddPriority, setShowAddPriority] = useState(false);
  const [addPriorityMilestones, setAddPriorityMilestones] = useState([]);
  const [showAddMilestoneInDialog, setShowAddMilestoneInDialog] = useState(false);
  const [addMilestoneForm, setAddMilestoneForm] = useState({ title: '', dueDate: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  // Get rock display preference from organization data
  const rockDisplayPreference = organization?.rock_display_preference || 'grouped_by_owner';
  
  // State for priorities data
  const [companyPriorities, setCompanyPriorities] = useState([]);
  const [teamMemberPriorities, setTeamMemberPriorities] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  const [archivedQuarters, setArchivedQuarters] = useState({});
  
  // Expansion states for collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    companyPriorities: false,
    individualPriorities: {} // Will be populated with team members on load
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
  
  // Modal states
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  
  // Employee-centric design states
  const [expandedPriorities, setExpandedPriorities] = useState({});
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null);
  const [addingMilestoneFor, setAddingMilestoneFor] = useState(null);
  const [newMilestone, setNewMilestone] = useState({ title: '', dueDate: '' });

  // Close status dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openStatusDropdown && !e.target.closest('.status-dropdown')) {
        setOpenStatusDropdown(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openStatusDropdown]);

  // Fetch data when department or archive view changes
  useEffect(() => {
    if (selectedDepartment) {
      fetchQuarterlyData();
    }
    fetchOrganization();
    fetchOrganizationTheme();
    
    // Listen for theme changes
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
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
        
        // Debug: Check if updates have IDs
        const allPriorities = [...(data.companyPriorities || [])];
        Object.values(data.teamMemberPriorities || {}).forEach(member => {
          if (member.priorities) {
            allPriorities.push(...member.priorities);
          }
        });
        
        allPriorities.forEach(priority => {
          if (priority.updates && priority.updates.length > 0) {
            console.log(`Priority ${priority.id} has ${priority.updates.length} updates:`, 
              priority.updates.map(u => ({ 
                id: u.id, 
                hasId: !!u.id,
                text: u.text?.substring(0, 30) 
              }))
            );
          }
        });
        
        setCompanyPriorities(data.companyPriorities || []);
        setTeamMemberPriorities(data.teamMemberPriorities || {});
        setTeamMembers(data.teamMembers || []);
        
        // Automatically expand individual sections for all team members
        const expandedIndividuals = {};
        (data.teamMembers || []).forEach(member => {
          expandedIndividuals[member.id] = true;
        });
        setExpandedSections(prev => ({
          ...prev,
          individualPriorities: expandedIndividuals
        }));
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

  const fetchOrganizationTheme = async () => {
    try {
      // First check localStorage
      const orgId = user?.organizationId || user?.organization_id;
      const savedTheme = getOrgTheme(orgId);
      if (savedTheme) {
        setThemeColors(savedTheme);
        return;
      }
      
      // Fetch from API
      const orgData = await organizationService.getOrganization();
      
      if (orgData) {
        const theme = {
          primary: orgData.theme_primary_color || '#3B82F6',
          secondary: orgData.theme_secondary_color || '#1E40AF',
          accent: orgData.theme_accent_color || '#60A5FA'
        };
        setThemeColors(theme);
        saveOrgTheme(orgId, theme);
        
        // Set rock display preference
        setRockDisplayPreference(orgData.rock_display_preference || 'grouped_by_owner');
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
      // Use default colors on error
    }
  };

  const getStatusColor = (status) => {
    // Return inline style object instead of class name for dynamic colors
    switch (status) {
      case 'complete':
        return { backgroundColor: '#10B981' }; // Keep green for complete
      case 'on-track':
        return { backgroundColor: themeColors.primary };
      case 'off-track':
        return { backgroundColor: '#EF4444' }; // Keep red for off-track
      default:
        return { backgroundColor: '#9CA3AF' };
    }
  };

  const getStatusBorderColor = (status) => {
    // Using inline styles for dynamic colors
    return status; // Return status to use in inline style
  };
  
  const getStatusBorderStyle = (status) => {
    switch (status) {
      case 'complete':
        return { borderLeftColor: themeColors.primary, borderLeftWidth: '4px' };
      case 'on-track':
        return { borderLeftColor: themeColors.accent, borderLeftWidth: '4px' };
      case 'off-track':
        return { borderLeftColor: '#EF4444', borderLeftWidth: '4px' };
      default:
        return { borderLeftColor: '#D1D5DB', borderLeftWidth: '4px' };
    }
  };

  const getStatusDotColor = (status) => {
    // Return inline style object for dynamic colors
    switch (status) {
      case 'complete':
        return { backgroundColor: '#10B981' }; // Keep green for complete
      case 'on-track':
        return { backgroundColor: themeColors.primary };
      case 'off-track':
        return { backgroundColor: '#EF4444' }; // Keep red for off-track
      default:
        return { backgroundColor: '#9CA3AF' };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4" style={{ color: themeColors.primary }} />;
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
      
      // First update the milestone
      await quarterlyPrioritiesService.updateMilestone(orgId, teamId, priorityId, milestoneId, { completed });
      
      // Update local state and recalculate progress
      const updatePriorityWithProgress = (p) => {
        if (p.id !== priorityId) return p;
        
        const updatedMilestones = p.milestones?.map(m => 
          m.id === milestoneId ? { ...m, completed } : m
        ) || [];
        
        // Calculate new progress based on completed milestones
        const completedCount = updatedMilestones.filter(m => m.completed).length;
        const totalCount = updatedMilestones.length;
        const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        
        // Auto-update status based on milestone completion
        let newStatus = p.status;
        if (totalCount > 0) {
          // Only set to complete if ALL milestones are actually checked (not just 100% progress)
          if (completedCount === totalCount && totalCount > 0) {
            // All milestones complete - mark as complete
            newStatus = 'complete';
          } else if (newStatus === 'complete' && completedCount < totalCount) {
            // Was complete but unchecked a milestone - revert to on-track
            newStatus = 'on-track';
          }
        }
        
        console.log('Milestone Progress Calculation:', {
          priorityId,
          completedCount,
          totalCount,
          newProgress,
          newStatus,
          previousStatus: p.status,
          milestones: updatedMilestones.map(m => ({ id: m.id, title: m.title, completed: m.completed }))
        });
        
        return { 
          ...p, 
          milestones: updatedMilestones,
          progress: newProgress,
          status: newStatus
        };
      };
      
      // Update company priorities
      setCompanyPriorities(prev => prev.map(updatePriorityWithProgress));
      
      // Update team member priorities
      setTeamMemberPriorities(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(memberId => {
          if (updated[memberId]?.priorities) {
            updated[memberId].priorities = updated[memberId].priorities.map(updatePriorityWithProgress);
          }
        });
        return updated;
      });
      
      // Update selectedPriority if this is the currently selected one
      if (selectedPriority?.id === priorityId) {
        setSelectedPriority(prev => updatePriorityWithProgress(prev));
      }
      
      // Update progress and status on the backend
      const currentPriority = companyPriorities.find(p => p.id === priorityId) || 
        Object.values(teamMemberPriorities).flatMap(m => m.priorities || []).find(p => p.id === priorityId);
      
      if (currentPriority) {
        const updatedPriority = updatePriorityWithProgress(currentPriority);
        // Always update progress, and status if it changed
        const updates = { progress: updatedPriority.progress };
        if (updatedPriority.status !== currentPriority.status) {
          updates.status = updatedPriority.status;
        }
        await quarterlyPrioritiesService.updatePriority(orgId, teamId, priorityId, updates);
      }
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
      
      const result = await quarterlyPrioritiesService.createMilestone(orgId, teamId, priorityId, milestoneData);
      
      // Find the owner's name from teamMembers
      const milestoneOwner = teamMembers?.find(member => member.id === milestoneData.ownerId);
      const ownerName = milestoneOwner ? 
        (milestoneOwner.name || `${milestoneOwner.first_name} ${milestoneOwner.last_name}`) : 
        '';
      
      // Update local state instead of refetching
      const newMilestone = {
        id: result?.id || Date.now().toString(),
        title: milestoneData.title,
        dueDate: milestoneData.dueDate,
        owner_id: milestoneData.ownerId,  // Use owner_id to match backend field
        owner_name: ownerName,  // Include owner name for display
        completed: false
      };
      
      // Update company priorities
      setCompanyPriorities(prev => prev.map(p => 
        p.id === priorityId 
          ? { ...p, milestones: [...(p.milestones || []), newMilestone] }
          : p
      ));
      
      // Update team member priorities
      setTeamMemberPriorities(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(memberId => {
          if (updated[memberId]?.priorities) {
            updated[memberId].priorities = updated[memberId].priorities.map(p =>
              p.id === priorityId 
                ? { ...p, milestones: [...(p.milestones || []), newMilestone] }
                : p
            );
          }
        });
        return updated;
      });
      
      // Update selectedPriority if this is the currently selected one
      if (selectedPriority?.id === priorityId) {
        setSelectedPriority(prev => ({
          ...prev,
          milestones: [...(prev.milestones || []), newMilestone]
        }));
      }
      
      // Calculate and update progress on the backend
      const currentPriority = companyPriorities.find(p => p.id === priorityId) || 
        Object.values(teamMemberPriorities).flatMap(m => m.priorities || []).find(p => p.id === priorityId);
      
      if (currentPriority) {
        const allMilestones = [...(currentPriority.milestones || []), newMilestone];
        const completedCount = allMilestones.filter(m => m.completed).length;
        const totalCount = allMilestones.length;
        const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        
        // Only update progress based on milestones, NOT status
        // Status should be controlled manually by the user
        
        // Update only progress on backend
        const updates = { progress: newProgress };
        await quarterlyPrioritiesService.updatePriority(orgId, teamId, priorityId, updates);
        
        // Update local state with new progress only (keep existing status)
        setCompanyPriorities(prev => prev.map(p => 
          p.id === priorityId ? { ...p, progress: newProgress } : p
        ));
        
        setTeamMemberPriorities(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(memberId => {
            if (updated[memberId]?.priorities) {
              updated[memberId].priorities = updated[memberId].priorities.map(p =>
                p.id === priorityId ? { ...p, progress: newProgress } : p
              );
            }
          });
          return updated;
        });
        
        if (selectedPriority?.id === priorityId) {
          setSelectedPriority(prev => ({ ...prev, progress: newProgress }));
        }
      }
      
      setSuccess('Milestone added successfully');
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
      
      console.log('Updating milestone with:', { priorityId, milestoneId, updates });
      await quarterlyPrioritiesService.updateMilestone(orgId, teamId, priorityId, milestoneId, updates);
      
      // Update local state
      const updatePriorityMilestone = (p) => {
        if (p.id !== priorityId) return p;
        return {
          ...p,
          milestones: p.milestones?.map(m =>
            m.id === milestoneId ? { ...m, ...updates } : m
          ) || []
        };
      };
      
      setCompanyPriorities(prev => prev.map(updatePriorityMilestone));
      setTeamMemberPriorities(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(memberId => {
          if (updated[memberId]?.priorities) {
            updated[memberId].priorities = updated[memberId].priorities.map(updatePriorityMilestone);
          }
        });
        return updated;
      });
      
      // Update selectedPriority if this is the currently selected one
      if (selectedPriority?.id === priorityId) {
        setSelectedPriority(prev => updatePriorityMilestone(prev));
      }
      
      setSuccess('Milestone updated successfully');
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
      
      // Update local state instead of refetching
      const removeMilestone = (milestones) => 
        milestones?.filter(m => m.id !== milestoneId) || [];
      
      // Update company priorities
      setCompanyPriorities(prev => prev.map(p => 
        p.id === priorityId 
          ? { ...p, milestones: removeMilestone(p.milestones) }
          : p
      ));
      
      // Update team member priorities
      setTeamMemberPriorities(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(memberId => {
          if (updated[memberId]?.priorities) {
            updated[memberId].priorities = updated[memberId].priorities.map(p =>
              p.id === priorityId 
                ? { ...p, milestones: removeMilestone(p.milestones) }
                : p
            );
          }
        });
        return updated;
      });
      
      // Update selectedPriority if this is the currently selected one
      if (selectedPriority?.id === priorityId) {
        setSelectedPriority(prev => ({
          ...prev,
          milestones: removeMilestone(prev.milestones)
        }));
      }
      
      // Calculate and update progress on the backend
      const currentPriority = companyPriorities.find(p => p.id === priorityId) || 
        Object.values(teamMemberPriorities).flatMap(m => m.priorities || []).find(p => p.id === priorityId);
      
      if (currentPriority) {
        const remainingMilestones = removeMilestone(currentPriority.milestones);
        const completedCount = remainingMilestones.filter(m => m.completed).length;
        const totalCount = remainingMilestones.length;
        const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        
        // Only update progress based on milestones, NOT status
        // Status should be controlled manually by the user
        
        // Update only progress on backend
        const updates = { progress: newProgress };
        await quarterlyPrioritiesService.updatePriority(orgId, teamId, priorityId, updates);
        
        // Update local state with new progress only (keep existing status)
        setCompanyPriorities(prev => prev.map(p => 
          p.id === priorityId ? { ...p, progress: newProgress } : p
        ));
        
        setTeamMemberPriorities(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(memberId => {
            if (updated[memberId]?.priorities) {
              updated[memberId].priorities = updated[memberId].priorities.map(p =>
                p.id === priorityId ? { ...p, progress: newProgress } : p
              );
            }
          });
          return updated;
        });
        
        if (selectedPriority?.id === priorityId) {
          setSelectedPriority(prev => ({ ...prev, progress: newProgress }));
        }
      }
      
      setSuccess('Milestone deleted successfully');
    } catch (err) {
      console.error('Failed to delete milestone:', err);
      // For delete, we don't show error for 404 since the milestone is already gone
      if (err.message && !err.message.includes('not found')) {
        setError('Failed to delete milestone');
      } else {
        // Still refresh to ensure UI is in sync if not found
        await fetchQuarterlyData();
      }
    }
  };

  const handleDeleteUpdate = async (priorityId, updateId) => {
    try {
      console.log('Attempting to delete update:', { priorityId, updateId });
      
      if (!window.confirm('Are you sure you want to delete this update?')) {
        return;
      }
      
      const orgId = user?.organizationId;
      const teamId = selectedDepartment?.id;
      
      console.log('Delete params:', { orgId, teamId, priorityId, updateId });
      
      if (!orgId || !teamId) {
        throw new Error('Organization or department not found');
      }
      
      // Call backend to delete the update
      await quarterlyPrioritiesService.deletePriorityUpdate(orgId, teamId, priorityId, updateId);
      console.log('Update deleted successfully from backend');
      
      // Update local state to reflect the deletion
      const removeUpdate = (updates) => 
        updates?.filter(u => u.id !== updateId) || [];
      
      // Update company priorities
      setCompanyPriorities(prev => prev.map(p => 
        p.id === priorityId 
          ? { ...p, updates: removeUpdate(p.updates) }
          : p
      ));
      
      // Update team member priorities
      setTeamMemberPriorities(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(memberId => {
          if (updated[memberId]?.priorities) {
            updated[memberId].priorities = updated[memberId].priorities.map(p =>
              p.id === priorityId 
                ? { ...p, updates: removeUpdate(p.updates) }
                : p
            );
          }
        });
        return updated;
      });
      
      // Update selectedPriority if this is the currently selected one
      if (selectedPriority?.id === priorityId) {
        setSelectedPriority(prev => ({
          ...prev,
          updates: removeUpdate(prev.updates)
        }));
      }
      
      setSuccess('Update deleted successfully');
    } catch (err) {
      console.error('Failed to delete update:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError(`Failed to delete update: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleEditUpdate = async (priorityId, updateId, newText) => {
    try {
      const editText = window.prompt('Edit update:', newText);
      if (!editText || editText === newText) {
        return;
      }
      
      const orgId = user?.organizationId;
      const teamId = selectedDepartment?.id;
      
      if (!orgId || !teamId) {
        throw new Error('Organization or department not found');
      }
      
      // Call backend to edit the update
      await quarterlyPrioritiesService.editPriorityUpdate(orgId, teamId, priorityId, updateId, editText);
      
      // Update local state to reflect the edit
      const editUpdate = (updates) => 
        updates?.map(u => u.id === updateId ? { ...u, text: editText } : u) || [];
      
      // Update company priorities
      setCompanyPriorities(prev => prev.map(p => 
        p.id === priorityId 
          ? { ...p, updates: editUpdate(p.updates) }
          : p
      ));
      
      // Update team member priorities
      setTeamMemberPriorities(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(memberId => {
          if (updated[memberId]?.priorities) {
            updated[memberId].priorities = updated[memberId].priorities.map(p =>
              p.id === priorityId 
                ? { ...p, updates: editUpdate(p.updates) }
                : p
            );
          }
        });
        return updated;
      });
      
      // Update selectedPriority if this is the currently selected one
      if (selectedPriority?.id === priorityId) {
        setSelectedPriority(prev => ({
          ...prev,
          updates: editUpdate(prev.updates)
        }));
      }
      
      setSuccess('Update edited successfully');
    } catch (err) {
      console.error('Failed to edit update:', err);
      setError('Failed to edit update');
    }
  };

  const handleAddUpdate = async (priorityId, updateText, statusChange = null) => {
    try {
      const orgId = user?.organizationId;
      const teamId = selectedDepartment?.id;
      
      if (!orgId || !teamId) {
        throw new Error('Organization or department not found');
      }
      
      const result = await quarterlyPrioritiesService.addPriorityUpdate(orgId, teamId, priorityId, updateText, statusChange);
      
      console.log('Update creation result:', result);
      
      // Ensure we have a valid result object
      if (!result || !result.id) {
        console.error('Invalid update response - missing ID:', result);
        throw new Error('Failed to create update - no ID returned');
      }
      
      // Update local state instead of refetching
      const newUpdate = {
        id: result.id, // Use the actual ID from the response
        text: result.update_text || updateText,
        createdAt: result.created_at || new Date().toISOString(),
        createdBy: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || 'Unknown'
      };
      
      // Update company priorities
      setCompanyPriorities(prev => prev.map(p => 
        p.id === priorityId 
          ? { ...p, updates: [newUpdate, ...(p.updates || [])], status: statusChange || p.status }
          : p
      ));
      
      // Update team member priorities
      setTeamMemberPriorities(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(memberId => {
          if (updated[memberId]?.priorities) {
            updated[memberId].priorities = updated[memberId].priorities.map(p =>
              p.id === priorityId 
                ? { ...p, updates: [newUpdate, ...(p.updates || [])], status: statusChange || p.status }
                : p
            );
          }
        });
        return updated;
      });
      
      // Update selectedPriority if this is the currently selected one
      if (selectedPriority?.id === priorityId) {
        setSelectedPriority(prev => ({
          ...prev,
          updates: [newUpdate, ...(prev.updates || [])],
          status: statusChange || prev.status
        }));
      }
      
      setSuccess('Update added successfully');
    } catch (err) {
      console.error('Failed to add update:', err);
      setError('Failed to add update');
    }
  };

  const handleCreatePriority = async () => {
    // Prevent multiple submissions
    if (loading) return;
    
    setLoading(true);
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
      
      const newPriority = await quarterlyPrioritiesService.createPriority(orgId, teamId, priorityData);
      
      // Add milestones if any were created
      if (addPriorityMilestones.length > 0 && newPriority?.id) {
        for (const milestone of addPriorityMilestones) {
          await quarterlyPrioritiesService.createMilestone(orgId, teamId, newPriority.id, milestone);
        }
      }
      
      setShowAddPriority(false);
      setPriorityForm({
        title: '',
        description: '',
        ownerId: '',
        dueDate: '',
        isCompanyPriority: false,
        milestones: []
      });
      setAddPriorityMilestones([]);
      setAddMilestoneForm({ title: '', dueDate: '' });
      setNewMilestoneForm({ title: '', dueDate: '' });
      
      // Refresh data
      await fetchQuarterlyData();
    } catch (err) {
      console.error('Failed to create priority:', err);
      setError('Failed to create item');
    } finally {
      setLoading(false);
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

  const handleUploadAttachment = async (priorityId, file) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getEffectiveTeamId(selectedDepartment?.id, user);
      
      if (!orgId || !teamId) {
        throw new Error('Organization or team not found');
      }
      
      const result = await quarterlyPrioritiesService.uploadAttachment(orgId, teamId, priorityId, file);
      
      // Update local state instead of refetching
      const newAttachment = {
        id: result?.id || Date.now().toString(),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || 'Unknown',
        createdAt: new Date().toISOString()
      };
      
      // Update company priorities
      setCompanyPriorities(prev => prev.map(p => 
        p.id === priorityId 
          ? { ...p, attachments: [...(p.attachments || []), newAttachment] }
          : p
      ));
      
      // Update team member priorities
      setTeamMemberPriorities(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(memberId => {
          if (updated[memberId]?.priorities) {
            updated[memberId].priorities = updated[memberId].priorities.map(p =>
              p.id === priorityId 
                ? { ...p, attachments: [...(p.attachments || []), newAttachment] }
                : p
            );
          }
        });
        return updated;
      });
      
      setSuccess('Attachment uploaded successfully');
    } catch (error) {
      console.error('Failed to upload attachment:', error);
      setError('Failed to upload attachment');
    }
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getEffectiveTeamId(selectedDepartment?.id, user);
      
      if (!orgId || !teamId) {
        throw new Error('Organization or team not found');
      }
      
      await quarterlyPrioritiesService.downloadAttachment(
        orgId, 
        teamId, 
        attachment.priority_id, 
        attachment.id, 
        attachment.fileName || attachment.file_name
      );
    } catch (error) {
      console.error('Failed to download attachment:', error);
      setError('Failed to download attachment');
    }
  };

  const handleDeleteAttachment = async (priorityId, attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) {
      return;
    }
    
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getEffectiveTeamId(selectedDepartment?.id, user);
      
      if (!orgId || !teamId) {
        throw new Error('Organization or team not found');
      }
      
      await quarterlyPrioritiesService.deleteAttachment(orgId, teamId, priorityId, attachmentId);
      
      // Update local state instead of refetching
      const removeAttachment = (attachments) => 
        attachments?.filter(a => a.id !== attachmentId) || [];
      
      // Update company priorities
      setCompanyPriorities(prev => prev.map(p => 
        p.id === priorityId 
          ? { ...p, attachments: removeAttachment(p.attachments) }
          : p
      ));
      
      // Update team member priorities
      setTeamMemberPriorities(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(memberId => {
          if (updated[memberId]?.priorities) {
            updated[memberId].priorities = updated[memberId].priorities.map(p =>
              p.id === priorityId 
                ? { ...p, attachments: removeAttachment(p.attachments) }
                : p
            );
          }
        });
        return updated;
      });
      
      setSuccess('Attachment deleted successfully');
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      setError('Failed to delete attachment');
    }
  };

  const handlePriorityStatusChange = async (priorityId, newStatus) => {
    try {
      const orgId = user?.organizationId || user?.organization_id;
      const teamId = getEffectiveTeamId(selectedDepartment?.id, user);
      
      // Log for debugging
      console.log('Updating priority status:', { priorityId, newStatus, orgId, teamId });
      
      if (!orgId) {
        throw new Error('Organization ID not found');
      }
      
      if (!priorityId) {
        throw new Error('Priority ID not provided');
      }
      
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
          // Handle the nested structure: memberData.priorities
          if (updated[memberId] && updated[memberId].priorities && Array.isArray(updated[memberId].priorities)) {
            updated[memberId] = {
              ...updated[memberId],
              priorities: updated[memberId].priorities.map(p => 
                p.id === priorityId ? { ...p, status: newStatus } : p
              )
            };
          }
        });
        return updated;
      });
      
      // Update archived priorities if needed
      setArchivedQuarters(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(quarter => {
          if (updated[quarter] && updated[quarter].companyPriorities && Array.isArray(updated[quarter].companyPriorities)) {
            updated[quarter].companyPriorities = updated[quarter].companyPriorities.map(p =>
              p.id === priorityId ? { ...p, status: newStatus } : p
            );
          }
          if (updated[quarter] && updated[quarter].teamMemberPriorities) {
            Object.keys(updated[quarter].teamMemberPriorities).forEach(memberId => {
              const memberData = updated[quarter].teamMemberPriorities[memberId];
              if (memberData && memberData.priorities && Array.isArray(memberData.priorities)) {
                updated[quarter].teamMemberPriorities[memberId] = {
                  ...memberData,
                  priorities: memberData.priorities.map(p =>
                    p.id === priorityId ? { ...p, status: newStatus } : p
                  )
                };
              }
            });
          }
        });
        return updated;
      });
      
      // If the priority is marked as off-track, create an issue
      if (newStatus === 'off-track') {
        // Safely collect all priorities - handle both company and individual priorities
        const allCompanyPriorities = Array.isArray(companyPriorities) ? companyPriorities : [];
        
        // Extract individual priorities from teamMemberPriorities structure
        const allIndividualPriorities = [];
        Object.values(teamMemberPriorities).forEach(memberData => {
          if (memberData && memberData.priorities && Array.isArray(memberData.priorities)) {
            allIndividualPriorities.push(...memberData.priorities);
          }
        });
        
        const allPriorities = [...allCompanyPriorities, ...allIndividualPriorities];
        
        console.log('Looking for priority with ID:', priorityId);
        console.log('Company priorities:', allCompanyPriorities.length);
        console.log('Individual priorities:', allIndividualPriorities.length);
        console.log('Total priorities to search:', allPriorities.length);
        
        const priority = allPriorities.find(p => p.id === priorityId);
        
        if (priority) {
          // Ensure we have a valid title
          const priorityTitle = priority.title || priority.name || 'Untitled Priority';
          
          // Note: issuesService.createIssue expects a single issueData parameter
          // and gets orgId from localStorage internally
          const issueData = {
            title: `Off-Track Priority: ${priorityTitle}`,
            description: `Priority "${priorityTitle}" is off-track and needs attention.\n\nOriginal priority: ${priority.description || 'No description'}`,
            timeline: 'short_term',
            department_id: teamId, // issuesService expects department_id
            teamId: teamId, // Add teamId as well for compatibility
            ownerId: priority.owner_id || priority.ownerId || user?.id, // Backend expects ownerId
            status: 'open',
            priority_level: 'high',
            related_priority_id: priorityId
          };
          
          console.log('Creating issue with data:', issueData);
          
          await issuesService.createIssue(issueData);
          setSuccess('Issue created for off-track priority');
        } else {
          console.warn('Could not find priority with ID:', priorityId);
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
      // If viewing Leadership Team (check the is_leadership_team flag)
      if (selectedDepartment?.is_leadership_team === true) {
        // Count priorities that belong to Leadership Team
        return p.team_id === selectedDepartment.id || 
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
  // - Company priorities (always include in count since they can be created from individual priorities)
  // - Individual priorities for the current team
  const allPriorities = [
    ...companyPriorities,
    ...currentTeamIndividualPriorities
  ];
  
  console.log('Stats Debug:', {
    selectedTeam: selectedDepartment?.name,
    selectedTeamId: selectedDepartment?.id,
    isLeadershipTeam: isOnLeadershipTeam(),
    companyPrioritiesCount: companyPriorities.length,
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


  // Handler for toggling milestone completion
  const handleToggleMilestone = async (priorityId, milestoneId, completed) => {
    try {
      const orgId = user?.organizationId;
      const teamId = selectedDepartment?.id;
      
      if (!orgId || !teamId) return;
      
      await quarterlyPrioritiesService.updateMilestone(orgId, teamId, priorityId, milestoneId, { completed });
      
      // Update local state optimistically
      const updateMilestones = (milestones) => 
        milestones?.map(m => m.id === milestoneId ? { ...m, completed } : m) || [];
      
      setCompanyPriorities(prev => prev.map(p => 
        p.id === priorityId ? { ...p, milestones: updateMilestones(p.milestones) } : p
      ));
      
      setTeamMemberPriorities(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(memberId => {
          if (updated[memberId]?.priorities) {
            updated[memberId].priorities = updated[memberId].priorities.map(p =>
              p.id === priorityId ? { ...p, milestones: updateMilestones(p.milestones) } : p
            );
          }
        });
        return updated;
      });
      
      setSuccess('Milestone updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to toggle milestone:', error);
      setError('Failed to update milestone');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Handler for adding milestone
  const handleAddMilestone = async (priorityId) => {
    if (!newMilestone.title.trim()) return;
    
    try {
      const orgId = user?.organizationId;
      const teamId = selectedDepartment?.id;
      
      if (!orgId || !teamId) return;
      
      const milestone = await quarterlyPrioritiesService.createMilestone(
        orgId,
        teamId,
        priorityId,
        {
          title: newMilestone.title,
          dueDate: newMilestone.dueDate || format(addDays(new Date(), 30), 'yyyy-MM-dd')
        }
      );
      
      // Update local state
      const addMilestone = (milestones) => [...(milestones || []), milestone];
      
      setCompanyPriorities(prev => prev.map(p => 
        p.id === priorityId ? { ...p, milestones: addMilestone(p.milestones) } : p
      ));
      
      setTeamMemberPriorities(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(memberId => {
          if (updated[memberId]?.priorities) {
            updated[memberId].priorities = updated[memberId].priorities.map(p =>
              p.id === priorityId ? { ...p, milestones: addMilestone(p.milestones) } : p
            );
          }
        });
        return updated;
      });
      
      // Reset form
      setAddingMilestoneFor(null);
      setNewMilestone({ title: '', dueDate: '' });
      setSuccess('Milestone added');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to add milestone:', error);
      setError('Failed to add milestone');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Removed PriorityCard component - now using simple cards with modal
  const RemovedPriorityCard = ({ priority, isCompany = false, isArchived = false }) => {
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
            attachment.fileName || attachment.file_name
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
        
        // Add status to title if off-track
        const statusSuffix = priority.status === 'off-track'
          ? ' - OFF TRACK'
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
        <Card 
          className="transition-all duration-300 hover:shadow-lg hover:scale-[1.01] bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200"
          style={getStatusBorderStyle(isEditing ? editForm.status : priority.status)}
        >
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={getStatusDotColor(isEditing ? editForm.status : priority.status)} />
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
                                  ? '' 
                                  : getDaysUntilDue(milestone.dueDate || milestone.due_date) < 0
                                  ? 'bg-red-500'
                                  : 'bg-gray-400'
                              }`} style={milestone.completed ? { backgroundColor: themeColors.primary } : {}} />
                              <span className={`truncate ${
                                milestone.completed 
                                  ? 'text-gray-500 line-through' 
                                  : 'text-gray-700'
                              }`} style={milestone.completed ? { textDecorationColor: themeColors.primary } : {}}>
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
                    <Badge 
                      variant="outline" 
                      className="text-xs"
                      style={{ 
                        backgroundColor: themeColors.accent + '15',
                        color: themeColors.secondary,
                        borderColor: themeColors.accent + '40'
                      }}
                    >
                      <Building2 className="h-3 w-3 mr-1" style={{ color: themeColors.primary }} />
                      Company
                    </Badge>
                  )}
                  
                  {(() => {
                    // Debug logging
                    console.log('[QuarterlyPrioritiesPageClean] Checking overdue for:', priority.title);
                    console.log('[QuarterlyPrioritiesPageClean] Milestones:', priority.milestones);
                    
                    const overdueMilestones = (priority.milestones || []).filter(
                      m => {
                        const daysUntil = getDaysUntilDue(m.dueDate || m.due_date);
                        console.log('[QuarterlyPrioritiesPageClean] Milestone:', {
                          title: m.title,
                          dueDate: m.dueDate || m.due_date,
                          completed: m.completed,
                          daysUntil,
                          isOverdue: !m.completed && daysUntil < 0
                        });
                        return !m.completed && daysUntil < 0;
                      }
                    );
                    console.log('[QuarterlyPrioritiesPageClean] Overdue count:', overdueMilestones.length);
                    
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
                        'border-gray-300 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full" style={getStatusDotColor(priority.status)} />
                      <span className="capitalize font-medium">
                        {(priority.status || 'on-track').replace('-', ' ')}
                      </span>
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={getStatusDotColor(isEditing ? editForm.status : priority.status)} />
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
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                    >
                      <Save className="h-4 w-4" style={{ color: themeColors.primary }} />
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
                      className="h-8 w-8 p-0 transition-colors"
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeColors.accent + '20'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                    >
                      <Edit className="h-4 w-4" style={{ color: themeColors.primary }} />
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
                      <SelectTrigger className="h-9 bg-white">
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
                      <SelectTrigger className="h-9 bg-white">
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
                      <div className="w-2 h-2 rounded-full" style={getStatusDotColor(priority.status)} />
                      <span className="text-sm text-gray-900 capitalize">{priority.status.replace('-', ' ')}</span>
                    </div>
                  )}
                </div>

                {/* Only show progress if milestones exist */}
                {(priority.milestones && priority.milestones.length > 0) && (
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
                          <Progress value={(priority.status === 'complete' || priority.status === 'completed') ? 100 : priority.progress} className="h-2 max-w-[200px]" />
                          <span className="text-sm font-medium text-gray-900">{(priority.status === 'complete' || priority.status === 'completed') ? 100 : priority.progress}%</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Company/Individual {labels.priorities_label.slice(0, -1)} Toggle (only in edit mode) */}
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
                    className="text-xs h-7"
                    style={{ 
                      color: themeColors.primary
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = themeColors.primary + '15'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
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
                        className="rounded border-gray-300 focus:ring-2"
                        style={{ 
                          accentColor: themeColors.primary
                        }}
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
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                          >
                            <CheckSquare className="h-3 w-3" style={{ color: themeColors.primary }} />
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
                          <span className={`text-sm flex-1 ${milestone.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}
                            style={milestone.completed ? { textDecorationColor: themeColors.primary } : {}}>
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
                              className="h-7 w-7 p-0"
                              onMouseEnter={(e) => e.target.style.backgroundColor = themeColors.primary + '15'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              <Edit className="h-3 w-3" style={{ color: themeColors.primary }} />
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
                    <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: themeColors.primary + '10' }}>
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
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                      >
                        <CheckSquare className="h-3 w-3" style={{ color: themeColors.primary }} />
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
                          ? "text-xs text-white" 
                          : "text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                        }
                        style={issueCreatedSuccess ? { 
                          backgroundColor: themeColors.primary,
                          borderColor: themeColors.primary
                        } : {}}
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
                      className="text-xs h-7"
                    style={{ 
                      color: themeColors.primary
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = themeColors.primary + '15'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
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
                        className="text-xs h-7"
                    style={{ 
                      color: themeColors.primary
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = themeColors.primary + '15'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
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
                            <span className="text-sm text-gray-900 truncate">{attachment.fileName || attachment.file_name}</span>
                            <span className="text-xs text-gray-500">
                              ({(attachment.fileSize || attachment.file_size) ? `${((attachment.fileSize || attachment.file_size) / 1024).toFixed(1)} KB` : 'Unknown size'})
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadAttachment(attachment)}
                              className="h-7 w-7 p-0"
                              onMouseEnter={(e) => e.target.style.backgroundColor = themeColors.primary + '15'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              <Download className="h-4 w-4" style={{ color: themeColors.primary }} />
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

  // Note: toggleIndividualPriorities and togglePriorityExpansion are defined inside the IIFE below

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Enhanced Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
                   style={{
                     background: `linear-gradient(135deg, ${themeColors.primary}15 0%, ${themeColors.secondary}15 100%)`,
                     color: themeColors.primary
                   }}>
                <Sparkles className="h-4 w-4" />
                QUARTERLY EXECUTION
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                {selectedDepartment.name} {labels.priorities_label}
              </h1>
              {showArchived && (
                <p className="text-slate-600 mt-2">
                  Viewing archived priorities from previous quarters
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {!showArchived && (
                <>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={expandAll}
                    className="bg-white/80 backdrop-blur-sm border border-slate-200 hover:shadow-md hover:scale-[1.02] transition-all rounded-lg"
                  >
                    <ChevronDown className="mr-2 h-4 w-4" style={{ color: themeColors.primary }} />
                    Expand All
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={collapseAll}
                    className="bg-white/80 backdrop-blur-sm border border-slate-200 hover:shadow-md hover:scale-[1.02] transition-all rounded-lg"
                  >
                    <ChevronRight className="mr-2 h-4 w-4" style={{ color: themeColors.primary }} />
                    Collapse All
                  </Button>
                </>
              )}
              <Button 
                variant={showArchived ? "default" : "outline"}
                onClick={() => setShowArchived(!showArchived)}
                className={showArchived 
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all transform hover:scale-[1.02]"
                  : "bg-white/80 backdrop-blur-sm border border-slate-200 hover:shadow-md hover:scale-[1.02] transition-all rounded-lg"
                }
              >
                {showArchived ? 'View Current' : 'View Archive'}
              </Button>
              {!showArchived && (
                <>
                  <Button 
                    variant="outline"
                    disabled={true}
                    onClick={() => navigate(`/organizations/${organization?.id || localStorage.getItem('organizationId')}/smart-rock-assistant`)}
                    className="bg-gray-100 backdrop-blur-sm border border-gray-200 opacity-50 cursor-not-allowed rounded-lg"
                    title="SMART Assistant - Coming Soon"
                  >
                    <Brain className="mr-2 h-4 w-4 text-gray-400" />
                    SMART Assistant (Testing)
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
                    className="text-white rounded-lg transition-all transform hover:scale-[1.02] hover:shadow-md"
                    style={{
                      background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add {labels.priority}
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
                        <Building2 className="h-6 w-6" style={{ color: themeColors.primary }} />
                        <h3 className="text-xl font-semibold text-gray-900">Company {labels.priorities}</h3>
                      </div>
                      <div className="space-y-4">
                        {quarterData.companyPriorities.map(priority => {
                          const isComplete = priority.status === 'complete' || priority.status === 'completed';
                          
                          return (
                            <Card 
                              key={priority.id}
                              className={`max-w-5xl ${
                                isComplete 
                                  ? 'border-slate-200' 
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                              style={{
                                backgroundColor: isComplete ? `${themeColors.primary}10` : undefined
                              }}
                            >
                              <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                      {isComplete ? (
                                        <CheckCircle className="h-5 w-5" style={{ color: themeColors.primary }} />
                                      ) : (
                                        <Archive className="h-5 w-5 text-gray-400" />
                                      )}
                                      <h3 className={`text-lg font-semibold ${
                                        isComplete ? 'line-through' : 'text-gray-700'
                                      }`} style={isComplete ? { textDecorationColor: themeColors.primary } : {}}>
                                        {priority.title}
                                      </h3>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-2">
                                      Owner: {priority.owner?.name || 'Unassigned'} • 
                                      Progress: {isComplete ? 100 : (priority.progress || 0)}%
                                    </p>
                                  </div>
                                  {/* Always show status badge */}
                                  <Badge 
                                    className={`${
                                      isComplete ? 'text-white' :
                                      priority.status === 'off-track' ? 'bg-red-100 text-red-800' :
                                      'text-white'
                                    }`}
                                    style={{
                                      backgroundColor: isComplete || priority.status === 'on-track' ? themeColors.primary : undefined,
                                      borderColor: isComplete || priority.status === 'on-track' ? themeColors.primary : undefined,
                                      opacity: isComplete || priority.status === 'on-track' ? 0.9 : undefined
                                    }}
                                  >
                                    {isComplete ? 'Complete' :
                                     priority.status === 'off-track' ? 'Off Track' : 'On Track'}
                                  </Badge>
                                </div>
                              </CardHeader>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Individual Priorities for this quarter */}
                  {Object.keys(quarterData.teamMemberPriorities).length > 0 && (
                    <div className="space-y-8">
                      <div className="flex items-center gap-3">
                        <Users className="h-6 w-6" style={{ color: themeColors.secondary }} />
                        <h3 className="text-xl font-semibold text-gray-900">Individual {labels.priorities_label}</h3>
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
                            {priorities.map(priority => {
                              const isComplete = priority.status === 'complete' || priority.status === 'completed';
                              
                              return (
                                <Card 
                                  key={priority.id}
                                  className={`max-w-5xl ${
                                    isComplete 
                                      ? 'border-slate-200' 
                                      : 'bg-gray-50 border-gray-200'
                                  }`}
                                  style={{
                                    backgroundColor: isComplete ? `${themeColors.primary}10` : undefined
                                  }}
                                >
                                  <CardHeader className="pb-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                          {isComplete ? (
                                            <CheckCircle className="h-5 w-5" style={{ color: themeColors.primary }} />
                                          ) : (
                                            <Archive className="h-5 w-5 text-gray-400" />
                                          )}
                                          <h3 className={`text-lg font-semibold ${
                                            isComplete ? 'line-through' : 'text-gray-700'
                                          }`} style={isComplete ? { textDecorationColor: themeColors.primary } : {}}>
                                            {priority.title}
                                          </h3>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-2">
                                          Progress: {isComplete ? 100 : (priority.progress || 0)}%
                                        </p>
                                      </div>
                                      {/* Always show status badge */}
                                      <Badge 
                                        className={`${
                                          isComplete ? 'text-white' :
                                          priority.status === 'off-track' ? 'bg-red-100 text-red-800' :
                                          'text-white'
                                        }`}
                                        style={{
                                          backgroundColor: isComplete || priority.status === 'on-track' ? themeColors.primary : undefined,
                                          borderColor: isComplete || priority.status === 'on-track' ? themeColors.primary : undefined,
                                          opacity: isComplete || priority.status === 'on-track' ? 0.9 : undefined
                                        }}
                                      >
                                        {isComplete ? 'Complete' :
                                         priority.status === 'off-track' ? 'Off Track' : 'On Track'}
                                      </Badge>
                                    </div>
                                  </CardHeader>
                                </Card>
                              );
                            })}
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
          {/* Employee-Centric Rock View */}
          {(() => {
            // Combine all priorities (company and individual)
            const allPriorities = [
              ...companyPriorities,
              ...Object.values(teamMemberPriorities).flatMap(member => member?.priorities || [])
            ];
            
            // Toggle function for priority expansion
            const togglePriorityExpansion = (priorityId, e) => {
              if (e) e.stopPropagation();
              setExpandedPriorities(prev => ({
                ...prev,
                [priorityId]: !prev[priorityId]
              }));
            };
            
            // Group priorities based on organization preference
            console.log('🔧 Rock display preference:', rockDisplayPreference);
            console.log('🔧 Organization data:', organization);
            const groupedRocks = groupRocksByPreference(allPriorities, rockDisplayPreference, teamMembers);
            console.log('🔧 Grouped rocks result:', groupedRocks);
            
            if (allPriorities.length === 0) {
              return (
                <Card className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl">
                  <CardContent className="text-center py-8">
                    <p className="text-slate-500 font-medium">No {labels.priorities_label?.toLowerCase() || 'priorities'} found for this quarter.</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setShowAddPriority(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add {labels.priority || 'Priority'}
                    </Button>
                  </CardContent>
                </Card>
              );
            }
            
            return (
              <div className="space-y-6">
                {/* Render based on display preference */}
                {(() => {
                  console.log('🔧 Rendering rocks with displayMode:', groupedRocks.displayMode);
                  return groupedRocks.displayMode === 'type' ? (
                    // Grouped by Type: Company Rocks, then Individual Rocks
                  groupedRocks.sections.map(section => (
                    !section.isEmpty && (
                      <div key={section.type} className="space-y-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-px bg-gradient-to-r from-slate-300 to-transparent flex-1"></div>
                          <h3 className="text-lg font-bold text-slate-700 px-4 py-2 bg-white/80 rounded-xl border border-slate-200 shadow-sm">
                            {getSectionHeader(section.type, methodology)}
                          </h3>
                          <div className="h-px bg-gradient-to-l from-slate-300 to-transparent flex-1"></div>
                        </div>
                        
                        {section.rocks.map(priority => {
                          const isComplete = priority.status === 'complete' || priority.status === 'completed';
                          const isOnTrack = priority.status === 'on-track';
                          const completedMilestones = (priority.milestones || []).filter(m => m.completed).length;
                          const totalMilestones = (priority.milestones || []).length;
                          const isExpanded = expandedPriorities[priority.id];
                          const ownerName = priority.owner?.name || 'Unassigned';
                          
                          return (
                            <Card key={priority.id} className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-3 flex-1">
                                    <button
                                      onClick={(e) => togglePriorityExpansion(priority.id, e)}
                                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    >
                                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                      priority.status === 'cancelled' ? 'bg-gray-400' :
                                      isComplete ? 'bg-green-500' : 
                                      isOnTrack ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}></div>
                                    
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-slate-900">{priority.title}</h4>
                                        <span className="text-sm text-slate-500">({ownerName})</span>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 text-sm">
                                      <div className="text-center">
                                        <div className="font-medium">{completedMilestones}/{totalMilestones}</div>
                                        <div className="text-xs text-slate-500">milestones</div>
                                      </div>
                                      <div className="text-right text-slate-600">
                                        {priority.due_date ? format(new Date(priority.due_date), 'MMM d') : '-'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )
                  ))
                ) : (
                  // Grouped by Owner: Current behavior with Company badge
                  Object.values(groupedRocks.byOwner || {}).sort((a, b) => a.name.localeCompare(b.name)).map(owner => (
                  <Card key={owner.id} className="bg-white border-slate-200 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-slate-100">
                            <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 font-semibold">
                              {owner.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">{owner.name}</h3>
                            <p className="text-sm text-slate-500">{owner.rocks.length} {labels?.priority_singular || 'Rock'}{owner.rocks.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1">
                        {/* Header Row */}
                        <div className="flex items-center px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100">
                          <div className="w-8"></div>
                          <div className="w-10 ml-2">Status</div>
                          <div className="flex-1 ml-3">Title</div>
                          <div className="w-40 text-center">Milestone Progress</div>
                          <div className="w-20 text-right">Due By</div>
                          <div className="w-8"></div>
                        </div>
                        
                        {/* Rock Rows */}
                        {owner.rocks.map(priority => {
                          const isComplete = priority.status === 'complete' || priority.status === 'completed';
                          const isOnTrack = priority.status === 'on-track';
                          const completedMilestones = (priority.milestones || []).filter(m => m.completed).length;
                          const totalMilestones = (priority.milestones || []).length;
                          const isExpanded = expandedPriorities[priority.id];
                          
                          return (
                            <div key={priority.id} className="border-b border-slate-100 last:border-0">
                              {/* Main Rock Row */}
                              <div className="flex items-center px-3 py-3 hover:bg-slate-50 rounded-lg transition-colors group">
                                {/* Expand Arrow */}
                                <div 
                                  className="w-8 flex items-center justify-center cursor-pointer"
                                  onClick={(e) => togglePriorityExpansion(priority.id, e)}
                                >
                                  <ChevronRight 
                                    className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                                      isExpanded ? 'rotate-90' : ''
                                    }`} 
                                  />
                                </div>
                                
                                {/* Status Indicator with Dropdown */}
                                <div className="w-10 ml-2 flex items-center relative status-dropdown">
                                  <div 
                                    className="flex items-center justify-center w-7 h-7 rounded-full cursor-pointer hover:scale-110 transition-transform"
                                    style={{
                                      backgroundColor: 
                                        priority.status === 'cancelled' ? '#6B728020' :
                                        isComplete ? themeColors.primary + '20' : 
                                        (isOnTrack ? '#10B98120' : '#EF444420'),
                                      border: `2px solid ${
                                        priority.status === 'cancelled' ? '#6B7280' :
                                        isComplete ? themeColors.primary : 
                                        (isOnTrack ? '#10B981' : '#EF4444')
                                      }`
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenStatusDropdown(openStatusDropdown === priority.id ? null : priority.id);
                                    }}
                                  >
                                    {priority.status === 'cancelled' ? (
                                      <X className="h-4 w-4 text-gray-500" />
                                    ) : isComplete ? (
                                      <CheckCircle className="h-4 w-4" style={{ color: themeColors.primary }} />
                                    ) : isOnTrack ? (
                                      <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <X className="h-4 w-4 text-red-600" />
                                    )}
                                  </div>
                                  
                                  {/* Status Dropdown */}
                                  {openStatusDropdown === priority.id && (
                                    <div className="absolute top-8 left-0 z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px]">
                                      <button
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await handleUpdatePriority(priority.id, { status: 'on-track' });
                                          setOpenStatusDropdown(null);
                                        }}
                                      >
                                        <div className="w-4 h-4 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center">
                                          {priority.status === 'on-track' && <Check className="h-3 w-3 text-green-600" />}
                                        </div>
                                        <span className={priority.status === 'on-track' ? 'font-medium' : ''}>On Track</span>
                                      </button>
                                      
                                      <button
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await handleUpdatePriority(priority.id, { status: 'off-track' });
                                          setOpenStatusDropdown(null);
                                        }}
                                      >
                                        <div className="w-4 h-4 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center">
                                          {priority.status === 'off-track' && <X className="h-3 w-3 text-red-600" />}
                                        </div>
                                        <span className={priority.status === 'off-track' ? 'font-medium' : ''}>Off Track</span>
                                      </button>
                                      
                                      <button
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await handleUpdatePriority(priority.id, { status: 'complete' });
                                          setOpenStatusDropdown(null);
                                        }}
                                      >
                                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                                             style={{ 
                                               backgroundColor: themeColors.primary + '20',
                                               borderColor: themeColors.primary 
                                             }}>
                                          {priority.status === 'complete' && <CheckCircle className="h-3 w-3" style={{ color: themeColors.primary }} />}
                                        </div>
                                        <span className={priority.status === 'complete' ? 'font-medium' : ''}>Complete</span>
                                      </button>
                                      
                                      <div className="border-t border-slate-100 my-1"></div>
                                      
                                      <button
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await handleUpdatePriority(priority.id, { status: 'cancelled' });
                                          setOpenStatusDropdown(null);
                                        }}
                                      >
                                        <div className="w-4 h-4 rounded-full bg-gray-100 border-2 border-gray-500 flex items-center justify-center">
                                          {priority.status === 'cancelled' && <X className="h-3 w-3 text-gray-500" />}
                                        </div>
                                        <span className={priority.status === 'cancelled' ? 'font-medium' : ''}>Cancelled</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Title */}
                                <div 
                                  className="flex-1 ml-3 cursor-pointer"
                                  onClick={() => {
                                    setSelectedPriority(priority);
                                    setShowPriorityDialog(true);
                                  }}
                                >
                                  <span className={`font-medium ${isComplete ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                    {priority.title}
                                  </span>
                                  {priority.is_company_rock && (
                                    <Badge variant="outline" className="ml-2 text-xs">Company</Badge>
                                  )}
                                </div>
                                
                                {/* Milestone Progress */}
                                <div className="w-40 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-sm text-slate-600">
                                      {completedMilestones}/{totalMilestones}
                                    </span>
                                    <Progress value={totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0} className="w-16 h-2" />
                                  </div>
                                </div>
                                
                                {/* Due Date */}
                                <div className="w-20 text-right">
                                  <span className="text-sm text-slate-600">
                                    {priority.dueDate ? format(new Date(priority.dueDate), 'MMM d') : '-'}
                                  </span>
                                </div>
                                
                                {/* Actions */}
                                <div className="w-8 flex items-center justify-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => {
                                      setSelectedPriority(priority);
                                      setShowPriorityDialog(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4 text-slate-400" />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Expanded Milestones Section */}
                              {isExpanded && (
                                <div className="ml-12 mr-4 mb-3 p-3 bg-slate-50 rounded-lg">
                                  <div className="space-y-2">
                                    {(priority.milestones || []).map(milestone => (
                                      <div key={milestone.id} className="flex items-center gap-3">
                                        <Checkbox
                                          checked={milestone.completed}
                                          onCheckedChange={async (checked) => {
                                            await handleToggleMilestone(priority.id, milestone.id, checked);
                                          }}
                                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                        />
                                        <span className={`text-sm flex-1 ${milestone.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                          {milestone.title}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                          {milestone.dueDate ? format(new Date(milestone.dueDate), 'MMM d') : ''}
                                        </span>
                                      </div>
                                    ))}
                                    
                                    {/* Add Milestone Inline */}
                                    {addingMilestoneFor === priority.id ? (
                                      <div className="flex items-center gap-2 mt-2">
                                        <Input
                                          value={newMilestone.title}
                                          onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                                          placeholder="Milestone description..."
                                          className="flex-1 h-8 text-sm"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newMilestone.title.trim()) {
                                              handleAddMilestone(priority.id);
                                            }
                                            if (e.key === 'Escape') {
                                              setAddingMilestoneFor(null);
                                              setNewMilestone({ title: '', dueDate: '' });
                                            }
                                          }}
                                        />
                                        <Input
                                          type="date"
                                          value={newMilestone.dueDate}
                                          onChange={(e) => setNewMilestone(prev => ({ ...prev, dueDate: e.target.value }))}
                                          className="w-32 h-8 text-sm"
                                        />
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 w-8 p-0 hover:bg-green-100"
                                          onClick={() => handleAddMilestone(priority.id)}
                                        >
                                          <Check className="h-4 w-4 text-green-600" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 w-8 p-0 hover:bg-red-100"
                                          onClick={() => {
                                            setAddingMilestoneFor(null);
                                            setNewMilestone({ title: '', dueDate: '' });
                                          }}
                                        >
                                          <X className="h-4 w-4 text-red-600" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <button
                                        className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mt-2"
                                        onClick={() => {
                                          setAddingMilestoneFor(priority.id);
                                          setNewMilestone({ 
                                            title: '', 
                                            dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd')
                                          });
                                        }}
                                      >
                                        <Plus className="h-3 w-3" />
                                        Add Milestone
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))
                  );
                })()}
              </div>
            );
          })()}
        </div>
      )}
      
      <Dialog open={showAddPriority} onOpenChange={setShowAddPriority}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-lg border border-white/50">
          <DialogHeader>
            <DialogTitle>Add New {labels.priority}</DialogTitle>
            <DialogDescription>
              Create a new {labels.priority.toLowerCase()} for {getCurrentPeriodDisplay()}
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
                className="mt-2 bg-white"
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
                className="mt-2 bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="owner" className="text-sm font-medium">Owner</Label>
                <Select
                  value={priorityForm.ownerId}
                  onValueChange={(value) => setPriorityForm({ ...priorityForm, ownerId: value })}
                >
                  <SelectTrigger className="mt-2 bg-white">
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
                  className="mt-2 bg-white"
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
            
            {/* Milestones Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Milestones</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddMilestoneInDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Milestone
                </Button>
              </div>
              
              {addPriorityMilestones.length > 0 && (
                <div className="space-y-2">
                  {addPriorityMilestones.map((milestone, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{milestone.title}</p>
                        {milestone.dueDate && (
                          <p className="text-sm text-gray-500">
                            Due: {format(new Date(milestone.dueDate), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAddPriorityMilestones(prev => prev.filter((_, i) => i !== index));
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {showAddMilestoneInDialog && (
                <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                  <Input
                    placeholder="Milestone title"
                    value={addMilestoneForm.title}
                    onChange={(e) => setAddMilestoneForm({ ...addMilestoneForm, title: e.target.value })}
                    autoFocus
                  />
                  <Input
                    type="date"
                    value={addMilestoneForm.dueDate}
                    onChange={(e) => setAddMilestoneForm({ ...addMilestoneForm, dueDate: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (addMilestoneForm.title.trim()) {
                          setAddPriorityMilestones(prev => [...prev, { ...addMilestoneForm }]);
                          setAddMilestoneForm({ title: '', dueDate: '' });
                          setShowAddMilestoneInDialog(false);
                        }
                      }}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAddMilestoneForm({ title: '', dueDate: '' });
                        setShowAddMilestoneInDialog(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPriority(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePriority}
              disabled={loading}
              className="text-white"
              style={{
                background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
              }}
            >
              {loading ? (
                <>Creating...</>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create {labels.priority}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Priority Details Dialog */}
      {selectedPriority && (
        <PriorityDialog
          open={showPriorityDialog}
          onOpenChange={setShowPriorityDialog}
          priority={selectedPriority}
          teamMembers={teamMembers}
          onSave={async (updates) => {
            await handleUpdatePriority(selectedPriority.id, updates);
            setShowPriorityDialog(false);
          }}
          onUpdate={handleUpdatePriority}
          onArchive={async (priorityId) => {
            await handleArchivePriority(priorityId);
            setShowPriorityDialog(false);
          }}
          onAddMilestone={handleCreateMilestone}
          onEditMilestone={handleEditMilestone}
          onToggleMilestone={handleUpdateMilestone}
          onDeleteMilestone={handleDeleteMilestone}
          onAddUpdate={handleAddUpdate}
          onEditUpdate={handleEditUpdate}
          onDeleteUpdate={handleDeleteUpdate}
          onUploadAttachment={handleUploadAttachment}
          onDownloadAttachment={handleDownloadAttachment}
          onDeleteAttachment={handleDeleteAttachment}
        />
      )}
    </div>
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