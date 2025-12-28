import express from 'express';
import { createResident, getResidents } from '../controllers/resident.controller';
import { protect, authorize } from '../middlewares/auth.middleware';

const router = express.Router();

// Protected routes - only authenticated users can access
router.post('/', protect, createResident);
router.get('/', protect, getResidents);

export default router;
