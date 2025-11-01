import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { 
  Edit3, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Target,
  Eye,
  Archive,
  Plus,
  CheckSquare
} from 'lucide-react';

export function RockContextMenu({ 
  children, 
  rock, 
  priority, // Support both naming conventions
  onEdit, 
  onChangeStatus,
  onAddMilestone,
  onViewDetails,
  onArchive,
  onDuplicate,
  onCreateLinkedTodo,
  onCreateLinkedIssue,
  disabled = false 
}) {
  // Support both 'rock' and 'priority' prop names
  const item = rock || priority;
  
  if (disabled || !item) {
    return children;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-56">
        {/* View/Edit Details */}
        {onViewDetails && (
          <>
            <ContextMenuItem onClick={() => onViewDetails(item)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </ContextMenuItem>
          </>
        )}
        
        {/* Edit */}
        {onEdit && (
          <ContextMenuItem onClick={() => onEdit(item)}>
            <Edit3 className="mr-2 h-4 w-4" />
            Edit Priority
          </ContextMenuItem>
        )}
        
        {/* Duplicate */}
        {onDuplicate && (
          <ContextMenuItem onClick={() => onDuplicate(item)}>
            <Plus className="mr-2 h-4 w-4" />
            Duplicate Priority
          </ContextMenuItem>
        )}
        
        {/* Change Status - only show if handler provided */}
        {onChangeStatus && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={() => onChangeStatus(item, 'on-track')}
              disabled={item.status === 'on-track'}
            >
              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
              Mark On Track
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => onChangeStatus(item, 'off-track')}
              disabled={item.status === 'off-track'}
            >
              <AlertCircle className="mr-2 h-4 w-4 text-yellow-600" />
              Mark Off Track
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => onChangeStatus(item, 'complete')}
              disabled={item.status === 'complete'}
            >
              <XCircle className="mr-2 h-4 w-4 text-blue-600" />
              Mark Complete
            </ContextMenuItem>
          </>
        )}
        
        {/* Add Milestone */}
        {onAddMilestone && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onAddMilestone(item)}>
              <Target className="mr-2 h-4 w-4" />
              Add Milestone
            </ContextMenuItem>
          </>
        )}
        
        {/* Create Linked To-Do */}
        {onCreateLinkedTodo && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onCreateLinkedTodo(item)}>
              <CheckSquare className="mr-2 h-4 w-4" />
              Create Linked To-Do
            </ContextMenuItem>
          </>
        )}
        
        {/* Create Linked Issue */}
        {onCreateLinkedIssue && (
          <ContextMenuItem onClick={() => onCreateLinkedIssue(item)}>
            <AlertCircle className="mr-2 h-4 w-4" />
            Create Linked Issue
          </ContextMenuItem>
        )}
        
        {/* Archive */}
        {onArchive && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={() => onArchive(item)}
              className="text-gray-600 focus:text-gray-600"
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive Priority
            </ContextMenuItem>
          </>
        )}
        
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default RockContextMenu;