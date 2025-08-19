import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp } from 'lucide-react';

const MarketingStrategyDialog = ({ open, onOpenChange, data, onSave }) => {
  const [formData, setFormData] = useState({
    targetMarket: '',
    threeUniques: '',
    provenProcess: '',
    guarantee: ''
  });

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
      <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20">
                <TrendingUp className="h-5 w-5 text-teal-600" />
              </div>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Edit Marketing Strategy
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 font-medium ml-11">
              Define your target market, unique value propositions, and proven process.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="targetMarket" className="text-slate-700 font-medium">
                Target Market ("The List") <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="targetMarket"
                value={formData.targetMarket}
                onChange={(e) => setFormData({ ...formData, targetMarket: e.target.value })}
                placeholder="Describe your ideal customers and target market segments..."
                rows={3}
                required
                className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-teal-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="threeUniques" className="text-slate-700 font-medium">
                Three Uniques <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="threeUniques"
                value={formData.threeUniques}
                onChange={(e) => setFormData({ ...formData, threeUniques: e.target.value })}
                placeholder="What three things make you unique compared to competitors?"
                rows={3}
                required
                className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-teal-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provenProcess" className="text-slate-700 font-medium">
                Proven Process <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="provenProcess"
                value={formData.provenProcess}
                onChange={(e) => setFormData({ ...formData, provenProcess: e.target.value })}
                placeholder="Describe your step-by-step process for delivering value..."
                rows={3}
                required
                className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-teal-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guarantee" className="text-slate-700 font-medium">Guarantee</Label>
              <Textarea
                id="guarantee"
                value={formData.guarantee}
                onChange={(e) => setFormData({ ...formData, guarantee: e.target.value })}
                placeholder="What do you guarantee to your customers?"
                rows={2}
                className="bg-white/80 backdrop-blur-sm border-white/20 rounded-xl shadow-sm transition-all duration-200 focus:border-teal-400"
              />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t border-white/20">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90 rounded-xl shadow-sm transition-all duration-200"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
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