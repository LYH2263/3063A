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

export default api;
