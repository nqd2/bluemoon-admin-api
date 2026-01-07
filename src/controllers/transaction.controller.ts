import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Transaction, { TransactionStatus } from '../models/transaction.model';
import Fee, { FeeType, FeeUnit } from '../models/fee.model';
import Apartment from '../models/apartment.model';
import User from '../models/user.model';

const calculateSingleFee = async (
  fee: any,
  apartment: any,
  usageMap?: Record<string, number>
): Promise<{ totalAmount: number; quantity: number; usage?: number }> => {
  let totalAmount = 0;
  let quantity = 0;
  let usage: number | undefined = undefined;

  switch (fee.unit) {
    case FeeUnit.Area:
      quantity = apartment.area || 0;
      totalAmount = fee.amount * quantity;
      break;
    case FeeUnit.Person:
      quantity = apartment.members ? apartment.members.length : 0;
      totalAmount = fee.amount * quantity;
      break;
    case FeeUnit.Apartment:
      quantity = 1;
      totalAmount = fee.amount;
      break;
    case FeeUnit.KWh:
    case FeeUnit.WaterCube:
      usage = usageMap?.[fee._id.toString()] || 0;
      quantity = usage;
      totalAmount = fee.amount * usage;
      break;
    default:
      quantity = 1;
      totalAmount = fee.amount;
  }

  return { totalAmount: Math.round(totalAmount), quantity, usage };
};

/**
 * Calculate Fee
 * @route POST /api/transactions/calculate
 */
