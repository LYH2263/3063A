import React, { useEffect, useState, useRef } from 'react';
import { friendLinkApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Trash2, Edit, Plus, GripVertical, ToggleLeft, ToggleRight, Link as LinkIcon } from 'lucide-react';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8063/api').replace(/\/api$/, '');

export const AdminFriendLinks = () => {
    const [links, setLinks] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLink, setEditingLink] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', url: '', logoUrl: '', isEnabled: true });
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [linkToDelete, setLinkToDelete] = useState<number | null>(null);

    const dragIndexRef = useRef<number | null>(null);
    const dragOverIndexRef = useRef<number | null>(null);

    const { success, error } = useToast();

    const fetchLinks = async () => {
        try {
            const res: any = await friendLinkApi.adminGetAllFriendLinks();
            setLinks(res.data);
        } catch (err: any) {
            error(err.message || '加载友情链接失败');
        }
    };

    useEffect(() => {
        fetchLinks();
    }, []);

    const openEditModal = (link?: any) => {
        if (link) {
            setEditingLink(link);
            setFormData({ name: link.name, url: link.url, logoUrl: link.logoUrl || '', isEnabled: link.isEnabled });
        } else {
            setEditingLink(null);
            setFormData({ name: '', url: '', logoUrl: '', isEnabled: true });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        const payload = {
            name: formData.name.trim(),
            url: formData.url.trim(),
            logoUrl: formData.logoUrl.trim() || undefined,
            isEnabled: formData.isEnabled
        };
        if (!payload.name) {
            error('请填写友链名称');
            return;
        }
        if (!payload.url) {
            error('请填写跳转 URL');
            return;
        }

        try {
            if (editingLink) {
                await friendLinkApi.adminUpdateFriendLink(editingLink.id, payload);
                success('友情链接更新成功');
            } else {
                await friendLinkApi.adminCreateFriendLink(payload);
                success('友情链接创建成功');
            }
            setIsModalOpen(false);
            fetchLinks();
        } catch (err: any) {
            error(err.message || '操作失败');
        }
    };

    const handleDelete = async () => {
        if (!linkToDelete) return;
        try {
            await friendLinkApi.adminDeleteFriendLink(linkToDelete);
            success('友情链接删除成功');
            setDeleteConfirmOpen(false);
            fetchLinks();
        } catch (err: any) {
            error(err.message || '删除友情链接失败');
            setDeleteConfirmOpen(false);
        }
    };

    const toggleEnabled = async (link: any) => {
        try {
            await friendLinkApi.adminUpdateFriendLink(link.id, { isEnabled: !link.isEnabled });
            success(link.isEnabled ? '已禁用' : '已启用');
            fetchLinks();
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

        const newLinks = [...links];
        const [dragged] = newLinks.splice(dragIndex, 1);
        newLinks.splice(dropIndex, 0, dragged);

        const orders = newLinks.map((link, idx) => ({ id: link.id, sortOrder: idx }));
        setLinks(newLinks);

        try {
            await friendLinkApi.adminReorderFriendLinks(orders);
        } catch (err: any) {
            error(err.message || '排序更新失败');
            fetchLinks();
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">友情链接管理</h1>
                <Button onClick={() => openEditModal()}><Plus className="w-4 h-4 mr-2" /> 新增友链</Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500 uppercase tracking-wider">
                            <th className="p-4 w-12"></th>
                            <th className="p-4 w-20">Logo</th>
                            <th className="p-4">名称</th>
                            <th className="p-4">跳转 URL</th>
                            <th className="p-4">状态</th>
                            <th className="p-4 w-32 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {links.map((link, index) => (
                            <tr
                                key={link.id}
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
                                    {link.logoUrl ? (
                                        <img
                                            src={link.logoUrl.startsWith('http') ? link.logoUrl : `${API_ROOT}${link.logoUrl}`}
                                            alt={link.name}
                                            className="w-10 h-10 object-contain rounded border border-gray-200 bg-white"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                                            <LinkIcon className="w-5 h-5" />
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 font-medium text-gray-900">{link.name}</td>
                                <td className="p-4 text-gray-500 text-sm break-all">
                                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                        {link.url}
                                    </a>
                                </td>
                                <td className="p-4">
                                    <button
                                        onClick={() => toggleEnabled(link)}
                                        className="flex items-center gap-2 text-sm"
                                    >
                                        {link.isEnabled ? (
                                            <><ToggleRight className="w-6 h-6 text-green-500" /> <span className="text-green-600">已启用</span></>
                                        ) : (
                                            <><ToggleLeft className="w-6 h-6 text-gray-400" /> <span className="text-gray-500">已禁用</span></>
                                        )}
                                    </button>
                                </td>
                                <td className="p-4 text-right">
                                    <button onClick={() => openEditModal(link)} className="text-primary hover:underline mx-2 inline-flex items-center gap-1">
                                        <Edit className="w-4 h-4" /> 编辑
                                    </button>
                                    <button onClick={() => { setLinkToDelete(link.id); setDeleteConfirmOpen(true); }} className="text-red-500 hover:underline inline-flex items-center gap-1">
                                        <Trash2 className="w-4 h-4" /> 删除
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {links.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">暂无友情链接，点击右上角新增。</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                <GripVertical className="w-4 h-4" />
                提示：拖动左侧拖拽手柄可调整友链展示顺序
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingLink ? '编辑友情链接' : '新增友情链接'} footer={<><Button variant="ghost" onClick={() => setIsModalOpen(false)}>取消</Button><Button onClick={handleSave}>保存</Button></>}>
                <div className="space-y-4">
                    <Input label="名称" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="例如：我的博客" />
                    <Input label="跳转 URL" value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} placeholder="https://example.com" />
                    <Input label="Logo 图标 URL（可选）" value={formData.logoUrl} onChange={e => setFormData({ ...formData, logoUrl: e.target.value })} placeholder="https://example.com/logo.png 或 /uploads/xxx.png" />
                    {formData.logoUrl && (
                        <div className="flex items-center gap-4 p-2 bg-gray-50 rounded border border-gray-100">
                            <img
                                src={formData.logoUrl.startsWith('http') ? formData.logoUrl : `${API_ROOT}${formData.logoUrl}`}
                                alt="Logo 预览"
                                className="w-16 h-16 object-contain rounded shadow-sm bg-white border border-gray-200"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                            <div className="text-xs text-gray-500 italic">Logo 预览</div>
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="isEnabled"
                            checked={formData.isEnabled}
                            onChange={e => setFormData({ ...formData, isEnabled: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <label htmlFor="isEnabled" className="text-sm font-medium text-gray-700">启用该友链（前台展示）</label>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="确认删除" footer={<><Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>取消</Button><Button variant="danger" onClick={handleDelete}>确认删除</Button></>}>
                <p>您确定要删除此友情链接吗？</p>
            </Modal>
        </div>
    );
};
