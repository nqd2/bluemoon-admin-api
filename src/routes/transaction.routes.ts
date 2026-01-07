import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.middleware';
import { 
  calculateFee, 
  calculateAllFees, 
  createTransaction, 
  generateMonthlyBills,
  getApartmentsRevenueSummary,
  getApartmentTransactions,
  updateTransaction,
  deleteTransaction
} from '../controllers/transaction.controller';

const router = Router();

router.use(protect);
router.use(authorize('admin', 'accountant'));

router.get('/apartments-summary', getApartmentsRevenueSummary);
router.get('/apartment/:apartmentId', getApartmentTransactions);

router.post('/calculate', calculateFee);
router.post('/calculate-all', calculateAllFees);
router.post('/generate-bills', generateMonthlyBills);
router.post('/', createTransaction);

router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
