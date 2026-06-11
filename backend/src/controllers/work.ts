import { Request, Response } from 'express';
import { PrismaClient, WorkStatus } from '@prisma/client';
import { apiResponse } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';
import { isAdminRole } from '../utils/role';

const prisma = new PrismaClient();

const VALID_WORK_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED'];

const STATE_TRANSITIONS: Record<WorkStatus, WorkStatus[]> = {
    DRAFT: [WorkStatus.PENDING_REVIEW, WorkStatus.PUBLISHED],
    PENDING_REVIEW: [WorkStatus.PUBLISHED, WorkStatus.REJECTED, WorkStatus.DRAFT],
    PUBLISHED: [WorkStatus.DRAFT],
    REJECTED: [WorkStatus.DRAFT, WorkStatus.PENDING_REVIEW]
};

const isValidStatusTransition = (from: WorkStatus, to: WorkStatus): boolean => {
    return STATE_TRANSITIONS[from]?.includes(to) || false;
};

const getEnableWorkReview = async (): Promise<boolean> => {
    const settings = await prisma.systemSetting.findFirst();
    return settings?.enableWorkReview ?? false;
};

const normalizeWorkPayload = (body: any) => {
    const readTrimmed = (value: any) => (typeof value === 'string' ? value.trim() : undefined);
    const title = readTrimmed(body?.title);
    const description = readTrimmed(body?.description ?? body?.content);
    const mediaUrl = readTrimmed(body?.mediaUrl ?? body?.url ?? body?.coverUrl);
    const category = readTrimmed(body?.category);
    const tags = readTrimmed(body?.tags);
    const status = typeof body?.status === 'string' && VALID_WORK_STATUSES.includes(body.status)
        ? body.status as WorkStatus
        : undefined;

    return { title, description, mediaUrl, category, tags, status };
};

export const getWorks = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string;
    const search = req.query.search as string;

    const whereCondition: any = { status: WorkStatus.PUBLISHED };
    if (category) whereCondition.category = category;
    if (search) {
        whereCondition.OR = [
            { title: { contains: search } },
            { tags: { contains: search } }
        ];
    }

    const [total, works] = await Promise.all([
        prisma.work.count({ where: whereCondition }),
        prisma.work.findMany({
            where: whereCondition,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: 'desc' }
        })
    ]);

    const workIds = works.map(w => w.id);
    let commentCounts: Record<number, number> = {};
    if (workIds.length > 0) {
        const raw = await prisma.comment.groupBy({
            by: ['workId'],
            where: { workId: { in: workIds }, status: 'APPROVED' },
            _count: { workId: true },
        });
        raw.forEach(r => { commentCounts[r.workId] = r._count.workId; });
    }

    const worksWithCounts = works.map(w => ({
        ...w,
        commentCount: commentCounts[w.id] || 0,
    }));

    return apiResponse(res, 200, 'Success', { total, page, limit, works: worksWithCounts });
};

export const getWorkDetail = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return apiResponse(res, 400, 'Invalid ID');

    const [work, commentCount] = await Promise.all([
        prisma.work.update({
            where: { id, status: WorkStatus.PUBLISHED },
            data: { viewCount: { increment: 1 } },
            include: { interactions: true }
        }),
        prisma.comment.count({
            where: { workId: id, status: 'APPROVED' },
        }),
    ]);

    if (!work) return apiResponse(res, 404, 'Work not found');

    return apiResponse(res, 200, 'Success', { ...work, commentCount });
};

export const toggleInteraction = async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id);
    const { type } = req.body;
    if (isNaN(id)) return apiResponse(res, 400, 'Invalid ID');
    if (!['LIKE', 'FAVORITE'].includes(type)) return apiResponse(res, 400, 'Invalid interaction type');

    const work = await prisma.work.findUnique({ where: { id } });
    if (!work || work.status !== WorkStatus.PUBLISHED) {
        return apiResponse(res, 404, 'Work not found or not published');
    }

    const userId = req.user!.userId;

    const existing = await prisma.interaction.findUnique({
        where: { userId_workId_interactionType: { userId, workId: id, interactionType: type } }
    });

    if (existing) {
        await prisma.interaction.delete({ where: { id: existing.id } });
        return apiResponse(res, 200, `${type} removed`);
    } else {
        await prisma.interaction.create({
            data: { userId, workId: id, interactionType: type }
        });
        return apiResponse(res, 201, `${type} added`);
    }
};

export const getMyFavorites = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const interactions = await prisma.interaction.findMany({
        where: { userId, interactionType: 'FAVORITE' },
        include: { work: true }
    });
    const works = interactions
        .map(i => i.work)
        .filter(w => w && w.status === WorkStatus.PUBLISHED);
    return apiResponse(res, 200, 'Success', works);
};

export const adminGetWorks = async (req: Request, res: Response) => {
    const status = req.query.status as string;
    const whereCondition: any = {};
    if (status && VALID_WORK_STATUSES.includes(status)) {
        whereCondition.status = status;
    }

    const works = await prisma.work.findMany({
        where: whereCondition,
        include: {
            submitter: { select: { id: true, username: true, nickname: true } },
            reviewer: { select: { id: true, username: true, nickname: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
    return apiResponse(res, 200, 'Success', works);
};

export const adminGetPendingReviews = async (req: Request, res: Response) => {
    const works = await prisma.work.findMany({
        where: { status: WorkStatus.PENDING_REVIEW },
        include: {
            submitter: { select: { id: true, username: true, nickname: true } }
        },
        orderBy: { submittedAt: 'asc' }
    });
    return apiResponse(res, 200, 'Success', works);
};

export const adminApproveWork = async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return apiResponse(res, 400, 'Invalid ID');

    const work = await prisma.work.findUnique({ where: { id } });
    if (!work) return apiResponse(res, 404, 'Work not found');

    if (!isValidStatusTransition(work.status, WorkStatus.PUBLISHED)) {
        return apiResponse(res, 400, `Invalid status transition from ${work.status} to PUBLISHED`);
    }

    const reviewerId = req.user!.userId;
    const updated = await prisma.work.update({
        where: { id },
        data: {
            status: WorkStatus.PUBLISHED,
            reviewerId,
            reviewedAt: new Date(),
            rejectReason: null
        },
        include: {
            submitter: { select: { id: true, username: true, nickname: true } },
            reviewer: { select: { id: true, username: true, nickname: true } }
        }
    });

    return apiResponse(res, 200, 'Work approved', updated);
};

export const adminRejectWork = async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id);
    const { reason } = req.body;

    if (isNaN(id)) return apiResponse(res, 400, 'Invalid ID');
    if (!reason || !reason.trim()) return apiResponse(res, 400, 'Rejection reason is required');

    const work = await prisma.work.findUnique({ where: { id } });
    if (!work) return apiResponse(res, 404, 'Work not found');

    if (!isValidStatusTransition(work.status, WorkStatus.REJECTED)) {
        return apiResponse(res, 400, `Invalid status transition from ${work.status} to REJECTED`);
    }

    const reviewerId = req.user!.userId;
    const updated = await prisma.work.update({
        where: { id },
        data: {
            status: WorkStatus.REJECTED,
            rejectReason: reason.trim(),
            reviewerId,
            reviewedAt: new Date()
        },
        include: {
            submitter: { select: { id: true, username: true, nickname: true } },
            reviewer: { select: { id: true, username: true, nickname: true } }
        }
    });

    return apiResponse(res, 200, 'Work rejected', updated);
};

const determineInitialStatus = async (userRole: string): Promise<WorkStatus> => {
    const isAdmin = isAdminRole(userRole);
    const enableWorkReview = await getEnableWorkReview();

    if (isAdmin || !enableWorkReview) {
        return WorkStatus.PUBLISHED;
    }
    return WorkStatus.PENDING_REVIEW;
};

export const adminCreateWork = async (req: AuthRequest, res: Response) => {
    const { title, description, tags, category, mediaUrl, status } = normalizeWorkPayload(req.body);
    const missingFields = [
        !title ? 'title' : null,
        !description ? 'description' : null,
        !mediaUrl ? 'mediaUrl' : null
    ].filter(Boolean);
    if (missingFields.length > 0) {
        return apiResponse(res, 400, `Missing required fields: ${missingFields.join(', ')}`);
    }

    const userRole = req.user!.roleType;
    const isAdmin = isAdminRole(userRole);
    const enableWorkReview = await getEnableWorkReview();

    let finalStatus: WorkStatus;
    let submittedAt: Date | undefined;
    let submitterId: number | undefined = req.user!.userId;

    if (status) {
        if (!isAdmin && status === WorkStatus.PUBLISHED && enableWorkReview) {
            return apiResponse(res, 403, 'Non-admin users cannot directly publish works when review is enabled');
        }
        finalStatus = status;
    } else {
        finalStatus = await determineInitialStatus(userRole);
    }

    if (finalStatus === WorkStatus.PENDING_REVIEW) {
        submittedAt = new Date();
    }

    const work = await prisma.work.create({
        data: {
            title,
            description,
            tags: tags || '[]',
            category: category || 'Uncategorized',
            mediaUrl,
            status: finalStatus,
            submittedAt,
            submitterId
        }
    });
    return apiResponse(res, 201, 'Work created', work);
};

export const adminUpdateWork = async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id);
    const { title, description, tags, category, mediaUrl, status } = normalizeWorkPayload(req.body);
    if (isNaN(id)) return apiResponse(res, 400, 'Invalid ID');
    if (title !== undefined && !title) return apiResponse(res, 400, 'title cannot be empty');
    if (description !== undefined && !description) return apiResponse(res, 400, 'description cannot be empty');
    if (mediaUrl !== undefined && !mediaUrl) return apiResponse(res, 400, 'mediaUrl cannot be empty');

    const existingWork = await prisma.work.findUnique({ where: { id } });
    if (!existingWork) return apiResponse(res, 404, 'Work not found');

    const userRole = req.user!.roleType;
    const isAdmin = isAdminRole(userRole);
    const enableWorkReview = await getEnableWorkReview();

    let finalStatus = existingWork.status;
    let submittedAt: Date | undefined = existingWork.submittedAt;

    if (status !== undefined && status !== existingWork.status) {
        if (!isValidStatusTransition(existingWork.status, status)) {
            return apiResponse(res, 400, `Invalid status transition from ${existingWork.status} to ${status}`);
        }

        if (!isAdmin && status === WorkStatus.PUBLISHED && enableWorkReview) {
            return apiResponse(res, 403, 'Non-admin users cannot directly publish works when review is enabled');
        }

        finalStatus = status;

        if (status === WorkStatus.PENDING_REVIEW && !submittedAt) {
            submittedAt = new Date();
        }
    }

    const updateData: any = {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(tags !== undefined ? { tags: tags || '[]' } : {}),
        ...(category !== undefined ? { category: category || 'Uncategorized' } : {}),
        ...(mediaUrl !== undefined ? { mediaUrl } : {}),
        ...(status !== undefined ? { status: finalStatus } : {}),
        ...(submittedAt !== existingWork.submittedAt ? { submittedAt } : {})
    };

    if (status === WorkStatus.PUBLISHED || status === WorkStatus.REJECTED) {
        if (isAdmin) {
            updateData.reviewerId = req.user!.userId;
            updateData.reviewedAt = new Date();
            if (status === WorkStatus.PUBLISHED) {
                updateData.rejectReason = null;
            }
        }
    }

    if (status === WorkStatus.DRAFT) {
        updateData.rejectReason = null;
    }

    const work = await prisma.work.update({
        where: { id },
        data: updateData,
        include: {
            submitter: { select: { id: true, username: true, nickname: true } },
            reviewer: { select: { id: true, username: true, nickname: true } }
        }
    });
    return apiResponse(res, 200, 'Work updated', work);
};

export const adminDeleteWork = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);

    await prisma.interaction.deleteMany({ where: { workId: id } });

    await prisma.work.delete({ where: { id } });
    return apiResponse(res, 200, 'Work deleted');
};
