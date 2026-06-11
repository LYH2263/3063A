import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Clock, Flame, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { commentApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../ui/Button';
import { CommentItem, CommentData } from './CommentItem';

interface CommentSectionProps {
    workId: number;
    initialTotal?: number;
    onTotalChange?: (total: number) => void;
}

type SortType = 'time' | 'hot';

export const CommentSection: React.FC<CommentSectionProps> = ({
    workId,
    initialTotal = 0,
    onTotalChange,
}) => {
    const { user } = useAuth();
    const { success, error, toast } = useToast();

    const [comments, setComments] = useState<CommentData[]>([]);
    const [total, setTotal] = useState(initialTotal);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sort, setSort] = useState<SortType>('time');
    const [loading, setLoading] = useState(false);

    const [newContent, setNewContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const PAGE_SIZE = 5;

    const fetchComments = useCallback(async () => {
        setLoading(true);
        try {
            const res: any = await commentApi.getWorkComments(workId, {
                page,
                limit: PAGE_SIZE,
                sort,
            });
            setComments(res.data.comments || []);
            setTotal(res.data.total || 0);
            setTotalPages(res.data.totalPages || 1);
            onTotalChange?.(res.data.total || 0);
        } catch (err: any) {
            error(err.message || '加载评论失败');
        } finally {
            setLoading(false);
        }
    }, [workId, page, sort]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    useEffect(() => {
        setPage(1);
    }, [sort]);

    const handleSubmitComment = async () => {
        if (!user) {
            toast('请先登录以发表评论', 'info');
            return;
        }
        const content = newContent.trim();
        if (!content) {
            error('请输入评论内容');
            return;
        }
        if (content.length > 2000) {
            error('评论内容过长（最多 2000 字）');
            return;
        }
        setSubmitting(true);
        try {
            const res: any = await commentApi.createComment(workId, { content });
            setNewContent('');
            if (res.data && res.data.status === 'APPROVED') {
                success(res.message || '评论发表成功');
                if (page === 1) {
                    setComments((prev) => [res.data, ...prev]);
                }
                setTotal((t) => t + 1);
                onTotalChange?.(total + 1);
            } else {
                toast(res.message || '评论已提交，等待审核', 'info');
            }
        } catch (err: any) {
            error(err.message || '评论发表失败');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteSuccess = useCallback((deletedCount: number) => {
        setComments((prev) => {
            const removed = new Set<number>();
            const markRemoved = (items: CommentData[]) => {
                items.forEach((c) => {
                    removed.add(c.id);
                    if (c.children && c.children.length > 0) {
                        markRemoved(c.children);
                    }
                });
            };
            const filter = (items: CommentData[]): CommentData[] => {
                return items
                    .filter((c) => !removed.has(c.id))
                    .map((c) => ({
                        ...c,
                        children: c.children ? filter(c.children) : [],
                    }));
            };
            markRemoved(prev);
            return filter(prev);
        });
        setTotal((t) => Math.max(0, t - deletedCount));
        onTotalChange?.(Math.max(0, total - deletedCount));
    }, [total, onTotalChange]);

    const handleReplySuccess = useCallback((_newComment: CommentData) => {
        setTotal((t) => t + 1);
        onTotalChange?.(total + 1);
    }, [total, onTotalChange]);

    const handleRefreshAfterDelete = () => {
        fetchComments();
    };

    return (
        <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-primary" />
                    评论 <span className="text-primary">{total}</span>
                </h2>

                <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 p-1 rounded-lg">
                    <button
                        onClick={() => setSort('time')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                            sort === 'time'
                                ? 'bg-white dark:bg-slate-700 shadow text-primary'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        最新
                    </button>
                    <button
                        onClick={() => setSort('hot')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                            sort === 'hot'
                                ? 'bg-white dark:bg-slate-700 shadow text-primary'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        <Flame className="w-3.5 h-3.5" />
                        最热
                    </button>
                </div>
            </div>

            {user ? (
                <div className="mb-8 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white font-bold shadow-sm">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <textarea
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                placeholder="说点什么吧..."
                                rows={4}
                                maxLength={2000}
                                className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400 transition-all"
                                onKeyDown={(e) => {
                                    if (e.ctrlKey && e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSubmitComment();
                                    }
                                }}
                            />
                            <div className="mt-3 flex items-center justify-between">
                                <div className="text-xs text-gray-400">
                                    {newContent.length}/2000 · Ctrl+Enter 发送
                                </div>
                                <Button
                                    type="button"
                                    isLoading={submitting}
                                    onClick={handleSubmitComment}
                                    disabled={!newContent.trim()}
                                >
                                    <Send className="w-4 h-4 mr-2" /> 发表评论
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mb-8 p-6 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-2xl border border-primary/20 text-center">
                    <p className="text-gray-600 dark:text-gray-300 mb-3">
                        登录后即可参与评论互动
                    </p>
                    <div className="flex gap-3 justify-center">
                        <a
                            href="/login"
                            className="inline-flex items-center gap-1.5 px-5 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
                        >
                            去登录
                        </a>
                        <a
                            href="/register"
                            className="inline-flex items-center gap-1.5 px-5 py-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 rounded-lg font-medium text-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            注册账号
                        </a>
                    </div>
                </div>
            )}

            <div className="space-y-1">
                {loading ? (
                    <div className="py-16 text-center text-gray-500">
                        <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-sm">加载评论中...</p>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="py-16 text-center">
                        <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">暂无评论，快来抢沙发吧～</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                        {comments.map((c) => (
                            <CommentItem
                                key={c.id}
                                comment={c}
                                onDeleteSuccess={(dc) => {
                                    handleDeleteSuccess(dc);
                                    handleRefreshAfterDelete();
                                }}
                                onReplySuccess={handleReplySuccess}
                            />
                        ))}
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {(() => {
                        const pages: (number | '...')[] = [];
                        const add = (p: number | '...') => pages.push(p);
                        const window = 1;
                        for (let i = 1; i <= totalPages; i++) {
                            if (
                                i === 1 ||
                                i === totalPages ||
                                (i >= page - window && i <= page + window)
                            ) {
                                add(i);
                            } else if (pages[pages.length - 1] !== '...') {
                                add('...');
                            }
                        }
                        return pages.map((p, i) =>
                            p === '...' ? (
                                <span key={`e${i}`} className="w-9 h-9 flex items-center justify-center text-gray-400">
                                    …
                                </span>
                            ) : (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                                        page === p
                                            ? 'bg-primary text-white shadow-md'
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {p}
                                </button>
                            )
                        );
                    })()}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}
        </div>
    );
};
