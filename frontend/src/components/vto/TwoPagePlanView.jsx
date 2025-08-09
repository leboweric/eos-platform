import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { businessBlueprintService } from '../../services/businessBlueprintService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Target, 
  Lightbulb,
  Users,
  TrendingUp,
  Calendar,
  Loader2,
  AlertCircle
} from 'lucide-react';

const TwoPagePlanView = ({ hideIssuesAndPriorities = false }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 2-Page Plan data
  const [blueprintData, setBlueprintData] = useState({
    coreValues: [],
    coreFocus: {
      purpose: '',
      cause: '',
      passion: '',
      niche: '',
      hedgehogType: 'purpose'
    },
    bhag: {
      description: '',
      year: new Date().getFullYear() + 10,
      runningTotal: ''
    },
    marketingStrategy: {
      targetMarket: '',
      differentiators: ['', '', ''],
      provenProcessExists: false,
      guaranteeExists: false
    },
    threeYearPicture: null,
    oneYearPlan: null,
    quarterlyPriorities: null,
    longTermIssues: []
  });

  useEffect(() => {
    fetchBusinessBlueprint();
  }, []);

  const fetchBusinessBlueprint = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await businessBlueprintService.getBusinessBlueprint();
      
      // Transform API data to component state
      setBlueprintData({
        coreValues: data.coreValues || [],
        coreFocus: {
          purpose: data.coreFocus?.hedgehog_type === 'purpose' ? (data.coreFocus?.purpose_cause_passion || '') : '',
          cause: data.coreFocus?.hedgehog_type === 'cause' ? (data.coreFocus?.purpose_cause_passion || '') : '',
          passion: data.coreFocus?.hedgehog_type === 'passion' ? (data.coreFocus?.purpose_cause_passion || '') : '',
          niche: data.coreFocus?.niche || '',
          hedgehogType: data.coreFocus?.hedgehog_type || 'purpose'
        },
        bhag: {
          description: data.tenYearTarget?.target_description || '',
          year: data.tenYearTarget?.target_year || new Date().getFullYear() + 10,
          runningTotal: data.tenYearTarget?.running_total_description || ''
        },
        marketingStrategy: {
          targetMarket: data.marketingStrategy?.target_market || '',
          differentiators: [
            data.marketingStrategy?.differentiator_1 || '',
            data.marketingStrategy?.differentiator_2 || '',
            data.marketingStrategy?.differentiator_3 || '',
            data.marketingStrategy?.differentiator_4 || '',
            data.marketingStrategy?.differentiator_5 || ''
          ].filter(d => d),
          provenProcessExists: data.marketingStrategy?.proven_process_exists || false,
          guaranteeExists: data.marketingStrategy?.guarantee_exists || false
        },
        threeYearPicture: data.threeYearPicture,
        oneYearPlan: data.oneYearPlan,
        quarterlyPriorities: data.quarterlyPriorities,
        longTermIssues: data.longTermIssues || []
      });
    } catch (error) {
      console.error('Failed to fetch business blueprint:', error);
      setError('Failed to load 2-Page Plan');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Page 1 */}
      <div className="space-y-6">
        {/* Core Values */}
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardHeader className="bg-white border-b">
            <CardTitle className="flex items-center text-xl text-gray-900">
              <Users className="mr-2 h-6 w-6 text-indigo-600" />
              Core Values
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {blueprintData.coreValues && blueprintData.coreValues.length > 0 ? (
              <ul className="space-y-2">
                {(blueprintData.coreValues || []).map((value, index) => (
                  <li key={index} className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-semibold">{value.value}</h4>
                    {value.description && (
                      <p className="text-sm text-gray-600 mt-1">{value.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No core values defined yet</p>
            )}
          </CardContent>
        </Card>

        {/* Core Focus */}
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardHeader className="bg-white border-b">
            <CardTitle className="flex items-center text-xl text-gray-900">
              <Target className="mr-2 h-6 w-6 text-indigo-600" />
              Focus
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm text-gray-700">
                  {blueprintData.coreFocus.hedgehogType === 'purpose' ? 'Purpose' : 
                   blueprintData.coreFocus.hedgehogType === 'cause' ? 'Cause' : 'Passion'}
                </h4>
                <p className="text-gray-600">
                  {blueprintData.coreFocus[blueprintData.coreFocus.hedgehogType] || 'Not defined'}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Niche</h4>
                <p className="text-gray-600">{blueprintData.coreFocus.niche || 'Not defined'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Long Range Plan */}
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardHeader className="bg-white border-b">
            <CardTitle className="flex items-center text-xl text-gray-900">
              <TrendingUp className="mr-2 h-6 w-6 text-indigo-600" />
              Long Range Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-gray-600">
              {blueprintData.bhag.description || 'Not defined'}
            </p>
          </CardContent>
        </Card>

        {/* Marketing Strategy */}
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardHeader className="bg-white border-b">
            <CardTitle className="flex items-center text-xl text-gray-900">
              <Lightbulb className="mr-2 h-6 w-6 text-indigo-600" />
              Marketing Strategy
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Target Market</h4>
                <p className="text-gray-600">
                  {blueprintData.marketingStrategy.targetMarket || 'Not defined'}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Differentiators</h4>
                {blueprintData.marketingStrategy.differentiators && blueprintData.marketingStrategy.differentiators.filter(d => d).length > 0 ? (
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {(blueprintData.marketingStrategy.differentiators || [])
                      .filter(d => d)
                      .map((diff, index) => (
                        <li key={index}>{diff}</li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No differentiators defined</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Page 2 */}
      <div className="space-y-6">
        {/* 3-Year Picture */}
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardHeader className="bg-white border-b">
            <CardTitle className="flex items-center text-xl text-gray-900">
              <Calendar className="mr-2 h-6 w-6 text-indigo-600" />
              3-Year Picture
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {blueprintData.threeYearPicture ? (
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Revenue</h4>
                  <p className="text-gray-600">{blueprintData.threeYearPicture.revenue || 'Not set'}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Profit</h4>
                  <p className="text-gray-600">{blueprintData.threeYearPicture.profit || 'Not set'}</p>
                </div>
                {blueprintData.threeYearPicture?.measurables?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700">Key Measurables</h4>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      {(blueprintData.threeYearPicture.measurables || []).map((m, index) => (
                        <li key={m.id || index}>
                          {typeof m === 'string' ? m : `${m.name || m.metric_name || ''}: ${m.value || m.target_value || ''}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Not defined yet</p>
            )}
          </CardContent>
        </Card>

        {/* 1-Year Plan */}
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardHeader className="bg-white border-b">
            <CardTitle className="flex items-center text-xl text-gray-900">
              <Target className="mr-2 h-6 w-6 text-indigo-600" />
              1-Year Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {blueprintData.oneYearPlan ? (
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Revenue</h4>
                  <p className="text-gray-600">{blueprintData.oneYearPlan.revenue || 'Not set'}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Profit</h4>
                  <p className="text-gray-600">{blueprintData.oneYearPlan.profit || 'Not set'}</p>
                </div>
                {blueprintData.oneYearPlan?.goals?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700">Goals</h4>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      {(blueprintData.oneYearPlan.goals || []).map((goal, index) => (
                        <li key={goal.id || index}>
                          {typeof goal === 'string' ? goal : (goal.goal_text || goal.text || '')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Not defined yet</p>
            )}
          </CardContent>
        </Card>

        {!hideIssuesAndPriorities && (
          <>
            {/* Quarterly Priorities Summary */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-white border-b">
                <CardTitle className="flex items-center text-xl text-gray-900">
                  <Target className="mr-2 h-6 w-6 text-indigo-600" />
                  Quarterly Priorities
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-gray-600">
                  Review and set priorities in the Quarterly Priorities section
                </p>
              </CardContent>
            </Card>

            {/* Issues List Summary */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-white border-b">
                <CardTitle className="flex items-center text-xl text-gray-900">
                  <AlertCircle className="mr-2 h-6 w-6 text-indigo-600" />
                  Issues List
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-gray-600">
                  Track and resolve issues in the Issues section
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default TwoPagePlanView;