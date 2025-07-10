import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckSquare, 
  Plus, 
  Calendar,
  User,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  Building2,
  Filter
} from 'lucide-react';

const RocksPage = () => {
  const [selectedQuarter, setSelectedQuarter] = useState('Q1 2025');
  const [showAddRock, setShowAddRock] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [departments, setDepartments] = useState([]);

  // Mock fetch departments
  useEffect(() => {
    const mockDepartments = [
      { id: '1', name: 'Sales', description: 'Revenue generation' },
      { id: '2', name: 'Marketing', description: 'Brand and lead generation' },
      { id: '3', name: 'Engineering', description: 'Product development' }
    ];
    setDepartments(mockDepartments);
  }, []);

  // Mock data - in a real app, this would come from API
  const [rocks, setRocks] = useState([
    {
      id: 1,
      title: 'Implement AI-powered goal recommendations',
      description: 'Build and deploy machine learning models to suggest quarterly rocks based on historical performance and business goals.',
      owner: {
        id: 1,
        name: 'John Doe',
        email: 'john@company.com',
        avatar: null
      },
      departmentId: '3', // Engineering
      departmentName: 'Engineering',
      dueDate: '2025-03-31',
      status: 'on-track',
      progress: 65,
      isCompanyRock: true,
      milestones: [
        { id: 1, title: 'Research ML frameworks', completed: true, dueDate: '2025-01-15' },
        { id: 2, title: 'Build prototype model', completed: true, dueDate: '2025-02-15' },
        { id: 3, title: 'Integrate with platform', completed: false, dueDate: '2025-03-15' },
        { id: 4, title: 'Deploy to production', completed: false, dueDate: '2025-03-31' }
      ],
      updates: [
        {
          id: 1,
          date: '2025-01-08',
          author: 'John Doe',
          text: 'Completed initial research on ML frameworks. TensorFlow looks promising for our use case.',
          statusChange: null
        }
      ]
    },
    {
      id: 2,
      title: 'Launch mobile app beta',
      description: 'Develop and release beta version of mobile application for iOS and Android platforms.',
      owner: {
        id: 2,
        name: 'Sarah Wilson',
        email: 'sarah@company.com',
        avatar: null
      },
      departmentId: '3', // Engineering
      departmentName: 'Engineering',
      dueDate: '2025-03-31',
      status: 'at-risk',
      progress: 40,
      isCompanyRock: false,
      milestones: [
        { id: 1, title: 'Complete UI/UX design', completed: true, dueDate: '2025-01-31' },
        { id: 2, title: 'Develop core features', completed: false, dueDate: '2025-02-28' },
        { id: 3, title: 'Beta testing', completed: false, dueDate: '2025-03-15' },
        { id: 4, title: 'App store submission', completed: false, dueDate: '2025-03-31' }
      ],
      updates: [
        {
          id: 1,
          date: '2025-01-07',
          author: 'Sarah Wilson',
          text: 'UI designs are complete but development is behind schedule due to technical challenges.',
          statusChange: 'at-risk'
        }
      ]
    },
    {
      id: 3,
      title: 'Establish enterprise sales process',
      description: 'Create standardized sales process and materials for enterprise customers.',
      owner: {
        id: 3,
        name: 'Mike Johnson',
        email: 'mike@company.com',
        avatar: null
      },
      departmentId: '1', // Sales
      departmentName: 'Sales',
      dueDate: '2025-03-31',
      status: 'complete',
      progress: 100,
      isCompanyRock: true,
      milestones: [
        { id: 1, title: 'Define sales stages', completed: true, dueDate: '2025-01-15' },
        { id: 2, title: 'Create sales materials', completed: true, dueDate: '2025-02-15' },
        { id: 3, title: 'Train sales team', completed: true, dueDate: '2025-03-15' },
        { id: 4, title: 'Launch process', completed: true, dueDate: '2025-03-31' }
      ],
      updates: [
        {
          id: 1,
          date: '2025-01-05',
          author: 'Mike Johnson',
          text: 'Sales process is now live and team has been trained. First enterprise deals in pipeline.',
          statusChange: 'complete'
        }
      ]
    }
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete':
        return 'bg-green-500';
      case 'on-track':
        return 'bg-blue-500';
      case 'at-risk':
        return 'bg-yellow-500';
      case 'off-track':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4" />;
      case 'on-track':
        return <TrendingUp className="h-4 w-4" />;
      case 'at-risk':
        return <AlertTriangle className="h-4 w-4" />;
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
        return 'default';
      case 'at-risk':
        return 'secondary';
      case 'off-track':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getUserInitials = (user) => {
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const quarters = ['Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];

  // Filter priorities by department
  const filteredRocks = selectedDepartment === 'all' 
    ? rocks 
    : rocks.filter(r => r.departmentId === selectedDepartment || r.isCompanyRock);

  const stats = {
    total: filteredRocks.length,
    completed: filteredRocks.filter(r => r.status === 'complete').length,
    onTrack: filteredRocks.filter(r => r.status === 'on-track').length,
    atRisk: filteredRocks.filter(r => r.status === 'at-risk').length,
    offTrack: filteredRocks.filter(r => r.status === 'off-track').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Quarterly Priorities</h1>
            <p className="text-gray-600 mt-2">
              Set your priorities and goals for your organization
            </p>
          </div>
          <div className="flex space-x-2">
            <select 
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {quarters.map(quarter => (
                <option key={quarter} value={quarter}>{quarter}</option>
              ))}
            </select>
            <Button onClick={() => setShowAddRock(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Priority
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <Label htmlFor="department">Department:</Label>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Priorities</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">On Track</p>
                <p className="text-2xl font-bold text-blue-600">{stats.onTrack}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">At Risk</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.atRisk}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Off Track</p>
                <p className="text-2xl font-bold text-red-600">{stats.offTrack}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priorities List */}
      <div className="space-y-4">
        {filteredRocks.map((rock) => (
          <Card key={rock.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(rock.status)}`} />
                    <CardTitle className="text-lg">{rock.title}</CardTitle>
                    {rock.isCompanyRock && (
                      <Badge variant="outline">Company Priority</Badge>
                    )}
                    <Badge variant={getStatusBadgeVariant(rock.status)} className="flex items-center space-x-1">
                      {getStatusIcon(rock.status)}
                      <span className="capitalize">{rock.status.replace('-', ' ')}</span>
                    </Badge>
                  </div>
                  <CardDescription className="text-base">
                    {rock.description}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress and Details */}
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Owner</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={rock.owner.avatar} />
                        <AvatarFallback className="text-xs">
                          {getUserInitials(rock.owner)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{rock.owner.name}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Department</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{rock.departmentName || 'Company-wide'}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Due Date</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{formatDate(rock.dueDate)}</span>
                      <span className="text-xs text-gray-500">
                        ({getDaysUntilDue(rock.dueDate)} days)
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Progress</Label>
                    <div className="mt-1">
                      <div className="flex items-center space-x-2">
                        <Progress value={rock.progress} className="flex-1" />
                        <span className="text-sm font-medium">{rock.progress}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Milestones */}
                <div>
                  <Label className="text-sm text-gray-600 mb-2 block">Milestones</Label>
                  <div className="space-y-2">
                    {rock.milestones.map((milestone) => (
                      <div key={milestone.id} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={milestone.completed}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                          readOnly
                        />
                        <span className={`text-sm flex-1 ${milestone.completed ? 'line-through text-gray-500' : ''}`}>
                          {milestone.title}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(milestone.dueDate)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Latest Update */}
                {rock.updates.length > 0 && (
                  <div>
                    <Label className="text-sm text-gray-600 mb-2 block">Latest Update</Label>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{rock.updates[0].author}</span>
                        <span className="text-xs text-gray-500">{formatDate(rock.updates[0].date)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{rock.updates[0].text}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {rocks.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No priorities for {selectedQuarter}</h3>
            <p className="text-gray-500 mb-4">
              Get started by creating your first quarterly priority.
            </p>
            <Button onClick={() => setShowAddRock(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Priority
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RocksPage;

