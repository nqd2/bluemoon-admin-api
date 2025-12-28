import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';

/**
 * Decoded JWT Token Interface
 */
interface DecodedToken {
  id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Protect Middleware
 * Verifies JWT token and attaches user to request
 * 
 * @route   Protected routes
 * @access  Private
 */
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  // Check for Authorization header with Bearer token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token from "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      // Verify JWT_SECRET exists
      if (!process.env.JWT_SECRET) {
        res.status(500).json({
          success: false,
          message: 'JWT_SECRET is not configured'
        });
        return;
      }

      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      ) as DecodedToken;

      // Find user by ID from token payload
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Not authorized, user not found'
        });
        return;
      }

      // Attach user to request object
      req.user = user;
      
      // Continue to next middleware/controller
      next();
      
    } catch (error: any) {
      // Handle token errors (expired, invalid, malformed)
      console.error('Auth middleware error:', error.message);
      
      if (error.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          message: 'Token expired, please login again'
        });
        return;
      }
      
      if (error.name === 'JsonWebTokenError') {
        res.status(401).json({
          success: false,
          message: 'Not authorized, token failed'
        });
        return;
      }

      res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
      return;
    }
  } else {
    // No token provided
    res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
    return;
  }
};

/**
 * Authorize Middleware
 * Checks if user has required role(s)
 * Must be used after protect middleware
 * 
 * @param roles - Allowed roles
 * @returns Middleware function
 * 
 * @example
 * router.post('/admin-only', protect, authorize('admin'), handler);
 * router.get('/admin-or-leader', protect, authorize('admin', 'leader'), handler);
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authorized, user not authenticated'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this resource`
      });
      return;
    }

    next();
  };
};
