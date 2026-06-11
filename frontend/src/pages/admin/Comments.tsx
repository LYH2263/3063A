import React, { useEffect, useState, useCallback } from 'react';
import { commentApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Search, ChevronLeft, ChevronRight, MessageSquare, CheckCircle2, XCircle, Trash2, Link as LinkIcon } from 'lucide-react';

interface CommentParent {
    id: number;
    content: string;
    user: { id: number; username: string };
}

interface AdminComment {
    id: number;
    content: string;
    likeCount: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    userId: number;
    workId: number;
    parentId: number | null;
    user: { id: number; username: string; roleType?: string };
    work: { id: number; title: string };
    parent?: CommentParent | null;
}

export const AdminComments = () => {
    const [comments, setComments] = useState<AdminComment[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [workIdFilter, setWorkIdFilter] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const { success, error } = useToast();
    const PAGE_SIZE = 20;

    const fetchComments = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: PAGE_SIZE };
            if (statusFilter) params.status = statusFilter;
            if (search.trim()) params.search = search.trim();
            if (workIdFilter.trim()) {
                const wid = parseInt(workIdFilter);
                if (!isNaN(wid)) params.workId = wid;
            }
            const res: any = await commentApi.adminGetAllComments(params);
            setComments(res.data.comments || []);
            setTotal(res.data.total || 0);
            setTotalPages(res.data.totalPages || 1);
        } catch (err: any) {
            error(err.message || '获取评论列表失败');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, search, workIdFilter]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    useEffect(() => {
        setPage(1);
        setSelectedIds(new Set());
    }, [statusFilter, search, workIdFilter]);

    const updateStatus = async (id: number, status: string) => {
        try {
            await commentApi.adminUpdateCommentStatus(id, status);
            success(`评论状态已更新为 ${status}`);
            setSelectedIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            fetchComments();
        } catch (err: any) {
            error(err.message || '操作失败');
        }
    };

    const deleteComment = async (c: AdminComment) => {
        const confirmMsg = c.parentId
            ? '确定要删除该回复吗？'
            : '确定要删除该评论及其所有子回复吗？';
        if (!window.confirm(confirmMsg)) return;
        try {
            await commentApi.adminDeleteComment(c.id);
            success('评论已删除');
            fetchComments();
        } catch (err: any) {
            error(err.message || '删除失败');
        }
    };

    const toggleSelect = (id: number, status: string) => {
        if (status !== 'PENDING') return;
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        const pendingIds = comments
            .filter((c) => c.status === 'PENDING')
            .map((c) => c.id);
        const allSelected = pendingIds.length > 0 && pendingIds.every((id) => selectedIds.has(id));
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (allSelected) {
                pendingIds.forEach((id) => next.delete(id));
            } else {
                pendingIds.forEach((id) => next.add(id));
            }
            return next;
        });
    };

    const handleBatchApprove = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`确定要通过选中的 ${selectedIds.size} 条评论吗？`)) return;
        try {
            await commentApi.adminBatchApprove(Array.from(selectedIds));
            success(`已批量通过 ${selectedIds.size} 条评论`);
            setSelectedIds(new Set());
            fetchComments();
        } catch (err: any) {
            error(err.message || '批量通过失败');
        }
    };

    const statusBadge = (status: string) => {
        const map: Record<string, { label: string; cls: string }> = {
            PENDING: { label: '待审核', cls: 'bg-yellow-100 text-yellow-700' },
            APPROVED: { label: '已通过', cls: 'bg-green-100 text-green-700' },
            REJECTED: { label: '已拒绝', cls: 'bg-red-100 text-red-700' },
            DELETED: { label: '已删除', cls: 'bg-gray-100 text-gray-500' },
        };
        const item = map[status] || { label: status, cls: 'bg-gray-100 text-gray-500' };
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.cls}`}>{item.label}</span>;
    };

    const pendingCount = comments.filter((c) => c.status === 'PENDING').length;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-primary" />
                评论管理
                <span className="text-sm font-normal text-gray-500 ml-2">共 {total} 条</span>
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex flex-wrap gap-3 items-center">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                            <option value="">全部状态</option>
                            <option value="PENDING">待审核</option>
                            <option value="APPROVED">已通过</option>
                            <option value="REJECTED">已拒绝</option>
                        </select>

                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="搜索内容..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-10 pl-9 pr-3 w-60 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>

                        <input
                            type="text"
                            placeholder="作品 ID（可选）"
                            value={workIdFilter}
                            onChange={(e) => setWorkIdFilter(e.target.value.replace(/[^\d]/g, ''))}
                            className="h-10 px-3 w-36 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedIds.size > 0 && (
                            <>
                                <span className="text-sm text-gray-500">
                                    已选择 <span className="text-primary font-semibold">{selectedIds.size}</span> 条待审评论
                                </span>
                                <Button size="sm" onClick={handleBatchApprove}>
                                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> 批量通过
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="p-16 text-center text-gray-500">
                        <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-sm">加载中...</p>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="p-16 text-center text-gray-500">
                        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm">暂无评论数据</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <th className="p-4 w-12">
                                        {pendingCount > 0 && (
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-primary border-gray-300 rounded"
                                                checked={pendingCount > 0 && comments.filter((c) => c.status === 'PENDING').every((c) => selectedIds.has(c.id))}
                                                onChange={toggleSelectAll}
                                            />
                                        )}
                                    </th>
                                    <th className="p-4 w-40">用户</th>
                                    <th className="p-4">内容</th>
                                    <th className="p-4 w-48">所属作品</th>
                                    <th className="p-4 w-24">状态</th>
                                    <th className="p-4 w-32 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {comments.map((c) => (
                                    <tr key={c.id} className={`hover:bg-gray-50/50 transition-colors ${c.status === 'PENDING' ? 'bg-yellow-50/30' : ''}`}>
                                        <td className="p-4 align-top">
                                            {c.status === 'PENDING' && (
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-primary border-gray-300 rounded"
                                                    checked={selectedIds.has(c.id)}
                                                    onChange={() => toggleSelect(c.id, c.status)}
                                                />
                                            )}
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white text-xs font-bold">
                                                    {c.user.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{c.user.username}</div>
                                                    <div className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="max-w-xl">
                                                {c.parent && (
                                                    <div className="mb-2 p-2 rounded-lg bg-gray-50 border-l-2 border-gray-200 text-xs text-gray-500">
                                                        <div className="font-medium text-gray-600 mb-0.5">
                                                            回复 @{c.parent.user.username}
                                                        </div>
                                                        <div className="line-clamp-2 text-gray-500">{c.parent.content}</div>
                                                    </div>
                                                )}
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                                                    {c.content}
                                                </p>
                                                <div className="mt-1 text-xs text-gray-400 flex items-center gap-3">
                                                    <span>#{c.id}</span>
                                                    <span>👍 {c.likeCount}</span>
                                                    {c.parentId && <span>回复 ID: {c.parentId}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <a
                                                href={`/works/${c.work.id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-sm text-gray-700 hover:text-primary transition-colors inline-flex items-center gap-1 max-w-40"
                                            >
                                                <LinkIcon className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">{c.work.title}</span>
                                            </a>
                                            <div className="text-xs text-gray-400 mt-1">ID: {c.work.id}</div>
                                        </td>
                                        <td className="p-4 align-top">{statusBadge(c.status)}</td>
                                        <td className="p-4 align-top">
                                            <div className="flex justify-end gap-1.5 flex-wrap">
                                                {c.status === 'PENDING' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => updateStatus(c.id, 'APPROVED')}
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 通过
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="danger"
                                                            onClick={() => updateStatus(c.id, 'REJECTED')}
                                                        >
                                                            <XCircle className="w-3.5 h-3.5 mr-1" /> 拒绝
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => deleteComment(c)}
                                                    className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 mr-1" /> 删除
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 flex items-center justify-center gap-2">
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
                                                : 'text-gray-600 hover:bg-gray-100'
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
        </div>
    );
};
