import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { userApi } from '../../services/api';
import { Heart, Star, Calendar, ArrowLeft, Eye, UserCircle } from 'lucide-react';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8063/api').replace(/\/api$/, '');

export const UserPublicProfile = () => {
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'favorites' | 'likes'>('favorites');

    useEffect(() => {
        if (!username) return;
        setLoading(true);
        setError('');
        userApi.getPublicProfile(username)
            .then((res: any) => {
                setProfile(res.data);
            })
            .catch((err: any) => {
                setError(err.message || '获取用户信息失败');
            })
            .finally(() => setLoading(false));
    }, [username]);

    if (loading) {
        return <div className="py-20 text-center text-gray-500">加载中...</div>;
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto py-10">
                <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-primary mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> 返回
                </button>
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-700 mb-2">{error}</h2>
                    <p className="text-gray-500">该用户的主页暂时无法访问</p>
                </div>
            </div>
        );
    }

    if (!profile) return null;

    const displayName = profile.nickname || profile.username;
    const currentList = activeTab === 'favorites' ? profile.favoritedWorks : profile.likedWorks;

    return (
        <div className="max-w-4xl mx-auto py-10">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-primary mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> 返回
            </button>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-6 mb-8">
                {profile.avatarUrl ? (
                    <img
                        src={profile.avatarUrl.startsWith('http') ? profile.avatarUrl : `${API_ROOT}${profile.avatarUrl}`}
                        alt={displayName}
                        className="w-24 h-24 rounded-full object-cover shadow-lg"
                    />
                ) : (
                    <div className="w-24 h-24 bg-gradient-to-tr from-primary to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                )}
                <div>
                    <h1 className="text-3xl font-bold">{displayName}</h1>
                    {profile.nickname && (
                        <p className="text-gray-400 text-sm mt-0.5">@{profile.username}</p>
                    )}
                    {profile.bio && (
                        <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-lg">{profile.bio}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            加入于 {new Date(profile.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                        <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            {profile.favoritedWorks?.length || 0} 收藏
                        </span>
                        <span className="flex items-center gap-1">
                            <Heart className="w-4 h-4 text-red-500" />
                            {profile.likedWorks?.length || 0} 点赞
                        </span>
                    </div>
                </div>
            </div>

            <div className="mb-6 flex gap-2">
                <button
                    onClick={() => setActiveTab('favorites')}
                    className={`px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'favorites' ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700'}`}
                >
                    <Star className="w-4 h-4 inline mr-1.5" />
                    收藏的作品
                </button>
                <button
                    onClick={() => setActiveTab('likes')}
                    className={`px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'likes' ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700'}`}
                >
                    <Heart className="w-4 h-4 inline mr-1.5" />
                    点赞的作品
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentList?.map((work: any) => (
                    <Link
                        key={work.id}
                        to={`/works/${work.id}`}
                        className="group bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow"
                    >
                        {work.mediaUrl && (
                            <div className="aspect-video bg-gray-100 overflow-hidden">
                                <img
                                    src={work.mediaUrl.startsWith('http') ? work.mediaUrl : `${API_ROOT}${work.mediaUrl}`}
                                    alt={work.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>
                        )}
                        <div className="p-4">
                            <h3 className="font-bold text-gray-900 dark:text-white truncate">{work.title}</h3>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 rounded-full">{work.category}</span>
                                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {work.viewCount}</span>
                            </div>
                        </div>
                    </Link>
                ))}
                {(!currentList || currentList.length === 0) && (
                    <div className="col-span-full py-12 text-center text-gray-400">
                        {activeTab === 'favorites' ? '暂无公开收藏的作品' : '暂无公开点赞的作品'}
                    </div>
                )}
            </div>
        </div>
    );
};
