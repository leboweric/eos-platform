import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { businessBlueprintService } from '../../services/businessBlueprintService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  Target, 
  Lightbulb,
  Users,
  TrendingUp,
  Calendar,
  Loader2,
  AlertCircle,
  Plus
} from 'lucide-react';
import IssueDialog from '../issues/IssueDialog';

const TwoPagePlanView = ({ hideIssuesAndPriorities = false }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for tracking checked items in 3-Year Picture and 1-Year Plan
  const [lookLikeCheckedItems, setLookLikeCheckedItems] = useState({});
  const [oneYearGoalsCheckedItems, setOneYearGoalsCheckedItems] = useState({});
  
  // State for Issue Dialog
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  
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
  
  // Handler for toggling 3-Year Picture items
  const toggleLookLikeItem = async (index) => {
    try {
      await businessBlueprintService.toggleThreeYearItem(index);
      setLookLikeCheckedItems(prev => ({
        ...prev,
        [index]: !prev[index]
      }));
    } catch (error) {
      console.error('Failed to toggle item:', error);
      setError('Failed to update item completion status');
    }
  };
  
  // Handler for toggling 1-Year Plan goals
  const toggleGoalItem = async (goalId, index) => {
    try {
      if (!goalId) {
        console.error('Goal ID not provided');
        return;
      }
      
      const result = await businessBlueprintService.toggleOneYearGoal(goalId);
      setOneYearGoalsCheckedItems(prev => ({
        ...prev,
        [index]: result.is_completed
      }));
    } catch (error) {
      console.error('Failed to toggle goal:', error);
      setError('Failed to update goal completion status');
    }
  };

  const fetchBusinessBlueprint = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await businessBlueprintService.getBusinessBlueprint();
      // Set completion states from database
      if (data.threeYearPicture?.what_does_it_look_like_completions) {
        setLookLikeCheckedItems(data.threeYearPicture.what_does_it_look_like_completions);
      }
      
      if (data.oneYearPlan?.goals) {
        const goalsCompletionState = {};
        data.oneYearPlan.goals.forEach((goal, index) => {
          if (goal.is_completed) {
            goalsCompletionState[index] = true;
          }
        });
        setOneYearGoalsCheckedItems(goalsCompletionState);
      }
      
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
          demographicProfile: data.marketingStrategy?.demographic_profile || '',
          geographicProfile: data.marketingStrategy?.geographic_profile || '',
          psychographicProfile: data.marketingStrategy?.psychographic_profile || '',
          differentiators: [
            data.marketingStrategy?.differentiator_1 || '',
            data.marketingStrategy?.differentiator_2 || '',
            data.marketingStrategy?.differentiator_3 || '',
            data.marketingStrategy?.differentiator_4 || '',
            data.marketingStrategy?.differentiator_5 || ''
          ].filter(d => d),
          provenProcessExists: data.marketingStrategy?.proven_process_exists || false,
          provenProcess: data.marketingStrategy?.proven_process || '',
          guaranteeExists: data.marketingStrategy?.guarantee_exists || false,
          guarantee: data.marketingStrategy?.guarantee || '',
          guaranteeDescription: data.marketingStrategy?.guarantee_description || ''
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
    <>
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
            <div className="space-y-3">
              {blueprintData.bhag.year && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Target Year</h4>
                  <p className="text-gray-600">{blueprintData.bhag.year}</p>
                </div>
              )}
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Vision Description</h4>
                <p className="text-gray-600">
                  {blueprintData.bhag.description || 'Not defined'}
                </p>
              </div>
              {blueprintData.bhag.runningTotal && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Running Total</h4>
                  <p className="text-gray-600">{blueprintData.bhag.runningTotal}</p>
                </div>
              )}
            </div>
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
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Target Market</h4>
                {(blueprintData.marketingStrategy?.demographicProfile || 
                  blueprintData.marketingStrategy?.geographicProfile || 
                  blueprintData.marketingStrategy?.psychographicProfile) ? (
                  <div className="space-y-4">
                    {blueprintData.marketingStrategy?.demographicProfile && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h5 className="font-semibold text-sm text-indigo-700 mb-2 uppercase tracking-wide">Demographic</h5>
                        <p className="text-gray-700 whitespace-pre-wrap pl-2">{blueprintData.marketingStrategy.demographicProfile}</p>
                      </div>
                    )}
                    {blueprintData.marketingStrategy?.geographicProfile && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h5 className="font-semibold text-sm text-blue-700 mb-2 uppercase tracking-wide">Geographic</h5>
                        <p className="text-gray-700 whitespace-pre-wrap pl-2">{blueprintData.marketingStrategy.geographicProfile}</p>
                      </div>
                    )}
                    {blueprintData.marketingStrategy?.psychographicProfile && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <h5 className="font-semibold text-sm text-green-700 mb-2 uppercase tracking-wide">Psychographic</h5>
                        <p className="text-gray-700 whitespace-pre-wrap pl-2">{blueprintData.marketingStrategy.psychographicProfile}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {blueprintData.marketingStrategy?.targetMarket || 'Not defined'}
                  </p>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Differentiators</h4>
                {blueprintData.marketingStrategy.differentiators && blueprintData.marketingStrategy.differentiators.filter(d => d).length > 0 ? (
                  <ul className="space-y-1">
                    {(blueprintData.marketingStrategy.differentiators || [])
                      .filter(d => d)
                      .map((diff, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-indigo-600 mr-2">•</span>
                          <span className="text-gray-600">{diff}</span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No differentiators defined</p>
                )}
              </div>
              {(blueprintData.marketingStrategy.provenProcessExists || blueprintData.marketingStrategy.provenProcess) && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Proven Process</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="text-sm text-gray-600">
                      {blueprintData.marketingStrategy.provenProcess || 'Yes, we have a proven process'}
                    </span>
                  </div>
                </div>
              )}
              {(blueprintData.marketingStrategy.guaranteeExists || blueprintData.marketingStrategy.guarantee || blueprintData.marketingStrategy.guaranteeDescription) && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Guarantee</h4>
                  {blueprintData.marketingStrategy.guaranteeDescription || blueprintData.marketingStrategy.guarantee ? (
                    <p className="text-gray-600">
                      {blueprintData.marketingStrategy.guaranteeDescription || blueprintData.marketingStrategy.guarantee}
                    </p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm text-gray-600">We offer a guarantee</span>
                    </div>
                  )}
                </div>
              )}
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
                {blueprintData.threeYearPicture.future_date && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700">Target Date</h4>
                    <p className="text-gray-600">
                      {(() => {
                        const [year, month, day] = blueprintData.threeYearPicture.future_date.split('T')[0].split('-');
                        const date = new Date(year, month - 1, day);
                        return date.toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        });
                      })()}
                    </p>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Revenue Target</h4>
                  <p className="text-gray-600">
                    {(blueprintData.threeYearPicture.revenue_target || blueprintData.threeYearPicture.revenue) ? (
                      `$${Number(blueprintData.threeYearPicture.revenue_target || blueprintData.threeYearPicture.revenue) < 1 
                        ? `${(Number(blueprintData.threeYearPicture.revenue_target || blueprintData.threeYearPicture.revenue) * 1000).toFixed(0)}K`
                        : `${Number(blueprintData.threeYearPicture.revenue_target || blueprintData.threeYearPicture.revenue).toFixed(1)}M`}`
                    ) : 'Not set'}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Profit Target</h4>
                  <p className="text-gray-600">
                    {(blueprintData.threeYearPicture.profit_percentage || blueprintData.threeYearPicture.profit_target || blueprintData.threeYearPicture.profit) ? 
                      `${Number(blueprintData.threeYearPicture.profit_percentage || blueprintData.threeYearPicture.profit_target || blueprintData.threeYearPicture.profit).toFixed(2)}%`
                      : 'Not set'}
                  </p>
                </div>
                {(() => {
                  const lookLikeData = blueprintData.threeYearPicture?.lookLikeItems || 
                    (blueprintData.threeYearPicture?.what_does_it_look_like && 
                     typeof blueprintData.threeYearPicture.what_does_it_look_like === 'string' 
                       ? JSON.parse(blueprintData.threeYearPicture.what_does_it_look_like)
                       : blueprintData.threeYearPicture?.what_does_it_look_like) || [];
                  const filteredItems = Array.isArray(lookLikeData) ? lookLikeData.filter(item => item) : [];
                  
                  return filteredItems.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700">What does it look like?</h4>
                      <ul className="space-y-2">
                        {filteredItems.map((item, index) => {
                          const isChecked = lookLikeCheckedItems[index] || false;
                          return (
                            <li key={index} className="flex items-start gap-2">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleLookLikeItem(index)}
                                className="mt-0.5"
                              />
                              <span className={`text-gray-600 ${isChecked ? 'line-through opacity-60' : ''}`}>
                                {item}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })()}
                {blueprintData.threeYearPicture?.measurables?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700">Key Measurables</h4>
                    <ul className="list-disc pl-5 text-gray-600 space-y-1">
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
                  <h4 className="font-semibold text-sm text-gray-700">Revenue Target</h4>
                  <p className="text-gray-600">
                    {(blueprintData.oneYearPlan.revenue_target || blueprintData.oneYearPlan.revenue) ? (
                      `$${Number(blueprintData.oneYearPlan.revenue_target || blueprintData.oneYearPlan.revenue) < 1 
                        ? `${(Number(blueprintData.oneYearPlan.revenue_target || blueprintData.oneYearPlan.revenue) * 1000).toFixed(0)}K`
                        : `${Number(blueprintData.oneYearPlan.revenue_target || blueprintData.oneYearPlan.revenue).toFixed(1)}M`}`
                    ) : 'Not set'}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Profit Target</h4>
                  <p className="text-gray-600">
                    {(blueprintData.oneYearPlan.profit_percentage || blueprintData.oneYearPlan.profit_target) ? (
                      `${Number(blueprintData.oneYearPlan.profit_percentage || blueprintData.oneYearPlan.profit_target).toFixed(2)}%`
                    ) : 'Not set'}
                  </p>
                </div>
                {blueprintData.oneYearPlan?.goals?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700">Goals</h4>
                    <ul className="space-y-2">
                      {(blueprintData.oneYearPlan.goals || []).map((goal, index) => {
                        const isChecked = oneYearGoalsCheckedItems[index] || false;
                        const goalText = typeof goal === 'string' ? goal : (goal.goal_text || goal.text || '');
                        const goalId = typeof goal === 'object' ? goal.id : null;
                        return (
                          <li key={goal.id || index} className="flex items-start gap-2">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleGoalItem(goalId, index)}
                              className="mt-0.5"
                            />
                            <span className={`text-gray-600 ${isChecked ? 'line-through opacity-60' : ''}`}>
                              {goalText}
                            </span>
                          </li>
                        );
                      })}
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
                <CardTitle className="flex items-center justify-between text-xl text-gray-900">
                  <div className="flex items-center">
                    <AlertCircle className="mr-2 h-6 w-6 text-indigo-600" />
                    Issues List
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowIssueDialog(true)}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Issue
                  </Button>
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

    {/* Issue Dialog */}
    {showIssueDialog && (
      <IssueDialog
        isOpen={showIssueDialog}
        onClose={() => setShowIssueDialog(false)}
        onSubmit={async (issueData) => {
          // The IssueDialog will handle the submission
          setShowIssueDialog(false);
        }}
        teamId="00000000-0000-0000-0000-000000000000"
      />
    )}
    </>
  );
};

export default TwoPagePlanView;