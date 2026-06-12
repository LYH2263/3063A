import React, { useEffect, useState } from 'react';
import { announcementApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Trash2, Edit, Plus, ToggleLeft, ToggleRight, Eye, Megaphone, AlertTriangle, PartyPopper, Pin } from 'lucide-react';

const toLocalDateTimeString = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ANNOUNCEMENT_TYPES = [
    { value: 'NOTICE', label: '通知', icon: Megaphone, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { value: 'WARNING', label: '警告', icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
    { value: 'ACTIVITY', label: '活动', icon: PartyPopper, color: 'text-green-600 bg-green-50 border-green-200' },
];

interface AnnouncementFormData {
    title: string;
    content: string;
    contentType: string;
    type: string;
    startDate: string;
    endDate: string;
    isPinned: boolean;
    isEnabled: boolean;
}

const emptyForm: AnnouncementFormData = {
    title: '',
    content: '',
    contentType: 'plain',
    type: 'NOTICE',
    startDate: toLocalDateTimeString(new Date()),
    endDate: toLocalDateTimeString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    isPinned: false,
    isEnabled: true,
};

export const AdminAnnouncements = () => {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [formData, setFormData] = useState<AnnouncementFormData>(emptyForm);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewItem, setPreviewItem] = useState<any>(null);

    const { success, error } = useToast();

    const fetchAnnouncements = async () => {
        try {
            const res: any = await announcementApi.adminGetAllAnnouncements();
            setAnnouncements(res.data);
        } catch (err: any) {
            error(err.message || '加载公告失败');
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const openEditModal = (item?: any) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                title: item.title,
                content: item.content,
                contentType: item.contentType || 'plain',
                type: item.type || 'NOTICE',
                startDate: toLocalDateTimeString(item.startDate),
                endDate: toLocalDateTimeString(item.endDate),
                isPinned: item.isPinned,
                isEnabled: item.isEnabled,
            });
        } else {
            setEditingItem(null);
            setFormData(emptyForm);
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        const payload = {
            title: formData.title.trim(),
            content: formData.content.trim(),
            contentType: formData.contentType,
            type: formData.type,
            startDate: formData.startDate,
            endDate: formData.endDate,
            isPinned: formData.isPinned,
            isEnabled: formData.isEnabled,
        };

        if (!payload.title) { error('请填写标题'); return; }
        if (!payload.content) { error('请填写内容'); return; }
        if (!payload.startDate) { error('请填写生效开始时间'); return; }
        if (!payload.endDate) { error('请填写生效结束时间'); return; }

        try {
            if (editingItem) {
                await announcementApi.adminUpdateAnnouncement(editingItem.id, payload);
                success('公告更新成功');
            } else {
                await announcementApi.adminCreateAnnouncement(payload as any);
                success('公告创建成功');
            }
            setIsModalOpen(false);
            fetchAnnouncements();
        } catch (err: any) {
            error(err.message || '操作失败');
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            await announcementApi.adminDeleteAnnouncement(itemToDelete);
            success('公告删除成功');
            setDeleteConfirmOpen(false);
            fetchAnnouncements();
        } catch (err: any) {
            error(err.message || '删除公告失败');
            setDeleteConfirmOpen(false);
        }
    };

    const toggleEnabled = async (item: any) => {
        try {
            await announcementApi.adminUpdateAnnouncement(item.id, { isEnabled: !item.isEnabled });
            success(item.isEnabled ? '已禁用' : '已启用');
            fetchAnnouncements();
        } catch (err: any) {
            error(err.message || '操作失败');
        }
    };

    const openPreview = (item: any) => {
        setPreviewItem(item);
        setPreviewOpen(true);
    };

    const now = new Date();

    const getStatus = (item: any) => {
        if (!item.isEnabled) return { label: '已禁用', color: 'text-gray-500' };
        const start = new Date(item.startDate);
        const end = new Date(item.endDate);
        if (now < start) return { label: '待生效', color: 'text-yellow-600' };
        if (now > end) return { label: '已过期', color: 'text-red-500' };
        return { label: '生效中', color: 'text-green-600' };
    };

    const getTypeConfig = (type: string) => {
        return ANNOUNCEMENT_TYPES.find(t => t.value === type) || ANNOUNCEMENT_TYPES[0];
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">全站公告管理</h1>
                <Button onClick={() => openEditModal()}><Plus className="w-4 h-4 mr-2" /> 新增公告</Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500 uppercase tracking-wider">
                            <th className="p-4">标题</th>
                            <th className="p-4">类型</th>
                            <th className="p-4">状态</th>
                            <th className="p-4">生效时间</th>
                            <th className="p-4 w-52 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {announcements.map((item) => {
                            const status = getStatus(item);
                            const typeConfig = getTypeConfig(item.type);
                            const TypeIcon = typeConfig.icon;
                            return (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {item.isPinned && <Pin className="w-4 h-4 text-red-500 flex-shrink-0" />}
                                            <div className="font-medium text-gray-900">{item.title}</div>
                                        </div>
                                        <div className="text-sm text-gray-500 mt-0.5 truncate max-w-xs">
                                            {item.contentType === 'rich'
                                                ? <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">富文本</span>
                                                : item.content.substring(0, 60)}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${typeConfig.color}`}>
                                            <TypeIcon className="w-3.5 h-3.5" />
                                            {typeConfig.label}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => toggleEnabled(item)} className="flex items-center gap-1">
                                                {item.isEnabled ? (
                                                    <ToggleRight className="w-6 h-6 text-green-500" />
                                                ) : (
                                                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                                                )}
                                            </button>
                                            <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {new Date(item.startDate).toLocaleDateString()} ~ {new Date(item.endDate).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => openPreview(item)} className="text-gray-500 hover:text-primary mx-1 inline-flex items-center gap-1">
                                            <Eye className="w-4 h-4" /> 预览
                                        </button>
                                        <button onClick={() => openEditModal(item)} className="text-primary hover:underline mx-1 inline-flex items-center gap-1">
                                            <Edit className="w-4 h-4" /> 编辑
                                        </button>
                                        <button onClick={() => { setItemToDelete(item.id); setDeleteConfirmOpen(true); }} className="text-red-500 hover:underline mx-1 inline-flex items-center gap-1">
                                            <Trash2 className="w-4 h-4" /> 删除
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {announcements.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">暂无公告，点击右上角新增。</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-3 text-xs text-gray-500">
                提示：多个公告同时生效时，前台按"置顶优先 → 发布时间倒序"展示最高优先级的一条。用户关闭后 24 小时内不再重复弹出。
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? '编辑公告' : '新增公告'} size="lg" footer={<><Button variant="ghost" onClick={() => setIsModalOpen(false)}>取消</Button><Button onClick={handleSave}>保存</Button></>}>
                <div className="space-y-4">
                    <Input label="标题" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="公告标题" />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">内容</label>
                        {formData.contentType === 'rich' ? (
                            <textarea
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                placeholder="支持 HTML 富文本内容"
                                rows={6}
                                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:border-gray-700 dark:bg-slate-900 dark:text-gray-50"
                            />
                        ) : (
                            <textarea
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                placeholder="纯文本公告内容"
                                rows={4}
                                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:border-gray-700 dark:bg-slate-900 dark:text-gray-50"
                            />
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">内容类型</label>
                            <select
                                value={formData.contentType}
                                onChange={e => setFormData({ ...formData, contentType: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:border-gray-700 dark:bg-slate-900 dark:text-gray-50"
                            >
                                <option value="plain">纯文本</option>
                                <option value="rich">富文本 (HTML)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">公告类型</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:border-gray-700 dark:bg-slate-900 dark:text-gray-50"
                            >
                                {ANNOUNCEMENT_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">生效开始时间</label>
                            <input
                                type="datetime-local"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:border-gray-700 dark:bg-slate-900 dark:text-gray-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">生效结束时间</label>
                            <input
                                type="datetime-local"
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:border-gray-700 dark:bg-slate-900 dark:text-gray-50"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="announcementIsPinned"
                                checked={formData.isPinned}
                                onChange={e => setFormData({ ...formData, isPinned: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                            <label htmlFor="announcementIsPinned" className="text-sm font-medium text-gray-700">置顶</label>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="announcementIsEnabled"
                                checked={formData.isEnabled}
                                onChange={e => setFormData({ ...formData, isEnabled: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                            <label htmlFor="announcementIsEnabled" className="text-sm font-medium text-gray-700">启用</label>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} title="公告预览" size="lg" footer={<Button variant="ghost" onClick={() => setPreviewOpen(false)}>关闭</Button>}>
                {previewItem && (() => {
                    const typeConfig = getTypeConfig(previewItem.type);
                    const TypeIcon = typeConfig.icon;
                    const bannerStyles: Record<string, string> = {
                        NOTICE: 'bg-blue-50 border-blue-200 text-blue-800',
                        WARNING: 'bg-yellow-50 border-yellow-200 text-yellow-800',
                        ACTIVITY: 'bg-green-50 border-green-200 text-green-800',
                    };
                    const bannerStyle = bannerStyles[previewItem.type] || bannerStyles.NOTICE;
                    return (
                        <div className="space-y-4">
                            <div className="text-sm text-gray-500 mb-2">前台展示效果如下：</div>
                            <div className={`w-full border-b rounded-lg p-4 ${bannerStyle}`}>
                                <div className="flex items-center gap-3">
                                    <TypeIcon className="w-5 h-5 flex-shrink-0" />
                                    <span className="font-semibold text-sm">{previewItem.title}</span>
                                    {previewItem.contentType === 'rich' ? (
                                        <div className="text-sm flex-1 min-w-0" dangerouslySetInnerHTML={{ __html: previewItem.content }} />
                                    ) : (
                                        <span className="text-sm flex-1 min-w-0">{previewItem.content}</span>
                                    )}
                                </div>
                            </div>
                            <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
                                <div><span className="font-medium text-gray-700">公告类型：</span>{typeConfig.label}</div>
                                <div><span className="font-medium text-gray-700">内容类型：</span>{previewItem.contentType === 'rich' ? '富文本' : '纯文本'}</div>
                                <div><span className="font-medium text-gray-700">置顶：</span>{previewItem.isPinned ? '是' : '否'}</div>
                                <div><span className="font-medium text-gray-700">启用：</span>{previewItem.isEnabled ? '是' : '否'}</div>
                                <div><span className="font-medium text-gray-700">生效时间：</span>{new Date(previewItem.startDate).toLocaleString()} ~ {new Date(previewItem.endDate).toLocaleString()}</div>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="确认删除" footer={<><Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>取消</Button><Button variant="danger" onClick={handleDelete}>确认删除</Button></>}>
                <p>您确定要删除此公告吗？</p>
            </Modal>
        </div>
    );
};
