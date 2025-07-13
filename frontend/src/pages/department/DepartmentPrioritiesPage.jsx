import { useOutletContext } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { quarterlyPrioritiesService } from '../../services/quarterlyPrioritiesService';
import { useAuthStore } from '../../stores/authStore';
import PriorityCard from '../../components/priorities/PriorityCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Target, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DepartmentPrioritiesPage = () => {
  const { department } = useOutletContext();
  const { user } = useAuthStore();
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (department) {
      fetchPriorities();
    }
  }, [department]);

  const fetchPriorities = async () => {
    try {
      setLoading(true);
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      
      // For department priorities, we'll use the department ID as the team ID
      const data = await quarterlyPrioritiesService.getCurrentPriorities(orgId, department.id);
      
      // Filter to show only department priorities
      setPriorities(data.companyPriorities || []);
    } catch (error) {
      console.error('Error fetching department priorities:', error);
      setError('Failed to load priorities');
    } finally {
      setLoading(false);
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
        <Button>
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
    </div>
  );
};

export default DepartmentPrioritiesPage;