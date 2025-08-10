import { useOutletContext } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { quarterlyPrioritiesService } from '../../services/quarterlyPrioritiesService';
import { useAuthStore } from '../../stores/authStore';
import PriorityCard from '../../components/priorities/PriorityCardClean';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Target, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, startOfQuarter, getQuarter, getYear } from 'date-fns';

const DepartmentPrioritiesPage = () => {
  const { department } = useOutletContext();
  const { user } = useAuthStore();
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddPriority, setShowAddPriority] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [creatingPriority, setCreatingPriority] = useState(false);
  
  // Form state for new priority
  const [priorityForm, setPriorityForm] = useState({
    title: '',
    description: '',
    ownerId: '',
    dueDate: '',
    isCompanyPriority: false
  });
  
  // Get current quarter and year
  const currentDate = new Date();
  const quarter = `Q${getQuarter(currentDate)}`;
  const currentYear = getYear(currentDate);

  useEffect(() => {
    if (department) {
      fetchPriorities();
    }
  }, [department]);

  const fetchPriorities = async () => {
    try {
      setLoading(true);
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      
      // Use the department's first team ID if available, otherwise use department ID
      const teamId = department.teams && department.teams.length > 0 
        ? department.teams[0].id 
        : department.id;
      
      const data = await quarterlyPrioritiesService.getCurrentPriorities(orgId, teamId);
      
      // NINETY.IO MODEL: Show all department priorities (cross-visibility)
      setPriorities(data.companyPriorities || []);
      
      // Add visual indicators for team ownership
      const prioritiesWithTeamInfo = (data.companyPriorities || []).map(priority => ({
        ...priority,
        teamContext: priority.teamName || 'Unknown Team'
      }));
      setPriorities(prioritiesWithTeamInfo);
    } catch (error) {
      console.error('Error fetching department priorities:', error);
      setError('Failed to load priorities');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreatePriority = async () => {
    try {
      setCreatingPriority(true);
      setError(null);
      
      // Validation
      if (!priorityForm.title.trim()) {
        setError('Please enter a priority title');
        return;
      }
      
      if (!priorityForm.ownerId) {
        setError('Please select an owner');
        return;
      }
      
      // IMPORTANT: Prevent creating Company Priorities from department pages
      if (priorityForm.isCompanyPriority) {
        setError('Company Priorities can only be created from the Leadership Team page. Please uncheck "This is a company-wide priority" to create a department priority.');
        return;
      }
      
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      const teamId = department.teams && department.teams.length > 0 
        ? department.teams[0].id 
        : department.id;
      
      const priorityData = {
        ...priorityForm,
        quarter,
        year: currentYear,
        // Ensure isCompanyPriority is false for department priorities
        isCompanyPriority: false
      };
      
      await quarterlyPrioritiesService.createPriority(orgId, teamId, priorityData);
      
      // Reset form and close dialog
      setPriorityForm({
        title: '',
        description: '',
        ownerId: '',
        dueDate: '',
        isCompanyPriority: false
      });
      setShowAddPriority(false);
      
      // Refresh priorities
      await fetchPriorities();
    } catch (error) {
      console.error('Error creating priority:', error);
      setError(error.response?.data?.error || 'Failed to create priority');
    } finally {
      setCreatingPriority(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quarterly Priorities</h2>
          <p className="text-gray-600 mt-1">
            Department priorities for {department.name}
          </p>
        </div>
        <Button onClick={() => setShowAddPriority(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Priority
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {priorities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg font-medium">No priorities yet</p>
            <p className="text-gray-500 text-sm mt-1">
              Create your first department priority to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {priorities.map(priority => (
            <PriorityCard
              key={priority.id}
              priority={priority}
              onStatusChange={(id, newStatus) => {
                setPriorities(prev => 
                  prev.map(p => p.id === id ? { ...p, status: newStatus } : p)
                );
              }}
            />
          ))}
        </div>
      )}
      
      {/* Add Priority Dialog */}
      <Dialog open={showAddPriority} onOpenChange={setShowAddPriority}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Department Priority</DialogTitle>
            <DialogDescription>
              Create a new priority for {department?.name} - Q{getQuarter(currentDate)} {currentYear}
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
                    <SelectItem value={user?.id || 'current-user'}>
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user?.email || 'Current User'}
                    </SelectItem>
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
            
            {/* Company Priority Checkbox with Warning */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isCompany"
                  checked={priorityForm.isCompanyPriority}
                  onChange={(e) => setPriorityForm({ ...priorityForm, isCompanyPriority: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isCompany" className="cursor-pointer">
                  This is a company-wide priority
                </Label>
              </div>
              {priorityForm.isCompanyPriority && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    Company Priorities can only be created from the Leadership Team page. 
                    This option will be ignored for department priorities.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPriority(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePriority} disabled={creatingPriority}>
              {creatingPriority ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Priority'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartmentPrioritiesPage;