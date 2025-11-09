import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Clock, Zap, Users, Building2 } from 'lucide-react';

const MeetingFormatSelector = ({ open, onClose, onSelect, teamId }) => {
  const [selectedFormat, setSelectedFormat] = useState('standard');

  // Reset to default when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedFormat('standard');
    }
  }, [open]);

  const handleSelect = () => {
    onSelect(selectedFormat);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Select Meeting Format</DialogTitle>
          <p className="text-slate-600 mt-2">
            Choose the format that best fits your team's needs
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {/* Standard Format */}
          <button
            onClick={() => setSelectedFormat('standard')}
            className={`w-full p-6 rounded-xl border-2 transition-all duration-200 text-left ${
              selectedFormat === 'standard'
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                selectedFormat === 'standard' ? 'bg-blue-100' : 'bg-slate-100'
              }`}>
                <Building2 className={`w-6 h-6 ${
                  selectedFormat === 'standard' ? 'text-blue-600' : 'text-slate-600'
                }`} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-slate-900">Standard (90 minutes)</h3>
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded">
                    Recommended
                  </span>
                </div>
                
                <p className="text-sm text-slate-600 mb-3">
                  Full format for leadership teams with complex issues
                </p>
                
                <div className="space-y-1 text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>IDS (Identify, Discuss, Solve): <strong>60 minutes</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Best for: Leadership teams, complex issues</span>
                  </div>
                </div>
              </div>
              
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedFormat === 'standard'
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-slate-300'
              }`}>
                {selectedFormat === 'standard' && (
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                )}
              </div>
            </div>
          </button>

          {/* Express Format */}
          <button
            onClick={() => setSelectedFormat('express')}
            className={`w-full p-6 rounded-xl border-2 transition-all duration-200 text-left ${
              selectedFormat === 'express'
                ? 'border-orange-500 bg-orange-50 shadow-md'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                selectedFormat === 'express' ? 'bg-orange-100' : 'bg-slate-100'
              }`}>
                <Zap className={`w-6 h-6 ${
                  selectedFormat === 'express' ? 'text-orange-600' : 'text-slate-600'
                }`} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-slate-900">Express (60 minutes)</h3>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                    Available
                  </span>
                </div>
                
                <p className="text-sm text-slate-600 mb-3">
                  Streamlined format for faster meetings with focused issues
                </p>
                
                <div className="space-y-1 text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>IDS (Identify, Discuss, Solve): <strong>30 minutes</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Best for: Department teams, tactical issues</span>
                  </div>
                </div>
              </div>
              
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedFormat === 'express'
                  ? 'border-orange-500 bg-orange-500'
                  : 'border-slate-300'
              }`}>
                {selectedFormat === 'express' && (
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                )}
              </div>
            </div>
          </button>
        </div>



        {/* Action buttons */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            className="flex-1"
          >
            Start Meeting →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingFormatSelector;