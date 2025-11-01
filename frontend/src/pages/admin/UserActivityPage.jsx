import React, { useState, useEffect } from 'react';
import { 
  Users, Activity, TrendingUp, Clock, Calendar,
  RefreshCw, User, BarChart, MousePointer
} from 'lucide-react';
import { LineChart, Line, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { userActivityService } from '../../services/userActivityService';

const UserActivityPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(7); // days
  const [stats, setStats] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all activity data
  const fetchActivityData = async () => {
    try {
      setRefreshing(true);
      setError(null);

      const [statsResponse, topUsersResponse, recentResponse] = await Promise.all([
        userActivityService.getActivityStats(timeRange),
        userActivityService.getTopUsers(10, timeRange),
        userActivityService.getRecentActivity(20)
      ]);

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
      
      if (topUsersResponse.success) {
        setTopUsers(topUsersResponse.data);
      }
      
      if (recentResponse.success) {
        setRecentActivity(recentResponse.data);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching activity data:', err);
      setError(err.message);
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivityData();
  }, [timeRange]);

  // Format duration from milliseconds
  const formatDuration = (ms) => {
    if (!ms) return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Format relative time
  const formatRelativeTime = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now - then;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Prepare chart data
  const prepareTimelineData = () => {
    if (!stats?.timeline) return [];
    return stats.timeline.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      activities: parseInt(item.activity_count),
      users: parseInt(item.unique_users)
    }));
  };

  const prepareFeatureData = () => {
    if (!stats?.featureUsage) return [];
    return stats.featureUsage.slice(0, 8).map(feature => ({
      name: feature.feature_name.replace('_', ' '),
      usage: parseInt(feature.usage_count),
      users: parseInt(feature.unique_users)
    }));
  };

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-600">Loading activity data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={fetchActivityData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-500" />
                User Activity Monitor
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Track user engagement and feature adoption
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value={1}>Last 24 Hours</option>
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 90 Days</option>
              </select>
              
              <button
                onClick={fetchActivityData}
                disabled={refreshing}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active Users Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Daily Active Users</h3>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats?.activeUsers?.dau || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Unique users today</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Weekly Active Users</h3>
              <Calendar className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats?.activeUsers?.wau || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Unique users this week</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Monthly Active Users</h3>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats?.activeUsers?.mau || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Unique users this month</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Avg Session Duration</h3>
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {formatDuration(stats?.avgSessionDuration || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Average time per session</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Activity Timeline */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
            {prepareTimelineData().length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={prepareTimelineData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="activities" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="Total Activities"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="users" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Unique Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No activity data available</p>
            )}
          </div>

          {/* Feature Usage */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Usage</h3>
            {prepareFeatureData().length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RechartsBarChart data={prepareFeatureData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="usage" fill="#8B5CF6" name="Total Usage" />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No feature usage data</p>
            )}
          </div>
        </div>

        {/* Top Users and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Active Users */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart className="w-5 h-5 text-blue-500" />
              Top Active Users
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {topUsers.length > 0 ? (
                topUsers.map((user, idx) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600">{idx + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-700">
                        {user.activity_count} actions
                      </p>
                      <p className="text-xs text-gray-500">
                        {user.active_days} active days
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No user activity data</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MousePointer className="w-5 h-5 text-green-500" />
              Recent Activity
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-start justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">
                            {activity.first_name} {activity.last_name}
                          </span>
                          <span className="text-gray-600 ml-2">
                            {activity.action_type.replace(/_/g, ' ')}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.feature_name} • {activity.page_path}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatRelativeTime(activity.created_at)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserActivityPage;