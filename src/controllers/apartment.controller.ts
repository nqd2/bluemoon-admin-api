import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Apartment from '../models/apartment.model';
import Resident from '../models/resident.model';
import mongoose from 'mongoose';

/**
 * Create Apartment
 * Tạo mới hồ sơ căn hộ (Hộ khẩu)
 * 
 * @route   POST /api/apartments
 * @access  Private (requires authentication)
 */
export const createApartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, area, ownerId, apartmentNumber, building } = req.body;

    // Zod Schema for validation
    const apartmentSchema = z.object({
      name: z.string().min(1, 'Apartment name is required'),
      area: z.number().positive('Area must be a positive number'),
      ownerId: z.string().optional(),
      apartmentNumber: z.string().optional(),
      building: z.string().optional(),
    });

    // Validate input data
    const validation = apartmentSchema.safeParse({ 
      name, 
      area: Number(area), // Convert to number
      ownerId,
      apartmentNumber,
      building
    });

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

    // Check uniqueness of apartment name
    const apartmentExists = await Apartment.findOne({ name });
    if (apartmentExists) {
      res.status(400).json({
        success: false,
        message: 'Apartment name already exists in the system',
        field: 'name'
      });
      return;
    }

    // If ownerId is provided, check if resident exists
    if (ownerId) {
      if (!ownerId.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(400).json({
          success: false,
          message: 'Invalid owner ID format'
        });
        return;
      }

      const ownerExists = await Resident.findById(ownerId);
      if (!ownerExists) {
        res.status(404).json({
          success: false,
          message: 'Owner resident not found',
          field: 'ownerId'
        });
        return;
      }
    }

    // Create new apartment
    const apartment = await Apartment.create({
      name,
      area: Number(area),
      ownerId: ownerId || null,
      apartmentNumber,
      building,
      members: ownerId ? [ownerId] : [] // If owner is provided, add to members
    });

    // Populate owner info if exists
    const populatedApartment = await Apartment.findById(apartment._id)
      .populate('ownerId', 'fullName identityCard phone');

    res.status(201).json({
      success: true,
      message: 'Apartment created successfully',
      data: populatedApartment
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Add Member to Apartment
 * Thêm một nhân khẩu vào một căn hộ
 * 
 * @route   POST /api/apartments/:id/members
 * @access  Private (requires authentication)
 */
export const addMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { residentId, role } = req.body;

    // Validate inputs
    if (!id.match(/^[0-9a-fA-F]{24}$/) || !residentId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID format'
      });
      return;
    }

    if (!['Chủ hộ', 'Thành viên'].includes(role)) {
      res.status(400).json({
        success: false,
        message: 'Role must be "Chủ hộ" or "Thành viên"'
      });
      return;
    }

    // Check apartment existence
    const apartment = await Apartment.findById(id);
    if (!apartment) {
      res.status(404).json({
        success: false,
        message: 'Apartment not found'
      });
      return;
    }

    // Check resident existence
    const resident = await Resident.findById(residentId);
    if (!resident) {
      res.status(404).json({
        success: false,
        message: 'Resident not found'
      });
      return;
    }

    // Check if resident already belongs to another apartment
    if (resident.apartmentId && resident.apartmentId.toString() !== id) {
      res.status(400).json({
        success: false,
        message: 'Resident already belongs to another apartment'
      });
      return;
    }

    // Check Owner constraint
    if (role === 'Chủ hộ') {
      if (apartment.ownerId && apartment.ownerId.toString() !== residentId) {
        res.status(400).json({
          success: false,
          message: 'Apartment already has an owner. Only one owner is allowed.'
        });
        return;
      }
    }

    // Update Resident
    resident.apartmentId = id;
    resident.roleInApartment = role;
    await resident.save();

    // Update Apartment
    if (!apartment.members) apartment.members = [];
    
    // Add to members list if not already there
    if (!apartment.members.some(m => m.toString() === residentId)) {
      apartment.members.push(new mongoose.Types.ObjectId(residentId));
    }

    // Update ownerId if role is Owner
    if (role === 'Chủ hộ') {
      apartment.ownerId = new mongoose.Types.ObjectId(residentId);
    }

    await apartment.save();

    res.status(200).json({
      success: true,
      message: 'Member added successfully',
      data: {
        apartmentId: id,
        residentId: residentId,
        role: role
      }
    });

  } catch (error) {
    next(error);
  }
};


