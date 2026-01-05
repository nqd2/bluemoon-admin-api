import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.middleware';
import { calculateFee, createTransaction, generateMonthlyBills } from '../controllers/transaction.controller';

const router = Router();

router.use(protect);
router.use(authorize('admin', 'accountant'));

router.post('/calculate', calculateFee);
router.post('/generate-bills', generateMonthlyBills);
router.post('/', createTransaction);

export default router;
