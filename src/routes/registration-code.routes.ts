import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware';
import { 
  createRegistrationCode, 
  getRegistrationCodes, 
  deleteRegistrationCode 
} from '../controllers/registration-code.controller';

const router = express.Router();

// All routes are protected and for admin only
router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .post(createRegistrationCode)
  .get(getRegistrationCodes);

router.route('/:id')
  .delete(deleteRegistrationCode);

export default router;
