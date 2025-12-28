import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import { getDashboardStats } from '../controllers/stats.controller';

const router = Router();

router.use(protect);

router.get('/dashboard', getDashboardStats);

export default router;
