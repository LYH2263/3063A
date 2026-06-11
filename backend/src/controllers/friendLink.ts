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
    const name = readTrimmed(body?.name);
    const url = readTrimmed(body?.url);
    const logoUrl = readTrimmed(body?.logoUrl);
    const sortOrder = typeof body?.sortOrder === 'number' ? body.sortOrder : undefined;
    const isEnabled = typeof body?.isEnabled === 'boolean' ? body.isEnabled : undefined;

    return { name, url, logoUrl, sortOrder, isEnabled };
};

export const getPublicFriendLinks = async (req: Request, res: Response) => {
    const links = await prisma.friendLink.findMany({
        where: { isEnabled: true },
        orderBy: { sortOrder: 'asc' }
    });
    return apiResponse(res, 200, 'Success', links);
};

export const adminGetAllFriendLinks = async (req: Request, res: Response) => {
    const links = await prisma.friendLink.findMany({
        orderBy: { sortOrder: 'asc' }
    });
    return apiResponse(res, 200, 'Success', links);
};

export const adminCreateFriendLink = async (req: Request, res: Response) => {
    const { name, url, logoUrl, sortOrder, isEnabled } = normalizePayload(req.body);

    if (!name) return apiResponse(res, 400, '名称不能为空');
    if (!url) return apiResponse(res, 400, 'URL 不能为空');
    if (!isValidUrl(url)) return apiResponse(res, 400, 'URL 格式不合法，必须以 http:// 或 https:// 开头');

    const maxOrder = await prisma.friendLink.aggregate({
        _max: { sortOrder: true }
    });
    const nextSortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const link = await prisma.friendLink.create({
        data: {
            name,
            url,
            logoUrl: logoUrl ?? null,
            sortOrder: sortOrder ?? nextSortOrder,
            isEnabled: isEnabled ?? true
        }
    });
    return apiResponse(res, 201, '友情链接创建成功', link);
};

export const adminUpdateFriendLink = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return apiResponse(res, 400, '无效的 ID');

    const existing = await prisma.friendLink.findUnique({ where: { id } });
    if (!existing) return apiResponse(res, 404, '友情链接不存在');

    const { name, url, logoUrl, sortOrder, isEnabled } = normalizePayload(req.body);

    if (name !== undefined && !name) return apiResponse(res, 400, '名称不能为空');
    if (url !== undefined && !url) return apiResponse(res, 400, 'URL 不能为空');
    if (url !== undefined && !isValidUrl(url)) return apiResponse(res, 400, 'URL 格式不合法，必须以 http:// 或 https:// 开头');

    const link = await prisma.friendLink.update({
        where: { id },
        data: {
            ...(name !== undefined ? { name } : {}),
            ...(url !== undefined ? { url } : {}),
            ...(logoUrl !== undefined ? { logoUrl: logoUrl ?? null } : {}),
            ...(sortOrder !== undefined ? { sortOrder } : {}),
            ...(isEnabled !== undefined ? { isEnabled } : {})
        }
    });
    return apiResponse(res, 200, '友情链接更新成功', link);
};

export const adminDeleteFriendLink = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return apiResponse(res, 400, '无效的 ID');

    const existing = await prisma.friendLink.findUnique({ where: { id } });
    if (!existing) return apiResponse(res, 404, '友情链接不存在');

    await prisma.friendLink.delete({ where: { id } });
    return apiResponse(res, 200, '友情链接删除成功');
};

export const adminReorderFriendLinks = async (req: Request, res: Response) => {
    const { orders } = req.body as { orders: Array<{ id: number; sortOrder: number }> };
    if (!Array.isArray(orders)) return apiResponse(res, 400, '参数格式错误');

    const updates = orders.map(item => {
        if (typeof item.id !== 'number' || typeof item.sortOrder !== 'number') {
            return null;
        }
        return prisma.friendLink.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder }
        });
    }).filter(Boolean);

    if (updates.length === 0) return apiResponse(res, 400, '没有有效的排序数据');

    await Promise.all(updates);
    return apiResponse(res, 200, '排序更新成功');
};
