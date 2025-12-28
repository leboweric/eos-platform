import React, { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, addDays, addWeeks, endOfWeek, endOfMonth } from 'date-fns';
import { Calendar, X } from 'lucide-react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '@/lib/utils';
import 'react-day-picker/dist/style.css';

export const DatePicker = ({ 
  value, 
  onChange, 
  placeholder = "Select date",
  className = "",
  disabled = false,
  minDate = null,
  maxDate = null,
  showQuickDates = true,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Parse value if it's a string (YYYY-MM-DD format from backend)
  const selectedDate = value ? (typeof value === 'string' ? new Date(value + 'T12:00:00') : value) : null;

  // Quick date options
  const quickDates = [
    { 
      label: 'Today', 
      value: new Date(),
      description: format(new Date(), 'MMM d')
    },
    { 
      label: 'Tomorrow', 
      value: addDays(new Date(), 1),
      description: format(addDays(new Date(), 1), 'MMM d')
    },
    { 
      label: 'Next Week', 
      value: addWeeks(new Date(), 1),
      description: format(addWeeks(new Date(), 1), 'MMM d')
    },
    { 
      label: 'End of Week', 
      value: endOfWeek(new Date()),
      description: format(endOfWeek(new Date()), 'MMM d')
    },
    { 
      label: 'End of Month', 
      value: endOfMonth(new Date()),
      description: format(endOfMonth(new Date()), 'MMM d')
    },
  ];

  const handleQuickDate = (date) => {
    // Convert to YYYY-MM-DD format for backend compatibility
    const formattedDate = format(date, 'yyyy-MM-dd');
    onChange(formattedDate);
    setIsOpen(false);
  };

  const handleCalendarSelect = (date) => {
    if (date) {
      // Convert to YYYY-MM-DD format for backend compatibility
      const formattedDate = format(date, 'yyyy-MM-dd');
      onChange(formattedDate);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, 'PPP') : placeholder}
          {required && !selectedDate && <span className="text-red-500 ml-1">*</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 space-y-3">
          {/* Quick Date Buttons */}
          {showQuickDates && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Quick Select</p>
              <div className="grid grid-cols-2 gap-2">
                {quickDates.map(({ label, value: dateValue, description }) => (
                  <Button
                    key={label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickDate(dateValue)}
                    className="justify-between hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <span className="font-medium">{label}</span>
                    <span className="text-xs text-slate-500">{description}</span>
                  </Button>
                ))}
                {selectedDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="col-span-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Date
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Calendar */}
          <div className="border-t pt-3">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleCalendarSelect}
              disabled={[
                minDate && { before: minDate },
                maxDate && { after: maxDate }
              ].filter(Boolean)}
              initialFocus
              className="rdp-custom"
              modifiers={{
                today: new Date()
              }}
              modifiersClassNames={{
                today: 'rdp-day_today',
                selected: 'rdp-day_selected'
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
