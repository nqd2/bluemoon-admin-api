import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User Interface
 * Represents an account in the system (Admin, Leader, Resident)
 */
export interface IUser extends Document {
  username: string;
  password: string;
  role: 'admin' | 'leader' | 'accountant';
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    username: { 
      type: String, 
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [6, 'Username must be at least 6 characters']
    },
    password: { 
      type: String, 
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
      type: String,
      enum: ['admin', 'leader', 'vice_leader'],
      default: 'resident',
      required: true
    }
  },
  {
    timestamps: true,
  }
);

/**
 * Hash password before saving
 */
UserSchema.pre('save', async function (this: any) {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
});

/**
 * Compare entered password with hashed password in database
 */
UserSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
