import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { userApi } from '../../services/api';
import { ArrowLeft, UserCheck, UserPlus, Users, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8063/api').replace(/\/api$/, '');

export const FollowingList = () => {
    const { username } = useParams<{ username: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { success, error: toastError } = useToast();
    const [following, setFollowing] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [targetUser, setTargetUser] = useState<any>(null);
    const [isViewingOwn, setIsViewingOwn] = useState(false);

    useEffect(() => {
        loadFollowing();
    }, [username, user?.id]);

    const loadFollowing = async () => {
        setLoading(true);
        setError('');
        try {
            let res: any;
            if (username) {
                res = await userApi.getUserFollowing(username);
                setIsViewingOwn(user?.username === username);
            } else if (user) {
                res = await userApi.getFollowing();
                setIsViewingOwn(true);
            } else {
                setError('请先登录');
                return;
            }
            setFollowing(res.data.list);
            setTargetUser(res.data.user);
        } catch (err: any) {
            setError(err.message || '获取关注列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleUnfollow = async (userId: number) => {
        if (!user || actionLoading === userId) return;

        setActionLoading(userId);
        try {
            await userApi.unfollowUser(userId);
            setFollowing(prev => prev.filter(f => f.id !== userId));
            success('已取消关注');
        } catch (err: any) {
            toastError(err.message || '取消关注失败');
        } finally {
            setActionLoading(null);
        }
    };

    const handleFollow = async (userId: number) => {
        if (!user || actionLoading === userId) return;

        setActionLoading(userId);
        try {
            await userApi.followUser(userId);
            setFollowing(prev => prev.map(f =>
                f.id === userId ? { ...f, isFollowing: true } : f
            ));
            success('关注成功');
        } catch (err: any) {
            toastError(err.message || '关注失败');
        } finally {
            setActionLoading(null);
        }
    };

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

    const displayName = isViewingOwn ? '我' : (targetUser?.nickname || targetUser?.username || '该用户');

    return (
        <div className="max-w-2xl mx-auto py-10">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-primary mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> 返回
            </button>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="w-6 h-6 text-primary" />
                    {displayName}的关注
                </h1>
                <p className="text-gray-500 text-sm mt-1">共 {following.length} 位关注</p>
            </div>

            <div className="space-y-3">
                {following.map(followedUser => {
                    const userDisplayName = followedUser.nickname || followedUser.username;
                    const isFollowing = followedUser.isFollowing;
                    return (
                        <div
                            key={followedUser.id}
                            className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4"
                        >
                            <Link to={`/u/${followedUser.username}`} className="flex-shrink-0">
                                {followedUser.avatarUrl ? (
                                    <img
                                        src={followedUser.avatarUrl.startsWith('http') ? followedUser.avatarUrl : `${API_ROOT}${followedUser.avatarUrl}`}
                                        alt={userDisplayName}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-12 h-12 bg-gradient-to-tr from-primary to-purple-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                                        {userDisplayName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </Link>
                            <div className="flex-1 min-w-0">
                                <Link to={`/u/${followedUser.username}`} className="font-medium hover:text-primary transition-colors block truncate">
                                    {userDisplayName}
                                </Link>
                                {followedUser.nickname && (
                                    <p className="text-gray-400 text-sm truncate">@{followedUser.username}</p>
                                )}
                                {followedUser.bio && (
                                    <p className="text-gray-500 text-sm mt-0.5 truncate">{followedUser.bio}</p>
                                )}
                            </div>
                            {user && user.id !== followedUser.id && (
                                <button
                                    onClick={() => isFollowing ? handleUnfollow(followedUser.id) : handleFollow(followedUser.id)}
                                    disabled={actionLoading === followedUser.id}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                        isFollowing
                                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700'
                                            : 'bg-primary text-white hover:bg-primary/90 shadow-sm'
                                    }`}
                                >
                                    {actionLoading === followedUser.id ? (
                                        <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                    ) : isFollowing ? (
                                        <>
                                            <UserCheck className="w-4 h-4" />
                                            已关注
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4" />
                                            关注
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    );
                })}
                {following.length === 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                        <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-700 mb-2">
                            {isViewingOwn ? '还没有关注任何人' : `${displayName}还没有关注任何人`}
                        </h3>
                        <p className="text-gray-500 text-sm">去发现更多有趣的用户吧</p>
                    </div>
                )}
            </div>
        </div>
    );
};
