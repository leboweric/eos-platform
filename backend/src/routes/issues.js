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
  archiveClosedIssues
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

// Attachment routes
router.route('/:issueId/attachments')
  .get(getAttachments)
  .post(upload.single('file'), uploadAttachment);

router.route('/:issueId/attachments/:attachmentId')
  .get(downloadAttachment)
  .delete(deleteAttachment);

export default router;