export const calculateFee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { apartmentId, feeId } = req.body;

    const apartment = await Apartment.findById(apartmentId).populate('members');
    const fee = await Fee.findById(feeId);

    if (!apartment || !fee) {
      res.status(404).json({ success: false, message: 'Apartment or Fee not found' });
      return;
    }

    const usageMap: Record<string, number> = {};
    if (req.body.usage && req.body.feeId) {
      usageMap[req.body.feeId] = Number(req.body.usage);
    }

    const { totalAmount, quantity, usage } = await calculateSingleFee(fee, apartment, usageMap);
    
    res.status(200).json({
      success: true,
      data: {
        apartment: apartment.name,
        fee: fee.title,
        unitPrice: fee.amount,
        quantity,
        totalAmount,
        usage
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate All Fees for an Apartment
 * @route GET /api/apartments/:id/calculate-all-fees
 * @route POST /api/transactions/calculate-all
 */
export const calculateAllFees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const apartmentId = req.params.id || req.body.apartmentId;
    const usageMap = req.body.usageMap || {};

    if (!apartmentId) {
      res.status(400).json({ success: false, message: 'Apartment ID is required' });
      return;
    }

    const apartment = await Apartment.findById(apartmentId).populate('members');
    if (!apartment) {
      res.status(404).json({ success: false, message: 'Apartment not found' });
      return;
    }

    const fees = await Fee.find({ isActive: true });
    if (fees.length === 0) {
      res.status(404).json({ success: false, message: 'No active fees found' });
      return;
    }

    const calculations = [];
    let grandTotal = 0;

    for (const fee of fees) {
      const { totalAmount, quantity, usage } = await calculateSingleFee(fee, apartment, usageMap);
      
      calculations.push({
        feeId: fee._id,
        feeTitle: fee.title,
        feeType: fee.type,
        unit: fee.unit,
        unitPrice: fee.amount,
        quantity,
        totalAmount,
        usage
      });

      grandTotal += totalAmount;
    }

    res.status(200).json({
      success: true,
      data: {
        apartmentId: apartment._id,
        apartmentName: apartment.name,
        apartmentArea: apartment.area,
        memberCount: apartment.members?.length || 0,
        fees: calculations,
        grandTotal: Math.round(grandTotal),
        feeCount: calculations.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record Transaction
 * @route POST /api/transactions
 */
export const createTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { apartmentId, feeId, totalAmount, payerName } = req.body;
    const userId = (req as any).user._id;

    // Validate inputs
    if (!totalAmount || totalAmount <= 0) {
      res.status(400).json({ success: false, message: 'Invalid total amount' });
      return;
    }
    if (!payerName) {
      res.status(400).json({ success: false, message: 'Payer name is required' });
      return;
    }

    const fee = await Fee.findById(feeId);
    if (!fee) {
      res.status(404).json({ success: false, message: 'Fee not found' });
      return;
    }

    // Check Duplicate for Service Fee
    if (fee.type === FeeType.Service) {
      const existing = await Transaction.findOne({ apartmentId, feeId });
      if (existing) {
        res.status(409).json({ success: false, message: 'Fee already paid for this apartment' });
        return;
      }
    }

    const transaction = await Transaction.create({
      apartmentId,
      feeId,
      totalAmount,
      payerName,
      createdBy: userId,
      date: new Date(),
      usage: req.body.usage,
      unitPrice: req.body.unitPrice
    });

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully',
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate Monthly Bills
 * @route POST /api/transactions/generate-bills
 */
export const generateMonthlyBills = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { month, year } = req.body;
    
    // 1. Get List of Active Fees
    const fees = await Fee.find({ isActive: true });
    
    // 2. Get All Apartments
    const apartments = await Apartment.find().populate('members');

    const createdTransactions = [];
    const errors = [];

    for (const apartment of apartments) {
      for (const fee of fees) {
        try {
           // Check if bill already exists
           const existing = await Transaction.findOne({
             apartmentId: apartment._id,
             feeId: fee._id,
             month,
             year
           });

           if (existing) continue;

           let quantity = 0;
           let totalAmount = 0;
           let usage = 0;

           // SIMULATION: Random usage
           switch (fee.unit) {
             case FeeUnit.Area:
               quantity = apartment.area;
               totalAmount = fee.amount * apartment.area;
               break;
             case FeeUnit.Person:
               quantity = apartment.members ? apartment.members.length : 0;
               totalAmount = fee.amount * quantity;
               break;
             case FeeUnit.Apartment:
               quantity = 1;
               totalAmount = fee.amount;
               break;
             case FeeUnit.KWh:
             case FeeUnit.WaterCube:
               usage = fee.unit === FeeUnit.KWh 
                 ? Math.floor(Math.random() * 150) + 50 
                 : Math.floor(Math.random() * 20) + 10;
               quantity = usage;
               totalAmount = fee.amount * usage;
               break;
           }

           // Create PENDING Transaction (Bill)
           const trans = await Transaction.create({
             apartmentId: apartment._id,
             feeId: fee._id,
             month,
             year,
             status: 'Pending',
             totalAmount,
             usage: usage > 0 ? usage : undefined,
             unitPrice: fee.amount,
             date: new Date()
           });

           createdTransactions.push(trans);

        } catch (err: any) {
          errors.push({ apartment: apartment.name, fee: fee.title, error: err.message });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `Generated ${createdTransactions.length} bills.`,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Apartments Revenue Summary
 * @route GET /api/transactions/apartments-summary
 */
export const getApartmentsRevenueSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Only count completed transactions for revenue
    const revenueByApartment = await Transaction.aggregate([
      {
        $match: {
          status: TransactionStatus.Completed
        }
      },
      {
        $group: {
          _id: '$apartmentId',
          totalCollected: { $sum: '$totalAmount' },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    const apartmentIds = revenueByApartment.map((r) => r._id);
    const apartments = await Apartment.find({ _id: { $in: apartmentIds } }).populate('ownerId', 'fullName');

    const result = apartments.map((apt) => {
      const summary = revenueByApartment.find((r) => r._id.toString() === apt._id.toString());
      return {
        apartmentId: apt._id,
        name: apt.name,
        building: apt.building,
        area: apt.area,
        ownerName: (apt.ownerId as any)?.fullName || null,
        totalCollected: summary?.totalCollected || 0,
        transactionCount: summary?.transactionCount || 0
      };
    });

    res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get All Transactions of an Apartment
 * @route GET /api/transactions/apartment/:apartmentId
 */
export const getApartmentTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { apartmentId } = req.params;

    const transactions = await Transaction.find({ apartmentId })
      .sort({ date: -1 })
      .populate('feeId', 'title type unit')
      .populate('apartmentId', 'name building');

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Transaction
 * @route PUT /api/transactions/:id
 */
export const updateTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { totalAmount, payerName, usage, unitPrice, status, date } = req.body;

    const schema = z.object({
      totalAmount: z.number().positive().optional(),
      payerName: z.string().min(1).optional(),
      usage: z.number().min(0).optional(),
      unitPrice: z.number().min(0).optional(),
      status: z.enum(Object.values(TransactionStatus) as [string, ...string[]]).optional(),
      date: z.string().datetime().optional()
    });

    const validation = schema.safeParse(req.body);
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

    const updateData: any = {};
    if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
    if (payerName !== undefined) updateData.payerName = payerName;
    if (usage !== undefined) updateData.usage = usage;
    if (unitPrice !== undefined) updateData.unitPrice = unitPrice;
    if (status !== undefined) updateData.status = status;
    if (date !== undefined) updateData.date = new Date(date);

    const updated = await Transaction.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updated) {
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Transaction
 * @route DELETE /api/transactions/:id
 */
export const deleteTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const deleted = await Transaction.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
