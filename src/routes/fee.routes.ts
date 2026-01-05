import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.middleware';
import { createFee, getFees, getFeePaymentStatus, updateFee } from '../controllers/fee.controller';

const router = Router();

router.use(protect);
router.use(authorize('admin', 'accountant'));

router.route('/')
  .post(createFee)
  .get(getFees);

router.patch('/:id', updateFee);
router.get('/:id/status', getFeePaymentStatus);

export default router;
