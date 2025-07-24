import { Plus, CheckSquare, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FloatingActionButtons = ({ onAddTodo, onAddIssue }) => {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
      {/* Add Issue Button */}
      <Button
        onClick={onAddIssue}
        className="h-14 px-4 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 whitespace-nowrap"
        title="Add a new issue"
      >
        <AlertCircle className="h-5 w-5" />
        <span className="text-sm font-medium">Add Issue</span>
      </Button>

      {/* Add To-Do Button */}
      <Button
        onClick={onAddTodo}
        className="h-14 px-4 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 whitespace-nowrap"
        title="Add a new to-do"
      >
        <CheckSquare className="h-5 w-5" />
        <span className="text-sm font-medium">Add To-Do</span>
      </Button>
    </div>
  );
};

export default FloatingActionButtons;