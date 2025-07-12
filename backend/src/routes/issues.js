import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getIssues,
  createIssue,
  updateIssue,
  deleteIssue,
  updateIssuePriority
} from '../controllers/issuesController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getIssues)
  .post(createIssue);

router.route('/priorities')
  .put(updateIssuePriority);

router.route('/:issueId')
  .put(updateIssue)
  .delete(deleteIssue);

export default router;
