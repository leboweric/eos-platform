import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getIssues,
  createIssue,
  updateIssue,
  deleteIssue,
  updateIssuePriority,
  uploadAttachment,
  getAttachments,
  downloadAttachment,
  deleteAttachment,
  upload,
  archiveIssue,
  archiveClosedIssues,
  unarchiveIssue,
  voteForIssue,
  unvoteForIssue,
  getUserVotes,
  moveIssueToTeam,
  getIssueUpdates,
  addIssueUpdate,
  deleteIssueUpdate
} from '../controllers/issuesController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

router.route('/')
  .get(getIssues)
  .post(createIssue);

router.route('/priorities')
  .put(updateIssuePriority);

router.route('/archive-closed')
  .post(archiveClosedIssues);

router.route('/:issueId')
  .put(updateIssue)
  .delete(deleteIssue);

router.route('/:issueId/archive')
  .post(archiveIssue);

router.route('/:issueId/unarchive')
  .post(unarchiveIssue);

router.route('/:issueId/move-team')
  .post(moveIssueToTeam);

// Voting routes
router.route('/votes')
  .get(getUserVotes);

router.route('/:issueId/vote')
  .post(voteForIssue)
  .delete(unvoteForIssue);

// Update routes
router.route('/:issueId/updates')
  .get(getIssueUpdates)
  .post(addIssueUpdate);

router.route('/:issueId/updates/:updateId')
  .delete(deleteIssueUpdate);

// Attachment routes
router.route('/:issueId/attachments')
  .get(getAttachments)
  .post(upload.single('file'), uploadAttachment);

router.route('/:issueId/attachments/:attachmentId')
  .get(downloadAttachment)
  .delete(deleteAttachment);

export default router;
