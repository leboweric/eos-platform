import * as React from "react";
import { X, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const MultiSelectInline = React.forwardRef(({ 
  options = [], 
  value = [], 
  onChange, 
  placeholder = "Select items...",
  className,
  disabled = false
}, ref) => {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const handleToggle = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange?.(newValue);
  };

  const handleRemove = (optionValue, e) => {
    e.stopPropagation();
    onChange?.(value.filter(v => v !== optionValue));
  };

  const selectedLabels = value
    .map(v => options.find(opt => opt.value === v)?.label)
    .filter(Boolean);

  return (
    <div ref={containerRef} className="relative w-full">
      <Button
        ref={ref}
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn(
          "w-full justify-between text-left font-normal h-auto min-h-[40px] py-2",
          !value.length && "text-muted-foreground",
          className
        )}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <div className="flex-1 mr-2">
          {value.length === 0 ? (
            <span>{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {value.map((val) => {
                const option = options.find(opt => opt.value === val);
                return option ? (
                  <Badge
                    key={val}
                    variant="secondary"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <span className="text-xs">{option.label}</span>
                    <button
                      type="button"
                      className="ml-0.5 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 hover:bg-gray-300 p-0.5 transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleRemove(val, e);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => handleRemove(val, e)}
                    >
                      <X className="h-3 w-3 text-gray-600 hover:text-gray-800" />
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 shrink-0 opacity-50 transition-transform",
          open && "transform rotate-180"
        )} />
      </Button>
      
      {open && (
        <div className="absolute z-[200] w-full mt-1 bg-white border rounded-md shadow-lg">
          <div 
            className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1"
            style={{ 
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {options.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No options available
              </div>
            ) : (
              options.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 rounded cursor-pointer"
                  onClick={() => handleToggle(option.value)}
                >
                  <Checkbox
                    checked={value.includes(option.value)}
                    onCheckedChange={() => handleToggle(option.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1">
                    {option.label}
                    {option.description && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {option.description}
                      </span>
                    )}
                  </label>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});

MultiSelectInline.displayName = "MultiSelectInline";

export { MultiSelectInline };
