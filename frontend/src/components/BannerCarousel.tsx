import React, { useEffect, useState, useCallback, useRef } from 'react';
import { bannerApi } from '../services/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8063/api').replace(/\/api$/, '');

const AUTO_PLAY_INTERVAL = 4000;

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
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        bannerApi.getPublicBanners()
            .then((res: any) => setBanners(res.data || []))
            .catch(() => setBanners([]));
    }, []);

    const goTo = useCallback((index: number) => {
        if (banners.length <= 1 || isTransitioning) return;
        setIsTransitioning(true);
        setCurrentIndex(index);
        setTimeout(() => setIsTransitioning(false), 500);
    }, [banners.length, isTransitioning]);

    const goNext = useCallback(() => {
        if (banners.length <= 1) return;
        goTo((currentIndex + 1) % banners.length);
    }, [currentIndex, banners.length, goTo]);

    const goPrev = useCallback(() => {
        if (banners.length <= 1) return;
        goTo((currentIndex - 1 + banners.length) % banners.length);
    }, [currentIndex, banners.length, goTo]);

    useEffect(() => {
        if (banners.length <= 1 || isPaused) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }
        timerRef.current = setInterval(goNext, AUTO_PLAY_INTERVAL);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [goNext, isPaused, banners.length]);

    if (banners.length === 0) return null;

    const resolveUrl = (url: string) => url.startsWith('http') ? url : `${API_ROOT}${url}`;

    if (banners.length === 1) {
        const b = banners[0];
        const content = (
            <div className="relative w-full aspect-[21/9] md:aspect-[3/1] overflow-hidden rounded-2xl">
                <img src={resolveUrl(b.imageUrl)} alt={b.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                    <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">{b.title}</h2>
                    {b.subtitle && <p className="text-sm md:text-lg text-white/80 drop-shadow">{b.subtitle}</p>}
                </div>
            </div>
        );
        if (b.linkUrl) {
            return <a href={b.linkUrl} target="_blank" rel="noopener noreferrer" className="block">{content}</a>;
        }
        return content;
    }

    return (
        <div
            className="relative w-full group"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div className="overflow-hidden rounded-2xl">
                <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                    {banners.map((b) => {
                        const inner = (
                            <div key={b.id} className="relative w-full flex-shrink-0 aspect-[21/9] md:aspect-[3/1]">
                                <img src={resolveUrl(b.imageUrl)} alt={b.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                                    <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">{b.title}</h2>
                                    {b.subtitle && <p className="text-sm md:text-lg text-white/80 drop-shadow">{b.subtitle}</p>}
                                </div>
                            </div>
                        );
                        if (b.linkUrl) {
                            return <a key={b.id} href={b.linkUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 w-full">{inner}</a>;
                        }
                        return <div key={b.id} className="flex-shrink-0 w-full">{inner}</div>;
                    })}
                </div>
            </div>

            <button
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
                aria-label="上一张"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <button
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
                aria-label="下一张"
            >
                <ChevronRight className="w-5 h-5" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {banners.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => goTo(idx)}
                        className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/70'}`}
                        aria-label={`跳转到第 ${idx + 1} 张`}
                    />
                ))}
            </div>
        </div>
    );
};
