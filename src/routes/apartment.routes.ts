import express from 'express';
import { createApartment, addMember, getApartmentDetails, getApartments } from '../controllers/apartment.controller';
import { protect } from '../middlewares/auth.middleware';

const router = express.Router();

// Protected routes - only authenticated users can access
router.post('/', protect, createApartment);
router.get('/', protect, getApartments);
router.get('/:id', protect, getApartmentDetails);
router.post('/:id/members', protect, addMember);

export default router;

