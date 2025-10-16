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
  Plus,
  ThumbsUp,
  Clock,
  Archive
} from 'lucide-react';

export function IssueContextMenu({ 
  children, 
  issue, 
  onEdit, 
  onDelete, 
  onMarkSolved,
  onCreateTodo,
  onVote,
  onMoveToLongTerm,
  onArchive,
  currentUserId,
  disabled = false 
}) {
  if (disabled) {
    return children;
  }

  const isSolved = issue.status === 'solved' || issue.completed;
  const hasVoted = issue.voters?.includes(currentUserId) || issue.user_has_voted;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-56">
        {/* Edit */}
        <ContextMenuItem onClick={() => onEdit?.(issue)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Issue
        </ContextMenuItem>
        
        {/* Create Linked Todo */}
        {onCreateTodo && (
          <ContextMenuItem onClick={() => onCreateTodo(issue)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Linked To-Do
          </ContextMenuItem>
        )}
        
        <ContextMenuSeparator />
        
        {/* Vote */}
        {onVote && (
          <ContextMenuItem onClick={() => onVote(issue)}>
            <ThumbsUp className={`mr-2 h-4 w-4 ${hasVoted ? 'text-blue-600' : ''}`} />
            {hasVoted ? 'Remove Vote' : 'Vote on Issue'}
          </ContextMenuItem>
        )}
        
        {/* Mark Solved */}
        {onMarkSolved && !isSolved && (
          <ContextMenuItem onClick={() => onMarkSolved(issue)}>
            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
            Mark Solved
          </ContextMenuItem>
        )}
        
        <ContextMenuSeparator />
        
        {/* Move to Long-Term */}
        {onMoveToLongTerm && (
          <ContextMenuItem onClick={() => onMoveToLongTerm(issue)}>
            <Clock className="mr-2 h-4 w-4" />
            Move to Long-Term
          </ContextMenuItem>
        )}
        
        {/* Archive */}
        {onArchive && (
          <ContextMenuItem onClick={() => onArchive(issue)}>
            <Archive className="mr-2 h-4 w-4" />
            Archive Issue
          </ContextMenuItem>
        )}
        
        {/* Delete */}
        <ContextMenuSeparator />
        <ContextMenuItem 
          onClick={() => onDelete?.(issue)}
          className="text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Issue
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}