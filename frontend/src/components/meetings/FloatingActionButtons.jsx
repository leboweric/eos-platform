import { useState } from 'react';
import { Plus, CheckSquare, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FloatingActionButtons = ({ onAddTodo, onAddIssue }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-end gap-3">
      {/* Action buttons - shown when expanded */}
      <div className={`flex flex-col gap-3 transition-all duration-300 ${
        isExpanded 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        {/* Add Issue Button */}
        <Button
          onClick={() => {
            onAddIssue();
            setIsExpanded(false);
          }}
          className="h-12 pl-3 pr-4 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
            <AlertCircle className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Add Issue</span>
        </Button>

        {/* Add To-Do Button */}
        <Button
          onClick={() => {
            onAddTodo();
            setIsExpanded(false);
          }}
          className="h-12 pl-3 pr-4 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
            <CheckSquare className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Add To-Do</span>
        </Button>
      </div>

      {/* Main FAB toggle button */}
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`h-14 w-14 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 bg-blue-600 hover:bg-blue-700 text-white hover:scale-110 ${
          isExpanded ? 'rotate-45' : ''
        }`}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default FloatingActionButtons;