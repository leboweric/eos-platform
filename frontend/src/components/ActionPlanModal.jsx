import { useState } from 'react';
import { X, Download, Copy, Mail, FileText, Loader } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const ActionPlanModal = ({ isOpen, onClose, rock, actionPlan, isLoading }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(actionPlan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([actionPlan], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rock.title.replace(/[^a-z0-9]/gi, '_')}_Action_Plan.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Action Plan: ${rock.title}`);
    const body = encodeURIComponent(actionPlan);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Action Plan</h2>
              <p className="text-sm text-gray-600 mt-1">{rock?.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600 text-lg">Generating your action plan...</p>
              <p className="text-gray-500 text-sm mt-2">This may take 15-30 seconds</p>
            </div>
          ) : actionPlan ? (
            <div className="prose prose-blue max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold text-gray-800 mb-3 mt-5">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold text-gray-700 mb-2 mt-4">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-gray-700 mb-3 leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-700 ml-4">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900">{children}</strong>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 text-gray-700 italic">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {actionPlan}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">No action plan available</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!isLoading && actionPlan && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-3">
              <button
                onClick={handleCopy}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
              <button
                onClick={handleEmail}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>Email</span>
              </button>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionPlanModal;

