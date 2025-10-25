import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogClose 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronUp,
  Download,
  X,
  Loader2,
  Sparkles,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  ListTodo
} from 'lucide-react';

// Collapsible Section Component
const CollapsibleSection = ({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = true,
  isEmpty = false 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-6 bg-white shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
        type="button"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-5 w-5 text-gray-600" />}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {isEmpty && (
            <span className="text-sm text-gray-400 ml-2">(Empty)</span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
      
      {isOpen && (
        <div className="p-6 pt-0 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};

// Empty State Component
const EmptyState = ({ message }) => (
  <div className="text-center py-12 px-4">
    <p className="text-gray-400 italic">{message}</p>
  </div>
);

// List Item Component
const ListItem = ({ children, completed = false }) => (
  <div className="flex items-start gap-3 py-3 px-4 hover:bg-gray-50 rounded-md transition-colors border-b border-gray-100 last:border-0">
    <div className={`mt-0.5 ${completed ? 'text-green-600' : 'text-gray-400'}`}>
      {completed ? (
        <CheckCircle2 className="h-5 w-5" />
      ) : (
        <div className="h-5 w-5 rounded-full border-2 border-current" />
      )}
    </div>
    <div className={`flex-1 ${completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
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
      <DialogContent className="w-[95vw] max-w-7xl max-h-[95vh] p-0 gap-0 flex flex-col">
        {/* Simple Header */}
        <div className="shrink-0 border-b bg-white">
          <div className="flex items-center justify-between px-8 py-5">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-semibold text-gray-900 mb-1">
                Meeting Summary
              </DialogTitle>
              {meetingInfo && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{meetingInfo.teamName}</span>
                  {meetingInfo.meetingType && (
                    <>
                      <span className="mx-2">•</span>
                      <span>{meetingInfo.meetingType}</span>
                    </>
                  )}
                  {meetingInfo.meta && (
                    <>
                      <span className="mx-2">•</span>
                      <span>{meetingInfo.meta}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => window.print()} 
                variant="outline" 
                size="sm"
                type="button"
              >
                <Download className="h-4 w-4 mr-2" />
                Save as PDF
              </Button>
              <DialogClose asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-600 mx-auto mb-3" />
                <p className="text-gray-600">Loading meeting summary...</p>
              </div>
            </div>
          ) : (
            <div className="p-8 max-w-6xl mx-auto">
              {/* AI Summary Section - ONLY SHOW IF EXISTS */}
              {aiSummary && (
                <CollapsibleSection
                  title="AI Executive Summary"
                  icon={Sparkles}
                  defaultOpen={true}
                  isEmpty={false}
                >
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed text-base whitespace-pre-wrap">
                      {aiSummary}
                    </p>
                  </div>
                </CollapsibleSection>
              )}

              {/* Headlines Section */}
              <CollapsibleSection
                title="Headlines"
                icon={Megaphone}
                defaultOpen={true}
                isEmpty={headlines.length === 0}
              >
                {headlines.length === 0 ? (
                  <EmptyState message="No headlines shared" />
                ) : (
                  <div className="space-y-0">
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
                isEmpty={cascadingMessages.length === 0}
              >
                {cascadingMessages.length === 0 ? (
                  <EmptyState message="No cascading messages" />
                ) : (
                  <div className="space-y-0">
                    {cascadingMessages.map((message, idx) => (
                      <ListItem key={idx}>{message}</ListItem>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              {/* Issues Section - Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Solved Issues */}
                <CollapsibleSection
                  title="Solved Issues"
                  icon={CheckCircle2}
                  defaultOpen={true}
                  isEmpty={solvedIssues.length === 0}
                >
                  {solvedIssues.length === 0 ? (
                    <EmptyState message="No issues solved" />
                  ) : (
                    <div className="space-y-0">
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
                  isEmpty={newIssues.length === 0}
                >
                  {newIssues.length === 0 ? (
                    <EmptyState message="No new issues" />
                  ) : (
                    <div className="space-y-0">
                      {newIssues.map((issue, idx) => (
                        <ListItem key={idx}>{issue}</ListItem>
                      ))}
                    </div>
                  )}
                </CollapsibleSection>
              </div>

              {/* To-Dos Section - Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Completed To-Dos */}
                <CollapsibleSection
                  title="Completed To-Dos"
                  icon={CheckCircle2}
                  defaultOpen={false}
                  isEmpty={completedTodos.length === 0}
                >
                  {completedTodos.length === 0 ? (
                    <EmptyState message="No completed to-dos" />
                  ) : (
                    <div className="space-y-0">
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
                  isEmpty={newTodos.length === 0}
                >
                  {newTodos.length === 0 ? (
                    <EmptyState message="No new to-dos" />
                  ) : (
                    <div className="space-y-0">
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