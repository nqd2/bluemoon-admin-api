import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Resident from '../models/resident.model';
import Apartment from '../models/apartment.model';

/**
 * Create Resident
 * Thêm mới một nhân khẩu vào hệ thống
 * 
 * @route   POST /api/residents
 * @access  Private (requires authentication)
 */
export const createResident = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fullName, dob, gender, identityCard, hometown, job, apartmentId } = req.body;

    // Zod Schema for validation
    const residentSchema = z.object({
      fullName: z.string().min(1, 'Full name is required'),
      dob: z.string().refine((date) => {
        const parsedDate = new Date(date);
        return !isNaN(parsedDate.getTime());
      }, 'Invalid date format for date of birth'),
      gender: z.enum(['Nam', 'Nữ', 'Khác'], {
        message: 'Gender must be Nam, Nữ, or Khác'
      }),
      identityCard: z.string()
        .min(9, 'Identity card must be at least 9 characters')
        .max(12, 'Identity card must not exceed 12 characters')
        .regex(/^[0-9]+$/, 'Identity card must contain only numbers'),
      hometown: z.string().min(1, 'Hometown is required'),
      job: z.string().min(1, 'Job is required'),
      apartmentId: z.string().optional(),
      residencyStatus: z.enum(['Thường trú', 'Tạm trú', 'Tạm vắng']).optional(),
    });

    // Validate input data
    const validation = residentSchema.safeParse({ 
      fullName, 
      dob, 
      gender, 
      identityCard, 
      hometown, 
      job, 
      apartmentId,
      residencyStatus: req.body.residencyStatus
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
    
    // Check uniqueness of identityCard
    const residentExists = await Resident.findOne({ identityCard });
    if (residentExists) {
      res.status(400).json({
        success: false,
        message: 'Identity card number already exists in the system',
        field: 'identityCard'
      });
      return;
    }

    // Create new resident
    const resident = await Resident.create({
      fullName,
      dob: new Date(dob),
      gender,
      identityCard,
      hometown,
      job,
      apartmentId: apartmentId || undefined,
      residencyStatus: req.body.residencyStatus || 'Thường trú'
    });

    // Return success response with 201 Created
    res.status(201).json({
      success: true,
      message: 'Resident created successfully',
      data: resident
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get Residents
 * Lấy danh sách nhân khẩu với phân trang và tìm kiếm
 * 
 * @route   GET /api/residents?page=1&limit=10&keyword=search
 * @access  Private (requires authentication)
 */
export const getResidents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const keywordInput = req.query.keyword as string;
    
    // Build search filter - search by fullName (primary) and identityCard (bonus)
    const keyword = keywordInput ? {
      $or: [
        { fullName: { $regex: keywordInput, $options: 'i' } },
        { identityCard: { $regex: keywordInput, $options: 'i' } },
      ]
    } : {};

    // Count total documents matching the filter
    const count = await Resident.countDocuments({ ...keyword });
    
    // Find residents with pagination
    const residents = await Resident.find({ ...keyword })
      .limit(limit)
      .skip(limit * (page - 1))
      .populate('apartmentId', 'apartmentNumber building') // Populate apartment info
      .sort({ createdAt: -1 }); // Sort by newest first

    // Return response matching spec format
    res.status(200).json({
      residents,
      page,
      pages: Math.ceil(count / limit),
      total: count,
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Update Resident
 * Cập nhật thông tin cá nhân của cư dân
 * 
 * @route   PUT /api/residents/:id
 * @access  Private (requires authentication)
 */
export const updateResident = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        success: false,
        message: 'Invalid resident ID format'
      });
      return;
    }

    // Check if resident exists
    const resident = await Resident.findById(id);
    if (!resident) {
      res.status(404).json({
        success: false,
        message: 'Resident not found'
      });
      return;
    }

    // Zod Schema for update validation (all fields optional)
    const updateSchema = z.object({
      fullName: z.string().min(1, 'Full name cannot be empty').optional(),
      dob: z.string().refine((date) => {
        const parsedDate = new Date(date);
        return !isNaN(parsedDate.getTime());
      }, 'Invalid date format for date of birth').optional(),
      gender: z.enum(['Nam', 'Nữ', 'Khác'], {
        message: 'Gender must be Nam, Nữ, or Khác'
      }).optional(),
      identityCard: z.string()
        .min(9, 'Identity card must be at least 9 characters')
        .max(12, 'Identity card must not exceed 12 characters')
        .regex(/^[0-9]+$/, 'Identity card must contain only numbers')
        .optional(),
      hometown: z.string().min(1, 'Hometown cannot be empty').optional(),
      job: z.string().min(1, 'Job cannot be empty').optional(),
      apartmentId: z.string().optional(),
      status: z.string().optional(), // Deprecated support status field like "Tạm trú"
      residencyStatus: z.enum(['Thường trú', 'Tạm trú', 'Tạm vắng']).optional(),
    });

    // Validate update data
    const validation = updateSchema.safeParse(updateData);
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

    // If updating identityCard, check uniqueness
    if (updateData.identityCard && updateData.identityCard !== resident.identityCard) {
      const existingResident = await Resident.findOne({ identityCard: updateData.identityCard });
      if (existingResident) {
        res.status(400).json({
          success: false,
          message: 'Identity card number already exists in the system',
          field: 'identityCard'
        });
        return;
      }
    }

    // Convert dob string to Date if provided
    if (updateData.dob) {
      updateData.dob = new Date(updateData.dob);
    }

    // Update resident
    const updatedResident = await Resident.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('apartmentId', 'apartmentNumber building');

    res.status(200).json({
      success: true,
      message: 'Resident updated successfully',
      data: updatedResident
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete Resident
 * Xóa cư dân khỏi hệ thống (Hard Delete)
 * 
 * @route   DELETE /api/residents/:id
 * @access  Private (requires authentication)
 */
export const deleteResident = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        success: false,
        message: 'Invalid resident ID format'
      });
      return;
    }

    // Check if resident exists
    const resident = await Resident.findById(id);
    if (!resident) {
      res.status(404).json({
        success: false,
        message: 'Resident not found'
      });
      return;
    }

    // Check if resident is owner of any apartment
    const apartment = await Apartment.findOne({ 
      $or: [
        { ownerId: id },
        { 'members': { $elemMatch: { $eq: id } } } // Checking members too? Requirement only says 'Chủ hộ' (Owner)
      ]
    });
    
    // BE-06 says: "Nếu cư dân là Chủ hộ (role trong Apartment là 'Chủ hộ' hoặc ownerId trỏ tới user này)"
    // The Apartment model seems to have `ownerId`.
    // Let's check Apartment model definition to be sure.
    const apartmentOwner = await Apartment.findOne({ ownerId: id });
    
    if (apartmentOwner) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete resident who is an apartment owner. Please change the apartment owner first.',
        apartmentInfo: {
          apartmentNumber: apartmentOwner.apartmentNumber,
          building: apartmentOwner.building
        }
      });
      return;
    }

    // Hard Delete (MVP version)
    await Resident.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Resident deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};
