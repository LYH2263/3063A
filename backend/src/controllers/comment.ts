import { Request, Response } from 'express';
import { PrismaClient, CommentStatus } from '@prisma/client';
import { apiResponse } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';
import { isAdminRole } from '../utils/role';

const prisma = new PrismaClient();

const buildCommentTree = (flatList: any[]): any[] => {
    const map = new Map<number, any>();
    const roots: any[] = [];
    flatList.forEach(item => {
        map.set(item.id, { ...item, children: [] });
    });
    flatList.forEach(item => {
        const node = map.get(item.id);
        if (item.parentId && map.has(item.parentId)) {
            map.get(item.parentId).children.push(node);
        } else {
            roots.push(node);
        }
    });
    return roots;
};

const getSettings = async () => {
    let settings = await prisma.systemSetting.findFirst();
    if (!settings) {
        settings = await prisma.systemSetting.create({ data: {} });
    }
    return settings;
};

export const getWorkComments = async (req: Request, res: Response) => {
    const workId = parseInt(req.params.workId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sort = (req.query.sort as string) || 'time'; // 'time' | 'hot'

    if (isNaN(workId)) return apiResponse(res, 400, 'Invalid work ID');

    const orderBy: any = sort === 'hot'
        ? { likeCount: 'desc', createdAt: 'desc' }
        : { createdAt: 'desc' };

    const whereCondition: any = {
        workId,
        status: 'APPROVED',
        user: { status: 'ACTIVE' },
    };

    const [totalComments, allApprovedComments] = await Promise.all([
        prisma.comment.count({ where: whereCondition }),
        prisma.comment.findMany({
            where: whereCondition,
            orderBy,
            include: {
                user: { select: { id: true, username: true, nickname: true, avatarUrl: true, roleType: true, status: true } },
            },
        }),
    ]);

    const tree = buildCommentTree(allApprovedComments);
    const rootCount = tree.length;

    const start = (page - 1) * limit;
    const paginatedRoots = tree.slice(start, start + limit);

    return apiResponse(res, 200, 'Success', {
        total: totalComments,
        rootCount,
        page,
        limit,
        totalPages: Math.ceil(rootCount / limit),
        sort,
        comments: paginatedRoots,
    });
};

export const getWorkCommentCount = async (req: Request, res: Response) => {
    const workId = parseInt(req.params.workId);
    if (isNaN(workId)) return apiResponse(res, 400, 'Invalid work ID');

    const count = await prisma.comment.count({
        where: { workId, status: 'APPROVED' },
    });
    return apiResponse(res, 200, 'Success', { count });
};

export const getBatchCommentCounts = async (req: Request, res: Response) => {
    const workIdsParam = req.query.workIds as string;
    if (!workIdsParam) return apiResponse(res, 400, 'workIds is required');

    const workIds = workIdsParam.split(',').map(Number).filter(n => !isNaN(n));
    if (workIds.length === 0) return apiResponse(res, 400, 'No valid work IDs');

    const raw = await prisma.comment.groupBy({
        by: ['workId'],
        where: { workId: { in: workIds }, status: 'APPROVED' },
        _count: { workId: true },
    });

    const counts: Record<number, number> = {};
    workIds.forEach(id => { counts[id] = 0; });
    raw.forEach(r => { counts[r.workId] = r._count.workId; });

    return apiResponse(res, 200, 'Success', counts);
};

export const createComment = async (req: AuthRequest, res: Response) => {
    const workId = parseInt(req.params.workId);
    const { content, parentId } = req.body;

    if (isNaN(workId)) return apiResponse(res, 400, 'Invalid work ID');
    if (!content || !content.trim()) return apiResponse(res, 400, 'Content is required');
    if (content.length > 2000) return apiResponse(res, 400, 'Content too long (max 2000 characters)');

    const work = await prisma.work.findUnique({ where: { id: workId } });
    if (!work) return apiResponse(res, 404, 'Work not found');

    let parent = null;
    if (parentId !== undefined && parentId !== null) {
        const pid = parseInt(parentId);
        if (isNaN(pid)) return apiResponse(res, 400, 'Invalid parent ID');
        parent = await prisma.comment.findUnique({ where: { id: pid } });
        if (!parent) return apiResponse(res, 404, 'Parent comment not found');
        if (parent.workId !== workId) return apiResponse(res, 400, 'Parent comment does not belong to this work');
    }

    const settings = await getSettings();
    const defaultStatus: CommentStatus = settings.enableCommentReview ? 'PENDING' : 'APPROVED';

    const comment = await prisma.comment.create({
        data: {
            userId: req.user!.userId,
            workId,
            content: content.trim(),
            parentId: parent ? parent.id : null,
            status: defaultStatus,
        },
        include: {
            user: { select: { id: true, username: true, nickname: true, avatarUrl: true, roleType: true, status: true } },
        },
    });

    const pendingMsg = defaultStatus === 'PENDING' ? '评论已提交，等待审核' : '评论发表成功';
    return apiResponse(res, 201, pendingMsg, { ...comment, children: [] });
};

export const deleteComment = async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return apiResponse(res, 400, 'Invalid ID');

    const userId = req.user!.userId;
    const roleType = req.user!.roleType;
    const admin = isAdminRole(roleType);

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) return apiResponse(res, 404, 'Comment not found');

    if (!admin && comment.userId !== userId) {
        return apiResponse(res, 403, 'Forbidden: You can only delete your own comments');
    }

    const deleteRecursively = async (commentId: number): Promise<number> => {
        const children = await prisma.comment.findMany({
            where: { parentId: commentId },
            select: { id: true },
        });
        let deleted = 0;
        for (const child of children) {
            deleted += await deleteRecursively(child.id);
        }
        await prisma.comment.delete({ where: { id: commentId } });
        return deleted + 1;
    };

    const count = await deleteRecursively(id);
    return apiResponse(res, 200, `Comment deleted (${count} including replies)`, { deletedCount: count });
};

