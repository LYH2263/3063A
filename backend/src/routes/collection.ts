import { Router } from 'express';
import {
    getCollections,
    getCollectionDetail,
    adminGetCollections,
    adminGetCollectionDetail,
    adminCreateCollection,
    adminUpdateCollection,
    adminDeleteCollection,
    adminAddWorksToCollection,
    adminRemoveWorksFromCollection,
    adminReorderWorks,
} from '../controllers/collection';
import { authenticate, requireAdmin } from '../middleware/auth';
import { logOperation } from '../middleware/logger';
import { asyncHandler } from '../middleware/error';

const router = Router();

// Public
router.get('/', asyncHandler(getCollections));
router.get('/:id', asyncHandler(getCollectionDetail));

// Admin
router.get('/admin/all', authenticate, requireAdmin, asyncHandler(adminGetCollections));
router.get('/admin/:id', authenticate, requireAdmin, asyncHandler(adminGetCollectionDetail));
router.post('/admin', authenticate, requireAdmin, logOperation('CREATE_COLLECTION'), asyncHandler(adminCreateCollection));
router.put('/admin/:id', authenticate, requireAdmin, logOperation('UPDATE_COLLECTION'), asyncHandler(adminUpdateCollection));
router.delete('/admin/:id', authenticate, requireAdmin, logOperation('DELETE_COLLECTION'), asyncHandler(adminDeleteCollection));
router.post('/admin/:id/works', authenticate, requireAdmin, logOperation('ADD_WORKS_TO_COLLECTION'), asyncHandler(adminAddWorksToCollection));
router.delete('/admin/:id/works', authenticate, requireAdmin, logOperation('REMOVE_WORKS_FROM_COLLECTION'), asyncHandler(adminRemoveWorksFromCollection));
router.put('/admin/:id/reorder', authenticate, requireAdmin, logOperation('REORDER_COLLECTION_WORKS'), asyncHandler(adminReorderWorks));

export default router;
