import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const NotFound = () => {
  return (
    <>
      <SEO 
        title="Page Not Found"
        description="The page you're looking for doesn't exist. Return to AXP - the most affordable alternative to Ninety.io, Bloom Growth, and EOS One."
        noindex={true}
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 shadow-sm border border-white/50">
            <h1 className="text-9xl font-bold text-gray-200 mb-4">404</h1>
            <h2 className="text-3xl font-semibold text-gray-800 mb-4">
              Page Not Found
            </h2>
            <p className="text-gray-600 mb-8">
              Sorry, we couldn't find the page you're looking for. It may have been moved or deleted.
            </p>
            <div className="space-y-4">
              <Link 
                to="/dashboard" 
                className="inline-block w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Go to Dashboard
              </Link>
              <Link 
                to="/" 
                className="inline-block w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors ml-0 sm:ml-4"
              >
                Back to Home
              </Link>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Looking for a better way to run your business?
              </p>
              <Link 
                to="/signup" 
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Start your 30-day free trial →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;