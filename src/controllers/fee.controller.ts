import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Fee, { FeeType, FeeUnit } from '../models/fee.model';
import Transaction from '../models/transaction.model';
import Apartment from '../models/apartment.model';

/**
 * Create Fee
 * @route POST /api/fees
 */
export const createFee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, type, amount, unit } = req.body;

    const feeSchema = z.object({
      title: z.string().min(5, 'Title must be at least 5 characters'),
      description: z.string().optional(),
      type: z.nativeEnum(FeeType),
      amount: z.number().min(0, 'Amount cannot be negative'),
      unit: z.nativeEnum(FeeUnit)
    });

    const validation = feeSchema.safeParse({ title, description, type, amount, unit });
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
      return;
    }

    const fee = await Fee.create({ title, description, type, amount, unit });

    res.status(201).json({
      success: true,
      message: 'Fee created successfully',
      data: fee
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Fees List
 * @route GET /api/fees
 */
export const getFees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, limit } = req.query;
    const filter: any = {};
    if (type) filter.type = type;

    const fees = await Fee.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit) || 20);
    
    res.status(200).json({
      success: true,
      count: fees.length,
      data: fees
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Payment Status
 * @route GET /api/fees/:id/status
 */
export const getFeePaymentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const fee = await Fee.findById(id);
    if (!fee) {
      res.status(404).json({ success: false, message: 'Fee not found' });
      return;
    }

    const apartments = await Apartment.find().populate('ownerId', 'fullName');
    const transactions = await Transaction.find({ feeId: id });

    // Calculate total collected
    const totalCollected = transactions.reduce((sum: number, t: any) => sum + t.totalAmount, 0);

    const result = apartments.map(apt => {
      const transaction = transactions.find((t: any) => t.apartmentId.toString() === apt._id.toString());
      return {
        apartmentId: apt._id,
        name: apt.name, // Accessing name properly based on apartment model
        ownerName: (apt.ownerId as any)?.fullName || 'N/A',
        status: transaction ? 'PAID' : 'UNPAID',
        paidAmount: transaction ? transaction.totalAmount : 0,
        paidDate: transaction ? transaction.date : null
      };
    });

    res.status(200).json({
      success: true,
      feeInfo: {
        title: fee.title,
        totalCollected
      },
      apartments: result
    });
  } catch (error) {
    next(error);
  }
};
