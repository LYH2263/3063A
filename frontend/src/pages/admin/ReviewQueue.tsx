import React, { useEffect, useState } from 'react';
import { workApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { CheckCircle, XCircle, Eye, Clock, User } from 'lucide-react';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8063/api').replace(/\/api$/, '');

const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case 'PUBLISHED':
            return 'bg-green-100 text-green-700';
        case 'DRAFT':
            return 'bg-yellow-100 text-yellow-700';
        case 'PENDING_REVIEW':
            return 'bg-blue-100 text-blue-700';
        case 'REJECTED':
            return 'bg-red-100 text-red-700';
        default:
            return 'bg-gray-100 text-gray-700';
    }
};

const getStatusText = (status: string) => {
    switch (status) {
        case 'PUBLISHED':
            return '已发布';
        case 'DRAFT':
            return '草稿';
        case 'PENDING_REVIEW':
            return '待审核';
        case 'REJECTED':
            return '已驳回';
        default:
            return status;
    }
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const AdminReviewQueue = () => {
    const [works, setWorks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedWork, setSelectedWork] = useState<any>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);

    const { success, error } = useToast();

    const fetchPendingReviews = async () => {
        setIsLoading(true);
        try {
            const res: any = await workApi.adminGetPendingReviews();
            setWorks(res.data);
        } catch (err: any) {
            error(err.message || '加载待审核作品失败');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingReviews();
    }, []);

    const handleApprove = async () => {
        if (!selectedWork) return;
        try {
            await workApi.adminApproveWork(selectedWork.id);
            success('作品已通过审核');
            setIsApproveConfirmOpen(false);
            setSelectedWork(null);
            fetchPendingReviews();
        } catch (err: any) {
            error(err.message || '审核通过失败');
        }
    };

    const handleReject = async () => {
        if (!selectedWork || !rejectReason.trim()) {
            error('请填写驳回理由');
            return;
        }
        try {
            await workApi.adminRejectWork(selectedWork.id, rejectReason.trim());
            success('作品已驳回');
            setIsRejectModalOpen(false);
            setRejectReason('');
            setSelectedWork(null);
            fetchPendingReviews();
        } catch (err: any) {
            error(err.message || '驳回失败');
        }
    };

    const openPreview = (work: any) => {
        setSelectedWork(work);
        setIsPreviewOpen(true);
    };

    const openApproveConfirm = (work: any) => {
        setSelectedWork(work);
        setIsApproveConfirmOpen(true);
    };

    const openRejectModal = (work: any) => {
        setSelectedWork(work);
        setRejectReason('');
        setIsRejectModalOpen(true);
    };

    if (isLoading) return <div className="p-8">加载中...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">审核队列</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    待审核作品：{works.length} 个
                </div>
            </div>

            {works.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">暂无待审核作品</h3>
                    <p className="text-gray-500">所有作品都已处理完毕！</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {works.map((work) => (
                        <div key={work.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6">
                                <div className="flex gap-6">
                                    <div className="w-48 h-36 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                        <img
                                            src={work.mediaUrl.startsWith('http') ? work.mediaUrl : `${API_ROOT}${work.mediaUrl}`}
                                            alt={work.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="192" height="144" viewBox="0 0 192 144"%3E%3Crect fill="%23f3f4f6" width="192" height="144"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3E无预览%3C/text%3E%3C/svg%3E';
                                            }}
                                        />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-1">{work.title}</h3>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(work.status)}`}>
                                                        {getStatusText(work.status)}
                                                    </span>
                                                    <span className="text-sm text-gray-500">{work.category}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="sm" onClick={() => openPreview(work)}>
                                                    <Eye className="w-4 h-4 mr-1" /> 预览
                                                </Button>
                                                <Button variant="success" size="sm" onClick={() => openApproveConfirm(work)}>
                                                    <CheckCircle className="w-4 h-4 mr-1" /> 通过
                                                </Button>
                                                <Button variant="danger" size="sm" onClick={() => openRejectModal(work)}>
                                                    <XCircle className="w-4 h-4 mr-1" /> 驳回
                                                </Button>
                                            </div>
                                        </div>

                                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{work.description}</p>

                                        <div className="flex items-center gap-6 text-sm text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4" />
                                                <span>提交者：{work.submitter?.nickname || work.submitter?.username || '未知'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                <span>提交时间：{formatDate(work.submittedAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isPreviewOpen}
                onClose={() => { setIsPreviewOpen(false); setSelectedWork(null); }}
                title="作品预览"
                size="lg"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => { setIsPreviewOpen(false); setSelectedWork(null); }}>关闭</Button>
                        {selectedWork && (
                            <>
                                <Button variant="danger" onClick={() => { setIsPreviewOpen(false); openRejectModal(selectedWork); }}>
                                    <XCircle className="w-4 h-4 mr-1" /> 驳回
                                </Button>
                                <Button variant="success" onClick={() => { setIsPreviewOpen(false); openApproveConfirm(selectedWork); }}>
                                    <CheckCircle className="w-4 h-4 mr-1" /> 通过
                                </Button>
                            </>
                        )}
                    </>
                }
            >
                {selectedWork && (
                    <div className="space-y-4">
                        <div className="rounded-lg overflow-hidden bg-gray-100">
                            <img
                                src={selectedWork.mediaUrl.startsWith('http') ? selectedWork.mediaUrl : `${API_ROOT}${selectedWork.mediaUrl}`}
                                alt={selectedWork.title}
                                className="w-full max-h-96 object-contain"
                            />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-2">{selectedWork.title}</h3>
                            <div className="flex items-center gap-3 mb-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(selectedWork.status)}`}>
                                    {getStatusText(selectedWork.status)}
                                </span>
                                <span className="text-sm text-gray-500">{selectedWork.category}</span>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">{selectedWork.description}</p>
                        </div>
                        <div className="border-t border-gray-200 pt-4 text-sm text-gray-500 space-y-1">
                            <div className="flex justify-between">
                                <span>提交者：</span>
                                <span>{selectedWork.submitter?.nickname || selectedWork.submitter?.username || '未知'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>提交时间：</span>
                                <span>{formatDate(selectedWork.submittedAt)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>创建时间：</span>
                                <span>{formatDate(selectedWork.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={isApproveConfirmOpen}
                onClose={() => { setIsApproveConfirmOpen(false); setSelectedWork(null); }}
                title="确认通过"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => { setIsApproveConfirmOpen(false); setSelectedWork(null); }}>取消</Button>
                        <Button variant="success" onClick={handleApprove}>确认通过</Button>
                    </>
                }
            >
                <p>确定要通过此作品吗？通过后作品将公开发布。</p>
            </Modal>

            <Modal
                isOpen={isRejectModalOpen}
                onClose={() => { setIsRejectModalOpen(false); setSelectedWork(null); setRejectReason(''); }}
                title="驳回作品"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => { setIsRejectModalOpen(false); setSelectedWork(null); setRejectReason(''); }}>取消</Button>
                        <Button variant="danger" onClick={handleReject}>确认驳回</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-gray-700">请填写驳回理由（必填）：</p>
                    <textarea
                        className="w-full rounded-md border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        rows={4}
                        placeholder="请详细说明驳回原因，以便提交者修改..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                    />
                </div>
            </Modal>
        </div>
    );
};
