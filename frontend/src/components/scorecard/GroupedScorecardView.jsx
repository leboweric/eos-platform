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
  BarChart3,
  MessageSquare 
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { scorecardGroupsService } from '../../services/scorecardGroupsService';
import { scorecardService } from '../../services/scorecardService';
import { organizationService } from '../../services/organizationService';
import { getOrgTheme, saveOrgTheme } from '../../utils/themeUtils';
import { useAuthStore } from '../../stores/authStore';

const GroupedScorecardView = ({ 
  metrics, 
  weeklyScores, 
  monthlyScores,
  weeklyNotes,
  monthlyNotes,
  teamMembers,
  orgId,
  teamId,
  type, // 'weekly' or 'monthly'
  isRTL = false,
  onMetricUpdate,
  onScoreUpdate,
  onMetricDelete,
  onChartOpen,
  onRefresh,
  showTotal,
  weekOptions,
  monthOptions,
  weekOptionsOriginal,
  monthOptionsOriginal,
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
  const [draggedGroup, setDraggedGroup] = useState(null);
  const { user } = useAuthStore();
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  const [dragOverGroupIndex, setDragOverGroupIndex] = useState(null);
  const [draggedMetricIndex, setDraggedMetricIndex] = useState(null);
  const [dragOverMetricIndex, setDragOverMetricIndex] = useState(null);

  // Fetch organization theme
  const fetchOrganizationTheme = async () => {
    try {
      const currentOrgId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
      const orgData = await organizationService.getOrganization();
      
      if (orgData) {
        const theme = {
          primary: orgData.theme_primary_color || '#3B82F6',
          secondary: orgData.theme_secondary_color || '#1E40AF',
          accent: orgData.theme_accent_color || '#60A5FA'
        };
        setThemeColors(theme);
        saveOrgTheme(currentOrgId, theme);
      } else {
        const savedTheme = getOrgTheme(currentOrgId);
        if (savedTheme) {
          setThemeColors(savedTheme);
        }
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
      const currentOrgId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
      const savedTheme = getOrgTheme(currentOrgId);
      if (savedTheme) {
        setThemeColors(savedTheme);
      }
    }
  };

  // Format value based on type
  const formatValue = (value, valueType) => {
    if (value === null || value === undefined || value === '') return '-';
    switch (valueType) {
      case 'percentage':
        return `${Math.round(value)}%`;
      case 'currency':
        return `$${Math.round(value).toLocaleString()}`;
      case 'decimal':
        return parseFloat(value).toFixed(2);
      default:
        return Math.round(value);
    }
  };

  // Format goal with comparison operator
  const formatGoal = (goal, valueType, comparisonOperator) => {
    const formattedValue = formatValue(goal, valueType);
    
    switch (comparisonOperator) {
      case 'greater_equal':
        return `≥ ${formattedValue}`;
      case 'less_equal':
        return `≤ ${formattedValue}`;
      case 'equal':
        return `= ${formattedValue}`;
      default:
        return `≥ ${formattedValue}`; // Default to >= if not specified
    }
  };

  // Check if goal is met based on comparison operator
  const isGoalMet = (actual, goal, comparisonOperator) => {
    const actualVal = parseFloat(actual) || 0;
    const goalVal = parseFloat(goal) || 0;
    
    switch (comparisonOperator) {
      case 'less_equal':
        return actualVal <= goalVal;
      case 'equal':
        return actualVal === goalVal;
      case 'greater_equal':
      default:
        return actualVal >= goalVal;
    }
  };

  useEffect(() => {
    fetchOrganizationTheme();
    
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    const handleOrgChange = () => {
      fetchOrganizationTheme();
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    window.addEventListener('organizationChanged', handleOrgChange);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
      window.removeEventListener('organizationChanged', handleOrgChange);
    };
  }, [user?.organizationId, user?.organization_id]);

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
  const handleDragStart = (e, metric, index) => {
    setDraggedMetric(metric);
    setDraggedMetricIndex(index);
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
    setDraggedGroup(null);
    setDragOverGroupIndex(null);
    setDraggedMetricIndex(null);
    setDragOverMetricIndex(null);
  };

  // Metric drag handlers for reordering within groups
  const handleMetricDragEnter = (e, index) => {
    e.preventDefault();
    if (draggedMetricIndex !== index) {
      setDragOverMetricIndex(index);
    }
  };

  const handleMetricDragLeave = (e) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOverMetricIndex(null);
  };

  const handleMetricDrop = async (e, dropIndex, groupId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverMetricIndex(null);

    if (draggedMetricIndex === null || draggedMetricIndex === dropIndex || !draggedMetric) {
      return;
    }

    // Only handle reordering within the same group
    if (draggedMetric.group_id === groupId) {
      try {
        // Get metrics for this group (or ungrouped)
        const groupMetrics = metrics.filter(m => m.group_id === groupId);
        
        // Create new order array
        const newOrder = [...groupMetrics];
        const [movedMetric] = newOrder.splice(draggedMetricIndex, 1);
        newOrder.splice(dropIndex, 0, movedMetric);

        // Update display order for all metrics in the group
        const updates = newOrder.map((metric, index) => ({
          id: metric.id,
          display_order: index
        }));

        await scorecardService.updateMetricOrder(orgId, teamId, updates);
        
        // Refresh to get updated order
        if (onRefresh) {
          await onRefresh();
        }
      } catch (error) {
        console.error('Failed to reorder metrics:', error);
        alert('Failed to reorder metrics. Please try again.');
      }
    }
    
    setDraggedMetric(null);
    setDraggedMetricIndex(null);
  };

  // Group drag handlers
  const handleGroupDragStart = (e, group, index) => {
    setDraggedGroup({ group, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleGroupDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverGroupIndex(index);
  };

  const handleGroupDrop = async (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedGroup || draggedGroup.index === dropIndex) {
      setDraggedGroup(null);
      setDragOverGroupIndex(null);
      return;
    }

    // Reorder groups locally
    const newGroups = [...groups];
    const [movedGroup] = newGroups.splice(draggedGroup.index, 1);
    newGroups.splice(dropIndex, 0, movedGroup);

    // Update display orders
    const updatedGroups = newGroups.map((group, index) => ({
      id: group.id,
      display_order: index
    }));

    setGroups(newGroups);
    
    try {
      await scorecardGroupsService.updateGroupOrder(orgId, teamId, updatedGroups);
    } catch (error) {
      console.error('Failed to update group order:', error);
      // Revert on error
      await loadGroups();
    }

    setDraggedGroup(null);
    setDragOverGroupIndex(null);
  };

  const renderMetricRow = (metric, index, groupId) => {
    const isWeekly = metric.type === 'weekly';
    const scores = isWeekly ? weeklyScores[metric.id] || {} : monthlyScores[metric.id] || {};
    const notes = isWeekly ? weeklyNotes?.[metric.id] || {} : monthlyNotes?.[metric.id] || {};
    const periodsOriginal = isWeekly ? selectedWeeks : selectedMonths;
    const periods = isRTL ? [...periodsOriginal].reverse() : periodsOriginal;
    
    return (
      <tr 
        key={metric.id} 
        className={`border-b hover:bg-gray-50 cursor-move ${
          dragOverMetricIndex === index && draggedMetric?.group_id === groupId ? 'bg-gray-50' : ''
        }`}
        draggable
        onDragStart={(e) => handleDragStart(e, metric, index)}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragEnter={(e) => handleMetricDragEnter(e, index)}
        onDragLeave={handleMetricDragLeave}
        onDrop={(e) => handleMetricDrop(e, index, groupId)}
      >
        <td className="text-center p-2 w-8">
          <GripVertical className="h-4 w-4 text-gray-400 cursor-move mx-auto" />
        </td>
        <td className="text-center p-2 w-16 text-sm">
          {metric.ownerName || metric.owner || teamMembers.find(m => m.id === metric.owner)?.name || '-'}
        </td>
        <td className="text-left p-2 font-medium w-48">{metric.name}</td>
        <td className="text-center p-2 w-12">
          <Button
            onClick={() => onChartOpen(metric)}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-gray-100 mx-auto"
          >
            <BarChart3 className="h-4 w-4" style={{ color: themeColors.primary }} />
          </Button>
        </td>
        <td className="text-center p-2 w-20 font-semibold text-gray-700 text-sm">{formatGoal(metric.goal, metric.value_type, metric.comparison_operator)}</td>
        {/* Average column */}
        <td className="p-2 text-center bg-white border-l border-gray-200 font-semibold text-sm w-20">
          {(() => {
            const scoreValues = Object.values(scores).filter(v => v !== '' && v !== null && v !== undefined);
            if (scoreValues.length === 0) return '-';
            const average = scoreValues.reduce((sum, val) => sum + parseFloat(val), 0) / scoreValues.length;
            const avgGoalMet = isGoalMet(average, metric.goal, metric.comparison_operator);
            
            return (
              <span className={`px-2 py-1 rounded ${
                avgGoalMet ? 'text-green-800' : 'text-red-800'
              }`}>
                {metric.value_type === 'number' ? Math.round(average) : formatValue(average, metric.value_type)}
              </span>
            );
          })()}
        </td>
        {periods.map((period, periodIndex) => {
          const value = scores[period.value] || '';
          const noteValue = notes[period.value] || '';
          const hasNotes = noteValue && noteValue.length > 0;
          const goal = parseFloat(metric.goal) || 0;
          const actual = parseFloat(value) || 0;
          const isOnTrack = isGoalMet(actual, metric.goal, metric.comparison_operator);
          
          // Check if this is the current period based on original order
          const originalOptions = isWeekly ? weekOptionsOriginal : monthOptionsOriginal;
          const currentValue = originalOptions && originalOptions.length > 0 ? originalOptions[originalOptions.length - 1].value : null;
          const isCurrentPeriod = currentValue && period.value === currentValue;
          
          return (
            <td key={period.value} className={`p-2 text-center w-20 ${isCurrentPeriod ? 'bg-gray-50 border-2 border-gray-300' : ''}`}>
              <button
                onClick={() => onScoreUpdate(metric, period.value, value)}
                className={`w-full px-2 py-1 rounded text-sm font-medium transition-colors relative
                  ${value ? (isOnTrack ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200') : (isCurrentPeriod ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}`}
                title={hasNotes ? `Score: ${value}\nNotes: ${noteValue}` : ''}
              >
                <span>{value ? formatValue(value, metric.value_type) : '-'}</span>
                {hasNotes && (
                  <MessageSquare className="inline-block ml-1 h-3 w-3 opacity-60" />
                )}
              </button>
            </td>
          );
        })}
        {showTotal && (
          <td className="p-2 text-center font-semibold w-20 bg-white border-l border-gray-200">
            {Math.round(Object.values(scores).reduce((sum, val) => sum + (parseFloat(val) || 0), 0))}
          </td>
        )}
        <td className="text-center p-2 w-12">
          <div className="flex justify-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onMetricUpdate(metric)}
            >
              <Edit className="h-3 w-3" style={{ color: themeColors.primary }} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onMetricDelete(metric.id)}
            >
              <Trash2 className="h-3 w-3 text-red-600" />
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
    const labelsOriginal = isWeekly ? weekOptions : monthOptions;
    const labels = isRTL ? [...labelsOriginal].reverse() : labelsOriginal;
    
    return (
      <thead className="bg-white border-b border-gray-200">
        <tr>
          <th className="text-center p-2 font-semibold text-gray-700 w-8"></th>
          <th className="text-center p-2 font-semibold text-gray-700 w-16">Owner</th>
          <th className="text-left p-2 font-semibold text-gray-700 w-48">Metric</th>
          <th className="text-center p-2 font-semibold text-gray-700 w-12">Chart</th>
          <th className="text-center p-2 font-semibold text-gray-700 w-20">Goal</th>
          <th className="text-center p-2 font-semibold text-gray-700 w-20 border-l border-gray-200">Average</th>
          {labels.map((option, index) => {
            // Get current date
            const now = new Date();
            const currentMonth = now.toLocaleString('default', { month: 'short' }).toUpperCase();
            const currentYear = now.getFullYear().toString().slice(-2);
            const currentMonthLabel = `${currentMonth} ${currentYear}`;
            
            // Check if this is the current period based on original order
            const originalOptions = isWeekly ? weekOptionsOriginal : monthOptionsOriginal;
            const currentValue = originalOptions && originalOptions.length > 0 ? originalOptions[originalOptions.length - 1].value : null;
            const isCurrentPeriod = currentValue && option.value === currentValue
            
            return (
              <th key={option.value} className={`text-center p-2 font-semibold text-xs w-20 ${
                isCurrentPeriod ? 'text-gray-900 bg-gray-50 border-2 border-gray-300' : 'text-gray-700'
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
          {showTotal && <th className="text-center p-2 font-semibold text-gray-700 w-20 border-l border-gray-200">Total</th>}
          <th className="text-center p-2 font-semibold text-gray-700 w-12">Actions</th>
        </tr>
      </thead>
    );
  };

  return (
    <div className="space-y-6">
      {/* Groups */}
      {groups.map((group, groupIndex) => {
        const groupMetrics = metrics.filter(m => m.group_id === group.id);
        const isExpanded = expandedGroups[group.id];
        
        return (
          <Card 
            key={group.id} 
            className={`overflow-hidden transition-all bg-white border border-gray-200 ${
              dragOverGroup === group.id ? 'ring-2 ring-gray-400' : ''
            } ${
              dragOverGroupIndex === groupIndex ? 'border-t-4 border-t-gray-400' : ''
            }`}
            draggable
            onDragStart={(e) => handleGroupDragStart(e, group, groupIndex)}
            onDragOver={(e) => {
              handleDragOver(e);
              handleGroupDragOver(e, groupIndex);
            }}
            onDragEnter={(e) => handleDragEnter(e, group.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => {
              if (draggedGroup) {
                handleGroupDrop(e, groupIndex);
              } else {
                handleDrop(e, group.id);
              }
            }}
            onDragEnd={handleDragEnd}
          >
            <CardHeader 
              className="cursor-pointer bg-white border-b border-gray-200"
              style={{ borderLeft: `4px solid ${group.color}` }}
              onClick={() => toggleGroupExpanded(group.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
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
                    <Edit className="h-4 w-4" style={{ color: themeColors.primary }} />
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
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed">
                      {renderHeaders()}
                      <tbody>
                        {groupMetrics.map((metric, index) => renderMetricRow(metric, index, group.id))}
                      </tbody>
                    </table>
                  </div>
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
          className={`transition-all bg-white border border-gray-200 ${dragOverGroup === null ? 'ring-2 ring-gray-400' : ''}`}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, null)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
        >
          <CardHeader className="bg-white border-b border-gray-200">
            <CardTitle className="text-lg">Ungrouped Metrics</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                {renderHeaders()}
                <tbody>
                  {ungroupedMetrics.map((metric, index) => renderMetricRow(metric, index, null))}
                </tbody>
              </table>
            </div>
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
            <Button variant="outline" className="border-gray-300 hover:bg-gray-50" onClick={() => setGroupDialog({ isOpen: false, group: null })}>
              Cancel
            </Button>
            <Button className="bg-gray-900 hover:bg-gray-800 text-white" onClick={groupDialog.group ? () => {
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