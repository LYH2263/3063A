import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8063/api';

const api = axios.create({
    baseURL,
    timeout: 10000,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        return Promise.reject(error.response?.data || error);
    }
);

export const commentApi = {
    getWorkComments: (workId: number, params?: { page?: number; limit?: number; sort?: string }) =>
        api.get(`/comments/work/${workId}`, { params }),

    getWorkCommentCount: (workId: number) =>
        api.get(`/comments/work/${workId}/count`),

    getBatchCommentCounts: (workIds: number[]) =>
        api.get(`/comments/batch-counts`, { params: { workIds: workIds.join(',') } }),

    createComment: (workId: number, data: { content: string; parentId?: number | null }) =>
        api.post(`/comments/work/${workId}`, data),

    deleteComment: (id: number) =>
        api.delete(`/comments/${id}`),

    likeComment: (id: number) =>
        api.post(`/comments/${id}/like`),

    adminGetAllComments: (params?: { page?: number; limit?: number; status?: string; search?: string; workId?: number }) =>
        api.get('/comments/admin/all', { params }),

    adminUpdateCommentStatus: (id: number, status: string) =>
        api.put(`/comments/admin/${id}`, { status }),

    adminBatchApprove: (ids: number[]) =>
        api.post('/comments/admin/batch-approve', { ids }),

    adminDeleteComment: (id: number) =>
        api.delete(`/comments/admin/${id}`),
};

export const collectionApi = {
    getCollections: () =>
        api.get('/collections'),

    getCollectionDetail: (id: number) =>
        api.get(`/collections/${id}`),

    adminGetCollections: () =>
        api.get('/collections/admin/all'),

    adminGetCollectionDetail: (id: number) =>
        api.get(`/collections/admin/${id}`),

    adminCreateCollection: (data: { title: string; description: string; coverUrl?: string }) =>
        api.post('/collections/admin', data),

    adminUpdateCollection: (id: number, data: { title?: string; description?: string; coverUrl?: string }) =>
        api.put(`/collections/admin/${id}`, data),

    adminDeleteCollection: (id: number) =>
        api.delete(`/collections/admin/${id}`),

    adminAddWorks: (id: number, workIds: number[]) =>
        api.post(`/collections/admin/${id}/works`, { workIds }),

    adminRemoveWorks: (id: number, workIds: number[]) =>
        api.delete(`/collections/admin/${id}/works`, { data: { workIds } }),

    adminReorderWorks: (id: number, orders: Array<{ workId: number; sortOrder: number }>) =>
        api.put(`/collections/admin/${id}/reorder`, { orders }),
};

export const friendLinkApi = {
    getPublicFriendLinks: () =>
        api.get('/friend-links'),

    adminGetAllFriendLinks: () =>
        api.get('/friend-links/admin/all'),

    adminCreateFriendLink: (data: { name: string; url: string; logoUrl?: string; sortOrder?: number; isEnabled?: boolean }) =>
        api.post('/friend-links/admin', data),

    adminUpdateFriendLink: (id: number, data: { name?: string; url?: string; logoUrl?: string; sortOrder?: number; isEnabled?: boolean }) =>
        api.put(`/friend-links/admin/${id}`, data),

    adminDeleteFriendLink: (id: number) =>
        api.delete(`/friend-links/admin/${id}`),

    adminReorderFriendLinks: (orders: Array<{ id: number; sortOrder: number }>) =>
        api.put('/friend-links/admin/reorder', { orders }),
};

export const bannerApi = {
    getPublicBanners: () =>
        api.get('/banners'),

    adminGetAllBanners: () =>
        api.get('/banners/admin/all'),

    adminCreateBanner: (data: { title: string; subtitle?: string; imageUrl: string; linkUrl?: string; startDate: string; endDate: string; sortOrder?: number; isEnabled?: boolean }) =>
        api.post('/banners/admin', data),

    adminUpdateBanner: (id: number, data: { title?: string; subtitle?: string; imageUrl?: string; linkUrl?: string; startDate?: string; endDate?: string; sortOrder?: number; isEnabled?: boolean }) =>
        api.put(`/banners/admin/${id}`, data),

    adminDeleteBanner: (id: number) =>
        api.delete(`/banners/admin/${id}`),

    adminReorderBanners: (orders: Array<{ id: number; sortOrder: number }>) =>
        api.put('/banners/admin/reorder', { orders }),
};

export const announcementApi = {
    getActiveAnnouncement: () =>
        api.get('/announcements/active'),

    adminGetAllAnnouncements: () =>
        api.get('/announcements/admin/all'),

    adminCreateAnnouncement: (data: { title: string; content: string; contentType?: string; type?: string; startDate: string; endDate: string; isPinned?: boolean; isEnabled?: boolean }) =>
        api.post('/announcements/admin', data),

    adminUpdateAnnouncement: (id: number, data: { title?: string; content?: string; contentType?: string; type?: string; startDate?: string; endDate?: string; isPinned?: boolean; isEnabled?: boolean }) =>
        api.put(`/announcements/admin/${id}`, data),

    adminDeleteAnnouncement: (id: number) =>
        api.delete(`/announcements/admin/${id}`),
};

export const userApi = {
    getPublicProfile: (username: string) =>
        api.get(`/users/${username}`),

    updateProfile: (data: { nickname?: string; bio?: string; avatarUrl?: string; password?: string }) =>
        api.put('/users/profile', data),

    uploadAvatar: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/upload/avatar', formData);
    },
};

export const workApi = {
    getWorks: (params?: { page?: number; limit?: number; category?: string; search?: string }) =>
        api.get('/works', { params }),

    getWorkDetail: (id: number) =>
        api.get(`/works/${id}`),

    toggleInteraction: (id: number, type: string) =>
        api.post(`/works/${id}/interact`, { type }),

    getMyFavorites: () =>
        api.get('/works/user/favorites'),

    adminGetAllWorks: (params?: { status?: string }) =>
        api.get('/works/admin/all', { params }),

    adminGetPendingReviews: () =>
        api.get('/works/admin/pending-reviews'),

    adminCreateWork: (data: { title: string; description: string; tags?: string; category?: string; mediaUrl: string; status?: string; scheduledPublishAt?: string }) =>
        api.post('/works/admin', data),

    adminUpdateWork: (id: number, data: { title?: string; description?: string; tags?: string; category?: string; mediaUrl?: string; status?: string; scheduledPublishAt?: string }) =>
        api.put(`/works/admin/${id}`, data),

    adminApproveWork: (id: number) =>
        api.post(`/works/admin/${id}/approve`),

    adminRejectWork: (id: number, reason: string) =>
        api.post(`/works/admin/${id}/reject`, { reason }),

    adminDeleteWork: (id: number) =>
        api.delete(`/works/admin/${id}`),

    adminGetRecycleBin: (params?: { page?: number; limit?: number }) =>
        api.get('/works/admin/recycle-bin', { params }),

    adminRestoreWork: (id: number) =>
        api.post(`/works/admin/recycle-bin/${id}/restore`),

    adminPermanentDeleteWork: (id: number) =>
        api.delete(`/works/admin/recycle-bin/${id}`),

    adminBatchRestoreWorks: (ids: number[]) =>
        api.post('/works/admin/recycle-bin/batch-restore', { ids }),

    adminBatchPermanentDeleteWorks: (ids: number[]) =>
        api.post('/works/admin/recycle-bin/batch-permanent-delete', { ids }),
};

export default api;
