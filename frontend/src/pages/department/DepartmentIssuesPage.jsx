import { useOutletContext } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { issuesService } from '../../services/issuesService';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, AlertCircle, Loader2, User, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const DepartmentIssuesPage = () => {
  const { department } = useOutletContext();
  const { user } = useAuthStore();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (department) {
      fetchIssues();
    }
  }, [department]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      // Fetch department-specific issues
      const data = await issuesService.getIssues();
      
      // Filter issues for this department (you may want to add department_id to issues table)
      const departmentIssues = data.filter(issue => 
        issue.team_id === department.id || issue.department_id === department.id
      );
      
      setIssues(departmentIssues);
    } catch (error) {
      console.error('Error fetching department issues:', error);
      setError('Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'long-term': 'bg-blue-100 text-blue-700',
      'short-term': 'bg-orange-100 text-orange-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'high': 'destructive',
      'medium': 'default',
      'low': 'secondary'
    };
    return colors[priority] || 'secondary';
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
          <h2 className="text-2xl font-bold">Issues</h2>
          <p className="text-gray-600 mt-1">
            Track and resolve issues for {department.name}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Issue
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {issues.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg font-medium">No issues found</p>
            <p className="text-gray-500 text-sm mt-1">
              Create an issue when something needs to be addressed
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {issues.map(issue => (
            <Card key={issue.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{issue.title}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getCategoryColor(issue.category)}>
                      {issue.category}
                    </Badge>
                    <Badge variant={getPriorityColor(issue.priority)}>
                      {issue.priority}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    {issue.assignedToName && (
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {issue.assignedToName}
                      </div>
                    )}
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DepartmentIssuesPage;