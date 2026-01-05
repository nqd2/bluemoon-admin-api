import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import RegistrationCode from '../models/registration-code.model';
import { z } from 'zod';

/**
 * Generate a random code
 * Format: XXX-YYYY-ZZZ
 */
const generateCode = (): string => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

/**
 * @route   POST /api/registration-codes
 * @desc    Create a new registration code
 * @access  Admin Only
 */
export const createRegistrationCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, usageLimit, expiresIntermsOfHours } = req.body;

    const schema = z.object({
      type: z.enum(['admin', 'leader', 'accountant']),
      usageLimit: z.number().int().min(1).default(1),
      expiresIntermsOfHours: z.number().min(1).default(24)
    });

    const validation = schema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.issues
      });
      return;
    }

    const { type: roleType, usageLimit: limit, expiresIntermsOfHours: hours } = validation.data;

    const code = generateCode();
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    const newCode = await RegistrationCode.create({
      code,
      type: roleType,
      usageLimit: limit,
      expiresAt,
      createdBy: (req as any).user.id
    });

    res.status(201).json({
      success: true,
      data: newCode
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/registration-codes
 * @desc    Get all registration codes
 * @access  Admin Only
 */
export const getRegistrationCodes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const codes = await RegistrationCode.find().sort({ createdAt: -1 }).populate('createdBy', 'username email');

    res.status(200).json({
      success: true,
      count: codes.length,
      data: codes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/registration-codes/:id
 * @desc    Delete/Revoke a registration code
 * @access  Admin Only
 */
export const deleteRegistrationCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const deletedCode = await RegistrationCode.findByIdAndDelete(id);

    if (!deletedCode) {
      res.status(404).json({
        success: false,
        message: 'Registration code not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Registration code deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
