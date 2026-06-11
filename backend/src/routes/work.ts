import { Router } from 'express';
import { getWorks, getWorkDetail, toggleInteraction, getMyFavorites, adminGetWorks, adminCreateWork, adminUpdateWork, adminDeleteWork, adminGetPendingReviews, adminApproveWork, adminRejectWork, adminGetRecycleBin, adminRestoreWork, adminPermanentDeleteWork, adminBatchRestoreWorks, adminBatchPermanentDeleteWorks } from '../controllers/work';
import { authenticate, requireAdmin } from '../middleware/auth';
import { logOperation } from '../middleware/logger';
import { asyncHandler } from '../middleware/error';

const router = Router();

// Public
router.get('/', asyncHandler(getWorks));
router.get('/:id', asyncHandler(getWorkDetail));

// User
router.post('/:id/interact', authenticate, asyncHandler(toggleInteraction));
router.get('/user/favorites', authenticate, asyncHandler(getMyFavorites));

// Admin
router.get('/admin/all', authenticate, requireAdmin, asyncHandler(adminGetWorks));
router.get('/admin/pending-reviews', authenticate, requireAdmin, asyncHandler(adminGetPendingReviews));
router.post('/admin', authenticate, requireAdmin, logOperation('CREATE_WORK'), asyncHandler(adminCreateWork));
router.put('/admin/:id', authenticate, requireAdmin, logOperation('UPDATE_WORK'), asyncHandler(adminUpdateWork));
router.post('/admin/:id/approve', authenticate, requireAdmin, logOperation('APPROVE_WORK'), asyncHandler(adminApproveWork));
router.post('/admin/:id/reject', authenticate, requireAdmin, logOperation('REJECT_WORK'), asyncHandler(adminRejectWork));
router.delete('/admin/:id', authenticate, requireAdmin, logOperation('SOFT_DELETE_WORK'), asyncHandler(adminDeleteWork));

// Admin - Recycle Bin
router.get('/admin/recycle-bin', authenticate, requireAdmin, asyncHandler(adminGetRecycleBin));
router.post('/admin/recycle-bin/:id/restore', authenticate, requireAdmin, logOperation('RESTORE_WORK'), asyncHandler(adminRestoreWork));
router.delete('/admin/recycle-bin/:id', authenticate, requireAdmin, logOperation('PERMANENT_DELETE_WORK'), asyncHandler(adminPermanentDeleteWork));
router.post('/admin/recycle-bin/batch-restore', authenticate, requireAdmin, logOperation('BATCH_RESTORE_WORKS'), asyncHandler(adminBatchRestoreWorks));
router.post('/admin/recycle-bin/batch-permanent-delete', authenticate, requireAdmin, logOperation('BATCH_PERMANENT_DELETE_WORKS'), asyncHandler(adminBatchPermanentDeleteWorks));

export default router;
