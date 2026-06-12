import React, { useEffect, useState } from 'react';
import { workApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Trash2, Edit, Plus, Eye, Filter, Clock } from 'lucide-react';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8063/api').replace(/\/api$/, '');

const formatDateTime = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return '';
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(date.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toLocalDateTimeInputValue = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return '';
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(date.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return toLocalDateTimeInputValue(now);
};

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
        case 'SCHEDULED':
            return 'bg-purple-100 text-purple-700';
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
        case 'SCHEDULED':
            return '定时待发布';
        default:
            return status;
    }
};

interface WorkFormData {
    title: string;
    description: string;
    tags: string;
    category: string;
    mediaUrl: string;
    status: string;
    scheduledPublishAt: string;
}

const initialFormData: WorkFormData = {
    title: '',
    description: '',
    tags: '',
    category: '',
    mediaUrl: '',
    status: 'PUBLISHED',
    scheduledPublishAt: ''
};

export const AdminWorks = () => {
    const [works, setWorks] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWork, setEditingWork] = useState<any>(null);
    const [formData, setFormData] = useState<WorkFormData>({ ...initialFormData });
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [workToDelete, setWorkToDelete] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [minDateTime, setMinDateTime] = useState<string>(getMinDateTime());

    const { success, error } = useToast();

    useEffect(() => {
        const timer = setInterval(() => {
            setMinDateTime(getMinDateTime());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    const fetchWorks = async () => {
        try {
            const params = statusFilter ? { status: statusFilter } : undefined;
            const res: any = await workApi.adminGetAllWorks(params);
            setWorks(res.data);
        } catch (err: any) {
            error(err.message || '加载作品失败');
        }
    };

    useEffect(() => {
        fetchWorks();
    }, [statusFilter]);

    const openEditModal = (work?: any) => {
        if (work) {
            setEditingWork(work);
            setFormData({
                title: work.title || '',
                description: work.description || '',
                tags: work.tags || '',
                category: work.category || '',
                mediaUrl: work.mediaUrl || '',
                status: work.status || 'PUBLISHED',
                scheduledPublishAt: work.scheduledPublishAt ? toLocalDateTimeInputValue(work.scheduledPublishAt) : ''
            });
        } else {
            setEditingWork(null);
            setFormData({ ...initialFormData });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        const payload: any = {
            title: formData.title.trim(),
            description: formData.description.trim(),
            tags: formData.tags.trim(),
            category: formData.category.trim(),
            mediaUrl: formData.mediaUrl.trim(),
            status: formData.status
        };

        const missingLabels = [
            !payload.title ? '标题' : null,
            !payload.description ? '描述' : null,
            !payload.mediaUrl ? '资源 URL' : null
        ].filter(Boolean);
        if (missingLabels.length > 0) {
            error(`请先填写必填项：${missingLabels.join('、')}`);
            return;
        }

        if (formData.status === 'SCHEDULED') {
            if (!formData.scheduledPublishAt) {
                error('请选择定时发布时间');
                return;
            }
            const scheduledDate = new Date(formData.scheduledPublishAt);
            if (isNaN(scheduledDate.getTime())) {
                error('定时发布时间格式不正确');
                return;
            }
            if (scheduledDate <= new Date()) {
                error('定时发布时间必须是未来的时间');
                return;
            }
            payload.scheduledPublishAt = scheduledDate.toISOString();
        }

        try {
            if (editingWork) {
                await workApi.adminUpdateWork(editingWork.id, payload);
                success('作品更新成功');
            } else {
                await workApi.adminCreateWork(payload);
                success('作品创建成功');
            }
            setIsModalOpen(false);
            fetchWorks();
        } catch (err: any) {
            error(err.message || '操作失败');
        }
    };

    const handleDelete = async () => {
        if (!workToDelete) return;
        try {
            await workApi.adminDeleteWork(workToDelete);
            success('作品已移入回收站');
            setDeleteConfirmOpen(false);
            setSelectedIds(selectedIds.filter(id => id !== workToDelete));
            fetchWorks();
        } catch (err: any) {
            error(err.message || '删除作品失败');
            setDeleteConfirmOpen(false);
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
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(checkedId => checkedId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBatchDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`确定要删除选中的 ${selectedIds.length} 个作品吗？`)) return;
        try {
            await Promise.all(selectedIds.map(id => workApi.adminDeleteWork(id)));
            success('批量移入回收站成功');
            setSelectedIds([]);
            fetchWorks();
        } catch (err: any) {
            error('批量删除过程中出现错误');
        }
    };

    const handleBatchStatus = async (status: string) => {
        if (selectedIds.length === 0) return;
        const confirmMsg = status === 'PUBLISHED' ? '批量上架' : status === 'DRAFT' ? '批量下架(设为草稿)' : `批量设为${getStatusText(status)}`;
        if (!window.confirm(`确定要${confirmMsg}选中的 ${selectedIds.length} 个作品吗？`)) return;

        try {
            const updates = selectedIds.map(id => {
                const work = works.find(w => w.id === id);
                if (!work) return Promise.resolve();
                const updatePayload: any = { ...work, status };
                if (status !== 'SCHEDULED') {
                    updatePayload.scheduledPublishAt = undefined;
                }
                return workApi.adminUpdateWork(id, updatePayload);
            });
            await Promise.all(updates);
            success(`${confirmMsg}成功`);
            setSelectedIds([]);
            fetchWorks();
        } catch (err) {
            error('批量操作过程中出现错误');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">作品管理</h1>
                <div className="flex gap-2 items-center">
                    <div className="flex items-center gap-2 mr-4">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">全部状态</option>
                            <option value="PUBLISHED">已发布</option>
                            <option value="DRAFT">草稿</option>
                            <option value="PENDING_REVIEW">待审核</option>
                            <option value="REJECTED">已驳回</option>
                            <option value="SCHEDULED">定时待发布</option>
                        </select>
                    </div>
                    {selectedIds.length > 0 && (
                        <>
                            <Button variant="danger" onClick={handleBatchDelete}>批量删除 ({selectedIds.length})</Button>
                            <Button variant="outline" onClick={() => handleBatchStatus('PUBLISHED')}>批量上架</Button>
                            <Button variant="outline" onClick={() => handleBatchStatus('DRAFT')}>批量下架</Button>
                        </>
                    )}
                    <Button onClick={() => openEditModal()}><Plus className="w-4 h-4 mr-2" /> 新增作品</Button>
                </div>
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
                            <th className="p-4">提交者</th>
                            <th className="p-4">状态</th>
                            <th className="p-4">浏览量</th>
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
                                <td className="p-4 text-gray-500 text-sm">
                                    {work.submitter?.nickname || work.submitter?.username || '-'}
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-1">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 w-fit ${getStatusBadgeClass(work.status)}`}>
                                            {work.status === 'SCHEDULED' && <Clock className="w-3 h-3" />}
                                            {getStatusText(work.status)}
                                        </span>
                                        {work.status === 'SCHEDULED' && work.scheduledPublishAt && (
                                            <div className="text-xs text-purple-600 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                计划：{formatDateTime(work.scheduledPublishAt)}
                                            </div>
                                        )}
                                        {work.status === 'REJECTED' && work.rejectReason && (
                                            <div className="mt-1 text-xs text-red-600" title={work.rejectReason}>
                                                驳回原因：{work.rejectReason.length > 20 ? work.rejectReason.substring(0, 20) + '...' : work.rejectReason}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 text-gray-500 flex items-center gap-1"><Eye className="w-4 h-4" /> {work.viewCount}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => openEditModal(work)} className="text-primary hover:underline mx-2">编辑</button>
                                    <button onClick={() => { setWorkToDelete(work.id); setDeleteConfirmOpen(true); }} className="text-red-500 hover:underline">删除</button>
                                </td>
                            </tr>
                        ))}
                        {works.length === 0 && (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-500">暂无作品。</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingWork ? '编辑作品' : '新增作品'}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>取消</Button>
                        <Button onClick={handleSave}>保存</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input label="标题" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                        <textarea
                            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        ></textarea>
                    </div>
                    <Input label="分类" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                    <Input label="标签 (逗号分隔)" value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} />
                    <Input label="资源 URL (图片/视频链接)" value={formData.mediaUrl} onChange={e => setFormData({ ...formData, mediaUrl: e.target.value })} />
                    <div className="flex items-center gap-4 p-2 bg-gray-50 rounded border border-gray-100">
                        {formData.mediaUrl && (
                            <img
                                src={formData.mediaUrl.startsWith('http') ? formData.mediaUrl : `${API_ROOT}${formData.mediaUrl}`}
                                alt="预览"
                                className="w-20 h-20 object-cover rounded shadow-sm bg-white"
                            />
                        )}
                        <div className="text-xs text-gray-500 italic">预览区域 (支持本地路径 /uploads/...)</div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">发布方式</label>
                        <select
                            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="PUBLISHED">立即发布</option>
                            <option value="DRAFT">存为草稿</option>
                            <option value="SCHEDULED">定时发布</option>
                            <option value="PENDING_REVIEW">待审核</option>
                            <option value="REJECTED">已驳回</option>
                        </select>
                    </div>

                    {formData.status === 'SCHEDULED' && (
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                            <label className="block text-sm font-medium text-purple-700 mb-2 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                定时发布时间
                            </label>
                            <input
                                type="datetime-local"
                                min={minDateTime}
                                value={formData.scheduledPublishAt}
                                onChange={e => setFormData({ ...formData, scheduledPublishAt: e.target.value })}
                                className="w-full rounded-md border border-purple-300 p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                            />
                            <p className="mt-2 text-xs text-purple-600">
                                到达设定时间后，作品将自动从草稿转为已发布状态。
                            </p>
                            {formData.scheduledPublishAt && new Date(formData.scheduledPublishAt) <= new Date() && (
                                <p className="mt-2 text-xs text-red-600">
                                    ⚠ 请选择一个未来的时间点
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </Modal>

            <Modal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                title="确认删除"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>取消</Button>
                        <Button variant="danger" onClick={handleDelete}>移入回收站</Button>
                    </>
                }
            >
                <p>您确定要删除此作品吗？作品将移入回收站，您可以在回收站中恢复或彻底删除。</p>
            </Modal>
        </div>
    );
};
