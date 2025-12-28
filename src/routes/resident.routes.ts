import express from 'express';
import { 
  createResident, 
  getResidents, 
  updateResident, 
  deleteResident 
} from '../controllers/resident.controller';
import { protect, authorize } from '../middlewares/auth.middleware';

const router = express.Router();

// Protected routes - only authenticated users can access
router.post('/', protect, createResident);
router.get('/', protect, getResidents);
router.put('/:id', protect, updateResident);
router.delete('/:id', protect, deleteResident);

export default router;
