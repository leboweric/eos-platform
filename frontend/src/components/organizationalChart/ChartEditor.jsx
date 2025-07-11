import { useState, useEffect } from 'react';
import { organizationalChartService, skillsService } from '../../services/organizationalChartService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2,
  AlertCircle,
  Plus,
  Save,
  Users
} from 'lucide-react';
import PositionEditor from './PositionEditor';
import AddPositionDialog from './AddPositionDialog';
import EditPositionDialog from './EditPositionDialog';

const ChartEditor = ({ chartId, onUpdate }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [skills, setSkills] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [parentPosition, setParentPosition] = useState(null);
  const [editingPosition, setEditingPosition] = useState(null);

  useEffect(() => {
    fetchData();
  }, [chartId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [chartResponse, skillsResponse] = await Promise.all([
        organizationalChartService.getChart(chartId),
        skillsService.getOrganizationSkills()
      ]);
      setChartData(chartResponse);
      setSkills(skillsResponse);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPosition = (parent = null) => {
    setParentPosition(parent);
    setShowAddDialog(true);
  };

  const handleCreatePosition = async (positionData) => {
    try {
      await organizationalChartService.addPosition(chartId, {
        ...positionData,
        parentPositionId: parentPosition?.id
      });
      await fetchData();
      setShowAddDialog(false);
    } catch (error) {
      console.error('Failed to add position:', error);
      throw error;
    }
  };

  const handleEditPosition = (position) => {
    console.log('ChartEditor handleEditPosition called with:', position.title, 'ID:', position.id);
    // Create a clean copy without children to avoid the bug
    const cleanPosition = {
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
      // Explicitly NOT including children
    };
    console.log('Setting editingPosition to clean copy');
    setEditingPosition(cleanPosition);
    setShowEditDialog(true);
  };

  const handleUpdatePosition = async (positionData) => {
    try {
      setSaving(true);
      await organizationalChartService.updatePosition(chartId, editingPosition.id, positionData);
      await fetchData();
      setShowEditDialog(false);
      setEditingPosition(null);
    } catch (error) {
      console.error('Failed to update position:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePosition = async (positionId) => {
    if (!window.confirm('Are you sure you want to delete this position and all its sub-positions?')) {
      return;
    }

    try {
      await organizationalChartService.deletePosition(chartId, positionId);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete position:', error);
      setError('Failed to delete position');
    }
  };

  const handleAssignHolder = async (positionId, holderData) => {
    try {
      await organizationalChartService.assignPositionHolder(chartId, positionId, holderData);
      await fetchData();
    } catch (error) {
      console.error('Failed to assign holder:', error);
      throw error;
    }
  };

  const handleRemoveHolder = async (positionId) => {
    if (!window.confirm('Are you sure you want to remove this person from the position?')) {
      return;
    }

    try {
      await organizationalChartService.removePositionHolder(chartId, positionId);
      await fetchData();
    } catch (error) {
      console.error('Failed to remove holder:', error);
      setError('Failed to remove position holder');
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Edit: {chart.name}</span>
            <Button onClick={onUpdate} variant="outline">
              <Save className="mr-2 h-4 w-4" />
              Done Editing
            </Button>
          </CardTitle>
          <CardDescription>
            Add, edit, or remove positions in your organizational chart
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Positions
            </CardTitle>
            <CardDescription>
              Click on any position to edit it or add sub-positions
            </CardDescription>
          </div>
          <Button onClick={() => handleAddPosition(null)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Root Position
          </Button>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Users className="h-12 w-12 mb-4" />
              <p className="mb-4">No positions defined yet</p>
              <Button onClick={() => handleAddPosition(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Position
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {positions.map((position) => (
                <PositionEditor
                  key={position.id}
                  position={position}
                  skills={skills}
                  onUpdate={() => handleEditPosition(position)}
                  onDelete={handleDeletePosition}
                  onAddChild={handleAddPosition}
                  onAssignHolder={handleAssignHolder}
                  onRemoveHolder={handleRemoveHolder}
                  handleEditPosition={handleEditPosition}
                  level={0}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showAddDialog && (
        <AddPositionDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onCreate={handleCreatePosition}
          parentPosition={parentPosition}
          skills={skills}
        />
      )}

      {showEditDialog && editingPosition && (
        <EditPositionDialog
          open={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setEditingPosition(null);
          }}
          onSave={handleUpdatePosition}
          position={editingPosition}
          skills={skills}
        />
      )}
    </div>
  );
};

export default ChartEditor;