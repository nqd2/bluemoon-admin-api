import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import { calculateFee, createTransaction } from '../controllers/transaction.controller';

const router = Router();

router.use(protect);

router.post('/calculate', calculateFee);
router.post('/', createTransaction);

export default router;
