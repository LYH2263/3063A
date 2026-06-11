import React, { useEffect, useState, useRef } from 'react';
import { bannerApi } from '../../services/api';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Trash2, Edit, Plus, GripVertical, ToggleLeft, ToggleRight, Image as ImageIcon, Upload } from 'lucide-react';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8063/api').replace(/\/api$/, '');

const toLocalDateTimeString = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface BannerFormData {
    title: string;
    subtitle: string;
    imageUrl: string;
    linkUrl: string;
    startDate: string;
    endDate: string;
    isEnabled: boolean;
}

const emptyForm: BannerFormData = {
    title: '',
    subtitle: '',
    imageUrl: '',
    linkUrl: '',
    startDate: toLocalDateTimeString(new Date()),
    endDate: toLocalDateTimeString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    isEnabled: true,
};

export const AdminBanners = () => {
    const [banners, setBanners] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<any>(null);
    const [formData, setFormData] = useState<BannerFormData>(emptyForm);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [bannerToDelete, setBannerToDelete] = useState<number | null>(null);
    const [uploading, setUploading] = useState(false);

    const dragIndexRef = useRef<number | null>(null);
    const dragOverIndexRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { success, error } = useToast();

    const fetchBanners = async () => {
        try {
            const res: any = await bannerApi.adminGetAllBanners();
            setBanners(res.data);
        } catch (err: any) {
            error(err.message || '加载 Banner 失败');
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    const openEditModal = (banner?: any) => {
        if (banner) {
            setEditingBanner(banner);
            setFormData({
                title: banner.title,
                subtitle: banner.subtitle || '',
                imageUrl: banner.imageUrl,
                linkUrl: banner.linkUrl || '',
                startDate: toLocalDateTimeString(banner.startDate),
                endDate: toLocalDateTimeString(banner.endDate),
                isEnabled: banner.isEnabled,
            });
        } else {
            setEditingBanner(null);
            setFormData(emptyForm);
        }
        setIsModalOpen(true);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const form = new FormData();
            form.append('file', file);
            const res: any = await api.post('/upload', form);
            setFormData(prev => ({ ...prev, imageUrl: res.data.url }));
            success('图片上传成功');
        } catch (err: any) {
            error(err.message || '图片上传失败');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        const payload = {
            title: formData.title.trim(),
            subtitle: formData.subtitle.trim() || undefined,
            imageUrl: formData.imageUrl.trim(),
            linkUrl: formData.linkUrl.trim() || undefined,
            startDate: formData.startDate,
            endDate: formData.endDate,
            isEnabled: formData.isEnabled
        };

        if (!payload.title) { error('请填写标题'); return; }
        if (!payload.imageUrl) { error('请上传图片或填写图片 URL'); return; }
        if (!payload.startDate) { error('请填写生效开始时间'); return; }
        if (!payload.endDate) { error('请填写生效结束时间'); return; }

        try {
            if (editingBanner) {
                await bannerApi.adminUpdateBanner(editingBanner.id, payload);
                success('Banner 更新成功');
            } else {
                await bannerApi.adminCreateBanner(payload as any);
                success('Banner 创建成功');
            }
            setIsModalOpen(false);
            fetchBanners();
        } catch (err: any) {
            error(err.message || '操作失败');
        }
    };

    const handleDelete = async () => {
        if (!bannerToDelete) return;
        try {
            await bannerApi.adminDeleteBanner(bannerToDelete);
            success('Banner 删除成功');
            setDeleteConfirmOpen(false);
            fetchBanners();
        } catch (err: any) {
            error(err.message || '删除 Banner 失败');
            setDeleteConfirmOpen(false);
        }
    };

    const toggleEnabled = async (banner: any) => {
        try {
            await bannerApi.adminUpdateBanner(banner.id, { isEnabled: !banner.isEnabled });
            success(banner.isEnabled ? '已禁用' : '已启用');
            fetchBanners();
        } catch (err: any) {
            error(err.message || '操作失败');
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        dragIndexRef.current = index;
        e.dataTransfer.effectAllowed = 'move';
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = '1';
        dragIndexRef.current = null;
        dragOverIndexRef.current = null;
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        dragOverIndexRef.current = index;
    };

    const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        const dragIndex = dragIndexRef.current;
        if (dragIndex === null || dragIndex === dropIndex) return;

        const newBanners = [...banners];
        const [dragged] = newBanners.splice(dragIndex, 1);
        newBanners.splice(dropIndex, 0, dragged);

        const orders = newBanners.map((b, idx) => ({ id: b.id, sortOrder: idx }));
        setBanners(newBanners);

        try {
            await bannerApi.adminReorderBanners(orders);
        } catch (err: any) {
            error(err.message || '排序更新失败');
            fetchBanners();
        }
    };

    const now = new Date();

    const getBannerStatus = (banner: any) => {
        if (!banner.isEnabled) return { label: '已禁用', color: 'text-gray-500' };
        const start = new Date(banner.startDate);
        const end = new Date(banner.endDate);
        if (now < start) return { label: '待生效', color: 'text-yellow-600' };
        if (now > end) return { label: '已过期', color: 'text-red-500' };
        return { label: '生效中', color: 'text-green-600' };
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">轮播图管理</h1>
                <Button onClick={() => openEditModal()}><Plus className="w-4 h-4 mr-2" /> 新增 Banner</Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500 uppercase tracking-wider">
                            <th className="p-4 w-12"></th>
                            <th className="p-4 w-24">图片</th>
                            <th className="p-4">标题</th>
                            <th className="p-4">状态</th>
                            <th className="p-4">生效时间</th>
                            <th className="p-4 w-40 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {banners.map((banner, index) => {
                            const status = getBannerStatus(banner);
                            return (
                                <tr
                                    key={banner.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDrop={(e) => handleDrop(e, index)}
                                    className="hover:bg-gray-50 transition-colors cursor-move"
                                >
                                    <td className="p-4 text-gray-400">
                                        <GripVertical className="w-5 h-5" />
                                    </td>
                                    <td className="p-4">
                                        <img
                                            src={banner.imageUrl.startsWith('http') ? banner.imageUrl : `${API_ROOT}${banner.imageUrl}`}
                                            alt={banner.title}
                                            className="w-20 h-12 object-cover rounded border border-gray-200"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="font-medium text-gray-900">{banner.title}</div>
                                        {banner.subtitle && <div className="text-sm text-gray-500 mt-0.5">{banner.subtitle}</div>}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => toggleEnabled(banner)} className="flex items-center gap-1">
                                                {banner.isEnabled ? (
                                                    <ToggleRight className="w-6 h-6 text-green-500" />
                                                ) : (
                                                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                                                )}
                                            </button>
                                            <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {new Date(banner.startDate).toLocaleDateString()} ~ {new Date(banner.endDate).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => openEditModal(banner)} className="text-primary hover:underline mx-2 inline-flex items-center gap-1">
                                            <Edit className="w-4 h-4" /> 编辑
                                        </button>
                                        <button onClick={() => { setBannerToDelete(banner.id); setDeleteConfirmOpen(true); }} className="text-red-500 hover:underline inline-flex items-center gap-1">
                                            <Trash2 className="w-4 h-4" /> 删除
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {banners.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">暂无轮播图，点击右上角新增。</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                <GripVertical className="w-4 h-4" />
                提示：拖动左侧拖拽手柄可调整轮播图展示顺序
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingBanner ? '编辑 Banner' : '新增 Banner'} footer={<><Button variant="ghost" onClick={() => setIsModalOpen(false)}>取消</Button><Button onClick={handleSave}>保存</Button></>}>
                <div className="space-y-4">
                    <Input label="标题" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Banner 标题" />
                    <Input label="副标题（可选）" value={formData.subtitle} onChange={e => setFormData({ ...formData, subtitle: e.target.value })} placeholder="Banner 副标题" />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">图片</label>
                        <div className="flex gap-2 items-center">
                            <Input value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} placeholder="/uploads/xxx.png 或完整 URL" className="flex-1" />
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} isLoading={uploading}>
                                <Upload className="w-4 h-4 mr-1" /> 上传
                            </Button>
                        </div>
                        {formData.imageUrl && (
                            <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-100">
                                <img
                                    src={formData.imageUrl.startsWith('http') ? formData.imageUrl : `${API_ROOT}${formData.imageUrl}`}
                                    alt="预览"
                                    className="w-full max-h-40 object-contain rounded"
                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                            </div>
                        )}
                    </div>
                    <Input label="跳转链接（可选）" value={formData.linkUrl} onChange={e => setFormData({ ...formData, linkUrl: e.target.value })} placeholder="https://example.com" />
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
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="bannerIsEnabled"
                            checked={formData.isEnabled}
                            onChange={e => setFormData({ ...formData, isEnabled: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <label htmlFor="bannerIsEnabled" className="text-sm font-medium text-gray-700">启用该 Banner（前台展示）</label>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="确认删除" footer={<><Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>取消</Button><Button variant="danger" onClick={handleDelete}>确认删除</Button></>}>
                <p>您确定要删除此 Banner 吗？</p>
            </Modal>
        </div>
    );
};
