const router = require('express').Router();
const exportController = require('../controllers/exportController');
const authMiddleware = require('../middleware/auth');

// Export organization data
router.get('/organizations/:orgId/export/backup', 
  authMiddleware,
  exportController.exportOrganizationData
);

module.exports = router;