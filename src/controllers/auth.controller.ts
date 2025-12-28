import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/user.model';

/**
 * Generate JWT Token
 * @param id - User ID
 * @param email - User email
 * @param role - User role
 * @returns JWT token string
 */
const generateToken = (id: string, email: string, role: string): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  return jwt.sign(
    { id, email, role }, 
    process.env.JWT_SECRET as string, 
    {
      expiresIn: (process.env.JWT_EXPIRE || '30d') as any, // Cast to any to avoid complex type checking issues
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
    const { email, password } = req.body;

    // Validation Schema with Zod
    const loginSchema = z.object({
      email: z.string().min(1, 'Email is required').email('Invalid email format'),
      password: z.string().min(1, 'Password is required'),
    });

    // Validate input
    const validation = loginSchema.safeParse({ email, password });

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

    // Find user by email (case-insensitive)
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }

    // Verify password
    const isPasswordMatch = await user.matchPassword(password);

    if (!isPasswordMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }

    // Generate token
    const token = generateToken(
      user._id.toString(), 
      user.email,
      user.role
    );

    // Success response
    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    next(error);
  }
};
