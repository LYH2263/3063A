import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { apiResponse } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const userSelectFields = {
    id: true,
    username: true,
    nickname: true,
    avatarUrl: true,
    bio: true,
    status: true,
    createdAt: true,
};

export const getPublicProfile = async (req: Request, res: Response) => {
    const { username } = req.params;
    const currentUserId = (req as AuthRequest).user?.userId;

    const user = await prisma.user.findUnique({
        where: { username },
        select: userSelectFields
    });

    if (!user) {
        return apiResponse(res, 404, '用户不存在');
    }

    if (user.status === 'BANNED') {
        return apiResponse(res, 403, '该用户已被封禁，主页不可访问');
    }

    const [likedInteractions, favoritedInteractions, followCounts, isFollowing] = await Promise.all([
        prisma.interaction.findMany({
            where: { userId: user.id, interactionType: 'LIKE', work: { status: 'PUBLISHED' } },
            include: {
                work: {
                    select: { id: true, title: true, category: true, mediaUrl: true, viewCount: true, createdAt: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.interaction.findMany({
            where: { userId: user.id, interactionType: 'FAVORITE', work: { status: 'PUBLISHED' } },
            include: {
                work: {
                    select: { id: true, title: true, category: true, mediaUrl: true, viewCount: true, createdAt: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        }),
        getFollowCountsInternal(user.id),
        currentUserId ? checkIsFollowingInternal(currentUserId, user.id) : false,
    ]);

    const likedWorks = likedInteractions.map(i => i.work);
    const favoritedWorks = favoritedInteractions.map(i => i.work);

    return apiResponse(res, 200, 'Success', {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        createdAt: user.createdAt,
        likedWorks,
        favoritedWorks,
        followingCount: followCounts.followingCount,
        followerCount: followCounts.followerCount,
        isFollowing,
    });
};

const getFollowCountsInternal = async (userId: number) => {
    const [followingCount, followerCount] = await Promise.all([
        prisma.follow.count({
            where: { followerId: userId, following: { status: 'ACTIVE' } }
        }),
        prisma.follow.count({
            where: { followingId: userId, follower: { status: 'ACTIVE' } }
        }),
    ]);
    return { followingCount, followerCount };
};

const checkIsFollowingInternal = async (followerId: number, followingId: number) => {
    if (followerId === followingId) return false;
    const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId, followingId } }
    });
    return !!follow;
};

export const followUser = async (req: AuthRequest, res: Response) => {
    const followerId = req.user!.userId;
    const { followingId } = req.params;

    const followingIdNum = parseInt(followingId);
    if (isNaN(followingIdNum)) {
        return apiResponse(res, 400, '无效的用户ID');
    }

    if (followerId === followingIdNum) {
        return apiResponse(res, 400, '不能关注自己');
    }

    const targetUser = await prisma.user.findUnique({
        where: { id: followingIdNum },
        select: { id: true, status: true }
    });

    if (!targetUser) {
        return apiResponse(res, 404, '用户不存在');
    }

    if (targetUser.status === 'BANNED') {
        return apiResponse(res, 403, '无法关注已被封禁的用户');
    }

    try {
        await prisma.follow.create({
            data: {
                followerId,
                followingId: followingIdNum,
            },
        });

        const counts = await getFollowCountsInternal(followingIdNum);
        return apiResponse(res, 200, '关注成功', {
            isFollowing: true,
            followerCount: counts.followerCount,
            followingCount: counts.followingCount,
        });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return apiResponse(res, 400, '已经关注过该用户');
        }
        throw error;
    }
};

export const unfollowUser = async (req: AuthRequest, res: Response) => {
    const followerId = req.user!.userId;
    const { followingId } = req.params;

    const followingIdNum = parseInt(followingId);
    if (isNaN(followingIdNum)) {
        return apiResponse(res, 400, '无效的用户ID');
    }

    if (followerId === followingIdNum) {
        return apiResponse(res, 400, '不能取消关注自己');
    }

    const deleted = await prisma.follow.deleteMany({
        where: {
            followerId,
            followingId: followingIdNum,
        },
    });

    if (deleted.count === 0) {
        return apiResponse(res, 400, '未关注该用户');
    }

    const counts = await getFollowCountsInternal(followingIdNum);
    return apiResponse(res, 200, '取消关注成功', {
        isFollowing: false,
        followerCount: counts.followerCount,
        followingCount: counts.followingCount,
    });
};

export const getFollowing = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const follows = await prisma.follow.findMany({
        where: {
            followerId: userId,
            following: { status: 'ACTIVE' },
        },
        include: {
            following: {
                select: userSelectFields,
            },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
    });

    const total = await prisma.follow.count({
        where: {
            followerId: userId,
            following: { status: 'ACTIVE' },
        },
    });

    const followingList = follows.map(f => ({
        ...f.following,
        followedAt: f.createdAt,
    }));

    return apiResponse(res, 200, 'Success', {
        list: followingList,
        total,
        page: pageNum,
        limit: limitNum,
    });
};

export const getFollowers = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const follows = await prisma.follow.findMany({
        where: {
            followingId: userId,
            follower: { status: 'ACTIVE' },
        },
        include: {
            follower: {
                select: userSelectFields,
            },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
    });

    const total = await prisma.follow.count({
        where: {
            followingId: userId,
            follower: { status: 'ACTIVE' },
        },
    });

    const followerIds = follows.map(f => f.followerId);
    const currentUserFollowing = await prisma.follow.findMany({
        where: {
            followerId: userId,
            followingId: { in: followerIds },
        },
        select: { followingId: true },
    });
    const followingIds = new Set(currentUserFollowing.map(f => f.followingId));

    const followersList = follows.map(f => ({
        ...f.follower,
        followedAt: f.createdAt,
        isFollowing: followingIds.has(f.followerId),
    }));

    return apiResponse(res, 200, 'Success', {
        list: followersList,
        total,
        page: pageNum,
        limit: limitNum,
    });
};

export const getFollowCounts = async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const targetUserId = parseInt(userId);

    if (isNaN(targetUserId)) {
        return apiResponse(res, 400, '无效的用户ID');
    }

    const counts = await getFollowCountsInternal(targetUserId);
    return apiResponse(res, 200, 'Success', counts);
};

export const checkIsFollowing = async (req: AuthRequest, res: Response) => {
    const followerId = req.user!.userId;
    const { followingId } = req.params;

    const followingIdNum = parseInt(followingId);
    if (isNaN(followingIdNum)) {
        return apiResponse(res, 400, '无效的用户ID');
    }

    const isFollowing = await checkIsFollowingInternal(followerId, followingIdNum);
    return apiResponse(res, 200, 'Success', { isFollowing });
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { nickname, bio, avatarUrl, password } = req.body;

    const updateData: any = {};

    if (nickname !== undefined) updateData.nickname = nickname;
    if (bio !== undefined) updateData.bio = bio;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    if (password) {
        const bcrypt = await import('bcryptjs');
        updateData.passwordHash = await bcrypt.default.hash(password, 10);
    }

    if (Object.keys(updateData).length === 0) {
        return apiResponse(res, 400, '没有需要更新的字段');
    }

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
            id: true,
            username: true,
            nickname: true,
            avatarUrl: true,
            bio: true,
            roleType: true,
            createdAt: true,
        }
    });

    return apiResponse(res, 200, '资料修改成功', updatedUser);
};

