import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Eye, 
  TrendingUp, 
  Calendar,
  Plus,
  Edit,
  Save,
  X,
  Trash2
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

const VTOPage = () => {
  const [activeTab, setActiveTab] = useState('vision');
  const [editingSection, setEditingSection] = useState(null);
  const [coreValueDialog, setCoreValueDialog] = useState({ open: false, value: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: null, id: null });

  // Mock data - in a real app, this would come from API
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
      description: 'Market leader in EOS digital tools with global presence',
      measurables: [
        { id: 1, name: 'Active Organizations', target: 1000 },
        { id: 2, name: 'Monthly Active Users', target: 25000 },
        { id: 3, name: 'Customer Satisfaction', target: 95 }
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
    }
  });

  const handleEdit = (section) => {
    setEditingSection(section);
  };

  const handleSave = (section) => {
    // In a real app, this would make an API call
    setEditingSection(null);
  };

  const handleCancel = () => {
    setEditingSection(null);
  };

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
                <Button variant="ghost" size="sm" onClick={() => handleEdit('coreFocus')}>
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
                <Button variant="ghost" size="sm" onClick={() => handleEdit('tenYearTarget')}>
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
                <Button variant="ghost" size="sm" onClick={() => handleEdit('marketingStrategy')}>
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
                <Button variant="ghost" size="sm" onClick={() => handleEdit('threeYearPicture')}>
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
                  <Label className="text-sm font-medium text-gray-700">Vision Description</Label>
                  <p className="mt-1 text-gray-900">{vtoData.threeYearPicture.description}</p>
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
                <Button variant="ghost" size="sm" onClick={() => handleEdit('oneYearPlan')}>
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
              <div className="text-center py-8 text-gray-500">
                <Target className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Rocks will be displayed here when created</p>
                <Button className="mt-4">Create First Rock</Button>
              </div>
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
              <div className="text-center py-8 text-gray-500">
                <p>Issues will be displayed here when identified</p>
                <Button className="mt-4">Add First Issue</Button>
              </div>
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

