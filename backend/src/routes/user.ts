import { Router } from 'express';
import { getPublicProfile, updateProfile } from '../controllers/user';
import { asyncHandler } from '../middleware/error';
import { authenticate } from '../middleware/auth';

const router = Router();

router.put('/profile', authenticate, asyncHandler(updateProfile));
router.get('/:username', asyncHandler(getPublicProfile));

export default router;
