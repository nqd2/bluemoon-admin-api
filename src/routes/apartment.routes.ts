import express from 'express';
import { createApartment, addMember, getApartmentDetails, getApartments, getApartmentBills } from '../controllers/apartment.controller';
import { protect, authorize } from '../middlewares/auth.middleware';

const router = express.Router();

// Protected routes - only authenticated users can access
router.use(protect);
router.use(authorize('admin', 'leader'));

router.post('/', createApartment);
router.get('/', getApartments);
router.get('/:id', getApartmentDetails);
router.get('/:id/bills', getApartmentBills);
router.post('/:id/members', addMember);

export default router;

