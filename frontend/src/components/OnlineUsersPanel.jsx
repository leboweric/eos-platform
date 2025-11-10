import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, Circle, Clock } from 'lucide-react';

const OnlineUsersPanel = () => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchOnlineUsers();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchOnlineUsers();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchOnlineUsers = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/users/online`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setOnlineUsers(data.users || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching online users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes) => {
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${Math.floor(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = Math.floor(minutes % 60);
    return `${hours}h ${remainingMins}m`;
  };

  const formatLastActivity = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Active now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const hours = Math.floor(diffMins / 60);
    return `${hours}h ago`;
  };

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600">Loading online users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Currently Online
              </h2>
              <p className="text-sm text-gray-600">
                {onlineUsers.length} {onlineUsers.length === 1 ? 'user' : 'users'} active
              </p>
            </div>
          </div>
          <button
            onClick={fetchOnlineUsers}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-6 border-b border-red-200 bg-red-50">
          <p className="text-sm text-red-600">Error: {error}</p>
        </div>
      )}

      {/* Users List */}
      <div className="p-6">
        {onlineUsers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No users currently online</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {onlineUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-start gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {/* Online Indicator */}
                <div className="flex-shrink-0 mt-1">
                  <Circle className="w-3 h-3 fill-green-500 text-green-500 animate-pulse" />
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {user.name}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(user.session_duration_minutes)}
                      </div>
                    </div>
                  </div>

                  {/* Organization & Team */}
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {user.organization_name}
                    </span>
                    {user.team_name && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                        {user.team_name}
                      </span>
                    )}
                    {user.role && (
                      <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded capitalize">
                        {user.role}
                      </span>
                    )}
                  </div>

                  {/* Last Activity */}
                  <div className="mt-1 text-xs text-gray-500">
                    {formatLastActivity(user.last_activity_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
        <p className="text-xs text-gray-500 text-center">
          Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refreshes every 30 seconds
        </p>
      </div>
    </div>
  );
};

export default OnlineUsersPanel;
