import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  apartmentId: mongoose.Types.ObjectId;
  feeId: mongoose.Types.ObjectId;
  totalAmount: number;
  payerName: string;
  createdBy: mongoose.Types.ObjectId;
  date: Date;
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
      required: [true, 'Payer name is required'],
      trim: true
    },
    createdBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    date: { 
      type: Date, 
      default: Date.now 
    }
  },
  {
    timestamps: true 
  }
);

// Index to prevent duplicate payments for same service fee if enforced by app logic,
// but for Contribution it allows multiples. Validation will be handled in controller.
// However, maybe useful to index searching.
TransactionSchema.index({ apartmentId: 1, feeId: 1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
