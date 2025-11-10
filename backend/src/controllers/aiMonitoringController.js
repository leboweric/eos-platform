import { getClient } from '../config/database.js';

/**
 * Get AI transcription and summary health metrics
 */
export const getAIHealthMetrics = async (req, res) => {
  const client = await getClient();
  
  try {
    const { orgId } = req.params;
    
    // Get overall statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_transcripts,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'processing_ai') as processing_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '24 hours') as completed_24h,
        COUNT(*) FILTER (WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '24 hours') as failed_24h,
        COUNT(*) FILTER (WHERE status = 'processing_ai' AND created_at < NOW() - INTERVAL '1 hour') as stuck_count,
        AVG(EXTRACT(EPOCH FROM (processing_completed_at - created_at))) FILTER (WHERE status = 'completed' AND processing_completed_at IS NOT NULL) as avg_processing_seconds
      FROM meeting_transcripts
      WHERE organization_id = $1
        AND deleted_at IS NULL
        AND created_at >= NOW() - INTERVAL '30 days'
    `;
    
    const statsResult = await client.query(statsQuery, [orgId]);
    const stats = statsResult.rows[0];
    
    // Calculate success rate (last 24 hours)
    const total24h = parseInt(stats.completed_24h) + parseInt(stats.failed_24h);
    const successRate = total24h > 0 
      ? ((parseInt(stats.completed_24h) / total24h) * 100).toFixed(1)
      : 0;
    
    // Get active transcriptions
    const activeQuery = `
      SELECT 
        mt.id,
        mt.created_at,
        mt.status,
        m.id as meeting_id,
        t.name as team_name,
        EXTRACT(EPOCH FROM (NOW() - mt.created_at)) as duration_seconds
      FROM meeting_transcripts mt
      JOIN meetings m ON mt.meeting_id = m.id
      JOIN teams t ON m.team_id = t.id
      WHERE mt.organization_id = $1
        AND mt.status IN ('processing_ai', 'processing')
        AND mt.deleted_at IS NULL
      ORDER BY mt.created_at DESC
      LIMIT 10
    `;
    
    const activeResult = await client.query(activeQuery, [orgId]);
    
    // Get recent completions
    const recentQuery = `
      SELECT 
        mt.id,
        mt.created_at,
        mt.processing_completed_at,
        mt.status,
        m.id as meeting_id,
        t.name as team_name,
        EXTRACT(EPOCH FROM (mt.processing_completed_at - mt.created_at)) as processing_seconds,
        (SELECT COUNT(*) FROM meeting_ai_summaries mas WHERE mas.transcript_id = mt.id) as has_summary
      FROM meeting_transcripts mt
      JOIN meetings m ON mt.meeting_id = m.id
      JOIN teams t ON m.team_id = t.id
      WHERE mt.organization_id = $1
        AND mt.status IN ('completed', 'failed')
        AND mt.deleted_at IS NULL
      ORDER BY mt.processing_completed_at DESC NULLS LAST
      LIMIT 10
    `;
    
    const recentResult = await client.query(recentQuery, [orgId]);
    
    // Get failure reasons
    const failureQuery = `
      SELECT 
        error_message,
        COUNT(*) as count
      FROM meeting_transcripts
      WHERE organization_id = $1
        AND status = 'failed'
        AND error_message IS NOT NULL
        AND deleted_at IS NULL
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY error_message
      ORDER BY count DESC
      LIMIT 10
    `;
    
    const failureResult = await client.query(failureQuery, [orgId]);
    
    // Get AI summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_summaries,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as summaries_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as summaries_7d
      FROM meeting_ai_summaries mas
      JOIN meeting_transcripts mt ON mas.transcript_id = mt.id
      WHERE mt.organization_id = $1
        AND mt.deleted_at IS NULL
    `;
    
    const summaryResult = await client.query(summaryQuery, [orgId]);
    
    // Get daily trends (last 7 days)
    const trendsQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        AVG(EXTRACT(EPOCH FROM (processing_completed_at - created_at))) FILTER (WHERE status = 'completed' AND processing_completed_at IS NOT NULL) as avg_processing_seconds
      FROM meeting_transcripts
      WHERE organization_id = $1
        AND deleted_at IS NULL
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    
    const trendsResult = await client.query(trendsQuery, [orgId]);
    
    res.json({
      success: true,
      data: {
        overview: {
          totalTranscripts: parseInt(stats.total_transcripts),
          completedCount: parseInt(stats.completed_count),
          processingCount: parseInt(stats.processing_count),
          failedCount: parseInt(stats.failed_count),
          completed24h: parseInt(stats.completed_24h),
          failed24h: parseInt(stats.failed_24h),
          stuckCount: parseInt(stats.stuck_count),
          avgProcessingSeconds: parseFloat(stats.avg_processing_seconds) || 0,
          successRate: parseFloat(successRate)
        },
        summaries: {
          total: parseInt(summaryResult.rows[0].total_summaries),
          last24h: parseInt(summaryResult.rows[0].summaries_24h),
          last7d: parseInt(summaryResult.rows[0].summaries_7d)
        },
        activeTranscriptions: activeResult.rows.map(row => ({
          id: row.id,
          meetingId: row.meeting_id,
          teamName: row.team_name,
          status: row.status,
          createdAt: row.created_at,
          durationSeconds: parseInt(row.duration_seconds)
        })),
        recentCompletions: recentResult.rows.map(row => ({
          id: row.id,
          meetingId: row.meeting_id,
          teamName: row.team_name,
          status: row.status,
          createdAt: row.created_at,
          completedAt: row.processing_completed_at,
          processingSeconds: parseInt(row.processing_seconds) || 0,
          hasSummary: parseInt(row.has_summary) > 0
        })),
        failureReasons: failureResult.rows.map(row => ({
          message: row.error_message,
          count: parseInt(row.count)
        })),
        trends: trendsResult.rows.map(row => ({
          date: row.date,
          total: parseInt(row.total),
          completed: parseInt(row.completed),
          failed: parseInt(row.failed),
          avgProcessingSeconds: parseFloat(row.avg_processing_seconds) || 0
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching AI health metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI health metrics'
    });
  } finally {
    client.release();
  }
};

/**
 * Manually trigger cleanup of stuck transcripts
 */
export const cleanupStuckTranscripts = async (req, res) => {
  const client = await getClient();
  
  try {
    const { orgId } = req.params;
    
    const result = await client.query(`
      UPDATE meeting_transcripts
      SET 
        status = 'failed',
        error_message = 'Transcript stuck in processing_ai for more than 2 hours - marked as failed by manual cleanup',
        updated_at = NOW()
      WHERE organization_id = $1
        AND status = 'processing_ai'
        AND created_at < NOW() - INTERVAL '2 hours'
        AND deleted_at IS NULL
      RETURNING id, meeting_id, created_at
    `, [orgId]);
    
    res.json({
      success: true,
      data: {
        cleanedCount: result.rows.length,
        cleanedTranscripts: result.rows
      }
    });
    
  } catch (error) {
    console.error('Error cleaning up stuck transcripts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup stuck transcripts'
    });
  } finally {
    client.release();
  }
};

export default {
  getAIHealthMetrics,
  cleanupStuckTranscripts
};
