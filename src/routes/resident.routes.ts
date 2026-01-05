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
router.use(protect);
router.use(authorize('admin', 'leader'));

router.post('/', createResident);
router.get('/', getResidents);
router.put('/:id', updateResident);
router.delete('/:id', deleteResident);

export default router;
