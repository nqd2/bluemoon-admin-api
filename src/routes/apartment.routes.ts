import express from 'express';
import { createApartment, addMember, getApartmentDetails, getApartments, getApartmentBills } from '../controllers/apartment.controller';
import { calculateAllFees } from '../controllers/transaction.controller';
import { protect, authorize } from '../middlewares/auth.middleware';

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'leader'));

router.post('/', createApartment);
router.get('/', getApartments);
router.get('/:id', getApartmentDetails);
router.get('/:id/bills', getApartmentBills);
router.get('/:id/calculate-all-fees', calculateAllFees);
router.post('/:id/members', addMember);

export default router;

