import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { userApi } from '../../services/api';
import { ArrowLeft, UserCheck, UserPlus, Users, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Navigate } from 'react-router-dom';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8063/api').replace(/\/api$/, '');

export const FollowersList = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { success, error: toastError } = useToast();
    const [followers, setFollowers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    useEffect(() => {
        loadFollowers();
    }, []);

    const loadFollowers = async () => {
        setLoading(true);
        setError('');
        try {
            const res: any = await userApi.getFollowers();
            setFollowers(res.data.list);
        } catch (err: any) {
            setError(err.message || '获取粉丝列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async (userId: number) => {
        if (!user || actionLoading === userId) return;

        setActionLoading(userId);
        try {
            await userApi.followUser(userId);
            setFollowers(prev => prev.map(f =>
                f.id === userId ? { ...f, isFollowing: true } : f
            ));
            success('关注成功');
        } catch (err: any) {
            toastError(err.message || '关注失败');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnfollow = async (userId: number) => {
        if (!user || actionLoading === userId) return;

        setActionLoading(userId);
        try {
            await userApi.unfollowUser(userId);
            setFollowers(prev => prev.map(f =>
                f.id === userId ? { ...f, isFollowing: false } : f
            ));
            success('已取消关注');
        } catch (err: any) {
            toastError(err.message || '取消关注失败');
        } finally {
            setActionLoading(null);
        }
    };

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (loading) {
        return <div className="py-20 text-center text-gray-500">加载中...</div>;
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto py-10">
                <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-primary mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> 返回
                </button>
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-700 mb-2">{error}</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-10">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-primary mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> 返回
            </button>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="w-6 h-6 text-primary" />
                    我的粉丝
                </h1>
                <p className="text-gray-500 text-sm mt-1">共 {followers.length} 位粉丝</p>
            </div>

            <div className="space-y-3">
                {followers.map(follower => {
                    const displayName = follower.nickname || follower.username;
                    const isFollowing = follower.isFollowing;
                    return (
                        <div
                            key={follower.id}
                            className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4"
                        >
                            <Link to={`/u/${follower.username}`} className="flex-shrink-0">
                                {follower.avatarUrl ? (
                                    <img
                                        src={follower.avatarUrl.startsWith('http') ? follower.avatarUrl : `${API_ROOT}${follower.avatarUrl}`}
                                        alt={displayName}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-12 h-12 bg-gradient-to-tr from-primary to-purple-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </Link>
                            <div className="flex-1 min-w-0">
                                <Link to={`/u/${follower.username}`} className="font-medium hover:text-primary transition-colors block truncate">
                                    {displayName}
                                </Link>
                                {follower.nickname && (
                                    <p className="text-gray-400 text-sm truncate">@{follower.username}</p>
                                )}
                                {follower.bio && (
                                    <p className="text-gray-500 text-sm mt-0.5 truncate">{follower.bio}</p>
                                )}
                            </div>
                            <button
                                onClick={() => isFollowing ? handleUnfollow(follower.id) : handleFollow(follower.id)}
                                disabled={actionLoading === follower.id}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isFollowing
                                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700'
                                        : 'bg-primary text-white hover:bg-primary/90 shadow-sm'
                                }`}
                            >
                                {actionLoading === follower.id ? (
                                    <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                ) : isFollowing ? (
                                    <>
                                        <UserCheck className="w-4 h-4" />
                                        已关注
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-4 h-4" />
                                        回关
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
                {followers.length === 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-700 mb-2">还没有粉丝</h3>
                        <p className="text-gray-500 text-sm">期待更多人关注你</p>
                    </div>
                )}
            </div>
        </div>
    );
};
