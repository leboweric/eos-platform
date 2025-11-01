import DataIsolationService from '../services/dataIsolationService.js';

const isolationService = DataIsolationService.getInstance();

// Get isolation health overview
export const getIsolationHealth = async (req, res) => {
  try {
    const health = await isolationService.getIsolationHealth();
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('[DataIsolation] Error getting health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get isolation health',
      error: error.message
    });
  }
};

// Run comprehensive isolation checks
export const runIsolationChecks = async (req, res) => {
  try {
    const userId = req.user?.id;
    const results = await isolationService.runAllChecks(userId);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('[DataIsolation] Error running checks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run isolation checks',
      error: error.message
    });
  }
};

// Check for orphaned records
export const checkOrphanedRecords = async (req, res) => {
  try {
    const { table } = req.query;
    const results = await isolationService.checkOrphanedRecords(table);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('[DataIsolation] Error checking orphaned records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check orphaned records',
      error: error.message
    });
  }
};

// Check for missing org IDs
export const checkMissingOrgIds = async (req, res) => {
  try {
    const { table } = req.query;
    const results = await isolationService.checkMissingOrgId(table);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('[DataIsolation] Error checking missing org IDs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check missing organization IDs',
      error: error.message
    });
  }
};

// Get data distribution across organizations
export const getDataDistribution = async (req, res) => {
  try {
    const distribution = await isolationService.checkDataDistribution();
    
    res.json({
      success: true,
      data: distribution
    });
  } catch (error) {
    console.error('[DataIsolation] Error getting data distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get data distribution',
      error: error.message
    });
  }
};

// Get recent violations
export const getRecentViolations = async (req, res) => {
  try {
    const { limit = 50, ...filters } = req.query;
    const violations = await isolationService.getRecentViolations(
      parseInt(limit), 
      filters
    );
    
    res.json({
      success: true,
      data: violations
    });
  } catch (error) {
    console.error('[DataIsolation] Error getting recent violations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recent violations',
      error: error.message
    });
  }
};

// Get violations by table
export const getViolationsByTable = async (req, res) => {
  try {
    const violations = await isolationService.getViolationsByTable();
    
    res.json({
      success: true,
      data: violations
    });
  } catch (error) {
    console.error('[DataIsolation] Error getting violations by table:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get violations by table',
      error: error.message
    });
  }
};

// Get violations by organization
export const getViolationsByOrganization = async (req, res) => {
  try {
    const violations = await isolationService.getViolationsByOrganization();
    
    res.json({
      success: true,
      data: violations
    });
  } catch (error) {
    console.error('[DataIsolation] Error getting violations by organization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get violations by organization',
      error: error.message
    });
  }
};

// Get check history
export const getCheckHistory = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const history = await isolationService.getCheckHistory(parseInt(limit));
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('[DataIsolation] Error getting check history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get check history',
      error: error.message
    });
  }
};

// Resolve a violation
export const resolveViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user?.id;
    
    const resolved = await isolationService.resolveViolation(id, userId, notes);
    
    res.json({
      success: true,
      data: resolved
    });
  } catch (error) {
    console.error('[DataIsolation] Error resolving violation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve violation',
      error: error.message
    });
  }
};

// Get multi-tenant tables
export const getMultiTenantTables = async (req, res) => {
  try {
    const tables = await isolationService.getMultiTenantTables();
    
    res.json({
      success: true,
      data: tables
    });
  } catch (error) {
    console.error('[DataIsolation] Error getting multi-tenant tables:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get multi-tenant tables',
      error: error.message
    });
  }
};

export default {
  getIsolationHealth,
  runIsolationChecks,
  checkOrphanedRecords,
  checkMissingOrgIds,
  getDataDistribution,
  getRecentViolations,
  getViolationsByTable,
  getViolationsByOrganization,
  getCheckHistory,
  resolveViolation,
  getMultiTenantTables
};