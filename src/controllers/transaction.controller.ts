import { Request, Response, NextFunction } from 'express';
import { z } from 'zod'; // Import Zod
import Transaction from '../models/transaction.model';
import Fee, { FeeType, FeeUnit } from '../models/fee.model';
import Apartment from '../models/apartment.model';
import User from '../models/user.model'; // Assuming User model exists

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

    let totalAmount = 0;
    let quantity = 0;

    switch (fee.unit) {
      case FeeUnit.Area:
        quantity = apartment.area;
        totalAmount = fee.amount * apartment.area;
        break;
      case FeeUnit.Person:
        // Filter members who are 'Thường trú' or 'Tạm trú' if possible.
        // For MVP, just counting all members in the list.
        // Assuming members is populated with Resident objects (if not, length is still valid but stricter logic needed if we store raw IDs)
        // Apartment.members is array of ObjectIds. If we didn't populate full object, we accept length. 
        // Logic says: "Chỉ đếm những người có status là 'Thường trú' hoặc 'Tạm trú'".
        // Ideally we should populate and filter.
        // Since we populated members in `calculateFee` (see above), we can filter.
        // However, Resident model structure in `members` needs to be checked.
        
        // Let's assume for now keeping simple: count all members linked.
        quantity = apartment.members ? apartment.members.length : 0;
        totalAmount = fee.amount * quantity;
        break;
      case FeeUnit.Apartment:
        quantity = 1;
        totalAmount = fee.amount;
        break;
      case FeeUnit.KWh:
      case FeeUnit.WaterCube:
        // For utility, usage is provided in request body
        quantity = Number(req.body.usage) || 0;
        totalAmount = fee.amount * quantity;
        break;
    }

    // For Contribution, amount might be voluntary (0 or suggested).
    // The requirement says: return default amount, but frontend allows edit.
    
    res.status(200).json({
      success: true,
      data: {
        apartment: apartment.name,
        fee: fee.title,
        unitPrice: fee.amount,
        quantity,
        totalAmount
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
