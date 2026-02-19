import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { organizationalChartService, skillsService } from '../services/organizationalChartService';
import { useTerminology } from '../contexts/TerminologyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Plus,
  Loader2,
  AlertCircle,
  Users,
  Building2,
  Edit,
  Trash2,
  Eye,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  X,
  User,
  UserPlus,
  UserMinus,
  CheckCircle,
  Save,
  MoreHorizontal,
  GripVertical,
  PanelRightOpen,
  PanelRightClose,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText
} from 'lucide-react';
import { organizationService } from '../services/organizationService';
import { getOrgTheme, saveOrgTheme, hexToRgba } from '../utils/themeUtils';

// ─────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────
const OrganizationalChartPage = () => {
  const { user } = useAuthStore();
  const { labels } = useTerminology();
  
  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [charts, setCharts] = useState([]);
  const [selectedChartId, setSelectedChartId] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  
  // Inspector panel state
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  
  // Inline editing state
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  
  // Visual state
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  
  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddPositionDialog, setShowAddPositionDialog] = useState(false);
  const [addPositionParent, setAddPositionParent] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  
  // Theme
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  
  const canEdit = ['admin', 'manager'].includes(user?.role) || user?.isConsultant;
  const containerRef = useRef(null);

  // ─── Data fetching ───
  useEffect(() => {
    fetchCharts();
    fetchTheme();
  }, []);

  useEffect(() => {
    if (selectedChartId) {
      fetchChartData(selectedChartId);
    }
  }, [selectedChartId]);

  // Auto-open first chart
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const autoOpen = urlParams.get('autoOpen') === 'true';
    if (autoOpen && charts.length > 0 && !selectedChartId) {
      setSelectedChartId(charts[0].id);
    } else if (!selectedChartId && charts.length > 0) {
      setSelectedChartId(charts[0].id);
    }
  }, [charts]);

  // Hide sidebar if coming from meeting
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromMeeting = urlParams.get('fromMeeting') === 'true';
    if (fromMeeting) {
      sessionStorage.setItem('hideSidebarTemp', 'true');
    }
    return () => {
      if (fromMeeting) {
        sessionStorage.removeItem('hideSidebarTemp');
      }
    };
  }, []);

  const fetchTheme = async () => {
    try {
      const orgId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
      const orgData = await organizationService.getOrganization();
      if (orgData) {
        const theme = {
          primary: orgData.theme_primary_color || '#3B82F6',
          secondary: orgData.theme_secondary_color || '#1E40AF',
          accent: orgData.theme_accent_color || '#60A5FA'
        };
        setThemeColors(theme);
        saveOrgTheme(orgId, theme);
      } else {
        const savedTheme = getOrgTheme(orgId);
        if (savedTheme) setThemeColors(savedTheme);
      }
    } catch (err) {
      console.error('Failed to fetch theme:', err);
    }
  };

  const fetchCharts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await organizationalChartService.getCharts(true);
      setCharts(data);
    } catch (err) {
      console.error('Failed to fetch charts:', err);
      setError('Failed to load organizational charts');
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async (chartId) => {
    try {
      const data = await organizationalChartService.getChart(chartId);
      setChartData(data);
      if (data?.teamMembers) {
        setTeamMembers(data.teamMembers);
      }
      // Expand all nodes by default
      const allIds = getAllNodeIds(data?.positions || []);
      setExpandedNodes(new Set(allIds));
    } catch (err) {
      console.error('Failed to fetch chart data:', err);
      setError('Failed to load chart data');
    }
  };

  const getAllNodeIds = (nodes) => {
    const ids = [];
    const traverse = (list) => {
      list.forEach(n => {
        ids.push(n.id);
        if (n.children?.length > 0) traverse(n.children);
      });
    };
    traverse(nodes);
    return ids;
  };

  // ─── Chart CRUD ───
  const handleCreateChart = async (name) => {
    try {
      const newChart = await organizationalChartService.createChart({ name, description: '' });
      await fetchCharts();
      // Select the new chart immediately
      if (newChart?.id) {
        setSelectedChartId(newChart.id);
      }
      setShowCreateDialog(false);
    } catch (err) {
      console.error('Failed to create chart:', err);
      throw err;
    }
  };

  const handleDeleteChart = async (chartId) => {
    try {
      await organizationalChartService.deleteChart(chartId);
      await fetchCharts();
      if (selectedChartId === chartId) {
        setSelectedChartId(null);
        setChartData(null);
        setSelectedPosition(null);
        setInspectorOpen(false);
      }
    } catch (err) {
      console.error('Failed to delete chart:', err);
      setError('Failed to delete chart');
    }
  };

  // ─── Position CRUD ───
  const handleAddPosition = async (positionData) => {
    if (!selectedChartId) return;
    try {
      await organizationalChartService.addPosition(selectedChartId, {
        ...positionData,
        parentPositionId: addPositionParent?.id || null
      });
      await fetchChartData(selectedChartId);
      setShowAddPositionDialog(false);
      setAddPositionParent(null);
    } catch (err) {
      console.error('Failed to add position:', err);
      throw err;
    }
  };

  const handleUpdatePosition = async (positionId, positionData) => {
    if (!selectedChartId) return;
    try {
      await organizationalChartService.updatePosition(selectedChartId, positionId, positionData);
      await fetchChartData(selectedChartId);
      // Refresh selected position
      if (selectedPosition?.id === positionId) {
        const updated = findPositionById(chartData?.positions || [], positionId);
        // Will be refreshed on next render from chartData
      }
    } catch (err) {
      console.error('Failed to update position:', err);
      throw err;
    }
  };

  const handleDeletePosition = async (positionId) => {
    if (!selectedChartId) return;
    try {
      await organizationalChartService.deletePosition(selectedChartId, positionId);
      if (selectedPosition?.id === positionId) {
        setSelectedPosition(null);
        setInspectorOpen(false);
      }
      await fetchChartData(selectedChartId);
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
    } catch (err) {
      console.error('Failed to delete position:', err);
      setError('Failed to delete position');
    }
  };

  const handleAssignHolder = async (positionId, holderData) => {
    if (!selectedChartId) return;
    try {
      await organizationalChartService.assignPositionHolder(selectedChartId, positionId, holderData);
      await fetchChartData(selectedChartId);
    } catch (err) {
      console.error('Failed to assign holder:', err);
      throw err;
    }
  };

  const handleRemoveHolder = async (positionId) => {
    if (!selectedChartId) return;
    try {
      await organizationalChartService.removePositionHolder(selectedChartId, positionId);
      await fetchChartData(selectedChartId);
    } catch (err) {
      console.error('Failed to remove holder:', err);
    }
  };

  // ─── Inline title editing ───
  const startTitleEdit = (position) => {
    if (!canEdit) return;
    setEditingTitleId(position.id);
    setEditingTitleValue(position.title);
  };

  const saveTitleEdit = async () => {
    if (!editingTitleId || !editingTitleValue.trim()) {
      setEditingTitleId(null);
      return;
    }
    try {
      await handleUpdatePosition(editingTitleId, { title: editingTitleValue.trim() });
    } catch (err) {
      console.error('Failed to save title:', err);
    }
    setEditingTitleId(null);
  };

  // ─── Node selection ───
  const handleSelectPosition = (position) => {
    // Create a clean copy without children
    const clean = {
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
      avatar_url: position.avatar_url,
      skills: position.skills ? [...position.skills] : [],
      responsibilities: position.responsibilities ? [...position.responsibilities] : []
    };
    setSelectedPosition(clean);
    setInspectorOpen(true);
  };

  // ─── Tree helpers ───
  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) newSet.delete(nodeId);
      else newSet.add(nodeId);
      return newSet;
    });
  };

  const filterPositions = (nodes, query) => {
    if (!query) return nodes;
    return nodes.filter(node => {
      const matches =
        node.title?.toLowerCase().includes(query.toLowerCase()) ||
        node.first_name?.toLowerCase().includes(query.toLowerCase()) ||
        node.last_name?.toLowerCase().includes(query.toLowerCase()) ||
        node.external_name?.toLowerCase().includes(query.toLowerCase());
      const hasMatchingChildren = node.children && filterPositions(node.children, query).length > 0;
      return matches || hasMatchingChildren;
    }).map(node => ({
      ...node,
      children: node.children ? filterPositions(node.children, query) : []
    }));
  };

  const findPositionById = (nodes, id) => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findPositionById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Keep selectedPosition in sync with chartData
  useEffect(() => {
    if (selectedPosition && chartData?.positions) {
      const updated = findPositionById(chartData.positions, selectedPosition.id);
      if (updated) {
        const clean = {
          id: updated.id,
          chart_id: updated.chart_id,
          parent_position_id: updated.parent_position_id,
          title: updated.title,
          description: updated.description,
          level: updated.level,
          position_type: updated.position_type,
          holder_id: updated.holder_id,
          holder_user_id: updated.holder_user_id,
          external_name: updated.external_name,
          external_email: updated.external_email,
          start_date: updated.start_date,
          is_primary: updated.is_primary,
          first_name: updated.first_name,
          last_name: updated.last_name,
          user_email: updated.user_email,
          avatar_url: updated.avatar_url,
          skills: updated.skills ? [...updated.skills] : [],
          responsibilities: updated.responsibilities ? [...updated.responsibilities] : []
        };
        setSelectedPosition(clean);
      }
    }
  }, [chartData]);

  // ─── Zoom controls ───
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.4));
  const handleZoomReset = () => setZoom(1);

  // ─── Render ───
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const positions = chartData?.positions || [];
  const filteredPositions = filterPositions(positions, searchQuery);
  const currentChart = charts.find(c => c.id === selectedChartId);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* ─── LEFT SIDEBAR: Chart List ─── */}
      <div className="w-64 border-r bg-gray-50/80 flex flex-col flex-shrink-0">
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {labels.accountability_chart_label || 'Org Charts'}
          </h2>
          {canEdit && (
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              New Chart
            </Button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {charts.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No charts yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {charts.map(chart => (
                <div
                  key={chart.id}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                    selectedChartId === chart.id
                      ? 'bg-white shadow-sm border'
                      : 'hover:bg-white/60'
                  }`}
                  style={selectedChartId === chart.id ? { borderColor: hexToRgba(themeColors.primary, 0.3) } : {}}
                  onClick={() => setSelectedChartId(chart.id)}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <FileText className="h-4 w-4 flex-shrink-0" style={{ color: selectedChartId === chart.id ? themeColors.primary : '#9CA3AF' }} />
                    <span className={`text-sm truncate ${selectedChartId === chart.id ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                      {chart.name}
                    </span>
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete "${chart.name}"?`)) {
                          handleDeleteChart(chart.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── MAIN CANVAS ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="border-b bg-white px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            {currentChart && (
              <h1 className="text-lg font-semibold text-gray-900">{currentChart.name}</h1>
            )}
            {currentChart && (
              <Badge variant="secondary" className="text-xs">
                {positions.length} seat{positions.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search seats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-48 text-sm"
              />
            </div>
            
            {/* Zoom controls */}
            <div className="flex items-center border rounded-md">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleZoomOut}>
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleZoomIn}>
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleZoomReset}>
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Inspector toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => setInspectorOpen(!inspectorOpen)}
            >
              {inspectorOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Canvas + Inspector */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chart Canvas */}
          <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100/50" ref={containerRef}>
            {!selectedChartId ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Building2 className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium mb-2">Select a chart to view</p>
                <p className="text-sm">Or create a new one from the sidebar</p>
              </div>
            ) : positions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Users className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium mb-2">No seats defined yet</p>
                {canEdit && (
                  <Button
                    onClick={() => {
                      setAddPositionParent(null);
                      setShowAddPositionDialog(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Seat
                  </Button>
                )}
              </div>
            ) : (
              <div 
                className="min-w-max p-8"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
              >
                <div className="flex flex-col items-center">
                  {filteredPositions.map((position, index) => (
                    <div key={position.id} className={index > 0 ? 'mt-8' : ''}>
                      <OrgNode
                        position={position}
                        isExpanded={expandedNodes.has(position.id)}
                        onToggle={() => toggleNode(position.id)}
                        expandedNodes={expandedNodes}
                        toggleNode={toggleNode}
                        onSelect={handleSelectPosition}
                        onAddChild={(parent) => {
                          setAddPositionParent(parent);
                          setShowAddPositionDialog(true);
                        }}
                        selectedId={selectedPosition?.id}
                        canEdit={canEdit}
                        level={0}
                        themeColors={themeColors}
                        editingTitleId={editingTitleId}
                        editingTitleValue={editingTitleValue}
                        setEditingTitleValue={setEditingTitleValue}
                        onStartTitleEdit={startTitleEdit}
                        onSaveTitleEdit={saveTitleEdit}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── RIGHT INSPECTOR PANEL ─── */}
          {inspectorOpen && (
            <InspectorPanel
              position={selectedPosition}
              teamMembers={teamMembers}
              canEdit={canEdit}
              themeColors={themeColors}
              onClose={() => setInspectorOpen(false)}
              onUpdatePosition={handleUpdatePosition}
              onDeletePosition={(id) => {
                setDeleteTargetId(id);
                setShowDeleteConfirm(true);
              }}
              onAssignHolder={handleAssignHolder}
              onRemoveHolder={handleRemoveHolder}
            />
          )}
        </div>
      </div>

      {/* ─── DIALOGS ─── */}
      
      {/* Create Chart Dialog - Simplified */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <CreateChartForm
            onSubmit={handleCreateChart}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Add Position Dialog */}
      <Dialog open={showAddPositionDialog} onOpenChange={setShowAddPositionDialog}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <AddPositionForm
            parentPosition={addPositionParent}
            teamMembers={teamMembers}
            onSubmit={handleAddPosition}
            onCancel={() => {
              setShowAddPositionDialog(false);
              setAddPositionParent(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Seat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this seat and all its sub-positions? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleDeletePosition(deleteTargetId)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert className="border-red-200 bg-red-50 shadow-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              {error}
              <Button variant="ghost" size="sm" className="ml-4 h-6 w-6 p-0" onClick={() => setError(null)}>
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};


// ─────────────────────────────────────────────
// ORG NODE COMPONENT (Visual tree node)
// ─────────────────────────────────────────────
const OrgNode = ({ 
  position, isExpanded, onToggle, expandedNodes, toggleNode,
  onSelect, onAddChild, selectedId, canEdit, level, themeColors,
  editingTitleId, editingTitleValue, setEditingTitleValue, onStartTitleEdit, onSaveTitleEdit
}) => {
  const hasChildren = position.children && position.children.length > 0;
  const isVacant = !position.holder_id;
  const isSelected = selectedId === position.id;
  
  const getBorderColor = () => {
    if (level === 0) return themeColors.primary;
    if (level === 1) return themeColors.secondary;
    return themeColors.accent;
  };

  const getUserInitials = () => {
    if (position.first_name && position.last_name) {
      return `${position.first_name[0]}${position.last_name[0]}`.toUpperCase();
    }
    if (position.external_name) {
      const names = position.external_name.split(' ');
      return names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return position.title?.slice(0, 2).toUpperCase() || '??';
  };

  const getHolderName = () => {
    if (position.first_name && position.last_name) return `${position.first_name} ${position.last_name}`;
    if (position.external_name) return position.external_name;
    return 'Vacant';
  };

  const isEditingTitle = editingTitleId === position.id;

  return (
    <div className="flex flex-col items-center">
      {/* Position Card */}
      <div
        className={`group bg-white rounded-xl shadow-md hover:shadow-lg transition-all relative cursor-pointer ${
          isSelected ? 'ring-2 ring-offset-2' : ''
        }`}
        style={{ 
          minWidth: '280px', 
          maxWidth: '360px',
          borderLeft: `4px solid ${getBorderColor()}`,
          backgroundColor: hexToRgba(getBorderColor(), 0.02),
          ...(isSelected ? { '--tw-ring-color': themeColors.primary } : {})
        }}
        onClick={() => onSelect(position)}
      >
        <div className="p-5">
          {/* Header: Title + Expand */}
          <div className="flex items-center justify-between mb-3">
            {isEditingTitle ? (
              <Input
                autoFocus
                value={editingTitleValue}
                onChange={(e) => setEditingTitleValue(e.target.value)}
                onBlur={onSaveTitleEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveTitleEdit();
                  if (e.key === 'Escape') {
                    setEditingTitleValue('');
                    onSaveTitleEdit();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-7 text-base font-semibold px-1"
              />
            ) : (
              <h3 
                className="font-semibold text-base text-gray-900 cursor-text"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onStartTitleEdit(position);
                }}
                title={canEdit ? 'Double-click to edit title' : ''}
              >
                {position.title}
              </h3>
            )}
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                className="p-1 h-6 w-6"
              >
                {isExpanded ? 
                  <ChevronUp className="h-3.5 w-3.5" style={{ color: themeColors.accent }} /> : 
                  <ChevronDown className="h-3.5 w-3.5" style={{ color: themeColors.accent }} />
                }
              </Button>
            )}
          </div>

          {/* Person Info */}
          <div className="flex items-center space-x-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={position.avatar_url} />
              <AvatarFallback 
                className="text-xs"
                style={{ 
                  backgroundColor: isVacant ? hexToRgba(themeColors.accent, 0.2) : hexToRgba(getBorderColor(), 0.15),
                  color: isVacant ? themeColors.accent : getBorderColor()
                }}
              >
                {isVacant ? <User className="h-3.5 w-3.5" /> : getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <span className={`text-sm ${isVacant ? 'text-gray-400 italic' : 'text-gray-700'}`}>
              {getHolderName()}
            </span>
          </div>

          {/* Responsibilities preview (max 3) */}
          {position.responsibilities && position.responsibilities.length > 0 && (
            <div className="space-y-1">
              {position.responsibilities.slice(0, 3).map((resp, idx) => (
                <div key={idx} className="flex items-start text-xs text-gray-500">
                  <span className="mr-1.5 mt-0.5 text-gray-300">•</span>
                  <span className="line-clamp-1">{resp.responsibility}</span>
                </div>
              ))}
              {position.responsibilities.length > 3 && (
                <p className="text-xs text-gray-400 pl-3">+{position.responsibilities.length - 3} more</p>
              )}
            </div>
          )}
        </div>

        {/* Add child button */}
        {canEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(position);
            }}
            className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 h-6 w-6 rounded-full bg-white border-2 flex items-center justify-center shadow-sm hover:shadow-md transition-all opacity-0 group-hover:opacity-100"
            style={{ borderColor: themeColors.primary, color: themeColors.primary }}
            title="Add sub-seat"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Connector Lines + Children */}
      {hasChildren && isExpanded && (
        <>
          <div className="w-0.5 h-8" style={{ backgroundColor: hexToRgba(themeColors.accent, 0.4) }}></div>
          <div className="flex space-x-8">
            {position.children.map((child, index) => (
              <div key={child.id} className="flex flex-col items-center">
                {position.children.length > 1 && (
                  <div className="relative w-full h-4">
                    <div className="absolute top-0 left-1/2 w-0.5 h-4" style={{ backgroundColor: hexToRgba(themeColors.accent, 0.4) }}></div>
                    {index === 0 && (
                      <div className="absolute top-0 left-1/2 right-0 h-0.5" style={{ backgroundColor: hexToRgba(themeColors.accent, 0.4) }}></div>
                    )}
                    {index === position.children.length - 1 && (
                      <div className="absolute top-0 left-0 right-1/2 h-0.5" style={{ backgroundColor: hexToRgba(themeColors.accent, 0.4) }}></div>
                    )}
                    {index > 0 && index < position.children.length - 1 && (
                      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: hexToRgba(themeColors.accent, 0.4) }}></div>
                    )}
                  </div>
                )}
                <OrgNode
                  position={child}
                  isExpanded={expandedNodes.has(child.id)}
                  onToggle={() => toggleNode(child.id)}
                  expandedNodes={expandedNodes}
                  toggleNode={toggleNode}
                  onSelect={onSelect}
                  onAddChild={onAddChild}
                  selectedId={selectedId}
                  canEdit={canEdit}
                  level={level + 1}
                  themeColors={themeColors}
                  editingTitleId={editingTitleId}
                  editingTitleValue={editingTitleValue}
                  setEditingTitleValue={setEditingTitleValue}
                  onStartTitleEdit={onStartTitleEdit}
                  onSaveTitleEdit={onSaveTitleEdit}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};


// ─────────────────────────────────────────────
// INSPECTOR PANEL (Right side)
// ─────────────────────────────────────────────
const InspectorPanel = ({ 
  position, teamMembers, canEdit, themeColors,
  onClose, onUpdatePosition, onDeletePosition, onAssignHolder, onRemoveHolder 
}) => {
  const [editingResponsibilities, setEditingResponsibilities] = useState(false);
  const [responsibilities, setResponsibilities] = useState([]);
  const [newResp, setNewResp] = useState('');
  const [positionType, setPositionType] = useState('individual_contributor');
  const [savingResp, setSavingResp] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');

  // Sync state when position changes
  useEffect(() => {
    if (position) {
      setResponsibilities(position.responsibilities?.map(r => ({
        id: r.id,
        responsibility: r.responsibility,
        priority: r.priority || 'medium'
      })) || []);
      setPositionType(position.position_type || 'individual_contributor');
      setEditingResponsibilities(false);
    }
  }, [position?.id, position?.responsibilities?.length]);

  const handleSaveResponsibilities = async () => {
    if (!position) return;
    setSavingResp(true);
    try {
      await onUpdatePosition(position.id, {
        title: position.title,
        positionType: positionType,
        responsibilities: responsibilities.map((r, i) => ({
          responsibility: r.responsibility,
          priority: r.priority,
          sort_order: i
        }))
      });
      setEditingResponsibilities(false);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSavingResp(false);
    }
  };

  const handleAddResp = () => {
    if (!newResp.trim() || responsibilities.length >= 7) return;
    setResponsibilities([...responsibilities, { responsibility: newResp.trim(), priority: 'medium' }]);
    setNewResp('');
  };

  const handleRemoveResp = (index) => {
    setResponsibilities(responsibilities.filter((_, i) => i !== index));
  };

  const handleAssign = async () => {
    if (!assignUserId || !position) return;
    try {
      await onAssignHolder(position.id, {
        userId: assignUserId,
        startDate: new Date().toISOString()
      });
      setAssignUserId('');
    } catch (err) {
      console.error('Failed to assign:', err);
    }
  };

  if (!position) {
    return (
      <div className="w-80 border-l bg-white flex flex-col flex-shrink-0">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Inspector</h3>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 p-6 text-center">
          <div>
            <Users className="h-10 w-10 mx-auto mb-3" />
            <p className="text-sm">Click a seat on the chart to view and edit its details</p>
          </div>
        </div>
      </div>
    );
  }

  const isVacant = !position.holder_id;

  return (
    <div className="w-80 border-l bg-white flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between" style={{ backgroundColor: hexToRgba(themeColors.primary, 0.03) }}>
        <h3 className="text-sm font-semibold text-gray-700 truncate">{position.title}</h3>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Seat Holder Section */}
        <div className="p-4 border-b">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Seat Holder</h4>
          {isVacant ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-gray-400">
                <Avatar className="h-8 w-8">
                  <AvatarFallback style={{ backgroundColor: hexToRgba(themeColors.accent, 0.15) }}>
                    <User className="h-4 w-4" style={{ color: themeColors.accent }} />
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm italic">Vacant</span>
              </div>
              {canEdit && (
                <div className="flex space-x-2">
                  <Select value={assignUserId} onValueChange={setAssignUserId}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Assign someone..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map(m => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          {m.first_name} {m.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-8 px-2" onClick={handleAssign} disabled={!assignUserId}>
                    <UserPlus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={position.avatar_url} />
                  <AvatarFallback 
                    className="text-xs"
                    style={{ backgroundColor: hexToRgba(themeColors.primary, 0.15), color: themeColors.primary }}
                  >
                    {position.first_name?.[0]}{position.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{position.first_name} {position.last_name}</p>
                  {position.user_email && <p className="text-xs text-gray-400">{position.user_email}</p>}
                </div>
              </div>
              {canEdit && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                  onClick={() => onRemoveHolder(position.id)}
                  title="Remove from seat"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Seat Type */}
        <div className="p-4 border-b">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Seat Type</h4>
          {canEdit && editingResponsibilities ? (
            <Select value={positionType} onValueChange={setPositionType}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leadership">Leadership</SelectItem>
                <SelectItem value="management">Management</SelectItem>
                <SelectItem value="individual_contributor">Individual Contributor</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="secondary" className="capitalize text-xs">
              {(position.position_type || 'individual_contributor').replace('_', ' ')}
            </Badge>
          )}
        </div>

        {/* Responsibilities */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Roles & Responsibilities
            </h4>
            {canEdit && !editingResponsibilities && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs"
                onClick={() => setEditingResponsibilities(true)}
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
          </div>

          {editingResponsibilities ? (
            <div className="space-y-2">
              {responsibilities.map((resp, idx) => (
                <div key={idx} className="flex items-start space-x-1.5">
                  <span className="text-gray-300 mt-1.5 text-xs">•</span>
                  <div className="flex-1 bg-gray-50 rounded px-2 py-1.5 text-xs">{resp.responsibility}</div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleRemoveResp(idx)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              {responsibilities.length < 7 && (
                <div className="flex space-x-1.5">
                  <Input
                    placeholder="Add responsibility..."
                    value={newResp}
                    onChange={(e) => setNewResp(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleAddResp(); }
                    }}
                    className="h-7 text-xs"
                  />
                  <Button size="sm" className="h-7 px-2" onClick={handleAddResp} disabled={!newResp.trim()}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <div className="flex items-center space-x-1.5 mt-1">
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <div key={n} className={`h-1.5 flex-1 rounded-full ${responsibilities.length >= n ? 'bg-green-500' : 'bg-gray-200'}`} />
                ))}
              </div>
              <p className="text-xs text-gray-400">{responsibilities.length}/7 responsibilities</p>

              <div className="flex space-x-2 pt-2">
                <Button size="sm" className="h-7 text-xs flex-1" onClick={handleSaveResponsibilities} disabled={savingResp}>
                  {savingResp ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                  Save
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                  setEditingResponsibilities(false);
                  setResponsibilities(position.responsibilities?.map(r => ({
                    id: r.id, responsibility: r.responsibility, priority: r.priority || 'medium'
                  })) || []);
                  setPositionType(position.position_type || 'individual_contributor');
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {position.responsibilities?.length > 0 ? (
                position.responsibilities.map((resp, idx) => (
                  <div key={idx} className="flex items-start text-xs text-gray-600">
                    <span className="mr-1.5 mt-0.5 text-gray-300">•</span>
                    <span>{resp.responsibility}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">No responsibilities defined</p>
              )}
            </div>
          )}
        </div>

        {/* Danger Zone */}
        {canEdit && (
          <div className="p-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => onDeletePosition(position.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete Seat
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};


// ─────────────────────────────────────────────
// CREATE CHART FORM (Simplified)
// ─────────────────────────────────────────────
const CreateChartForm = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit(name.trim());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create chart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Create New Chart</DialogTitle>
        <DialogDescription>
          Give your organizational chart a name to get started.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        {error && (
          <Alert className="border-red-200 bg-red-50 mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Label htmlFor="chartName">Chart Name</Label>
        <Input
          id="chartName"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Company Accountability Chart"
          className="mt-2"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading || !name.trim()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Create
        </Button>
      </DialogFooter>
    </form>
  );
};


// ─────────────────────────────────────────────
// ADD POSITION FORM
// ─────────────────────────────────────────────
const AddPositionForm = ({ parentPosition, teamMembers, onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [positionType, setPositionType] = useState('individual_contributor');
  const [holderId, setHolderId] = useState('');
  const [responsibilities, setResponsibilities] = useState([]);
  const [newResp, setNewResp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAddResp = () => {
    if (!newResp.trim() || responsibilities.length >= 7) return;
    setResponsibilities([...responsibilities, { responsibility: newResp.trim(), priority: 'medium' }]);
    setNewResp('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        positionType,
        holderId: holderId === 'unassigned' ? null : holderId || null,
        responsibilities: responsibilities.map((r, i) => ({
          responsibility: r.responsibility,
          priority: r.priority,
          sort_order: i
        }))
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create seat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Add New Seat</DialogTitle>
        <DialogDescription>
          {parentPosition ? `Adding under: ${parentPosition.title}` : 'Adding a root-level seat'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-2">
          <Label>Seat Title <span className="text-red-500">*</span></Label>
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., VP of Operations"
          />
        </div>

        <div className="grid gap-2">
          <Label>Seat Type</Label>
          <Select value={positionType} onValueChange={setPositionType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="leadership">Leadership</SelectItem>
              <SelectItem value="management">Management</SelectItem>
              <SelectItem value="individual_contributor">Individual Contributor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Assign To (Optional)</Label>
          <Select value={holderId} onValueChange={setHolderId}>
            <SelectTrigger><SelectValue placeholder="Select a team member..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {teamMembers.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  {m.first_name} {m.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Roles & Responsibilities</Label>
            <span className={`text-xs font-medium ${responsibilities.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
              {responsibilities.length}/7
            </span>
          </div>

          {responsibilities.length > 0 && (
            <div className="space-y-1.5">
              {responsibilities.map((resp, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <span className="text-gray-300 mt-2">•</span>
                  <div className="flex-1 bg-gray-50 rounded-lg px-3 py-1.5 text-sm">{resp.responsibility}</div>
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setResponsibilities(responsibilities.filter((_, i) => i !== idx))}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {responsibilities.length < 7 && (
            <div className="flex space-x-2">
              <Input
                placeholder="Enter a responsibility..."
                value={newResp}
                onChange={(e) => setNewResp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddResp(); }
                }}
              />
              <Button type="button" onClick={handleAddResp} disabled={!newResp.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex items-center space-x-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <div key={n} className={`h-1.5 flex-1 rounded-full ${responsibilities.length >= n ? 'bg-green-500' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading || !title.trim()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
          Create Seat
        </Button>
      </DialogFooter>
    </form>
  );
};

export default OrganizationalChartPage;
