import React, { useEffect, useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { useStyle } from '../context/StyleContext';
import { friendLinkApi } from '../services/api';
import { AnnouncementBanner } from '../components/AnnouncementBanner';

export const PublicLayout = () => {
    const { user, logout, isAdmin } = useAuth();
    const { style } = useStyle();
    const [friendLinks, setFriendLinks] = useState<any[]>([]);

    useEffect(() => {
        const fetchFriendLinks = async () => {
            try {
                const res: any = await friendLinkApi.getPublicFriendLinks();
                setFriendLinks(res.data || []);
            } catch {
                setFriendLinks([]);
            }
        };
        fetchFriendLinks();
    }, []);

    return (
        <div className={cn("min-h-screen flex flex-col", style?.layoutMode === 'DUAL' ? 'max-w-7xl mx-auto' : '')}>
            <AnnouncementBanner />
            <header className="sticky top-0 z-40 w-full backdrop-blur flex-none transition-colors duration-500 lg:z-50 lg:border-b lg:border-slate-900/10 dark:border-slate-50/[0.06] bg-white/95 supports-backdrop-blur:bg-white/60 dark:bg-transparent">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-6">
                            <Link to="/" className="font-bold text-xl text-primary flex items-center gap-2">
                                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
                                    P
                                </div>
                                独立站
                            </Link>
                            <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-600 dark:text-gray-300">
                                <Link to="/" className="hover:text-primary transition-colors">首页</Link>
                                <Link to="/works" className="hover:text-primary transition-colors">作品集</Link>
                                <Link to="/collections" className="hover:text-primary transition-colors">合集</Link>
                                {user && <Link to={`/u/${user.username}`} className="hover:text-primary transition-colors">个人主页</Link>}
                            </nav>
                        </div>

                        <div className="flex items-center gap-4 text-sm font-medium">
                            {user ? (
                                <>
                                    <Link to={`/u/${user.username}`} className="text-gray-500 dark:text-gray-400 hover:text-primary transition-colors">你好, {user.nickname || user.username}</Link>
                                    <Link to="/profile" className="text-gray-500 dark:text-gray-400 hover:text-primary transition-colors hidden md:inline">个人中心</Link>
                                    {isAdmin && (
                                        <Link to="/admin" className="text-primary hover:underline">管理后台</Link>
                                    )}
                                    <button onClick={logout} className="text-gray-600 hover:text-red-500 transition-colors">
                                        退出登录
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link to="/login" className="text-gray-600 hover:text-primary transition-colors">登录</Link>
                                    <Link to="/register" className="bg-primary text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity">
                                        注册
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>

            <footer className="w-full border-t border-gray-200 dark:border-gray-800 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {friendLinks.length > 0 && (
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">友情链接</div>
                        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                            {friendLinks.map((link) => (
                                <a
                                    key={link.id}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                                    title={link.name}
                                >
                                    {link.logoUrl && (
                                        <img
                                            src={link.logoUrl}
                                            alt={link.name}
                                            className="w-4 h-4 object-contain"
                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                        />
                                    )}
                                    <span>{link.name}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
                &copy; {new Date().getFullYear()} IndieSite 版权所有
            </footer>
        </div>
    );
};

export default PublicLayout;
