import mongoose, { Schema, Document } from 'mongoose';

export enum TransactionStatus {
  Pending = 'Pending',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export interface ITransaction extends Document {
  apartmentId: mongoose.Types.ObjectId;
  feeId: mongoose.Types.ObjectId;
  totalAmount: number;
  payerName?: string; // Optional if pending
  createdBy?: mongoose.Types.ObjectId; // Optional if system generated
  date: Date; // Created date
  month: number;
  year: number;
  usage?: number;
  unitPrice?: number;
  status: TransactionStatus;
}

const TransactionSchema: Schema = new Schema(
  {
    apartmentId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Apartment', 
      required: true 
    },
    feeId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Fee', 
      required: true 
    },
    totalAmount: { 
      type: Number, 
      required: [true, 'Total amount is required'],
      min: [0, 'Amount must be positive']
    },
    payerName: { 
      type: String, 
      trim: true
    },
    createdBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    },
    date: { 
      type: Date, 
      default: Date.now 
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true
    },
    usage: { 
      type: Number, 
      min: [0, 'Usage cannot be negative'] 
    },
    unitPrice: { 
      type: Number, 
      min: [0, 'Unit price cannot be negative'] 
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.Completed // Backward compatibility default, but logic will use Pending
    }
  },
  {
    timestamps: true 
  }
);

TransactionSchema.index({ apartmentId: 1, month: 1, year: 1 });
TransactionSchema.index({ apartmentId: 1, feeId: 1, month: 1, year: 1 }, { unique: true }); // Prevent duplicate bills for same fee in same month 

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
