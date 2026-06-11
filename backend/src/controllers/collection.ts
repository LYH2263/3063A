import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { apiResponse } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const normalizePayload = (body: any) => {
    const readTrimmed = (value: any) => (typeof value === 'string' ? value.trim() : undefined);
    return {
        title: readTrimmed(body?.title),
        description: readTrimmed(body?.description ?? body?.content),
        coverUrl: readTrimmed(body?.coverUrl),
    };
};

// Public: Get all collections with published work count
export const getCollections = async (req: Request, res: Response) => {
    const collections = await prisma.collection.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            works: {
                include: { work: true },
            },
        },
    });

    const result = collections.map((c) => {
        const publishedWorks = c.works.filter((cw) => cw.work.status === 'PUBLISHED');
        const cover = c.coverUrl || publishedWorks[0]?.work.mediaUrl || null;
        return {
            id: c.id,
            title: c.title,
            description: c.description,
            coverUrl: cover,
            workCount: publishedWorks.length,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        };
    });

    return apiResponse(res, 200, 'Success', result);
};

// Public: Get collection detail with published works in order
export const getCollectionDetail = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return apiResponse(res, 400, 'Invalid ID');

    const collection = await prisma.collection.findUnique({
        where: { id },
        include: {
            works: {
                orderBy: { sortOrder: 'asc' },
                include: { work: true },
            },
        },
    });

    if (!collection) return apiResponse(res, 404, 'Collection not found');

    const publishedWorks = collection.works
        .filter((cw) => cw.work.status === 'PUBLISHED')
        .map((cw) => ({
            ...cw.work,
            sortOrder: cw.sortOrder,
        }));

    const cover = collection.coverUrl || publishedWorks[0]?.mediaUrl || null;

    return apiResponse(res, 200, 'Success', {
        id: collection.id,
        title: collection.title,
        description: collection.description,
        coverUrl: cover,
        workCount: publishedWorks.length,
        works: publishedWorks,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
    });
};

// Admin: Get all collections with full details
export const adminGetCollections = async (req: Request, res: Response) => {
    const collections = await prisma.collection.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            works: {
                orderBy: { sortOrder: 'asc' },
                include: { work: true },
            },
        },
    });

    const result = collections.map((c) => {
        const cover = c.coverUrl || c.works[0]?.work.mediaUrl || null;
        return {
            id: c.id,
            title: c.title,
            description: c.description,
            coverUrl: cover,
            workCount: c.works.length,
            publishedWorkCount: c.works.filter((cw) => cw.work.status === 'PUBLISHED').length,
            works: c.works.map((cw) => ({
                ...cw.work,
                sortOrder: cw.sortOrder,
            })),
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        };
    });

    return apiResponse(res, 200, 'Success', result);
};

// Admin: Get single collection with all works
export const adminGetCollectionDetail = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return apiResponse(res, 400, 'Invalid ID');

    const collection = await prisma.collection.findUnique({
        where: { id },
        include: {
            works: {
                orderBy: { sortOrder: 'asc' },
                include: { work: true },
            },
        },
    });

    if (!collection) return apiResponse(res, 404, 'Collection not found');

    const cover = collection.coverUrl || collection.works[0]?.work.mediaUrl || null;

    return apiResponse(res, 200, 'Success', {
        id: collection.id,
        title: collection.title,
        description: collection.description,
        coverUrl: cover,
        workCount: collection.works.length,
        publishedWorkCount: collection.works.filter((cw) => cw.work.status === 'PUBLISHED').length,
        works: collection.works.map((cw) => ({
            ...cw.work,
            sortOrder: cw.sortOrder,
        })),
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
    });
};

// Admin: Create collection
export const adminCreateCollection = async (req: Request, res: Response) => {
    const { title, description, coverUrl } = normalizePayload(req.body);

    if (!title) return apiResponse(res, 400, 'Missing required field: title');
    if (!description) return apiResponse(res, 400, 'Missing required field: description');

    const collection = await prisma.collection.create({
        data: {
            title,
            description,
            coverUrl: coverUrl || null,
        },
    });

    return apiResponse(res, 201, 'Collection created', collection);
};

// Admin: Update collection
export const adminUpdateCollection = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return apiResponse(res, 400, 'Invalid ID');

    const { title, description, coverUrl } = normalizePayload(req.body);

    if (title !== undefined && !title) return apiResponse(res, 400, 'title cannot be empty');
    if (description !== undefined && !description) return apiResponse(res, 400, 'description cannot be empty');

    const collection = await prisma.collection.update({
        where: { id },
        data: {
            ...(title !== undefined ? { title } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(coverUrl !== undefined ? { coverUrl: coverUrl || null } : {}),
        },
    });

    return apiResponse(res, 200, 'Collection updated', collection);
};

// Admin: Delete collection
export const adminDeleteCollection = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return apiResponse(res, 400, 'Invalid ID');

    await prisma.collection.delete({ where: { id } });
    return apiResponse(res, 200, 'Collection deleted');
};

// Admin: Batch add works to collection
export const adminAddWorksToCollection = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { workIds } = req.body as { workIds: number[] };

    if (isNaN(id)) return apiResponse(res, 400, 'Invalid ID');
    if (!Array.isArray(workIds) || workIds.length === 0) {
        return apiResponse(res, 400, 'workIds must be a non-empty array');
    }

    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection) return apiResponse(res, 404, 'Collection not found');

    const maxSortOrder = await prisma.collectionWork.aggregate({
        where: { collectionId: id },
        _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

    const existing = await prisma.collectionWork.findMany({
        where: { collectionId: id, workId: { in: workIds } },
        select: { workId: true },
    });
    const existingWorkIds = new Set(existing.map((e) => e.workId));

    const newWorkIds = workIds.filter((wid) => !existingWorkIds.has(wid));

    if (newWorkIds.length > 0) {
        await prisma.collectionWork.createMany({
            data: newWorkIds.map((wid, index) => ({
                collectionId: id,
                workId: wid,
                sortOrder: nextSortOrder + index,
            })),
        });
    }

    return apiResponse(res, 200, `Added ${newWorkIds.length} works to collection`);
};

// Admin: Remove works from collection
export const adminRemoveWorksFromCollection = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { workIds } = req.body as { workIds: number[] };

    if (isNaN(id)) return apiResponse(res, 400, 'Invalid ID');
    if (!Array.isArray(workIds) || workIds.length === 0) {
        return apiResponse(res, 400, 'workIds must be a non-empty array');
    }

    await prisma.collectionWork.deleteMany({
        where: { collectionId: id, workId: { in: workIds } },
    });

    return apiResponse(res, 200, 'Works removed from collection');
};

// Admin: Reorder works in collection
export const adminReorderWorks = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { orders } = req.body as { orders: Array<{ workId: number; sortOrder: number }> };

    if (isNaN(id)) return apiResponse(res, 400, 'Invalid ID');
    if (!Array.isArray(orders) || orders.length === 0) {
        return apiResponse(res, 400, 'orders must be a non-empty array');
    }

    const updates = orders.map(({ workId, sortOrder }) =>
        prisma.collectionWork.update({
            where: { collectionId_workId: { collectionId: id, workId } },
            data: { sortOrder },
        })
    );

    await Promise.all(updates);
    return apiResponse(res, 200, 'Works reordered');
};
