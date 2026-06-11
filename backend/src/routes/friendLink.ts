import { Router } from 'express';
import {
    getPublicFriendLinks,
    adminGetAllFriendLinks,
    adminCreateFriendLink,
    adminUpdateFriendLink,
    adminDeleteFriendLink,
    adminReorderFriendLinks
} from '../controllers/friendLink';
import { authenticate, requireAdmin } from '../middleware/auth';
import { logOperation } from '../middleware/logger';
import { asyncHandler } from '../middleware/error';

const router = Router();

router.get('/', asyncHandler(getPublicFriendLinks));

router.get('/admin/all', authenticate, requireAdmin, asyncHandler(adminGetAllFriendLinks));
router.post('/admin', authenticate, requireAdmin, logOperation('CREATE_FRIEND_LINK'), asyncHandler(adminCreateFriendLink));
router.put('/admin/:id', authenticate, requireAdmin, logOperation('UPDATE_FRIEND_LINK'), asyncHandler(adminUpdateFriendLink));
router.delete('/admin/:id', authenticate, requireAdmin, logOperation('DELETE_FRIEND_LINK'), asyncHandler(adminDeleteFriendLink));
router.put('/admin/reorder', authenticate, requireAdmin, logOperation('REORDER_FRIEND_LINKS'), asyncHandler(adminReorderFriendLinks));

export default router;
