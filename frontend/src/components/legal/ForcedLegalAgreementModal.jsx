import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, AlertTriangle, FileText, Lock, Scale, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const ForcedLegalAgreementModal = ({ isOpen, onAccept }) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { logout, acceptLegalAgreements } = useAuthStore();

  // Prevent closing the modal by clicking outside or pressing Escape
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handleAcceptAgreements = async () => {
    if (!termsAccepted || !privacyAccepted) {
      setError('You must accept both the Terms of Service and Privacy Policy to continue');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const agreementData = {
        termsAccepted: true,
        privacyAccepted: true,
        acceptedAt: new Date().toISOString(),
        version: '1.0',
        userAgent: navigator.userAgent
      };

      // Call API to record agreement acceptance
      const response = await acceptLegalAgreements(agreementData);
      
      if (response.success) {
        onAccept(agreementData);
      } else {
        setError('Failed to record agreement acceptance. Please try again.');
      }
    } catch (err) {
      console.error('Error accepting agreements:', err);
      setError('An error occurred. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const termsOfService = `
TERMS OF SERVICE - UPDATED VERSION

Last Updated: ${new Date().toLocaleDateString()}

IMPORTANT: PLEASE READ THESE UPDATED TERMS OF SERVICE CAREFULLY.

By continuing to use the AXP Platform, you agree to be bound by these updated Terms of Service.

1. ACCEPTANCE OF TERMS
By accessing or using the AXP Platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all these Terms, you must stop using the Service immediately.

2. DISCLAIMER OF WARRANTIES
THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

3. LIMITATION OF LIABILITY
IN NO EVENT SHALL AXP, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR:
- ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES
- ANY LOSS OF PROFITS, REVENUE, DATA, OR USE
- ANY CLAIMS ARISING FROM DATA BREACHES, SECURITY INCIDENTS, OR UNAUTHORIZED ACCESS
- DAMAGES EXCEEDING THE FEES PAID BY YOU IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM

4. INDEMNIFICATION
You agree to defend, indemnify, and hold harmless AXP and its affiliates from any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from your use of the Service.

5. DATA AND SECURITY
While we implement industry-standard security measures, we cannot guarantee absolute security of your data. You acknowledge the inherent risks of internet-based services.

6. ARBITRATION AGREEMENT
ANY DISPUTE ARISING FROM THESE TERMS OR YOUR USE OF THE SERVICE SHALL BE RESOLVED THROUGH BINDING ARBITRATION, NOT IN COURT. You waive your right to jury trial and class action lawsuits.

7. CHANGES TO TERMS
We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms.

[Full Terms Continue...]
  `;

  const privacyPolicy = `
PRIVACY POLICY - UPDATED VERSION

Last Updated: ${new Date().toLocaleDateString()}

This Privacy Policy has been updated to reflect our current data practices and compliance requirements.

1. INFORMATION WE COLLECT
We collect information you provide directly, usage data, and information from third parties.

2. HOW WE USE INFORMATION
We use collected information to provide services, ensure security, and comply with legal obligations.

3. DATA SECURITY
We implement appropriate technical and organizational measures to protect your data. However, no method of transmission over the Internet is 100% secure.

4. YOUR RIGHTS
You have rights regarding your personal information, including access, correction, and deletion rights.

5. COOKIES AND TRACKING
We use cookies and similar technologies for functionality and analytics.

6. DATA BREACH NOTIFICATION
In the event of a data breach, we will notify you in accordance with applicable laws.

7. CHANGES TO THIS POLICY
We may update this Privacy Policy from time to time. Continued use after changes constitutes acceptance.

[Full Policy Continues...]
  `;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-xl text-red-900">
              <Shield className="h-6 w-6 text-red-600" />
              Legal Agreement Update Required
            </DialogTitle>
            <DialogDescription className="text-red-700 font-medium">
              You must accept our updated Terms of Service and Privacy Policy to continue using AXP
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-amber-200 bg-amber-50 mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              <strong>Action Required:</strong> We've updated our legal agreements. You must review and accept both the Terms of Service and Privacy Policy to continue accessing your account. This is required for all users for legal compliance.
            </AlertDescription>
          </Alert>

          <ScrollArea className="h-[40vh] pr-4 mb-4">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Key Updates Include:
                </h3>
                <ul className="text-sm space-y-1 text-gray-700 list-disc list-inside">
                  <li>Enhanced data security and breach notification procedures</li>
                  <li>Updated limitation of liability clauses</li>
                  <li>Clarified arbitration and dispute resolution process</li>
                  <li>Expanded privacy rights and data handling practices</li>
                  <li>Force majeure and service modification terms</li>
                </ul>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-white rounded-lg border">
                  <Checkbox
                    id="terms-forced"
                    checked={termsAccepted}
                    onCheckedChange={setTermsAccepted}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="terms-forced"
                      className="text-sm font-medium cursor-pointer"
                    >
                      I have read and accept the updated Terms of Service *
                    </label>
                    <p className="text-xs text-gray-600 mt-1">
                      Including all limitations of liability and arbitration agreements
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-blue-600 mt-1"
                      onClick={() => setShowTermsDialog(true)}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Read Full Terms of Service
                    </Button>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-white rounded-lg border">
                  <Checkbox
                    id="privacy-forced"
                    checked={privacyAccepted}
                    onCheckedChange={setPrivacyAccepted}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="privacy-forced"
                      className="text-sm font-medium cursor-pointer"
                    >
                      I have read and accept the updated Privacy Policy *
                    </label>
                    <p className="text-xs text-gray-600 mt-1">
                      Including data collection, processing, and your privacy rights
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-blue-600 mt-1"
                      onClick={() => setShowPrivacyDialog(true)}
                    >
                      <Lock className="h-3 w-3 mr-1" />
                      Read Full Privacy Policy
                    </Button>
                  </div>
                </div>
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </ScrollArea>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-600">
                <Scale className="inline h-3 w-3 mr-1" />
                Your acceptance will be recorded with timestamp: {new Date().toLocaleString()}
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleLogout}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout Instead
              </Button>
              <Button
                onClick={handleAcceptAgreements}
                disabled={!termsAccepted || !privacyAccepted || loading}
                className="flex-1"
              >
                {loading ? 'Processing...' : 'Accept and Continue'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms of Service Dialog */}
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Terms of Service - Full Text</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <pre className="whitespace-pre-wrap font-sans text-sm">{termsOfService}</pre>
          </ScrollArea>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowTermsDialog(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setTermsAccepted(true);
              setShowTermsDialog(false);
            }}>
              Accept Terms of Service
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Privacy Policy - Full Text</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <pre className="whitespace-pre-wrap font-sans text-sm">{privacyPolicy}</pre>
          </ScrollArea>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowPrivacyDialog(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setPrivacyAccepted(true);
              setShowPrivacyDialog(false);
            }}>
              Accept Privacy Policy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ForcedLegalAgreementModal;