import React, { useState } from 'react';
import { Sparkles, Check, X, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * AI Suggestion Popover Component
 * Shows inline AI-generated suggestions for VTO "What does it look like?" bullets
 */
const AiSuggestionPopover = ({ 
  currentText, 
  bulletIndex, 
  onAccept, 
  onGenerateSuggestions,
  themeColor = '#3B82F6'
}) => {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleOpenChange = async (isOpen) => {
    setOpen(isOpen);
    
    // Generate suggestions when popover opens
    if (isOpen && suggestions.length === 0) {
      await generateSuggestions();
    }
  };

  const generateSuggestions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await onGenerateSuggestions(currentText, bulletIndex);
      setSuggestions(result.suggestions || []);
    } catch (err) {
      console.error('Failed to generate suggestions:', err);
      setError('Failed to generate suggestions. Please try again.');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSuggestion = (suggestion) => {
    onAccept(suggestion, bulletIndex);
    setOpen(false);
    // Reset suggestions for next time
    setSuggestions([]);
  };

  const handleTryAgain = async () => {
    await generateSuggestions();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs hover:bg-purple-50 transition-colors"
          style={{ color: themeColor }}
        >
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          AI Suggest
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0 bg-white/95 backdrop-blur-sm border-purple-200 shadow-xl rounded-xl"
        align="start"
        sideOffset={5}
      >
        <div className="p-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <h4 className="font-semibold text-sm text-gray-900">AI Wordsmith</h4>
            </div>
            {!loading && suggestions.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleTryAgain}
                className="h-7 px-2 text-xs hover:bg-purple-100"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            AI-generated suggestions based on your VTO
          </p>
        </div>

        <div className="p-3 max-h-80 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mb-2" style={{ color: themeColor }} />
              <p className="text-sm">Generating suggestions...</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleTryAgain}
                className="mt-2 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && suggestions.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No suggestions available</p>
            </div>
          )}

          {!loading && !error && suggestions.length > 0 && (
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="group relative p-3 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all duration-200"
                >
                  <p className="text-sm text-gray-700 pr-20">{suggestion}</p>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAcceptSuggestion(suggestion)}
                      className="h-7 px-2 bg-green-50 hover:bg-green-100 text-green-700"
                      title="Accept this suggestion"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-100 bg-gray-50/50">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="w-full text-xs hover:bg-gray-100"
          >
            <X className="h-3 w-3 mr-1" />
            Close
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AiSuggestionPopover;

