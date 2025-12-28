import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.middleware';
import { createFee, getFees, getFeePaymentStatus } from '../controllers/fee.controller';

const router = Router();

router.use(protect); // Protect all routes

router.route('/')
  .post(authorize('admin'), createFee)
  .get(getFees);

router.get('/:id/status', getFeePaymentStatus);

export default router;
