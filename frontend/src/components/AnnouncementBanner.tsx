import React, { useEffect, useState } from 'react';
import { X, Megaphone, AlertTriangle, PartyPopper } from 'lucide-react';
import { announcementApi } from '../services/api';

const DISMISS_KEY_PREFIX = 'announcement_dismissed_';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000;

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
    NOTICE: {
        icon: <Megaphone className="w-5 h-5 flex-shrink-0" />,
        bg: 'bg-blue-50 dark:bg-blue-900/30',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-800 dark:text-blue-200',
    },
    WARNING: {
        icon: <AlertTriangle className="w-5 h-5 flex-shrink-0" />,
        bg: 'bg-yellow-50 dark:bg-yellow-900/30',
        border: 'border-yellow-200 dark:border-yellow-800',
        text: 'text-yellow-800 dark:text-yellow-200',
    },
    ACTIVITY: {
        icon: <PartyPopper className="w-5 h-5 flex-shrink-0" />,
        bg: 'bg-green-50 dark:bg-green-900/30',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-800 dark:text-green-200',
    },
};

const isDismissed = (id: number): boolean => {
    const raw = localStorage.getItem(`${DISMISS_KEY_PREFIX}${id}`);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (Date.now() - dismissedAt > DISMISS_DURATION_MS) {
        localStorage.removeItem(`${DISMISS_KEY_PREFIX}${id}`);
        return false;
    }
    return true;
};

const dismissAnnouncement = (id: number) => {
    localStorage.setItem(`${DISMISS_KEY_PREFIX}${id}`, String(Date.now()));
};

export const AnnouncementBanner: React.FC = () => {
    const [announcement, setAnnouncement] = useState<any>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const fetchActive = async () => {
            try {
                const res: any = await announcementApi.getActiveAnnouncement();
                const data = res.data;
                if (data && !isDismissed(data.id)) {
                    setAnnouncement(data);
                    setVisible(true);
                }
            } catch {
                setAnnouncement(null);
            }
        };
        fetchActive();
        const interval = setInterval(fetchActive, 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const handleClose = () => {
        if (announcement) {
            dismissAnnouncement(announcement.id);
        }
        setVisible(false);
    };

    if (!visible || !announcement) return null;

    const config = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.NOTICE;

    return (
        <div className={`w-full border-b ${config.bg} ${config.border} transition-all duration-300`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
                <span className={config.text}>{config.icon}</span>
                <span className={`font-semibold text-sm ${config.text}`}>{announcement.title}</span>
                {announcement.contentType === 'rich' ? (
                    <div
                        className={`text-sm flex-1 min-w-0 line-clamp-1 ${config.text}`}
                        dangerouslySetInnerHTML={{ __html: announcement.content }}
                    />
                ) : (
                    <span className={`text-sm flex-1 min-w-0 truncate ${config.text}`}>{announcement.content}</span>
                )}
                <button
                    onClick={handleClose}
                    className={`flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${config.text}`}
                    aria-label="关闭公告"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
