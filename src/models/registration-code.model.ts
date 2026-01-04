import mongoose, { Schema, Document } from 'mongoose';

/**
 * Registration Code Interface
 * Used to register new users with specific roles
 */
export interface IRegistrationCode extends Document {
  code: string;
  type: 'admin' | 'leader' | 'resident';
  usageLimit: number;
  usageCount: number;
  expiresAt: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isValid(): boolean;
}

const RegistrationCodeSchema: Schema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    type: {
      type: String,
      enum: ['admin', 'leader', 'resident'],
      required: true
    },
    usageLimit: {
      type: Number,
      required: true,
      default: 1
    },
    usageCount: {
      type: Number,
      required: true,
      default: 0
    },
    expiresAt: {
      type: Date,
      required: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

/**
 * Check if code is valid for use
 */
RegistrationCodeSchema.methods.isValid = function(): boolean {
  return (
    this.usageCount < this.usageLimit &&
    new Date() < this.expiresAt
  );
};

export default mongoose.model<IRegistrationCode>('RegistrationCode', RegistrationCodeSchema);
