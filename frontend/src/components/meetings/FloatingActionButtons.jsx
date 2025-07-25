import { useState } from 'react';
import { Plus, X, CheckSquare, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FloatingActionButtons = ({ onAddTodo, onAddIssue, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Action buttons - shown when expanded */}
      {isExpanded && (
        <>
          {/* Add Issue Button */}
          <Button
            onClick={onAddIssue}
            className="h-10 px-4 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md hover:shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
            title="Add a new issue"
          >
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Add Issue</span>
          </Button>

          {/* Add To-Do Button */}
          <Button
            onClick={onAddTodo}
            className="h-10 px-4 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-md hover:shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
            title="Add a new to-do"
          >
            <CheckSquare className="h-4 w-4" />
            <span className="text-sm font-medium">Add To-Do</span>
          </Button>
        </>
      )}

      {/* Toggle button */}
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`h-10 w-10 rounded-full shadow-md hover:shadow-lg transition-all duration-300 bg-blue-600 hover:bg-blue-700 text-white ${
          !isExpanded ? 'hover:scale-110' : ''
        }`}
        title={isExpanded ? 'Hide quick actions' : 'Show quick actions'}
      >
        {isExpanded ? (
          <X className="h-5 w-5" />
        ) : (
          <Plus className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
};

export default FloatingActionButtons;