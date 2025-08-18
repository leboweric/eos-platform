const express = require('express');
const router = express.Router();
const terminologyController = require('../controllers/terminologyController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get terminology presets (templates)
router.get('/presets', terminologyController.getTerminologyPresets);

// Get terminology for an organization
router.get('/organizations/:orgId', terminologyController.getTerminology);

// Update terminology for an organization
router.put('/organizations/:orgId', terminologyController.updateTerminology);

// Apply a preset to an organization
router.post('/organizations/:orgId/apply-preset', terminologyController.applyTerminologyPreset);

// Reset terminology to defaults
router.post('/organizations/:orgId/reset', terminologyController.resetTerminology);

module.exports = router;