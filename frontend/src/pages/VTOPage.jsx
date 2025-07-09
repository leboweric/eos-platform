import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Target, 
  Eye, 
  TrendingUp, 
  Calendar,
  Plus,
  Edit,
  Save,
  X,
  Trash2,
  Building2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import CoreValueDialog from '@/components/vto/CoreValueDialog';
import CoreFocusDialog from '@/components/vto/CoreFocusDialog';
import TenYearTargetDialog from '@/components/vto/TenYearTargetDialog';
import MarketingStrategyDialog from '@/components/vto/MarketingStrategyDialog';
import ThreeYearPictureDialog from '@/components/vto/ThreeYearPictureDialog';
import OneYearPlanDialog from '@/components/vto/OneYearPlanDialog';
import RockDialog from '@/components/vto/RockDialog';
import IssueDialog from '@/components/vto/IssueDialog';

const VTOPage = () => {
  const [activeTab, setActiveTab] = useState('vision');
  const [coreValueDialog, setCoreValueDialog] = useState({ open: false, value: null });
  const [coreFocusDialog, setCoreFocusDialog] = useState(false);
  const [tenYearTargetDialog, setTenYearTargetDialog] = useState(false);
  const [marketingStrategyDialog, setMarketingStrategyDialog] = useState(false);
  const [threeYearPictureDialog, setThreeYearPictureDialog] = useState(false);
  const [oneYearPlanDialog, setOneYearPlanDialog] = useState(false);
  const [rockDialog, setRockDialog] = useState({ open: false, rock: null });
  const [issueDialog, setIssueDialog] = useState({ open: false, issue: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: null, id: null });
  const [selectedDepartment, setSelectedDepartment] = useState('company');
  const [departments, setDepartments] = useState([]);

  // Mock fetch departments - in production, use API
  useEffect(() => {
    const mockDepartments = [
      { id: '1', name: 'Sales', description: 'Revenue generation' },
      { id: '2', name: 'Marketing', description: 'Brand and lead generation' },
      { id: '3', name: 'Engineering', description: 'Product development' }
    ];
    setDepartments(mockDepartments);
  }, []);

  // Fetch VTO data when department changes
  useEffect(() => {
    // In production, this would fetch from API based on selectedDepartment
    // For now, we'll just update the title to show department context
    console.log(`Loading VTO for: ${selectedDepartment === 'company' ? 'Company-wide' : `Department ${selectedDepartment}`}`);
    // API call would be here
  }, [selectedDepartment]);

  // Mock data - in a real app, this would come from API based on selected department
  const [vtoData, setVtoData] = useState({
    coreValues: [
      { id: 1, value: 'Integrity', description: 'We do the right thing, even when no one is watching' },
      { id: 2, value: 'Excellence', description: 'We strive for excellence in everything we do' },
      { id: 3, value: 'Innovation', description: 'We embrace change and continuously improve' }
    ],
    coreFocus: {
      purpose: 'To help businesses achieve their full potential',
      niche: 'Small to medium-sized businesses implementing EOS'
    },
    tenYearTarget: {
      description: 'Be the leading EOS implementation platform with 10,000+ active organizations',
      year: 2035,
      runningTotal: '$50M ARR'
    },
    marketingStrategy: {
      targetMarket: 'EOS Implementers and their client organizations',
      threeUniques: '1. AI-powered insights, 2. Real-time collaboration, 3. Mobile-first design',
      provenProcess: 'EOS methodology with enhanced digital tools',
      guarantee: '90-day money-back guarantee'
    },
    threeYearPicture: {
      date: '2028-01-01',
      revenue: 10000000,
      profit: 2000000,
      profitPercentage: 20,
      measurables: [
        { id: 1, name: 'Active Organizations', target: 1000 },
        { id: 2, name: 'Monthly Active Users', target: 25000 },
        { id: 3, name: 'Customer Satisfaction', target: 95 }
      ],
      whatDoesItLookLike: [
        { id: 1, description: '100 Right People Right Seats' },
        { id: 2, description: 'A remote office in Duluth' },
        { id: 3, description: 'Market leader in EOS digital tools with global presence' }
      ]
    },
    oneYearPlan: {
      date: '2026-01-01',
      revenue: 2000000,
      profit: 300000,
      profitPercentage: 15,
      goals: [
        { id: 1, text: 'Launch AI-powered features', completed: false },
        { id: 2, text: 'Reach 100 paying organizations', completed: false },
        { id: 3, text: 'Establish partner program', completed: true }
      ],
      measurables: [
        { id: 1, name: 'Monthly Recurring Revenue', target: 150000 },
        { id: 2, name: 'Customer Churn Rate', target: 5 },
        { id: 3, name: 'Net Promoter Score', target: 70 }
      ]
    },
    quarterlyRocks: [],
    issues: []
  });

  // Core Value handlers
  const handleAddCoreValue = () => {
    setCoreValueDialog({ open: true, value: null });
  };

  const handleEditCoreValue = (value) => {
    setCoreValueDialog({ open: true, value });
  };

  const handleSaveCoreValue = (coreValue) => {
    if (coreValue.id) {
      // Update existing value
      setVtoData(prev => ({
        ...prev,
        coreValues: prev.coreValues.map(v => 
          v.id === coreValue.id ? coreValue : v
        )
      }));
    } else {
      // Add new value
      const newValue = {
        ...coreValue,
        id: Date.now()
      };
      setVtoData(prev => ({
        ...prev,
        coreValues: [...prev.coreValues, newValue]
      }));
    }
  };

  const handleDeleteCoreValue = (id) => {
    setDeleteDialog({ open: true, type: 'coreValue', id });
  };

  const confirmDelete = () => {
    const { type, id } = deleteDialog;
    
    if (type === 'coreValue') {
      setVtoData(prev => ({
        ...prev,
        coreValues: prev.coreValues.filter(v => v.id !== id)
      }));
    }
    // Add other delete handlers for different types here
    
    setDeleteDialog({ open: false, type: null, id: null });
  };

  // Core Focus handlers
  const handleSaveCoreFocus = (data) => {
    setVtoData(prev => ({
      ...prev,
      coreFocus: data
    }));
  };

  // Ten Year Target handlers
  const handleSaveTenYearTarget = (data) => {
    setVtoData(prev => ({
      ...prev,
      tenYearTarget: {
        description: data.targetDescription,
        year: data.targetYear,
        runningTotal: data.currentRunningTotal
      }
    }));
  };

  // Marketing Strategy handlers
  const handleSaveMarketingStrategy = (data) => {
    setVtoData(prev => ({
      ...prev,
      marketingStrategy: {
        targetMarket: data.targetMarket,
        threeUniques: data.threeUniques,
        provenProcess: data.provenProcess,
        guarantee: data.guarantee
      }
    }));
  };

  // Three Year Picture handlers
  const handleSaveThreeYearPicture = (data) => {
    setVtoData(prev => ({
      ...prev,
      threeYearPicture: data
    }));
  };

  // One Year Plan handlers
  const handleSaveOneYearPlan = (data) => {
    setVtoData(prev => ({
      ...prev,
      oneYearPlan: data
    }));
  };

  // Rock handlers
  const handleAddRock = () => {
    setRockDialog({ open: true, rock: null });
  };

  const handleEditRock = (rock) => {
    setRockDialog({ open: true, rock });
  };

  const handleSaveRock = (rock) => {
    if (rock.id) {
      // Update existing rock
      setVtoData(prev => ({
        ...prev,
        quarterlyRocks: prev.quarterlyRocks.map(r =>
          r.id === rock.id ? rock : r
        )
      }));
    } else {
      // Add new rock
      const newRock = {
        ...rock,
        id: Date.now(),
        progress: 0
      };
      setVtoData(prev => ({
        ...prev,
        quarterlyRocks: [...prev.quarterlyRocks, newRock]
      }));
    }
  };

  const handleDeleteRock = (id) => {
    setVtoData(prev => ({
      ...prev,
      quarterlyRocks: prev.quarterlyRocks.filter(r => r.id !== id)
    }));
  };

  // Issue handlers
  const handleAddIssue = () => {
    setIssueDialog({ open: true, issue: null });
  };

  const handleEditIssue = (issue) => {
    setIssueDialog({ open: true, issue });
  };

  const handleSaveIssue = (issue) => {
    if (issue.id) {
      // Update existing issue
      setVtoData(prev => ({
        ...prev,
        issues: prev.issues.map(i =>
          i.id === issue.id ? issue : i
        )
      }));
    } else {
      // Add new issue
      const newIssue = {
        ...issue,
        id: Date.now()
      };
      setVtoData(prev => ({
        ...prev,
        issues: [...prev.issues, newIssue]
      }));
    }
  };

  const handleDeleteIssue = (id) => {
    setVtoData(prev => ({
      ...prev,
      issues: prev.issues.filter(i => i.id !== id)
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Vision/Traction Organizer®</h1>
            <p className="text-gray-600 mt-2">
              Your organization's strategic foundation and execution plan
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
        
        {/* Department Selector */}
        <div className="flex items-center space-x-4">
          <Building2 className="h-5 w-5 text-gray-500" />
          <Label htmlFor="department">View VTO for:</Label>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="company">Company-wide</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vision">Vision</TabsTrigger>
          <TabsTrigger value="traction">Traction</TabsTrigger>
        </TabsList>

        {/* Vision Tab */}
        <TabsContent value="vision" className="space-y-6">
          {/* Core Values */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Target className="mr-2 h-5 w-5" />
                    Core Values
                  </CardTitle>
                  <CardDescription>
                    The fundamental beliefs that guide your organization
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleAddCoreValue}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Value
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vtoData.coreValues.map((value) => (
                  <div key={value.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{value.value}</h4>
                        <p className="text-gray-600 mt-1">{value.description}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditCoreValue(value)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCoreValue(value.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Core Focus */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Core Focus™</CardTitle>
                  <CardDescription>
                    Your organization's purpose and niche
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCoreFocusDialog(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Purpose/Cause/Passion</Label>
                  <p className="mt-1 text-gray-900">{vtoData.coreFocus.purpose}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Niche</Label>
                  <p className="mt-1 text-gray-900">{vtoData.coreFocus.niche}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 10-Year Target */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>10-Year Target™</CardTitle>
                  <CardDescription>
                    Your long-term vision and measurable goal
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setTenYearTargetDialog(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Target Description</Label>
                  <p className="mt-1 text-gray-900">{vtoData.tenYearTarget.description}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Target Year</Label>
                    <p className="mt-1 text-gray-900">{vtoData.tenYearTarget.year}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Running Total</Label>
                    <p className="mt-1 text-gray-900">{vtoData.tenYearTarget.runningTotal}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Marketing Strategy */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Marketing Strategy</CardTitle>
                  <CardDescription>
                    How you reach and serve your target market
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setMarketingStrategyDialog(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Target Market</Label>
                  <p className="mt-1 text-gray-900">{vtoData.marketingStrategy.targetMarket}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Three Uniques</Label>
                  <p className="mt-1 text-gray-900">{vtoData.marketingStrategy.threeUniques}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Proven Process</Label>
                  <p className="mt-1 text-gray-900">{vtoData.marketingStrategy.provenProcess}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Guarantee</Label>
                  <p className="mt-1 text-gray-900">{vtoData.marketingStrategy.guarantee}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3-Year Picture */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>3-Year Picture</CardTitle>
                  <CardDescription>
                    Your mid-term vision with specific targets
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setThreeYearPictureDialog(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Revenue Target</Label>
                    <p className="mt-1 text-2xl font-bold text-green-600">
                      {formatCurrency(vtoData.threeYearPicture.revenue)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Profit Target</Label>
                    <p className="mt-1 text-2xl font-bold text-blue-600">
                      {formatCurrency(vtoData.threeYearPicture.profit)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Profit %</Label>
                    <p className="mt-1 text-2xl font-bold text-purple-600">
                      {vtoData.threeYearPicture.profitPercentage}%
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Measurables</Label>
                  <div className="mt-2 space-y-2">
                    {vtoData.threeYearPicture.measurables.map((measurable) => (
                      <div key={measurable.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span>{measurable.name}</span>
                        <Badge variant="outline">{measurable.target.toLocaleString()}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">What Does it Look Like</Label>
                  <div className="mt-2 space-y-2">
                    {vtoData.threeYearPicture.whatDoesItLookLike?.map((item) => (
                      <div key={item.id} className="flex items-start p-2 bg-gray-50 rounded">
                        <span className="text-gray-600 mr-2">•</span>
                        <span>{item.description}</span>
                      </div>
                    )) || <p className="text-gray-500 italic">No descriptions added yet</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Traction Tab */}
        <TabsContent value="traction" className="space-y-6">
          {/* 1-Year Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    1-Year Plan
                  </CardTitle>
                  <CardDescription>
                    Your annual goals and financial targets
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setOneYearPlanDialog(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Revenue Target</Label>
                    <p className="mt-1 text-2xl font-bold text-green-600">
                      {formatCurrency(vtoData.oneYearPlan.revenue)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Profit Target</Label>
                    <p className="mt-1 text-2xl font-bold text-blue-600">
                      {formatCurrency(vtoData.oneYearPlan.profit)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Profit %</Label>
                    <p className="mt-1 text-2xl font-bold text-purple-600">
                      {vtoData.oneYearPlan.profitPercentage}%
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">Goals</Label>
                  <div className="space-y-2">
                    {vtoData.oneYearPlan.goals.map((goal) => (
                      <div key={goal.id} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={goal.completed}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                          readOnly
                        />
                        <span className={goal.completed ? 'line-through text-gray-500' : ''}>
                          {goal.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">Measurables</Label>
                  <div className="space-y-2">
                    {vtoData.oneYearPlan.measurables.map((measurable) => (
                      <div key={measurable.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span>{measurable.name}</span>
                        <Badge variant="outline">{measurable.target.toLocaleString()}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quarterly Rocks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Quarterly Rocks
                  </CardTitle>
                  <CardDescription>
                    Current quarter priorities and goals
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  View All Rocks
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {vtoData.quarterlyRocks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Rocks will be displayed here when created</p>
                  <Button className="mt-4" onClick={handleAddRock}>Create Rock</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button onClick={handleAddRock} size="sm" variant="outline" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Rock
                  </Button>
                  {vtoData.quarterlyRocks.map((rock) => (
                    <div key={rock.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => handleEditRock(rock)}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{rock.title}</h4>
                            {rock.type === 'company' && (
                              <Badge variant="secondary">Company</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{rock.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>Owner: {rock.owner}</span>
                            <span>Due: {new Date(rock.dueDate).toLocaleDateString()}</span>
                            <Badge variant={
                              rock.status === 'complete' ? 'default' :
                              rock.status === 'on-track' ? 'secondary' :
                              rock.status === 'at-risk' ? 'outline' :
                              'destructive'
                            }>
                              {rock.status.replace('-', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRock(rock.id);
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Issues List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Issues List</CardTitle>
                  <CardDescription>
                    Long-term issues and obstacles to address
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  Manage Issues
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {vtoData.issues.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Issues will be displayed here when identified</p>
                  <Button className="mt-4" onClick={handleAddIssue}>Add First Issue</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button onClick={handleAddIssue} size="sm" variant="outline" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Issue
                  </Button>
                  {vtoData.issues.map((issue) => (
                    <div key={issue.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => handleEditIssue(issue)}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{issue.title}</h4>
                            <Badge variant={issue.term === 'short' ? 'default' : 'secondary'}>
                              {issue.term === 'short' ? 'Short Term' : 'Long Term'}
                            </Badge>
                            <Badge variant={
                              issue.priority === 'high' ? 'destructive' :
                              issue.priority === 'medium' ? 'outline' :
                              'secondary'
                            }>
                              {issue.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{issue.description}</p>
                          {issue.owner && (
                            <p className="text-sm text-gray-500 mt-2">Owner: {issue.owner}</p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteIssue(issue.id);
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Core Value Dialog */}
      <CoreValueDialog
        open={coreValueDialog.open}
        onOpenChange={(open) => setCoreValueDialog({ open, value: null })}
        value={coreValueDialog.value}
        onSave={handleSaveCoreValue}
      />

      {/* Core Focus Dialog */}
      <CoreFocusDialog
        open={coreFocusDialog}
        onOpenChange={setCoreFocusDialog}
        data={vtoData.coreFocus}
        onSave={handleSaveCoreFocus}
      />

      {/* Ten Year Target Dialog */}
      <TenYearTargetDialog
        open={tenYearTargetDialog}
        onOpenChange={setTenYearTargetDialog}
        data={vtoData.tenYearTarget}
        onSave={handleSaveTenYearTarget}
      />

      {/* Marketing Strategy Dialog */}
      <MarketingStrategyDialog
        open={marketingStrategyDialog}
        onOpenChange={setMarketingStrategyDialog}
        data={vtoData.marketingStrategy}
        onSave={handleSaveMarketingStrategy}
      />

      {/* Three Year Picture Dialog */}
      <ThreeYearPictureDialog
        open={threeYearPictureDialog}
        onOpenChange={setThreeYearPictureDialog}
        data={vtoData.threeYearPicture}
        onSave={handleSaveThreeYearPicture}
      />

      {/* One Year Plan Dialog */}
      <OneYearPlanDialog
        open={oneYearPlanDialog}
        onOpenChange={setOneYearPlanDialog}
        data={vtoData.oneYearPlan}
        onSave={handleSaveOneYearPlan}
      />

      {/* Rock Dialog */}
      <RockDialog
        open={rockDialog.open}
        onOpenChange={(open) => setRockDialog({ open, rock: null })}
        rock={rockDialog.rock}
        onSave={handleSaveRock}
      />

      {/* Issue Dialog */}
      <IssueDialog
        open={issueDialog.open}
        onOpenChange={(open) => setIssueDialog({ open, issue: null })}
        issue={issueDialog.issue}
        onSave={handleSaveIssue}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, type: null, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VTOPage;

