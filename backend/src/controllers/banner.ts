import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { apiResponse } from '../middleware/error';

const prisma = new PrismaClient();

const isValidUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
};

const normalizePayload = (body: any) => {
    const readTrimmed = (value: any) => (typeof value === 'string' ? value.trim() : undefined);
    const title = readTrimmed(body?.title);
    const subtitle = readTrimmed(body?.subtitle);
    const imageUrl = readTrimmed(body?.imageUrl);
    const linkUrl = readTrimmed(body?.linkUrl);
    const startDate = body?.startDate ? new Date(body.startDate) : undefined;
    const endDate = body?.endDate ? new Date(body.endDate) : undefined;
    const sortOrder = typeof body?.sortOrder === 'number' ? body.sortOrder : undefined;
    const isEnabled = typeof body?.isEnabled === 'boolean' ? body.isEnabled : undefined;

    return { title, subtitle, imageUrl, linkUrl, startDate, endDate, sortOrder, isEnabled };
};

export const getPublicBanners = async (req: Request, res: Response) => {
    const now = new Date();
    const banners = await prisma.banner.findMany({
        where: {
            isEnabled: true,
            startDate: { lte: now },
            endDate: { gte: now }
        },
        orderBy: { sortOrder: 'asc' }
    });
    return apiResponse(res, 200, 'Success', banners);
};

export const adminGetAllBanners = async (req: Request, res: Response) => {
    const banners = await prisma.banner.findMany({
        orderBy: { sortOrder: 'asc' }
    });
    return apiResponse(res, 200, 'Success', banners);
};

export const adminCreateBanner = async (req: Request, res: Response) => {
    const { title, subtitle, imageUrl, linkUrl, startDate, endDate, sortOrder, isEnabled } = normalizePayload(req.body);

    if (!title) return apiResponse(res, 400, '标题不能为空');
    if (!imageUrl) return apiResponse(res, 400, '图片不能为空');
    if (!startDate || isNaN(startDate.getTime())) return apiResponse(res, 400, '生效开始时间不合法');
    if (!endDate || isNaN(endDate.getTime())) return apiResponse(res, 400, '生效结束时间不合法');
    if (startDate >= endDate) return apiResponse(res, 400, '生效结束时间必须晚于开始时间');
    if (linkUrl !== undefined && linkUrl !== '' && !isValidUrl(linkUrl)) return apiResponse(res, 400, '跳转链接格式不合法，必须以 http:// 或 https:// 开头');

    const maxOrder = await prisma.banner.aggregate({
        _max: { sortOrder: true }
    });
    const nextSortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const banner = await prisma.banner.create({
        data: {
            title,
            subtitle: subtitle ?? null,
            imageUrl,
            linkUrl: linkUrl && linkUrl !== '' ? linkUrl : null,
            startDate,
            endDate,
            sortOrder: sortOrder ?? nextSortOrder,
            isEnabled: isEnabled ?? true
        }
    });
    return apiResponse(res, 201, 'Banner 创建成功', banner);
};

export const adminUpdateBanner = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return apiResponse(res, 400, '无效的 ID');

    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) return apiResponse(res, 404, 'Banner 不存在');

    const { title, subtitle, imageUrl, linkUrl, startDate, endDate, sortOrder, isEnabled } = normalizePayload(req.body);

    if (title !== undefined && !title) return apiResponse(res, 400, '标题不能为空');
    if (imageUrl !== undefined && !imageUrl) return apiResponse(res, 400, '图片不能为空');
    if (startDate !== undefined && isNaN(startDate.getTime())) return apiResponse(res, 400, '生效开始时间不合法');
    if (endDate !== undefined && isNaN(endDate.getTime())) return apiResponse(res, 400, '生效结束时间不合法');

    const finalStartDate = startDate ?? existing.startDate;
    const finalEndDate = endDate ?? existing.endDate;
    if (finalStartDate >= finalEndDate) return apiResponse(res, 400, '生效结束时间必须晚于开始时间');

    if (linkUrl !== undefined && linkUrl !== '' && !isValidUrl(linkUrl)) return apiResponse(res, 400, '跳转链接格式不合法，必须以 http:// 或 https:// 开头');

    const banner = await prisma.banner.update({
        where: { id },
        data: {
            ...(title !== undefined ? { title } : {}),
            ...(subtitle !== undefined ? { subtitle: subtitle ?? null } : {}),
            ...(imageUrl !== undefined ? { imageUrl } : {}),
            ...(linkUrl !== undefined ? { linkUrl: linkUrl && linkUrl !== '' ? linkUrl : null } : {}),
            ...(startDate !== undefined ? { startDate } : {}),
            ...(endDate !== undefined ? { endDate } : {}),
            ...(sortOrder !== undefined ? { sortOrder } : {}),
            ...(isEnabled !== undefined ? { isEnabled } : {})
        }
    });
    return apiResponse(res, 200, 'Banner 更新成功', banner);
};

export const adminDeleteBanner = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return apiResponse(res, 400, '无效的 ID');

    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) return apiResponse(res, 404, 'Banner 不存在');

    await prisma.banner.delete({ where: { id } });
    return apiResponse(res, 200, 'Banner 删除成功');
};

export const adminReorderBanners = async (req: Request, res: Response) => {
    const { orders } = req.body as { orders: Array<{ id: number; sortOrder: number }> };
    if (!Array.isArray(orders)) return apiResponse(res, 400, '参数格式错误');

    const updates = orders.map(item => {
        if (typeof item.id !== 'number' || typeof item.sortOrder !== 'number') {
            return null;
        }
        return prisma.banner.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder }
        });
    }).filter(Boolean);

    if (updates.length === 0) return apiResponse(res, 400, '没有有效的排序数据');

    await Promise.all(updates);
    return apiResponse(res, 200, '排序更新成功');
};
