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
THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.

3. LIMITATION OF LIABILITY
IN NO EVENT SHALL AXP, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR:
- ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES
- ANY LOSS OF PROFITS, REVENUE, DATA, OR USE
- ANY CLAIMS ARISING FROM DATA BREACHES, SECURITY INCIDENTS, OR UNAUTHORIZED ACCESS
- DAMAGES EXCEEDING THE FEES PAID BY YOU IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM
- ANY LOSSES OR DAMAGES ARISING FROM BUSINESS INTERRUPTION
- ANY LOSSES OR DAMAGES ARISING FROM LOSS OF DATA OR PROFITS
- ANY LOSSES OR DAMAGES ARISING FROM CORRUPTION OF DATA
- ANY LOSSES OR DAMAGES ARISING FROM FAILURE TO MEET ANY DUTY INCLUDING DUTY OF GOOD FAITH OR REASONABLE CARE

4. INDEMNIFICATION
You agree to defend, indemnify, and hold harmless AXP and its affiliates, officers, directors, employees, consultants, agents, and representatives from any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from:
- Your use of the Service
- Your violation of these Terms
- Your violation of any third-party rights
- Any data breach resulting from your credentials or security practices
- Your Content or any information you provide
- Your violation of any applicable laws or regulations
- Any misrepresentation made by you

5. DATA AND SECURITY
While we implement industry-standard security measures:
- We cannot guarantee absolute security of your data
- You acknowledge the inherent risks of internet-based services
- You are responsible for maintaining the confidentiality of your credentials
- We are not liable for any unauthorized access resulting from your actions or omissions
- You must notify us immediately of any breach of security or unauthorized use
- We reserve the right to modify security features at any time
- You are responsible for backing up your own data

6. INTELLECTUAL PROPERTY
All content, features, and functionality of the Service, including but not limited to text, graphics, logos, icons, images, audio clips, video clips, data compilations, and software, are owned by AXP or its licensors and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.

7. USER RESPONSIBILITIES
You agree to:
- Provide accurate and complete information
- Maintain the security of your account
- Notify us immediately of any unauthorized access
- Comply with all applicable laws and regulations
- Not use the Service for any illegal or unauthorized purpose
- Not transmit any viruses, worms, or malicious code
- Not interfere with or disrupt the Service or servers
- Not attempt to gain unauthorized access to any portion of the Service
- Not use the Service to harass, abuse, or harm another person
- Not use the Service in competition with AXP

8. SERVICE MODIFICATIONS
We reserve the right to:
- Modify or discontinue the Service at any time without notice
- Change these Terms at any time with notice
- Suspend or terminate your access for any reason without notice
- Change pricing with 30 days notice
- Add or remove features at our discretion

9. ARBITRATION AGREEMENT
ANY DISPUTE ARISING FROM THESE TERMS OR YOUR USE OF THE SERVICE SHALL BE RESOLVED THROUGH BINDING ARBITRATION, NOT IN COURT. You waive your right to jury trial and class action lawsuits. The arbitration shall be conducted by a single arbitrator under the rules of the American Arbitration Association. The arbitration shall be conducted in Delaware.

10. GOVERNING LAW
These Terms shall be governed by the laws of the State of Delaware, without regard to conflict of law principles. Any legal action or proceeding shall be brought exclusively in the federal or state courts located in Delaware.

11. FORCE MAJEURE
We shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including but not limited to acts of God, natural disasters, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, strikes, or shortages of transportation facilities, fuel, energy, labor, or materials, pandemics, or Internet service provider failures.

12. ENTIRE AGREEMENT
These Terms constitute the entire agreement between you and AXP regarding the Service and supersede all prior agreements and understandings, whether written or oral.

13. SEVERABILITY
If any provision of these Terms is found to be unenforceable or invalid, the remaining provisions shall continue in full force and effect.

14. WAIVER
No waiver of any term or condition shall be deemed a further or continuing waiver of such term or condition or any other term or condition.

15. ASSIGNMENT
You may not assign or transfer these Terms without our prior written consent. We may assign these Terms without your consent.

16. TERMINATION
We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including breach of these Terms.

17. SURVIVAL
Provisions that by their nature should survive termination shall survive termination, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.

18. NOTICE
Notices to you may be made via email or regular mail. The Service may also provide notices of changes to these Terms or other matters by displaying notices on the Service.

19. CONTACT INFORMATION
For questions about these Terms, please contact:
AXP Legal Department
Email: legal@axp.com
Address: [Your Company Address]
  `;

  const privacyPolicy = `
PRIVACY POLICY

Last Updated: ${new Date().toLocaleDateString()}

1. INFORMATION WE COLLECT

We collect several types of information:

a) Information You Provide Directly:
- Account registration information (name, email, company name, password)
- Profile information (job title, department, phone number)
- Payment and billing information (processed by Stripe)
- Content you create (priorities, scorecards, documents, notes)
- Communications with us (support tickets, emails)

