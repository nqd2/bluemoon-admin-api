import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.middleware';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/user.controller';

const router = Router();

// All routes are protected and Admin only
router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .put(updateUser)
  .delete(deleteUser);

export default router;
