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
  getUserVotes
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

// Voting routes
router.route('/votes')
  .get(getUserVotes);

router.route('/:issueId/vote')
  .post(voteForIssue)
  .delete(unvoteForIssue);

// Attachment routes
router.route('/:issueId/attachments')
  .get(getAttachments)
  .post(upload.single('file'), uploadAttachment);

router.route('/:issueId/attachments/:attachmentId')
  .get(downloadAttachment)
  .delete(deleteAttachment);

export default router;
