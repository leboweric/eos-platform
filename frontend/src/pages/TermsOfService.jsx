import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TermsOfService = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-white/50">
          <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
          <p className="text-gray-600 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-700">
                By accessing or using the AXP Platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). 
                If you do not agree to all these Terms, you are prohibited from using the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Disclaimer of Warranties</h2>
              <p className="text-gray-700">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, 
                INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, 
                AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES 
                OR OTHER HARMFUL COMPONENTS.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Limitation of Liability</h2>
              <p className="text-gray-700 mb-2">IN NO EVENT SHALL AXP, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                <li>Any loss of profits, revenue, data, or use</li>
                <li>Any claims arising from data breaches, security incidents, or unauthorized access</li>
                <li>Damages exceeding the fees paid by you in the twelve (12) months preceding the claim</li>
                <li>Any losses or damages arising from business interruption</li>
                <li>Any losses or damages arising from loss of data or profits</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Indemnification</h2>
              <p className="text-gray-700">
                You agree to defend, indemnify, and hold harmless AXP and its affiliates, officers, directors, employees, 
                consultants, agents, and representatives from any and all claims, damages, losses, liabilities, costs, 
                and expenses (including reasonable attorneys' fees) arising from:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700 mt-2">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third-party rights</li>
                <li>Any data breach resulting from your credentials or security practices</li>
                <li>Your Content or any information you provide</li>
                <li>Your violation of any applicable laws or regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data and Security</h2>
              <p className="text-gray-700 mb-2">While we implement industry-standard security measures:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>We cannot guarantee absolute security of your data</li>
                <li>You acknowledge the inherent risks of internet-based services</li>
                <li>You are responsible for maintaining the confidentiality of your credentials</li>
                <li>We are not liable for any unauthorized access resulting from your actions or omissions</li>
                <li>You must notify us immediately of any breach of security or unauthorized use</li>
                <li>You are responsible for backing up your own data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. User Responsibilities</h2>
              <p className="text-gray-700 mb-2">You agree to:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Not use the Service for any illegal or unauthorized purpose</li>
                <li>Not transmit any viruses, worms, or malicious code</li>
                <li>Not interfere with or disrupt the Service or servers</li>
                <li>Not attempt to gain unauthorized access to any portion of the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Service Modifications</h2>
              <p className="text-gray-700 mb-2">We reserve the right to:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Modify or discontinue the Service at any time without notice</li>
                <li>Change these Terms at any time with notice</li>
                <li>Suspend or terminate your access for any reason without notice</li>
                <li>Change pricing with 30 days notice</li>
                <li>Add or remove features at our discretion</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Arbitration Agreement</h2>
              <p className="text-gray-700">
                ANY DISPUTE ARISING FROM THESE TERMS OR YOUR USE OF THE SERVICE SHALL BE RESOLVED THROUGH BINDING ARBITRATION, 
                NOT IN COURT. You waive your right to jury trial and class action lawsuits. The arbitration shall be conducted 
                by a single arbitrator under the rules of the American Arbitration Association.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Governing Law</h2>
              <p className="text-gray-700">
                These Terms shall be governed by the laws of the State of Delaware, without regard to conflict of law principles. 
                Any legal action or proceeding shall be brought exclusively in the federal or state courts located in Delaware.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Contact Information</h2>
              <p className="text-gray-700">
                For questions about these Terms, please contact:<br />
                AXP Legal Department<br />
                Email: legal@axplatform.app
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;