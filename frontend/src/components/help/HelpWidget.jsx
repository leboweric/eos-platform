import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FeedbackDialog from './FeedbackDialog';

const HelpWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* Floating Help Button */}
      <div className="fixed bottom-6 left-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative h-16 w-16 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:scale-110 border-2 border-white"
          title="Get Help"
        >
          <HelpCircle className="h-9 w-9" />
          
          {/* Small "?" indicator */}
          <span className="absolute -top-0.5 -right-0.5 h-6 w-6 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold shadow-md">
            ?
          </span>
        </Button>
        
        {/* Tooltip */}
        {isHovered && (
          <div className="absolute bottom-full left-0 mb-2 whitespace-nowrap">
            <div className="bg-gray-900 text-white text-sm py-2 px-3 rounded-lg shadow-lg">
              Need help? Submit a ticket or request
              <div className="absolute bottom-0 left-6 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Dialog */}
      <FeedbackDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
};

export default HelpWidget;