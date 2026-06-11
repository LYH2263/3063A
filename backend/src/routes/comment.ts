import { Router } from 'express';
import {
    getWorkComments,
    getWorkCommentCount,
    getBatchCommentCounts,
    createComment,
    deleteComment,
    likeComment,
    adminGetAllComments,
    adminUpdateCommentStatus,
    adminBatchApprove,
} from '../controllers/comment';
import { authenticate, requireAdmin } from '../middleware/auth';
import { logOperation } from '../middleware/logger';
import { asyncHandler } from '../middleware/error';

const router = Router();

router.get('/work/:workId', asyncHandler(getWorkComments));
router.get('/work/:workId/count', asyncHandler(getWorkCommentCount));
router.get('/batch-counts', asyncHandler(getBatchCommentCounts));

router.post('/work/:workId', authenticate, asyncHandler(createComment));
router.delete('/:id', authenticate, asyncHandler(deleteComment));
router.post('/:id/like', authenticate, asyncHandler(likeComment));

router.get('/admin/all', authenticate, requireAdmin, asyncHandler(adminGetAllComments));
router.put('/admin/:id', authenticate, requireAdmin, logOperation('UPDATE_COMMENT'), asyncHandler(adminUpdateCommentStatus));
router.post('/admin/batch-approve', authenticate, requireAdmin, logOperation('BATCH_APPROVE_COMMENTS'), asyncHandler(adminBatchApprove));
router.delete('/admin/:id', authenticate, requireAdmin, logOperation('DELETE_COMMENT'), asyncHandler(deleteComment));

export default router;
