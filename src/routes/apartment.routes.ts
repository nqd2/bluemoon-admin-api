import express from 'express';
import { createApartment, addMember } from '../controllers/apartment.controller';
import { protect } from '../middlewares/auth.middleware';

const router = express.Router();

// Protected routes - only authenticated users can access
router.post('/', protect, createApartment);
router.post('/:id/members', protect, addMember);

export default router;

