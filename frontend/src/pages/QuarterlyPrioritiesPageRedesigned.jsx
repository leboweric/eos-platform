import { useState, useEffect, Component } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { quarterlyPrioritiesService } from '../services/quarterlyPrioritiesService';
import { organizationService } from '../services/organizationService';
import { issuesService } from '../services/issuesService';
import { useDepartment } from '../contexts/DepartmentContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Brain, AlertCircle, Archive, Building2, Users } from 'lucide-react';

// Import redesigned components
import QuarterlyStatsCards from '../components/quarterly-priorities/QuarterlyStatsCards';
import PriorityFilters from '../components/quarterly-priorities/PriorityFilters';
import PrioritySection from '../components/quarterly-priorities/PrioritySection';

// Import original dialog for backward compatibility
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Error Boundary Component (unchanged)
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

const QuarterlyPrioritiesPageRedesigned = () => {
  const navigate = useNavigate();
  const { user, isOnLeadershipTeam } = useAuthStore();
  const { selectedDepartment, loading: departmentLoading } = useDepartment();
  
  // Core data state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [companyPriorities, setCompanyPriorities] = useState([]);
  const [teamMemberPriorities, setTeamMemberPriorities] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  const [archivedQuarters, setArchivedQuarters] = useState({});
  
  // View state
  const [activeTab, setActiveTab] = useState('current');
  const [density, setDensity] = useState('comfortable');
  const [expandedSections, setExpandedSections] = useState({
    companyPriorities: false,
    individualPriorities: {}
  });
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Dialog states
  const [showAddPriority, setShowAddPriority] = useState(false);
  const [priorityForm, setPriorityForm] = useState({
    title: '',
    description: '',
    ownerId: '',
    dueDate: '',
    isCompanyPriority: false
  });

  // Fetch data when department or tab changes
  useEffect(() => {
    if (selectedDepartment) {
      fetchQuarterlyData();
    }
    fetchOrganization();
  }, [selectedDepartment, activeTab]);

  const fetchQuarterlyData = async () => {
    setLoading(true);
    setError(null);
    try {
      const orgId = user?.organizationId;
      const teamId = selectedDepartment?.id;
      
      if (!orgId || !teamId) {
        throw new Error('No organization or department selected');
      }
      
      if (activeTab === 'archived') {
        const archivedData = await quarterlyPrioritiesService.getArchivedPriorities(orgId, teamId);
        setArchivedQuarters(archivedData || {});
        setCompanyPriorities([]);
        setTeamMemberPriorities({});
        setTeamMembers([]);
      } else {
        const data = await quarterlyPrioritiesService.getCurrentPriorities(orgId, teamId);
        setCompanyPriorities(data.companyPriorities || []);
        setTeamMemberPriorities(data.teamMemberPriorities || {});
        setTeamMembers(data.teamMembers || []);
        setArchivedQuarters({});
      }
    } catch (err) {
      console.error('Failed to fetch quarterly data:', err);
      setError('Failed to load data. Please try again later.');
      
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

  // Filter and search functions
  const filterPriorities = (priorities) => {
    return priorities.filter(priority => {
      // Text search
      if (searchQuery && !priority.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !priority.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Status filter
      if (statusFilter !== 'all' && priority.status !== statusFilter) {
        return false;
      }
      
      // Owner filter
      if (ownerFilter !== 'all' && priority.owner?.id !== ownerFilter) {
        return false;
      }
      
      return true;
    });
  };

  // Event handlers
  const handleUpdatePriority = async (priorityId, updates) => {
    try {
      const orgId = user?.organizationId;
      const teamId = selectedDepartment?.id;
      
      if (!orgId || !teamId) {
        throw new Error('Organization or department not found');
      }
      
      await quarterlyPrioritiesService.updatePriority(orgId, teamId, priorityId, updates);
      await fetchQuarterlyData();
    } catch (err) {
      console.error('Failed to update priority:', err);
      setError('Failed to save changes: ' + err.message);
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
      await fetchQuarterlyData();
    } catch (err) {
      console.error('Failed to archive priority:', err);
      setError('Failed to archive item');
    }
  };

  const handleCreatePriority = async () => {
    try {
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
        isCompanyPriority: false
      });
      
      await fetchQuarterlyData();
    } catch (err) {
      console.error('Failed to create priority:', err);
      setError('Failed to create item');
    }
  };

  // View control functions
  const toggleSection = (sectionKey, memberId = null) => {
    if (memberId) {
      setExpandedSections(prev => ({
        ...prev,
        individualPriorities: {
          ...prev.individualPriorities,
          [memberId]: !prev.individualPriorities[memberId]
        }
      }));
    } else {
      setExpandedSections(prev => ({
        ...prev,
        [sectionKey]: !prev[sectionKey]
      }));
    }
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

  // Get all priorities for stats
  const allPriorities = [
    ...(isOnLeadershipTeam() ? companyPriorities : []),
    ...Object.values(teamMemberPriorities).flatMap(memberData => memberData?.priorities || [])
  ];

  const filteredCompanyPriorities = filterPriorities(companyPriorities);
  const filteredTeamMemberPriorities = {};
  Object.keys(teamMemberPriorities).forEach(memberId => {
    const priorities = teamMemberPriorities[memberId]?.priorities || [];
    const filtered = filterPriorities(priorities);
    if (filtered.length > 0) {
      filteredTeamMemberPriorities[memberId] = {
        ...teamMemberPriorities[memberId],
        priorities: filtered
      };
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (departmentLoading || !selectedDepartment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{selectedDepartment.name} Quarterly Priorities</h1>
          <p className="text-gray-600 mt-1">
            Manage and track quarterly priorities and goals
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline"
            onClick={() => navigate(`/organizations/${organization?.id || localStorage.getItem('organizationId')}/smart-rock-assistant`)}
          >
            <Brain className="mr-2 h-4 w-4" />
            SMART Assistant
          </Button>
          <Button onClick={() => {
            setPriorityForm({
              ...priorityForm,
              ownerId: user?.id || ''
            });
            setShowAddPriority(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Priority
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="current" className="flex items-center space-x-2">
            <span>Current</span>
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center space-x-2">
            <Archive className="h-4 w-4" />
            <span>Archived</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-6">
          {/* Stats Cards */}
          <QuarterlyStatsCards priorities={allPriorities} />

          {/* Filters */}
          <PriorityFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            ownerFilter={ownerFilter}
            onOwnerFilterChange={setOwnerFilter}
            teamMembers={teamMembers}
            density={density}
            onDensityChange={setDensity}
            expandedSections={expandedSections}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
          />

          {/* Priority Sections */}
          <div className="space-y-8">
            {/* Company Priorities - Only show for Leadership Team */}
            {isOnLeadershipTeam() && filteredCompanyPriorities.length > 0 && (
              <PrioritySection
                title="Company Priorities"
                icon={Building2}
                iconColor="text-blue-600"
                priorities={filteredCompanyPriorities}
                isExpanded={expandedSections.companyPriorities}
                onToggleExpanded={() => toggleSection('companyPriorities')}
                density={density}
                teamMembers={teamMembers}
                user={user}
                selectedDepartment={selectedDepartment}
                onUpdate={handleUpdatePriority}
                onArchive={handleArchivePriority}
              />
            )}

            {/* Individual Priorities */}
            {Object.keys(filteredTeamMemberPriorities).length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-6 w-6 text-purple-600" />
                  <h2 className="text-2xl font-bold">Individual Priorities</h2>
                </div>
                {Object.entries(filteredTeamMemberPriorities).map(([memberId, memberData]) => {
                  const member = teamMembers.find(m => m.id === memberId);
                  if (!member) return null;

                  return (
                    <PrioritySection
                      key={memberId}
                      title={member.name}
                      icon={Users}
                      iconColor="text-purple-600"
                      priorities={memberData.priorities}
                      isExpanded={expandedSections.individualPriorities[memberId]}
                      onToggleExpanded={() => toggleSection('individualPriorities', memberId)}
                      density={density}
                      teamMembers={teamMembers}
                      user={user}
                      selectedDepartment={selectedDepartment}
                      showOwnerInfo={true}
                      ownerInfo={{
                        name: member.name,
                        role: member.role,
                        department: member.department
                      }}
                      onUpdate={handleUpdatePriority}
                      onArchive={handleArchivePriority}
                    />
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {filteredCompanyPriorities.length === 0 && Object.keys(filteredTeamMemberPriorities).length === 0 && (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Plus className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No priorities found</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery || statusFilter !== 'all' || ownerFilter !== 'all'
                    ? 'Try adjusting your filters or search terms.'
                    : 'Get started by creating your first quarterly priority.'
                  }
                </p>
                {(!searchQuery && statusFilter === 'all' && ownerFilter === 'all') && (
                  <Button onClick={() => setShowAddPriority(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Priority
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="archived" className="space-y-6">
          <div className="space-y-8">
            {Object.entries(archivedQuarters).length === 0 ? (
              <div className="text-center py-12">
                <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No archived priorities found</p>
              </div>
            ) : (
              Object.entries(archivedQuarters)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([quarterKey, quarterData]) => (
                  <div key={quarterKey} className="space-y-6">
                    <div className="border-b pb-2">
                      <h2 className="text-2xl font-bold">{quarterKey}</h2>
                    </div>
                    
                    {/* Archived company priorities */}
                    {isOnLeadershipTeam() && quarterData.companyPriorities.length > 0 && (
                      <PrioritySection
                        title="Company Priorities"
                        icon={Building2}
                        iconColor="text-blue-600"
                        priorities={quarterData.companyPriorities}
                        isExpanded={true}
                        onToggleExpanded={() => {}}
                        density={density}
                        teamMembers={teamMembers}
                        user={user}
                        selectedDepartment={selectedDepartment}
                        isArchived={true}
                      />
                    )}
                    
                    {/* Archived individual priorities */}
                    {Object.keys(quarterData.teamMemberPriorities).length > 0 && (
                      <div className="space-y-6">
                        <div className="flex items-center space-x-2">
                          <Users className="h-6 w-6 text-purple-600" />
                          <h3 className="text-xl font-semibold">Individual Priorities</h3>
                        </div>
                        {Object.entries(quarterData.teamMemberPriorities).map(([memberId, priorities]) => {
                          const firstPriority = priorities[0];
                          return (
                            <PrioritySection
                              key={memberId}
                              title={firstPriority.owner.name}
                              icon={Users}
                              iconColor="text-purple-600"
                              priorities={priorities}
                              isExpanded={true}
                              onToggleExpanded={() => {}}
                              density={density}
                              teamMembers={teamMembers}
                              user={user}
                              selectedDepartment={selectedDepartment}
                              isArchived={true}
                              showOwnerInfo={true}
                              ownerInfo={{
                                name: firstPriority.owner.name
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Priority Dialog - keeping original for backward compatibility */}
      <Dialog open={showAddPriority} onOpenChange={setShowAddPriority}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Priority</DialogTitle>
            <DialogDescription>
              Create a new priority for the current quarter
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={priorityForm.title}
                onChange={(e) => setPriorityForm({ ...priorityForm, title: e.target.value })}
                placeholder="Enter priority title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={priorityForm.description}
                onChange={(e) => setPriorityForm({ ...priorityForm, description: e.target.value })}
                placeholder="Describe what needs to be accomplished"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="owner">Owner</Label>
                <Select
                  value={priorityForm.ownerId}
                  onValueChange={(value) => setPriorityForm({ ...priorityForm, ownerId: value })}
                >
                  <SelectTrigger>
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
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={priorityForm.dueDate}
                  onChange={(e) => setPriorityForm({ ...priorityForm, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isCompany"
                checked={priorityForm.isCompanyPriority}
                onChange={(e) => setPriorityForm({ ...priorityForm, isCompanyPriority: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isCompany">This is a company-wide priority</Label>
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
const QuarterlyPrioritiesPageRedesignedWithErrorBoundary = () => (
  <ErrorBoundary>
    <QuarterlyPrioritiesPageRedesigned />
  </ErrorBoundary>
);

export default QuarterlyPrioritiesPageRedesignedWithErrorBoundary;