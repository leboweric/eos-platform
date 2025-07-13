import { useOutletContext } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { scorecardService } from '../../services/scorecardService';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, BarChart, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DepartmentScorecardPage = () => {
  const { department } = useOutletContext();
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (department) {
      fetchMetrics();
    }
  }, [department]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
      
      // Use the department's first team ID if available, otherwise use department ID
      const teamId = department.teams && department.teams.length > 0 
        ? department.teams[0].id 
        : department.id;
      
      // Fetch department-specific scorecard metrics
      const data = await scorecardService.getScorecardMetrics(orgId, teamId);
      setMetrics(data.metrics || []);
    } catch (error) {
      console.error('Error fetching department scorecard:', error);
      setError('Failed to load scorecard metrics');
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
          <h2 className="text-2xl font-bold">Scorecard</h2>
          <p className="text-gray-600 mt-1">
            Track key metrics for {department.name}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Metric
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {metrics.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg font-medium">No metrics yet</p>
            <p className="text-gray-500 text-sm mt-1">
              Add your first metric to start tracking department performance
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {metrics.map(metric => (
            <Card key={metric.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  {metric.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold">
                    {metric.current_value || 0}
                  </div>
                  <div className="flex items-center text-sm">
                    {metric.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                      {metric.change_percentage}%
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  Goal: {metric.goal_value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DepartmentScorecardPage;