import { useState } from 'react';
import { AlertTriangle, Loader2, CheckCircle, Edit2, Archive, Check, X, Calendar } from 'lucide-react';
import { issuesService } from '../../services/issuesService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { FormattedText } from '@/components/ui/FormattedText';

export const HeadlineItem = ({
  headline,
  teamId,
  orgId,
  onIssueCreated,
  themeColors = { primary: '#3B82F6', secondary: '#8B5CF6' },
  type = 'Customer', // 'Customer' or 'Employee'
  showEditDelete = false, // For HeadlinesPage
  onEdit,
  onArchive,
  onUpdate,
  user,
  className = '',
  // For inline editing
  isEditing = false,
  editingText = '',
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditTextChange
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [localIssueCreated, setLocalIssueCreated] = useState(false);

  const handleCreateIssue = async (e) => {
    e.stopPropagation(); // Prevent any parent clicks
    
    if (isCreating) return;
    
    try {
      setIsCreating(true);
      
      // Create issue from headline using same pattern as Dashboard
      const issueData = {
        title: `Issue from Headline: ${headline.text.substring(0, 100)}`,
        description: `This issue was created from a ${type} headline reported in the Weekly Meeting:\n\n**Headline:** ${headline.text}\n**Type:** ${type}\n**Reported by:** ${headline.createdBy || headline.created_by_name || 'Unknown'}\n**Date:** ${format(new Date(headline.created_at), 'MMM d, yyyy')}\n\n**Next steps:**\n- [ ] Investigate root cause\n- [ ] Determine action plan\n- [ ] Assign owner`,
        timeline: 'short_term',
        priority_level: 'normal',
        organization_id: orgId,
        department_id: teamId,
        related_headline_id: headline.id
      };
      
const newIssue = await issuesService.createIssue(issueData);
      
      // Update local state immediately for instant visual feedback
      setLocalIssueCreated(true);
      
      toast.success(`Issue created from ${type} headline`);
      
      if (onIssueCreated) {
        onIssueCreated(newIssue);
      }
      
    } catch (error) {
      console.error('Failed to create issue from headline:', error);
      toast.error('Failed to create issue from headline');
    } finally {
      setIsCreating(false);
    }
  };

  const borderColor = type === 'Customer' ? themeColors.primary : themeColors.secondary;

  return (
    <div 
      className={`group relative bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-in-out mb-3 ${className}`}
      style={{ borderLeftColor: borderColor, borderLeftWidth: '3px' }}
    >
      {/* Content - either editing or display mode */}
      {isEditing ? (
        <div className="p-4 flex items-center gap-2">
          <input
            type="text"
            value={editingText}
            onChange={(e) => onEditTextChange && onEditTextChange(e.target.value)}
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2"
            style={{ borderColor: borderColor }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSaveEdit && onSaveEdit();
              } else if (e.key === 'Escape') {
                onCancelEdit && onCancelEdit();
              }
            }}
          />
          <button
            onClick={() => onSaveEdit && onSaveEdit()}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={() => onCancelEdit && onCancelEdit()}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="p-4 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div
              className={`text-base font-semibold text-slate-900 mb-2 leading-snug ${
                showEditDelete && (headline.created_by === user?.id || user?.role === 'admin')
                  ? 'cursor-pointer hover:text-slate-700 transition-colors'
                  : ''
              }`}
              onClick={() => {
                if (showEditDelete && (headline.created_by === user?.id || user?.role === 'admin') && onStartEdit) {
                  onStartEdit(headline);
                }
              }}
              title={showEditDelete && (headline.created_by === user?.id || user?.role === 'admin') ? "Click to edit" : ""}
            >
              <FormattedText text={headline.text} maxLines={2} expandable={true} />
            </div>
            
            {/* Enhanced Metadata */}
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="font-medium">
                {headline.created_by_name || headline.createdBy || 'Unknown'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(headline.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
          
          <div className="ml-4 flex-shrink-0">
            {/* Action buttons container - modernized icons */}
            <div className="flex items-center gap-1">
              {/* Create Issue button - modern styling */}
              {!headline.has_related_issue && !localIssueCreated && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 rounded-lg hover:bg-orange-50 disabled:opacity-50"
                      onClick={handleCreateIssue}
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-orange-500 hover:text-orange-600 transition-colors" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={5}>
                    <p>Create issue from headline</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* Edit/Archive buttons for HeadlinesPage */}
              {showEditDelete && (
                <>
                  {onStartEdit && (headline.created_by === user?.id || user?.role === 'admin') && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                          onClick={() => onStartEdit(headline)}
                        >
                          <Edit2 className="w-5 h-5 text-blue-600" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={5}>
                        <p>Edit headline</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  {onArchive && (headline.created_by === user?.id || user?.role === 'admin') && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 rounded-lg hover:bg-orange-50 disabled:opacity-50"
                          onClick={() => onArchive(headline)}
                        >
                          <Archive className="w-5 h-5 text-orange-600" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={5}>
                        <p>Archive headline</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}
              
              {/* Issue exists indicator - modernized */}
              {(headline.has_related_issue || localIssueCreated) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-2">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={5}>
                    <p>Issue already created</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeadlineItem;