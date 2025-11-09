import { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link2,
  Code
} from 'lucide-react';

const RichTextEditor = ({ value, onChange, placeholder, className = '' }) => {
  const editorRef = useRef(null);
  const [selectedText, setSelectedText] = useState('');
  
  useEffect(() => {
    // Set initial content
    if (editorRef.current && value !== undefined) {
      // Convert plain text to HTML if needed
      const htmlContent = value.includes('<') ? value : value.replace(/\n/g, '<br>');
      if (editorRef.current.innerHTML !== htmlContent) {
        editorRef.current.innerHTML = htmlContent;
      }
    }
  }, []);

  const handleFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
    handleChange();
  };

  const handleChange = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      // Convert <div> tags to <br> for better compatibility
      const cleanContent = content
        .replace(/<div>/gi, '<br>')
        .replace(/<\/div>/gi, '')
        .replace(/^<br>/, ''); // Remove leading <br>
      onChange(cleanContent);
    }
  };

  const handleKeyDown = (e) => {
    // Handle Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      
      // Check if we're in a list (bullet or numbered)
      const inList = document.queryCommandState('insertUnorderedList') || 
                     document.queryCommandState('insertOrderedList');
      
      if (inList) {
        // Use indent/outdent for list items
        if (e.shiftKey) {
          document.execCommand('outdent', false, null);
        } else {
          document.execCommand('indent', false, null);
        }
      } else {
        // For regular text, insert spaces
        document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
      }
      
      handleChange();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleChange();
  };

  const isFormatActive = (format) => {
    return document.queryCommandState(format);
  };

  const ToolbarButton = ({ icon: Icon, command, value, title }) => {
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
      const checkActive = () => {
        setIsActive(document.queryCommandState(command));
      };
      
      // Check on selection change
      document.addEventListener('selectionchange', checkActive);
      return () => document.removeEventListener('selectionchange', checkActive);
    }, [command]);

    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`h-8 w-8 p-0 hover:bg-slate-100 ${isActive ? 'bg-slate-200' : ''}`}
        onClick={() => handleFormat(command, value)}
        title={title}
      >
        <Icon className="h-4 w-4" />
      </Button>
    );
  };

  return (
    <div className={`h-full flex flex-col border rounded-xl overflow-hidden bg-white/80 backdrop-blur-sm ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-slate-50/50">
        <ToolbarButton icon={Bold} command="bold" title="Bold (Ctrl+B)" />
        <ToolbarButton icon={Italic} command="italic" title="Italic (Ctrl+I)" />
        <ToolbarButton icon={Underline} command="underline" title="Underline (Ctrl+U)" />
        
        <div className="w-px h-6 bg-slate-300 mx-1" />
        
        <ToolbarButton icon={List} command="insertUnorderedList" title="Bullet List" />
        <ToolbarButton icon={ListOrdered} command="insertOrderedList" title="Numbered List" />
        
        <div className="w-px h-6 bg-slate-300 mx-1" />
        
        <ToolbarButton icon={Quote} command="formatBlock" value="blockquote" title="Quote" />
        <ToolbarButton icon={Code} command="formatBlock" value="pre" title="Code Block" />
        
        <div className="w-px h-6 bg-slate-300 mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-slate-100"
          onClick={() => {
            const url = prompt('Enter URL:');
            if (url) {
              handleFormat('createLink', url);
            }
          }}
          title="Insert Link"
        >
          <Link2 className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-slate-100"
          onClick={() => handleFormat('removeFormat')}
          title="Clear Formatting"
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        className="flex-1 p-3 focus:outline-none rich-text-content overflow-y-auto"
        onInput={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      <style jsx>{`
        .rich-text-content:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
        }
        
        .rich-text-content blockquote {
          border-left: 3px solid #e5e7eb;
          padding-left: 1rem;
          margin: 0.5rem 0;
          color: #6b7280;
        }
        
        .rich-text-content pre {
          background: #f3f4f6;
          padding: 0.5rem;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.875rem;
          margin: 0.5rem 0;
        }
        
        .rich-text-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        
        .rich-text-content ul ul {
          list-style-type: circle;
          margin: 0.25rem 0;
        }
        
        .rich-text-content ul ul ul {
          list-style-type: square;
        }
        
        .rich-text-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        
        .rich-text-content ol ol {
          list-style-type: lower-alpha;
          margin: 0.25rem 0;
        }
        
        .rich-text-content ol ol ol {
          list-style-type: lower-roman;
        }
        
        .rich-text-content a {
          color: #3b82f6;
          text-decoration: underline;
        }
        
        .rich-text-content a:hover {
          color: #2563eb;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;