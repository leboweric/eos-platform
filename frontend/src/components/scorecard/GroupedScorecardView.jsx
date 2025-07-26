import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Edit, 
  Trash2, 
  GripVertical,
  BarChart3 
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { scorecardGroupsService } from '../../services/scorecardGroupsService';
import { scorecardService } from '../../services/scorecardService';

const GroupedScorecardView = ({ 
  metrics, 
  weeklyScores, 
  monthlyScores,
  teamMembers,
  orgId,
  teamId,
  type, // 'weekly' or 'monthly'
  onMetricUpdate,
  onScoreUpdate,
  onMetricDelete,
  onChartOpen,
  onRefresh,
  showTotal,
  weekOptions,
  monthOptions,
  selectedWeeks,
  selectedMonths
}) => {
  const [groups, setGroups] = useState([]);
  const [ungroupedMetrics, setUngroupedMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupDialog, setGroupDialog] = useState({ isOpen: false, group: null });
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#3B82F6');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [draggedMetric, setDraggedMetric] = useState(null);
  const [dragOverGroup, setDragOverGroup] = useState(null);

  useEffect(() => {
    loadGroups();
  }, [orgId, teamId, type]);

  useEffect(() => {
    organizeMetricsByGroup();
  }, [metrics, groups]);

  const loadGroups = async () => {
    try {
      const fetchedGroups = await scorecardGroupsService.getGroups(orgId, teamId, type);
      setGroups(fetchedGroups);
      
      // Initialize expanded state for each group
      const expanded = {};
      fetchedGroups.forEach(group => {
        expanded[group.id] = group.is_expanded !== false;
      });
      setExpandedGroups(expanded);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const organizeMetricsByGroup = () => {
    const ungrouped = metrics.filter(metric => !metric.group_id);
    setUngroupedMetrics(ungrouped);
  };

  const handleCreateGroup = async () => {
    try {
      const newGroup = await scorecardGroupsService.createGroup(orgId, teamId, {
        name: newGroupName,
        color: newGroupColor,
        type: type || 'both'
      });
      setGroups([...groups, newGroup]);
      setNewGroupName('');
      setNewGroupColor('#3B82F6');
      setGroupDialog({ isOpen: false, group: null });
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const handleUpdateGroup = async (groupId, updates) => {
    try {
      const updatedGroup = await scorecardGroupsService.updateGroup(orgId, teamId, groupId, updates);
      setGroups(groups.map(g => g.id === groupId ? updatedGroup : g));
    } catch (error) {
      console.error('Failed to update group:', error);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm('Are you sure you want to delete this group? Metrics will be moved to ungrouped.')) {
      return;
    }
    
    try {
      await scorecardGroupsService.deleteGroup(orgId, teamId, groupId);
      setGroups(groups.filter(g => g.id !== groupId));
      // Reload metrics to reflect ungrouping
      window.location.reload();
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  const handleMoveMetricToGroup = async (metricId, groupId) => {
    try {
      console.log('Moving metric', metricId, 'to group', groupId);
      const response = await scorecardGroupsService.moveMetricToGroup(orgId, teamId, metricId, groupId);
      console.log('Move response:', response);
      
      // Update metrics immediately by modifying the group_id
      const updatedMetrics = metrics.map(m => 
        m.id === metricId ? { ...m, group_id: groupId } : m
      );
      
      // Refresh the parent component to get updated metrics
      if (onRefresh) {
        await onRefresh();
      } else {
        // Fallback: reload the page
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to move metric:', error);
      alert('Failed to move metric. Please try again.');
    }
  };

  const toggleGroupExpanded = async (groupId) => {
    const newExpanded = !expandedGroups[groupId];
    setExpandedGroups({ ...expandedGroups, [groupId]: newExpanded });
    
    // Update in backend
    try {
      await scorecardGroupsService.updateGroup(orgId, teamId, groupId, {
        is_expanded: newExpanded
      });
    } catch (error) {
      console.error('Failed to update group expanded state:', error);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, metric) => {
    setDraggedMetric(metric);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, groupId) => {
    e.preventDefault();
    setDragOverGroup(groupId);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOverGroup(null);
  };

  const handleDrop = async (e, groupId) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Drop event - groupId:', groupId, 'draggedMetric:', draggedMetric);
    setDragOverGroup(null);
    
    if (!draggedMetric) {
      console.log('No dragged metric found');
      return;
    }
    
    // Skip if dropping in the same group
    if (draggedMetric.group_id === groupId) {
      console.log('Metric already in this group');
      setDraggedMetric(null);
      return;
    }
    
    try {
      await handleMoveMetricToGroup(draggedMetric.id, groupId);
    } catch (error) {
      console.error('Failed to move metric:', error);
    }
    
    setDraggedMetric(null);
  };

  const handleDragEnd = () => {
    setDraggedMetric(null);
    setDragOverGroup(null);
  };

  const renderMetricRow = (metric, index) => {
    const isWeekly = metric.type === 'weekly';
    const scores = isWeekly ? weeklyScores[metric.id] || {} : monthlyScores[metric.id] || {};
    const periods = isWeekly ? selectedWeeks : selectedMonths;
    
    return (
      <tr 
        key={metric.id} 
        className="border-b hover:bg-gray-50 cursor-move"
        draggable
        onDragStart={(e) => handleDragStart(e, metric)}
        onDragEnd={handleDragEnd}
      >
        <td className="p-2 w-8">
          <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
        </td>
        <td className="p-2 font-medium w-48">{metric.name}</td>
        <td className="p-2 text-center w-20">{metric.goal}</td>
        <td className="p-2 text-center w-32">
          {teamMembers.find(m => m.id === metric.owner)?.name || 'Unassigned'}
        </td>
        {periods.map((period) => {
          const value = scores[period.value] || '';
          const goal = parseFloat(metric.goal) || 0;
          const actual = parseFloat(value) || 0;
          const isOnTrack = actual >= goal;
          
          return (
            <td key={period.value} className="p-2 text-center w-20">
              <button
                onClick={() => onScoreUpdate(metric, period.value, value)}
                className={`w-full px-2 py-1 rounded text-sm font-medium transition-colors
                  ${value ? (isOnTrack ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800') : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {value || '-'}
              </button>
            </td>
          );
        })}
        {showTotal && (
          <td className="p-2 text-center font-semibold w-20 bg-gray-50">
            {Object.values(scores).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(1)}
          </td>
        )}
        <td className="p-2 w-24">
          <div className="flex gap-1">
            <Button
              onClick={() => onChartOpen(metric)}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-blue-100"
            >
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </Button>
            <Button
              onClick={() => onMetricUpdate(metric)}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => onMetricDelete(metric.id)}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  if (loading) {
    return <div>Loading groups...</div>;
  }

  // Helper to render column headers
  const renderHeaders = () => {
    const isWeekly = type === 'weekly';
    const periods = isWeekly ? selectedWeeks : selectedMonths;
    const labels = isWeekly ? weekOptions : monthOptions;
    
    return (
      <Card className="mb-4">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="w-8"></th>
                <th className="text-left p-2 font-semibold text-gray-700 w-48">Metric</th>
                <th className="text-center p-2 font-semibold text-gray-700 w-20">Goal</th>
                <th className="text-center p-2 font-semibold text-gray-700 w-32">Owner</th>
                {labels.map((option, index) => {
                  const isCurrentPeriod = isWeekly 
                    ? index === labels.length - 1  // Last week is current
                    : index === labels.length - 1; // Last month is current
                  
                  return (
                    <th key={option.value} className={`text-center p-2 font-semibold text-xs w-20 ${
                      isCurrentPeriod ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700'
                    }`}>
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-normal text-gray-500 mb-1">
                          {isCurrentPeriod ? 'Current' : ''}
                        </span>
                        <span>{option.label}</span>
                      </div>
                    </th>
                  );
                })}
                {showTotal && <th className="text-center p-2 font-semibold text-gray-700 w-20 bg-gray-100">Total</th>}
                <th className="text-center p-2 font-semibold text-gray-700 w-24">Actions</th>
              </tr>
            </thead>
          </table>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Column Headers */}
      {renderHeaders()}
      
      {/* Groups */}
      {groups.map((group, groupIndex) => {
        const groupMetrics = metrics.filter(m => m.group_id === group.id);
        const isExpanded = expandedGroups[group.id];
        
        return (
          <Card 
            key={group.id} 
            className={`overflow-hidden transition-all ${dragOverGroup === group.id ? 'ring-2 ring-blue-500' : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, group.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, group.id)}
          >
            <CardHeader 
              className="cursor-pointer"
              style={{ backgroundColor: group.color + '20', borderLeft: `4px solid ${group.color}` }}
              onClick={() => toggleGroupExpanded(group.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  <span className="text-sm text-gray-600">({groupMetrics.length} metrics)</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGroupDialog({ isOpen: true, group });
                      setNewGroupName(group.name);
                      setNewGroupColor(group.color);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(group.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {isExpanded && (
              <CardContent className="p-0">
                {groupMetrics.length > 0 ? (
                  <table className="w-full">
                    <tbody>
                      {groupMetrics.map((metric, index) => renderMetricRow(metric, index))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No metrics in this group. Drag metrics here to add them.
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Ungrouped Metrics */}
      {ungroupedMetrics.length > 0 && (
        <Card
          className={`transition-all ${dragOverGroup === null ? 'ring-2 ring-blue-500' : ''}`}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, null)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
        >
          <CardHeader className="bg-gray-50">
            <CardTitle className="text-lg">Ungrouped Metrics</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <tbody>
                {ungroupedMetrics.map((metric, index) => renderMetricRow(metric, index))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Add Group Button */}
      <Button
        onClick={() => setGroupDialog({ isOpen: true, group: null })}
        variant="outline"
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Group
      </Button>

      {/* Group Dialog */}
      <Dialog open={groupDialog.isOpen} onOpenChange={(open) => !open && setGroupDialog({ isOpen: false, group: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{groupDialog.group ? 'Edit Group' : `Create New ${type === 'monthly' ? 'Monthly' : 'Weekly'} Group`}</DialogTitle>
            <DialogDescription>
              {groupDialog.group 
                ? 'Update the group details' 
                : `Create a new group to organize your ${type === 'monthly' ? 'monthly' : 'weekly'} metrics. This group will only appear in the ${type === 'monthly' ? 'Monthly' : 'Weekly'} view.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Financial Metrics"
              />
            </div>
            <div>
              <Label htmlFor="group-color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="group-color"
                  type="color"
                  value={newGroupColor}
                  onChange={(e) => setNewGroupColor(e.target.value)}
                  className="w-20"
                />
                <Input
                  value={newGroupColor}
                  onChange={(e) => setNewGroupColor(e.target.value)}
                  placeholder="#3B82F6"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialog({ isOpen: false, group: null })}>
              Cancel
            </Button>
            <Button onClick={groupDialog.group ? () => {
              handleUpdateGroup(groupDialog.group.id, { name: newGroupName, color: newGroupColor });
              setGroupDialog({ isOpen: false, group: null });
            } : handleCreateGroup}>
              {groupDialog.group ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupedScorecardView;