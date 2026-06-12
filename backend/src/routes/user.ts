import { Router } from 'express';
import { getPublicProfile, updateProfile, followUser, unfollowUser, getFollowing, getFollowers, getFollowCounts, checkIsFollowing, getUserFollowing, getUserFollowers } from '../controllers/user';
import { asyncHandler } from '../middleware/error';
import { authenticate } from '../middleware/auth';

const router = Router();

router.put('/profile', authenticate, asyncHandler(updateProfile));

router.post('/follow/:followingId', authenticate, asyncHandler(followUser));
router.delete('/follow/:followingId', authenticate, asyncHandler(unfollowUser));
router.get('/following', authenticate, asyncHandler(getFollowing));
router.get('/followers', authenticate, asyncHandler(getFollowers));
router.get('/:userId/follow-counts', authenticate, asyncHandler(getFollowCounts));
router.get('/is-following/:followingId', authenticate, asyncHandler(checkIsFollowing));

router.get('/:userId/following', asyncHandler(getUserFollowing));
router.get('/:userId/followers', asyncHandler(getUserFollowers));

router.get('/:username', asyncHandler(getPublicProfile));

export default router;
