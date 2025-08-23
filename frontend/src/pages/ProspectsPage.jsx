import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../services/axiosConfig';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  Search,
  Filter,
  Download,
  RefreshCw,
  ExternalLink,
  Mail,
  Phone,
  Linkedin,
  Star,
  Clock
} from 'lucide-react';

const ProspectsPage = () => {
  const { user } = useAuthStore();
  const token = localStorage.getItem('token');
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dailySummary, setDailySummary] = useState(null);

  useEffect(() => {
    fetchProspects();
    fetchDailySummary();
  }, [filter]);

  const fetchProspects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('tier', filter);
      
      const response = await api.get(`/prospects?${params}`);
      
      setProspects(response.data);
    } catch (error) {
      console.error('Error fetching prospects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailySummary = async () => {
    try {
      const response = await api.get('/prospects/summary/daily');
      setDailySummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchProspectDetails = async (prospectId) => {
    try {
      const response = await api.get(`/prospects/${prospectId}`);
      setSelectedProspect(response.data);
    } catch (error) {
      console.error('Error fetching prospect details:', error);
    }
  };

  const runEnrichment = async () => {
    try {
      const response = await api.post('/prospects/enrich', {});
      alert('Enrichment started for ' + response.data.count + ' prospects');
      fetchProspects();
    } catch (error) {
      console.error('Error running enrichment:', error);
    }
  };

  const runReviewScraping = async () => {
    try {
      const response = await api.post('/prospects/scrape-reviews', {});
      alert(`Scraping complete: ${response.data.newProspects} new prospects found`);
      fetchProspects();
    } catch (error) {
      console.error('Error running scraper:', error);
    }
  };

  const getTierColor = (tier) => {
    switch(tier) {
      case 'hot': return 'text-red-600 bg-red-50';
      case 'warm': return 'text-yellow-600 bg-yellow-50';
      case 'cold': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCompetitorBadge = (competitor) => {
    if (!competitor) return null;
    const competitorMap = {
      'ninety_io': 'Ninety.io',
      'bloom_growth': 'Bloom Growth',
      'traction_tools': 'Traction Tools'
    };
    return competitorMap[competitor] || competitor;
  };

  const filteredProspects = prospects.filter(prospect => 
    prospect.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prospect.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Prospect Pipeline</h1>
              <p className="text-gray-600 mt-1">Find and track potential AXP customers</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={runReviewScraping}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Scrape Reviews
              </button>
              <button
                onClick={runEnrichment}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Enrich Data
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {dailySummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Prospects</p>
                  <p className="text-2xl font-bold text-gray-900">{dailySummary.total_prospects}</p>
                </div>
                <Building2 className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Hot Prospects</p>
                  <p className="text-2xl font-bold text-red-600">{dailySummary.hot_prospects}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Competitor Users</p>
                  <p className="text-2xl font-bold text-purple-600">{dailySummary.competitor_users_found}</p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">New Today</p>
                  <p className="text-2xl font-bold text-green-600">{dailySummary.new_prospects_today}</p>
                </div>
                <Clock className="w-8 h-8 text-green-500" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/50 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                All Prospects
              </button>
              <button
                onClick={() => setFilter('hot')}
                className={`px-4 py-2 rounded-lg ${filter === 'hot' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                🔥 Hot
              </button>
              <button
                onClick={() => setFilter('warm')}
                className={`px-4 py-2 rounded-lg ${filter === 'warm' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                ⚡ Warm
              </button>
              <button
                onClick={() => setFilter('cold')}
                className={`px-4 py-2 rounded-lg ${filter === 'cold' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                ❄️ Cold
              </button>
            </div>
            
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search prospects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Prospects Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-white/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Competitor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signals
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      Loading prospects...
                    </td>
                  </tr>
                ) : filteredProspects.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      No prospects found
                    </td>
                  </tr>
                ) : (
                  filteredProspects.map((prospect) => (
                    <tr key={prospect.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {prospect.company_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {prospect.industry}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg font-bold text-gray-900">
                            {prospect.prospect_score || 0}
                          </span>
                          <span className="ml-1 text-sm text-gray-500">pts</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTierColor(prospect.prospect_tier)}`}>
                          {prospect.prospect_tier?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {prospect.employee_count ? `${prospect.employee_count} employees` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getCompetitorBadge(prospect.using_competitor) && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                            {getCompetitorBadge(prospect.using_competitor)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-1">
                          {prospect.has_eos_titles && (
                            <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                              EOS Roles
                            </span>
                          )}
                          {prospect.competitor_review_rating && prospect.competitor_review_rating <= 3 && (
                            <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">
                              Bad Review
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => fetchProspectDetails(prospect.id)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Prospect Details Modal */}
        {selectedProspect && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedProspect.company_name}
                    </h2>
                    <p className="text-gray-600">{selectedProspect.industry}</p>
                  </div>
                  <button
                    onClick={() => setSelectedProspect(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                {/* Company Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Score</p>
                    <p className="text-xl font-bold">{selectedProspect.prospect_score} points</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tier</p>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getTierColor(selectedProspect.prospect_tier)}`}>
                      {selectedProspect.prospect_tier?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Employees</p>
                    <p className="font-semibold">{selectedProspect.employee_count || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Revenue</p>
                    <p className="font-semibold">
                      {selectedProspect.revenue_estimate 
                        ? `$${(selectedProspect.revenue_estimate / 1000000).toFixed(1)}M` 
                        : 'Unknown'}
                    </p>
                  </div>
                </div>

                {/* Pain Points */}
                {selectedProspect.competitor_pain_points && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Pain Points</h3>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="text-sm text-red-800">{selectedProspect.competitor_pain_points}</p>
                    </div>
                  </div>
                )}

                {/* Contacts */}
                {selectedProspect.contacts && selectedProspect.contacts.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Contacts</h3>
                    <div className="space-y-3">
                      {selectedProspect.contacts.map((contact, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold">
                                {contact.first_name} {contact.last_name}
                                {contact.is_decision_maker && (
                                  <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                    Decision Maker
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-gray-600">{contact.title}</p>
                            </div>
                            <div className="flex gap-2">
                              {contact.email && (
                                <a href={`mailto:${contact.email}`} className="text-gray-400 hover:text-gray-600">
                                  <Mail className="w-5 h-5" />
                                </a>
                              )}
                              {contact.linkedin_url && (
                                <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                                  <Linkedin className="w-5 h-5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Signals */}
                {selectedProspect.signals && selectedProspect.signals.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Signals</h3>
                    <div className="space-y-2">
                      {selectedProspect.signals.map((signal, index) => (
                        <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                          <div>
                            <p className="font-medium text-blue-900">{signal.signal_type}</p>
                            <p className="text-sm text-blue-700">Strength: {signal.signal_strength}/10</p>
                          </div>
                          <p className="text-xs text-blue-600">
                            {new Date(signal.detected_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProspectsPage;