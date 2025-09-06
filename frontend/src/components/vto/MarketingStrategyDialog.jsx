import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { getOrgTheme } from '../../utils/themeUtils';

const MarketingStrategyDialog = ({ open, onOpenChange, data, onSave }) => {
  const { user } = useAuthStore();
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  
  const [formData, setFormData] = useState({
    targetMarket: '',
    threeUniques: '',
    provenProcess: '',
    guarantee: ''
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
        targetMarket: data.target_market || data.targetMarket || '',
        threeUniques: data.three_uniques || data.threeUniques || '',
        provenProcess: data.proven_process || data.provenProcess || '',
        guarantee: data.guarantee || ''
      });
    }
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...data,
      targetMarket: formData.targetMarket,
      threeUniques: formData.threeUniques,
      provenProcess: formData.provenProcess,
      guarantee: formData.guarantee
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 rounded-2xl shadow-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{
                background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
              }}>
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                  Edit Marketing Strategy
                </DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400 mt-1">
                  Define your target market, unique value propositions, and proven process.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid gap-3">
              <Label htmlFor="targetMarket" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Target Market ("The List") <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="targetMarket"
                value={formData.targetMarket}
                onChange={(e) => setFormData({ ...formData, targetMarket: e.target.value })}
                placeholder="Describe your ideal customers and target market segments..."
                rows={3}
                required
                className="bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm border-white/20 dark:border-gray-600/50 rounded-xl shadow-sm transition-all duration-200"
                onFocus={(e) => e.target.style.borderColor = themeColors.primary}
                onBlur={(e) => e.target.style.borderColor = ''}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="threeUniques" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Three Uniques <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="threeUniques"
                value={formData.threeUniques}
                onChange={(e) => setFormData({ ...formData, threeUniques: e.target.value })}
                placeholder="What three things make you unique compared to competitors?"
                rows={3}
                required
                className="bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm border-white/20 dark:border-gray-600/50 rounded-xl shadow-sm transition-all duration-200"
                onFocus={(e) => e.target.style.borderColor = themeColors.primary}
                onBlur={(e) => e.target.style.borderColor = ''}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="provenProcess" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Proven Process <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="provenProcess"
                value={formData.provenProcess}
                onChange={(e) => setFormData({ ...formData, provenProcess: e.target.value })}
                placeholder="Describe your step-by-step process for delivering value..."
                rows={3}
                required
                className="bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm border-white/20 dark:border-gray-600/50 rounded-xl shadow-sm transition-all duration-200"
                onFocus={(e) => e.target.style.borderColor = themeColors.primary}
                onBlur={(e) => e.target.style.borderColor = ''}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="guarantee" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Guarantee</Label>
              <Textarea
                id="guarantee"
                value={formData.guarantee}
                onChange={(e) => setFormData({ ...formData, guarantee: e.target.value })}
                placeholder="What do you guarantee to your customers?"
                rows={2}
                className="bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm border-white/20 dark:border-gray-600/50 rounded-xl shadow-sm transition-all duration-200"
                onFocus={(e) => e.target.style.borderColor = themeColors.primary}
                onBlur={(e) => e.target.style.borderColor = ''}
              />
            </div>
          </div>
          <DialogFooter className="pt-6 border-t border-white/20 dark:border-gray-700/50">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm border-white/20 dark:border-gray-600/50 hover:bg-white/90 dark:hover:bg-gray-700/70 shadow-sm transition-all duration-200"
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
              Save Strategy
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MarketingStrategyDialog;