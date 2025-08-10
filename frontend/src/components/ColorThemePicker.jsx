import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Palette, Check } from 'lucide-react';

const presetThemes = [
  { name: 'Blue (Default)', primary: '#3B82F6', secondary: '#1E40AF', accent: '#60A5FA' },
  { name: 'Orange (Vibrant)', primary: '#FB923C', secondary: '#C2410C', accent: '#FED7AA' },
  { name: 'Green (Growth)', primary: '#10B981', secondary: '#047857', accent: '#86EFAC' },
  { name: 'Purple (Professional)', primary: '#8B5CF6', secondary: '#5B21B6', accent: '#C4B5FD' },
  { name: 'Red (Energy)', primary: '#EF4444', secondary: '#B91C1C', accent: '#FCA5A5' },
  { name: 'Teal (Modern)', primary: '#14B8A6', secondary: '#0F766E', accent: '#5EEAD4' },
  { name: 'Gray (Neutral)', primary: '#6B7280', secondary: '#374151', accent: '#D1D5DB' },
  { name: 'Indigo (Trust)', primary: '#6366F1', secondary: '#4338CA', accent: '#A5B4FC' },
];

const ColorThemePicker = ({ currentTheme, onThemeChange, onSave, saving }) => {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme || {
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  const [customMode, setCustomMode] = useState(false);

  useEffect(() => {
    if (currentTheme) {
      setSelectedTheme(currentTheme);
    }
  }, [currentTheme]);

  const handlePresetSelect = (preset) => {
    setSelectedTheme({
      primary: preset.primary,
      secondary: preset.secondary,
      accent: preset.accent
    });
    setCustomMode(false);
    if (onThemeChange) {
      onThemeChange({
        primary: preset.primary,
        secondary: preset.secondary,
        accent: preset.accent
      });
    }
  };

  const handleCustomColorChange = (colorType, value) => {
    const newTheme = {
      ...selectedTheme,
      [colorType]: value
    };
    setSelectedTheme(newTheme);
    if (onThemeChange) {
      onThemeChange(newTheme);
    }
  };

  const isCurrentTheme = (preset) => {
    return preset.primary === selectedTheme.primary &&
           preset.secondary === selectedTheme.secondary &&
           preset.accent === selectedTheme.accent;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Brand Colors
        </CardTitle>
        <CardDescription>
          Customize your organization's color theme for documents and reports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview Section */}
        <div className="p-4 border rounded-lg bg-gray-50">
          <div className="mb-3 text-sm font-medium text-gray-600">Preview</div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div 
                className="w-24 h-8 rounded shadow-sm border" 
                style={{ backgroundColor: selectedTheme.primary }}
              />
              <span className="text-sm text-gray-600">Primary Color</span>
            </div>
            <div className="flex items-center gap-3">
              <div 
                className="w-24 h-8 rounded shadow-sm border" 
                style={{ backgroundColor: selectedTheme.secondary }}
              />
              <span className="text-sm text-gray-600">Secondary Color</span>
            </div>
            <div className="flex items-center gap-3">
              <div 
                className="w-24 h-8 rounded shadow-sm border" 
                style={{ backgroundColor: selectedTheme.accent }}
              />
              <span className="text-sm text-gray-600">Accent Color</span>
            </div>
          </div>
        </div>

        {/* Preset Themes */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Preset Themes</Label>
          <div className="grid grid-cols-2 gap-3">
            {presetThemes.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetSelect(preset)}
                className={`p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                  isCurrentTheme(preset) 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{preset.name}</span>
                  {isCurrentTheme(preset) && (
                    <Check className="h-4 w-4 text-blue-500" />
                  )}
                </div>
                <div className="flex gap-1">
                  <div 
                    className="w-8 h-8 rounded border border-gray-200" 
                    style={{ backgroundColor: preset.primary }}
                  />
                  <div 
                    className="w-8 h-8 rounded border border-gray-200" 
                    style={{ backgroundColor: preset.secondary }}
                  />
                  <div 
                    className="w-8 h-8 rounded border border-gray-200" 
                    style={{ backgroundColor: preset.accent }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Colors */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">Custom Colors</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCustomMode(!customMode)}
            >
              {customMode ? 'Hide' : 'Show'} Custom Options
            </Button>
          </div>
          
          {customMode && (
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="primary-color" className="text-xs">Primary</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="primary-color"
                      type="color"
                      value={selectedTheme.primary}
                      onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                      className="h-10 w-16 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={selectedTheme.primary}
                      onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                      className="flex-1"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="secondary-color" className="text-xs">Secondary</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="secondary-color"
                      type="color"
                      value={selectedTheme.secondary}
                      onChange={(e) => handleCustomColorChange('secondary', e.target.value)}
                      className="h-10 w-16 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={selectedTheme.secondary}
                      onChange={(e) => handleCustomColorChange('secondary', e.target.value)}
                      className="flex-1"
                      placeholder="#1E40AF"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="accent-color" className="text-xs">Accent</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="accent-color"
                      type="color"
                      value={selectedTheme.accent}
                      onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                      className="h-10 w-16 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={selectedTheme.accent}
                      onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                      className="flex-1"
                      placeholder="#60A5FA"
                    />
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-gray-500">
                Tip: Use your brand's official color codes for consistency
              </p>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={() => onSave(selectedTheme)}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Color Theme'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ColorThemePicker;