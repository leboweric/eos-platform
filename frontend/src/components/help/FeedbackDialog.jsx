import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Send, AlertCircle, CheckCircle, Ticket, Lightbulb } from 'lucide-react';
import axios from '@/services/axiosConfig';

const FeedbackDialog = ({ open, onOpenChange }) => {
  const [formData, setFormData] = useState({
    type: 'ticket',
    subject: '',
    message: ''
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    
    try {
      // Get current page URL
      const pageUrl = window.location.href;
      
      await axios.post('/feedback/submit', {
        ...formData,
        pageUrl
      });
      
      setSuccess(true);
      
      // Reset form after 3 seconds and close dialog
      setTimeout(() => {
        setFormData({
          type: 'ticket',
          subject: '',
          message: ''
        });
        setSuccess(false);
        onOpenChange(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setError(error.response?.data?.error || 'Failed to submit feedback. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setFormData({
        type: 'ticket',
        subject: '',
        message: ''
      });
      setError(null);
      setSuccess(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>How can we help?</DialogTitle>
            <DialogDescription>
              Submit a support ticket or enhancement request and we'll get back to you as soon as possible.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Thank you! Your feedback has been submitted successfully.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Label>Type of Request</Label>
              <RadioGroup 
                value={formData.type} 
                onValueChange={(value) => setFormData({ ...formData, type: value })}
                disabled={sending}
              >
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="ticket" id="ticket" />
                  <Label htmlFor="ticket" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Support Ticket</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Report an issue or get help with something that's not working
                    </p>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="enhancement" id="enhancement" />
                  <Label htmlFor="enhancement" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-600" />
                      <span className="font-medium">Enhancement Request</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Suggest a new feature or improvement to the platform
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder={formData.type === 'ticket' ? 'Brief description of the issue' : 'Brief description of your idea'}
                required
                disabled={sending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">
                {formData.type === 'ticket' ? 'Describe the Issue' : 'Describe Your Enhancement'}
              </Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={
                  formData.type === 'ticket' 
                    ? 'Please provide details about what you were trying to do, what went wrong, and any error messages you saw...' 
                    : 'Please describe your idea in detail, including how it would benefit users...'
                }
                rows={6}
                required
                disabled={sending}
              />
              <p className="text-xs text-gray-500">
                Current page URL will be included automatically
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={sending}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={sending || !formData.subject || !formData.message || success}
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Sent!
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit {formData.type === 'ticket' ? 'Ticket' : 'Request'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;