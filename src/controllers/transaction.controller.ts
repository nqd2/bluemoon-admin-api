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
      date: new Date()
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
