import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { apiResponse } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getPublicProfile = async (req: Request, res: Response) => {
    const { username } = req.params;

    const user = await prisma.user.findUnique({
        where: { username },
        select: {
            id: true,
            username: true,
            nickname: true,
            avatarUrl: true,
            bio: true,
            createdAt: true,
            status: true,
        }
    });

    if (!user) {
        return apiResponse(res, 404, '用户不存在');
    }

    if (user.status === 'BANNED') {
        return apiResponse(res, 403, '该用户已被封禁，主页不可访问');
    }

    const [likedInteractions, favoritedInteractions] = await Promise.all([
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
        })
    ]);

    const likedWorks = likedInteractions.map(i => i.work);
    const favoritedWorks = favoritedInteractions.map(i => i.work);

    return apiResponse(res, 200, 'Success', {
        username: user.username,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        createdAt: user.createdAt,
        likedWorks,
        favoritedWorks,
    });
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
