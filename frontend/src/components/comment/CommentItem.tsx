import React, { useState } from 'react';
import { ChevronDown, ChevronRight, MessageSquare, ThumbsUp, Trash2, Send, X } from 'lucide-react';
import { commentApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../ui/Button';
import { isAdminRole } from '../../lib/role';

interface CommentUser {
    id: number;
    username: string;
    roleType?: string;
}

export interface CommentData {
    id: number;
    content: string;
    likeCount: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    userId: number;
    workId: number;
    parentId: number | null;
    user: CommentUser;
    children?: CommentData[];
}

interface CommentItemProps {
    comment: CommentData;
    depth?: number;
    onDeleteSuccess?: (deletedCount: number) => void;
    onReplySuccess?: (newComment: CommentData) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({
    comment,
    depth = 0,
    onDeleteSuccess,
    onReplySuccess,
}) => {
    const { user } = useAuth();
    const { success, error, toast } = useToast();
    const [childrenExpanded, setChildrenExpanded] = useState(true);
    const [replyOpen, setReplyOpen] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [submittingReply, setSubmittingReply] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(comment.likeCount);

    const hasChildren = comment.children && comment.children.length > 0;
    const canDelete = user && (user.id === comment.userId || isAdminRole(user.roleType));
    const maxDepth = 4;

    const handleLike = async () => {
        if (!user) {
            toast('请先登录以点赞评论', 'info');
            return;
        }
        if (liked) return;
        try {
            const res: any = await commentApi.likeComment(comment.id);
            setLikeCount(res.data.likeCount);
            setLiked(true);
        } catch (err: any) {
            error(err.message || '点赞失败');
        }
    };

    const handleSubmitReply = async () => {
        if (!user) {
            toast('请先登录以发表评论', 'info');
            return;
        }
        const content = replyContent.trim();
        if (!content) {
            error('请输入回复内容');
            return;
        }
        if (content.length > 2000) {
            error('回复内容过长（最多 2000 字）');
            return;
        }
        setSubmittingReply(true);
        try {
            const res: any = await commentApi.createComment(comment.workId, {
                content,
                parentId: comment.id,
            });
            setReplyContent('');
            setReplyOpen(false);
            if (res.data && res.data.status === 'APPROVED') {
                setChildrenExpanded(true);
                onReplySuccess?.(res.data);
            }
            success(res.message || '回复发表成功');
        } catch (err: any) {
            error(err.message || '回复失败');
        } finally {
            setSubmittingReply(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(hasChildren ? '确定要删除该评论及其所有子回复吗？' : '确定要删除该评论吗？')) {
            return;
        }
        try {
            const res: any = await commentApi.deleteComment(comment.id);
            success(res.message || '评论已删除');
            onDeleteSuccess?.(res.data?.deletedCount || 1);
        } catch (err: any) {
            error(err.message || '删除失败');
        }
    };

    const marginLeft = depth > 0 ? Math.min(depth, maxDepth) * 24 : 0;
    const showBorder = depth > 0;

    return (
        <div className="group" style={{ marginLeft }}>
            <div className={`relative py-5 ${showBorder ? 'pl-5 border-l-2 border-gray-100 dark:border-gray-800' : ''}`}>
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {comment.user.username.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-2">
                            <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                {comment.user.username}
                            </span>
                            {comment.user.roleType && isAdminRole(comment.user.roleType) && (
                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                    管理员
                                </span>
                            )}
                            <span className="text-xs text-gray-400">
                                {new Date(comment.createdAt).toLocaleString()}
                            </span>
                        </div>

                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3 whitespace-pre-wrap break-words">
                            {comment.content}
                        </p>

                        <div className="flex items-center gap-5 text-xs text-gray-500">
                            <button
                                onClick={handleLike}
                                className={`flex items-center gap-1.5 hover:text-red-500 transition-colors ${liked ? 'text-red-500' : ''}`}
                            >
                                <ThumbsUp className={`w-3.5 h-3.5 ${liked ? 'fill-red-500' : ''}`} />
                                <span>{likeCount > 0 ? likeCount : '点赞'}</span>
                            </button>

                            <button
                                onClick={() => {
                                    if (!user) {
                                        toast('请先登录以发表回复', 'info');
                                        return;
                                    }
                                    setReplyOpen(!replyOpen);
                                }}
                                className="flex items-center gap-1.5 hover:text-primary transition-colors"
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>回复</span>
                            </button>

                            {hasChildren && (
                                <button
                                    onClick={() => setChildrenExpanded(!childrenExpanded)}
                                    className="flex items-center gap-1 hover:text-primary transition-colors"
                                >
                                    {childrenExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    <span>{comment.children!.length} 条回复</span>
                                </button>
                            )}

                            {canDelete && (
                                <button
                                    onClick={handleDelete}
                                    className="flex items-center gap-1.5 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ml-auto"
                                    title="删除评论"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>删除</span>
                                </button>
                            )}
                        </div>

                        {replyOpen && (
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                <textarea
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder={`回复 @${comment.user.username}...`}
                                    rows={3}
                                    maxLength={2000}
                                    className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400"
                                />
                                <div className="mt-3 flex items-center justify-between">
                                    <div className="text-xs text-gray-400">
                                        {replyContent.length}/2000
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setReplyOpen(false);
                                                setReplyContent('');
                                            }}
                                        >
                                            <X className="w-3.5 h-3.5 mr-1" /> 取消
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            isLoading={submittingReply}
                                            onClick={handleSubmitReply}
                                            disabled={!replyContent.trim()}
                                        >
                                            <Send className="w-3.5 h-3.5 mr-1" /> 发送
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {hasChildren && childrenExpanded && (
                <div className="mt-1 space-y-0">
                    {comment.children!.map((child) => (
                        <CommentItem
                            key={child.id}
                            comment={child}
                            depth={depth + 1}
                            onDeleteSuccess={onDeleteSuccess}
                            onReplySuccess={onReplySuccess}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
