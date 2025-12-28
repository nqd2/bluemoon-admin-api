import mongoose, { Schema, Document } from 'mongoose';

export interface IApartment extends Document {
  name: string;
  area: number;
  ownerId?: mongoose.Types.ObjectId;
  members?: mongoose.Types.ObjectId[];
  apartmentNumber?: string;
  building?: string;
}

const ApartmentSchema: Schema = new Schema(
  {
    name: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true
    },
    area: { 
      type: Number, 
      required: true,
      min: [0, 'Area must be a positive number']
    },
    ownerId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Resident',
      default: null
    },
    members: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'Resident' 
    }],
    apartmentNumber: {
      type: String,
      trim: true
    },
    building: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IApartment>('Apartment', ApartmentSchema);

