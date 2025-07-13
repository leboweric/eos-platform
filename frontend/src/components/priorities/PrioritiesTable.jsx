import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, AlertTriangle, Calendar, User, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { issuesService } from '../../services/issuesService';
import { useAuthStore } from '../../stores/authStore';

const PrioritiesTable = ({ priorities, readOnly = false, onIssueCreated }) => {
  const { user } = useAuthStore();
  const [creatingIssue, setCreatingIssue] = useState({});

  const statusColors = {
    'on-track': 'bg-green-100 text-green-700 border-green-200',
    'off-track': 'bg-red-100 text-red-700 border-red-200',
    'at-risk': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'complete': 'bg-blue-100 text-blue-700 border-blue-200'
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleCreateIssue = async (priority) => {
    try {
      setCreatingIssue(prev => ({ ...prev, [priority.id]: true }));
      
      const daysLeft = getDaysUntilDue(priority.due_date);
      const issueData = {
        title: `${priority.title} - Off Track`,
        description: `Priority "${priority.title}" is off track. Due: ${formatDate(priority.due_date)} (${daysLeft} days). Owner: ${priority.owner?.name || 'Unassigned'}`,
        category: 'short-term',
        priority: 'high',
        assignedToId: priority.owner?.id || user?.id
      };
      
      await issuesService.createIssue(issueData);
      
      if (onIssueCreated) {
        onIssueCreated(`Issue created for ${priority.title}`);
      }
      
      setCreatingIssue(prev => ({ ...prev, [priority.id]: false }));
    } catch (error) {
      console.error('Failed to create issue:', error);
      setCreatingIssue(prev => ({ ...prev, [priority.id]: false }));
      alert('Failed to create issue. Please try again.');
    }
  };

  // Group priorities by type
  const companyPriorities = priorities.filter(p => p.priority_type === 'company');
  const individualPriorities = priorities.filter(p => p.priority_type !== 'company');

  const PriorityRow = ({ priority, isCompany = false }) => {
    const daysLeft = getDaysUntilDue(priority.due_date);
    const isOverdue = daysLeft !== null && daysLeft < 0;
    const isOffTrack = priority.status === 'off-track' || priority.status === 'at-risk';
    const showCreateIssue = !readOnly && isOffTrack && priority.status !== 'complete';

    return (
      <tr className="border-b hover:bg-gray-50">
        <td className="p-4 font-medium">{priority.title}</td>
        <td className="p-4">
          <Badge variant="outline" className={statusColors[priority.status] || statusColors['on-track']}>
            {priority.status === 'complete' && <CheckCircle className="h-3 w-3 mr-1" />}
            {priority.status || 'on-track'}
          </Badge>
        </td>
        <td className="p-4 text-center">{priority.owner?.name || '-'}</td>
        <td className={`p-4 text-center ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
          {formatDate(priority.due_date)}
          {daysLeft !== null && (
            <div className="text-xs text-gray-500">
              {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
            </div>
          )}
        </td>
        <td className="p-4 text-center">
          {isCompany ? (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              Company
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
              Individual
            </Badge>
          )}
        </td>
        <td className="p-4 text-center">
          {showCreateIssue && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 hover:bg-red-50"
              onClick={() => handleCreateIssue(priority)}
              disabled={creatingIssue[priority.id]}
              title="Create issue for off-track priority"
            >
              {creatingIssue[priority.id] ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-600 mr-1" />
                  <span className="text-xs">Create Issue</span>
                </>
              )}
            </Button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white">
        <CardTitle className="flex items-center text-xl">
          <Target className="mr-2 h-6 w-6" />
          Quarterly Priorities
        </CardTitle>
        <CardDescription className="text-indigo-100">
          Review progress on Q{Math.floor((new Date().getMonth() + 3) / 3)} priorities
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4 font-semibold text-gray-700">Priority</th>
              <th className="text-left p-4 font-semibold text-gray-700">Status</th>
              <th className="text-center p-4 font-semibold text-gray-700">Owner</th>
              <th className="text-center p-4 font-semibold text-gray-700">Due Date</th>
              <th className="text-center p-4 font-semibold text-gray-700">Type</th>
              <th className="text-center p-4 font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {priorities.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-8 text-gray-500">
                  No priorities found for this quarter
                </td>
              </tr>
            ) : (
              <>
                {/* Company Priorities First */}
                {companyPriorities.map(priority => (
                  <PriorityRow key={priority.id} priority={priority} isCompany={true} />
                ))}
                {/* Then Individual Priorities */}
                {individualPriorities.map(priority => (
                  <PriorityRow key={priority.id} priority={priority} isCompany={false} />
                ))}
              </>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

export default PrioritiesTable;