import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const POLL_INTERVAL_MS = 60 * 60 * 1000;
const BATCH_SIZE = 100;

let pollingTimer: NodeJS.Timeout | null = null;
let isPolling = false;

const cleanExpiredWorks = async () => {
    if (isPolling) return;
    isPolling = true;

    try {
        const settings = await prisma.systemSetting.findFirst();
        const retentionDays = settings?.recycleBinRetentionDays ?? 30;

        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() - retentionDays);

        const expiredWorks = await prisma.work.findMany({
            where: {
                isDeleted: true,
                deletedAt: {
                    lte: expirationDate
                }
            },
            take: BATCH_SIZE,
            select: { id: true }
        });

        if (expiredWorks.length === 0) {
            return;
        }

        const expiredIds = expiredWorks.map(w => w.id);

        console.log(`[RecycleBinCleaner] Found ${expiredIds.length} works expired beyond ${retentionDays} days, cleaning up...`);

        await prisma.$transaction(async (tx) => {
            const toDelete = await tx.work.findMany({
                where: {
                    id: { in: expiredIds },
                    isDeleted: true,
                    deletedAt: { lte: expirationDate }
                },
                select: { id: true }
            });

            const confirmIds = toDelete.map(w => w.id);
            if (confirmIds.length === 0) return;

            await tx.interaction.deleteMany({ where: { workId: { in: confirmIds } } });
            await tx.comment.deleteMany({ where: { workId: { in: confirmIds } } });
            await tx.collectionWork.deleteMany({ where: { workId: { in: confirmIds } } });
            await tx.work.deleteMany({ where: { id: { in: confirmIds } } });

            console.log(`[RecycleBinCleaner] Permanently deleted ${confirmIds.length} expired works`);
        });
    } catch (err) {
        console.error('[RecycleBinCleaner] Cleanup error:', err);
    } finally {
        isPolling = false;
    }
};

export const startRecycleBinCleaner = () => {
    if (pollingTimer) {
        console.log('[RecycleBinCleaner] Already running');
        return;
    }

    console.log(`[RecycleBinCleaner] Starting with ${POLL_INTERVAL_MS / 1000}s poll interval`);

    setTimeout(() => {
        cleanExpiredWorks();
    }, 10000);

    pollingTimer = setInterval(cleanExpiredWorks, POLL_INTERVAL_MS);
};

export const stopRecycleBinCleaner = () => {
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
        console.log('[RecycleBinCleaner] Stopped');
    }
};

export const triggerCleanupNow = async () => {
    await cleanExpiredWorks();
};
