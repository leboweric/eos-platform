import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  ChevronRight, 
  Edit, 
  Trash2, 
  Plus, 
  MoreVertical,
  GripVertical,
  BarChart3
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const GroupedScorecardView = ({
  groups,
  metrics,
  scores,
  type,
  weekDates,
  weekLabels,
  isRTL,
  showTotal,
  expandedGroups,
  onToggleGroup,
  onAddMetric,
  onEditMetric,
  onDeleteMetric,
  onEditGroup,
  onDeleteGroup,
  onScoreEdit,
  onChartClick,
  formatValue,
  formatGoal,
  isGoalMet,
  getMetricsByGroup
}) => {
  // Get ungrouped metrics
  const ungroupedMetrics = getMetricsByGroup(null, type);
  
  // Calculate averages and totals for a metric
  const calculateMetricStats = (metric) => {
    const metricScores = weekDates
      .map(date => scores[metric.id]?.[date])
      .filter(score => score !== undefined && score !== null && score !== '');
    
    if (metricScores.length === 0) return { average: null, total: null };
    
    const total = metricScores.reduce((sum, score) => sum + parseFloat(score), 0);
    const average = total / metricScores.length;
    
    return { average, total };
  };

  const renderMetricRow = (metric, index) => {
    const stats = calculateMetricStats(metric);
    const avgGoalMet = stats.average !== null && isGoalMet(stats.average, metric.goal, metric.comparison_operator);
    
    return (
      <tr key={metric.id} className="border-b hover:bg-gray-50">
        <td className="p-2 text-center w-8">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </td>
        <td className="p-2 text-center text-sm w-16">{metric.ownerName || metric.owner}</td>
        <td className="p-2 font-medium text-sm">{metric.name}</td>
        <td className="p-2 text-center w-12">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-blue-100"
            onClick={() => onChartClick(metric)}
            title={`View ${type === 'monthly' ? '3-month' : '3-week'} moving trend chart`}
          >
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </Button>
        </td>
        <td className="p-2 text-center font-semibold text-indigo-600 text-sm w-20">
          {formatGoal(metric.goal, metric.value_type, metric.comparison_operator)}
        </td>
        
        {/* Score columns */}
        {weekDates.map(date => {
          const score = scores[metric.id]?.[date];
          const goalMet = score && isGoalMet(score, metric.goal, metric.comparison_operator);
          
          return (
            <td key={date} className="p-2 text-center group">
              <button
                className={`w-full h-8 rounded text-center font-medium transition-colors cursor-pointer relative group ${
                  score
                    ? goalMet
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
                onClick={() => onScoreEdit(metric, date)}
              >
                <div className="flex items-center justify-center gap-1">
                  {score ? (
                    <>
                      <span className="text-sm">{formatValue(score, metric.value_type)}</span>
                      <Edit className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </>
                  ) : (
                    <span className="text-sm">-</span>
                  )}
                </div>
              </button>
            </td>
          );
        })}
        
        {/* Average column */}
        <td className="p-2 text-center bg-gray-50 font-semibold text-sm">
          {stats.average !== null ? (
            <span className={`px-2 py-1 rounded ${avgGoalMet ? 'text-green-800' : 'text-red-800'}`}>
              {metric.value_type === 'number' ? Math.round(stats.average) : formatValue(stats.average, metric.value_type)}
            </span>
          ) : '-'}
        </td>
        
        {/* Total column */}
        {showTotal && (
          <td className="p-2 text-center bg-gray-50 font-semibold text-sm">
            {stats.total !== null ? (
              <span className="text-gray-700">{formatValue(stats.total, metric.value_type)}</span>
            ) : '-'}
          </td>
        )}
        
        {/* Actions */}
        <td className="p-2 text-center">
          <div className="flex justify-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onEditMetric(metric)}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onDeleteMetric(metric.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  const renderGroupCard = (group) => {
    const groupMetrics = getMetricsByGroup(group.id, type);
    const isExpanded = expandedGroups[group.id] !== false; // Default to expanded
    
    return (
      <Card key={group.id} className="shadow-md border-0 mb-4">
        <CardHeader 
          className="cursor-pointer"
          style={{ backgroundColor: `${group.color}20`, borderLeft: `4px solid ${group.color}` }}
          onClick={() => onToggleGroup(group.id)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              <span style={{ color: group.color }}>{group.name}</span>
              <span className="text-sm font-normal text-gray-600">({groupMetrics.length} metrics)</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddMetric(group.id);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEditGroup(group)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Group
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDeleteGroup(group.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {group.description && (
            <p className="text-sm text-gray-600 mt-1">{group.description}</p>
          )}
        </CardHeader>
        {isExpanded && (
          <CardContent className="p-0">
            {groupMetrics.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No {type} metrics in this group. 
                <Button
                  variant="link"
                  onClick={() => onAddMetric(group.id)}
                  className="ml-1"
                >
                  Add one now
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-2 w-8"></th>
                      <th className="p-2 text-center text-xs font-semibold text-gray-700 w-16">Owner</th>
                      <th className="p-2 text-left text-xs font-semibold text-gray-700">Metric</th>
                      <th className="p-2 text-center text-xs font-semibold text-gray-700 w-12">Chart</th>
                      <th className="p-2 text-center text-xs font-semibold text-gray-700 w-20">Goal</th>
                      {weekLabels.map((label, i) => (
                        <th key={i} className="p-2 text-center text-xs font-semibold text-gray-700 w-16">
                          {label}
                        </th>
                      ))}
                      <th className="p-2 text-center text-xs font-semibold text-gray-700 w-20 bg-gray-100">Average</th>
                      {showTotal && <th className="p-2 text-center text-xs font-semibold text-gray-700 w-20 bg-gray-100">Total</th>}
                      <th className="p-2 text-center text-xs font-semibold text-gray-700 w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupMetrics.map((metric, index) => renderMetricRow(metric, index))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Render grouped metrics */}
      {groups.map(group => renderGroupCard(group))}
      
      {/* Render ungrouped metrics */}
      {ungroupedMetrics.length > 0 && (
        <Card className="shadow-md border-0">
          <CardHeader className="bg-gray-100">
            <CardTitle className="flex items-center justify-between">
              <span>Ungrouped Metrics</span>
              <span className="text-sm font-normal text-gray-600">({ungroupedMetrics.length} metrics)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-2 w-8"></th>
                    <th className="p-2 text-center text-xs font-semibold text-gray-700 w-16">Owner</th>
                    <th className="p-2 text-left text-xs font-semibold text-gray-700">Metric</th>
                    <th className="p-2 text-center text-xs font-semibold text-gray-700 w-12">Chart</th>
                    <th className="p-2 text-center text-xs font-semibold text-gray-700 w-20">Goal</th>
                    {weekLabels.map((label, i) => (
                      <th key={i} className="p-2 text-center text-xs font-semibold text-gray-700 w-16">
                        {label}
                      </th>
                    ))}
                    <th className="p-2 text-center text-xs font-semibold text-gray-700 w-20 bg-gray-100">Average</th>
                    {showTotal && <th className="p-2 text-center text-xs font-semibold text-gray-700 w-20 bg-gray-100">Total</th>}
                    <th className="p-2 text-center text-xs font-semibold text-gray-700 w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ungroupedMetrics.map((metric, index) => renderMetricRow(metric, index))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Empty state */}
      {groups.length === 0 && ungroupedMetrics.length === 0 && (
        <Card className="shadow-md border-0">
          <CardContent className="p-8 text-center text-gray-500">
            No {type} metrics defined. Click "Add Metric" to get started.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GroupedScorecardView;