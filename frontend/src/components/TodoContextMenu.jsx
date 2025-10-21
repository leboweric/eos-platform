import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { 
  Edit, 
  Trash2, 
  CheckCircle,
  Circle,
  User,
  Calendar,
  Flag,
  Copy
} from 'lucide-react';

export function TodoContextMenu({ 
  children, 
  todo, 
  onEdit, 
  onDelete, 
  onToggleComplete,
  onReassign,
  onChangeDueDate,
  onChangePriority,
  onDuplicate,
  disabled = false,
  hidePriorityOptions = false,
  hideDeleteOption = false
}) {
  if (disabled) {
    return children;
  }

  const isComplete = todo.completed || todo.status === 'completed';

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-56">
        {/* Edit */}
        <ContextMenuItem onClick={() => onEdit?.(todo)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit To-Do
        </ContextMenuItem>
        
        {/* Duplicate */}
        {onDuplicate && (
          <ContextMenuItem onClick={() => onDuplicate(todo)}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate To-Do
          </ContextMenuItem>
        )}
        
        <ContextMenuSeparator />
        
        {/* Toggle Complete */}
        <ContextMenuItem onClick={() => onToggleComplete?.(todo)}>
          {isComplete ? (
            <>
              <Circle className="mr-2 h-4 w-4" />
              Mark Incomplete
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
              Mark Complete
            </>
          )}
        </ContextMenuItem>
        
        {/* Reassign */}
        {onReassign && (
          <ContextMenuItem onClick={() => onReassign(todo)}>
            <User className="mr-2 h-4 w-4" />
            Reassign
          </ContextMenuItem>
        )}
        
        {/* Change Due Date */}
        {onChangeDueDate && (
          <ContextMenuItem onClick={() => onChangeDueDate(todo)}>
            <Calendar className="mr-2 h-4 w-4" />
            Change Due Date
          </ContextMenuItem>
        )}
        
        {/* Priority */}
        {onChangePriority && !hidePriorityOptions && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onChangePriority(todo, 'high')}>
              <Flag className="mr-2 h-4 w-4 text-red-600" />
              High Priority
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onChangePriority(todo, 'medium')}>
              <Flag className="mr-2 h-4 w-4 text-yellow-600" />
              Medium Priority
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onChangePriority(todo, 'low')}>
              <Flag className="mr-2 h-4 w-4 text-gray-600" />
              Low Priority
            </ContextMenuItem>
          </>
        )}
        
        {/* Delete */}
        {!hideDeleteOption && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={() => onDelete?.(todo)}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete To-Do
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}