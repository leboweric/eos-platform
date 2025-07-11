import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Plus,
  User,
  UserPlus,
  UserMinus
} from 'lucide-react';

const PositionEditor = ({ 
  position, 
  skills, 
  onUpdate, 
  onDelete, 
  onAddChild, 
  onAssignHolder,
  onRemoveHolder,
  handleEditPosition,
  level = 0 
}) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = position.children && position.children.length > 0;
  const isVacant = !position.holder_id;

  return (
    <div className="space-y-2">
      <Card className={`p-4 ${level > 0 ? 'ml-8' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
            
            <div>
              <h4 className="font-semibold">{position.title}</h4>
              {position.holder_user_id ? (
                <p className="text-sm text-gray-600">
                  {position.first_name} {position.last_name}
                </p>
              ) : position.external_name ? (
                <p className="text-sm text-gray-600">{position.external_name}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">Vacant</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isVacant ? (
              <Button size="sm" variant="outline" onClick={() => onAssignHolder(position)}>
                <UserPlus className="h-4 w-4 mr-1" />
                Assign
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => onRemoveHolder(position.id)}>
                <UserMinus className="h-4 w-4 mr-1" />
                Remove
              </Button>
            )}
            
            <Button size="sm" variant="ghost" onClick={() => onAddChild(position)}>
              <Plus className="h-4 w-4" />
            </Button>
            
            <Button size="sm" variant="ghost" onClick={onUpdate}>
              <Edit2 className="h-4 w-4" />
            </Button>
            
            <Button size="sm" variant="ghost" onClick={() => onDelete(position.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {expanded && hasChildren && (
        <div className="space-y-2">
          {position.children.map((child) => (
            <PositionEditor
              key={child.id}
              position={child}
              skills={skills}
              onUpdate={handleEditPosition ? () => handleEditPosition(child) : onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onAssignHolder={onAssignHolder}
              onRemoveHolder={onRemoveHolder}
              handleEditPosition={handleEditPosition}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PositionEditor;