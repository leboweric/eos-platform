import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ChevronUp, 
  ChevronDown, 
  Search,
  Edit,
  Plus,
  User
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { organizationService } from '../../services/organizationService';
import { getOrgTheme, saveOrgTheme, hexToRgba } from '../../utils/themeUtils';

const VisualOrgChart = ({ positions, onEdit, onAddPosition, onEditPosition, canEdit }) => {
  const { user } = useAuthStore();
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  const containerRef = useRef(null);
  
  // Create a flat map of all positions for quick lookup
  const positionMap = useRef({});

  // Fetch organization theme
  const fetchOrganizationTheme = async () => {
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
        if (savedTheme) {
          setThemeColors(savedTheme);
        }
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
      const orgId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
      const savedTheme = getOrgTheme(orgId);
      if (savedTheme) {
        setThemeColors(savedTheme);
      }
    }
  };

  const getAllNodeIds = (nodes) => {
    const ids = [];
    const traverse = (nodeList) => {
      nodeList.forEach(node => {
        ids.push(node.id);
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    traverse(nodes);
    return ids;
  };

  // Fetch theme on mount
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

  // Expand all nodes by default
  useEffect(() => {
    // Expand all nodes that have children
    const allNodeIds = getAllNodeIds(positions);
    setExpandedNodes(new Set(allNodeIds));
    
    // Build position map for quick lookup
    const newPositionMap = {};
    const buildMap = (nodes) => {
      nodes.forEach(node => {
        newPositionMap[node.id] = node;
        if (node.children) buildMap(node.children);
      });
    };
    buildMap(positions);
    positionMap.current = newPositionMap;
  }, [positions]);

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const filterPositions = (nodes, query) => {
    if (!query) return nodes;
    
    return nodes.filter(node => {
      const matchesSearch = 
        node.title.toLowerCase().includes(query.toLowerCase()) ||
        (node.first_name && node.first_name.toLowerCase().includes(query.toLowerCase())) ||
        (node.last_name && node.last_name.toLowerCase().includes(query.toLowerCase())) ||
        (node.external_name && node.external_name.toLowerCase().includes(query.toLowerCase()));
      
      const hasMatchingChildren = node.children && filterPositions(node.children, query).length > 0;
      
      return matchesSearch || hasMatchingChildren;
    }).map(node => ({
      ...node,
      children: node.children ? filterPositions(node.children, query) : []
    }));
  };

  const filteredPositions = filterPositions(positions, searchQuery);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search users or seats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {canEdit && (
          <Button 
            onClick={onEdit} 
            variant="outline"
            style={{ 
              borderColor: themeColors.primary,
              color: themeColors.primary
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = hexToRgba(themeColors.primary, 0.1);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Chart
          </Button>
        )}
      </div>

      {/* Org Chart */}
      <div ref={containerRef} className="overflow-x-auto">
        <div className="min-w-max p-8">
          {filteredPositions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No positions match your search</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {filteredPositions.map((position, index) => (
                <div key={position.id} className={index > 0 ? 'mt-8' : ''}>
                  <OrgNode
                    key={`root-node-${position.id}`}
                    position={position}
                    isExpanded={expandedNodes.has(position.id)}
                    onToggle={() => toggleNode(position.id)}
                    expandedNodes={expandedNodes}
                    toggleNode={toggleNode}
                    onAddPosition={onAddPosition}
                    onEditPosition={onEditPosition}
                    canEdit={canEdit}
                    level={0}
                    themeColors={themeColors}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const OrgNode = ({ position, isExpanded, onToggle, expandedNodes, toggleNode, onAddPosition, onEditPosition, canEdit, level, themeColors }) => {
  const hasChildren = position.children && position.children.length > 0;
  const isVacant = !position.holder_id;
  
  // Determine border color based on level
  const getBorderColor = () => {
    if (level === 0) return themeColors.primary; // CEO/Top level
    if (level === 1) return themeColors.secondary; // Department heads
    return themeColors.accent; // Team members
  };
  
  
  // Create handler functions that capture the current position
  const handleEditClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (canEdit) {
      // Create a clean copy without children to avoid circular references
      const positionCopy = {
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
      onEditPosition(positionCopy);
    }
  };
  
  const handleAddClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('handleAddClick - Position:', position.title, 'ID:', position.id, 'Level:', level);
    // Create a clean copy without children to avoid circular references
    const positionCopy = {
      id: position.id,
      title: position.title,
      position_type: position.position_type,
      holder_id: position.holder_id,
      first_name: position.first_name,
      last_name: position.last_name,
      external_name: position.external_name,
      avatar_url: position.avatar_url,
      responsibilities: position.responsibilities ? [...position.responsibilities] : []
    };
    onAddPosition(position);
  };

  const getUserInitials = () => {
    if (position.first_name && position.last_name) {
      return `${position.first_name[0]}${position.last_name[0]}`.toUpperCase();
    }
    if (position.external_name) {
      const names = position.external_name.split(' ');
      return names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return position.title.slice(0, 2).toUpperCase();
  };

  const getHolderName = () => {
    if (position.first_name && position.last_name) {
      return `${position.first_name} ${position.last_name}`;
    }
    if (position.external_name) {
      return position.external_name;
    }
    return 'Vacant';
  };

  return (
    <div className="flex flex-col items-center">
      {/* Position Card */}
      <Card 
        className={`bg-white p-6 shadow-md hover:shadow-lg transition-all relative ${canEdit ? 'cursor-pointer' : ''}`}
        style={{ 
          minWidth: '320px', 
          maxWidth: '400px',
          borderLeft: `4px solid ${getBorderColor()}`,
          borderTop: isVacant ? `2px dashed ${hexToRgba(getBorderColor(), 0.5)}` : 'none',
          backgroundColor: hexToRgba(getBorderColor(), 0.02)
        }}
        onMouseEnter={(e) => {
          if (canEdit) {
            e.currentTarget.style.boxShadow = `0 10px 25px ${hexToRgba(getBorderColor(), 0.15)}`;
            e.currentTarget.style.borderLeftWidth = '6px';
          }
        }}
        onMouseLeave={(e) => {
          if (canEdit) {
            e.currentTarget.style.boxShadow = '';
            e.currentTarget.style.borderLeftWidth = '4px';
          }
        }}
        onClick={handleEditClick}
        data-position-id={position.id}
        data-position-title={position.title}
        data-level={level}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">{position.title}</h3>
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="p-1"
            >
              {isExpanded ? 
                <ChevronUp className="h-4 w-4" style={{ color: themeColors.accent }} /> : 
                <ChevronDown className="h-4 w-4" style={{ color: themeColors.accent }} />
              }
            </Button>
          )}
        </div>

        {/* Person Info */}
        <div className="flex items-center space-x-3 mb-4">
          <Avatar>
            <AvatarImage src={position.avatar_url} />
            <AvatarFallback 
              style={{ 
                backgroundColor: isVacant ? hexToRgba(themeColors.accent, 0.2) : hexToRgba(getBorderColor(), 0.15),
                color: isVacant ? themeColors.accent : getBorderColor()
              }}
            >
              {isVacant ? <User className="h-4 w-4" /> : getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <span className={`${isVacant ? 'text-gray-400 italic' : 'text-gray-700'}`}>
            {getHolderName()}
          </span>
        </div>

        {/* Roles and Responsibilities */}
        {position.responsibilities && position.responsibilities.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-600">Roles and Responsibilities</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              {position.responsibilities.map((resp, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{resp.responsibility}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Add child button */}
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddClick}
            className="absolute bottom-2 right-2 p-1"
            style={{ color: themeColors.primary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = hexToRgba(themeColors.primary, 0.1);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </Card>

      {/* Connector Line */}
      {hasChildren && isExpanded && (
        <>
          <div className="w-0.5 h-8" style={{ backgroundColor: hexToRgba(themeColors.accent, 0.4) }}></div>
          
          {/* Children Container */}
          <div className="flex space-x-8">
            {position.children.map((child, index) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Horizontal connector for multiple children */}
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
                  key={`node-${child.id}-${level}`}
                  position={child}
                  isExpanded={expandedNodes.has(child.id)}
                  onToggle={() => toggleNode(child.id)}
                  expandedNodes={expandedNodes}
                  toggleNode={toggleNode}
                  onAddPosition={onAddPosition}
                  onEditPosition={onEditPosition}
                  canEdit={canEdit}
                  level={level + 1}
                  themeColors={themeColors}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default VisualOrgChart;