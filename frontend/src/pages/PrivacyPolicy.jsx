import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => {
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
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
              
              <h3 className="text-lg font-semibold mb-2">Information You Provide Directly:</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Account registration information (name, email, company name, password)</li>
                <li>Profile information (job title, department, phone number)</li>
                <li>Payment and billing information (processed by Stripe)</li>
                <li>Content you create (priorities, scorecards, documents, notes)</li>
                <li>Communications with us (support tickets, emails)</li>
              </ul>
              
              <h3 className="text-lg font-semibold mb-2 mt-4">Information Collected Automatically:</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Usage data (features used, frequency, duration)</li>
                <li>Device information (browser type, operating system, IP address)</li>
                <li>Log data (access times, pages viewed, clicks)</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Performance data and analytics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. How We Use Information</h2>
              <p className="text-gray-700">We use collected information to:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices, updates, security alerts</li>
                <li>Respond to comments, questions, and customer service requests</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>Detect, investigate, and prevent fraudulent transactions</li>
                <li>Personalize and improve user experience</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Data Sharing and Disclosure</h2>
              <p className="text-gray-700 mb-2">We may share information:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>With service providers who assist in our operations</li>
                <li>With professional advisors (lawyers, accountants, auditors)</li>
                <li>To comply with legal obligations or valid legal requests</li>
                <li>To protect rights, property, or safety</li>
                <li>With your consent or at your direction</li>
                <li>In connection with a merger, sale, or acquisition</li>
              </ul>
              <p className="text-gray-700 font-semibold mt-4">We do NOT sell your personal information to third parties.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
              <p className="text-gray-700 mb-2">We implement security measures including:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Encryption of data in transit (TLS/SSL) and at rest</li>
                <li>Regular security assessments and penetration testing</li>
                <li>Access controls and authentication requirements</li>
                <li>Security incident response procedures</li>
                <li>Employee training on data protection</li>
                <li>Physical security for data centers</li>
                <li>Regular backups and disaster recovery procedures</li>
              </ul>
              <p className="text-gray-700 mt-4">However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Your Rights and Choices</h2>
              <p className="text-gray-700 mb-2">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your information</li>
                <li>Object to or restrict processing</li>
                <li>Data portability (receive your data in a structured format)</li>
                <li>Withdraw consent where applicable</li>
                <li>Opt-out of marketing communications</li>
              </ul>
              <p className="text-gray-700 mt-4">To exercise these rights, contact privacy@axplatform.app.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Contact Information</h2>
              <p className="text-gray-700">For privacy-related questions or concerns:</p>
              <p className="text-gray-700 mt-2">
                Privacy Team<br />
                Email: privacy@axplatform.app
              </p>
              <p className="text-gray-700 mt-4">
                Data Protection Officer<br />
                Email: dpo@axplatform.app
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;