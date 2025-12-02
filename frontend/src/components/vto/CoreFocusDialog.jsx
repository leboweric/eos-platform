import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { Target } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { getOrgTheme } from '../../utils/themeUtils';

const CoreFocusDialog = ({ open, onOpenChange, data, onSave }) => {
  const { user } = useAuthStore();
  
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  
  const [formData, setFormData] = useState({
    purpose: '',
    niche: ''
  });

  useEffect(() => {
    const fetchTheme = async () => {
      const orgId = user?.organizationId || user?.organization_id;
      if (orgId) {
        const theme = await getOrgTheme(orgId);
        if (theme && theme.primary && theme.secondary) {
          setThemeColors(theme);
        }
      }
    };
    fetchTheme();
  }, [user]);

  useEffect(() => {
    if (data) {
      setFormData({
        purpose: data.purpose || '',
        niche: data.niche || ''
      });
    }
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{
                background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
              }}>
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Edit Core Focus™</DialogTitle>
                <DialogDescription className="text-slate-600 mt-1">
                  Define your organization's purpose and niche - the "sweet spot" where you excel.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid gap-3">
              <Label htmlFor="purpose" className="text-sm font-semibold text-slate-700">
                Purpose/Cause/Passion <span className="text-red-500">*</span>
              </Label>
              <div className="h-[140px] overflow-hidden border rounded-xl shadow-sm">
                <RichTextEditor
                  value={formData.purpose}
                  onChange={(content) => setFormData({ ...formData, purpose: content })}
                  placeholder="Why does your organization exist? What drives you?"
                  className="border-0 shadow-none h-full"
                />
              </div>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="niche" className="text-sm font-semibold text-slate-700">
                Niche <span className="text-red-500">*</span>
              </Label>
              <div className="h-[140px] overflow-hidden border rounded-xl shadow-sm">
                <RichTextEditor
                  value={formData.niche}
                  onChange={(content) => setFormData({ ...formData, niche: content })}
                  placeholder="What is your organization's 'sweet spot'? Where do you excel?"
                  className="border-0 shadow-none h-full"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="pt-6 border-t border-white/20">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 shadow-sm transition-all duration-200"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
              }}
            >
              Save Core Focus
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CoreFocusDialog;