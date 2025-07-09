import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Building2,
  Plus,
  Edit,
  Trash2,
  Users,
  ChevronRight,
  Search
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    leaderId: '',
    parentDepartmentId: null
  });

  // Mock data - in production, fetch from API
  useEffect(() => {
    setDepartments([
      {
        id: '1',
        name: 'Sales',
        description: 'Revenue generation and customer acquisition',
        memberCount: 12,
        leaderId: 'user1',
        leaderName: 'John Smith',
        parentDepartmentId: null,
        subDepartments: [
          {
            id: '4',
            name: 'Inside Sales',
            description: 'Phone and email sales',
            memberCount: 5,
            leaderId: 'user4',
            leaderName: 'Sarah Jones'
          }
        ]
      },
      {
        id: '2',
        name: 'Marketing',
        description: 'Brand awareness and lead generation',
        memberCount: 8,
        leaderId: 'user2',
        leaderName: 'Jane Doe',
        parentDepartmentId: null,
        subDepartments: []
      },
      {
        id: '3',
        name: 'Engineering',
        description: 'Product development and technical operations',
        memberCount: 20,
        leaderId: 'user3',
        leaderName: 'Mike Johnson',
        parentDepartmentId: null,
        subDepartments: []
      }
    ]);
  }, []);

  const handleOpenDialog = (dept = null) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({
        name: dept.name,
        description: dept.description || '',
        leaderId: dept.leaderId || '',
        parentDepartmentId: dept.parentDepartmentId
      });
    } else {
      setEditingDept(null);
      setFormData({
        name: '',
        description: '',
        leaderId: '',
        parentDepartmentId: null
      });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingDept) {
      // Update existing department
      setDepartments(prev => prev.map(dept => 
        dept.id === editingDept.id ? { ...dept, ...formData } : dept
      ));
    } else {
      // Add new department
      const newDept = {
        id: Date.now().toString(),
        ...formData,
        memberCount: 0,
        subDepartments: []
      };
      setDepartments(prev => [...prev, newDept]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (deptId) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      setDepartments(prev => prev.filter(dept => dept.id !== deptId));
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const DepartmentCard = ({ department, isSubDept = false }) => (
    <Card className={isSubDept ? 'ml-8' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building2 className="h-5 w-5 text-gray-600" />
            <div>
              <CardTitle className="text-lg">{department.name}</CardTitle>
              {department.leaderName && (
                <p className="text-sm text-gray-600 mt-1">
                  Led by {department.leaderName}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              <Users className="h-3 w-3 mr-1" />
              {department.memberCount} members
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenDialog(department)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(department.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {department.description && (
        <CardContent>
          <p className="text-gray-600">{department.description}</p>
          {!isSubDept && department.subDepartments?.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2 flex items-center">
                <ChevronRight className="h-4 w-4 mr-1" />
                Sub-departments
              </p>
              <div className="space-y-3">
                {department.subDepartments.map(subDept => (
                  <DepartmentCard
                    key={subDept.id}
                    department={subDept}
                    isSubDept={true}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Departments</h1>
          <p className="text-gray-600 mt-2">
            Organize your teams into departments for better accountability
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search departments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Departments List */}
      <div className="space-y-4">
        {filteredDepartments.map(dept => (
          <DepartmentCard key={dept.id} department={dept} />
        ))}
      </div>

      {/* Department Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDept ? 'Edit Department' : 'Create Department'}
            </DialogTitle>
            <DialogDescription>
              Set up your department structure for better organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Department Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Sales, Marketing, Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this department do?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent">Parent Department (Optional)</Label>
              <select
                id="parent"
                className="w-full rounded-md border border-gray-300 p-2"
                value={formData.parentDepartmentId || ''}
                onChange={(e) => setFormData({ ...formData, parentDepartmentId: e.target.value || null })}
              >
                <option value="">None (Top-level department)</option>
                {departments.filter(d => d.id !== editingDept?.id).map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingDept ? 'Update' : 'Create'} Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartmentsPage;