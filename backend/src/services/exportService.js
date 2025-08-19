import XLSX from 'xlsx';
import pool from '../config/database.js';
import { format } from 'date-fns';

class ExportService {
  async exportOrganizationData(organizationId, userId) {
    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Get organization details
      const orgResult = await pool.query(
        'SELECT name, created_at FROM organizations WHERE id = $1',
        [organizationId]
      );
      
      if (orgResult.rows.length === 0) {
        throw new Error('Organization not found');
      }
      
      const organization = orgResult.rows[0];
      const exportDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
      
      // Add metadata sheet
      const metadata = [
        ['Export Information'],
        ['Organization', organization.name],
        ['Export Date', exportDate],
        ['Exported By', userId],
        [''],
        ['This file contains a complete backup of your EOS Platform data']
      ];
      const metadataWs = XLSX.utils.aoa_to_sheet(metadata);
      XLSX.utils.book_append_sheet(wb, metadataWs, 'Export Info');
      
      // 1. Export Quarterly Priorities (Rocks)
      await this.exportQuarterlyPriorities(wb, organizationId);
      
      // 2. Export Scorecard
      await this.exportScorecard(wb, organizationId);
      
      // 3. Export To-Dos
      await this.exportTodos(wb, organizationId);
      
      // 4. Export Issues
      await this.exportIssues(wb, organizationId);
      
      // 5. Export VTO/Business Blueprint
      await this.exportBusinessBlueprint(wb, organizationId);
      
      // 6. Export Accountability Chart
      await this.exportAccountabilityChart(wb, organizationId);
      
      // 7. Export Core Values
      await this.exportCoreValues(wb, organizationId);
      
      // Generate buffer
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      
      return {
        buffer,
        filename: `${organization.name.replace(/[^a-z0-9]/gi, '_')}_Backup_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
      };
    } catch (error) {
      console.error('Export service error:', error);
      throw error;
    }
  }
  
  async exportQuarterlyPriorities(wb, organizationId) {
    try {
      const result = await pool.query(`
        SELECT 
          qp.*,
          t.name as team_name,
          u.first_name || ' ' || u.last_name as owner_name
        FROM quarterly_priorities qp
        LEFT JOIN teams t ON qp.team_id = t.id
        LEFT JOIN users u ON qp.owner_id = u.id
        WHERE qp.organization_id = $1
        ORDER BY qp.created_at DESC
      `, [organizationId]);
      
      if (result.rows.length > 0) {
        const data = result.rows.map(row => ({
          'Priority': row.title || row.name || '',
          'Description': row.description || '',
          'Team/Department': row.team_name || 'Company',
          'Owner': row.owner_name || '',
          'Status': row.status || 'Not Started',
          'Completion %': row.completion_percentage || 0,
          'On Track': row.on_track ? 'Yes' : 'No',
          'Quarter': row.quarter || '',
          'Year': row.year || '',
          'Is Company Priority': row.is_company_priority ? 'Yes' : 'No',
          'Created': format(new Date(row.created_at), 'yyyy-MM-dd')
        }));
        
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Quarterly Priorities');
      }
    } catch (error) {
      console.error('Error exporting quarterly priorities:', error);
    }
  }
  
  async exportScorecard(wb, organizationId) {
    try {
      // Export metrics
      const metricsResult = await pool.query(`
        SELECT 
          sm.*,
          t.name as team_name
        FROM scorecard_metrics sm
        LEFT JOIN teams t ON sm.team_id = t.id
        WHERE sm.organization_id = $1
        ORDER BY sm.display_order, sm.name
      `, [organizationId]);
      
      if (metricsResult.rows.length > 0) {
        // Create metrics sheet
        const metricsData = metricsResult.rows.map(row => ({
          'Metric Name': row.name,
          'Team/Department': row.team_name || 'Company',
          'Goal': row.goal || '',
          'Owner': row.owner || '',
          'Type': row.type || 'weekly',
          'Value Type': row.value_type || 'number',
          'Comparison': row.comparison_operator || 'greater_equal',
          'Description': row.description || ''
        }));
        
        const metricsWs = XLSX.utils.json_to_sheet(metricsData);
        XLSX.utils.book_append_sheet(wb, metricsWs, 'Scorecard Metrics');
        
        // Export scores
        const scoresResult = await pool.query(`
          SELECT 
            ss.*,
            sm.name as metric_name
          FROM scorecard_scores ss
          JOIN scorecard_metrics sm ON ss.metric_id = sm.id
          WHERE sm.organization_id = $1
          ORDER BY ss.week_date DESC, sm.name
        `, [organizationId]);
        
        if (scoresResult.rows.length > 0) {
          const scoresData = scoresResult.rows.map(row => ({
            'Metric': row.metric_name,
            'Date': format(new Date(row.week_date), 'yyyy-MM-dd'),
            'Value': row.value || '',
            'Note': row.note || ''
          }));
          
          const scoresWs = XLSX.utils.json_to_sheet(scoresData);
          XLSX.utils.book_append_sheet(wb, scoresWs, 'Scorecard Scores');
        }
      }
    } catch (error) {
      console.error('Error exporting scorecard:', error);
    }
  }
  
  async exportTodos(wb, organizationId) {
    try {
      const result = await pool.query(`
        SELECT 
          t.*,
          u.first_name || ' ' || u.last_name as assigned_to_name,
          cr.first_name || ' ' || cr.last_name as created_by_name,
          tm.name as team_name
        FROM todos t
        LEFT JOIN users u ON t.assigned_to_id = u.id
        LEFT JOIN users cr ON t.created_by = cr.id
        LEFT JOIN teams tm ON t.team_id = tm.id
        WHERE t.organization_id = $1
        ORDER BY t.created_at DESC
      `, [organizationId]);
      
      if (result.rows.length > 0) {
        const data = result.rows.map(row => ({
          'Title': row.title,
          'Description': row.description || '',
          'Team/Department': row.team_name || 'Company',
          'Assigned To': row.assigned_to_name || '',
          'Created By': row.created_by_name || '',
          'Status': row.completed ? 'Completed' : 'Pending',
          'Due Date': row.due_date ? format(new Date(row.due_date), 'yyyy-MM-dd') : '',
          'Created': format(new Date(row.created_at), 'yyyy-MM-dd'),
          'Completed Date': row.completed_at ? format(new Date(row.completed_at), 'yyyy-MM-dd') : ''
        }));
        
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'To-Dos');
      }
    } catch (error) {
      console.error('Error exporting todos:', error);
    }
  }
  
  async exportIssues(wb, organizationId) {
    try {
      const result = await pool.query(`
        SELECT 
          i.*,
          u.first_name || ' ' || u.last_name as created_by_name,
          t.name as team_name
        FROM issues i
        LEFT JOIN users u ON i.created_by = u.id
        LEFT JOIN teams t ON i.team_id = t.id
        WHERE i.organization_id = $1
        ORDER BY i.created_at DESC
      `, [organizationId]);
      
      if (result.rows.length > 0) {
        const data = result.rows.map(row => ({
          'Title': row.title,
          'Description': row.description || '',
          'Team/Department': row.team_name || 'Company',
          'Timeline': row.timeline === 'long_term' ? 'Long Term' : 'Short Term',
          'Priority': row.priority || 'Medium',
          'Status': row.status || 'Open',
          'Created By': row.created_by_name || '',
          'Created': format(new Date(row.created_at), 'yyyy-MM-dd'),
          'Resolved': row.resolved_at ? format(new Date(row.resolved_at), 'yyyy-MM-dd') : ''
        }));
        
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Issues');
      }
    } catch (error) {
      console.error('Error exporting issues:', error);
    }
  }
  
  async exportBusinessBlueprint(wb, organizationId) {
    try {
      const result = await pool.query(`
        SELECT * FROM business_blueprints 
        WHERE organization_id = $1 AND team_id IS NULL
        LIMIT 1
      `, [organizationId]);
      
      if (result.rows.length > 0) {
        const vto = result.rows[0];
        const vtoData = [];
        
        // Get Core Focus
        const coreFocusResult = await pool.query(
          'SELECT * FROM core_focus WHERE vto_id = $1 LIMIT 1',
          [vto.id]
        );
        
        if (coreFocusResult.rows.length > 0) {
          const coreFocus = coreFocusResult.rows[0];
          vtoData.push(['CORE FOCUS']);
          vtoData.push(['Purpose', coreFocus.purpose || '']);
          vtoData.push(['Niche', coreFocus.niche || '']);
          vtoData.push(['']);
        }
        
        // 10-Year Target
        const tenYearResult = await pool.query(
          'SELECT * FROM ten_year_targets WHERE vto_id = $1 LIMIT 1',
          [vto.id]
        );
        
        if (tenYearResult.rows.length > 0) {
          const tenYear = tenYearResult.rows[0];
          vtoData.push(['10-YEAR TARGET']);
          vtoData.push(['Target', tenYear.target_description || '']);
          vtoData.push(['Target Year', tenYear.target_year || '']);
          vtoData.push(['']);
        }
        
        // Marketing Strategy
        const marketingResult = await pool.query(
          'SELECT * FROM marketing_strategies WHERE vto_id = $1 LIMIT 1',
          [vto.id]
        );
        
        if (marketingResult.rows.length > 0) {
          const marketing = marketingResult.rows[0];
          vtoData.push(['MARKETING STRATEGY']);
          vtoData.push(['Target Market', marketing.target_market || '']);
          vtoData.push(['Three Uniques', marketing.three_uniques || '']);
          vtoData.push(['Proven Process', marketing.proven_process || '']);
          vtoData.push(['Guarantee', marketing.guarantee || '']);
          vtoData.push(['']);
        }
        
        // 3-Year Picture
        const threeYearResult = await pool.query(
          'SELECT * FROM three_year_pictures WHERE vto_id = $1 LIMIT 1',
          [vto.id]
        );
        
        if (threeYearResult.rows.length > 0) {
          const threeYear = threeYearResult.rows[0];
          vtoData.push(['3-YEAR PICTURE']);
          vtoData.push(['Revenue Target', threeYear.revenue || '']);
          vtoData.push(['Profit Target', threeYear.profit || '']);
          vtoData.push(['Future Date', threeYear.future_date ? format(new Date(threeYear.future_date), 'yyyy-MM-dd') : '']);
          vtoData.push(['']);
        }
        
        // 1-Year Plan
        const oneYearResult = await pool.query(
          'SELECT * FROM one_year_plans WHERE vto_id = $1 LIMIT 1',
          [vto.id]
        );
        
        if (oneYearResult.rows.length > 0) {
          const oneYear = oneYearResult.rows[0];
          vtoData.push(['1-YEAR PLAN']);
          vtoData.push(['Revenue Target', oneYear.revenue || '']);
          vtoData.push(['Profit Target', oneYear.profit || '']);
          
          // Get 1-year goals
          const goalsResult = await pool.query(
            'SELECT * FROM one_year_goals WHERE one_year_plan_id = $1 ORDER BY sort_order',
            [oneYear.id]
          );
          
          if (goalsResult.rows.length > 0) {
            vtoData.push(['Goals:']);
            goalsResult.rows.forEach((goal, index) => {
              vtoData.push([`  ${index + 1}.`, goal.goal_text || '']);
            });
          }
          vtoData.push(['']);
        }
        
        const ws = XLSX.utils.aoa_to_sheet(vtoData);
        XLSX.utils.book_append_sheet(wb, ws, 'Business Blueprint');
      }
    } catch (error) {
      console.error('Error exporting business blueprint:', error);
    }
  }
  
  async exportAccountabilityChart(wb, organizationId) {
    try {
      const result = await pool.query(`
        SELECT 
          ac.*,
          u.first_name || ' ' || u.last_name as person_name,
          t.name as team_name
        FROM accountability_chart ac
        LEFT JOIN users u ON ac.user_id = u.id
        LEFT JOIN teams t ON ac.team_id = t.id
        WHERE ac.organization_id = $1
        ORDER BY ac.parent_seat_id NULLS FIRST, ac.display_order
      `, [organizationId]);
      
      if (result.rows.length > 0) {
        const data = result.rows.map(row => ({
          'Role/Seat': row.title,
          'Person': row.person_name || 'Vacant',
          'Team/Department': row.team_name || 'Company',
          'Reports To': row.parent_seat_id || 'Top Level',
          'Responsibilities': Array.isArray(row.responsibilities) ? row.responsibilities.join('; ') : ''
        }));
        
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Accountability Chart');
      }
    } catch (error) {
      console.error('Error exporting accountability chart:', error);
    }
  }
  
  async exportCoreValues(wb, organizationId) {
    try {
      // Get the VTO ID first
      const vtoResult = await pool.query(`
        SELECT id FROM business_blueprints 
        WHERE organization_id = $1 AND team_id IS NULL
        LIMIT 1
      `, [organizationId]);
      
      if (vtoResult.rows.length > 0) {
        const vtoId = vtoResult.rows[0].id;
        
        const result = await pool.query(`
          SELECT * FROM core_values 
          WHERE vto_id = $1
          ORDER BY display_order, value
        `, [vtoId]);
        
        if (result.rows.length > 0) {
          const data = result.rows.map(row => ({
            'Core Value': row.value,
            'Description': row.description || ''
          }));
          
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, 'Core Values');
        }
      }
    } catch (error) {
      console.error('Error exporting core values:', error);
    }
  }
}

export default new ExportService();