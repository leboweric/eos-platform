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
            "w-full justify-between text-left font-normal",
            !value.length && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex gap-1 flex-wrap">
            {value.length === 0 ? (
              placeholder
            ) : (
              value.map((val) => {
                const option = options.find(opt => opt.value === val);
                return option ? (
                  <Badge
                    key={val}
                    variant="secondary"
                    className="mr-1"
                  >
                    {option.label}
                    <button
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </Badge>
                ) : null;
              })
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="max-h-64 overflow-auto">
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