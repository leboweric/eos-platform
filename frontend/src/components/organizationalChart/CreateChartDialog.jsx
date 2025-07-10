import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

const CreateChartDialog = ({ open, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scope: 'organization', // organization, team, or department
    teamId: null,
    departmentId: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const chartData = {
        name: formData.name,
        description: formData.description
      };

      // Add scope-specific fields
      if (formData.scope === 'team' && formData.teamId) {
        chartData.teamId = formData.teamId;
      } else if (formData.scope === 'department' && formData.departmentId) {
        chartData.departmentId = formData.departmentId;
      }

      await onCreate(chartData);
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create organizational chart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Organizational Chart</DialogTitle>
            <DialogDescription>
              Create a new organizational chart to visualize your company structure
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="name">Chart Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Company Organizational Chart"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the purpose of this organizational chart"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label>Chart Scope</Label>
              <RadioGroup
                value={formData.scope}
                onValueChange={(value) => setFormData({ ...formData, scope: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="organization" id="org" />
                  <Label htmlFor="org" className="font-normal">
                    Organization-wide
                  </Label>
                </div>
                <div className="flex items-center space-x-2 opacity-50">
                  <RadioGroupItem value="team" id="team" disabled />
                  <Label htmlFor="team" className="font-normal">
                    Team-specific (Coming soon)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 opacity-50">
                  <RadioGroupItem value="department" id="dept" disabled />
                  <Label htmlFor="dept" className="font-normal">
                    Department-specific (Coming soon)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Chart'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateChartDialog;