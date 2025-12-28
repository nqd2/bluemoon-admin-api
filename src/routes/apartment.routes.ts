import express from 'express';
import { createApartment } from '../controllers/apartment.controller';
import { protect } from '../middlewares/auth.middleware';

const router = express.Router();

// Protected routes - only authenticated users can access
router.post('/', protect, createApartment);

export default router;

