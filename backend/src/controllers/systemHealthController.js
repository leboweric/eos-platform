import observabilityService from '../services/observabilityService.js';
import database from '../config/database.js';

// Get comprehensive system health metrics
export const getSystemHealth = async (req, res) => {
  try {
    // Update WebSocket metrics before getting health
    if (global.io) {
      const sockets = await global.io.fetchSockets();
      const totalConnections = sockets.length;
      
      // Count connections by organization
      const connectionsByOrg = new Map();
      let activeMeetings = 0;
      
      for (const socket of sockets) {
        const orgId = socket.data?.organizationId;
        if (orgId) {
          connectionsByOrg.set(orgId, (connectionsByOrg.get(orgId) || 0) + 1);
        }
        
        // Count active meetings (sockets in meeting rooms)
        const rooms = Array.from(socket.rooms);
        if (rooms.some(room => room.startsWith('meeting:'))) {
          activeMeetings++;
        }
      }
      
      observabilityService.updateWebSocketMetrics(
        totalConnections,
        connectionsByOrg,
        Math.floor(activeMeetings / 2) // Divide by 2 as each meeting has multiple participants
      );
    }
    
    // Get all health metrics (includes external service checks)
    const health = await observabilityService.getSystemHealth(database);
    
    // Add traffic light indicators
    const healthWithIndicators = {
      ...health,
      indicators: {
        overall: getHealthIndicator(health.status),
        api: getHealthIndicator(health.api.status),
        database: getHealthIndicator(health.database.status),
        websockets: getHealthIndicator(health.websockets.status),
        externalServices: getHealthIndicator(health.externalServices.status)
      }
    };
    
    res.json({
      success: true,
      data: healthWithIndicators
    });
  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system health',
      message: error.message
    });
  }
};

// Note: External service checks now handled inside observabilityService.getExternalServiceHealth()

// Helper: Get health indicator color
function getHealthIndicator(status) {
  switch (status) {
    case 'healthy':
      return 'green';
    case 'degraded':
      return 'yellow';
    case 'critical':
    case 'error':
    case 'down':
      return 'red';
    default:
      return 'gray';
  }
}

export default {
  getSystemHealth
};