export const getUserFollowing = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const currentUserId = (req as AuthRequest).user?.userId;
    const { page = '1', limit = '20' } = req.query;

    let targetUserId: number;
    if (/^\d+$/.test(userId)) {
        targetUserId = parseInt(userId);
    } else {
        const user = await prisma.user.findUnique({
            where: { username: userId },
            select: { id: true }
        });
        if (!user) {
            return apiResponse(res, 404, '用户不存在');
        }
        targetUserId = user.id;
    }

    const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, username: true, nickname: true, status: true }
    });

    if (!targetUser) {
        return apiResponse(res, 404, '用户不存在');
    }

    if (targetUser.status === 'BANNED') {
        return apiResponse(res, 403, '该用户已被封禁，无法查看其关注列表');
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const follows = await prisma.follow.findMany({
        where: {
            followerId: targetUserId,
            following: { status: 'ACTIVE' },
        },
        include: {
            following: {
                select: userSelectFields,
            },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
    });

    const total = await prisma.follow.count({
        where: {
            followerId: targetUserId,
            following: { status: 'ACTIVE' },
        },
    });

    let followingIds: Set<number> = new Set();
    if (currentUserId) {
        const followedUserIds = follows.map(f => f.followingId);
        const currentUserFollowing = await prisma.follow.findMany({
            where: {
                followerId: currentUserId,
                followingId: { in: followedUserIds },
            },
            select: { followingId: true },
        });
        followingIds = new Set(currentUserFollowing.map(f => f.followingId));
    }

    const followingList = follows.map(f => ({
        ...f.following,
        followedAt: f.createdAt,
        isFollowing: followingIds.has(f.followingId),
    }));

    return apiResponse(res, 200, 'Success', {
        list: followingList,
        total,
        page: pageNum,
        limit: limitNum,
        user: {
            id: targetUser.id,
            username: targetUser.username,
            nickname: targetUser.nickname,
        },
    });
};

export const getUserFollowers = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const currentUserId = (req as AuthRequest).user?.userId;
    const { page = '1', limit = '20' } = req.query;

    let targetUserId: number;
    if (/^\d+$/.test(userId)) {
        targetUserId = parseInt(userId);
    } else {
        const user = await prisma.user.findUnique({
            where: { username: userId },
            select: { id: true }
        });
        if (!user) {
            return apiResponse(res, 404, '用户不存在');
        }
        targetUserId = user.id;
    }

    const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, username: true, nickname: true, status: true }
    });

    if (!targetUser) {
        return apiResponse(res, 404, '用户不存在');
    }

    if (targetUser.status === 'BANNED') {
        return apiResponse(res, 403, '该用户已被封禁，无法查看其粉丝列表');
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const follows = await prisma.follow.findMany({
        where: {
            followingId: targetUserId,
            follower: { status: 'ACTIVE' },
        },
        include: {
            follower: {
                select: userSelectFields,
            },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
    });

    const total = await prisma.follow.count({
        where: {
            followingId: targetUserId,
            follower: { status: 'ACTIVE' },
        },
    });

    let followingIds: Set<number> = new Set();
    if (currentUserId) {
        const followerUserIds = follows.map(f => f.followerId);
        const currentUserFollowing = await prisma.follow.findMany({
            where: {
                followerId: currentUserId,
                followingId: { in: followerUserIds },
            },
            select: { followingId: true },
        });
        followingIds = new Set(currentUserFollowing.map(f => f.followingId));
    }

    const followersList = follows.map(f => ({
        ...f.follower,
        followedAt: f.createdAt,
        isFollowing: followingIds.has(f.followerId),
    }));

    return apiResponse(res, 200, 'Success', {
        list: followersList,
        total,
        page: pageNum,
        limit: limitNum,
        user: {
            id: targetUser.id,
            username: targetUser.username,
            nickname: targetUser.nickname,
        },
    });
};
