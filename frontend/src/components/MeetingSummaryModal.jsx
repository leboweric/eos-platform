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
  CheckCircle2
} from 'lucide-react';

// Document Section Component
const DocumentSection = ({ 
  title, 
  children, 
  collapsible = false,
  defaultOpen = true,
  isEmpty = false 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!collapsible) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-300">
          {title}
          {isEmpty && <span className="text-sm font-normal text-gray-400 ml-3">(Empty)</span>}
        </h2>
        <div className="pl-1">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left group"
        type="button"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-300 flex items-center justify-between">
          <span>
            {title}
            {isEmpty && <span className="text-sm font-normal text-gray-400 ml-3">(Empty)</span>}
          </span>
          <span className="text-gray-400 group-hover:text-gray-600">
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </span>
        </h2>
      </button>
      {isOpen && (
        <div className="pl-1">
          {children}
        </div>
      )}
    </div>
  );
};

// Empty State Component
const EmptyState = ({ message }) => (
  <div className="py-8 text-center">
    <p className="text-gray-400 italic text-base">{message}</p>
  </div>
);

// Helper to clean HTML tags from text and convert to plain text with line breaks
const cleanHtmlText = (text) => {
  if (!text) return '';
  if (typeof text !== 'string') return String(text);

  // Replace <br>, <br/>, <br /> with newlines
  let cleaned = text.replace(/<br\s*\/?>/gi, '\n');

  // Remove any other HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // Decode common HTML entities
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/&nbsp;/g, ' ');

  return cleaned.trim();
};

// List Item Component
const ListItem = ({ children, completed = false }) => (
  <div className="flex items-start gap-3 py-3 border-b border-gray-200 last:border-0">
    <div className={`mt-1 ${completed ? 'text-green-600' : 'text-gray-600'}`}>
      {completed ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <span className="text-lg">•</span>
      )}
    </div>
    <div className={`flex-1 text-base leading-relaxed whitespace-pre-wrap ${completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
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
    console.log(`🔎 Searching for section: "${sectionComment}"`);
    const items = [];
    const allComments = [];
    const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_COMMENT);
    
    while (walker.nextNode()) {
      allComments.push(walker.currentNode);
    }
    
    const targetComment = allComments.find(c => 
      c.textContent.trim().toUpperCase().includes(sectionComment.toUpperCase())
    );
    
    if (!targetComment) {
      console.log(`❌ Section "${sectionComment}" not found in comments`);
      return items;
    }
    
    console.log(`✅ Found section "${sectionComment}"`)
    
    let currentNode = targetComment.nextSibling;
    while (currentNode && currentNode.nodeType !== 8) {
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
    
    console.log(`📦 Extracted ${items.length} items from "${sectionComment}"`);
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
  
  // Debug logging to see what the parser extracted
  console.log('🔍 Parser Debug Results:', {
    htmlLength: htmlString?.length,
    docElementsFound: doc?.body?.children?.length,
    executiveSummary: result.executiveSummary?.substring(0, 100) + '...',
    headlines: result.headlines,
    cascadingMessages: result.cascadingMessages,
    solvedIssues: result.solvedIssues,
    newIssues: result.newIssues,
    completedTodos: result.completedTodos,
    newTodos: result.newTodos,
    totalIssues: (result.solvedIssues?.length || 0) + (result.newIssues?.length || 0),
    totalTodos: (result.completedTodos?.length || 0) + (result.newTodos?.length || 0)
  });
  
  // Check what comment nodes were found
  const allComments = [];
  const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_COMMENT);
  while (walker.nextNode()) {
    allComments.push(walker.currentNode.textContent);
  }
  console.log('🔍 All comment nodes found in HTML:', allComments);
  
  return result;
};

// Main Modal Component
export const MeetingSummaryModal = ({ 
  open, 
  onOpenChange, 
  summaryData,  // Now receiving JSON data directly
  summaryHTML,  // Keep for backward compatibility
  loading
}) => {
  // Use direct JSON data if available, otherwise parse HTML (backward compatibility)
  const parsedData = React.useMemo(() => {
    if (summaryData) {
      console.log('📊 Using direct JSON data:', summaryData);
      
      // Normalize headlines - can be object {customer: [], employee: []} or array
      let headlinesArray = [];
      if (summaryData.headlines) {
        if (Array.isArray(summaryData.headlines)) {
          headlinesArray = summaryData.headlines;
        } else if (typeof summaryData.headlines === 'object') {
          // Combine customer and employee headlines
          const customerHeadlines = summaryData.headlines.customer || [];
          const employeeHeadlines = summaryData.headlines.employee || [];
          headlinesArray = [...customerHeadlines, ...employeeHeadlines];
        }
      }
      
      // Normalize cascading messages
      let cascadingMessagesArray = [];
      if (summaryData.cascadingMessages) {
        if (Array.isArray(summaryData.cascadingMessages)) {
          cascadingMessagesArray = summaryData.cascadingMessages;
        } else if (typeof summaryData.cascadingMessages === 'object') {
          // Combine customer and employee messages
          const customerMessages = summaryData.cascadingMessages.customer || [];
          const employeeMessages = summaryData.cascadingMessages.employee || [];
          cascadingMessagesArray = [...customerMessages, ...employeeMessages];
        }
      }
      
      // Transform backend JSON structure to match expected format
      return {
        meetingInfo: {
          teamName: summaryData.teamName,
          meetingType: summaryData.meetingType,
          meta: summaryData.meetingDate
        },
        aiSummary: summaryData.aiSummary,
        headlines: headlinesArray,
        cascadingMessages: cascadingMessagesArray,
        solvedIssues: Array.isArray(summaryData.issues?.solved) ? summaryData.issues.solved : [],
        newIssues: Array.isArray(summaryData.issues?.new) ? summaryData.issues.new : [],
        completedTodos: Array.isArray(summaryData.todos?.completed) ? summaryData.todos.completed : [],
        newTodos: Array.isArray(summaryData.todos?.new) ? summaryData.todos.new : []
      };
    }
    if (!summaryHTML) return null;
    console.log('📊 Falling back to HTML parsing');
    return parseHTMLSummary(summaryHTML);
  }, [summaryData, summaryHTML]);

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
      <DialogContent className="w-[85vw] max-w-[1400px] max-h-[90vh] p-0 gap-0 flex flex-col">
        {/* Document Header Bar */}
        <div className="shrink-0 bg-white border-b px-6 py-3 pr-16 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Meeting Summary
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
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-0">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-600 mx-auto mb-3" />
                <p className="text-gray-600">Loading meeting summary...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 w-full">
              {/* Document Header */}
              <div className="mb-10 pb-6 border-b-4 border-gray-900">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {meetingInfo?.teamName || 'Meeting Summary'}
                </h1>
                <div className="text-base text-gray-700 space-y-1">
                  {meetingInfo?.meetingType && (
                    <div><strong>Type:</strong> {meetingInfo.meetingType}</div>
                  )}
                  {meetingInfo?.meta && (
                    <div><strong>Details:</strong> {meetingInfo.meta}</div>
                  )}
                </div>
              </div>

              {/* AI Executive Summary */}
              {aiSummary && (
                <DocumentSection title="Executive Summary" collapsible={false}>
                  <div className="bg-gray-50 border-l-4 border-gray-900 p-6 mb-6">
                    <p className="text-base leading-relaxed text-gray-800 whitespace-pre-wrap">
                      {typeof aiSummary === 'string' ? aiSummary : (
                        typeof aiSummary === 'object' ? (
                          aiSummary.executive_summary || 
                          aiSummary.summary || 
                          JSON.stringify(aiSummary, null, 2)
                        ) : String(aiSummary)
                      )}
                    </p>
                  </div>
                </DocumentSection>
              )}

              {/* Headlines */}
              <DocumentSection
                title="Headlines"
                collapsible={true}
                defaultOpen={true}
                isEmpty={headlines.length === 0}
              >
                {headlines.length === 0 ? (
                  <EmptyState message="No headlines shared" />
                ) : (
                  <div>
                    {headlines.map((headline, idx) => (
                      <ListItem key={idx}>{cleanHtmlText(typeof headline === 'string' ? headline : headline.text)}</ListItem>
                    ))}
                  </div>
                )}
              </DocumentSection>

              {/* Cascading Messages */}
              <DocumentSection
                title="Cascading Messages"
                collapsible={true}
                defaultOpen={cascadingMessages.length > 0}
                isEmpty={cascadingMessages.length === 0}
              >
                {cascadingMessages.length === 0 ? (
                  <EmptyState message="No cascading messages" />
                ) : (
                  <div>
                    {cascadingMessages.map((message, idx) => (
                      <ListItem key={idx}>{cleanHtmlText(typeof message === 'string' ? message : (message.message || message.text))}</ListItem>
                    ))}
                  </div>
                )}
              </DocumentSection>

              {/* Issues */}
              <DocumentSection title="Issues" collapsible={false}>
                <div className="grid grid-cols-2 gap-8">
                  {/* Solved Issues */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Solved Issues
                      {solvedIssues.length === 0 && <span className="text-sm font-normal text-gray-400 ml-2">(Empty)</span>}
                    </h3>
                    {solvedIssues.length === 0 ? (
                      <p className="text-gray-400 italic text-sm py-4">No issues solved</p>
                    ) : (
                      <div>
                        {solvedIssues.map((issue, idx) => (
                          <ListItem key={idx} completed={true}>{cleanHtmlText(issue.title)}</ListItem>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* New Issues */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      New Issues
                      {newIssues.length === 0 && <span className="text-sm font-normal text-gray-400 ml-2">(Empty)</span>}
                    </h3>
                    {newIssues.length === 0 ? (
                      <p className="text-gray-400 italic text-sm py-4">No new issues</p>
                    ) : (
                      <div>
                        {newIssues.map((issue, idx) => (
                          <ListItem key={idx}>{cleanHtmlText(issue.title)}</ListItem>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </DocumentSection>

              {/* To-Dos */}
              <DocumentSection title="To-Dos" collapsible={false}>
                <div className="grid grid-cols-2 gap-8">
                  {/* Completed To-Dos */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Completed
                      {completedTodos.length === 0 && <span className="text-sm font-normal text-gray-400 ml-2">(Empty)</span>}
                    </h3>
                    {completedTodos.length === 0 ? (
                      <p className="text-gray-400 italic text-sm py-4">No completed to-dos</p>
                    ) : (
                      <div>
                        {completedTodos.map((todo, idx) => (
                          <ListItem key={idx} completed={true}>{cleanHtmlText(todo.title)}</ListItem>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* New To-Dos */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      New To-Dos
                      {newTodos.length === 0 && <span className="text-sm font-normal text-gray-400 ml-2">(Empty)</span>}
                    </h3>
                    {newTodos.length === 0 ? (
                      <p className="text-gray-400 italic text-sm py-4">No new to-dos</p>
                    ) : (
                      <div>
                        {newTodos.map((todo, idx) => (
                          <ListItem key={idx}>{cleanHtmlText(todo.title)}</ListItem>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </DocumentSection>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingSummaryModal;