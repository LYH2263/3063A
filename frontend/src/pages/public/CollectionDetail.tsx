import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { collectionApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { ArrowLeft, FolderOpen, Eye, MessageSquare } from 'lucide-react';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8063/api').replace(/\/api$/, '');

export const CollectionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [collection, setCollection] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const collectionId = parseInt(id as string);

    const fetchCollection = async () => {
        if (isNaN(collectionId)) {
            toast('无效的合集ID', 'error');
            navigate('/collections');
            return;
        }
        try {
            const res: any = await collectionApi.getCollectionDetail(collectionId);
            setCollection(res.data);
        } catch (err: any) {
            toast(err.message || '获取合集详情失败', 'error');
            navigate('/collections');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCollection();
    }, [id]);

    if (loading) {
        return <div className="py-20 text-center text-gray-500">加载中...</div>;
    }

    if (!collection) return null;

    return (
        <div className="max-w-6xl mx-auto py-10 px-4">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-500 hover:text-primary mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-2" /> 返回合集列表
            </button>

            {/* Collection Header */}
            <div className="mb-12">
                <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-800 aspect-[3/1] mb-6">
                    {collection.coverUrl ? (
                        <img
                            src={collection.coverUrl.startsWith('http') ? collection.coverUrl : `${API_ROOT}${collection.coverUrl}`}
                            alt={collection.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <FolderOpen className="w-20 h-20" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                        <h1 className="text-4xl font-bold mb-2">{collection.title}</h1>
                        <p className="text-white/80 text-lg">{collection.description}</p>
                        <div className="mt-4 flex items-center gap-2 text-white/70 text-sm">
                            <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full">
                                {collection.workCount} 个作品
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Works Grid */}
            {collection.works.length > 0 ? (
                <div>
                    <h2 className="text-2xl font-bold mb-6">合集作品</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {collection.works.map((w: any, index: number) => (
                            <div
                                key={w.id}
                                className="group rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100 dark:bg-slate-900 dark:border-gray-800 transition-all hover:shadow-xl hover:-translate-y-1"
                            >
                                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                                    <Link to={`/works/${w.id}`} className="block w-full h-full">
                                        {w.mediaUrl ? (
                                            <img
                                                src={w.mediaUrl.startsWith('http') ? w.mediaUrl : `${API_ROOT}${w.mediaUrl}`}
                                                alt={w.title}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                暂无图片
                                            </div>
                                        )}
                                    </Link>
                                    <div className="absolute top-4 left-4 px-2.5 py-1 bg-white/90 backdrop-blur rounded-full text-xs font-medium shadow-sm">
                                        #{index + 1}
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="text-xl font-bold mb-2 hover:text-primary transition-colors">
                                        <Link to={`/works/${w.id}`}>{w.title}</Link>
                                    </h3>
                                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{w.description}</p>
                                    <div className="flex items-center justify-between text-xs font-medium text-gray-400">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-1">
                                                <MessageSquare className="w-3.5 h-3.5" /> {w.commentCount || 0}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Eye className="w-3.5 h-3.5" /> {w.viewCount}
                                            </span>
                                        </div>
                                        <span className="px-2 py-1 bg-gray-100 rounded dark:bg-gray-800">
                                            {w.category}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 text-gray-500 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg">这个合集暂时还没有公开的作品</p>
                    <p className="text-sm text-gray-400 mt-2">管理员正在整理中，敬请期待！</p>
                </div>
            )}
        </div>
    );
};
