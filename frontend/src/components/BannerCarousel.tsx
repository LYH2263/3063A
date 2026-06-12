import React, { useEffect, useState, useCallback, useRef } from 'react';
import { bannerApi } from '../services/api';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8063/api').replace(/\/api$/, '');

const AUTO_PLAY_INTERVAL = 4000;
const TRANSITION_DURATION = 500;
const SWIPE_THRESHOLD = 50;

interface Banner {
    id: number;
    title: string;
    subtitle: string | null;
    imageUrl: string;
    linkUrl: string | null;
}

export const BannerCarousel: React.FC = () => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isUserPaused, setIsUserPaused] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const transitionEnabledRef = useRef(true);

    const touchStartXRef = useRef<number | null>(null);
    const touchEndXRef = useRef<number | null>(null);
    const touchStartYRef = useRef<number | null>(null);
    const [swipeDragX, setSwipeDragX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    useEffect(() => {
        bannerApi.getPublicBanners()
            .then((res: any) => setBanners(res.data || []))
            .catch(() => setBanners([]));
    }, []);

    const realCount = banners.length;
    const displayIndex = currentIndex + 1;

    const goTo = useCallback((realIdx: number, animated: boolean = true) => {
        if (realCount <= 1) return;
        if (!animated) transitionEnabledRef.current = false;
        setCurrentIndex(realIdx);
    }, [realCount]);

    const goNext = useCallback(() => {
        if (realCount <= 1) return;
        goTo(currentIndex + 1);
    }, [currentIndex, realCount, goTo]);

    const goPrev = useCallback(() => {
        if (realCount <= 1) return;
        goTo(currentIndex - 1);
    }, [currentIndex, realCount, goTo]);

    const jumpToRealIndex = useCallback(() => {
        if (realCount <= 1) return;
        if (currentIndex < 0) {
            transitionEnabledRef.current = false;
            setCurrentIndex(realCount - 1);
        } else if (currentIndex >= realCount) {
            transitionEnabledRef.current = false;
            setCurrentIndex(0);
        }
    }, [currentIndex, realCount]);

    useEffect(() => {
        if (!transitionEnabledRef.current) return;
        jumpToRealIndex();
    }, [jumpToRealIndex, currentIndex]);

    useEffect(() => {
        if (!transitionEnabledRef.current && trackRef.current) {
            const raf1 = requestAnimationFrame(() => {
                const raf2 = requestAnimationFrame(() => {
                    transitionEnabledRef.current = true;
                    if (trackRef.current) {
                        trackRef.current.style.transition = '';
                    }
                });
            });
            return () => cancelAnimationFrame(raf1);
        }
    }, [transitionEnabledRef.current, currentIndex]);

    useEffect(() => {
        if (realCount <= 1 || isPaused || isUserPaused) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }
        timerRef.current = setInterval(() => {
            goNext();
        }, AUTO_PLAY_INTERVAL);
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [goNext, isPaused, isUserPaused, realCount]);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (realCount <= 1) return;
        const t = e.touches[0];
        touchStartXRef.current = t.clientX;
        touchStartYRef.current = t.clientY;
        touchEndXRef.current = null;
        setIsSwiping(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (realCount <= 1 || touchStartXRef.current === null) return;
        const t = e.touches[0];
        touchEndXRef.current = t.clientX;
        if (touchStartYRef.current !== null) {
            const dy = Math.abs(t.clientY - touchStartYRef.current);
            const dx = Math.abs(t.clientX - touchStartXRef.current);
            if (dy > dx && dx < 20) return;
        }
        setSwipeDragX(t.clientX - touchStartXRef.current);
    };

    const handleTouchEnd = () => {
        if (realCount <= 1 || touchStartXRef.current === null) return;
        const startX = touchStartXRef.current;
        const endX = touchEndXRef.current ?? startX;
        const delta = endX - startX;
        setIsSwiping(false);
        setSwipeDragX(0);

        if (delta > SWIPE_THRESHOLD) {
            goPrev();
        } else if (delta < -SWIPE_THRESHOLD) {
            goNext();
        }

        touchStartXRef.current = null;
        touchEndXRef.current = null;
        touchStartYRef.current = null;
    };

    if (banners.length === 0) return null;

    const resolveUrl = (url: string) => url.startsWith('http') ? url : `${API_ROOT}${url}`;

    const renderSlide = (b: Banner, key: string | number) => {
        const inner = (
            <div className="relative w-full flex-shrink-0 aspect-[21/9] md:aspect-[3/1] select-none">
                <img
                    src={resolveUrl(b.imageUrl)}
                    alt={b.title}
                    className="w-full h-full object-cover pointer-events-none select-none"
                    draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                    <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">{b.title}</h2>
                    {b.subtitle && <p className="text-sm md:text-lg text-white/80 drop-shadow">{b.subtitle}</p>}
                </div>
            </div>
        );
        if (b.linkUrl) {
            return (
                <a
                    key={key}
                    href={b.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 w-full block"
                    onClick={(e) => {
                        if (isSwiping) e.preventDefault();
                    }}
                >
                    {inner}
                </a>
            );
        }
        return <div key={key} className="flex-shrink-0 w-full">{inner}</div>;
    };

    if (banners.length === 1) {
        const b = banners[0];
        return (
            <div className="relative w-full overflow-hidden rounded-2xl">
                {renderSlide(b, b.id)}
            </div>
        );
    }

    const cloned: Array<{ key: string | number; banner: Banner }> = [
        ...banners.map((b, i) => ({ key: `real-${i}-${b.id}`, banner: b })),
    ];
    if (banners.length > 1) {
        cloned.unshift({ key: `clone-first-${banners[banners.length - 1].id}`, banner: banners[banners.length - 1] });
        cloned.push({ key: `clone-last-${banners[0].id}`, banner: banners[0] });
    }

    const totalWidthPercent = cloned.length * 100;
    const baseTranslate = -(displayIndex * 100);
    const dragPercent = isSwiping ? (swipeDragX / (trackRef.current?.offsetWidth || 1)) * 100 : 0;
    const currentTranslate = baseTranslate + dragPercent;

    const transitionClass = !transitionEnabledRef.current || isSwiping ? '' : 'transition-transform ease-out';
    const transitionStyle = !transitionEnabledRef.current || isSwiping
        ? { transition: 'none' }
        : { transitionDuration: `${TRANSITION_DURATION}ms`, transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' };

    const togglePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsUserPaused(p => !p);
    };

    const handleDotClick = (idx: number) => {
        if (idx === currentIndex) return;
        goTo(idx);
    };

    return (
        <div
            className="relative w-full group"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div
                className="overflow-hidden rounded-2xl touch-pan-y"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div
                    ref={trackRef}
                    className={`flex ${transitionClass}`}
                    style={{
                        width: `${totalWidthPercent}%`,
                        transform: `translate3d(${currentTranslate / cloned.length * 100}%, 0, 0)`,
                        ...transitionStyle,
                    }}
                >
                    {cloned.map(item => (
                        <div key={item.key} className="w-full" style={{ width: `${100 / cloned.length}%` }}>
                            {renderSlide(item.banner, item.key)}
                        </div>
                    ))}
                </div>
            </div>

            <button
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40 z-10"
                aria-label="上一张"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <button
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40 z-10"
                aria-label="下一张"
            >
                <ChevronRight className="w-5 h-5" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
                <div className="flex gap-2">
                    {banners.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleDotClick(idx)}
                            className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/70'}`}
                            aria-label={`跳转到第 ${idx + 1} 张`}
                        />
                    ))}
                </div>
                <div className="w-px h-4 bg-white/30 mx-1" />
                <button
                    onClick={togglePlayPause}
                    className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
                    aria-label={isUserPaused ? '播放' : '暂停'}
                >
                    {isUserPaused ? <Play className="w-3 h-3 ml-0.5" /> : <Pause className="w-3 h-3" />}
                </button>
            </div>
        </div>
    );
};
