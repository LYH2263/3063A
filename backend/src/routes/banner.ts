import { Router } from 'express';
import {
    getPublicBanners,
    adminGetAllBanners,
    adminCreateBanner,
    adminUpdateBanner,
    adminDeleteBanner,
    adminReorderBanners
} from '../controllers/banner';
import { authenticate, requireAdmin } from '../middleware/auth';
import { logOperation } from '../middleware/logger';
import { asyncHandler } from '../middleware/error';

const router = Router();

router.get('/', asyncHandler(getPublicBanners));

router.get('/admin/all', authenticate, requireAdmin, asyncHandler(adminGetAllBanners));
router.post('/admin', authenticate, requireAdmin, logOperation('CREATE_BANNER'), asyncHandler(adminCreateBanner));
router.put('/admin/reorder', authenticate, requireAdmin, logOperation('REORDER_BANNERS'), asyncHandler(adminReorderBanners));
router.put('/admin/:id', authenticate, requireAdmin, logOperation('UPDATE_BANNER'), asyncHandler(adminUpdateBanner));
router.delete('/admin/:id', authenticate, requireAdmin, logOperation('DELETE_BANNER'), asyncHandler(adminDeleteBanner));

export default router;
