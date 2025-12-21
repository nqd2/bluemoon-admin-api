import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/user.model';

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'abc123456', {
    expiresIn: '30d',
  });
};

export const loginUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Zod Schema
    const loginSchema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });

    const validation = loginSchema.safeParse({ email, password });

    if (!validation.success) {
       res.status(400);
       throw new Error('Invalid email or password format');
    }

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id.toString()),
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
};