/**
 * Get All Apartments
 * Lấy danh sách tất cả căn hộ
 * 
 * @route   GET /api/apartments
 * @access  Private (requires authentication)
 */
export const getApartments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const building = req.query.building as string;
    
    const filter: any = {};
    if (building) {
      filter.building = building;
    }

    const count = await Apartment.countDocuments(filter);
    
    // Sort by createdAt desc
    const apartments = await Apartment.find(filter)
      .limit(limit)
      .skip(limit * (page - 1))
      .sort({ createdAt: -1 })
      .populate('ownerId', 'fullName identityCard phone'); // Populate owner info

    res.status(200).json({
      success: true,
      data: apartments,
      page,
      pages: Math.ceil(count / limit),
      total: count
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Apartment Details
 * Lấy thông tin chi tiết của một căn hộ, bao gồm chủ hộ và danh sách thành viên
 * 
 * @route   GET /api/apartments/:id
 * @access  Private (requires authentication)
 */
export const getApartmentDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        success: false,
        message: 'Invalid apartment ID format'
      });
      return;
    }

    // Find apartment and populate owner and members
    const apartment = await Apartment.findById(id)
      .populate('ownerId', 'fullName identityCard phone email dob gender hometown job')
      .populate('members', 'fullName identityCard items dob gender relationship roleInApartment job');

    if (!apartment) {
      res.status(404).json({
        success: false,
        message: 'Apartment not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: apartment
    });

  } catch (error) {
    next(error);
  }
};


/**
 * Get Apartment Bills
 * Lấy danh sách các khoản phí và trạng thái thanh toán của căn hộ
 * 
 * @route   GET /api/apartments/:id/bills
 * @access  Private
 */

/**
 * Get Apartment Bills
 * Lấy danh sách các khoản phí và trạng thái thanh toán của căn hộ
 * Logic updated to show Pending transactions as unpaid bills.
 * 
 * @route   GET /api/apartments/:id/bills
 * @access  Private
 */
export const getApartmentBills = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { month, year } = req.query; // Optional filter

    // Validate Apartment
    const apartment = await Apartment.findById(id);
    if (!apartment) {
      res.status(404).json({ success: false, message: 'Apartment not found' });
      return;
    }

    // Get all transactions for this apartment
    // If month/year provided, filter. If not, maybe just show Pending ones + recent History?
    // For now, let's fetch ALL Pending bills + Paid bills for specific month if asked.
    // Simplifying: Fetch all transactions. Frontend filters by status/date.
    
    const Transaction = await import('../models/transaction.model').then(m => m.default);
    
    let filter: any = { apartmentId: id };
    if (month && year) {
      filter.month = month;
      filter.year = year;
    }

    const transactions = await Transaction.find(filter).populate('feeId').sort({ year: -1, month: -1 });

    // Map to simplified bill structure
    const bills = transactions.map(t => {
      const fee = t.feeId as any; // Populated
      return {
        billId: t._id,
        feeId: fee._id,
        title: fee.title || 'Unknown Fee',
        type: fee.type,
        month: t.month,
        year: t.year,
        amountDue: t.totalAmount,
        status: t.status, // Pending, Completed
        usage: t.usage,
        paidDate: t.status === 'Completed' ? t.date : null
      };
    });

    res.status(200).json({
      success: true,
      data: {
        apartment: apartment.name,
        bills
      }
    });

  } catch (error) {
    next(error);
  }
};
