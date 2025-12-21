import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Resident from '../models/resident.model';

export const createResident = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fullName, dob, gender, identityCard, hometown, job, apartmentId } = req.body;

    // Zod Schema
    const residentSchema = z.object({
      fullName: z.string().min(1),
      dob: z.string().transform((str) => new Date(str)), 
      gender: z.string().min(1),
      identityCard: z.string().min(9).max(12),
      hometown: z.string().min(1),
      job: z.string().min(1),
      apartmentId: z.string().optional(),
    });

    const validation = residentSchema.safeParse({ fullName, dob, gender, identityCard, hometown, job, apartmentId });

    if (!validation.success) {
      res.status(400);
      throw new Error('Invalid input data');
    }
    
    // Check uniqueness
    const residentExists = await Resident.findOne({ identityCard });
    if (residentExists) {
        res.status(400);
        throw new Error('Resident already exists (identityCard)');
    }

    const resident = await Resident.create({
      fullName,
      dob: new Date(dob),
      gender,
      identityCard,
      hometown,
      job,
      apartmentId,
    });

    if (resident) {
      res.status(201).json(resident);
    } else {
      res.status(400);
      throw new Error('Invalid resident data');
    }
  } catch (error) {
    next(error);
  }
};
