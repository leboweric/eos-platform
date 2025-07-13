import { useParams, useNavigate, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { departmentService } from '../services/departmentService';
import { Loader2, Building2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DepartmentLayout = () => {
  const { departmentId } = useParams();
  const navigate = useNavigate();
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDepartment();
  }, [departmentId]);

  const fetchDepartment = async () => {
    try {
      setLoading(true);
      const data = await departmentService.getDepartment(departmentId);
      setDepartment(data);
    } catch (error) {
      console.error('Error fetching department:', error);
      setError('Failed to load department');
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

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/departments')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Departments
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Department Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/departments')}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Departments
          </Button>
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-gray-600" />
            <h1 className="text-2xl font-bold">{department?.name}</h1>
          </div>
        </div>
      </div>

      {/* Render child route */}
      <Outlet context={{ department, refreshDepartment: fetchDepartment }} />
    </div>
  );
};

export default DepartmentLayout;