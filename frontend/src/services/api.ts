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

export default api;
