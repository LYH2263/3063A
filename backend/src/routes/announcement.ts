import { Router } from 'express';
import {
    getActiveAnnouncement,
    adminGetAllAnnouncements,
    adminCreateAnnouncement,
    adminUpdateAnnouncement,
    adminDeleteAnnouncement
} from '../controllers/announcement';
import { authenticate, requireAdmin } from '../middleware/auth';
import { logOperation } from '../middleware/logger';
import { asyncHandler } from '../middleware/error';

const router = Router();

router.get('/active', asyncHandler(getActiveAnnouncement));

router.get('/admin/all', authenticate, requireAdmin, asyncHandler(adminGetAllAnnouncements));
router.post('/admin', authenticate, requireAdmin, logOperation('CREATE_ANNOUNCEMENT'), asyncHandler(adminCreateAnnouncement));
router.put('/admin/:id', authenticate, requireAdmin, logOperation('UPDATE_ANNOUNCEMENT'), asyncHandler(adminUpdateAnnouncement));
router.delete('/admin/:id', authenticate, requireAdmin, logOperation('DELETE_ANNOUNCEMENT'), asyncHandler(adminDeleteAnnouncement));

export default router;
