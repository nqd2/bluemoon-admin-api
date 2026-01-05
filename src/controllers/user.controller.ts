import { Request, Response, NextFunction } from 'express';
import User, { IUser } from '../models/user.model';
import { z } from 'zod';

/**
 * Get All Users
 * @route GET /api/users
 * @access Admin
 */
export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    
    // Default sort by creation newest first
    const users = await User.find().select('-password')
      .limit(limit)
      .skip(limit * (page - 1))
      .sort({ createdAt: -1 });

    const count = await User.countDocuments();

    res.status(200).json({
      success: true,
      data: users,
      page,
      pages: Math.ceil(count / limit),
      total: count
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create User (Admin Direct)
 * @route POST /api/users
 * @access Admin
 */
export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, password, role } = req.body;

    const schema = z.object({
      username: z.string().min(6),
      password: z.string().min(6),
      role: z.enum(['admin', 'leader', 'accountant'])
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

    const userExists = await User.findOne({ username });
    if (userExists) {
      res.status(400).json({ success: false, message: 'Username already exists' });
      return;
    }

    const user = await User.create({ username, password, role });

    res.status(201).json({
      success: true,
      data: {
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
 * Update User Role
 * @route PUT /api/users/:id
 * @access Admin
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'leader', 'accountant'].includes(role)) {
      res.status(400).json({ success: false, message: 'Invalid role' });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Prevent deleting/demoting self (optional safety)
    if (user._id.toString() === (req as any).user._id.toString() && role !== 'admin') {
       // Allow self-update? Maybe not wise to demote self.
       // Let's allow it but warn or prevent if last admin? MVP: just allow.
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
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
 * Delete User
 * @route DELETE /api/users/:id
 * @access Admin
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    
    // Prevent deleting self
    if (user._id.toString() === (req as any).user._id.toString()) {
      res.status(400).json({ success: false, message: 'Cannot delete yourself' });
      return;
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};
