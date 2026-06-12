import React, { useEffect, useState } from 'react';
import api, { collectionApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Trash2, Edit, Plus, FolderOpen, ChevronUp, ChevronDown, X, Check } from 'lucide-react';

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8063/api').replace(/\/api$/, '');

export const AdminCollections = () => {
    const [collections, setCollections] = useState<any[]>([]);
    const [allWorks, setAllWorks] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCollection, setEditingCollection] = useState<any>(null);
    const [formData, setFormData] = useState({ title: '', description: '', coverUrl: '' });

    const [manageWorksOpen, setManageWorksOpen] = useState(false);
    const [currentCollection, setCurrentCollection] = useState<any>(null);
    const [selectedWorkIds, setSelectedWorkIds] = useState<number[]>([]);
    const [orderedWorkIds, setOrderedWorkIds] = useState<number[]>([]);

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [collectionToDelete, setCollectionToDelete] = useState<number | null>(null);

    const { success, error } = useToast();

    const fetchCollections = async () => {
        try {
            const res: any = await collectionApi.adminGetCollections();
            setCollections(res.data);
        } catch (err: any) {
            error(err.message || '加载合集失败');
        }
    };

    const fetchAllWorks = async () => {
        try {
            const res: any = await api.get('/works/admin/all');
            setAllWorks(res.data);
        } catch (err: any) {
            error(err.message || '加载作品失败');
        }
    };

    useEffect(() => {
        fetchCollections();
        fetchAllWorks();
    }, []);

    const openEditModal = (collection?: any) => {
        if (collection) {
            setEditingCollection(collection);
            setFormData({
                title: collection.title,
                description: collection.description,
                coverUrl: collection.coverUrl || '',
            });
        } else {
            setEditingCollection(null);
            setFormData({ title: '', description: '', coverUrl: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        const payload = {
            title: formData.title.trim(),
            description: formData.description.trim(),
            coverUrl: formData.coverUrl.trim() || undefined,
        };
        if (!payload.title) {
            error('请填写标题');
            return;
        }
        if (!payload.description) {
            error('请填写简介');
            return;
        }

        try {
            if (editingCollection) {
                await collectionApi.adminUpdateCollection(editingCollection.id, payload);
                success('合集更新成功');
            } else {
                await collectionApi.adminCreateCollection(payload);
                success('合集创建成功');
            }
            setIsModalOpen(false);
            fetchCollections();
        } catch (err: any) {
            error(err.message || '操作失败');
        }
    };

    const handleDelete = async () => {
        if (!collectionToDelete) return;
        try {
            await collectionApi.adminDeleteCollection(collectionToDelete);
            success('合集删除成功');
            setDeleteConfirmOpen(false);
            setCollectionToDelete(null);
            fetchCollections();
        } catch (err: any) {
            error(err.message || '删除合集失败');
            setDeleteConfirmOpen(false);
        }
    };

    const openManageWorks = async (collection: any) => {
        try {
            const res: any = await collectionApi.adminGetCollectionDetail(collection.id);
            setCurrentCollection(res.data);
            const ids = res.data.works.map((w: any) => w.id);
            setSelectedWorkIds(ids);
            setOrderedWorkIds(ids);
            setManageWorksOpen(true);
        } catch (err: any) {
            error(err.message || '加载合集详情失败');
        }
    };

    const handleSaveWorks = async () => {
        if (!currentCollection) return;
        const originalIds = currentCollection.works.map((w: any) => w.id);
        const toAdd = orderedWorkIds.filter((id) => !originalIds.includes(id));
        const toRemove = originalIds.filter((id: number) => !orderedWorkIds.includes(id));

        try {
            if (toAdd.length > 0) {
                await collectionApi.adminAddWorks(currentCollection.id, toAdd);
            }
            if (toRemove.length > 0) {
                await collectionApi.adminRemoveWorks(currentCollection.id, toRemove);
            }
            const orders = orderedWorkIds.map((workId, index) => ({ workId, sortOrder: index }));
            await collectionApi.adminReorderWorks(currentCollection.id, orders);

            success('作品更新成功');
            setManageWorksOpen(false);
            fetchCollections();
        } catch (err: any) {
            error(err.message || '操作失败');
        }
    };

    const toggleWorkSelection = (workId: number) => {
        if (selectedWorkIds.includes(workId)) {
            setSelectedWorkIds(selectedWorkIds.filter((id) => id !== workId));
            setOrderedWorkIds(orderedWorkIds.filter((id) => id !== workId));
        } else {
            setSelectedWorkIds([...selectedWorkIds, workId]);
            setOrderedWorkIds([...orderedWorkIds, workId]);
        }
    };

    const moveWork = (direction: 'up' | 'down', workId: number) => {
        const index = orderedWorkIds.indexOf(workId);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === orderedWorkIds.length - 1) return;

        const newIds = [...orderedWorkIds];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newIds[index], newIds[swapIndex]] = [newIds[swapIndex], newIds[index]];
        setOrderedWorkIds(newIds);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">合集管理</h1>
                <Button onClick={() => openEditModal()}>
                    <Plus className="w-4 h-4 mr-2" /> 新增合集
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((c) => (
                    <div
                        key={c.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                    >
                        <div className="aspect-[4/3] bg-gray-100 relative">
                            {c.coverUrl ? (
                                <img
                                    src={c.coverUrl.startsWith('http') ? c.coverUrl : `${API_ROOT}${c.coverUrl}`}
                                    alt={c.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <FolderOpen className="w-12 h-12" />
                                </div>
                            )}
                            <div className="absolute top-3 right-3 flex gap-2">
                                <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                    已发布 {c.publishedWorkCount}
                                </span>
                                <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                                    共 {c.workCount}
                                </span>
                            </div>
                        </div>
                        <div className="p-5">
                            <h3 className="text-lg font-bold mb-2">{c.title}</h3>
                            <p className="text-gray-500 text-sm line-clamp-2 mb-4">{c.description}</p>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openManageWorks(c)}
                                    className="flex-1"
                                >
                                    管理作品
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEditModal(c)}
                                >
                                    <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => {
                                        setCollectionToDelete(c.id);
                                        setDeleteConfirmOpen(true);
                                    }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {collections.length === 0 && (
                <div className="text-center py-20 text-gray-500 bg-white rounded-xl border border-gray-200">
                    <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>暂无合集，点击右上角创建第一个合集吧！</p>
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCollection ? '编辑合集' : '新增合集'}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                            取消
                        </Button>
                        <Button onClick={handleSave}>保存</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="标题"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">简介</label>
                        <textarea
                            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                            rows={4}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                    <Input
                        label="封面 URL（可选，留空自动使用首张作品封面）"
                        value={formData.coverUrl}
                        onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
                    />
                    {formData.coverUrl && (
                        <div className="flex items-center gap-4 p-2 bg-gray-50 rounded border border-gray-100">
                            <img
                                src={formData.coverUrl.startsWith('http') ? formData.coverUrl : `${API_ROOT}${formData.coverUrl}`}
                                alt="预览"
                                className="w-20 h-20 object-cover rounded shadow-sm bg-white"
                            />
                            <div className="text-xs text-gray-500 italic">封面预览</div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Manage Works Modal */}
            <Modal
                isOpen={manageWorksOpen}
                onClose={() => setManageWorksOpen(false)}
                title={`管理作品 - ${currentCollection?.title || ''}`}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setManageWorksOpen(false)}>
                            取消
                        </Button>
                        <Button onClick={handleSaveWorks}>保存</Button>
                    </>
                }
            >
                {currentCollection && (
                    <div className="space-y-4">
                        {/* Selected works with ordering */}
                        <div>
                            <h4 className="font-medium text-sm mb-3 text-gray-700">
                                已添加作品（点击按钮调整顺序）
                            </h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2">
                                {orderedWorkIds.length === 0 ? (
                                    <p className="text-center text-gray-400 py-4 text-sm">暂无作品</p>
                                ) : (
                                    orderedWorkIds.map((workId: number, index: number) => {
                                        const w = allWorks.find((aw) => aw.id === workId);
                                        if (!w) return null;
                                        return (
                                            <div
                                                key={workId}
                                                className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    <button
                                                        onClick={() => moveWork('up', workId)}
                                                        disabled={index === 0}
                                                        className="text-gray-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <ChevronUp className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => moveWork('down', workId)}
                                                        disabled={index === orderedWorkIds.length - 1}
                                                        className="text-gray-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <ChevronDown className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <span className="text-xs text-gray-400 w-6 text-center">#{index + 1}</span>
                                                <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                                    {w.mediaUrl && (
                                                        <img
                                                            src={w.mediaUrl.startsWith('http') ? w.mediaUrl : `${API_ROOT}${w.mediaUrl}`}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{w.title}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {w.status === 'PUBLISHED' ? (
                                                            <span className="text-green-600">已发布</span>
                                                        ) : (
                                                            <span className="text-yellow-600">草稿</span>
                                                        )}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => toggleWorkSelection(workId)}
                                                    className="text-red-500 hover:text-red-600"
                                                    title="移出合集"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Work selection */}
                        <div>
                            <h4 className="font-medium text-sm mb-3 text-gray-700">选择要加入的作品</h4>
                            <div className="space-y-1 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2">
                                {allWorks.map((w) => {
                                    const isSelected = selectedWorkIds.includes(w.id);
                                    return (
                                        <div
                                            key={w.id}
                                            onClick={() => toggleWorkSelection(w.id)}
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                                isSelected ? 'bg-primary/10' : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <div
                                                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                                    isSelected
                                                        ? 'bg-primary border-primary text-white'
                                                        : 'border-gray-300'
                                                }`}
                                            >
                                                {isSelected && <Check className="w-3 h-3" />}
                                            </div>
                                            <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                                {w.mediaUrl && (
                                                    <img
                                                        src={w.mediaUrl.startsWith('http') ? w.mediaUrl : `${API_ROOT}${w.mediaUrl}`}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{w.title}</p>
                                                <p className="text-xs text-gray-500">
                                                    {w.status === 'PUBLISHED' ? (
                                                        <span className="text-green-600">已发布</span>
                                                    ) : (
                                                        <span className="text-yellow-600">草稿</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                已选择 {selectedWorkIds.length} 个作品
                            </p>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation */}
            <Modal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                title="确认删除"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>
                            取消
                        </Button>
                        <Button variant="danger" onClick={handleDelete}>
                            确认删除
                        </Button>
                    </>
                }
            >
                <p>您确定要删除此合集吗？合集与作品的关联关系将被清除，但作品本身不会被删除。</p>
            </Modal>
        </div>
    );
};
