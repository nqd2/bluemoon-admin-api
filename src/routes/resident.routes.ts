import express from 'express';
import { createResident } from '../controllers/resident.controller';
import { protect } from '../middlewares/auth.middleware';

const router = express.Router();

router.post('/', protect, createResident);

export default router;
