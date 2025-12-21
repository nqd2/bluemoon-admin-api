import mongoose, { Schema, Document } from 'mongoose';

export interface IResident extends Document {
  fullName: string;
  dob: Date;
  gender: string;
  identityCard: string;
  hometown: string;
  job: string;
  apartmentId?: string;
}

const ResidentSchema: Schema = new Schema(
  {
    fullName: { type: String, required: true },
    dob: { type: Date, required: true },
    gender: { type: String, required: true },
    identityCard: { type: String, required: true, unique: true },
    hometown: { type: String, required: true },
    job: { type: String, required: true },
    apartmentId: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IResident>('Resident', ResidentSchema);
