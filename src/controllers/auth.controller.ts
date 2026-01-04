import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/user.model';
import RegistrationCode from '../models/registration-code.model';

/**
 * Generate JWT Token
 * @param id - User ID
 * @param username - User username
 * @param role - User role
 * @returns JWT token string
 */
const generateToken = (id: string, username: string, role: string): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  return jwt.sign(
    { id, username, role }, 
    process.env.JWT_SECRET as string, 
    {
      expiresIn: (process.env.JWT_EXPIRE || '30d') as any,
    }
  );
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
export const loginUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, password } = req.body;

    // Validation Schema
    const loginSchema = z.object({
      username: z.string().min(6, 'Username must be at least 6 characters'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
    });

    // Validate input
    const validation = loginSchema.safeParse({ username, password });

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.issues.map((err: any) => ({
          field: err.path[0],
          message: err.message
        }))
      });
      return;
    }

    // Find user by username
    const user = await User.findOne({ username });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
      return;
    }

    // Verify password
    const isPasswordMatch = await user.matchPassword(password);

    if (!isPasswordMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
      return;
    }

    // Generate token
    const token = generateToken(
      user._id.toString(), 
      user.username,
      user.role
    );

    // Success response
    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user using a registration code
 * @access  Public
 */
export const registerUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, password, code } = req.body;

    // Validation Schema
    const registerSchema = z.object({
      username: z.string().min(6, 'Username must be at least 6 characters'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      code: z.string().min(1, 'Registration code is required')
    });

    const validation = registerSchema.safeParse({ username, password, code });

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.issues.map((err: any) => ({
          field: err.path[0],
          message: err.message
        }))
      });
      return;
    }

    // Check if username already exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
      return;
    }

    // validate registration code
    const registrationCode = await RegistrationCode.findOne({ code });

    if (!registrationCode) {
      res.status(400).json({
        success: false,
        message: 'Invalid registration code'
      });
      return;
    }

    if (!registrationCode.isValid()) {
      res.status(400).json({
        success: false,
        message: 'Registration code has expired or reached usage limit'
      });
      return;
    }

    // Create user
    const user = await User.create({
      username,
      password,
      role: registrationCode.type
    });

    // Update registration code usage
    registrationCode.usageCount += 1;
    await registrationCode.save();

    // Generate token
    const token = generateToken(
      user._id.toString(),
      user.username,
      user.role
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    next(error);
  }
};
