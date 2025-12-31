import express from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.js';
import { 
  downloadTemplate, 
  previewImport, 
  bulkImport 
} from '../controllers/bulkImportController.js';
import { getActiveMeetings } from '../controllers/adminController.js';
import { getOnlineUsers, updateHeartbeat, cleanupExpiredSessions } from '../controllers/onlineUsersController.js';
import systemHealthController from '../controllers/systemHealthController.js';
import failedOperationsController from '../controllers/failedOperationsController.js';
import userActivityController from '../controllers/userActivityController.js';
import dataIsolationController from '../controllers/dataIsolationController.js';
import meetingHealthController from '../controllers/meetingHealthController.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel files only
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'), false);
    }
  }
});

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// System health monitoring - also allow 'owner' role
router.get('/system-health', systemHealthController.getSystemHealth);

// Failed operations monitoring
router.get('/failed-operations', failedOperationsController.getFailedOperations);
router.get('/failed-operations/statistics', failedOperationsController.getFailureStatistics);
router.get('/failed-operations/critical', failedOperationsController.getCriticalFailures);
router.get('/failed-operations/recent', failedOperationsController.getRecentFailures);
router.post('/failed-operations/:id/resolve', failedOperationsController.resolveFailure);
router.post('/failed-operations/bulk-resolve', failedOperationsController.bulkResolveFailures);
router.get('/failed-operations/daily-summary', failedOperationsController.getDailySummary);

// User Activity monitoring
router.get('/activity/stats', userActivityController.getActivityStats);
router.get('/activity/admin-stats', userActivityController.getAdminActivityStats);
router.get('/activity/meetings', userActivityController.getMeetingStats);
router.get('/activity/top-users', userActivityController.getTopActiveUsers);
router.get('/activity/recent', userActivityController.getRecentActivity);
router.get('/activity/user/:userId', userActivityController.getUserActivity);
router.post('/activity/track', userActivityController.trackActivity);

// Data Isolation monitoring
router.get('/isolation/health', dataIsolationController.getIsolationHealth);
router.post('/isolation/check', dataIsolationController.runIsolationChecks);
router.get('/isolation/check/orphaned', dataIsolationController.checkOrphanedRecords);
router.get('/isolation/check/missing-org', dataIsolationController.checkMissingOrgIds);
router.get('/isolation/distribution', dataIsolationController.getDataDistribution);
router.get('/isolation/violations', dataIsolationController.getRecentViolations);
router.get('/isolation/violations/by-table', dataIsolationController.getViolationsByTable);
router.get('/isolation/violations/by-org', dataIsolationController.getViolationsByOrganization);
router.get('/isolation/history', dataIsolationController.getCheckHistory);
router.post('/isolation/violations/:id/resolve', dataIsolationController.resolveViolation);
router.get('/isolation/tables', dataIsolationController.getMultiTenantTables);

// Active meetings dashboard
router.get('/active-meetings', getActiveMeetings);

// Meeting health monitoring
router.get('/meeting-health', meetingHealthController.getMeetingHealth);
router.get('/meeting-health/errors', meetingHealthController.getRecentMeetingErrors);
router.post('/meeting-health/errors/:id/acknowledge', meetingHealthController.acknowledgeMeetingError);
router.get('/meeting-health/stuck-sessions', meetingHealthController.getStuckSessions);
router.post('/meeting-health/sessions/:id/force-end', meetingHealthController.forceEndSession);
router.post('/meeting-health/cleanup-all', meetingHealthController.cleanupAllStuckMeetings);

// Online users monitoring
router.get('/users/online', getOnlineUsers);
router.post('/users/heartbeat', updateHeartbeat);
router.post('/users/cleanup-sessions', cleanupExpiredSessions);

// Bulk user import routes
router.get('/users/bulk-import/template', downloadTemplate);
router.post('/users/bulk-import/preview', upload.single('file'), previewImport);
router.post('/users/bulk-import', upload.single('file'), bulkImport);

export default router;