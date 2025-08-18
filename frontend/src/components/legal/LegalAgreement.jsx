import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Shield, AlertTriangle, FileText, Lock, Scale } from 'lucide-react';

const LegalAgreement = ({ onAccept, isRequired = true }) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [error, setError] = useState('');

  const handleAcceptAll = () => {
    if (!termsAccepted || !privacyAccepted) {
      setError('You must accept both the Terms of Service and Privacy Policy to continue');
      return false;
    }
    
    const agreementData = {
      termsAccepted: true,
      privacyAccepted: true,
      acceptedAt: new Date().toISOString(),
      ipAddress: window.location.hostname, // In production, get actual IP from backend
      userAgent: navigator.userAgent,
      version: '1.0' // Track version for future updates
    };
    
    onAccept(agreementData);
    return true;
  };

  const termsOfService = `
TERMS OF SERVICE

Last Updated: ${new Date().toLocaleDateString()}

IMPORTANT: PLEASE READ THESE TERMS OF SERVICE CAREFULLY BEFORE USING THE AXP PLATFORM.

1. ACCEPTANCE OF TERMS
By accessing or using the AXP Platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all these Terms, you are prohibited from using the Service.

2. DISCLAIMER OF WARRANTIES
THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

3. LIMITATION OF LIABILITY
IN NO EVENT SHALL AXP, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR:
- ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES
- ANY LOSS OF PROFITS, REVENUE, DATA, OR USE
- ANY CLAIMS ARISING FROM DATA BREACHES, SECURITY INCIDENTS, OR UNAUTHORIZED ACCESS
- DAMAGES EXCEEDING THE FEES PAID BY YOU IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM

4. INDEMNIFICATION
You agree to defend, indemnify, and hold harmless AXP and its affiliates from any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from:
- Your use of the Service
- Your violation of these Terms
- Your violation of any third-party rights
- Any data breach resulting from your credentials or security practices

5. DATA AND SECURITY
While we implement industry-standard security measures:
- We cannot guarantee absolute security of your data
- You acknowledge the inherent risks of internet-based services
- You are responsible for maintaining the confidentiality of your credentials
- We are not liable for any unauthorized access resulting from your actions or omissions

6. INTELLECTUAL PROPERTY
All content, features, and functionality of the Service are owned by AXP and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.

7. USER RESPONSIBILITIES
You agree to:
- Provide accurate and complete information
- Maintain the security of your account
- Notify us immediately of any unauthorized access
- Comply with all applicable laws and regulations
- Not use the Service for any illegal or unauthorized purpose

8. SERVICE MODIFICATIONS
We reserve the right to:
- Modify or discontinue the Service at any time
- Change these Terms at any time
- Suspend or terminate your access for any reason

9. ARBITRATION AGREEMENT
ANY DISPUTE ARISING FROM THESE TERMS OR YOUR USE OF THE SERVICE SHALL BE RESOLVED THROUGH BINDING ARBITRATION, NOT IN COURT. You waive your right to jury trial and class action lawsuits.

10. GOVERNING LAW
These Terms shall be governed by the laws of [Your Jurisdiction], without regard to conflict of law principles.

11. FORCE MAJEURE
We shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including but not limited to acts of God, natural disasters, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, strikes, or shortages of transportation facilities, fuel, energy, labor, or materials.

12. ENTIRE AGREEMENT
These Terms constitute the entire agreement between you and AXP regarding the Service and supersede all prior agreements and understandings.

13. SEVERABILITY
If any provision of these Terms is found to be unenforceable, the remaining provisions shall continue in full force and effect.

14. CONTACT INFORMATION
For questions about these Terms, please contact: legal@axp.com
  `;

  const privacyPolicy = `
PRIVACY POLICY

Last Updated: ${new Date().toLocaleDateString()}

1. INFORMATION WE COLLECT
We collect information you provide directly, including:
- Account information (name, email, organization)
- Usage data and analytics
- Communication preferences
- Payment information (processed by third-party providers)

2. HOW WE USE INFORMATION
We use collected information to:
- Provide and improve our services
- Communicate with you about your account
- Ensure security and prevent fraud
- Comply with legal obligations

3. DATA SECURITY
We implement appropriate technical and organizational measures to protect your data, including:
- Encryption in transit and at rest
- Regular security assessments
- Access controls and authentication
- Security incident response procedures

However, no method of transmission over the Internet or electronic storage is 100% secure.

4. DATA RETENTION
We retain your information for as long as necessary to provide services and comply with legal obligations. You may request deletion of your data, subject to legal requirements.

5. THIRD-PARTY SERVICES
We may share information with:
- Service providers (hosting, analytics, payment processing)
- Legal authorities when required by law
- Business partners with your consent

6. YOUR RIGHTS
Depending on your location, you may have rights to:
- Access your personal information
- Correct inaccurate information
- Delete your information
- Object to processing
- Data portability

7. COOKIES AND TRACKING
We use cookies and similar technologies to:
- Maintain your session
- Remember your preferences
- Analyze usage patterns
- Improve our services

8. CHILDREN'S PRIVACY
Our Service is not intended for children under 13. We do not knowingly collect information from children under 13.

9. INTERNATIONAL DATA TRANSFERS
Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.

10. CALIFORNIA PRIVACY RIGHTS
California residents have additional rights under the CCPA, including the right to know what personal information we collect and the right to opt-out of the sale of personal information.

11. DATA BREACH NOTIFICATION
In the event of a data breach that compromises your personal information, we will notify you in accordance with applicable laws.

12. CHANGES TO THIS POLICY
We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page.

13. CONTACT US
For privacy-related questions, contact: privacy@axp.com
Data Protection Officer: dpo@axp.com
  `;

  return (
    <Card className="border-2 border-red-200 bg-red-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-red-900">
          <Shield className="h-5 w-5" />
          Legal Agreements - Must Accept to Continue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>Important:</strong> By creating an account, you acknowledge that you have read, understood, and agree to be bound by our Terms of Service and Privacy Policy. This is a legally binding agreement.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 bg-white rounded-lg border">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={setTermsAccepted}
              className="mt-0.5"
              required
            />
            <div className="flex-1">
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I accept the Terms of Service *
              </label>
              <p className="text-xs text-gray-600 mt-1">
                Including limitations of liability, indemnification, and arbitration agreement
              </p>
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-blue-600"
                onClick={() => setShowTermsDialog(true)}
              >
                <FileText className="h-3 w-3 mr-1" />
                Read Full Terms of Service
              </Button>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-white rounded-lg border">
            <Checkbox
              id="privacy"
              checked={privacyAccepted}
              onCheckedChange={setPrivacyAccepted}
              className="mt-0.5"
              required
            />
            <div className="flex-1">
              <label
                htmlFor="privacy"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I accept the Privacy Policy *
              </label>
              <p className="text-xs text-gray-600 mt-1">
                Including data collection, processing, and security practices
              </p>
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-blue-600"
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

        <div className="pt-2 border-t">
          <p className="text-xs text-gray-600 mb-3">
            <Scale className="inline h-3 w-3 mr-1" />
            By clicking "Create Account", you agree to our Terms of Service and Privacy Policy. 
            You acknowledge that AXP will process your data in accordance with our Privacy Policy and applicable laws.
          </p>
          <p className="text-xs text-gray-500">
            Your acceptance will be recorded with timestamp: {new Date().toLocaleString()}
          </p>
        </div>
      </CardContent>

      {/* Terms of Service Dialog */}
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <pre className="whitespace-pre-wrap font-sans text-sm">{termsOfService}</pre>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTermsDialog(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setTermsAccepted(true);
              setShowTermsDialog(false);
            }}>
              Accept Terms of Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <pre className="whitespace-pre-wrap font-sans text-sm">{privacyPolicy}</pre>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrivacyDialog(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setPrivacyAccepted(true);
              setShowPrivacyDialog(false);
            }}>
              Accept Privacy Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default LegalAgreement;