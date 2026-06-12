import { PrismaClient, WorkStatus } from '@prisma/client';

const prisma = new PrismaClient();

const POLL_INTERVAL_MS = 60 * 1000;
const BATCH_SIZE = 50;

let pollingTimer: NodeJS.Timeout | null = null;
let isPolling = false;

const publishScheduledWorks = async () => {
    if (isPolling) return;
    isPolling = true;

    try {
        const now = new Date();

        const dueWorks = await prisma.work.findMany({
            where: {
                status: WorkStatus.SCHEDULED,
                isDeleted: false,
                scheduledPublishAt: {
                    lte: now
                }
            },
            take: BATCH_SIZE,
            orderBy: { scheduledPublishAt: 'asc' }
        });

        if (dueWorks.length === 0) {
            return;
        }

        console.log(`[ScheduledPublisher] Found ${dueWorks.length} works due for publishing at ${now.toISOString()}`);

        for (const work of dueWorks) {
            try {
                await prisma.$transaction(async (tx) => {
                    const current = await tx.work.findUnique({
                        where: { id: work.id },
                        select: { status: true, scheduledPublishAt: true }
                    });

                    if (!current || current.status !== WorkStatus.SCHEDULED) {
                        return;
                    }

                    if (!current.scheduledPublishAt || current.scheduledPublishAt > now) {
                        return;
                    }

                    await tx.work.update({
                        where: { id: work.id },
                        data: {
                            status: WorkStatus.PUBLISHED,
                            scheduledPublishAt: null,
                            publishedAt: now
                        }
                    });
                });

                console.log(`[ScheduledPublisher] Successfully published work #${work.id}`);
            } catch (err) {
                console.error(`[ScheduledPublisher] Failed to publish work #${work.id}:`, err);
            }
        }
    } catch (err) {
        console.error('[ScheduledPublisher] Polling error:', err);
    } finally {
        isPolling = false;
    }
};

export const startScheduledPublisher = () => {
    if (pollingTimer) {
        console.log('[ScheduledPublisher] Already running');
        return;
    }

    console.log(`[ScheduledPublisher] Starting with ${POLL_INTERVAL_MS / 1000}s poll interval`);

    setTimeout(() => {
        publishScheduledWorks();
    }, 5000);

    pollingTimer = setInterval(publishScheduledWorks, POLL_INTERVAL_MS);
};

export const stopScheduledPublisher = () => {
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
        console.log('[ScheduledPublisher] Stopped');
    }
};

export const triggerPublishNow = async () => {
    await publishScheduledWorks();
};
