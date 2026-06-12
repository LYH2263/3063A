import { Request, Response } from 'express';
import { PrismaClient, AnnouncementType } from '@prisma/client';
import { apiResponse } from '../middleware/error';

const prisma = new PrismaClient();

const VALID_CONTENT_TYPES = ['plain', 'rich'];
const VALID_ANNOUNCEMENT_TYPES: string[] = ['NOTICE', 'WARNING', 'ACTIVITY'];

const normalizePayload = (body: any) => {
    const readTrimmed = (value: any) => (typeof value === 'string' ? value.trim() : undefined);
    const title = readTrimmed(body?.title);
    const content = readTrimmed(body?.content);
    const contentType = readTrimmed(body?.contentType);
    const rawType = readTrimmed(body?.type);
    const type: AnnouncementType | undefined = rawType && VALID_ANNOUNCEMENT_TYPES.includes(rawType) ? (rawType as AnnouncementType) : undefined;
    const startDate = body?.startDate ? new Date(body.startDate) : undefined;
    const endDate = body?.endDate ? new Date(body.endDate) : undefined;
    const isPinned = typeof body?.isPinned === 'boolean' ? body.isPinned : undefined;
    const isEnabled = typeof body?.isEnabled === 'boolean' ? body.isEnabled : undefined;

    return { title, content, contentType, type, rawType, startDate, endDate, isPinned, isEnabled };
};

export const getActiveAnnouncement = async (req: Request, res: Response) => {
    const now = new Date();
    const announcement = await prisma.announcement.findFirst({
        where: {
            isEnabled: true,
            startDate: { lte: now },
            endDate: { gte: now }
        },
        orderBy: [
            { isPinned: 'desc' },
            { createdAt: 'desc' }
        ]
    });
    return apiResponse(res, 200, 'Success', announcement);
};

export const adminGetAllAnnouncements = async (req: Request, res: Response) => {
    const announcements = await prisma.announcement.findMany({
        orderBy: [
            { isPinned: 'desc' },
            { createdAt: 'desc' }
        ]
    });
    return apiResponse(res, 200, 'Success', announcements);
};

export const adminCreateAnnouncement = async (req: Request, res: Response) => {
    const { title, content, contentType, type, rawType, startDate, endDate, isPinned, isEnabled } = normalizePayload(req.body);

    if (!title) return apiResponse(res, 400, '标题不能为空');
    if (!content) return apiResponse(res, 400, '内容不能为空');
    if (contentType && !VALID_CONTENT_TYPES.includes(contentType)) return apiResponse(res, 400, '内容类型不合法，仅支持 plain / rich');
    if (rawType && !type) return apiResponse(res, 400, '公告类型不合法，仅支持 NOTICE / WARNING / ACTIVITY');
    if (!startDate || isNaN(startDate.getTime())) return apiResponse(res, 400, '生效开始时间不合法');
    if (!endDate || isNaN(endDate.getTime())) return apiResponse(res, 400, '生效结束时间不合法');
    if (startDate >= endDate) return apiResponse(res, 400, '生效结束时间必须晚于开始时间');

    const announcement = await prisma.announcement.create({
        data: {
            title,
            content,
            contentType: contentType || 'plain',
            type: type || 'NOTICE',
            startDate,
            endDate,
            isPinned: isPinned ?? false,
            isEnabled: isEnabled ?? true
        }
    });
    return apiResponse(res, 201, '公告创建成功', announcement);
};

export const adminUpdateAnnouncement = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return apiResponse(res, 400, '无效的 ID');

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return apiResponse(res, 404, '公告不存在');

    const { title, content, contentType, type, rawType, startDate, endDate, isPinned, isEnabled } = normalizePayload(req.body);

    if (title !== undefined && !title) return apiResponse(res, 400, '标题不能为空');
    if (content !== undefined && !content) return apiResponse(res, 400, '内容不能为空');
    if (contentType && !VALID_CONTENT_TYPES.includes(contentType)) return apiResponse(res, 400, '内容类型不合法，仅支持 plain / rich');
    if (rawType && !type) return apiResponse(res, 400, '公告类型不合法，仅支持 NOTICE / WARNING / ACTIVITY');
    if (startDate !== undefined && isNaN(startDate.getTime())) return apiResponse(res, 400, '生效开始时间不合法');
    if (endDate !== undefined && isNaN(endDate.getTime())) return apiResponse(res, 400, '生效结束时间不合法');

    const finalStartDate = startDate ?? existing.startDate;
    const finalEndDate = endDate ?? existing.endDate;
    if (finalStartDate >= finalEndDate) return apiResponse(res, 400, '生效结束时间必须晚于开始时间');

    const announcement = await prisma.announcement.update({
        where: { id },
        data: {
            ...(title !== undefined ? { title } : {}),
            ...(content !== undefined ? { content } : {}),
            ...(contentType !== undefined ? { contentType } : {}),
            ...(type !== undefined ? { type } : {}),
            ...(startDate !== undefined ? { startDate } : {}),
            ...(endDate !== undefined ? { endDate } : {}),
            ...(isPinned !== undefined ? { isPinned } : {}),
            ...(isEnabled !== undefined ? { isEnabled } : {})
        }
    });
    return apiResponse(res, 200, '公告更新成功', announcement);
};

export const adminDeleteAnnouncement = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return apiResponse(res, 400, '无效的 ID');

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return apiResponse(res, 404, '公告不存在');

    await prisma.announcement.delete({ where: { id } });
    return apiResponse(res, 200, '公告删除成功');
};
