import exportService from '../services/exportService.js';

const exportController = {
  async exportOrganizationData(req, res) {
    try {
      const { orgId } = req.params;
      const userId = req.user.id;
      
      // Check if user has permission to export this organization's data
      if (req.user.organization_id !== orgId && req.user.role !== 'admin') {
        return res.status(403).json({ 
          error: 'You do not have permission to export this organization\'s data' 
        });
      }
      
      // Generate the export
      const { buffer, filename } = await exportService.exportOrganizationData(orgId, userId);
      
      // Set response headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      
      // Send the file
      res.send(buffer);
    } catch (error) {
      console.error('Export controller error:', error);
      res.status(500).json({ 
        error: 'Failed to export organization data',
        details: error.message 
      });
    }
  }
};

export default exportController;