import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { businessBlueprintService } from '../../services/businessBlueprintService';
import { organizationService } from '../../services/organizationService';
import { getOrgTheme, saveOrgTheme } from '../../utils/themeUtils';
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
  
  // State for organization theme colors
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });
  
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
    fetchOrganizationTheme();
    
    // Listen for theme changes
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    // Listen for organization changes
    const handleOrgChange = () => {
      fetchOrganizationTheme();
      fetchBusinessBlueprint();
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    window.addEventListener('organizationChanged', handleOrgChange);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
      window.removeEventListener('organizationChanged', handleOrgChange);
    };
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

  const fetchOrganizationTheme = async () => {
    try {
      // First check localStorage
      const orgId = user?.organizationId || user?.organization_id;
      const savedTheme = getOrgTheme(orgId);
      console.log('Saved theme from localStorage:', savedTheme);
      if (savedTheme) {
        console.log('Using saved theme:', savedTheme);
        setThemeColors(savedTheme);
        return;
      }
      
      // Fetch from API
      console.log('Fetching organization data for theme...');
      const orgData = await organizationService.getOrganization();
      console.log('Organization data received:', orgData);
      
      if (orgData) {
        // The service already returns response.data.data, so orgData is the direct data
        const theme = {
          primary: orgData.theme_primary_color || '#3B82F6',
          secondary: orgData.theme_secondary_color || '#1E40AF',
          accent: orgData.theme_accent_color || '#60A5FA'
        };
        console.log('Theme colors extracted:', theme);
        setThemeColors(theme);
        saveOrgTheme(orgId, theme);
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
      // Use default colors on error
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
      console.log('TwoPagePlanView - threeYearPicture revenueStreams:', data.threeYearPicture?.revenueStreams);
      console.log('TwoPagePlanView - oneYearPlan revenueStreams:', data.oneYearPlan?.revenueStreams);
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
              <Users className="mr-2 h-6 w-6" style={{ color: themeColors.primary }} />
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
              <Target className="mr-2 h-6 w-6" style={{ color: themeColors.primary }} />
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
              <TrendingUp className="mr-2 h-6 w-6" style={{ color: themeColors.primary }} />
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
              <Lightbulb className="mr-2 h-6 w-6" style={{ color: themeColors.primary }} />
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
                        <h5 className="font-semibold text-sm mb-2 uppercase tracking-wide" style={{ color: themeColors.secondary }}>Demographic</h5>
                        <p className="text-gray-700 whitespace-pre-wrap pl-2">{blueprintData.marketingStrategy.demographicProfile}</p>
                      </div>
                    )}
                    {blueprintData.marketingStrategy?.geographicProfile && (
                      <div className="p-3 rounded-lg" style={{ backgroundColor: `${themeColors.accent}20` }}>
                        <h5 className="font-semibold text-sm mb-2 uppercase tracking-wide" style={{ color: themeColors.secondary }}>Geographic</h5>
                        <p className="text-gray-700 whitespace-pre-wrap pl-2">{blueprintData.marketingStrategy.geographicProfile}</p>
                      </div>
                    )}
                    {blueprintData.marketingStrategy?.psychographicProfile && (
                      <div className="p-3 rounded-lg" style={{ backgroundColor: `${themeColors.secondary}10` }}>
                        <h5 className="font-semibold text-sm mb-2 uppercase tracking-wide" style={{ color: themeColors.secondary }}>Psychographic</h5>
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
                          <span className="mr-2" style={{ color: themeColors.primary }}>•</span>
                          <span className="text-gray-600">{diff}</span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No differentiators defined</p>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Proven Process</h4>
                {(blueprintData.marketingStrategy.provenProcessExists || blueprintData.marketingStrategy.provenProcess) ? (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="text-sm text-gray-600">
                      {blueprintData.marketingStrategy.provenProcess || 'Yes, we have a proven process'}
                    </span>
                  </div>
                ) : (
                  <p className="text-gray-500">Not defined</p>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-700">Guarantee</h4>
                {(blueprintData.marketingStrategy.guaranteeExists || blueprintData.marketingStrategy.guarantee || blueprintData.marketingStrategy.guaranteeDescription) ? (
                  blueprintData.marketingStrategy.guaranteeDescription || blueprintData.marketingStrategy.guarantee ? (
                    <p className="text-gray-600">
                      {blueprintData.marketingStrategy.guaranteeDescription || blueprintData.marketingStrategy.guarantee}
                    </p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm text-gray-600">We offer a guarantee</span>
                    </div>
                  )
                ) : (
                  <p className="text-gray-500">Not defined</p>
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
              <Calendar className="mr-2 h-6 w-6" style={{ color: themeColors.primary }} />
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
                    {(() => {
                      // First check if there's a "Total Revenue" stream
                      const totalRevenueStream = blueprintData.threeYearPicture?.revenueStreams?.find(
                        stream => stream.name === 'Total Revenue'
                      );
                      if (totalRevenueStream?.revenue_target) {
                        return totalRevenueStream.revenue_target;
                      }
                      // Fall back to direct revenue fields
                      return blueprintData.threeYearPicture?.revenue || blueprintData.threeYearPicture?.revenue_target || 'Not set';
                    })()}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Profit Target</h4>
                  <p className="text-gray-600">
                    {blueprintData.threeYearPicture?.profit_target || blueprintData.threeYearPicture?.profit || 'Not set'}
                  </p>
                </div>
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
              <Target className="mr-2 h-6 w-6" style={{ color: themeColors.primary }} />
              1-Year Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {blueprintData.oneYearPlan ? (
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Revenue Target</h4>
                  <p className="text-gray-600">
                    {(() => {
                      // First check if there's a "Total Revenue" stream
                      const totalRevenueStream = blueprintData.oneYearPlan?.revenueStreams?.find(
                        stream => stream.name === 'Total Revenue'
                      );
                      if (totalRevenueStream?.revenue_target) {
                        return totalRevenueStream.revenue_target;
                      }
                      // Fall back to direct revenue fields
                      return blueprintData.oneYearPlan?.revenue || blueprintData.oneYearPlan?.revenue_target || 'Not set';
                    })()}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Profit Target</h4>
                  <p className="text-gray-600">
                    {blueprintData.oneYearPlan?.profit_percentage || blueprintData.oneYearPlan?.profit || 'Not set'}
                  </p>
                </div>
                {blueprintData.oneYearPlan?.measurables?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700">Key Measurables</h4>
                    <ul className="list-disc pl-5 text-gray-600 space-y-1">
                      {(blueprintData.oneYearPlan.measurables || []).map((m, index) => (
                        <li key={m.id || index}>
                          {typeof m === 'string' ? m : `${m.name || m.metric_name || ''}: ${m.value || m.target_value || ''}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
                  <Target className="mr-2 h-6 w-6" style={{ color: themeColors.primary }} />
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
                    <AlertCircle className="mr-2 h-6 w-6" style={{ color: themeColors.primary }} />
                    Issues List
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowIssueDialog(true)}
                    style={{ backgroundColor: themeColors.primary }}
                    className="hover:opacity-90"
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

    {/* Issue Dialog - Only show if issues section is not hidden */}
    {!hideIssuesAndPriorities && showIssueDialog && (
      <IssueDialog
        open={showIssueDialog}
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