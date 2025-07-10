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

const VisualOrgChart = ({ positions, onEdit, onAddPosition, onEditPosition, canEdit }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  // Expand all nodes by default
  useEffect(() => {
    const allNodeIds = getAllNodeIds(positions);
    setExpandedNodes(new Set(allNodeIds));
  }, [positions]);

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
            placeholder="Search users or Seats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {canEdit && (
          <Button onClick={onEdit} variant="outline">
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
                    position={position}
                    isExpanded={expandedNodes.has(position.id)}
                    onToggle={() => toggleNode(position.id)}
                    expandedNodes={expandedNodes}
                    toggleNode={toggleNode}
                    onAddPosition={onAddPosition}
                    onEditPosition={onEditPosition}
                    canEdit={canEdit}
                    level={0}
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

const OrgNode = ({ position, isExpanded, onToggle, expandedNodes, toggleNode, onAddPosition, onEditPosition, canEdit, level }) => {
  const hasChildren = position.children && position.children.length > 0;
  const isVacant = !position.holder_id;

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
        className="bg-white p-6 shadow-md hover:shadow-lg transition-shadow cursor-pointer relative"
        style={{ minWidth: '320px', maxWidth: '400px' }}
        onClick={() => canEdit && onEditPosition(position)}
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
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Person Info */}
        <div className="flex items-center space-x-3 mb-4">
          <Avatar>
            <AvatarImage src={position.avatar_url} />
            <AvatarFallback className={isVacant ? 'bg-gray-200' : 'bg-gray-400'}>
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
              {position.responsibilities.slice(0, 5).map((resp, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{resp.responsibility}</span>
                </li>
              ))}
              {position.responsibilities.length > 5 && (
                <li className="text-gray-400 italic">
                  +{position.responsibilities.length - 5} more...
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Add child button */}
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddPosition(position);
            }}
            className="absolute bottom-2 right-2 p-1"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </Card>

      {/* Connector Line */}
      {hasChildren && isExpanded && (
        <>
          <div className="w-0.5 h-8 bg-gray-300"></div>
          
          {/* Children Container */}
          <div className="flex space-x-8">
            {position.children.map((child, index) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Horizontal connector for multiple children */}
                {position.children.length > 1 && (
                  <div className="relative w-full h-4">
                    <div className="absolute top-0 left-1/2 w-0.5 h-4 bg-gray-300"></div>
                    {index === 0 && (
                      <div className="absolute top-0 left-1/2 right-0 h-0.5 bg-gray-300"></div>
                    )}
                    {index === position.children.length - 1 && (
                      <div className="absolute top-0 left-0 right-1/2 h-0.5 bg-gray-300"></div>
                    )}
                    {index > 0 && index < position.children.length - 1 && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-300"></div>
                    )}
                  </div>
                )}
                
                <OrgNode
                  position={child}
                  isExpanded={expandedNodes.has(child.id)}
                  onToggle={() => toggleNode(child.id)}
                  expandedNodes={expandedNodes}
                  toggleNode={toggleNode}
                  onAddPosition={onAddPosition}
                  onEditPosition={onEditPosition}
                  canEdit={canEdit}
                  level={level + 1}
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