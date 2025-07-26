import db from '../config/database.js';
import emailService from '../services/emailService.js';

// Conclude a meeting and send summary email
export const concludeMeeting = async (req, res) => {
  try {
    const { 
      meetingType,
      duration,
      rating,
      summary,
      attendees,
      metrics,
      todos,
      issues,
      notes
    } = req.body;

    const userId = req.user.id;
    const organizationId = req.user.organization_id || req.user.organizationId;

    console.log('Concluding meeting:', { meetingType, duration, rating, organizationId });

    // Get organization details
    const orgResult = await db.query(
      'SELECT name FROM organizations WHERE id = $1',
      [organizationId]
    );
    const organizationName = orgResult.rows[0]?.name || 'Your Organization';

    // Get user details
    const userResult = await db.query(
      'SELECT email, first_name, last_name FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];
    const userEmail = user?.email;
    const userName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();

    // Get emails of all attendees
    const attendeeEmails = [];
    if (attendees && attendees.length > 0) {
      const attendeeIds = attendees.map(a => a.id).filter(id => id);
      if (attendeeIds.length > 0) {
        const attendeesResult = await db.query(
          'SELECT email, first_name, last_name FROM users WHERE id = ANY($1::uuid[])',
          [attendeeIds]
        );
        attendeesResult.rows.forEach(row => {
          if (row.email) {
            attendeeEmails.push(row.email);
          }
        });
      }
    }

    // Always include the user who concluded the meeting
    if (userEmail && !attendeeEmails.includes(userEmail)) {
      attendeeEmails.push(userEmail);
    }

    console.log('Sending meeting summary to:', attendeeEmails);

    // Format the email data
    const meetingDate = new Date();
    const formattedDate = meetingDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Format duration
    const formatDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
      }
      return `${secs}s`;
    };

    // Format attendees
    const attendeeNames = attendees?.map(a => a.name || a.first_name || 'Unknown').filter(Boolean) || [];

    // Format todos
    const formattedNewTodos = (todos?.added || []).map(todo => ({
      title: todo.title || todo.todo || 'Untitled',
      assignee: todo.assigned_to_name || todo.assignee || 'Unassigned',
      dueDate: todo.due_date ? new Date(todo.due_date).toLocaleDateString() : 'No due date'
    }));

    const formattedCompletedItems = (todos?.completed || []).map(todo => 
      todo.title || todo.todo || 'Untitled'
    );

    // Format issues
    const formattedIssues = (issues || []).map(issue => 
      issue.title || issue.issue || 'Untitled issue'
    );

    const emailData = {
      meetingType: meetingType || 'Weekly Accountability Meeting',
      meetingDate: formattedDate,
      duration: formatDuration(duration || 0),
      rating: rating || 'Not rated',
      organizationName,
      concludedBy: userName,
      attendees: attendeeNames,
      summary: summary || '',
      metrics: metrics || {},
      completedItems: formattedCompletedItems,
      newTodos: formattedNewTodos,
      issues: formattedIssues,
      notes: notes || '',
      meetingLink: `${process.env.FRONTEND_URL || 'https://app.forty-2.com'}/meetings/weekly-accountability`
    };

    // Send email to all attendees
    if (attendeeEmails.length > 0) {
      try {
        await emailService.sendEmail({
          to: attendeeEmails,
          subject: `${meetingType || 'Meeting'} Summary - ${organizationName}`,
          template: 'meetingSummary',
          data: emailData
        });
        console.log('Meeting summary email sent successfully');
      } catch (emailError) {
        console.error('Failed to send meeting summary email:', emailError);
        // Don't fail the whole request if email fails
      }
    }

    res.json({
      success: true,
      message: 'Meeting concluded successfully',
      emailsSent: attendeeEmails.length
    });

  } catch (error) {
    console.error('Error concluding meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to conclude meeting',
      error: error.message
    });
  }
};