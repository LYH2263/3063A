import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collectionApi } from '../../services/api';
import { FolderOpen } from 'lucide-react';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8063/api').replace(/\/api$/, '');

export const Collections = () => {
    const [collections, setCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCollections = async () => {
        try {
            const res: any = await collectionApi.getCollections();
            setCollections(res.data);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCollections();
    }, []);

    if (loading) {
        return <div className="py-20 text-center text-gray-500">加载中...</div>;
    }

    return (
        <div className="py-8">
            <div className="mb-12 text-center max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold tracking-tight mb-4">作品合集</h1>
                <p className="text-gray-500">按主题精选的作品集，探索系列创作。</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {collections.map((c) => (
                    <Link
                        key={c.id}
                        to={`/collections/${c.id}`}
                        className="group rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100 dark:bg-slate-900 dark:border-gray-800 transition-all hover:shadow-xl hover:-translate-y-1"
                    >
                        <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                            {c.coverUrl ? (
                                <img
                                    src={c.coverUrl.startsWith('http') ? c.coverUrl : `${API_ROOT}${c.coverUrl}`}
                                    alt={c.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <FolderOpen className="w-16 h-16" />
                                </div>
                            )}
                            <div className="absolute top-4 right-4 px-3 py-1.5 bg-white/90 backdrop-blur rounded-full text-sm font-medium shadow-sm">
                                {c.workCount} 个作品
                            </div>
                        </div>
                        <div className="p-5">
                            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                                {c.title}
                            </h3>
                            <p className="text-gray-500 text-sm line-clamp-2">{c.description}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {collections.length === 0 && (
                <div className="text-center py-20 text-gray-500">
                    <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>暂无合集。</p>
                </div>
            )}
        </div>
    );
};
