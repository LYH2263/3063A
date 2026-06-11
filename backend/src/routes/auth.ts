import { Router } from 'express';
import { login, register } from '../controllers/auth';
import { asyncHandler } from '../middleware/error';

const router = Router();

router.post('/login', asyncHandler(login));
router.post('/register', asyncHandler(register));

export default router;