export const likeComment = async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return apiResponse(res, 400, 'Invalid ID');

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) return apiResponse(res, 404, 'Comment not found');

    const updated = await prisma.comment.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
    });
    return apiResponse(res, 200, 'Liked', { likeCount: updated.likeCount });
};

export const adminGetAllComments = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const workId = req.query.workId ? parseInt(req.query.workId as string) : undefined;

    const whereCondition: any = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED', 'DELETED'].includes(status)) {
        whereCondition.status = status;
    }
    if (search) {
        whereCondition.content = { contains: search };
    }
    if (!isNaN(workId as any)) {
        whereCondition.workId = workId;
    }

    const [total, comments] = await Promise.all([
        prisma.comment.count({ where: whereCondition }),
        prisma.comment.findMany({
            where: whereCondition,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, username: true, roleType: true } },
                work: { select: { id: true, title: true } },
                parent: {
                    select: {
                        id: true,
                        content: true,
                        user: { select: { id: true, username: true } },
                    },
                },
            },
        }),
    ]);

    return apiResponse(res, 200, 'Success', {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        comments,
    });
};

export const adminUpdateCommentStatus = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (isNaN(id)) return apiResponse(res, 400, 'Invalid ID');
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
        return apiResponse(res, 400, 'Invalid status');
    }

    const comment = await prisma.comment.update({
        where: { id },
        data: { status },
    });
    return apiResponse(res, 200, `Comment ${status.toLowerCase()}`, comment);
};

export const adminBatchApprove = async (req: Request, res: Response) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return apiResponse(res, 400, 'ids array is required');
    }
    const numericIds = ids.map(Number).filter(n => !isNaN(n));
    const result = await prisma.comment.updateMany({
        where: { id: { in: numericIds }, status: 'PENDING' },
        data: { status: 'APPROVED' },
    });
    return apiResponse(res, 200, `Approved ${result.count} comments`, result);
};
