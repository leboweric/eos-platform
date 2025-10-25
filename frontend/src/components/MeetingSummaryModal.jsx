import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogClose 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  Download,
  X,
  Loader2,
  Sparkles,
  Megaphone,
  Users,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  ListTodo,
  Target,
  Calendar,
  Clock
} from 'lucide-react';

// Collapsible Section Component
const CollapsibleSection = ({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = true,
  badge = null,
  isEmpty = false 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-4 bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        type="button"
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 bg-blue-100 rounded-lg">
              <Icon className="h-5 w-5 text-blue-600" />
            </div>
          )}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {badge && (
            <Badge variant="secondary" className="ml-2">
              {badge}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEmpty && (
            <span className="text-sm text-gray-400 mr-2">(Empty)</span>
          )}
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>
      
      {isOpen && (
        <div className="p-4 pt-0 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};

// Empty State Component
const EmptyState = ({ message }) => (
  <div className="text-center py-8 px-4 bg-gray-50 rounded-lg">
    <p className="text-sm text-gray-500 italic">{message}</p>
  </div>
);

// List Item Component
const ListItem = ({ children, completed = false }) => (
  <div className="flex items-start gap-3 py-2 px-3 hover:bg-gray-50 rounded-md transition-colors">
    <div className={`mt-1 ${completed ? 'text-green-600' : 'text-blue-600'}`}>
      {completed ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-current" />
      )}
    </div>
    <div className={`flex-1 text-sm ${completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
      {children}
    </div>
  </div>
);

// Parse HTML to extract data
const parseHTMLSummary = (htmlString) => {
  if (!htmlString) return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Extract text content from sections
  const extractListItems = (sectionComment) => {
    const items = [];
    const allComments = [];
    const walker = document.createTreeWalker(doc, NodeFilter.SHOW_COMMENT);
    
    while (walker.nextNode()) {
      allComments.push(walker.currentNode);
    }
    
    const targetComment = allComments.find(c => 
      c.textContent.trim().toUpperCase().includes(sectionComment.toUpperCase())
    );
    
    if (!targetComment) return items;
    
    let currentNode = targetComment.nextSibling;
    while (currentNode && currentNode.nodeType !== 8) { // 8 = Comment node
      if (currentNode.classList && currentNode.classList.contains('section')) {
        const listItems = currentNode.querySelectorAll('.list li');
        listItems.forEach(li => {
          const text = li.textContent.trim();
          if (text && !text.toLowerCase().includes('no ')) {
            items.push(text);
          }
        });
        break;
      }
      currentNode = currentNode.nextSibling;
    }
    
    return items;
  };

  // Extract AI summary
  let aiSummary = null;
  const aiBox = doc.querySelector('.ai-summary-box');
  if (aiBox) {
    aiSummary = aiBox.textContent.trim();
    if (aiSummary.toLowerCase().includes('no summary') || !aiSummary) {
      aiSummary = null;
    }
  }

  // Extract meeting info from header
  const headerTitle = doc.querySelector('.header h1')?.textContent || '';
  const headerSubtitle = doc.querySelector('.header-subtitle')?.textContent || '';
  const headerMeta = doc.querySelector('.header-meta')?.textContent || '';

  return {
    meetingInfo: {
      teamName: headerTitle,
      meetingType: headerSubtitle,
      meta: headerMeta
    },
    aiSummary,
    headlines: extractListItems('HEADLINES'),
    cascadingMessages: extractListItems('CASCADING'),
    solvedIssues: extractListItems('SOLVED'),
    newIssues: extractListItems('NEW ISSUES'),
    completedTodos: extractListItems('COMPLETED'),
    newTodos: extractListItems('NEW TODOS')
  };
};

// Main Modal Component
export const MeetingSummaryModal = ({ 
  open, 
  onOpenChange, 
  summaryHTML,
  loading
}) => {
  // Parse HTML when it changes
  const parsedData = React.useMemo(() => {
    if (!summaryHTML) return null;
    return parseHTMLSummary(summaryHTML);
  }, [summaryHTML]);

  const {
    meetingInfo,
    aiSummary,
    headlines = [],
    cascadingMessages = [],
    solvedIssues = [],
    newIssues = [],
    completedTodos = [],
    newTodos = []
  } = parsedData || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[92vh] p-0 gap-0 flex flex-col">
        {/* Enhanced Header */}
        <div className="shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-white mb-1">
                {meetingInfo?.teamName || 'Meeting Summary'}
              </DialogTitle>
              {meetingInfo && (
                <div className="text-sm text-blue-100">
                  <div>{meetingInfo.meetingType}</div>
                  <div className="text-xs mt-1">{meetingInfo.meta}</div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => window.print()} 
                variant="outline" 
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                type="button"
              >
                <Download className="h-4 w-4 mr-2" />
                Save as PDF
              </Button>
              <DialogClose asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-white hover:bg-white/20"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="px-6 pb-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span>{solvedIssues.length} Issues Solved</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{newIssues.length} New Issues</span>
            </div>
            <div className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              <span>{newTodos.length} New To-Dos</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>{completedTodos.length} Completed</span>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Loading meeting summary...</p>
              </div>
            </div>
          ) : (
            <div className="p-6 max-w-5xl mx-auto">
              {/* AI Summary Section - ONLY SHOW IF EXISTS */}
              {aiSummary && (
                <CollapsibleSection
                  title="AI Meeting Summary"
                  icon={Sparkles}
                  defaultOpen={true}
                  isEmpty={false}
                >
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
                  </div>
                </CollapsibleSection>
              )}

              {/* Headlines Section */}
              <CollapsibleSection
                title="Headlines"
                icon={Megaphone}
                defaultOpen={true}
                badge={headlines.length > 0 ? `${headlines.length}` : null}
                isEmpty={headlines.length === 0}
              >
                {headlines.length === 0 ? (
                  <EmptyState message="No headlines shared" />
                ) : (
                  <div className="space-y-1">
                    {headlines.map((headline, idx) => (
                      <ListItem key={idx}>{headline}</ListItem>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              {/* Cascading Messages */}
              <CollapsibleSection
                title="Cascading Messages"
                icon={Megaphone}
                defaultOpen={false}
                badge={cascadingMessages.length > 0 ? `${cascadingMessages.length}` : null}
                isEmpty={cascadingMessages.length === 0}
              >
                {cascadingMessages.length === 0 ? (
                  <EmptyState message="No cascading messages" />
                ) : (
                  <div className="space-y-1">
                    {cascadingMessages.map((message, idx) => (
                      <ListItem key={idx}>{message}</ListItem>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              {/* Issues Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* Solved Issues */}
                <CollapsibleSection
                  title="Solved Issues"
                  icon={CheckCircle2}
                  defaultOpen={true}
                  badge={solvedIssues.length > 0 ? `${solvedIssues.length}` : null}
                  isEmpty={solvedIssues.length === 0}
                >
                  {solvedIssues.length === 0 ? (
                    <EmptyState message="No issues solved" />
                  ) : (
                    <div className="space-y-1">
                      {solvedIssues.map((issue, idx) => (
                        <ListItem key={idx} completed={true}>{issue}</ListItem>
                      ))}
                    </div>
                  )}
                </CollapsibleSection>

                {/* New Issues */}
                <CollapsibleSection
                  title="New Issues"
                  icon={AlertCircle}
                  defaultOpen={true}
                  badge={newIssues.length > 0 ? `${newIssues.length}` : null}
                  isEmpty={newIssues.length === 0}
                >
                  {newIssues.length === 0 ? (
                    <EmptyState message="No new issues" />
                  ) : (
                    <div className="space-y-1">
                      {newIssues.map((issue, idx) => (
                        <ListItem key={idx}>{issue}</ListItem>
                      ))}
                    </div>
                  )}
                </CollapsibleSection>
              </div>

              {/* To-Dos Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Completed To-Dos */}
                <CollapsibleSection
                  title="Completed To-Dos"
                  icon={CheckCircle2}
                  defaultOpen={false}
                  badge={completedTodos.length > 0 ? `${completedTodos.length}` : null}
                  isEmpty={completedTodos.length === 0}
                >
                  {completedTodos.length === 0 ? (
                    <EmptyState message="No completed to-dos" />
                  ) : (
                    <div className="space-y-1">
                      {completedTodos.map((todo, idx) => (
                        <ListItem key={idx} completed={true}>{todo}</ListItem>
                      ))}
                    </div>
                  )}
                </CollapsibleSection>

                {/* New To-Dos */}
                <CollapsibleSection
                  title="New To-Dos"
                  icon={ListTodo}
                  defaultOpen={true}
                  badge={newTodos.length > 0 ? `${newTodos.length}` : null}
                  isEmpty={newTodos.length === 0}
                >
                  {newTodos.length === 0 ? (
                    <EmptyState message="No new to-dos" />
                  ) : (
                    <div className="space-y-1">
                      {newTodos.map((todo, idx) => (
                        <ListItem key={idx}>{todo}</ListItem>
                      ))}
                    </div>
                  )}
                </CollapsibleSection>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingSummaryModal;