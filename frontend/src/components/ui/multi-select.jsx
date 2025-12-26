import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const MultiSelect = React.forwardRef(({ 
  options = [], 
  value = [], 
  onChange, 
  placeholder = "Select items...",
  className,
  disabled = false
}, ref) => {
  const [open, setOpen] = React.useState(false);

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-start text-left font-normal h-auto min-h-[40px] py-2",
            !value.length && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex-1">
            {value.length === 0 ? (
              <span>{placeholder}</span>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-2">
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
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0" 
        align="start"
        side="bottom"
        sideOffset={5}
        collisionPadding={20}
        avoidCollisions={true}
        style={{ 
          width: 'var(--radix-popover-trigger-width)',
          maxHeight: '300px'
        }}
      >
        <div 
          className="h-full overflow-y-auto overflow-x-hidden" 
          style={{ 
            maxHeight: '300px',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {options.map((option) => (
            <div
              key={option.value}
              className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
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
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
});

MultiSelect.displayName = "MultiSelect";

export { MultiSelect };