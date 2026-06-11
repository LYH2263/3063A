import React, { useEffect, useState } from 'react';
import { workApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Trash2, RotateCcw, Info } from 'lucide-react';

const getStatusText = (status: string) => {
    switch (status) {
        case 'PUBLISHED': return '已发布';
        case 'DRAFT': return '草稿';
        case 'PENDING_REVIEW': return '待审核';
        case 'REJECTED': return '已驳回';
        default: return status;
    }
};

const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case 'PUBLISHED': return 'bg-green-100 text-green-700';
        case 'DRAFT': return 'bg-yellow-100 text-yellow-700';
        case 'PENDING_REVIEW': return 'bg-blue-100 text-blue-700';
        case 'REJECTED': return 'bg-red-100 text-red-700';
        default: return 'bg-gray-100 text-gray-700';
    }
};

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
};

export const AdminRecycleBin = () => {
    const [works, setWorks] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [retentionDays, setRetentionDays] = useState(30);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
    const [permanentDeleteConfirmOpen, setPermanentDeleteConfirmOpen] = useState(false);
    const [targetWork, setTargetWork] = useState<{ id: number; title: string } | null>(null);
    const [isBatchMode, setIsBatchMode] = useState(false);

    const { success, error } = useToast();

    const fetchRecycleBin = async () => {
        try {
            const res: any = await workApi.adminGetRecycleBin({ page, limit });
            setWorks(res.data.works);
            setTotal(res.data.total);
            setRetentionDays(res.data.retentionDays);
        } catch (err: any) {
            error(err.message || '加载回收站失败');
        }
    };

    useEffect(() => {
        fetchRecycleBin();
    }, [page]);

    useEffect(() => {
        setSelectedIds([]);
    }, [page]);

    const handleRestore = (work: any) => {
        setTargetWork({ id: work.id, title: work.title });
        setIsBatchMode(false);
        setRestoreConfirmOpen(true);
    };

    const handlePermanentDelete = (work: any) => {
        setTargetWork({ id: work.id, title: work.title });
        setIsBatchMode(false);
        setPermanentDeleteConfirmOpen(true);
    };

    const confirmRestore = async () => {
        if (!targetWork) return;
        try {
            await workApi.adminRestoreWork(targetWork.id);
            success(`作品「${targetWork.title}」已恢复`);
            setRestoreConfirmOpen(false);
            setTargetWork(null);
            fetchRecycleBin();
        } catch (err: any) {
            error(err.message || '恢复失败');
            setRestoreConfirmOpen(false);
        }
    };

    const confirmPermanentDelete = async () => {
        if (!targetWork) return;
        try {
            await workApi.adminPermanentDeleteWork(targetWork.id);
            success(`作品「${targetWork.title}」已彻底删除`);
            setPermanentDeleteConfirmOpen(false);
            setTargetWork(null);
            fetchRecycleBin();
        } catch (err: any) {
            error(err.message || '彻底删除失败');
            setPermanentDeleteConfirmOpen(false);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(works.map(w => w.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBatchRestore = () => {
        if (selectedIds.length === 0) return;
        setIsBatchMode(true);
        setRestoreConfirmOpen(true);
    };

    const handleBatchPermanentDelete = () => {
        if (selectedIds.length === 0) return;
        setIsBatchMode(true);
        setPermanentDeleteConfirmOpen(true);
    };

    const confirmBatchRestore = async () => {
        try {
            await workApi.adminBatchRestoreWorks(selectedIds);
            success(`已批量恢复 ${selectedIds.length} 个作品`);
            setRestoreConfirmOpen(false);
            setSelectedIds([]);
            fetchRecycleBin();
        } catch (err: any) {
            error(err.message || '批量恢复失败');
            setRestoreConfirmOpen(false);
        }
    };

    const confirmBatchPermanentDelete = async () => {
        try {
            await workApi.adminBatchPermanentDeleteWorks(selectedIds);
            success(`已彻底删除 ${selectedIds.length} 个作品`);
            setPermanentDeleteConfirmOpen(false);
            setSelectedIds([]);
            fetchRecycleBin();
        } catch (err: any) {
            error(err.message || '批量彻底删除失败');
            setPermanentDeleteConfirmOpen(false);
        }
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold">回收站</h1>
                    <span className="text-sm text-gray-500">（共 {total} 项）</span>
                </div>
                <div className="flex gap-2 items-center">
                    {selectedIds.length > 0 && (
                        <>
                            <Button variant="success" onClick={handleBatchRestore}>
                                <RotateCcw className="w-4 h-4 mr-2" />
                                批量恢复 ({selectedIds.length})
                            </Button>
                            <Button variant="danger" onClick={handleBatchPermanentDelete}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                批量彻底删除 ({selectedIds.length})
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="mb-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Info className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-700">
                    回收站中的作品将在 <strong>{retentionDays}</strong> 天后自动彻底清理。恢复作品将还原其被删除前的状态（已发布/草稿等），彻底删除将同时清除关联的互动数据且不可恢复。
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500 uppercase tracking-wider">
                            <th className="p-4 w-12">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer w-4 h-4"
                                    checked={selectedIds.length === works.length && works.length > 0}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            <th className="p-4">标题</th>
                            <th className="p-4">分类</th>
                            <th className="p-4">删除前状态</th>
                            <th className="p-4">提交者</th>
                            <th className="p-4">删除人</th>
                            <th className="p-4">删除时间</th>
                            <th className="p-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {works.map((work) => (
                            <tr key={work.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer w-4 h-4"
                                        checked={selectedIds.includes(work.id)}
                                        onChange={() => handleSelect(work.id)}
                                    />
                                </td>
                                <td className="p-4 font-medium text-gray-900">{work.title}</td>
                                <td className="p-4 text-gray-500">{work.category}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(work.statusBeforeDelete || 'DRAFT')}`}>
                                        {getStatusText(work.statusBeforeDelete || 'DRAFT')}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-500 text-sm">
                                    {work.submitter?.nickname || work.submitter?.username || '-'}
                                </td>
                                <td className="p-4 text-gray-500 text-sm">
                                    {work.deleter?.nickname || work.deleter?.username || '-'}
                                </td>
                                <td className="p-4 text-gray-500 text-sm">
                                    {formatDate(work.deletedAt)}
                                </td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={() => handleRestore(work)}
                                        className="text-green-600 hover:underline mx-2 inline-flex items-center gap-1"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        恢复
                                    </button>
                                    <button
                                        onClick={() => handlePermanentDelete(work)}
                                        className="text-red-500 hover:underline inline-flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        彻底删除
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {works.length === 0 && (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-gray-500">回收站为空。</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        上一页
                    </Button>
                    <span className="text-sm text-gray-500">
                        第 {page} / {totalPages} 页
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                        下一页
                    </Button>
                </div>
            )}

            <Modal
                isOpen={restoreConfirmOpen}
                onClose={() => { setRestoreConfirmOpen(false); setTargetWork(null); }}
                title="确认恢复"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => { setRestoreConfirmOpen(false); setTargetWork(null); }}>取消</Button>
                        <Button variant="success" onClick={isBatchMode ? confirmBatchRestore : confirmRestore}>确认恢复</Button>
                    </>
                }
            >
                {isBatchMode ? (
                    <p>确定要恢复选中的 <strong>{selectedIds.length}</strong> 个作品吗？恢复后作品将回到删除前的状态。</p>
                ) : (
                    <p>确定要恢复作品「<strong>{targetWork?.title}</strong>」吗？恢复后作品将回到删除前的状态。</p>
                )}
            </Modal>

            <Modal
                isOpen={permanentDeleteConfirmOpen}
                onClose={() => { setPermanentDeleteConfirmOpen(false); setTargetWork(null); }}
                title="确认彻底删除"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => { setPermanentDeleteConfirmOpen(false); setTargetWork(null); }}>取消</Button>
                        <Button variant="danger" onClick={isBatchMode ? confirmBatchPermanentDelete : confirmPermanentDelete}>确认彻底删除</Button>
                    </>
                }
            >
                {isBatchMode ? (
                    <div>
                        <p className="text-red-600 font-medium mb-2">⚠️ 此操作不可逆！</p>
                        <p>确定要彻底删除选中的 <strong>{selectedIds.length}</strong> 个作品吗？</p>
                        <p className="mt-2 text-sm text-gray-500">彻底删除将同时清除与这些作品关联的所有互动数据（点赞、收藏、评论等），且无法恢复。</p>
                    </div>
                ) : (
                    <div>
                        <p className="text-red-600 font-medium mb-2">⚠️ 此操作不可逆！</p>
                        <p>确定要彻底删除作品「<strong>{targetWork?.title}</strong>」吗？</p>
                        <p className="mt-2 text-sm text-gray-500">彻底删除将同时清除与该作品关联的所有互动数据（点赞、收藏、评论等），且无法恢复。</p>
                    </div>
                )}
            </Modal>
        </div>
    );
};
