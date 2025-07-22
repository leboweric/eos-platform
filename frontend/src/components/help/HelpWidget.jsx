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
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90"
          title="Get Help"
        >
          <HelpCircle className="h-6 w-6" />
          
          {/* Tooltip */}
          {isHovered && (
            <div className="absolute bottom-full right-0 mb-2 whitespace-nowrap">
              <div className="bg-gray-900 text-white text-sm py-2 px-3 rounded-lg shadow-lg">
                Need help? Submit a ticket or request
                <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
              </div>
            </div>
          )}
        </Button>
      </div>

      {/* Feedback Dialog */}
      <FeedbackDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
};

export default HelpWidget;