import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { organizationalChartService } from '../services/organizationalChartService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus,
  Loader2,
  AlertCircle,
  Users,
  Building2,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import CreateChartDialog from '../components/organizationalChart/CreateChartDialog';
import ChartViewer from '../components/organizationalChart/ChartViewer';
import ChartEditor from '../components/organizationalChart/ChartEditor';

const OrganizationalChartPage = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [charts, setCharts] = useState([]);
  const [selectedChart, setSelectedChart] = useState(null);
  const [activeTab, setActiveTab] = useState('charts');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingChart, setEditingChart] = useState(null);

  const canCreateChart = ['admin', 'manager'].includes(user?.role) || user?.isConsultant;

  useEffect(() => {
    fetchCharts();
  }, []);

  const fetchCharts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await organizationalChartService.getCharts(true);
      setCharts(data);
    } catch (error) {
      console.error('Failed to fetch organizational charts:', error);
      setError('Failed to load organizational charts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChart = async (chartData) => {
    try {
      await organizationalChartService.createChart(chartData);
      await fetchCharts();
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create chart:', error);
      throw error;
    }
  };

  const handleViewChart = (chart) => {
    setSelectedChart(chart);
    setEditingChart(null);
    setActiveTab('view');
  };

  const handleEditChart = (chart) => {
    setSelectedChart(chart);
    setEditingChart(chart);
    setActiveTab('edit');
  };

  const handleDeleteChart = async (chartId) => {
    if (!window.confirm('Are you sure you want to delete this organizational chart?')) {
      return;
    }

    try {
      await organizationalChartService.deleteChart(chartId);
      await fetchCharts();
      if (selectedChart?.id === chartId) {
        setSelectedChart(null);
        setActiveTab('charts');
      }
    } catch (error) {
      console.error('Failed to delete chart:', error);
      setError('Failed to delete organizational chart');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organizational Chart</h1>
          <p className="text-gray-600 mt-2">Visualize and manage your organization's structure</p>
        </div>
        {canCreateChart && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Chart
          </Button>
        )}
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="charts">All Charts</TabsTrigger>
          {selectedChart && (
            <>
              <TabsTrigger value="view">View Chart</TabsTrigger>
              {editingChart && <TabsTrigger value="edit">Edit Chart</TabsTrigger>}
            </>
          )}
        </TabsList>

        <TabsContent value="charts" className="space-y-4">
          {charts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No organizational charts yet
                </h3>
                <p className="text-gray-500 text-center mb-6">
                  Create your first organizational chart to visualize your company structure
                </p>
                {canCreateChart && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Chart
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {charts.map((chart) => (
                <Card key={chart.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="truncate">{chart.name}</span>
                      <Users className="h-5 w-5 text-gray-400" />
                    </CardTitle>
                    <CardDescription>
                      {chart.position_count || 0} positions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {chart.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {chart.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        Created by {chart.created_by_name}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewChart(chart)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canCreateChart && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditChart(chart)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteChart(chart.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {selectedChart && (
          <TabsContent value="view">
            <ChartViewer chartId={selectedChart.id} />
          </TabsContent>
        )}

        {editingChart && (
          <TabsContent value="edit">
            <ChartEditor 
              chartId={editingChart.id}
              onUpdate={() => {
                fetchCharts();
                setActiveTab('view');
              }}
            />
          </TabsContent>
        )}
      </Tabs>

      {showCreateDialog && (
        <CreateChartDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onCreate={handleCreateChart}
        />
      )}
    </div>
  );
};

export default OrganizationalChartPage;