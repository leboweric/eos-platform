import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Marketing Strategy</DialogTitle>
            <DialogDescription>
              Define your target market, unique value propositions, and proven process.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="targetMarket">Target Market ("The List")</Label>
              <Textarea
                id="targetMarket"
                value={formData.targetMarket}
                onChange={(e) => setFormData({ ...formData, targetMarket: e.target.value })}
                placeholder="Describe your ideal customers and target market segments..."
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="threeUniques">Three Uniques</Label>
              <Textarea
                id="threeUniques"
                value={formData.threeUniques}
                onChange={(e) => setFormData({ ...formData, threeUniques: e.target.value })}
                placeholder="What three things make you unique compared to competitors?"
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provenProcess">Proven Process</Label>
              <Textarea
                id="provenProcess"
                value={formData.provenProcess}
                onChange={(e) => setFormData({ ...formData, provenProcess: e.target.value })}
                placeholder="Describe your step-by-step process for delivering value..."
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guarantee">Guarantee</Label>
              <Textarea
                id="guarantee"
                value={formData.guarantee}
                onChange={(e) => setFormData({ ...formData, guarantee: e.target.value })}
                placeholder="What do you guarantee to your customers?"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Strategy</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MarketingStrategyDialog;