b) Information Collected Automatically:
- Usage data (features used, frequency, duration)
- Device information (browser type, operating system, IP address)
- Log data (access times, pages viewed, clicks)
- Cookies and similar tracking technologies
- Performance data and analytics

c) Information from Third Parties:
- Payment verification from Stripe
- Authentication information if using SSO
- Information from integrated third-party services

2. HOW WE USE INFORMATION

We use collected information to:
- Provide, maintain, and improve our services
- Process transactions and send related information
- Send technical notices, updates, security alerts
- Respond to comments, questions, and customer service requests
- Monitor and analyze trends, usage, and activities
- Detect, investigate, and prevent fraudulent transactions
- Personalize and improve user experience
- Comply with legal obligations
- Protect rights, property, and safety

3. DATA SHARING AND DISCLOSURE

We may share information:
- With service providers who assist in our operations
- With professional advisors (lawyers, accountants, auditors)
- To comply with legal obligations or valid legal requests
- To protect rights, property, or safety
- With your consent or at your direction
- In connection with a merger, sale, or acquisition

We do NOT sell your personal information to third parties.

4. DATA SECURITY

We implement security measures including:
- Encryption of data in transit (TLS/SSL) and at rest
- Regular security assessments and penetration testing
- Access controls and authentication requirements
- Security incident response procedures
- Employee training on data protection
- Physical security for data centers
- Regular backups and disaster recovery procedures

However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.

5. DATA RETENTION

We retain information for as long as necessary to:
- Provide services to you
- Comply with legal obligations
- Resolve disputes and enforce agreements
- Maintain business records

When data is no longer needed, we securely delete or anonymize it.

6. YOUR RIGHTS AND CHOICES

You have the right to:
- Access your personal information
- Correct inaccurate information
- Request deletion of your information
- Object to or restrict processing
- Data portability (receive your data in a structured format)
- Withdraw consent where applicable
- Opt-out of marketing communications

To exercise these rights, contact privacy@axp.com.

7. COOKIES AND TRACKING

We use cookies and similar technologies for:
- Authentication and security
- Remembering preferences and settings
- Analytics and performance monitoring
- Marketing and advertising (with consent)

You can control cookies through browser settings, though some features may not function properly without them.

8. CHILDREN'S PRIVACY

Our Service is not intended for children under 13. We do not knowingly collect information from children under 13. If we learn we have collected information from a child under 13, we will delete it.

9. INTERNATIONAL DATA TRANSFERS

Your information may be transferred to and processed in:
- The United States
- Other countries where we or our service providers operate

We ensure appropriate safeguards are in place for international transfers, including:
- Standard contractual clauses
- Data processing agreements
- Compliance with applicable frameworks

10. CALIFORNIA PRIVACY RIGHTS (CCPA)

California residents have additional rights:
- Right to know what personal information is collected
- Right to know if information is sold or disclosed
- Right to opt-out of sale of personal information
- Right to non-discrimination for exercising privacy rights
- Right to deletion of personal information

11. EUROPEAN PRIVACY RIGHTS (GDPR)

European residents have additional rights:
- Legal basis for processing (consent, contract, legitimate interests)
- Right to lodge complaints with supervisory authorities
- Right to withdraw consent
- Right to object to processing
- Rights related to automated decision-making

12. DATA BREACH NOTIFICATION

In the event of a data breach:
- We will notify affected users within 72 hours of discovery
- We will provide information about the breach and steps to protect yourself
- We will notify relevant authorities as required by law
- We will document the breach and our response

13. THIRD-PARTY LINKS

Our Service may contain links to third-party websites. We are not responsible for the privacy practices of these sites. We encourage you to read their privacy policies.

14. CHANGES TO THIS POLICY

We may update this Privacy Policy from time to time. We will notify you of material changes by:
- Posting the new policy on this page
- Updating the "Last Updated" date
- Sending email notification for significant changes
- Obtaining consent where required by law

15. CONTACT INFORMATION

For privacy-related questions or concerns:

Privacy Team
Email: privacy@axp.com

Data Protection Officer
Email: dpo@axp.com

Mailing Address:
AXP Privacy Department
[Your Company Address]

You may also submit requests through your account settings.

16. LEGAL BASIS FOR PROCESSING (GDPR)

We process personal data based on:
- Consent: When you agree to specific processing
- Contract: To fulfill our agreement with you
- Legal obligations: To comply with laws
- Legitimate interests: For business operations (unless overridden by your rights)

17. DO NOT TRACK

We do not currently respond to Do Not Track browser signals. However, you can control tracking through cookie settings and opting out of analytics.

18. DATA CONTROLLER

AXP is the data controller for information collected through the Service. For questions about how we handle your data, contact our Data Protection Officer.
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