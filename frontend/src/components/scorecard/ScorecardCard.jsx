import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  User
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { organizationService } from '../../services/organizationService';
import { getOrgTheme, saveOrgTheme } from '../../utils/themeUtils';

/**
 * ScorecardCard component for displaying scorecard metric information
 * @param {Object} props - Component props
 * @param {Object} props.metric - Metric data
 * @param {string} props.metric.id - Metric ID
 * @param {string} props.metric.name - Metric name
 * @param {string} props.metric.metric_name - Alternative metric name field
 * @param {string} props.metric.unit_of_measure - Unit of measure
 * @param {string} props.metric.value_type - Value type (percentage/currency/decimal/number)
 * @param {number} props.metric.goal - Goal value
 * @param {string} props.metric.comparison_operator - Comparison operator (>=/<=/>/<=/=)
 * @param {string} props.metric.frequency - Measurement frequency
 * @param {string} props.metric.owner_name - Owner name
 * @param {string} props.metric.ownerName - Alternative owner name field
 * @param {string} props.metric.owner_first_name - Owner's first name
 * @param {string} props.metric.owner_last_name - Owner's last name
 * @param {string} props.metric.ownerId - Owner ID
 * @param {string} props.metric.team_id - ID of the team
 * @param {boolean} props.metric.is_published_to_departments - Whether metric is published to departments
 * @param {string} props.metric.published_at - Publication timestamp
 * @param {string} props.metric.published_by - ID of user who published
 * @param {number} props.weeklyScore - Current weekly score value
 * @param {boolean} props.readOnly - Whether in read-only mode
 */
const ScorecardCard = ({ metric, weeklyScore, readOnly = false }) => {
  const { user } = useAuthStore();
  const [themeColors, setThemeColors] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#60A5FA'
  });

  useEffect(() => {
    fetchOrganizationTheme();
    
    const handleThemeChange = (event) => {
      setThemeColors(event.detail);
    };
    
    const handleOrgChange = () => {
      fetchOrganizationTheme();
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    window.addEventListener('organizationChanged', handleOrgChange);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
      window.removeEventListener('organizationChanged', handleOrgChange);
    };
  }, [user?.organizationId, user?.organization_id]);

  const fetchOrganizationTheme = async () => {
    try {
      const orgId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
      const orgData = await organizationService.getOrganization();
      
      if (orgData) {
        const theme = {
          primary: orgData.theme_primary_color || '#3B82F6',
          secondary: orgData.theme_secondary_color || '#1E40AF',
          accent: orgData.theme_accent_color || '#60A5FA'
        };
        setThemeColors(theme);
        saveOrgTheme(orgId, theme);
      } else {
        const savedTheme = getOrgTheme(orgId);
        if (savedTheme) {
          setThemeColors(savedTheme);
        }
      }
    } catch (error) {
      console.error('Failed to fetch organization theme:', error);
      const orgId = user?.organizationId || user?.organization_id || localStorage.getItem('organizationId');
      const savedTheme = getOrgTheme(orgId);
      if (savedTheme) {
        setThemeColors(savedTheme);
      }
    }
  };
  // Format value based on type
  const formatValue = (value, type) => {
    if (value === null || value === undefined) return '-';
    switch (type) {
      case 'percentage':
        return `${value}%`;
      case 'currency':
        return `$${parseFloat(value).toLocaleString()}`;
      case 'decimal':
        return parseFloat(value).toFixed(2);
      default:
        return value.toString();
    }
  };

  // Check if goal is met based on comparison operator
  const isGoalMet = (value, goal, operator) => {
    if (!value || !goal) return false;
    const numValue = parseFloat(value);
    const numGoal = parseFloat(goal);
    
    switch (operator) {
      case '>=':
        return numValue >= numGoal;
      case '<=':
        return numValue <= numGoal;
      case '>':
        return numValue > numGoal;
      case '<':
        return numValue < numGoal;
      case '=':
        return numValue === numGoal;
      default:
        return numValue >= numGoal;
    }
  };

  const currentScore = weeklyScore || null;
  const hasScore = currentScore !== null && currentScore !== undefined && currentScore !== '';
  const goalMet = hasScore ? isGoalMet(currentScore, metric.goal, metric.comparison_operator) : false;

  return (
    <Card className={`${hasScore && !goalMet ? 'border-red-200' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-medium text-lg">{metric.name || metric.metric_name || 'Unnamed Metric'}</h3>
            {metric.unit_of_measure && (
              <p className="text-sm text-gray-500">{metric.unit_of_measure}</p>
            )}
            {(metric.owner_name || metric.ownerName || metric.owner_first_name || metric.ownerId) && (
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                <User className="h-3 w-3" />
                <span>
                  {metric.owner_name || 
                   metric.ownerName || 
                   (metric.owner_first_name && metric.owner_last_name ? 
                    `${metric.owner_first_name} ${metric.owner_last_name}` : 
                    'Assigned')}
                </span>
              </div>
            )}
          </div>
          {hasScore && (
            <div className="p-2 rounded-full" style={{ 
              backgroundColor: goalMet ? `${themeColors.accent}20` : '#FEE2E2' 
            }}>
              {goalMet ? (
                <TrendingUp className="h-5 w-5" style={{ color: themeColors.primary }} />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-500">Goal</p>
            <p className="text-lg font-semibold">{formatValue(metric.goal, metric.value_type)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">This Week</p>
            <p className={`text-lg font-semibold ${hasScore ? (!goalMet ? 'text-red-600' : '') : 'text-gray-400'}`}
               style={{ color: hasScore && goalMet ? themeColors.primary : undefined }}>
              {hasScore ? formatValue(currentScore, metric.value_type) : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Frequency</p>
            <p className="text-sm font-medium text-gray-600">{metric.frequency || 'Weekly'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScorecardCard;