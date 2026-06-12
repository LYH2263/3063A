import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { userApi } from '../../services/api';
import { Heart, Star, Calendar, ArrowLeft, Eye, UserCircle, UserPlus, UserCheck, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8063/api').replace(/\/api$/, '');

export const UserPublicProfile = () => {
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { success, error: toastError } = useToast();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'favorites' | 'likes'>('favorites');
    const [isFollowing, setIsFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!username) return;
        setLoading(true);
        setError('');
        userApi.getPublicProfile(username)
            .then((res: any) => {
                setProfile(res.data);
                setIsFollowing(res.data.isFollowing || false);
                setFollowerCount(res.data.followerCount || 0);
                setFollowingCount(res.data.followingCount || 0);
            })
            .catch((err: any) => {
                setError(err.message || '获取用户信息失败');
            })
            .finally(() => setLoading(false));
    }, [username]);

    const handleFollow = async () => {
        if (!user || !profile?.id || actionLoading) return;
        if (user.id === profile.id) return;

        setActionLoading(true);
        try {
            const res: any = await userApi.followUser(profile.id);
            setIsFollowing(true);
            setFollowerCount(res.data.followerCount);
            success('关注成功');
        } catch (err: any) {
            toastError(err.message || '关注失败');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnfollow = async () => {
        if (!user || !profile?.id || actionLoading) return;
        if (user.id === profile.id) return;

        setActionLoading(true);
        try {
            const res: any = await userApi.unfollowUser(profile.id);
            setIsFollowing(false);
            setFollowerCount(res.data.followerCount);
            success('已取消关注');
        } catch (err: any) {
            toastError(err.message || '取消关注失败');
        } finally {
            setActionLoading(false);
        }
    };

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
    const isOwnProfile = user && user.id === profile.id;

    return (
        <div className="max-w-4xl mx-auto py-10">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-primary mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> 返回
            </button>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
                {profile.avatarUrl ? (
                    <img
                        src={profile.avatarUrl.startsWith('http') ? profile.avatarUrl : `${API_ROOT}${profile.avatarUrl}`}
                        alt={displayName}
                        className="w-24 h-24 rounded-full object-cover shadow-lg flex-shrink-0"
                    />
                ) : (
                    <div className="w-24 h-24 bg-gradient-to-tr from-primary to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg flex-shrink-0">
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className="flex-1 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold">{displayName}</h1>
                            {profile.nickname && (
                                <p className="text-gray-400 text-sm mt-0.5">@{profile.username}</p>
                            )}
                            {profile.bio && (
                                <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-lg">{profile.bio}</p>
                            )}
                        </div>
                        {user && !isOwnProfile && (
                            <button
                                onClick={isFollowing ? handleUnfollow : handleFollow}
                                disabled={actionLoading}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all ${
                                    isFollowing
                                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700'
                                        : 'bg-primary text-white hover:bg-primary/90 shadow-sm'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {isFollowing ? (
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
                    <div className="flex items-center flex-wrap gap-4 mt-4 text-sm">
                        <span className="flex items-center gap-1 text-gray-500">
                            <Calendar className="w-4 h-4" />
                            加入于 {new Date(profile.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                        <Link
                            to="/profile/following"
                            className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors"
                            onClick={(e) => { if (!isOwnProfile) e.preventDefault(); }}
                            style={{ pointerEvents: isOwnProfile ? 'auto' : 'none', opacity: isOwnProfile ? 1 : 0.6 }}
                        >
                            <Users className="w-4 h-4" />
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{followingCount}</span> 关注
                        </Link>
                        <Link
                            to="/profile/followers"
                            className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors"
                            onClick={(e) => { if (!isOwnProfile) e.preventDefault(); }}
                            style={{ pointerEvents: isOwnProfile ? 'auto' : 'none', opacity: isOwnProfile ? 1 : 0.6 }}
                        >
                            <Users className="w-4 h-4" />
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{followerCount}</span> 粉丝
                        </Link>
                        <span className="flex items-center gap-1 text-gray-500">
                            <Star className="w-4 h-4 text-yellow-500" />
                            {profile.favoritedWorks?.length || 0} 收藏
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
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
