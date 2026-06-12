import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { userApi } from '../../services/api';
import api from '../../services/api';
import { Heart, MessageSquare, User, Camera, Link as LinkIcon, Users } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8063/api').replace(/\/api$/, '');

export const Profile = () => {
    const { user, updateUser } = useAuth();
    const { success, error } = useToast();
    const [favorites, setFavorites] = useState<any[]>([]);
    const [message, setMessage] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [nickname, setNickname] = useState(user?.nickname || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
    const [uploading, setUploading] = useState(false);
    const [followingCount, setFollowingCount] = useState(0);
    const [followerCount, setFollowerCount] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    useEffect(() => {
        Promise.all([
            api.get('/works/user/favorites')
                .then((res: any) => setFavorites(res.data))
                .catch(console.error),
            userApi.getFollowCounts(user.id)
                .then((res: any) => {
                    setFollowingCount(res.data.followingCount);
                    setFollowerCount(res.data.followerCount);
                })
                .catch(console.error),
        ]);
    }, [user?.id]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            error('图片大小不能超过 5MB');
            return;
        }

        setUploading(true);
        try {
            const res: any = await userApi.uploadAvatar(file);
            const newUrl = res.data.url;
            setAvatarUrl(newUrl);
            await userApi.updateProfile({ avatarUrl: newUrl });
            updateUser({ avatarUrl: newUrl });
            success('头像更新成功');
        } catch (err: any) {
            error(err.message || '头像上传失败');
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const updateData: any = { nickname, bio };
            if (password) {
                if (password.length < 6) {
                    error('密码长度至少需要 6 个字符');
                    return;
                }
                if (password !== passwordConfirm) {
                    error('两次输入的密码不一致');
                    return;
                }
                updateData.password = password;
            }
            const res: any = await userApi.updateProfile(updateData);
            updateUser(res.data);
            success('资料修改成功');
            setPassword('');
            setPasswordConfirm('');
        } catch (err: any) {
            error(err.message || '资料修改失败');
        }
    };

    const handleLeaveMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        try {
            await api.post('/messages', { content: message });
            success('留言已提交，等待管理员审核。');
            setMessage('');
        } catch (err: any) {
            error(err.message || '留言提交失败');
        }
    };

    const displayName = user.nickname || user.username;

    return (
        <div className="max-w-4xl mx-auto py-10 space-y-8">

            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="relative group">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl.startsWith('http') ? avatarUrl : `${API_ROOT}${avatarUrl}`}
                            alt={displayName}
                            className="w-24 h-24 rounded-full object-cover shadow-lg"
                        />
                    ) : (
                        <div className="w-24 h-24 bg-gradient-to-tr from-primary to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                        <Camera className="w-6 h-6 text-white" />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                    />
                </div>
                <div className="flex-1 w-full">
                    <h1 className="text-3xl font-bold">{displayName}</h1>
                    {user.nickname && <p className="text-gray-400 text-sm mt-0.5">@{user.username}</p>}
                    <p className="text-gray-500 mt-1 capitalize">{user.roleType.toLowerCase()} 账号</p>
                    <div className="flex items-center flex-wrap gap-4 mt-3">
                        <Link
                            to="/profile/following"
                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors"
                        >
                            <Users className="w-4 h-4" />
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{followingCount}</span> 关注
                        </Link>
                        <Link
                            to="/profile/followers"
                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors"
                        >
                            <Users className="w-4 h-4" />
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{followerCount}</span> 粉丝
                        </Link>
                        <Link
                            to={`/u/${user.username}`}
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                            <LinkIcon className="w-3 h-3" /> 查看我的公开主页
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                <div>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <Heart className="w-6 h-6 text-red-500 fill-red-500" /> 我的收藏
                    </h2>
                    <div className="space-y-4">
                        {favorites.map(f => (
                            <Link key={f.id} to={`/works/${f.id}`} className="flex gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 items-center hover:shadow-md transition-shadow">
                                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                    {f.mediaUrl && <img src={f.mediaUrl.startsWith('http') ? f.mediaUrl : `${API_ROOT}${f.mediaUrl}`} className="w-full h-full object-cover" alt="thumb" />}
                                </div>
                                <div>
                                    <h4 className="font-bold">{f.title}</h4>
                                    <p className="text-xs text-gray-500 mt-1">{f.category}</p>
                                </div>
                            </Link>
                        ))}
                        {favorites.length === 0 && <p className="text-gray-500 italic">暂无收藏。</p>}
                    </div>
                </div>

                <div>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <User className="w-6 h-6 text-blue-500" /> 修改资料
                    </h2>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <Input
                                label="昵称"
                                placeholder="设置你的昵称"
                                value={nickname}
                                onChange={e => setNickname(e.target.value)}
                            />
                            <div className="w-full">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">个人简介</label>
                                <textarea
                                    className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none resize-none dark:border-gray-700 dark:bg-slate-900 dark:text-gray-50"
                                    value={bio}
                                    onChange={e => setBio(e.target.value)}
                                    placeholder="介绍一下自己..."
                                    maxLength={200}
                                />
                            </div>
                            <div className="border-t pt-4 mt-4 dark:border-gray-700">
                                <p className="text-sm text-gray-500 mb-3">修改密码（留空则不修改）</p>
                                <div className="space-y-3">
                                    <Input
                                        type="password"
                                        label="新密码"
                                        placeholder="输入新密码 (最少6个字符)"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                    <Input
                                        type="password"
                                        label="确认新密码"
                                        placeholder="再次输入新密码"
                                        value={passwordConfirm}
                                        onChange={e => setPasswordConfirm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full">保存修改</Button>
                        </form>
                    </div>

                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-primary" /> 留言板
                    </h2>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <form onSubmit={handleLeaveMessage} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">写点什么给管理员...</label>
                                <textarea
                                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none resize-none dark:border-gray-700 dark:bg-slate-900 dark:text-gray-50"
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder="您的留言..."
                                />
                            </div>
                            <Button type="submit" className="w-full">提交留言</Button>
                        </form>
                    </div>
                </div>
            </div>

        </div>
    );
};
