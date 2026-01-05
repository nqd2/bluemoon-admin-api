import mongoose, { Schema, Document } from 'mongoose';

export enum FeeType {
  Service = 'Service',
  Contribution = 'Contribution',
  Utility = 'Utility'
}

export enum FeeUnit {
  Apartment = 'hộ',
  Person = 'khẩu',
  Area = 'm2',
  KWh = 'kWh',
  WaterCube = 'm3'
}

export interface IFee extends Document {
  title: string;
  description?: string;
  type: FeeType;
  amount: number;
  unit: FeeUnit;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FeeSchema: Schema = new Schema(
  {
    title: { 
      type: String, 
      required: [true, 'Title is required'],
      minlength: [5, 'Title must be at least 5 characters'],
      trim: true
    },
    description: { 
      type: String,
      trim: true
    },
    type: { 
      type: String, 
      enum: Object.values(FeeType),
      required: [true, 'Fee type is required']
    },
    amount: { 
      type: Number, 
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative']
    },
    unit: { 
      type: String, 
      enum: Object.values(FeeUnit),
      required: [true, 'Unit is required']
    },
    isActive: { 
      type: Boolean, 
      default: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IFee>('Fee', FeeSchema);
