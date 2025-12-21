import express from 'express';
import { createResident, getResidents } from '../controllers/resident.controller';
import { protect } from '../middlewares/auth.middleware';

const router = express.Router();

router.post('/', protect, createResident);
router.get('/', protect, getResidents);

export default router;
