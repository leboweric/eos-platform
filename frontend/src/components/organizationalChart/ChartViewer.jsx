import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { organizationalChartService } from '../../services/organizationalChartService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2,
  AlertCircle,
  Users,
  Building2,
  Edit
} from 'lucide-react';
import VisualOrgChart from './VisualOrgChart';
import EditPositionDialog from './EditPositionDialog';
import AddPositionDialog from './AddPositionDialog';
import { useAuthStore } from '../../stores/authStore';

const ChartViewer = ({ chartId, onEdit }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [parentPosition, setParentPosition] = useState(null);

  const canEdit = ['admin', 'manager'].includes(user?.role) || user?.isConsultant;

  useEffect(() => {
    fetchChartData();
  }, [chartId]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await organizationalChartService.getChart(chartId);
      setChartData(data);
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      setError('Failed to load organizational chart');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPosition = (parent) => {
    setParentPosition(parent);
    setShowAddDialog(true);
  };

  const handleEditPosition = (position) => {
    console.log('ChartViewer handleEditPosition v2 called with:', position.title, 'ID:', position.id);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Position has children?', position.children ? 'YES - THIS IS THE BUG!' : 'No');
    
    // CRITICAL: Ensure we're setting a fresh copy WITHOUT children
    const positionToEdit = {
      id: position.id,
      chart_id: position.chart_id,
      parent_position_id: position.parent_position_id,
      title: position.title,
      description: position.description,
      level: position.level,
      position_type: position.position_type,
      holder_id: position.holder_id,
      holder_user_id: position.holder_user_id,
      external_name: position.external_name,
      external_email: position.external_email,
      start_date: position.start_date,
      is_primary: position.is_primary,
      first_name: position.first_name,
      last_name: position.last_name,
      user_email: position.user_email,
      skills: position.skills ? [...position.skills] : [],
      responsibilities: position.responsibilities ? [...position.responsibilities] : []
      // EXPLICITLY NOT including children
    };
    console.log('Setting editingPosition to clean copy:', positionToEdit);
    setEditingPosition(positionToEdit);
    setShowEditDialog(true);
  };

  const handleCreatePosition = async (positionData) => {
    try {
      await organizationalChartService.addPosition(chartId, {
        ...positionData,
        parentPositionId: parentPosition?.id
      });
      await fetchChartData();
      setShowAddDialog(false);
      setParentPosition(null);
    } catch (error) {
      console.error('Failed to add position:', error);
      throw error;
    }
  };

  const handleUpdatePosition = async (positionData) => {
    try {
      await organizationalChartService.updatePosition(chartId, editingPosition.id, positionData);
      await fetchChartData();
      setShowEditDialog(false);
      setEditingPosition(null);
    } catch (error) {
      console.error('Failed to update position:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!chartData) {
    return null;
  }

  const { chart, positions } = chartData;

  return (
    <div className="space-y-6">
      {/* Chart Info Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{chart.name}</span>
            <Badge variant="secondary">Version {chart.version}</Badge>
          </CardTitle>
          {chart.description && (
            <p className="text-sm text-gray-600 mt-2">{chart.description}</p>
          )}
        </CardHeader>
      </Card>

      {/* Visual Org Chart */}
      <Card>
        <CardContent className="p-6">
          {positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Users className="h-12 w-12 mb-4" />
              <p className="mb-4">No positions defined yet</p>
              {canEdit && (
                <Button onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Start Building Chart
                </Button>
              )}
            </div>
          ) : (
            <VisualOrgChart
              positions={positions}
              onEdit={onEdit}
              onAddPosition={handleAddPosition}
              onEditPosition={handleEditPosition}
              canEdit={canEdit}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Positions</span>
              <span className="font-medium">{countPositions(positions)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Filled Positions</span>
              <span className="font-medium">{countFilledPositions(positions)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Open Positions</span>
              <span className="font-medium">
                {countPositions(positions) - countFilledPositions(positions)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Position Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Leadership</span>
              <span className="font-medium">
                {countPositionsByType(positions, 'leadership')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Management</span>
              <span className="font-medium">
                {countPositionsByType(positions, 'management')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Individual Contributors</span>
              <span className="font-medium">
                {countPositionsByType(positions, 'individual_contributor')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Chart Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Created by</span>
              <span className="font-medium">{chart.created_by_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Created on</span>
              <span className="font-medium">
                {new Date(chart.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Last updated</span>
              <span className="font-medium">
                {new Date(chart.updated_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Position Dialog */}
      {showEditDialog && editingPosition && (
        <EditPositionDialog
          key={`edit-${editingPosition.id}-${Date.now()}`} // Add timestamp to force re-render
          open={showEditDialog}
          onClose={() => {
            console.log('Closing edit dialog');
            setShowEditDialog(false);
            setEditingPosition(null);
          }}
          onSave={handleUpdatePosition}
          position={editingPosition}
          skills={[]} // TODO: fetch skills if needed
        />
      )}

      {/* Add Position Dialog */}
      {showAddDialog && (
        <AddPositionDialog
          open={showAddDialog}
          onClose={() => {
            setShowAddDialog(false);
            setParentPosition(null);
          }}
          onCreate={handleCreatePosition}
          parentPosition={parentPosition}
          skills={[]} // TODO: fetch skills if needed
        />
      )}
    </div>
  );
};

// Helper functions
const countPositions = (positions) => {
  let count = 0;
  const traverse = (nodes) => {
    nodes.forEach(node => {
      count++;
      if (node.children) {
        traverse(node.children);
      }
    });
  };
  traverse(positions);
  return count;
};

const countFilledPositions = (positions) => {
  let count = 0;
  const traverse = (nodes) => {
    nodes.forEach(node => {
      if (node.holder_id) {
        count++;
      }
      if (node.children) {
        traverse(node.children);
      }
    });
  };
  traverse(positions);
  return count;
};

const countPositionsByType = (positions, type) => {
  let count = 0;
  const traverse = (nodes) => {
    nodes.forEach(node => {
      if (node.position_type === type) {
        count++;
      }
      if (node.children) {
        traverse(node.children);
      }
    });
  };
  traverse(positions);
  return count;
};

export default ChartViewer;